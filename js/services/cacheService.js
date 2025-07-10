/**
 * Cache Service
 * Handles local storage caching with automatic expiration and refresh
 */

import { CACHE_CONFIG, ERROR_MESSAGES } from '../utils/constants.js';
import { retryWithBackoff } from '../utils/helpers.js';

class CacheService {
    constructor() {
        this.storage = window.localStorage;
        this.isSupported = this.checkStorageSupport();
    }

    /**
     * Check if localStorage is supported and available
     * @returns {boolean} True if localStorage is supported
     */
    checkStorageSupport() {
        try {
            const testKey = '__cache_test__';
            this.storage.setItem(testKey, 'test');
            this.storage.removeItem(testKey);
            return true;
        } catch (error) {
            console.warn('localStorage not supported:', error);
            return false;
        }
    }

    /**
     * Get cache key with prefix
     * @param {string} key - Cache key
     * @returns {string} Prefixed cache key
     */
    getCacheKey(key) {
        return `${CACHE_CONFIG.CACHE_KEY_PREFIX}${key}`;
    }

    /**
     * Check if cache is expired
     * @param {number} timestamp - Cache timestamp
     * @returns {boolean} True if cache is expired
     */
    isCacheExpired(timestamp) {
        const now = Date.now();
        return (now - timestamp) > CACHE_CONFIG.CACHE_DURATION;
    }

    /**
     * Set cache item with timestamp
     * @param {string} key - Cache key
     * @param {any} data - Data to cache
     * @returns {boolean} Success status
     */
    set(key, data) {
        if (!this.isSupported) {
            console.warn('Cache not supported, skipping set operation');
            return false;
        }

        try {
            const cacheItem = {
                data: data,
                timestamp: Date.now(),
                version: 1
            };

            const serialized = JSON.stringify(cacheItem);
            this.storage.setItem(this.getCacheKey(key), serialized);
            
            // Update last update timestamp
            this.storage.setItem(
                this.getCacheKey(CACHE_CONFIG.LAST_UPDATE_KEY), 
                Date.now().toString()
            );

            return true;
        } catch (error) {
            console.error('Cache set error:', error);
            
            // Handle quota exceeded error
            if (error.name === 'QuotaExceededError') {
                this.clearExpiredItems();
                try {
                    const cacheItem = {
                        data: data,
                        timestamp: Date.now(),
                        version: 1
                    };
                    this.storage.setItem(this.getCacheKey(key), JSON.stringify(cacheItem));
                    return true;
                } catch (retryError) {
                    console.error('Cache set retry failed:', retryError);
                }
            }
            
            return false;
        }
    }

    /**
     * Get cache item if not expired
     * @param {string} key - Cache key
     * @returns {any|null} Cached data or null if not found/expired
     */
    get(key) {
        if (!this.isSupported) {
            return null;
        }

        try {
            const cached = this.storage.getItem(this.getCacheKey(key));
            if (!cached) {
                return null;
            }

            const cacheItem = JSON.parse(cached);
            
            // Check if cache is expired
            if (this.isCacheExpired(cacheItem.timestamp)) {
                this.remove(key);
                return null;
            }

            return cacheItem.data;
        } catch (error) {
            console.error('Cache get error:', error);
            this.remove(key); // Remove corrupted cache item
            return null;
        }
    }

    /**
     * Remove cache item
     * @param {string} key - Cache key
     * @returns {boolean} Success status
     */
    remove(key) {
        if (!this.isSupported) {
            return false;
        }

        try {
            this.storage.removeItem(this.getCacheKey(key));
            return true;
        } catch (error) {
            console.error('Cache remove error:', error);
            return false;
        }
    }

    /**
     * Check if cache item exists and is not expired
     * @param {string} key - Cache key
     * @returns {boolean} True if cache exists and is valid
     */
    has(key) {
        return this.get(key) !== null;
    }

