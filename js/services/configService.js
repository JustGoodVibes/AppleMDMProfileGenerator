/**
 * Configuration Service
 * Manages application configuration settings including API behavior
 */

import { CACHE_CONFIG } from '../utils/constants.js';

class ConfigService {
    constructor() {
        this.config = {
            // Default configuration values
            USE_LIVE_API: true,
            CACHE_ENABLED: true,
            CACHE_DURATION: CACHE_CONFIG.CACHE_DURATION,
            DEBUG_MODE: false,
            API_TIMEOUT: 30000, // 30 seconds
            RETRY_ATTEMPTS: 3,
            RETRY_DELAY: 1000 // 1 second
        };
        
        this.loadConfiguration();
    }

    /**
     * Load configuration from various sources
     * Priority: URL params > localStorage > environment > defaults
     */
    loadConfiguration() {
        try {
            // 1. Load from localStorage
            this.loadFromStorage();
            
            // 2. Load from URL parameters (highest priority)
            this.loadFromUrlParams();
            
            // 3. Load from environment variables (if available)
            this.loadFromEnvironment();
            
            // 4. Validate configuration
            this.validateConfiguration();
            
            console.log('Configuration loaded:', this.config);
        } catch (error) {
            console.warn('Error loading configuration, using defaults:', error);
        }
    }

    /**
     * Load configuration from localStorage
     */
    loadFromStorage() {
        try {
            const stored = localStorage.getItem('apple_mdm_config');
            if (stored) {
                const parsedConfig = JSON.parse(stored);
                this.config = { ...this.config, ...parsedConfig };
            }
        } catch (error) {
            console.warn('Error loading config from localStorage:', error);
        }
    }

