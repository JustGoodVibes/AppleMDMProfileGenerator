/**
 * Utility Helper Functions
 * Contains common utility functions used throughout the application
 */

import {
    SECTION_METADATA,
    SECTION_CATEGORIES,
    PRIORITY_LEVELS,
    CATEGORY_COLORS,
    PRIORITY_COLORS
} from './constants.js';

/**
 * Get section metadata (category and priority) for a given section
 * @param {object} section - Section object with name and identifier
 * @returns {object} Object with category and priority
 */
export function getSectionMetadata(section) {
    if (!section) {
        return {
            category: SECTION_CATEGORIES.SYSTEM,
            priority: PRIORITY_LEVELS.MEDIUM
        };
    }

    // Check if section already has category and priority (synthetic sections)
    if (section.category && section.priority) {
        return {
            category: section.category,
            priority: section.priority
        };
    }

    // Normalize section name and identifier for lookup
    const sectionName = (section.name || '').toLowerCase().trim();
    const sectionIdentifier = (section.identifier || '').toLowerCase().trim();

    // Try to find metadata by identifier first, then by name
    let metadata = SECTION_METADATA[sectionIdentifier] || SECTION_METADATA[sectionName];

    // If no exact match, try partial matching for compound names
    if (!metadata) {
        const keys = Object.keys(SECTION_METADATA);

        // Try to find a key that matches part of the section name
        for (const key of keys) {
            if (sectionName.includes(key) || key.includes(sectionName)) {
                metadata = SECTION_METADATA[key];
                break;
            }
        }
    }

    // Default fallback based on common patterns
    if (!metadata) {
        if (sectionName.includes('security') || sectionName.includes('privacy') ||
            sectionName.includes('firewall') || sectionName.includes('certificate')) {
            metadata = { category: SECTION_CATEGORIES.SECURITY, priority: PRIORITY_LEVELS.HIGH };
        } else if (sectionName.includes('network') || sectionName.includes('vpn') ||
                   sectionName.includes('wifi') || sectionName.includes('dns')) {
            metadata = { category: SECTION_CATEGORIES.NETWORK, priority: PRIORITY_LEVELS.HIGH };
        } else if (sectionName.includes('app') || sectionName.includes('store')) {
            metadata = { category: SECTION_CATEGORIES.APPS, priority: PRIORITY_LEVELS.HIGH };
        } else if (sectionName.includes('system') || sectionName.includes('update')) {
            metadata = { category: SECTION_CATEGORIES.SYSTEM, priority: PRIORITY_LEVELS.HIGH };
        } else if (sectionName.includes('auth') || sectionName.includes('login') ||
                   sectionName.includes('kerberos') || sectionName.includes('ldap')) {
            metadata = { category: SECTION_CATEGORIES.AUTHENTICATION, priority: PRIORITY_LEVELS.MEDIUM };
        } else if (sectionName.includes('device') || sectionName.includes('bluetooth') ||
                   sectionName.includes('camera') || sectionName.includes('print')) {
            metadata = { category: SECTION_CATEGORIES.DEVICE, priority: PRIORITY_LEVELS.MEDIUM };
        } else if (sectionName.includes('dock') || sectionName.includes('finder') ||
                   sectionName.includes('desktop') || sectionName.includes('screen')) {
            metadata = { category: SECTION_CATEGORIES.UI, priority: PRIORITY_LEVELS.LOW };
        } else if (sectionName.includes('education') || sectionName.includes('classroom') ||
                   sectionName.includes('school')) {
            metadata = { category: SECTION_CATEGORIES.EDUCATION, priority: PRIORITY_LEVELS.MEDIUM };
        } else {
            // Ultimate fallback
            metadata = { category: SECTION_CATEGORIES.CORE, priority: PRIORITY_LEVELS.MEDIUM };
        }
    }

    return metadata;
}

/**
 * Create category badge HTML
 * @param {string} category - Category name
 * @returns {string} HTML string for category badge
 */
export function createCategoryBadge(category) {
    if (!category) return '';

    const categoryClass = category.toLowerCase().replace(/\s+/g, '');
    return `<span class="section-badge category ${categoryClass}"
                  title="Category: ${category}"
                  aria-label="Section category: ${category}"
                  role="img">
                ${category}
            </span>`;
}

