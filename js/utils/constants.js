/**
 * Application Constants
 * Contains all the constant values used throughout the application
 */

// API Endpoints
export const API_ENDPOINTS = {
    PROFILE_SPEC: 'https://developer.apple.com/tutorials/data/documentation/devicemanagement/profile-specific-payload-keys.json',
    // Main specification endpoint (profile-specific payload keys)
    SECTION_BASE: 'https://developer.apple.com/tutorials/data/documentation/devicemanagement/profile-specific-payload-keys.json',
    // Base URL for individual configuration type endpoints
    CONFIG_TYPE_BASE: 'https://developer.apple.com/tutorials/data/documentation/devicemanagement',
    DOCUMENTATION_BASE: 'https://developer.apple.com/documentation/devicemanagement/'
};

// Cache Configuration
export const CACHE_CONFIG = {
    CACHE_DURATION: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
    CACHE_KEY_PREFIX: 'apple_mdm_',
    MAIN_SPEC_KEY: 'apple_mdm_main_spec',
    SECTION_KEY_PREFIX: 'apple_mdm_section_',
    LAST_UPDATE_KEY: 'apple_mdm_last_update'
};

// Parameter Types
export const PARAMETER_TYPES = {
    STRING: 'string',
    BOOLEAN: 'boolean',
    NUMBER: 'number',
    INTEGER: 'integer',
    ARRAY: 'array',
    OBJECT: 'object',
    ENUM: 'enum',
    DATE: 'date',
    DATA: 'data'
};

// Boolean Toggle States
export const BOOLEAN_STATES = {
    DEFAULT: 'default',
    TRUE: 'true',
    FALSE: 'false'
};

// Platform Types
export const PLATFORMS = {
    IOS: 'iOS',
    MACOS: 'macOS',
    TVOS: 'tvOS',
    WATCHOS: 'watchOS'
};

// UI States
export const UI_STATES = {
    LOADING: 'loading',
    ERROR: 'error',
    READY: 'ready'
};

// Filter Types
export const FILTER_TYPES = {
    SEARCH: 'search',
    MODIFIED_ONLY: 'modifiedOnly',
    HIDE_DEPRECATED: 'hideDeprecated',
    PLATFORM: 'platform',
    PRIORITY_HIGH: 'priorityHigh',
    PRIORITY_MEDIUM: 'priorityMedium',
    PRIORITY_LOW: 'priorityLow'
};

// Export Configuration
export const EXPORT_CONFIG = {
    FILE_EXTENSION: '.mobileconfig',
    MIME_TYPE: 'application/x-apple-aspen-config',
    DEFAULT_PROFILE_NAME: 'Custom MDM Profile',
    DEFAULT_IDENTIFIER: 'com.company.mdm.profile',
    DEFAULT_DESCRIPTION: 'Custom MDM configuration profile generated by Apple MDM Profile Generator',
    PROFILE_VERSION: 1,
    PROFILE_FORMAT: 1
};

// XML Templates
export const XML_TEMPLATES = {
    PLIST_HEADER: `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">`,
    PLIST_FOOTER: `</plist>`,
    DICT_OPEN: '<dict>',
    DICT_CLOSE: '</dict>',
    ARRAY_OPEN: '<array>',
    ARRAY_CLOSE: '</array>',
    KEY: (key) => `\t<key>${key}</key>`,
    STRING: (value) => `\t<string>${value}</string>`,
    INTEGER: (value) => `\t<integer>${value}</integer>`,
    REAL: (value) => `\t<real>${value}</real>`,
    TRUE: '\t<true/>',
    FALSE: '\t<false/>',
    DATA: (value) => `\t<data>${value}</data>`,
    DATE: (value) => `\t<date>${value}</date>`
};

// Error Messages
export const ERROR_MESSAGES = {
    NETWORK_ERROR: 'Network error occurred while fetching data',
    PARSE_ERROR: 'Failed to parse the specification data',
    CACHE_ERROR: 'Error accessing local storage cache',
    VALIDATION_ERROR: 'Invalid parameter value',
    EXPORT_ERROR: 'Failed to generate configuration profile',
    UNKNOWN_ERROR: 'An unknown error occurred'
};

// Success Messages
export const SUCCESS_MESSAGES = {
    DATA_LOADED: 'Apple MDM specifications loaded successfully',
    CACHE_UPDATED: 'Cache updated successfully',
    PROFILE_EXPORTED: 'Configuration profile exported successfully'
};

// Validation Rules
export const VALIDATION_RULES = {
    IDENTIFIER_PATTERN: /^[a-zA-Z0-9.-]+$/,
    MAX_STRING_LENGTH: 1000,
    MAX_ARRAY_ITEMS: 100,
    MIN_NUMBER: -2147483648,
    MAX_NUMBER: 2147483647
};

