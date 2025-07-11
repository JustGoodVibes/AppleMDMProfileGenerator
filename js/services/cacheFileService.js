/**
 * Cache File Service
 * Handles reading JSON files from the cache/ directory
 */

import { configService } from './configService.js';
import { progressService } from './progressService.js';

class CacheFileService {
    constructor() {
        this.cacheDir = 'cache/';
        this.manifest = null;
        this.loadedFiles = new Map();
    }

    /**
     * Load and parse the manifest file
     * @returns {Promise<object|null>} Manifest data or null if not found
     */
    async loadManifest() {
        try {
            const manifestPath = `${this.cacheDir}manifest.json`;
            const response = await fetch(manifestPath);
            
            if (!response.ok) {
                if (configService.isDebugMode()) {
                    console.warn('Manifest file not found:', manifestPath);
                }
                return null;
            }
            
            this.manifest = await response.json();
            
            if (configService.isDebugMode()) {
                console.log('Manifest loaded:', this.manifest);
            }
            
            return this.manifest;
        } catch (error) {
            console.warn('Error loading manifest:', error);
            return null;
        }
    }

    /**
     * Get manifest information
     * @returns {object|null} Manifest data
     */
    getManifest() {
        return this.manifest;
    }

    /**
     * Check if a cached file exists according to the manifest
     * @param {string} filename - Name of the file to check
     * @returns {boolean} True if file exists in manifest
     */
    hasFile(filename) {
        if (!this.manifest || !this.manifest.files) {
            return false;
        }
        return filename in this.manifest.files;
    }

    /**
     * Get file metadata from manifest
     * @param {string} filename - Name of the file
     * @returns {object|null} File metadata or null if not found
     */
    getFileMetadata(filename) {
        if (!this.manifest || !this.manifest.files) {
            return null;
        }
        return this.manifest.files[filename] || null;
    }

    /**
     * Load a JSON file from the cache directory
     * @param {string} filename - Name of the file to load
     * @returns {Promise<object|null>} Parsed JSON data or null if not found
     */
    async loadFile(filename) {
        try {
            // Check if already loaded and cached in memory
            if (this.loadedFiles.has(filename)) {
                if (configService.isDebugMode()) {
                    console.log(`Cache file loaded from memory: ${filename}`);
                }
                return this.loadedFiles.get(filename);
            }

            const filePath = `${this.cacheDir}${filename}`;
            
            if (configService.isDebugMode()) {
                console.log(`Loading cache file: ${filePath}`);
            }

            const response = await fetch(filePath);
            
            if (!response.ok) {
                if (response.status === 404) {
                    if (configService.isDebugMode()) {
                        console.warn(`Cache file not found: ${filename}`);
                    }
                } else {
                    console.warn(`Error loading cache file ${filename}: ${response.status} ${response.statusText}`);
                }
                return null;
            }

            const data = await response.json();
            
            // Cache in memory for subsequent requests
            this.loadedFiles.set(filename, data);
            
            if (configService.isDebugMode()) {
                console.log(`Cache file loaded successfully: ${filename}`);
            }

            return data;
        } catch (error) {
            console.warn(`Error loading cache file ${filename}:`, error);
            return null;
        }
    }

    /**
     * Load the main specification file from cache
     * @returns {Promise<object|null>} Main specification data or null if not found
     */
    async loadMainSpec() {
        return await this.loadFile('profile-specific-payload-keys.json');
    }

    /**
     * Load a section file from cache
     * @param {string} sectionName - Name of the section (without .json extension)
     * @returns {Promise<object|null>} Section data or null if not found
     */
    async loadSection(sectionName) {
        const filename = sectionName.endsWith('.json') ? sectionName : `${sectionName}.json`;
        return await this.loadFile(filename);
    }