/**
 * Create priority badge HTML
 * @param {string} priority - Priority level
 * @returns {string} HTML string for priority badge
 */
export function createPriorityBadge(priority) {
    if (!priority) return '';

    const priorityClass = priority.toLowerCase();
    const priorityText = priority.charAt(0).toUpperCase() + priority.slice(1);

    // Add appropriate icons for priority levels
    const priorityIcon = priority === 'high' ? '🔴' :
                        priority === 'medium' ? '🟡' : '🟢';

    return `<span class="section-badge priority ${priorityClass}"
                  title="Priority level: ${priorityText}"
                  aria-label="Priority level: ${priorityText}"
                  role="img">
                <span aria-hidden="true">${priorityIcon}</span> ${priorityText}
            </span>`;
}

/**
 * Create combined category and priority badges
 * @param {object} section - Section object
 * @returns {string} HTML string for both badges
 */
export function createSectionBadges(section) {
    const metadata = getSectionMetadata(section);
    const categoryBadge = createCategoryBadge(metadata.category);
    const priorityBadge = createPriorityBadge(metadata.priority);

    return `<div class="badge-container"
                 role="group"
                 aria-label="Section metadata: ${metadata.category} category, ${metadata.priority} priority">
                ${categoryBadge}
                ${priorityBadge}
            </div>`;
}

/**
 * Debounce function to limit the rate of function execution
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @param {boolean} immediate - Execute immediately on first call
 * @returns {Function} Debounced function
 */
export function debounce(func, wait, immediate = false) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            timeout = null;
            if (!immediate) func(...args);
        };
        const callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func(...args);
    };
}

/**
 * Throttle function to limit function execution frequency
 * @param {Function} func - Function to throttle
 * @param {number} limit - Time limit in milliseconds
 * @returns {Function} Throttled function
 */
export function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

/**
 * Deep clone an object
 * @param {any} obj - Object to clone
 * @returns {any} Cloned object
 */
export function deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime());
    if (obj instanceof Array) return obj.map(item => deepClone(item));
    if (typeof obj === 'object') {
        const clonedObj = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                clonedObj[key] = deepClone(obj[key]);
            }
        }
        return clonedObj;
    }
}

/**
 * Check if two objects are deeply equal
 * @param {any} a - First object
 * @param {any} b - Second object
 * @returns {boolean} True if objects are equal
 */
export function deepEqual(a, b) {
    if (a === b) return true;
    if (a == null || b == null) return false;
    if (typeof a !== typeof b) return false;
    
    if (typeof a === 'object') {
        if (Array.isArray(a) !== Array.isArray(b)) return false;
        
        const keysA = Object.keys(a);
        const keysB = Object.keys(b);
        
        if (keysA.length !== keysB.length) return false;
        
        for (const key of keysA) {
            if (!keysB.includes(key)) return false;
            if (!deepEqual(a[key], b[key])) return false;
        }
        
        return true;
    }
    
    return false;
}

/**
 * Sanitize HTML string to prevent XSS
 * @param {string} str - String to sanitize
 * @returns {string} Sanitized string
 */