// UI Configuration
export const UI_CONFIG = {
    SEARCH_DEBOUNCE_DELAY: 300,
    ANIMATION_DURATION: 200,
    MAX_VISIBLE_SECTIONS: 50,
    SCROLL_OFFSET: 100
};

// Local Storage Keys
export const STORAGE_KEYS = {
    USER_PREFERENCES: 'apple_mdm_user_preferences',
    MODIFIED_PARAMETERS: 'apple_mdm_modified_parameters',
    FILTER_STATE: 'apple_mdm_filter_state',
    UI_STATE: 'apple_mdm_ui_state'
};

// Default Values
export const DEFAULTS = {
    SECTION_EXPANDED: false,
    SHOW_DEPRECATED: false,
    HIDE_DEPRECATED: true,
    SHOW_MODIFIED_ONLY: false,
    SELECTED_PLATFORM: 'all',
    SEARCH_QUERY: '',
    SHOW_PRIORITY_HIGH: true,
    SHOW_PRIORITY_MEDIUM: true,
    SHOW_PRIORITY_LOW: true
};

// Icons
export const ICONS = {
    BOOLEAN_DEFAULT: 'fas fa-minus-circle',
    BOOLEAN_TRUE: 'fas fa-check-circle',
    BOOLEAN_FALSE: 'fas fa-times-circle',
    EXPAND: 'fas fa-chevron-down',
    COLLAPSE: 'fas fa-chevron-up',
    MODIFIED: 'fas fa-circle',
    DEPRECATED: 'fas fa-exclamation-triangle',
    EXTERNAL_LINK: 'fas fa-external-link-alt',
    SEARCH: 'fas fa-search',
    CLEAR: 'fas fa-times',
    DOWNLOAD: 'fas fa-download',
    LOADING: 'fas fa-spinner fa-spin'
};

// Keyboard Shortcuts
export const KEYBOARD_SHORTCUTS = {
    SEARCH_FOCUS: 'ctrl+f',
    EXPORT: 'ctrl+e',
    TOGGLE_MODIFIED: 'ctrl+m',
    TOGGLE_DEPRECATED: 'ctrl+d'
};

// Regular Expressions
export const REGEX_PATTERNS = {
    EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    URL: /^https?:\/\/.+/,
    IDENTIFIER: /^[a-zA-Z0-9.-]+$/,
    VERSION: /^\d+(\.\d+)*$/,
    HEX_COLOR: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/
};

// Data Types for Parameter Validation
export const DATA_TYPE_VALIDATORS = {
    [PARAMETER_TYPES.STRING]: (value) => typeof value === 'string',
    [PARAMETER_TYPES.BOOLEAN]: (value) => typeof value === 'boolean',
    [PARAMETER_TYPES.NUMBER]: (value) => typeof value === 'number' && !isNaN(value),
    [PARAMETER_TYPES.INTEGER]: (value) => Number.isInteger(value),
    [PARAMETER_TYPES.ARRAY]: (value) => Array.isArray(value),
    [PARAMETER_TYPES.OBJECT]: (value) => typeof value === 'object' && value !== null && !Array.isArray(value),
    [PARAMETER_TYPES.DATE]: (value) => value instanceof Date || typeof value === 'string'
};

// Platform Icons
export const PLATFORM_ICONS = {
    [PLATFORMS.IOS]: 'fab fa-apple',
    [PLATFORMS.MACOS]: 'fas fa-desktop',
    [PLATFORMS.TVOS]: 'fas fa-tv',
    [PLATFORMS.WATCHOS]: 'far fa-clock'
};

// Section Categories (for organization and visual labels)
export const SECTION_CATEGORIES = {
    CORE: 'Core',
    SECURITY: 'Security',
    NETWORK: 'Network',
    APPS: 'Apps',
    SYSTEM: 'System',
    AUTHENTICATION: 'Authentication',
    DEVICE: 'Device',
    UI: 'UI',
    EDUCATION: 'Education'
};

// Priority Levels
export const PRIORITY_LEVELS = {
    HIGH: 'high',
    MEDIUM: 'medium',
    LOW: 'low'
};

// Category Colors for Visual Labels
export const CATEGORY_COLORS = {
    [SECTION_CATEGORIES.CORE]: '#007AFF',        // Blue
    [SECTION_CATEGORIES.SECURITY]: '#FF3B30',    // Red
    [SECTION_CATEGORIES.NETWORK]: '#34C759',     // Green
    [SECTION_CATEGORIES.APPS]: '#FF9500',        // Orange
    [SECTION_CATEGORIES.SYSTEM]: '#8E8E93',      // Gray
    [SECTION_CATEGORIES.AUTHENTICATION]: '#AF52DE', // Purple
    [SECTION_CATEGORIES.DEVICE]: '#FF2D92',      // Pink
    [SECTION_CATEGORIES.UI]: '#5AC8FA',          // Light Blue
    [SECTION_CATEGORIES.EDUCATION]: '#FFCC00'    // Yellow
};