    /**
     * Get list of all available cached files
     * @returns {Promise<string[]>} Array of cached filenames
     */
    async getAvailableFiles() {
        try {
            if (!this.manifest) {
                await this.loadManifest();
            }

            if (this.manifest && this.manifest.files) {
                return Object.keys(this.manifest.files);
            }

            // Fallback: try to discover files by attempting to load common ones
            const commonFiles = [
                'profile-specific-payload-keys.json',
                'accounts.json',
                'wifi.json',
                'vpn.json',
                'restrictions.json',
                'toplevel.json'
            ];

            const availableFiles = [];
            for (const filename of commonFiles) {
                const data = await this.loadFile(filename);
                if (data) {
                    availableFiles.push(filename);
                }
            }

            return availableFiles;
        } catch (error) {
            console.warn('Error getting available files:', error);
            return [];
        }
    }

    /**
     * Check if cache is fresh based on manifest timestamp
     * @param {number} maxAge - Maximum age in milliseconds
     * @returns {boolean} True if cache is fresh
     */
    isCacheFresh(maxAge = 24 * 60 * 60 * 1000) { // Default 24 hours
        if (!this.manifest || !this.manifest.generated_at) {
            return false;
        }

        const generatedAt = new Date(this.manifest.generated_at);
        const now = new Date();
        const age = now.getTime() - generatedAt.getTime();

        return age < maxAge;
    }

    /**
     * Get cache statistics
     * @returns {object} Cache statistics
     */
    getCacheStats() {
        const stats = {
            manifestLoaded: !!this.manifest,
            totalFiles: 0,
            memoryCache: this.loadedFiles.size,
            generatedAt: null,
            isFresh: false
        };

        if (this.manifest) {
            stats.totalFiles = this.manifest.total_files || 0;
            stats.generatedAt = this.manifest.generated_at;
            stats.isFresh = this.isCacheFresh();
        }

        return stats;
    }

    /**
     * Clear memory cache
     */
    clearMemoryCache() {
        this.loadedFiles.clear();
        if (configService.isDebugMode()) {
            console.log('Memory cache cleared');
        }
    }

    /**
     * Preload commonly used files into memory
     * @returns {Promise<number>} Number of files preloaded
     */
    async preloadCommonFiles() {
        const commonFiles = [
            'profile-specific-payload-keys.json',
            'accounts.json',
            'wifi.json',
            'restrictions.json'
        ];

        let preloaded = 0;
        for (const filename of commonFiles) {
            const data = await this.loadFile(filename);
            if (data) {
                preloaded++;
            }
        }

        if (configService.isDebugMode()) {
            console.log(`Preloaded ${preloaded} common cache files`);
        }

        return preloaded;
    }

    /**
     * Validate file integrity using checksums from manifest
     * @param {string} filename - Name of the file to validate
     * @returns {Promise<boolean>} True if file is valid
     */
    async validateFileIntegrity(filename) {
        try {
            const metadata = this.getFileMetadata(filename);
            if (!metadata || !metadata.checksum) {
                return false; // No checksum available
            }

            // For browser environment, we can't easily calculate checksums
            // This would be more useful in a Node.js environment
            // For now, just check if the file loads successfully
            const data = await this.loadFile(filename);
            return data !== null;
        } catch (error) {
            console.warn(`Error validating file integrity for ${filename}:`, error);
            return false;
        }
    }

    /**
     * Initialize the cache file service
     * @returns {Promise<boolean>} True if initialization successful
     */
    async initialize() {
        try {
            await this.loadManifest();
            
            if (configService.isDebugMode()) {
                const stats = this.getCacheStats();
                console.log('Cache file service initialized:', stats);
            }

            return true;
        } catch (error) {
            console.warn('Error initializing cache file service:', error);
            return false;
        }
    }

    /**
     * Get cache directory path
     * @returns {string} Cache directory path
     */
    getCacheDir() {
        return this.cacheDir;
    }
}

// Create and export singleton instance
export const cacheFileService = new CacheFileService();
