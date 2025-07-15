/**
 * Apple MDM Profile Generator - Clean Rewrite
 * Main Application Entry Point
 */

// Application Configuration
const CONFIG = {
    USE_LIVE_API: false, // Cache-first approach as default
    CACHE_DIR: './cache/',
    API_BASE_URL: 'https://developer.apple.com/documentation/devicemanagement/',
    MAX_LOAD_ATTEMPTS: 3,
    LOAD_TIMEOUT: 30000
};

// Application State
class AppState {
    constructor() {
        this.sections = new Map();
        this.expandedSections = new Set();
        this.modifiedParameters = new Map();
        this.filters = {
            search: '',
            platform: [],
            status: ''
        };
        this.isLoading = false;
        this.isInitialized = false;
    }

    // Section Management
    addSection(section) {
        this.sections.set(section.identifier, section);
    }

    getSection(identifier) {
        return this.sections.get(identifier);
    }

    getAllSections() {
        return Array.from(this.sections.values());
    }

    // Expansion State Management
    expandSection(identifier) {
        this.expandedSections.add(identifier);
        this.notifyStateChange('sectionExpanded', { identifier });
    }

    collapseSection(identifier) {
        this.expandedSections.delete(identifier);
        this.notifyStateChange('sectionCollapsed', { identifier });
    }

    toggleSection(identifier) {
        if (this.expandedSections.has(identifier)) {
            this.collapseSection(identifier);
        } else {
            this.expandSection(identifier);
        }
    }

    isSectionExpanded(identifier) {
        return this.expandedSections.has(identifier);
    }

    // Parameter Management
    setParameter(sectionId, parameterId, value) {
        const key = `${sectionId}.${parameterId}`;
        if (value === null || value === undefined || value === '') {
            this.modifiedParameters.delete(key);
        } else {
            this.modifiedParameters.set(key, value);
        }
        this.notifyStateChange('parameterChanged', { sectionId, parameterId, value });
    }

    getParameter(sectionId, parameterId) {
        const key = `${sectionId}.${parameterId}`;
        return this.modifiedParameters.get(key);
    }

    getModifiedParametersCount() {
        return this.modifiedParameters.size;
    }

    // Filter Management
    setFilters(filters) {
        this.filters = { ...this.filters, ...filters };
        this.notifyStateChange('filtersChanged', this.filters);
    }

    // Reset
    reset() {
        this.expandedSections.clear();
        this.modifiedParameters.clear();
        this.filters = {
            search: '',
            platform: [],
            status: ''
        };
        this.notifyStateChange('stateReset');
    }

    // Event System
    notifyStateChange(type, data = {}) {
        const event = new CustomEvent('appStateChange', {
            detail: { type, data }
        });
        document.dispatchEvent(event);
    }
}

// Data Service
class DataService {
    constructor() {
        this.loadAttempts = 0;
    }

    async loadSections() {
        this.loadAttempts++;
        
        try {
            if (CONFIG.USE_LIVE_API) {
                return await this.loadFromAPI();
            } else {
                return await this.loadFromCache();
            }
        } catch (error) {
            console.error(`Load attempt ${this.loadAttempts} failed:`, error);
            
            if (this.loadAttempts < CONFIG.MAX_LOAD_ATTEMPTS) {
                console.log(`Retrying... (${this.loadAttempts}/${CONFIG.MAX_LOAD_ATTEMPTS})`);
                return await this.loadSections();
            }
            
            throw error;
        }
    }

    async loadFromCache() {
        try {
            // Load the manifest file to get list of available sections
            const manifestResponse = await fetch(`${CONFIG.CACHE_DIR}manifest.json`);
            if (!manifestResponse.ok) {
                throw new Error(`Failed to load manifest.json: ${manifestResponse.status}`);
            }

            const manifest = await manifestResponse.json();
            const fileNames = Object.keys(manifest.files).filter(name =>
                name.endsWith('.json') && name !== 'manifest.json'
            );

            console.log(`Found ${fileNames.length} section files in cache`);

            // Load all section files
            const sections = [];
            const loadPromises = fileNames.map(async (fileName) => {
                try {
                    const response = await fetch(`${CONFIG.CACHE_DIR}${fileName}`);
                    if (response.ok) {
                        const sectionData = await response.json();
                        return sectionData;
                    }
                } catch (error) {
                    console.warn(`Failed to load ${fileName}:`, error);
                    return null;
                }
            });

            const results = await Promise.all(loadPromises);
            const validSections = results.filter(section => section !== null);

            console.log(`Successfully loaded ${validSections.length} sections from cache`);
            return this.processSectionsData(validSections);

        } catch (error) {
            console.error('Cache loading failed:', error);
            throw new Error(`Failed to load from cache: ${error.message}`);
        }
    }

