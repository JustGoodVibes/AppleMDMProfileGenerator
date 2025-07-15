/**
 * Main Application Entry Point
 * Initializes and coordinates all application components
 */

import { UI_STATES, ERROR_MESSAGES, SUCCESS_MESSAGES } from './utils/constants.js';
import { dataService } from './services/dataService.js';
import { cacheService } from './services/cacheService.js';
import { progressService } from './services/progressService.js';
import { uiManager } from './managers/uiManager.js';
import { filterManager } from './managers/filterManager.js';
import { stateManager } from './managers/stateManager.js';

class App {
    constructor() {
        this.isInitialized = false;
        this.loadAttempts = 0;
        this.maxLoadAttempts = 3;
    }

    /**
     * Initialize the application
     */
    async initialize() {
        if (this.isInitialized) return;
        
        try {
            console.log('Initializing Apple MDM Profile Generator...');

            // Initialize progress service first
            progressService.initialize();
            progressService.updateStatus('Initializing application...');

            // Initialize managers
            uiManager.initialize();
            filterManager.initialize();
            stateManager.initialize();

            progressService.log('Managers initialized successfully', 'success');

            // Setup global event listeners
            this.setupGlobalEventListeners();

            // Load data
            await this.loadData();

            this.isInitialized = true;
            console.log('Application initialized successfully');

        } catch (error) {
            console.error('Failed to initialize application:', error);
            progressService.log(`Initialization failed: ${error.message}`, 'error');
            this.handleInitializationError(error);
        }
    }

    /**
     * Setup global event listeners
     */
    setupGlobalEventListeners() {
        // Retry data load event
        document.addEventListener('retryDataLoad', () => {
            this.retryDataLoad();
        });
        
        // Window resize for responsive adjustments
        window.addEventListener('resize', () => {
            this.handleWindowResize();
        });
        
        // Online/offline status
        window.addEventListener('online', () => {
            this.handleOnlineStatus(true);
        });
        
        window.addEventListener('offline', () => {
            this.handleOnlineStatus(false);
        });
        
        // Unhandled errors
        window.addEventListener('error', (e) => {
            this.handleGlobalError(e);
        });
        
        // Unhandled promise rejections
        window.addEventListener('unhandledrejection', (e) => {
            this.handleGlobalError(e);
        });
    }

    /**
     * Load application data
     */
    async loadData() {
        this.loadAttempts++;

        try {
            uiManager.setState(UI_STATES.LOADING);
            progressService.reset(); // Reset progress for new load
            progressService.updateStatus('Checking cache status...');

            // Check if we need to refresh cache
            const needsRefresh = dataService.needsRefresh();
            progressService.log(`Cache refresh needed: ${needsRefresh}`, 'info');

            // Try to load cached data first for faster startup
            if (!needsRefresh) {
                progressService.updateStatus('Checking for cached data...');
                const cachedData = dataService.getCachedData();
                if (cachedData) {
                    progressService.log('Found valid cached data, loading...', 'success');
                    progressService.updateStatus('Loading from cache...');

                    uiManager.loadSectionsData(cachedData);

                    // Restore UI state
                    stateManager.restoreUIState();

                    progressService.log('Cache data loaded successfully', 'success');

                    // Still fetch fresh data in background if needed
                    if (navigator.onLine) {
                        progressService.log('Starting background refresh...', 'info');
                        this.refreshDataInBackground();
                    }

                    return;
                } else {
                    progressService.log('No valid cached data found', 'warning');
                }
            }

            // Load fresh data
            progressService.updateStatus('Loading fresh data from Apple...');
            progressService.log('Starting fresh data load from Apple servers', 'info');

            const data = await dataService.loadAllData(needsRefresh);

            progressService.updateStatus('Loading data into interface...');

            // Load data into UI
            uiManager.loadSectionsData(data);

            // Restore UI state
            stateManager.restoreUIState();

            // Show success message if this was a retry
            if (this.loadAttempts > 1) {
                uiManager.showNotification(SUCCESS_MESSAGES.DATA_LOADED, 'success');
            }

        } catch (error) {
            console.error('Failed to load data:', error);
            progressService.log(`Data load failed: ${error.message}`, 'error');

            // Try to fall back to cached data
            progressService.updateStatus('Attempting to load cached data...');
            const cachedData = dataService.getCachedData();
            if (cachedData) {
                progressService.log('Falling back to cached data', 'warning');
                uiManager.loadSectionsData(cachedData);
                stateManager.restoreUIState();

                uiManager.showNotification(
                    'Using cached data. Some information may be outdated.',
                    'warning'
                );
                return;
            }

            // Show error state
            progressService.log('No fallback data available', 'error');
            this.handleDataLoadError(error);
        }
    }

    /**
     * Refresh data in background
     */
    async refreshDataInBackground() {
        try {
            console.log('Refreshing data in background...');
            const data = await dataService.loadAllData(true);
            
            // Check if data has changed significantly
            const currentSections = uiManager.getSectionsData();
            if (this.hasDataChanged(currentSections, data.sections)) {
                // Show notification about updated data
                uiManager.showNotification(
                    'Updated specifications available. Refresh to see changes.',
                    'info'
                );
            }
            
        } catch (error) {
            console.warn('Background refresh failed:', error);
            // Don't show error for background refresh
        }
    }

