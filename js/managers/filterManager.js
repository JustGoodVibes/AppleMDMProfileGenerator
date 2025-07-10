/**
 * Filter Manager
 * Handles search and filtering functionality
 */

import { FILTER_TYPES, UI_CONFIG, DEFAULTS } from '../utils/constants.js';
import { debounce } from '../utils/helpers.js';
import { uiManager } from './uiManager.js';

class FilterManager {
    constructor() {
        this.filters = {
            search: DEFAULTS.SEARCH_QUERY,
            showModifiedOnly: DEFAULTS.SHOW_MODIFIED_ONLY,
            hideDeprecated: DEFAULTS.HIDE_DEPRECATED,
            platform: DEFAULTS.SELECTED_PLATFORM,
            showPriorityHigh: DEFAULTS.SHOW_PRIORITY_HIGH,
            showPriorityMedium: DEFAULTS.SHOW_PRIORITY_MEDIUM,
            showPriorityLow: DEFAULTS.SHOW_PRIORITY_LOW
        };

        this.isInitialized = false;
        this.debouncedSearch = debounce(this.applyFilters.bind(this), UI_CONFIG.SEARCH_DEBOUNCE_DELAY);
    }

    /**
     * Initialize the filter manager
     */
    initialize() {
        if (this.isInitialized) return;
        
        this.setupEventListeners();
        this.loadSavedFilters();
        this.isInitialized = true;
        
        console.log('Filter Manager initialized');
    }