    async loadFromAPI() {
        // Placeholder for API loading
        throw new Error('API loading not implemented in this version');
    }

    processSectionsData(sectionsArray) {
        return sectionsArray.map((section, index) => {
            // Handle Apple documentation format
            const metadata = section.metadata || {};
            const abstract = section.abstract || [];
            const properties = this.extractProperties(section);

            // Extract platforms from metadata
            const platforms = metadata.platforms ?
                metadata.platforms.map(p => p.name) : [];

            // Extract description from abstract
            const description = abstract.length > 0 ?
                abstract.map(item => item.text || '').join(' ') : '';

            // Create identifier from metadata or title
            const title = metadata.title || metadata.navigatorTitle?.[0]?.text || `Section ${index + 1}`;
            const identifier = title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

            return {
                identifier,
                name: title,
                description,
                platforms,
                deprecated: Boolean(metadata.deprecated),
                parameters: properties,
                url: section.identifier?.url || '',
                category: 'Device Management'
            };
        });
    }

    extractProperties(section) {
        // Find properties section in primaryContentSections
        const contentSections = section.primaryContentSections || [];
        const propertiesSection = contentSections.find(s => s.kind === 'properties');

        if (!propertiesSection || !propertiesSection.items) {
            return [];
        }

        return propertiesSection.items.map(item => ({
            key: item.name || 'unknown',
            title: item.name || 'Unknown Parameter',
            description: this.extractTextFromContent(item.content || []),
            type: this.extractType(item.type || []),
            required: Boolean(item.required),
            defaultValue: this.extractDefaultValue(item.attributes || [])
        }));
    }

    extractTextFromContent(content) {
        if (!Array.isArray(content)) return '';

        return content.map(item => {
            if (item.type === 'paragraph' && item.inlineContent) {
                return item.inlineContent.map(inline => inline.text || inline.code || '').join('');
            }
            return '';
        }).join(' ').trim();
    }

    extractType(typeArray) {
        if (!Array.isArray(typeArray)) return 'string';
        return typeArray.map(t => t.text || t.kind || 'string').join(' ');
    }

    extractDefaultValue(attributes) {
        if (!Array.isArray(attributes)) return null;
        const defaultAttr = attributes.find(attr => attr.kind === 'default');
        return defaultAttr ? defaultAttr.value : null;
    }
}

// UI Manager
class UIManager {
    constructor(appState) {
        this.appState = appState;
        this.elements = {};
        this.isInitialized = false;
    }

    initialize() {
        if (this.isInitialized) return;
        
        this.cacheElements();
        this.setupEventListeners();
        this.isInitialized = true;
        
        console.log('UI Manager initialized');
    }

    cacheElements() {
        this.elements = {
            loadingScreen: document.getElementById('loading-screen'),
            loadingStatus: document.getElementById('loading-status'),
            progressFill: document.getElementById('progress-fill'),
            progressText: document.getElementById('progress-text'),
            app: document.getElementById('app'),
            searchInput: document.getElementById('search-input'),
            clearSearch: document.getElementById('clear-search'),
            platformFilter: document.getElementById('platform-filter'),
            statusFilter: document.getElementById('status-filter'),
            clearFilters: document.getElementById('clear-filters'),
            navList: document.getElementById('nav-list'),
            sectionsContainer: document.getElementById('sections-container'),
            totalSections: document.getElementById('total-sections'),
            modifiedCount: document.getElementById('modified-count'),
            resetBtn: document.getElementById('reset-btn'),
            exportBtn: document.getElementById('export-btn'),
            collapseAll: document.getElementById('collapse-all'),
            errorState: document.getElementById('error-state'),
            emptyState: document.getElementById('empty-state'),
            retryBtn: document.getElementById('retry-btn')
        };
    }

