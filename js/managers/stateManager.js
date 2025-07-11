/**
 * State Manager
 * Handles application state persistence and restoration
 */

import { STORAGE_KEYS, DEFAULTS } from '../utils/constants.js';
import { deepClone, deepEqual } from '../utils/helpers.js';
import { exportService } from '../services/exportService.js';

class StateManager {
    constructor() {
        this.state = {
            userPreferences: {
                expandedSections: [],
                selectedPlatform: DEFAULTS.SELECTED_PLATFORM,
                showDeprecated: DEFAULTS.SHOW_DEPRECATED,
                showModifiedOnly: DEFAULTS.SHOW_MODIFIED_ONLY
            },
            modifiedParameters: new Map(),
            uiState: {
                activeSection: null,
                scrollPosition: 0,
                sidebarCollapsed: false
            }
        };
        
        this.isInitialized = false;
        this.autoSaveEnabled = true;
        this.saveTimeout = null;
    }

    /**
     * Initialize the state manager
     */
    initialize() {
        if (this.isInitialized) return;
        
        this.loadState();
        this.setupEventListeners();
        this.isInitialized = true;
        
        console.log('State Manager initialized');
    }

    /**
     * Setup event listeners for state changes
     */
    setupEventListeners() {
        // Parameter changes
        document.addEventListener('parameterChanged', (e) => {
            this.handleParameterChange(e.detail);
        });
        
        // Section expand/collapse
        document.addEventListener('sectionToggled', (e) => {
            this.handleSectionToggle(e.detail);
        });
        
        // Scroll position tracking
        window.addEventListener('scroll', () => {
            this.handleScroll();
        });
        
        // Before page unload
        window.addEventListener('beforeunload', () => {
            this.saveState();
        });
        
        // Visibility change (tab switching)
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.saveState();
            }
        });
    }

    /**
     * Handle parameter value change
     * @param {object} detail - Change detail
     */
    handleParameterChange(detail) {
        const { sectionId, parameterKey, value } = detail;
        const key = `${sectionId}.${parameterKey}`;
        
        if (value === undefined || value === null || value === '') {
            this.state.modifiedParameters.delete(key);
        } else {
            this.state.modifiedParameters.set(key, {
                sectionId,
                parameterKey,
                value,
                timestamp: Date.now()
            });
        }
        
        this.scheduleAutoSave();
    }

    /**
     * Handle section toggle
     * @param {object} detail - Toggle detail
     */
    handleSectionToggle(detail) {
        const { sectionId, expanded } = detail;
        
        if (expanded) {
            if (!this.state.userPreferences.expandedSections.includes(sectionId)) {
                this.state.userPreferences.expandedSections.push(sectionId);
            }
        } else {
            const index = this.state.userPreferences.expandedSections.indexOf(sectionId);
            if (index > -1) {
                this.state.userPreferences.expandedSections.splice(index, 1);
            }
        }
        
        this.scheduleAutoSave();
    }

    /**
     * Handle scroll position change
     */
    handleScroll() {
        this.state.uiState.scrollPosition = window.scrollY;
        
        // Don't auto-save scroll position immediately (too frequent)
        // It will be saved on other state changes or page unload
    }

    /**
     * Set user preference
     * @param {string} key - Preference key
     * @param {any} value - Preference value
     */
    setUserPreference(key, value) {
        if (this.state.userPreferences.hasOwnProperty(key)) {
            this.state.userPreferences[key] = value;
            this.scheduleAutoSave();
        } else {
            console.warn(`Unknown user preference: ${key}`);
        }
    }

    /**
     * Get user preference
     * @param {string} key - Preference key
     * @returns {any} Preference value
     */
    getUserPreference(key) {
        return this.state.userPreferences[key];
    }

    /**
     * Set UI state
     * @param {string} key - State key
     * @param {any} value - State value
     */
    setUIState(key, value) {
        if (this.state.uiState.hasOwnProperty(key)) {
            this.state.uiState[key] = value;
            this.scheduleAutoSave();
        } else {
            console.warn(`Unknown UI state: ${key}`);
        }
    }

    /**
     * Get UI state
     * @param {string} key - State key
     * @returns {any} State value
     */
    getUIState(key) {
        return this.state.uiState[key];
    }

    /**
     * Get all modified parameters
     * @returns {Map} Modified parameters map
     */
    getModifiedParameters() {
        return new Map(this.state.modifiedParameters);
    }

    /**
     * Set modified parameters (for restoration)
     * @param {Map} parameters - Parameters map
     */
    setModifiedParameters(parameters) {
        this.state.modifiedParameters = new Map(parameters);
        
        // Update export service
        this.syncWithExportService();
        
        this.scheduleAutoSave();
    }

    /**
     * Clear all modified parameters
     */
    clearModifiedParameters() {
        this.state.modifiedParameters.clear();
        exportService.clearModifiedParameters();
        this.scheduleAutoSave();
    }

    /**
     * Sync state with export service
     */
    syncWithExportService() {
        // Clear export service first
        exportService.clearModifiedParameters();
        
        // Restore parameters to export service
        this.state.modifiedParameters.forEach((param, key) => {
            exportService.setParameter(
                param.sectionId,
                param.parameterKey,
                param.value,
                { type: 'string', required: false, platforms: [] } // Basic info
            );
        });
    }

    /**
     * Schedule auto-save with debouncing
     */
    scheduleAutoSave() {
        if (!this.autoSaveEnabled) return;
        
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
        }
        
        this.saveTimeout = setTimeout(() => {
            this.saveState();
        }, 1000); // Save after 1 second of inactivity
    }

    /**
     * Save current state to localStorage
     */
    saveState() {
        try {
            // Convert Map to Array for JSON serialization
            const modifiedParamsArray = Array.from(this.state.modifiedParameters.entries());
            
            const stateToSave = {
                userPreferences: deepClone(this.state.userPreferences),
                modifiedParameters: modifiedParamsArray,
                uiState: deepClone(this.state.uiState),
                timestamp: Date.now(),
                version: 1
            };
            
            // Save each part separately to avoid localStorage size limits
            localStorage.setItem(STORAGE_KEYS.USER_PREFERENCES, JSON.stringify(stateToSave.userPreferences));
            localStorage.setItem(STORAGE_KEYS.MODIFIED_PARAMETERS, JSON.stringify(stateToSave.modifiedParameters));
            localStorage.setItem(STORAGE_KEYS.UI_STATE, JSON.stringify(stateToSave.uiState));
            
            console.log('State saved successfully');
            
        } catch (error) {
            console.error('Failed to save state:', error);
            
            // Try to clear some space and retry
            if (error.name === 'QuotaExceededError') {
                this.clearOldState();
                try {
                    this.saveState();
                } catch (retryError) {
                    console.error('Failed to save state after cleanup:', retryError);
                }
            }
        }
    }

    /**
     * Load state from localStorage
     */
    loadState() {
        try {
            // Load user preferences
            const userPrefs = localStorage.getItem(STORAGE_KEYS.USER_PREFERENCES);
            if (userPrefs) {
                const parsed = JSON.parse(userPrefs);
                this.state.userPreferences = {
                    ...this.state.userPreferences,
                    ...parsed
                };
            }
            
            // Load modified parameters
            const modifiedParams = localStorage.getItem(STORAGE_KEYS.MODIFIED_PARAMETERS);
            if (modifiedParams) {
                const parsed = JSON.parse(modifiedParams);
                this.state.modifiedParameters = new Map(parsed);
            }
            
            // Load UI state
            const uiState = localStorage.getItem(STORAGE_KEYS.UI_STATE);
            if (uiState) {
                const parsed = JSON.parse(uiState);
                this.state.uiState = {
                    ...this.state.uiState,
                    ...parsed
                };
            }
            
            console.log('State loaded successfully');
            
        } catch (error) {
            console.error('Failed to load state:', error);
            this.resetState();
        }
    }

    /**
     * Reset state to defaults
     */
    resetState() {
        this.state = {
            userPreferences: {
                expandedSections: [],
                selectedPlatform: DEFAULTS.SELECTED_PLATFORM,
                showDeprecated: DEFAULTS.SHOW_DEPRECATED,
                showModifiedOnly: DEFAULTS.SHOW_MODIFIED_ONLY
            },
            modifiedParameters: new Map(),
            uiState: {
                activeSection: null,
                scrollPosition: 0,
                sidebarCollapsed: false
            }
        };
        
        this.clearStoredState();
        console.log('State reset to defaults');
    }

    /**
     * Clear stored state from localStorage
     */
    clearStoredState() {
        try {
            localStorage.removeItem(STORAGE_KEYS.USER_PREFERENCES);
            localStorage.removeItem(STORAGE_KEYS.MODIFIED_PARAMETERS);
            localStorage.removeItem(STORAGE_KEYS.UI_STATE);
            console.log('Stored state cleared');
        } catch (error) {
            console.error('Failed to clear stored state:', error);
        }
    }

    /**
     * Clear old state data to free up space
     */
    clearOldState() {
        // For now, just clear all state
        // In the future, could implement more sophisticated cleanup
        this.clearStoredState();
    }

    /**
     * Reset all application data and state
     * This is a comprehensive reset that clears everything
     */
    resetAllData() {
        console.log('Starting complete application reset...');

        try {
            // Reset internal state
            this.resetState();

            // Clear export service data
            if (typeof exportService !== 'undefined') {
                exportService.clearModifiedParameters();
            }

            // Clear filter manager localStorage
            try {
                localStorage.removeItem('apple_mdm_filters');
            } catch (error) {
                console.warn('Failed to clear filter localStorage:', error);
            }

            // Clear any other application-specific localStorage keys
            const keysToRemove = [
                'apple_mdm_cache',
                'apple_mdm_user_settings',
                'apple_mdm_section_states'
            ];

            keysToRemove.forEach(key => {
                try {
                    localStorage.removeItem(key);
                } catch (error) {
                    console.warn(`Failed to clear localStorage key ${key}:`, error);
                }
            });

            // Dispatch reset event for other components
            document.dispatchEvent(new CustomEvent('applicationReset', {
                detail: { timestamp: new Date().toISOString() }
            }));

            console.log('Application reset completed successfully');
            return true;

        } catch (error) {
            console.error('Failed to reset application data:', error);
            return false;
        }
    }

    /**
     * Restore UI state after data load
     */
    restoreUIState() {
        // Restore scroll position
        if (this.state.uiState.scrollPosition > 0) {
            setTimeout(() => {
                window.scrollTo(0, this.state.uiState.scrollPosition);
            }, 100);
        }
        
        // Restore expanded sections
        this.state.userPreferences.expandedSections.forEach(sectionId => {
            const event = new CustomEvent('restoreSection', {
                detail: { sectionId, expanded: true }
            });
            document.dispatchEvent(event);
        });
        
        // Sync with export service
        this.syncWithExportService();
        
        console.log('UI state restored');
    }

    /**
     * Export complete application state
     * @returns {object} Complete state
     */
    exportState() {
        return {
            userPreferences: deepClone(this.state.userPreferences),
            modifiedParameters: Array.from(this.state.modifiedParameters.entries()),
            uiState: deepClone(this.state.uiState),
            timestamp: Date.now(),
            version: 1
        };
    }

    /**
     * Import complete application state
     * @param {object} importedState - State to import
     */
    importState(importedState) {
        try {
            if (importedState.userPreferences) {
                this.state.userPreferences = {
                    ...this.state.userPreferences,
                    ...importedState.userPreferences
                };
            }
            
            if (importedState.modifiedParameters) {
                this.state.modifiedParameters = new Map(importedState.modifiedParameters);
            }
            
            if (importedState.uiState) {
                this.state.uiState = {
                    ...this.state.uiState,
                    ...importedState.uiState
                };
            }
            
            this.saveState();
            this.syncWithExportService();
            
            console.log('State imported successfully');
            
        } catch (error) {
            console.error('Failed to import state:', error);
        }
    }

    /**
     * Get state statistics
     * @returns {object} State statistics
     */
    getStateStats() {
        return {
            modifiedParametersCount: this.state.modifiedParameters.size,
            expandedSectionsCount: this.state.userPreferences.expandedSections.length,
            hasStoredState: this.hasStoredState(),
            lastSaved: this.getLastSaveTime()
        };
    }

    /**
     * Check if there is stored state
     * @returns {boolean} True if stored state exists
     */
    hasStoredState() {
        return !!(
            localStorage.getItem(STORAGE_KEYS.USER_PREFERENCES) ||
            localStorage.getItem(STORAGE_KEYS.MODIFIED_PARAMETERS) ||
            localStorage.getItem(STORAGE_KEYS.UI_STATE)
        );
    }

    /**
     * Get last save time
     * @returns {number|null} Last save timestamp
     */
    getLastSaveTime() {
        // This would need to be stored separately if needed
        return null;
    }

    /**
     * Enable or disable auto-save
     * @param {boolean} enabled - Auto-save enabled
     */
    setAutoSave(enabled) {
        this.autoSaveEnabled = enabled;
        
        if (!enabled && this.saveTimeout) {
            clearTimeout(this.saveTimeout);
            this.saveTimeout = null;
        }
    }
}

// Create and export singleton instance
export const stateManager = new StateManager();