// Priority Colors for Visual Labels
export const PRIORITY_COLORS = {
    [PRIORITY_LEVELS.HIGH]: '#FF3B30',    // Red
    [PRIORITY_LEVELS.MEDIUM]: '#FF9500',  // Orange
    [PRIORITY_LEVELS.LOW]: '#34C759'      // Green
};

// Comprehensive Section Metadata Mapping
// Maps section names/identifiers to their categories and priorities
export const SECTION_METADATA = {
    // Core System Sections
    'toplevel': { category: SECTION_CATEGORIES.CORE, priority: PRIORITY_LEVELS.HIGH },
    'top level': { category: SECTION_CATEGORIES.CORE, priority: PRIORITY_LEVELS.HIGH },
    'accounts': { category: SECTION_CATEGORIES.CORE, priority: PRIORITY_LEVELS.HIGH },
    'restrictions': { category: SECTION_CATEGORIES.CORE, priority: PRIORITY_LEVELS.HIGH },
    'systemconfiguration': { category: SECTION_CATEGORIES.CORE, priority: PRIORITY_LEVELS.HIGH },
    'system configuration': { category: SECTION_CATEGORIES.CORE, priority: PRIORITY_LEVELS.HIGH },

    // Security & Privacy
    'security': { category: SECTION_CATEGORIES.SECURITY, priority: PRIORITY_LEVELS.HIGH },
    'securityandprivacy': { category: SECTION_CATEGORIES.SECURITY, priority: PRIORITY_LEVELS.HIGH },
    'security & privacy': { category: SECTION_CATEGORIES.SECURITY, priority: PRIORITY_LEVELS.HIGH },
    'firewall': { category: SECTION_CATEGORIES.SECURITY, priority: PRIORITY_LEVELS.HIGH },
    'certificatetrustsettings': { category: SECTION_CATEGORIES.SECURITY, priority: PRIORITY_LEVELS.MEDIUM },
    'certificate trust settings': { category: SECTION_CATEGORIES.SECURITY, priority: PRIORITY_LEVELS.MEDIUM },
    'privacypreferencespolicycontrol': { category: SECTION_CATEGORIES.SECURITY, priority: PRIORITY_LEVELS.MEDIUM },
    'privacy preferences policy control': { category: SECTION_CATEGORIES.SECURITY, priority: PRIORITY_LEVELS.MEDIUM },
    'contentfilter': { category: SECTION_CATEGORIES.SECURITY, priority: PRIORITY_LEVELS.MEDIUM },
    'content filter': { category: SECTION_CATEGORIES.SECURITY, priority: PRIORITY_LEVELS.MEDIUM },

    // Network & Connectivity
    'vpn': { category: SECTION_CATEGORIES.NETWORK, priority: PRIORITY_LEVELS.HIGH },
    'dnssettings': { category: SECTION_CATEGORIES.NETWORK, priority: PRIORITY_LEVELS.MEDIUM },
    'dns settings': { category: SECTION_CATEGORIES.NETWORK, priority: PRIORITY_LEVELS.MEDIUM },
    'wifi': { category: SECTION_CATEGORIES.NETWORK, priority: PRIORITY_LEVELS.HIGH },
    'cellular': { category: SECTION_CATEGORIES.NETWORK, priority: PRIORITY_LEVELS.HIGH },
    'proxy': { category: SECTION_CATEGORIES.NETWORK, priority: PRIORITY_LEVELS.MEDIUM },

    // App Management
    'appstore': { category: SECTION_CATEGORIES.APPS, priority: PRIORITY_LEVELS.HIGH },
    'app store': { category: SECTION_CATEGORIES.APPS, priority: PRIORITY_LEVELS.HIGH },
    'managedappconfiguration': { category: SECTION_CATEGORIES.APPS, priority: PRIORITY_LEVELS.HIGH },
    'managed app configuration': { category: SECTION_CATEGORIES.APPS, priority: PRIORITY_LEVELS.HIGH },
    'associateddomains': { category: SECTION_CATEGORIES.APPS, priority: PRIORITY_LEVELS.MEDIUM },
    'associated domains': { category: SECTION_CATEGORIES.APPS, priority: PRIORITY_LEVELS.MEDIUM },
    'appmanagement': { category: SECTION_CATEGORIES.APPS, priority: PRIORITY_LEVELS.HIGH },
    'app management': { category: SECTION_CATEGORIES.APPS, priority: PRIORITY_LEVELS.HIGH },

    // System Configuration
    'softwareupdate': { category: SECTION_CATEGORIES.SYSTEM, priority: PRIORITY_LEVELS.HIGH },
    'software update': { category: SECTION_CATEGORIES.SYSTEM, priority: PRIORITY_LEVELS.HIGH },
    'systempreferences': { category: SECTION_CATEGORIES.SYSTEM, priority: PRIORITY_LEVELS.MEDIUM },
    'system preferences': { category: SECTION_CATEGORIES.SYSTEM, priority: PRIORITY_LEVELS.MEDIUM },
    'energysaver': { category: SECTION_CATEGORIES.SYSTEM, priority: PRIORITY_LEVELS.LOW },
    'energy saver': { category: SECTION_CATEGORIES.SYSTEM, priority: PRIORITY_LEVELS.LOW },
    'loginwindow': { category: SECTION_CATEGORIES.SYSTEM, priority: PRIORITY_LEVELS.MEDIUM },
    'login window': { category: SECTION_CATEGORIES.SYSTEM, priority: PRIORITY_LEVELS.MEDIUM },

    // Authentication Services
    'singlesignonextensions': { category: SECTION_CATEGORIES.AUTHENTICATION, priority: PRIORITY_LEVELS.MEDIUM },
    'single sign-on extensions': { category: SECTION_CATEGORIES.AUTHENTICATION, priority: PRIORITY_LEVELS.MEDIUM },
    'activedirectory': { category: SECTION_CATEGORIES.AUTHENTICATION, priority: PRIORITY_LEVELS.MEDIUM },
    'active directory': { category: SECTION_CATEGORIES.AUTHENTICATION, priority: PRIORITY_LEVELS.MEDIUM },
    'kerberos': { category: SECTION_CATEGORIES.AUTHENTICATION, priority: PRIORITY_LEVELS.MEDIUM },
    'ldap': { category: SECTION_CATEGORIES.AUTHENTICATION, priority: PRIORITY_LEVELS.MEDIUM },

    // Device Management
    'devicemanagement': { category: SECTION_CATEGORIES.DEVICE, priority: PRIORITY_LEVELS.HIGH },
    'device management': { category: SECTION_CATEGORIES.DEVICE, priority: PRIORITY_LEVELS.HIGH },
    'airprint': { category: SECTION_CATEGORIES.DEVICE, priority: PRIORITY_LEVELS.MEDIUM },
    'airplay': { category: SECTION_CATEGORIES.DEVICE, priority: PRIORITY_LEVELS.MEDIUM },
    'bluetooth': { category: SECTION_CATEGORIES.DEVICE, priority: PRIORITY_LEVELS.MEDIUM },
    'camera': { category: SECTION_CATEGORIES.DEVICE, priority: PRIORITY_LEVELS.MEDIUM },

    // UI & User Experience
    'dock': { category: SECTION_CATEGORIES.UI, priority: PRIORITY_LEVELS.LOW },
    'finder': { category: SECTION_CATEGORIES.UI, priority: PRIORITY_LEVELS.LOW },
    'desktop': { category: SECTION_CATEGORIES.UI, priority: PRIORITY_LEVELS.LOW },
    'screensaver': { category: SECTION_CATEGORIES.UI, priority: PRIORITY_LEVELS.LOW },
    'screen saver': { category: SECTION_CATEGORIES.UI, priority: PRIORITY_LEVELS.LOW },

    // Education
    'education': { category: SECTION_CATEGORIES.EDUCATION, priority: PRIORITY_LEVELS.MEDIUM },
    'classroom': { category: SECTION_CATEGORIES.EDUCATION, priority: PRIORITY_LEVELS.MEDIUM },
    'schoolwork': { category: SECTION_CATEGORIES.EDUCATION, priority: PRIORITY_LEVELS.MEDIUM }
};

// HTTP Status Codes
export const HTTP_STATUS = {
    OK: 200,
    NOT_FOUND: 404,
    SERVER_ERROR: 500,
    NETWORK_ERROR: 0
};

// Development Configuration
export const DEV_CONFIG = {
    DEBUG_MODE: false,
    LOG_LEVEL: 'info',
    MOCK_DATA: false,
    CACHE_DISABLED: false
};

// Feature Flags
export const FEATURES = {
    DARK_MODE: false,
    ADVANCED_VALIDATION: true,
    EXPORT_PREVIEW: true,
    KEYBOARD_SHORTCUTS: true,
    AUTO_SAVE: false
};