    /**
     * Get cache item age in milliseconds
     * @param {string} key - Cache key
     * @returns {number|null} Age in milliseconds or null if not found
     */
    getAge(key) {
        if (!this.isSupported) {
            return null;
        }

        try {
            const cached = this.storage.getItem(this.getCacheKey(key));
            if (!cached) {
                return null;
            }

            const cacheItem = JSON.parse(cached);
            return Date.now() - cacheItem.timestamp;
        } catch (error) {
            console.error('Cache age error:', error);
            return null;
        }
    }

    /**
     * Get last cache update timestamp
     * @returns {number|null} Timestamp or null if not found
     */
    getLastUpdate() {
        if (!this.isSupported) {
            return null;
        }

        try {
            const timestamp = this.storage.getItem(
                this.getCacheKey(CACHE_CONFIG.LAST_UPDATE_KEY)
            );
            return timestamp ? parseInt(timestamp, 10) : null;
        } catch (error) {
            console.error('Get last update error:', error);
            return null;
        }
    }

    /**
     * Check if cache needs refresh (24 hours old)
     * @returns {boolean} True if cache needs refresh
     */
    needsRefresh() {
        const lastUpdate = this.getLastUpdate();
        if (!lastUpdate) {
            return true;
        }

        return this.isCacheExpired(lastUpdate);
    }

    /**
     * Clear all cache items with the app prefix
     * @returns {boolean} Success status
     */
    clear() {
        if (!this.isSupported) {
            return false;
        }

        try {
            const keysToRemove = [];
            
            // Find all keys with our prefix
            for (let i = 0; i < this.storage.length; i++) {
                const key = this.storage.key(i);
                if (key && key.startsWith(CACHE_CONFIG.CACHE_KEY_PREFIX)) {
                    keysToRemove.push(key);
                }
            }

            // Remove all found keys
            keysToRemove.forEach(key => {
                this.storage.removeItem(key);
            });

            return true;
        } catch (error) {
            console.error('Cache clear error:', error);
            return false;
        }
    }

    /**
     * Clear only expired cache items
     * @returns {number} Number of items cleared
     */
    clearExpiredItems() {
        if (!this.isSupported) {
            return 0;
        }

        let clearedCount = 0;

        try {
            const keysToCheck = [];
            
            // Find all keys with our prefix
            for (let i = 0; i < this.storage.length; i++) {
                const key = this.storage.key(i);
                if (key && key.startsWith(CACHE_CONFIG.CACHE_KEY_PREFIX)) {
                    keysToCheck.push(key);
                }
            }

            // Check each key and remove if expired
            keysToCheck.forEach(fullKey => {
                try {
                    const cached = this.storage.getItem(fullKey);
                    if (cached) {
                        const cacheItem = JSON.parse(cached);
                        if (this.isCacheExpired(cacheItem.timestamp)) {
                            this.storage.removeItem(fullKey);
                            clearedCount++;
                        }
                    }
                } catch (error) {
                    // Remove corrupted items
                    this.storage.removeItem(fullKey);
                    clearedCount++;
                }
            });

        } catch (error) {
            console.error('Clear expired items error:', error);
        }

        return clearedCount;
    }

    /**
     * Get cache statistics
     * @returns {object} Cache statistics
     */
    getStats() {
        if (!this.isSupported) {
            return {
                supported: false,
                totalItems: 0,
                totalSize: 0,
                lastUpdate: null
            };
        }

        let totalItems = 0;
        let totalSize = 0;

        try {
            for (let i = 0; i < this.storage.length; i++) {
                const key = this.storage.key(i);
                if (key && key.startsWith(CACHE_CONFIG.CACHE_KEY_PREFIX)) {
                    totalItems++;
                    const value = this.storage.getItem(key);
                    if (value) {
                        totalSize += value.length;
                    }
                }
            }
        } catch (error) {
            console.error('Get cache stats error:', error);
        }

        return {
            supported: true,
            totalItems,
            totalSize,
            lastUpdate: this.getLastUpdate(),
            needsRefresh: this.needsRefresh()
        };
    }

    /**
     * Force refresh cache by clearing all items
     * @returns {boolean} Success status
     */
    forceRefresh() {
        return this.clear();
    }
}

// Create and export singleton instance
export const cacheService = new CacheService();
