/**
 * UI Manager
 * Handles overall UI state and coordination between components
 */

import { UI_STATES, SUCCESS_MESSAGES, ERROR_MESSAGES } from '../utils/constants.js';
import { sectionComponents } from '../components/sectionComponents.js';
import { parameterComponents } from '../components/parameterComponents.js';
import { exportService } from '../services/exportService.js';

class UIManager {
    constructor() {
        this.currentState = UI_STATES.LOADING;
        this.sectionsData = [];
        this.isInitialized = false;
    }

    /**
     * Initialize the UI manager
     */
    initialize() {
        if (this.isInitialized) return;
        
        this.setupEventListeners();
        this.isInitialized = true;
        console.log('UI Manager initialized');
    }

    /**
     * Setup global event listeners
     */
    setupEventListeners() {
        // Parameter change events
        document.addEventListener('parameterChanged', (e) => {
            this.handleParameterChange(e.detail);
        });
        
        // Section parameter loading events
        document.addEventListener('loadSectionParameters', (e) => {
            this.loadSectionParameters(e.detail.sectionId);
        });
        
        // Export button
        const exportBtn = document.getElementById('export-btn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.showExportModal();
            });
        }

        // Reset All button
        const resetBtn = document.getElementById('reset-all-btn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                this.showResetConfirmationModal();
            });
        }
        
        // Modal events
        this.setupModalEvents();
        this.setupResetModalEvents();
        
        // Retry button
        const retryBtn = document.getElementById('retry-btn');
        if (retryBtn) {
            retryBtn.addEventListener('click', () => {
                this.retryDataLoad();
            });
        }
    }

    /**
     * Setup modal event listeners
     */
    setupModalEvents() {
        const modal = document.getElementById('export-modal');
        if (!modal) return;
        
        // Close modal events
        const closeButtons = modal.querySelectorAll('.modal-close');
        closeButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                this.hideExportModal();
            });
        });
        
        // Click outside to close
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.hideExportModal();
            }
        });
        
        // Download button
        const downloadBtn = document.getElementById('download-profile');
        if (downloadBtn) {
            downloadBtn.addEventListener('click', () => {
                this.handleProfileDownload();
            });
        }
        
        // Profile info inputs
        const profileInputs = modal.querySelectorAll('#profile-name, #profile-identifier, #profile-description');
        profileInputs.forEach(input => {
            input.addEventListener('input', () => {
                this.updateExportPreview();
            });
        });
    }

    /**
     * Setup reset confirmation modal events
     */
    setupResetModalEvents() {
        const modal = document.getElementById('reset-confirmation-modal');
        if (!modal) return;

        // Close modal events
        const closeButtons = modal.querySelectorAll('.modal-close');
        closeButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                this.hideResetConfirmationModal();
            });
        });

        // Cancel button
        const cancelBtn = document.getElementById('reset-cancel-btn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                this.hideResetConfirmationModal();
            });
        }

        // Confirm reset button
        const confirmBtn = document.getElementById('reset-confirm-btn');
        if (confirmBtn) {
            confirmBtn.addEventListener('click', () => {
                this.executeReset();
            });
        }

        // Close on backdrop click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.hideResetConfirmationModal();
            }
        });

        // Close on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
                this.hideResetConfirmationModal();
            }
        });
    }

    /**
     * Set UI state
     * @param {string} state - UI state
     * @param {string} message - Optional message
     */
    setState(state, message = '') {
        this.currentState = state;
        
        const loadingScreen = document.getElementById('loading-screen');
        const errorScreen = document.getElementById('error-screen');
        const mainApp = document.getElementById('main-app');
        
        // Hide all screens first
        [loadingScreen, errorScreen, mainApp].forEach(screen => {
            if (screen) screen.classList.add('hidden');
        });
        
        // Show appropriate screen
        switch (state) {
            case UI_STATES.LOADING:
                if (loadingScreen) loadingScreen.classList.remove('hidden');
                break;
                
            case UI_STATES.ERROR:
                if (errorScreen) {
                    errorScreen.classList.remove('hidden');
                    const errorMessage = errorScreen.querySelector('#error-message');
                    if (errorMessage && message) {
                        errorMessage.textContent = message;
                    }
                }
                break;
                
            case UI_STATES.READY:
                if (mainApp) mainApp.classList.remove('hidden');
                break;
        }
    }

    /**
     * Load and display sections data
     * @param {object} data - Sections data
     */
    loadSectionsData(data) {
        try {
            // Validate input data
            if (!data || typeof data !== 'object') {
                throw new Error('Invalid data object provided to loadSectionsData');
            }

            this.sectionsData = Array.isArray(data.sections) ? data.sections : [];

            console.log('Loading sections data:', {
                totalSections: this.sectionsData.length,
                sampleSection: this.sectionsData[0] || 'No sections',
                dataKeys: Object.keys(data)
            });

            // Validate each section has required properties
            const validatedSections = this.sectionsData.map((section, index) => {
                if (!section || typeof section !== 'object') {
                    console.warn(`Section at index ${index} is invalid:`, section);
                    return {
                        identifier: `invalid-section-${index}`,
                        name: `Invalid Section ${index + 1}`,
                        description: 'This section contains invalid data',
                        platforms: [],
                        deprecated: false,
                        parameters: [],
                        error: 'Invalid section data'
                    };
                }

                // Ensure required properties exist
                return {
                    identifier: section.identifier || `section-${index}`,
                    name: section.name || section.title || `Section ${index + 1}`,
                    description: section.description || section.abstract || '',
                    platforms: Array.isArray(section.platforms) ? section.platforms : [],
                    deprecated: Boolean(section.deprecated),
                    parameters: Array.isArray(section.parameters) ? section.parameters : [],
                    url: section.url || '',
                    error: section.error || null
                };
            });

            this.sectionsData = validatedSections;

            // Clear existing content
            sectionComponents.clearSections();
            parameterComponents.clearParameters();

            // Populate navigation
            this.populateNavigation();

            // Populate sections
            this.populateSections();

            // Update statistics
            this.updateStatistics();

            // Set ready state
            this.setState(UI_STATES.READY);

            console.log(`Successfully loaded ${this.sectionsData.length} sections`);

            // Show warning if any sections had errors
            const errorSections = this.sectionsData.filter(s => s.error);
            if (errorSections.length > 0) {
                this.showNotification(
                    `${errorSections.length} section(s) had loading errors. Check console for details.`,
                    'warning'
                );
            }

        } catch (error) {
            console.error('Error loading sections data:', error);
            this.handleDataLoadError(error);
        }
    }

    /**
     * Populate section navigation
     */
    populateNavigation() {
        const navContainer = document.getElementById('section-nav');
        if (!navContainer) return;
        
        navContainer.innerHTML = '';
        
        this.sectionsData.forEach(section => {
            const navItem = sectionComponents.createSectionNavItem(section);
            navContainer.appendChild(navItem);
        });
    }

    /**
     * Populate sections container
     */
    populateSections() {
        const sectionsContainer = document.getElementById('sections-container');
        if (!sectionsContainer) return;
        
        sectionsContainer.innerHTML = '';
        
        this.sectionsData.forEach(section => {
            const sectionEl = sectionComponents.createSectionElement(section);
            sectionsContainer.appendChild(sectionEl);
        });
        
        // Attach parameter event listeners
        parameterComponents.attachEventListeners(sectionsContainer);
    }

    /**
     * Load parameters for a specific section
     * @param {string} sectionId - Section identifier
     */
    loadSectionParameters(sectionId) {
        const section = this.sectionsData.find(s => s.identifier === sectionId);
        if (!section || !section.parameters) return;
        
        const parametersContainer = document.getElementById(`parameters-${sectionId}`);
        if (!parametersContainer) return;
        
        // Clear existing parameters
        parametersContainer.innerHTML = '';
        
        // Create parameter elements
        section.parameters.forEach(parameter => {
            const paramEl = parameterComponents.createParameterElement(parameter, sectionId);
            parametersContainer.appendChild(paramEl);
        });
        
        console.log(`Loaded ${section.parameters.length} parameters for section ${sectionId}`);
    }

    /**
     * Handle parameter value change
     * @param {object} detail - Change detail
     */
    handleParameterChange(detail) {
        const { sectionId, parameterKey, value } = detail;
        
        // Update section modified state
        sectionComponents.updateSectionModifiedState(sectionId);
        
        // Update export button state
        this.updateExportButton();
        
        // Update statistics
        this.updateStatistics();
        
        console.log(`Parameter changed: ${sectionId}.${parameterKey} = ${value}`);
    }

    /**
     * Update export button state
     */
    updateExportButton() {
        const exportBtn = document.getElementById('export-btn');
        if (!exportBtn) return;
        
        const hasModified = exportService.getModifiedCount() > 0;
        exportBtn.disabled = !hasModified;
        
        if (hasModified) {
            exportBtn.innerHTML = `
                <i class="fas fa-download"></i>
                Export Profile (${exportService.getModifiedCount()})
            `;
        } else {
            exportBtn.innerHTML = `
                <i class="fas fa-download"></i>
                Export Profile
            `;
        }
    }

    /**
     * Update statistics display
     */
    updateStatistics() {
        const modifiedCount = document.getElementById('modified-count');
        const totalSections = document.getElementById('total-sections');
        
        if (modifiedCount) {
            modifiedCount.textContent = exportService.getModifiedCount();
        }
        
        if (totalSections) {
            totalSections.textContent = this.sectionsData.length;
        }
    }

    /**
     * Show export modal
     */
    showExportModal() {
        const modal = document.getElementById('export-modal');
        if (!modal) return;
        
        if (exportService.getModifiedCount() === 0) {
            this.showNotification('No parameters have been modified', 'warning');
            return;
        }
        
        // Update preview
        this.updateExportPreview();
        
        // Show modal
        modal.classList.remove('hidden');
        
        // Focus on profile name input
        const profileNameInput = document.getElementById('profile-name');
        if (profileNameInput) {
            profileNameInput.focus();
            profileNameInput.select();
        }
    }

    /**
     * Hide export modal
     */
    hideExportModal() {
        const modal = document.getElementById('export-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
    }

    /**
     * Update export preview
     */
    updateExportPreview() {
        const previewContent = document.getElementById('export-preview-content');
        if (!previewContent) return;
        
        const preview = exportService.generatePreview(this.sectionsData);
        
        let previewText = preview.summary + '\n\n';
        
        preview.sections.forEach(section => {
            previewText += `${section.name}:\n`;
            section.parameters.forEach(param => {
                previewText += `  • ${param.key}: ${param.value}\n`;
            });
            previewText += '\n';
        });
        
        previewContent.textContent = previewText;
    }

    /**
     * Handle profile download
     */
    handleProfileDownload() {
        try {
            const profileInfo = {
                name: document.getElementById('profile-name')?.value || '',
                identifier: document.getElementById('profile-identifier')?.value || '',
                description: document.getElementById('profile-description')?.value || ''
            };
            
            // Validate profile
            const validation = exportService.validateProfile(profileInfo);
            if (!validation.isValid) {
                this.showNotification(validation.errors.join(', '), 'error');
                return;
            }
            
            // Export profile
            exportService.exportProfile(profileInfo, this.sectionsData);
            
            // Show success message
            this.showNotification(SUCCESS_MESSAGES.PROFILE_EXPORTED, 'success');
            
            // Hide modal
            this.hideExportModal();
            
        } catch (error) {
            console.error('Export error:', error);
            this.showNotification(error.message || ERROR_MESSAGES.EXPORT_ERROR, 'error');
        }
    }

    /**
     * Show notification message
     * @param {string} message - Notification message
     * @param {string} type - Notification type (success, error, warning, info)
     */
    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-message">${message}</span>
                <button class="notification-close">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        
        // Add to page
        document.body.appendChild(notification);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 5000);
        
        // Close button handler
        const closeBtn = notification.querySelector('.notification-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            });
        }
        
        // Animate in
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);
    }

    /**
     * Retry data loading
     */
    retryDataLoad() {
        this.setState(UI_STATES.LOADING);
        
        // Trigger data reload
        const event = new CustomEvent('retryDataLoad');
        document.dispatchEvent(event);
    }

    /**
     * Apply filters to sections and parameters
     * @param {object} filters - Filter criteria
     */
    applyFilters(filters) {
        // Filter sections
        sectionComponents.filterSections(filters);
        
        // Filter parameters in visible sections
        const visibleSections = document.querySelectorAll('.config-section:not([style*="display: none"])');
        visibleSections.forEach(sectionEl => {
            const parametersContainer = sectionEl.querySelector('.parameters-container');
            if (parametersContainer) {
                parameterComponents.filterParameters(parametersContainer, filters);
            }
        });
    }

    /**
     * Get current UI state
     * @returns {string} Current UI state
     */
    getCurrentState() {
        return this.currentState;
    }

    /**
     * Handle data loading errors
     * @param {Error} error - Error object
     */
    handleDataLoadError(error) {
        console.error('Data load error in UI Manager:', error);

        // Try to show a helpful error message
        let errorMessage = 'Failed to load configuration data';

        if (error.message.includes('sections')) {
            errorMessage = 'No configuration sections found. The data may be malformed.';
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
            errorMessage = 'Network error loading data. Check your connection and try again.';
        } else if (error.message.includes('parse') || error.message.includes('JSON')) {
            errorMessage = 'Data parsing error. The configuration data may be corrupted.';
        }

        this.setState(UI_STATES.ERROR, errorMessage);
        this.showNotification(errorMessage, 'error');
    }

    /**
     * Get sections data
     * @returns {Array} Sections data
     */
    getSectionsData() {
        return this.sectionsData;
    }

    /**
     * Show reset confirmation modal
     */
    showResetConfirmationModal() {
        const modal = document.getElementById('reset-confirmation-modal');
        if (modal) {
            modal.classList.remove('hidden');

            // Focus the cancel button for accessibility
            const cancelBtn = document.getElementById('reset-cancel-btn');
            if (cancelBtn) {
                setTimeout(() => cancelBtn.focus(), 100);
            }
        }
    }

    /**
     * Hide reset confirmation modal
     */
    hideResetConfirmationModal() {
        const modal = document.getElementById('reset-confirmation-modal');
        if (modal) {
            modal.classList.add('hidden');
        }
    }

    /**
     * Execute the complete application reset
     */
    async executeReset() {
        const confirmBtn = document.getElementById('reset-confirm-btn');
        const resetBtn = document.getElementById('reset-all-btn');

        try {
            // Disable buttons during reset
            if (confirmBtn) {
                confirmBtn.disabled = true;
                confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Resetting...';
            }
            if (resetBtn) {
                resetBtn.disabled = true;
            }

            // Hide the modal
            this.hideResetConfirmationModal();

            // Import managers dynamically to avoid circular dependencies
            const { stateManager } = await import('./stateManager.js');
            const { filterManager } = await import('./filterManager.js');

            // Execute reset on all managers
            const resetSuccess = stateManager.resetAllData();
            filterManager.resetForApplicationReset();

            // Clear parameter values but preserve definitions
            if (typeof parameterComponents !== 'undefined') {
                parameterComponents.clearAllParameters();
            }

            // Reset section UI states but preserve loaded parameters
            if (typeof sectionComponents !== 'undefined') {
                sectionComponents.resetAllSections();
            }

            // Preserve sectionsData but reset UI state
            // Note: sectionsData contains the parameter definitions from Apple's API
            // We should NOT clear this as it would remove all parameter definitions
            this.currentState = UI_STATES.READY;

            // Re-initialize filter controls and update UI state
            setTimeout(() => {
                filterManager.updateFilterControls();
                filterManager.applyFilters();

                // Ensure sections are still visible after reset
                if (this.sectionsData && this.sectionsData.length > 0) {
                    // Re-populate sections if they were cleared
                    this.populateSections(this.sectionsData);
                }

                // Update export button state to reflect cleared parameters
                this.updateExportButton();

                // Update statistics display
                this.updateStatistics();
            }, 100);

            if (resetSuccess) {
                this.showNotification('All data has been reset successfully. The application has returned to its initial state.', 'success');
            } else {
                this.showNotification('Reset completed with some warnings. Please check the console for details.', 'warning');
            }

        } catch (error) {
            console.error('Error during reset operation:', error);
            this.showNotification('An error occurred during reset. Please refresh the page and try again.', 'error');
        } finally {
            // Re-enable buttons
            if (confirmBtn) {
                confirmBtn.disabled = false;
                confirmBtn.innerHTML = '<i class="fas fa-undo"></i> Reset All';
            }
            if (resetBtn) {
                resetBtn.disabled = false;
            }
        }
    }
}

// Create and export singleton instance
export const uiManager = new UIManager();