    /**
     * Check if data has changed significantly
     * @param {Array} oldSections - Old sections data
     * @param {Array} newSections - New sections data
     * @returns {boolean} True if data has changed
     */
    hasDataChanged(oldSections, newSections) {
        if (oldSections.length !== newSections.length) {
            return true;
        }
        
        // Simple check - compare section count and parameter counts
        for (let i = 0; i < oldSections.length; i++) {
            const oldSection = oldSections[i];
            const newSection = newSections[i];
            
            if (oldSection.identifier !== newSection.identifier ||
                oldSection.parameters?.length !== newSection.parameters?.length) {
                return true;
            }
        }
        
        return false;
    }

    /**
     * Handle data load error
     * @param {Error} error - Error object
     */
    handleDataLoadError(error) {
        let errorMessage = ERROR_MESSAGES.NETWORK_ERROR;
        
        if (error.message.includes('HTTP')) {
            errorMessage = `Server error: ${error.message}`;
        } else if (error.message.includes('JSON')) {
            errorMessage = ERROR_MESSAGES.PARSE_ERROR;
        } else if (!navigator.onLine) {
            errorMessage = 'No internet connection. Please check your network and try again.';
        }
        
        uiManager.setState(UI_STATES.ERROR, errorMessage);
    }

    /**
     * Handle initialization error
     * @param {Error} error - Error object
     */
    handleInitializationError(error) {
        console.error('Initialization error:', error);
        
        // Show basic error message
        document.body.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; height: 100vh; font-family: -apple-system, BlinkMacSystemFont, sans-serif;">
                <div style="text-align: center; max-width: 500px; padding: 2rem;">
                    <h1 style="color: #FF3B30; margin-bottom: 1rem;">Application Error</h1>
                    <p style="color: #666; margin-bottom: 2rem;">
                        Failed to initialize the Apple MDM Profile Generator. 
                        Please refresh the page and try again.
                    </p>
                    <button onclick="window.location.reload()" 
                            style="background: #007AFF; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 0.5rem; cursor: pointer;">
                        Refresh Page
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Retry data loading
     */
    async retryDataLoad() {
        if (this.loadAttempts >= this.maxLoadAttempts) {
            uiManager.showNotification(
                'Maximum retry attempts reached. Please refresh the page.',
                'error'
            );
            return;
        }
        
        console.log(`Retrying data load (attempt ${this.loadAttempts + 1}/${this.maxLoadAttempts})...`);
        await this.loadData();
    }

    /**
     * Handle window resize
     */
    handleWindowResize() {
        // Debounce resize handling
        clearTimeout(this.resizeTimeout);
        this.resizeTimeout = setTimeout(() => {
            // Handle responsive adjustments if needed
            console.log('Window resized');
        }, 250);
    }

    /**
     * Handle online/offline status
     * @param {boolean} isOnline - Online status
     */
    handleOnlineStatus(isOnline) {
        if (isOnline) {
            console.log('Connection restored');
            uiManager.showNotification('Connection restored', 'success');
            
            // Try to refresh data if we're in error state
            if (uiManager.getCurrentState() === UI_STATES.ERROR) {
                this.retryDataLoad();
            }
        } else {
            console.log('Connection lost');
            uiManager.showNotification('Connection lost. Working offline.', 'warning');
        }
    }

    /**
     * Handle global errors
     * @param {Event} event - Error event
     */
    handleGlobalError(event) {
        console.error('Global error:', event);
        
        // Don't show notifications for every error, just log them
        // Only show critical errors that affect functionality
        if (event.error && event.error.message.includes('ChunkLoadError')) {
            uiManager.showNotification(
                'Failed to load application resources. Please refresh the page.',
                'error'
            );
        }
    }

    /**
     * Get application status
     * @returns {object} Application status
     */
    getStatus() {
        return {
            initialized: this.isInitialized,
            loadAttempts: this.loadAttempts,
            currentState: uiManager.getCurrentState(),
            cacheStats: cacheService.getStats(),
            stateStats: stateManager.getStateStats(),
            filterStats: filterManager.getFilterStats()
        };
    }

    /**
     * Reset application to initial state
     */
    async reset() {
        try {
            console.log('Resetting application...');
            
            // Clear all data
            dataService.clearCache();
            stateManager.resetState();
            filterManager.resetFilters();
            
            // Reinitialize
            this.isInitialized = false;
            this.loadAttempts = 0;
            
            await this.initialize();
            
            uiManager.showNotification('Application reset successfully', 'success');
            
        } catch (error) {
            console.error('Failed to reset application:', error);
            uiManager.showNotification('Failed to reset application', 'error');
        }
    }

    /**
     * Force refresh data
     */
    async forceRefresh() {
        try {
            console.log('Force refreshing data...');
            
            uiManager.setState(UI_STATES.LOADING);
            
            // Clear cache and reload
            dataService.clearCache();
            await this.loadData();
            
            uiManager.showNotification('Data refreshed successfully', 'success');
            
        } catch (error) {
            console.error('Failed to refresh data:', error);
            this.handleDataLoadError(error);
        }
    }
}

// Create app instance
const app = new App();

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        app.initialize();
    });
} else {
    app.initialize();
}

// Export for debugging
window.app = app;

// Export for module usage
export default app;
