/**
 * Progress Service
 * Handles progress tracking and verbose logging during data loading
 */

class ProgressService {
    constructor() {
        this.isVisible = false;
        this.logs = [];
        this.maxLogs = 100;
        this.startTime = null;
    }

    /**
     * Initialize the progress service
     */
    initialize() {
        this.setupEventListeners();
        this.startTime = Date.now();
        console.log('Progress Service initialized');
    }

    /**
     * Setup event listeners for the toggle button
     */
    setupEventListeners() {
        const toggleBtn = document.getElementById('toggle-details');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                this.toggleDetails();
            });
        }
    }

    /**
     * Toggle the visibility of progress details
     */
    toggleDetails() {
        this.isVisible = !this.isVisible;
        
        const detailsContainer = document.getElementById('loading-details');
        const toggleBtn = document.getElementById('toggle-details');
        const toggleText = toggleBtn?.querySelector('span');
        
        if (detailsContainer) {
            detailsContainer.classList.toggle('hidden', !this.isVisible);
        }
        
        if (toggleBtn) {
            toggleBtn.classList.toggle('expanded', this.isVisible);
        }
        
        if (toggleText) {
            toggleText.textContent = this.isVisible ? 'Hide Details' : 'Show Details';
        }
        
        // Scroll to bottom of log when showing
        if (this.isVisible) {
            setTimeout(() => {
                const progressLog = document.getElementById('progress-log');
                if (progressLog) {
                    progressLog.scrollTop = progressLog.scrollHeight;
                }
            }, 100);
        }
    }

    /**
     * Update the main loading status
     * @param {string} status - Status message
     */
    updateStatus(status) {
        const statusElement = document.getElementById('loading-status');
        if (statusElement) {
            statusElement.textContent = status;
        }
        
        this.log(status, 'info');
    }

    /**
     * Log a progress message
     * @param {string} message - Log message
     * @param {string} type - Log type (info, success, error, warning)
     */
    log(message, type = 'info') {
        const timestamp = this.getTimestamp();
        const logEntry = {
            timestamp,
            message,
            type,
            time: Date.now()
        };
        
        this.logs.push(logEntry);
        
        // Keep only the last maxLogs entries
        if (this.logs.length > this.maxLogs) {
            this.logs = this.logs.slice(-this.maxLogs);
        }
        
        // Update the UI
        this.updateProgressLog();
        
        // Also log to console with appropriate level
        const consoleMessage = `[${timestamp}] ${message}`;
        switch (type) {
            case 'error':
                console.error(consoleMessage);
                break;
            case 'warning':
                console.warn(consoleMessage);
                break;
            case 'success':
                console.log(`✅ ${consoleMessage}`);
                break;
            default:
                console.log(consoleMessage);
        }
    }

    /**
     * Get formatted timestamp
     * @returns {string} Formatted timestamp
     */
    getTimestamp() {
        const now = Date.now();
        const elapsed = now - this.startTime;
        const seconds = (elapsed / 1000).toFixed(1);
        return `+${seconds}s`;
    }

    /**
     * Update the progress log UI
     */
    updateProgressLog() {
        const progressLog = document.getElementById('progress-log');
        if (!progressLog) return;
        
        // Only update if details are visible or if we have few logs
        if (!this.isVisible && this.logs.length > 10) return;
        
        const logHTML = this.logs.map(log => `
            <div class="progress-item ${log.type}">
                <span class="progress-timestamp">${log.timestamp}</span>
                <span class="progress-message">${this.escapeHTML(log.message)}</span>
            </div>
        `).join('');
        
        progressLog.innerHTML = logHTML;
        
        // Auto-scroll to bottom
        progressLog.scrollTop = progressLog.scrollHeight;
    }

    /**
     * Escape HTML to prevent XSS
     * @param {string} text - Text to escape
     * @returns {string} Escaped text
     */
    escapeHTML(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Log data fetching progress
     * @param {string} url - URL being fetched
     * @param {string} stage - Stage of the fetch (start, success, error)
     * @param {object} details - Additional details
     */
    logDataFetch(url, stage, details = {}) {
        const urlParts = url.split('/');
        const filename = urlParts[urlParts.length - 1] || 'unknown';
        
        switch (stage) {
            case 'start':
                this.log(`Fetching ${filename}...`, 'info');
                break;
            case 'success':
                const size = details.size ? ` (${this.formatBytes(details.size)})` : '';
                this.log(`✓ Loaded ${filename}${size}`, 'success');
                break;
            case 'error':
                this.log(`✗ Failed to load ${filename}: ${details.error || 'Unknown error'}`, 'error');
                break;
            case 'cached':
                this.log(`📦 Using cached ${filename}`, 'info');
                break;
        }
    }

    /**
     * Log section processing progress
     * @param {string} sectionName - Section name
     * @param {string} stage - Processing stage
     * @param {object} details - Additional details
     */
    logSectionProgress(sectionName, stage, details = {}) {
        switch (stage) {
            case 'start':
                this.log(`Processing section: ${sectionName}`, 'info');
                break;
            case 'success':
                const paramCount = details.parameterCount || 0;
                this.log(`✓ Processed ${sectionName} (${paramCount} parameters)`, 'success');
                break;
            case 'error':
                this.log(`✗ Failed to process ${sectionName}: ${details.error}`, 'error');
                break;
            case 'skip':
                this.log(`⏭ Skipped ${sectionName}: ${details.reason}`, 'warning');
                break;
        }
    }

    /**
     * Log cache operations
     * @param {string} operation - Cache operation (hit, miss, set, clear)
     * @param {string} key - Cache key
     * @param {object} details - Additional details
     */
    logCacheOperation(operation, key, details = {}) {
        switch (operation) {
            case 'hit':
                this.log(`📦 Cache hit: ${key}`, 'info');
                break;
            case 'miss':
                this.log(`📭 Cache miss: ${key}`, 'info');
                break;
            case 'set':
                const size = details.size ? ` (${this.formatBytes(details.size)})` : '';
                this.log(`💾 Cached: ${key}${size}`, 'info');
                break;
            case 'clear':
                this.log(`🗑 Cleared cache: ${key}`, 'info');
                break;
            case 'expired':
                this.log(`⏰ Cache expired: ${key}`, 'warning');
                break;
        }
    }

    /**
     * Log parsing progress
     * @param {string} type - Type being parsed (sections, parameters)
     * @param {number} count - Number of items parsed
     * @param {object} details - Additional details
     */
    logParsingProgress(type, count, details = {}) {
        if (count === 0) {
            this.log(`⚠ No ${type} found to parse`, 'warning');
        } else {
            this.log(`📋 Parsed ${count} ${type}`, 'success');
        }
        
        if (details.errors && details.errors.length > 0) {
            this.log(`⚠ ${details.errors.length} parsing errors encountered`, 'warning');
        }
    }

    /**
     * Log completion summary
     * @param {object} summary - Completion summary
     */
    logCompletion(summary) {
        const {
            totalSections = 0,
            totalParameters = 0,
            loadTime = 0,
            fromCache = false,
            errors = []
        } = summary;
        
        this.log('', 'info'); // Empty line for separation
        this.log('=== Loading Complete ===', 'success');
        this.log(`📊 Loaded ${totalSections} sections with ${totalParameters} parameters`, 'success');
        this.log(`⏱ Total time: ${(loadTime / 1000).toFixed(1)}s`, 'info');
        this.log(`📦 Source: ${fromCache ? 'Cache' : 'Network'}`, 'info');
        
        if (errors.length > 0) {
            this.log(`⚠ ${errors.length} errors encountered`, 'warning');
        }
    }

    /**
     * Format bytes to human readable format
     * @param {number} bytes - Bytes to format
     * @returns {string} Formatted string
     */
    formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    /**
     * Clear all logs
     */
    clearLogs() {
        this.logs = [];
        this.updateProgressLog();
        this.log('Progress log cleared', 'info');
    }

    /**
     * Get all logs
     * @returns {Array} Array of log entries
     */
    getLogs() {
        return [...this.logs];
    }

    /**
     * Export logs as text
     * @returns {string} Formatted log text
     */
    exportLogs() {
        return this.logs.map(log => 
            `[${log.timestamp}] ${log.type.toUpperCase()}: ${log.message}`
        ).join('\n');
    }

    /**
     * Reset the progress service
     */
    reset() {
        this.logs = [];
        this.startTime = Date.now();
        this.isVisible = false;
        
        // Reset UI
        const detailsContainer = document.getElementById('loading-details');
        const toggleBtn = document.getElementById('toggle-details');
        const toggleText = toggleBtn?.querySelector('span');
        
        if (detailsContainer) {
            detailsContainer.classList.add('hidden');
        }
        
        if (toggleBtn) {
            toggleBtn.classList.remove('expanded');
        }
        
        if (toggleText) {
            toggleText.textContent = 'Show Details';
        }
        
        this.updateProgressLog();
    }
}

// Create and export singleton instance
export const progressService = new ProgressService();