export function sanitizeHTML(str) {
    if (typeof str !== 'string') return '';
    
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

/**
 * Escape XML special characters
 * @param {string} str - String to escape
 * @returns {string} Escaped string
 */
export function escapeXML(str) {
    if (typeof str !== 'string') return '';
    
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/**
 * Generate a unique ID
 * @param {string} prefix - Optional prefix for the ID
 * @returns {string} Unique ID
 */
export function generateId(prefix = 'id') {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Format file size in human readable format
 * @param {number} bytes - Size in bytes
 * @returns {string} Formatted size string
 */
export function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Format date in ISO string format
 * @param {Date|string} date - Date to format
 * @returns {string} ISO formatted date string
 */
export function formatDate(date) {
    if (!date) return '';
    
    const d = date instanceof Date ? date : new Date(date);
    return d.toISOString();
}

/**
 * Validate email address
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid email
 */
export function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Validate URL
 * @param {string} url - URL to validate
 * @returns {boolean} True if valid URL
 */
export function isValidURL(url) {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
}

/**
 * Convert camelCase to kebab-case
 * @param {string} str - String to convert
 * @returns {string} Kebab-case string
 */
export function camelToKebab(str) {
    return str.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase();
}

/**
 * Convert kebab-case to camelCase
 * @param {string} str - String to convert
 * @returns {string} CamelCase string
 */
export function kebabToCamel(str) {
    return str.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
}

/**
 * Capitalize first letter of string
 * @param {string} str - String to capitalize
 * @returns {string} Capitalized string
 */
export function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Truncate string to specified length
 * @param {string} str - String to truncate
 * @param {number} length - Maximum length
 * @param {string} suffix - Suffix to add when truncated
 * @returns {string} Truncated string
 */
export function truncate(str, length, suffix = '...') {
    if (!str || str.length <= length) return str;
    return str.substring(0, length - suffix.length) + suffix;
}

/**
 * Remove HTML tags from string
 * @param {string} html - HTML string
 * @returns {string} Plain text string
 */
export function stripHTML(html) {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || div.innerText || '';
}

/**
 * Check if value is empty (null, undefined, empty string, empty array, empty object)
 * @param {any} value - Value to check
 * @returns {boolean} True if empty
 */
export function isEmpty(value) {
    if (value == null) return true;
    if (typeof value === 'string') return value.trim() === '';
    if (Array.isArray(value)) return value.length === 0;
    if (typeof value === 'object') return Object.keys(value).length === 0;
    return false;
}

/**
 * Get nested object property safely
 * @param {object} obj - Object to traverse
 * @param {string} path - Dot notation path
 * @param {any} defaultValue - Default value if path not found
 * @returns {any} Property value or default
 */
export function getNestedProperty(obj, path, defaultValue = undefined) {
    const keys = path.split('.');
    let current = obj;
    
    for (const key of keys) {
        if (current == null || typeof current !== 'object') {
            return defaultValue;
        }
        current = current[key];
    }
    
    return current !== undefined ? current : defaultValue;
}

/**
 * Set nested object property safely
 * @param {object} obj - Object to modify
 * @param {string} path - Dot notation path
 * @param {any} value - Value to set
 */
export function setNestedProperty(obj, path, value) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    let current = obj;
    
    for (const key of keys) {
        if (!(key in current) || typeof current[key] !== 'object') {
            current[key] = {};
        }
        current = current[key];
    }
    
    current[lastKey] = value;
}

/**
 * Create a download link and trigger download
 * @param {string} content - File content
 * @param {string} filename - File name
 * @param {string} mimeType - MIME type
 */
export function downloadFile(content, filename, mimeType = 'text/plain') {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up the URL object
    setTimeout(() => URL.revokeObjectURL(url), 100);
}

/**
 * Copy text to clipboard
 * @param {string} text - Text to copy
 * @returns {Promise<boolean>} Success status
 */
export async function copyToClipboard(text) {
    try {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(text);
            return true;
        } else {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            textArea.style.top = '-999999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            const success = document.execCommand('copy');
            document.body.removeChild(textArea);
            return success;
        }
    } catch (error) {
        console.error('Failed to copy to clipboard:', error);
        return false;
    }
}

/**
 * Wait for specified time
 * @param {number} ms - Milliseconds to wait
 * @returns {Promise} Promise that resolves after wait time
 */
export function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 * @param {Function} fn - Function to retry
 * @param {number} maxRetries - Maximum number of retries
 * @param {number} baseDelay - Base delay in milliseconds
 * @param {Function} shouldRetry - Optional function to determine if error should be retried
 * @returns {Promise} Promise that resolves with function result
 */
export async function retryWithBackoff(fn, maxRetries = 3, baseDelay = 1000, shouldRetry = null) {
    let lastError;

    for (let i = 0; i <= maxRetries; i++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;

            // Check if we should retry this error
            if (shouldRetry && !shouldRetry(error)) {
                throw error; // Don't retry, throw immediately
            }

            if (i === maxRetries) break;

            const delay = baseDelay * Math.pow(2, i);
            await sleep(delay);
        }
    }

    throw lastError;
}