    setupEventListeners() {
        // App state changes
        document.addEventListener('appStateChange', (e) => {
            this.handleStateChange(e.detail);
        });

        // Search
        this.elements.searchInput?.addEventListener('input', (e) => {
            this.handleSearch(e.target.value);
        });

        this.elements.clearSearch?.addEventListener('click', () => {
            this.clearSearch();
        });

        // Filters
        this.elements.platformFilter?.addEventListener('change', () => {
            this.updateFilters();
        });

        this.elements.statusFilter?.addEventListener('change', () => {
            this.updateFilters();
        });

        this.elements.clearFilters?.addEventListener('click', () => {
            this.clearFilters();
        });

        // Actions
        this.elements.resetBtn?.addEventListener('click', () => {
            this.showResetConfirmation();
        });

        this.elements.exportBtn?.addEventListener('click', () => {
            this.showExportModal();
        });

        this.elements.collapseAll?.addEventListener('click', () => {
            this.collapseAllSections();
        });

        this.elements.retryBtn?.addEventListener('click', () => {
            app.loadData();
        });

        // Section clicks (event delegation)
        this.elements.sectionsContainer?.addEventListener('click', (e) => {
            this.handleSectionClick(e);
        });
    }

    // Loading States
    showLoading(message = 'Loading...') {
        this.updateLoadingStatus(message);
        this.elements.loadingScreen?.classList.remove('hidden');
        this.elements.app?.classList.add('hidden');
    }

    hideLoading() {
        this.elements.loadingScreen?.classList.add('hidden');
        this.elements.app?.classList.remove('hidden');
    }

    updateLoadingStatus(message) {
        if (this.elements.loadingStatus) {
            this.elements.loadingStatus.textContent = message;
        }
    }

    updateProgress(percentage) {
        if (this.elements.progressFill) {
            this.elements.progressFill.style.width = `${percentage}%`;
        }
        if (this.elements.progressText) {
            this.elements.progressText.textContent = `${Math.round(percentage)}%`;
        }
    }

    // State Change Handlers
    handleStateChange(detail) {
        const { type, data } = detail;
        
        switch (type) {
            case 'sectionExpanded':
                this.updateSectionUI(data.identifier, true);
                break;
            case 'sectionCollapsed':
                this.updateSectionUI(data.identifier, false);
                break;
            case 'parameterChanged':
                this.updateParameterCount();
                this.updateExportButton();
                break;
            case 'filtersChanged':
                this.applyFilters();
                break;
            case 'stateReset':
                this.resetUI();
                break;
        }
    }

    // Section Management
    renderSections(sections) {
        if (!this.elements.sectionsContainer) return;
        
        this.elements.sectionsContainer.innerHTML = '';
        
        sections.forEach(section => {
            const sectionElement = this.createSectionElement(section);
            this.elements.sectionsContainer.appendChild(sectionElement);
        });

        this.updateStats(sections.length);
    }

    createSectionElement(section) {
        const isExpanded = this.appState.isSectionExpanded(section.identifier);
        
        const sectionEl = document.createElement('div');
        sectionEl.className = 'section';
        sectionEl.dataset.sectionId = section.identifier;
        
        sectionEl.innerHTML = `
            <div class="section-header" data-action="toggle">
                <div class="section-info">
                    <h3 class="section-title">${this.escapeHtml(section.name)}</h3>
                    <p class="section-description">${this.escapeHtml(section.description)}</p>
                </div>
                <div class="section-meta">
                    <span class="parameter-count">${section.parameters.length} parameters</span>
                    <button class="section-toggle" aria-label="${isExpanded ? 'Collapse' : 'Expand'} section">
                        <i class="fas fa-chevron-${isExpanded ? 'up' : 'down'}"></i>
                    </button>
                </div>
            </div>
            <div class="section-content ${isExpanded ? 'expanded' : ''}">
                <div class="parameters-container" data-section-id="${section.identifier}">
                    <!-- Parameters will be loaded here -->
                </div>
            </div>
        `;
        
        return sectionEl;
    }

    // Event Handlers
    handleSectionClick(e) {
        const header = e.target.closest('.section-header[data-action="toggle"]');
        if (!header) return;
        
        const section = header.closest('.section');
        const sectionId = section?.dataset.sectionId;
        
        if (sectionId) {
            this.appState.toggleSection(sectionId);
        }
    }