    /**
     * Setup event listeners for filter controls
     */
    setupEventListeners() {
        // Search input
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.handleSearchInput(e.target.value);
            });
            
            searchInput.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    this.clearSearch();
                } else if (e.key === 'Enter') {
                    // Force immediate search on Enter
                    this.applyFilters();
                } else if (e.key === 'ArrowDown') {
                    // Navigate to first visible section
                    e.preventDefault();
                    const firstVisibleSection = document.querySelector('.config-section:not([style*="display: none"])');
                    if (firstVisibleSection) {
                        firstVisibleSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                }
            });
        }
        
        // Clear search button
        const clearSearchBtn = document.getElementById('clear-search');
        if (clearSearchBtn) {
            clearSearchBtn.addEventListener('click', () => {
                this.clearSearch();
            });
        }
        
        // Show modified only toggle
        const showModifiedToggle = document.getElementById('show-modified-only');
        if (showModifiedToggle) {
            showModifiedToggle.addEventListener('change', (e) => {
                this.setFilter(FILTER_TYPES.MODIFIED_ONLY, e.target.checked);
            });
        }
        
        // Hide deprecated toggle
        const hideDeprecatedToggle = document.getElementById('hide-deprecated');
        if (hideDeprecatedToggle) {
            hideDeprecatedToggle.addEventListener('change', (e) => {
                this.setFilter(FILTER_TYPES.HIDE_DEPRECATED, e.target.checked);
            });
        }
        
        // Platform select
        const platformSelect = document.getElementById('platform-select');
        if (platformSelect) {
            platformSelect.addEventListener('change', (e) => {
                this.setFilter(FILTER_TYPES.PLATFORM, e.target.value);
            });
        }

        // Priority filter toggles
        const priorityHighToggle = document.getElementById('show-priority-high');
        if (priorityHighToggle) {
            priorityHighToggle.addEventListener('change', (e) => {
                this.setFilter(FILTER_TYPES.PRIORITY_HIGH, e.target.checked);
            });
        }

        const priorityMediumToggle = document.getElementById('show-priority-medium');
        if (priorityMediumToggle) {
            priorityMediumToggle.addEventListener('change', (e) => {
                this.setFilter(FILTER_TYPES.PRIORITY_MEDIUM, e.target.checked);
            });
        }

        const priorityLowToggle = document.getElementById('show-priority-low');
        if (priorityLowToggle) {
            priorityLowToggle.addEventListener('change', (e) => {
                this.setFilter(FILTER_TYPES.PRIORITY_LOW, e.target.checked);
            });
        }

        // Priority dropdown toggle
        const priorityDropdownToggle = document.getElementById('priority-dropdown-toggle');
        const priorityDropdownMenu = document.getElementById('priority-dropdown-menu');

        if (priorityDropdownToggle && priorityDropdownMenu) {
            priorityDropdownToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                this.togglePriorityDropdown();
            });

            // Close dropdown when clicking outside
            document.addEventListener('click', (e) => {
                if (!priorityDropdownToggle.contains(e.target) && !priorityDropdownMenu.contains(e.target)) {
                    this.closePriorityDropdown();
                }
            });

            // Handle keyboard navigation
            priorityDropdownToggle.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.togglePriorityDropdown();
                } else if (e.key === 'Escape') {
                    this.closePriorityDropdown();
                }
            });
        }

        // Global keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            this.handleKeyboardShortcuts(e);
        });
    }

    /**
     * Toggle priority dropdown visibility
     */
    togglePriorityDropdown() {
        const toggle = document.getElementById('priority-dropdown-toggle');
        const menu = document.getElementById('priority-dropdown-menu');

        if (toggle && menu) {
            const isOpen = toggle.getAttribute('aria-expanded') === 'true';

            if (isOpen) {
                this.closePriorityDropdown();
            } else {
                this.openPriorityDropdown();
            }
        }
    }

    /**
     * Open priority dropdown
     */
    openPriorityDropdown() {
        const toggle = document.getElementById('priority-dropdown-toggle');
        const menu = document.getElementById('priority-dropdown-menu');

        if (toggle && menu) {
            toggle.setAttribute('aria-expanded', 'true');
            menu.classList.add('show');

            // Focus first checkbox
            const firstCheckbox = menu.querySelector('input[type="checkbox"]');
            if (firstCheckbox) {
                firstCheckbox.focus();
            }
        }
    }

    /**
     * Close priority dropdown
     */
    closePriorityDropdown() {
        const toggle = document.getElementById('priority-dropdown-toggle');
        const menu = document.getElementById('priority-dropdown-menu');

        if (toggle && menu) {
            toggle.setAttribute('aria-expanded', 'false');
            menu.classList.remove('show');
        }
    }

    /**
     * Update priority dropdown text based on selected filters
     */
    updatePriorityDropdownText() {
        const toggle = document.getElementById('priority-dropdown-toggle');
        const textEl = toggle?.querySelector('.priority-dropdown-text');

        if (!textEl) return;

        const { showPriorityHigh, showPriorityMedium, showPriorityLow } = this.filters;
        const selectedCount = [showPriorityHigh, showPriorityMedium, showPriorityLow].filter(Boolean).length;

        if (selectedCount === 3) {
            textEl.textContent = 'All Priorities';
        } else if (selectedCount === 0) {
            textEl.textContent = 'No Priorities';
        } else {
            const selected = [];
            if (showPriorityHigh) selected.push('High');
            if (showPriorityMedium) selected.push('Medium');
            if (showPriorityLow) selected.push('Low');
            textEl.textContent = selected.join(', ');
        }
    }

    /**
     * Handle search input
     * @param {string} query - Search query
     */
    handleSearchInput(query) {
        this.filters.search = query;
        
        // Update clear button visibility
        const clearBtn = document.getElementById('clear-search');
        if (clearBtn) {
            clearBtn.classList.toggle('hidden', query.trim() === '');
        }
        
        // Apply filters with debounce
        this.debouncedSearch();
        
        // Save to localStorage
        this.saveFilters();
    }

    /**
     * Clear search input
     */
    clearSearch() {
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.value = '';
            searchInput.focus();
        }
        
        this.handleSearchInput('');
    }

    /**
     * Set filter value
     * @param {string} filterType - Filter type
     * @param {any} value - Filter value
     */
    setFilter(filterType, value) {
        switch (filterType) {
            case FILTER_TYPES.SEARCH:
                this.filters.search = value;
                break;
                
            case FILTER_TYPES.MODIFIED_ONLY:
                this.filters.showModifiedOnly = value;
                break;
                
            case FILTER_TYPES.HIDE_DEPRECATED:
                this.filters.hideDeprecated = value;
                break;
                
            case FILTER_TYPES.PLATFORM:
                this.filters.platform = value;
                break;

            case FILTER_TYPES.PRIORITY_HIGH:
                this.filters.showPriorityHigh = value;
                break;

            case FILTER_TYPES.PRIORITY_MEDIUM:
                this.filters.showPriorityMedium = value;
                break;

            case FILTER_TYPES.PRIORITY_LOW:
                this.filters.showPriorityLow = value;
                break;

            default:
                console.warn(`Unknown filter type: ${filterType}`);
                return;
        }
        
        // Update priority dropdown text if priority filter changed
        if ([FILTER_TYPES.PRIORITY_HIGH, FILTER_TYPES.PRIORITY_MEDIUM, FILTER_TYPES.PRIORITY_LOW].includes(filterType)) {
            this.updatePriorityDropdownText();
        }

        // Apply filters immediately for non-search filters
        if (filterType !== FILTER_TYPES.SEARCH) {
            this.applyFilters();
        }

        // Save to localStorage
        this.saveFilters();

        console.log(`Filter updated: ${filterType} = ${value}`);
    }

    /**
     * Get current filter value
     * @param {string} filterType - Filter type
     * @returns {any} Filter value
     */
    getFilter(filterType) {
        switch (filterType) {
            case FILTER_TYPES.SEARCH:
                return this.filters.search;
                
            case FILTER_TYPES.MODIFIED_ONLY:
                return this.filters.showModifiedOnly;
                
            case FILTER_TYPES.HIDE_DEPRECATED:
                return this.filters.hideDeprecated;
                
            case FILTER_TYPES.PLATFORM:
                return this.filters.platform;

            case FILTER_TYPES.PRIORITY_HIGH:
                return this.filters.showPriorityHigh;

            case FILTER_TYPES.PRIORITY_MEDIUM:
                return this.filters.showPriorityMedium;

            case FILTER_TYPES.PRIORITY_LOW:
                return this.filters.showPriorityLow;

            default:
                return null;
        }
    }

    /**
     * Get all current filters
     * @returns {object} All filters
     */
    getAllFilters() {
        return { ...this.filters };
    }

    /**
     * Apply all filters
     */
    applyFilters() {
        const startTime = performance.now();

        try {
            // Apply filters through UI manager
            uiManager.applyFilters(this.filters);

            // Update result counts
            this.updateResultCounts();

            const endTime = performance.now();
            const duration = endTime - startTime;

            console.log(`Filters applied in ${duration.toFixed(2)}ms:`, this.filters);

            // Log performance warning if search is slow
            if (duration > 100) {
                console.warn(`Search took ${duration.toFixed(2)}ms - consider optimizing for large datasets`);
            }

        } catch (error) {
            console.error('Error applying filters:', error);

            // Show user-friendly error message
            const searchContainer = document.querySelector('.search-container');
            if (searchContainer) {
                const errorEl = document.createElement('div');
                errorEl.className = 'search-status no-results';
                errorEl.innerHTML = '<span>Search error occurred. Please try again.</span>';

                // Remove existing status
                const existingStatus = document.querySelector('.search-status');
                if (existingStatus) {
                    existingStatus.remove();
                }

                searchContainer.appendChild(errorEl);

                // Auto-remove error after 3 seconds
                setTimeout(() => {
                    if (errorEl.parentNode) {
                        errorEl.remove();
                    }
                }, 3000);
            }
        }
    }

    /**
     * Update result counts in UI
     */
    updateResultCounts() {
        // Count visible sections
        const visibleSections = document.querySelectorAll('.config-section:not([style*="display: none"])');
        const totalSections = document.querySelectorAll('.config-section');

        // Count visible parameters
        let visibleParams = 0;
        let totalParams = 0;

        visibleSections.forEach(section => {
            const params = section.querySelectorAll('.parameter-item:not([style*="display: none"])');
            visibleParams += params.length;
        });

        totalSections.forEach(section => {
            const params = section.querySelectorAll('.parameter-item');
            totalParams += params.length;
        });

        // Show search status if search is active
        this.updateSearchStatus(visibleSections.length, totalSections.length, visibleParams, totalParams);

        console.log(`Showing ${visibleSections.length}/${totalSections.length} sections, ${visibleParams}/${totalParams} parameters`);
    }

    /**
     * Update search status display
     * @param {number} visibleSections - Number of visible sections
     * @param {number} totalSections - Total number of sections
     * @param {number} visibleParams - Number of visible parameters
     * @param {number} totalParams - Total number of parameters
     */
    updateSearchStatus(visibleSections, totalSections, visibleParams, totalParams) {
        // Remove existing search status
        const existingStatus = document.querySelector('.search-status');
        if (existingStatus) {
            existingStatus.remove();
        }

        // Only show status if search is active
        if (this.filters.search.trim() !== '') {
            const searchContainer = document.querySelector('.search-container');
            if (searchContainer) {
                const statusEl = document.createElement('div');
                statusEl.className = 'search-status';

                if (visibleSections === 0 && visibleParams === 0) {
                    statusEl.innerHTML = `<span class="no-results">No results found for "${this.filters.search}"</span>`;
                    statusEl.classList.add('no-results');
                } else {
                    statusEl.innerHTML = `<span class="results-count">Found ${visibleSections} section(s) and ${visibleParams} parameter(s)</span>`;
                    statusEl.classList.add('has-results');
                }

                searchContainer.appendChild(statusEl);
            }
        }
    }

    /**
     * Reset all filters to defaults
     */
    resetFilters() {
        this.filters = {
            search: DEFAULTS.SEARCH_QUERY,
            showModifiedOnly: DEFAULTS.SHOW_MODIFIED_ONLY,
            hideDeprecated: DEFAULTS.HIDE_DEPRECATED,
            platform: DEFAULTS.SELECTED_PLATFORM,
            showPriorityHigh: DEFAULTS.SHOW_PRIORITY_HIGH,
            showPriorityMedium: DEFAULTS.SHOW_PRIORITY_MEDIUM,
            showPriorityLow: DEFAULTS.SHOW_PRIORITY_LOW
        };
        
        // Update UI controls
        this.updateFilterControls();
        
        // Apply filters
        this.applyFilters();
        
        // Save to localStorage
        this.saveFilters();
        
        console.log('Filters reset to defaults');
    }

    /**
     * Update filter controls to match current filter state
     */
    updateFilterControls() {
        // Search input
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.value = this.filters.search;
        }
        
        // Clear search button
        const clearBtn = document.getElementById('clear-search');
        if (clearBtn) {
            clearBtn.classList.toggle('hidden', this.filters.search.trim() === '');
        }
        
        // Show modified only toggle
        const showModifiedToggle = document.getElementById('show-modified-only');
        if (showModifiedToggle) {
            showModifiedToggle.checked = this.filters.showModifiedOnly;
        }
        
        // Hide deprecated toggle
        const hideDeprecatedToggle = document.getElementById('hide-deprecated');
        if (hideDeprecatedToggle) {
            hideDeprecatedToggle.checked = this.filters.hideDeprecated;
        }
        
        // Platform select
        const platformSelect = document.getElementById('platform-select');
        if (platformSelect) {
            platformSelect.value = this.filters.platform;
        }

        // Priority filter toggles
        const priorityHighToggle = document.getElementById('show-priority-high');
        if (priorityHighToggle) {
            priorityHighToggle.checked = this.filters.showPriorityHigh;
        }

        const priorityMediumToggle = document.getElementById('show-priority-medium');
        if (priorityMediumToggle) {
            priorityMediumToggle.checked = this.filters.showPriorityMedium;
        }

        const priorityLowToggle = document.getElementById('show-priority-low');
        if (priorityLowToggle) {
            priorityLowToggle.checked = this.filters.showPriorityLow;
        }

        // Update priority dropdown text
        this.updatePriorityDropdownText();
    }

    /**
     * Handle keyboard shortcuts
     * @param {KeyboardEvent} e - Keyboard event
     */
    handleKeyboardShortcuts(e) {
        // Ctrl/Cmd + F: Focus search
        if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
            e.preventDefault();
            const searchInput = document.getElementById('search-input');
            if (searchInput) {
                searchInput.focus();
                searchInput.select();
            }
        }
        
        // Ctrl/Cmd + M: Toggle modified only
        if ((e.ctrlKey || e.metaKey) && e.key === 'm') {
            e.preventDefault();
            const showModifiedToggle = document.getElementById('show-modified-only');
            if (showModifiedToggle) {
                showModifiedToggle.checked = !showModifiedToggle.checked;
                this.setFilter(FILTER_TYPES.MODIFIED_ONLY, showModifiedToggle.checked);
            }
        }
        
        // Ctrl/Cmd + D: Toggle deprecated
        if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
            e.preventDefault();
            const hideDeprecatedToggle = document.getElementById('hide-deprecated');
            if (hideDeprecatedToggle) {
                hideDeprecatedToggle.checked = !hideDeprecatedToggle.checked;
                this.setFilter(FILTER_TYPES.HIDE_DEPRECATED, hideDeprecatedToggle.checked);
            }
        }
        
        // Escape: Clear search if search is focused
        if (e.key === 'Escape') {
            const searchInput = document.getElementById('search-input');
            if (searchInput && document.activeElement === searchInput) {
                this.clearSearch();
            }
        }
    }

    /**
     * Save filters to localStorage
     */
    saveFilters() {
        try {
            localStorage.setItem('apple_mdm_filters', JSON.stringify(this.filters));
        } catch (error) {
            console.warn('Failed to save filters to localStorage:', error);
        }
    }

    /**
     * Load saved filters from localStorage
     */
    loadSavedFilters() {
        try {
            const saved = localStorage.getItem('apple_mdm_filters');
            if (saved) {
                const parsedFilters = JSON.parse(saved);
                
                // Merge with defaults to handle new filter types
                this.filters = {
                    ...this.filters,
                    ...parsedFilters
                };
                
                // Update UI controls
                this.updateFilterControls();
                
                console.log('Loaded saved filters:', this.filters);
            }
        } catch (error) {
            console.warn('Failed to load saved filters:', error);
        }
    }

    /**
     * Get filter statistics
     * @returns {object} Filter statistics
     */
    getFilterStats() {
        const visibleSections = document.querySelectorAll('.config-section:not([style*="display: none"])');
        const totalSections = document.querySelectorAll('.config-section');
        
        let visibleParams = 0;
        let totalParams = 0;
        
        visibleSections.forEach(section => {
            const params = section.querySelectorAll('.parameter-item:not([style*="display: none"])');
            visibleParams += params.length;
        });
        
        totalSections.forEach(section => {
            const params = section.querySelectorAll('.parameter-item');
            totalParams += params.length;
        });
        
        return {
            visibleSections: visibleSections.length,
            totalSections: totalSections.length,
            visibleParameters: visibleParams,
            totalParameters: totalParams,
            hasActiveFilters: this.hasActiveFilters()
        };
    }

    /**
     * Check if any filters are active
     * @returns {boolean} True if any filters are active
     */
    hasActiveFilters() {
        return (
            this.filters.search.trim() !== '' ||
            this.filters.showModifiedOnly !== DEFAULTS.SHOW_MODIFIED_ONLY ||
            this.filters.hideDeprecated !== DEFAULTS.HIDE_DEPRECATED ||
            this.filters.platform !== DEFAULTS.SELECTED_PLATFORM
        );
    }

    /**
     * Export current filter state
     * @returns {object} Filter state
     */
    exportFilterState() {
        return {
            filters: { ...this.filters },
            stats: this.getFilterStats(),
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Import filter state
     * @param {object} filterState - Filter state to import
     */
    importFilterState(filterState) {
        if (filterState && filterState.filters) {
            this.filters = {
                ...this.filters,
                ...filterState.filters
            };
            
            this.updateFilterControls();
            this.applyFilters();
            this.saveFilters();
            
            console.log('Imported filter state:', this.filters);
        }
    }
}

// Create and export singleton instance
export const filterManager = new FilterManager();