    /**
     * Load configuration from URL parameters
     */
    loadFromUrlParams() {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            
            // Check for USE_LIVE_API parameter
            if (urlParams.has('use_live_api')) {
                const value = urlParams.get('use_live_api').toLowerCase();
                this.config.USE_LIVE_API = value === 'true' || value === '1';
            }
            
            // Check for debug mode
            if (urlParams.has('debug')) {
                const value = urlParams.get('debug').toLowerCase();
                this.config.DEBUG_MODE = value === 'true' || value === '1';
            }
            
            // Check for cache enabled
            if (urlParams.has('cache_enabled')) {
                const value = urlParams.get('cache_enabled').toLowerCase();
                this.config.CACHE_ENABLED = value === 'true' || value === '1';
            }
            
            // Check for API timeout
            if (urlParams.has('api_timeout')) {
                const timeout = parseInt(urlParams.get('api_timeout'), 10);
                if (!isNaN(timeout) && timeout > 0) {
                    this.config.API_TIMEOUT = timeout;
                }
            }
        } catch (error) {
            console.warn('Error loading config from URL params:', error);
        }
    }

    /**
     * Load configuration from environment variables (if available)
     */
    loadFromEnvironment() {
        try {
            // Check if we're in a Node.js environment or have access to process.env
            if (typeof process !== 'undefined' && process.env) {
                if (process.env.USE_LIVE_API !== undefined) {
                    this.config.USE_LIVE_API = process.env.USE_LIVE_API === 'true';
                }
                
                if (process.env.DEBUG_MODE !== undefined) {
                    this.config.DEBUG_MODE = process.env.DEBUG_MODE === 'true';
                }
                
                if (process.env.API_TIMEOUT !== undefined) {
                    const timeout = parseInt(process.env.API_TIMEOUT, 10);
                    if (!isNaN(timeout) && timeout > 0) {
                        this.config.API_TIMEOUT = timeout;
                    }
                }
            }
        } catch (error) {
            // Environment variables not available in browser, ignore
        }
    }

    /**
     * Validate configuration values
     */
    validateConfiguration() {
        // Ensure boolean values are actually booleans
        this.config.USE_LIVE_API = Boolean(this.config.USE_LIVE_API);
        this.config.CACHE_ENABLED = Boolean(this.config.CACHE_ENABLED);
        this.config.DEBUG_MODE = Boolean(this.config.DEBUG_MODE);
        
        // Ensure numeric values are valid
        if (typeof this.config.API_TIMEOUT !== 'number' || this.config.API_TIMEOUT <= 0) {
            this.config.API_TIMEOUT = 30000;
        }
        
        if (typeof this.config.RETRY_ATTEMPTS !== 'number' || this.config.RETRY_ATTEMPTS < 0) {
            this.config.RETRY_ATTEMPTS = 3;
        }
        
        if (typeof this.config.RETRY_DELAY !== 'number' || this.config.RETRY_DELAY < 0) {
            this.config.RETRY_DELAY = 1000;
        }
    }

    /**
     * Get a configuration value
     * @param {string} key - Configuration key
     * @returns {any} Configuration value
     */
    get(key) {
        return this.config[key];
    }

    /**
     * Set a configuration value
     * @param {string} key - Configuration key
     * @param {any} value - Configuration value
     * @param {boolean} persist - Whether to persist to localStorage
     */
    set(key, value, persist = true) {
        this.config[key] = value;
        
        if (persist) {
            this.saveToStorage();
        }
        
        // Log configuration changes in debug mode
        if (this.config.DEBUG_MODE) {
            console.log(`Configuration updated: ${key} = ${value}`);
        }
    }

    /**
     * Save configuration to localStorage
     */
    saveToStorage() {
        try {
            localStorage.setItem('apple_mdm_config', JSON.stringify(this.config));
        } catch (error) {
            console.warn('Error saving config to localStorage:', error);
        }
    }

    /**
     * Reset configuration to defaults
     */
    reset() {
        this.config = {
            USE_LIVE_API: true,
            CACHE_ENABLED: true,
            CACHE_DURATION: CACHE_CONFIG.CACHE_DURATION,
            DEBUG_MODE: false,
            API_TIMEOUT: 30000,
            RETRY_ATTEMPTS: 3,
            RETRY_DELAY: 1000
        };
        
        this.saveToStorage();
        console.log('Configuration reset to defaults');
    }

    /**
     * Get all configuration values
     * @returns {object} Complete configuration object
     */
    getAll() {
        return { ...this.config };
    }

    /**
     * Check if live API should be used
     * @returns {boolean} True if live API should be used
     */
    shouldUseLiveAPI() {
        return this.config.USE_LIVE_API && this.config.CACHE_ENABLED;
    }

    /**
     * Check if cache is enabled
     * @returns {boolean} True if cache is enabled
     */
    isCacheEnabled() {
        return this.config.CACHE_ENABLED;
    }

    /**
     * Check if debug mode is enabled
     * @returns {boolean} True if debug mode is enabled
     */
    isDebugMode() {
        return this.config.DEBUG_MODE;
    }

    /**
     * Get API timeout value
     * @returns {number} API timeout in milliseconds
     */
    getApiTimeout() {
        return this.config.API_TIMEOUT;
    }

    /**
     * Get retry configuration
     * @returns {object} Retry configuration
     */
    getRetryConfig() {
        return {
            attempts: this.config.RETRY_ATTEMPTS,
            delay: this.config.RETRY_DELAY
        };
    }

    /**
     * Update configuration from an object
     * @param {object} updates - Configuration updates
     * @param {boolean} persist - Whether to persist to localStorage
     */
    update(updates, persist = true) {
        Object.assign(this.config, updates);
        this.validateConfiguration();
        
        if (persist) {
            this.saveToStorage();
        }
        
        if (this.config.DEBUG_MODE) {
            console.log('Configuration updated:', updates);
        }
    }

    /**
     * Export configuration for debugging
     * @returns {string} JSON string of configuration
     */
    export() {
        return JSON.stringify(this.config, null, 2);
    }

    /**
     * Import configuration from JSON string
     * @param {string} configJson - JSON string of configuration
     * @param {boolean} persist - Whether to persist to localStorage
     */
    import(configJson, persist = true) {
        try {
            const imported = JSON.parse(configJson);
            this.update(imported, persist);
            console.log('Configuration imported successfully');
        } catch (error) {
            console.error('Error importing configuration:', error);
            throw new Error('Invalid configuration JSON');
        }
    }
}

// Create and export singleton instance
export const configService = new ConfigService();