    updateSectionUI(sectionId, isExpanded) {
        const section = document.querySelector(`[data-section-id="${sectionId}"]`);
        if (!section) return;
        
        const content = section.querySelector('.section-content');
        const toggle = section.querySelector('.section-toggle i');
        const button = section.querySelector('.section-toggle');
        
        if (content) {
            content.classList.toggle('expanded', isExpanded);
        }
        
        if (toggle) {
            toggle.className = `fas fa-chevron-${isExpanded ? 'up' : 'down'}`;
        }
        
        if (button) {
            button.setAttribute('aria-label', `${isExpanded ? 'Collapse' : 'Expand'} section`);
        }
        
        // Load parameters if expanding
        if (isExpanded) {
            this.loadSectionParameters(sectionId);
        }
    }

    loadSectionParameters(sectionId) {
        const section = this.appState.getSection(sectionId);
        if (!section) return;
        
        const container = document.querySelector(`[data-section-id="${sectionId}"] .parameters-container`);
        if (!container || container.dataset.loaded === 'true') return;
        
        // Create parameter elements
        container.innerHTML = section.parameters.map(param => 
            this.createParameterElement(param, sectionId)
        ).join('');
        
        container.dataset.loaded = 'true';
        console.log(`Loaded ${section.parameters.length} parameters for section ${sectionId}`);
    }

    createParameterElement(parameter, sectionId) {
        // Simplified parameter element for now
        return `
            <div class="parameter" data-parameter-id="${parameter.key}">
                <label class="parameter-label">
                    ${this.escapeHtml(parameter.title || parameter.key)}
                </label>
                <input type="text" 
                       class="parameter-input" 
                       data-section-id="${sectionId}"
                       data-parameter-id="${parameter.key}"
                       placeholder="${this.escapeHtml(parameter.description || '')}"
                       value="${this.appState.getParameter(sectionId, parameter.key) || ''}">
            </div>
        `;
    }

    // Utility Methods
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    updateStats(totalSections) {
        if (this.elements.totalSections) {
            this.elements.totalSections.textContent = totalSections;
        }
    }

    updateParameterCount() {
        if (this.elements.modifiedCount) {
            this.elements.modifiedCount.textContent = this.appState.getModifiedParametersCount();
        }
    }

    updateExportButton() {
        if (this.elements.exportBtn) {
            this.elements.exportBtn.disabled = this.appState.getModifiedParametersCount() === 0;
        }
    }

    // Placeholder methods for features to be implemented
    handleSearch(query) { console.log('Search:', query); }
    clearSearch() { console.log('Clear search'); }
    updateFilters() { console.log('Update filters'); }
    clearFilters() { console.log('Clear filters'); }
    applyFilters() { console.log('Apply filters'); }
    collapseAllSections() { console.log('Collapse all'); }
    showResetConfirmation() { console.log('Show reset confirmation'); }
    showExportModal() { console.log('Show export modal'); }
    resetUI() { console.log('Reset UI'); }
}

// Main Application Class
class App {
    constructor() {
        this.state = new AppState();
        this.dataService = new DataService();
        this.ui = new UIManager(this.state);
    }

    async initialize() {
        console.log('Initializing Apple MDM Profile Generator...');
        
        this.ui.initialize();
        await this.loadData();
        
        this.state.isInitialized = true;
        console.log('Application initialized successfully');
    }

    async loadData() {
        try {
            this.ui.showLoading('Loading Apple MDM documentation...');
            this.ui.updateProgress(10);
            
            const sections = await this.dataService.loadSections();
            this.ui.updateProgress(70);
            
            // Add sections to state
            sections.forEach(section => {
                this.state.addSection(section);
            });
            
            this.ui.updateProgress(90);
            
            // Render UI
            this.ui.renderSections(sections);
            this.ui.updateProgress(100);
            
            // Hide loading
            setTimeout(() => {
                this.ui.hideLoading();
            }, 500);
            
        } catch (error) {
            console.error('Failed to load data:', error);
            this.ui.hideLoading();
            // Show error state
        }
    }
}

// Initialize Application
const app = new App();

// Start the application when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => app.initialize());
} else {
    app.initialize();
}

// Export for debugging
window.app = app;
window.appState = app.state;
window.uiManager = app.ui;
