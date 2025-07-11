/**
 * Data Service
 * Handles fetching and processing Apple MDM specification data
 */

import { API_ENDPOINTS, CACHE_CONFIG, ERROR_MESSAGES } from '../utils/constants.js';
import { retryWithBackoff, getSectionMetadata } from '../utils/helpers.js';
import { cacheService } from './cacheService.js';
import { progressService } from './progressService.js';
import { mockMainSpec, getMockSectionData, getMockSectionDataFuzzy } from './mockDataService.js';
import { configService } from './configService.js';
import { cacheFileService } from './cacheFileService.js';

class DataService {
    constructor() {
        this.mainSpec = null;
        this.sectionData = new Map();
        this.isLoading = false;
        this.loadPromise = null;
        this.cacheFileInitialized = false;

        // Initialize cache file service
        this.initializeCacheFileService();
    }

    /**
     * Initialize the cache file service
     */
    async initializeCacheFileService() {
        try {
            this.cacheFileInitialized = await cacheFileService.initialize();
            if (configService.isDebugMode()) {
                console.log('Cache file service initialized:', this.cacheFileInitialized);
            }
        } catch (error) {
            console.warn('Error initializing cache file service:', error);
            this.cacheFileInitialized = false;
        }
    }

    /**
     * Fetch data with retry logic and error handling
     * @param {string} url - URL to fetch
     * @param {object} options - Fetch options
     * @returns {Promise<object>} Parsed JSON response
     */
    async fetchWithRetry(url, options = {}) {
        // Create abort controller for timeout using configured timeout
        const controller = new AbortController();
        const timeout = configService.getApiTimeout();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const defaultOptions = {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Cache-Control': 'no-cache'
            },
            signal: controller.signal,
            ...options
        };

        progressService.log(`Attempting to fetch: ${url}`, 'info');

        return retryWithBackoff(async () => {
            try {
                const response = await fetch(url, defaultOptions);

                // Clear timeout on successful response
                clearTimeout(timeoutId);

                progressService.log(`Response status: ${response.status} ${response.statusText}`, 'info');

                if (!response.ok) {
                    if (response.status === 0) {
                        throw new Error('Network error - possible CORS issue or no internet connection');
                    }

                    // For 404 errors, create a special error that won't be retried
                    if (response.status === 404) {
                        const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
                        error.noRetry = true; // Mark as non-retryable
                        throw error;
                    }

                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const contentType = response.headers.get('content-type');
                progressService.log(`Content-Type: ${contentType}`, 'info');

                if (!contentType || !contentType.includes('application/json')) {
                    throw new Error('Response is not valid JSON');
                }

                const data = await response.json();
                progressService.log(`Successfully parsed JSON response`, 'success');

                return data;
            } catch (error) {
                // Clear timeout on error
                clearTimeout(timeoutId);

                if (error.name === 'AbortError') {
                    throw new Error('Request timed out after 30 seconds');
                }
                if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
                    throw new Error('Network error - check internet connection and CORS settings');
                }
                throw error;
            }
        }, 3, 1000, (error) => {
            // Don't retry 404 errors
            return !error.noRetry;
        });
    }

    /**
     * Step 1: Load and Cache Primary Specification
     * Downloads and caches the primary JSON specification from Apple's profile-specific payload keys endpoint
     * @param {boolean} forceRefresh - Force refresh from server
     * @returns {Promise<object>} Main specification data
     */
    async loadMainSpec(forceRefresh = false) {
        const cacheKey = CACHE_CONFIG.MAIN_SPEC_KEY;

        // Check memory cache first unless force refresh
        if (!forceRefresh) {
            const cached = cacheService.get(cacheKey);
            if (cached && this.validateMainSpecStructure(cached)) {
                progressService.logCacheOperation('hit', 'main specification (memory)');
                this.mainSpec = cached;
                return cached;
            } else {
                progressService.logCacheOperation('miss', 'main specification (memory)');
            }
        }

        // Cache-first approach: Try cache files first, then live API if enabled
        progressService.log('Using cache-first approach for better performance', 'info');

        // Try cache files first
        const cacheFileData = await this.loadMainSpecFromCache();
        if (cacheFileData) {
            progressService.log('Successfully loaded main specification from cache files', 'success');
            this.mainSpec = cacheFileData;
            return cacheFileData;
        }

        // If cache files failed and live API is disabled, stop here
        const shouldUseLiveAPI = configService.shouldUseLiveAPI();
        if (!shouldUseLiveAPI) {
            progressService.log('Cache files unavailable and USE_LIVE_API=false, cannot load specification', 'error');
            throw new Error('Cache files unavailable and live API disabled. Enable live API or ensure cache files are present.');
        }

        // Cache files failed but live API is enabled - proceed with live API
        progressService.log('Cache files unavailable, falling back to live API (USE_LIVE_API=true)', 'warning');

        try {
            progressService.updateStatus('Fetching primary specification from Apple...');

            // Use the profile-specific payload keys endpoint
            const apiUrl = API_ENDPOINTS.SECTION_BASE;
            progressService.logDataFetch(apiUrl, 'start');
            progressService.log('Loading primary specification from profile-specific payload keys endpoint', 'info');

            const data = await this.fetchWithRetry(apiUrl);

            // Step 1: Validate the JSON structure contains required fields
            this.validateMainSpecStructure(data, true);

            // Log comprehensive structure analysis
            this.logMainSpecStructure(data);

            // Calculate approximate size for logging
            const dataSize = JSON.stringify(data).length;
            progressService.logDataFetch(apiUrl, 'success', { size: dataSize });

            // Cache the data with 24-hour expiration
            cacheService.set(cacheKey, data, CACHE_CONFIG.CACHE_DURATION);
            progressService.logCacheOperation('set', 'main specification', {
                size: dataSize,
                expiration: '24 hours'
            });

            this.mainSpec = data;
            progressService.log('Primary specification loaded, validated, and cached successfully', 'success');
            return data;

        } catch (error) {
            progressService.logDataFetch(API_ENDPOINTS.SECTION_BASE, 'error', { error: error.message });
            progressService.log(`Failed to load primary specification: ${error.message}`, 'error');

            // Try to use memory cached data as fallback
            const cached = cacheService.get(cacheKey);
            if (cached && this.validateMainSpecStructure(cached)) {
                progressService.log('Using memory cached primary specification as fallback', 'warning');
                this.mainSpec = cached;
                return cached;
            }

            // Try to use cache files as fallback
            const cacheFileData = await this.loadMainSpecFromCache();
            if (cacheFileData) {
                progressService.log('Using cache file primary specification as fallback', 'warning');
                this.mainSpec = cacheFileData;
                return cacheFileData;
            }

            // Use mock data as last resort
            progressService.log('Using mock primary specification as fallback', 'warning');
            const mockData = mockMainSpec;
            this.mainSpec = mockData;
            return mockData;
        }
    }

    /**
     * Load main specification from cache files
     * @returns {Promise<object|null>} Main specification data or null if not found
     */
    async loadMainSpecFromCache() {
        try {
            if (!this.cacheFileInitialized) {
                await this.initializeCacheFileService();
            }

            const data = await cacheFileService.loadMainSpec();
            if (data && this.validateMainSpecStructure(data)) {
                progressService.logCacheOperation('hit', 'main specification (cache file)');

                // Also cache in memory for faster subsequent access
                const cacheKey = CACHE_CONFIG.MAIN_SPEC_KEY;
                cacheService.set(cacheKey, data, CACHE_CONFIG.CACHE_DURATION);

                return data;
            } else {
                progressService.logCacheOperation('miss', 'main specification (cache file)');
                return null;
            }
        } catch (error) {
            progressService.log(`Error loading main spec from cache files: ${error.message}`, 'error');
            return null;
        }
    }

    /**
     * Validate main specification structure contains required fields
     * @param {object} data - Main specification data
     * @param {boolean} throwOnError - Whether to throw error on validation failure
     * @returns {boolean} True if valid structure
     */
    validateMainSpecStructure(data, throwOnError = false) {
        try {
            if (!data || typeof data !== 'object') {
                throw new Error('Invalid main specification data structure: not an object');
            }

            if (!data.topicSections || !Array.isArray(data.topicSections)) {
                throw new Error('Invalid main specification: missing or invalid topicSections array');
            }

            if (!data.references || typeof data.references !== 'object') {
                throw new Error('Invalid main specification: missing or invalid references object');
            }

            progressService.log('Main specification structure validation passed', 'info');
            return true;

        } catch (error) {
            progressService.log(`Main specification validation failed: ${error.message}`, 'warning');
            if (throwOnError) {
                throw error;
            }
            return false;
        }
    }

    /**
     * Log comprehensive structure analysis of main specification
     * @param {object} data - Main specification data
     */
    logMainSpecStructure(data) {
        progressService.log(`Primary specification structure: ${Object.keys(data).join(', ')}`, 'info');

        if (data.topicSections) {
            progressService.log(`Found ${data.topicSections.length} topicSections in primary specification`, 'info');

            // Log detailed analysis of topic sections
            const topicSectionAnalysis = data.topicSections.map(section => ({
                title: section.title,
                anchor: section.anchor,
                identifierCount: section.identifiers?.length || 0,
                hasIdentifiers: Boolean(section.identifiers && section.identifiers.length > 0)
            }));

            progressService.log(`TopicSections analysis: ${JSON.stringify(topicSectionAnalysis, null, 2)}`, 'info');
        }

        if (data.references) {
            const refCount = Object.keys(data.references).length;
            progressService.log(`Found ${refCount} reference documents in primary specification`, 'info');
        }

        if (data.schemaVersion) {
            progressService.log(`Schema version: ${data.schemaVersion}`, 'info');
        }
    }

    /**
     * Step 3: Load section-specific data from individual JSON files
     * Loads data from endpoints like TopLevel.json, Accounts.json, etc.
     * @param {string} sectionName - Name of the section
     * @param {boolean} forceRefresh - Force refresh from server
     * @returns {Promise<object>} Section data
     */
    async loadSectionData(sectionName, forceRefresh = false) {
        const cacheKey = `${CACHE_CONFIG.SECTION_KEY_PREFIX}${sectionName}`;

        // Check memory cache first unless force refresh
        if (!forceRefresh && this.sectionData.has(sectionName)) {
            progressService.logCacheOperation('hit', `section ${sectionName} (memory)`);
            return this.sectionData.get(sectionName);
        }

        if (!forceRefresh) {
            const cached = cacheService.get(cacheKey);
            if (cached) {
                progressService.logCacheOperation('hit', `section ${sectionName} (localStorage)`);
                this.sectionData.set(sectionName, cached);
                return cached;
            } else {
                progressService.logCacheOperation('miss', `section ${sectionName} (localStorage)`);
            }
        }

        // Cache-first approach: Try cache files first, then live API if enabled
        progressService.log(`Using cache-first approach for section ${sectionName}`, 'info');

        // Try cache files first
        const cacheFileData = await this.loadSectionDataFromCache(sectionName);
        if (cacheFileData) {
            progressService.log(`Successfully loaded section ${sectionName} from cache files`, 'success');
            this.sectionData.set(sectionName, cacheFileData);
            return cacheFileData;
        }

        // If cache files failed and live API is disabled, stop here
        const shouldUseLiveAPI = configService.shouldUseLiveAPI();
        if (!shouldUseLiveAPI) {
            progressService.log(`Cache files unavailable for section ${sectionName} and USE_LIVE_API=false`, 'warning');
            // Return null to allow graceful degradation
            return null;
        }

        // Cache files failed but live API is enabled - proceed with live API
        progressService.log(`Cache files unavailable for section ${sectionName}, falling back to live API (USE_LIVE_API=true)`, 'warning');

        try {
            progressService.logSectionProgress(sectionName, 'start');
            progressService.log(`Step 3: Loading section data for: ${sectionName}`, 'info');

            // Construct endpoint for individual section JSON file
            // e.g., TopLevel.json, Accounts.json
            const sectionEndpoint = this.constructSectionEndpoint(sectionName);
            progressService.log(`Loading from section endpoint: ${sectionEndpoint}`, 'info');
            progressService.logDataFetch(sectionEndpoint, 'start');

            // Load individual section JSON file (e.g., TopLevel.json, Accounts.json)
            const rawSectionData = await this.fetchWithRetry(sectionEndpoint);

            // Validate the response structure
            if (!rawSectionData || typeof rawSectionData !== 'object') {
                throw new Error(`Invalid section data structure for ${sectionName}: received ${typeof rawSectionData}`);
            }

            // Step 4: Parse the section JSON according to specifications
            const parsedSectionData = this.parseSectionJSON(rawSectionData, sectionName);

            // Step 4.1: Merge topicSections from main specification
            // Individual section JSON files don't have topicSections, so we need to extract them from the main spec
            if (!parsedSectionData.topicSections || parsedSectionData.topicSections.length === 0) {
                try {
                    const mainSpec = await this.loadMainSpec(false); // Use cached version
                    const sectionDataFromMainSpec = this.extractSectionDataFromMainSpec(mainSpec, sectionName);

                    if (sectionDataFromMainSpec.topicSections && sectionDataFromMainSpec.topicSections.length > 0) {
                        parsedSectionData.topicSections = sectionDataFromMainSpec.topicSections;
                        progressService.log(`Merged ${sectionDataFromMainSpec.topicSections.length} topicSections from main spec for ${sectionName}`, 'info');
                    }
                } catch (mainSpecError) {
                    progressService.log(`Warning: Could not merge topicSections from main spec: ${mainSpecError.message}`, 'warning');
                }
            }

            // Calculate approximate size for logging
            const dataSize = JSON.stringify(parsedSectionData).length;
            progressService.logDataFetch(sectionEndpoint, 'success', { size: dataSize });

            // Cache the parsed data with 24-hour expiration
            cacheService.set(cacheKey, parsedSectionData, CACHE_CONFIG.CACHE_DURATION);
            progressService.logCacheOperation('set', `section ${sectionName}`, {
                size: dataSize,
                expiration: '24 hours'
            });

            this.sectionData.set(sectionName, parsedSectionData);

            // Parse parameters for UI generation
            const parameters = this.parseParameters(parsedSectionData, sectionName);
            progressService.logSectionProgress(sectionName, 'success', { parameterCount: parameters.length });

            progressService.log(`Successfully loaded and parsed section: ${sectionName} (${parameters.length} parameters)`, 'success');
            return parsedSectionData;
        } catch (error) {
            progressService.logSectionProgress(sectionName, 'error', { error: error.message });
            progressService.logDataFetch(`${API_ENDPOINTS.SECTION_BASE}${sectionName.toLowerCase()}.json`, 'error', { error: error.message });

            // Check if this is a 404 error (missing resource)
            const is404Error = error.message.includes('HTTP 404') || error.message.includes('Not Found');

            if (is404Error) {
                progressService.log(`Section ${sectionName} not found on Apple API (404), using fallback`, 'warning');
            }

            // Try to use cache files as fallback
            const cacheFileData = await this.loadSectionDataFromCache(sectionName);
            if (cacheFileData) {
                progressService.log(`Using cache file data for section: ${sectionName}`, 'warning');
                this.sectionData.set(sectionName, cacheFileData);
                return cacheFileData;
            }

            // Try to use mock data as fallback (with fuzzy matching)
            let mockData = getMockSectionData(sectionName);
            if (!mockData) {
                mockData = getMockSectionDataFuzzy(sectionName);
            }

            if (mockData) {
                progressService.log(`Using mock data for section: ${sectionName}`, 'warning');

                // Cache the mock data
                cacheService.set(cacheKey, mockData);
                this.sectionData.set(sectionName, mockData);

                const parameters = this.parseParameters(mockData, sectionName);
                progressService.logSectionProgress(sectionName, 'success', { parameterCount: parameters.length });
                progressService.log(`Mock data loaded for ${sectionName} (${parameters.length} parameters)`, 'warning');

                return mockData;
            }

            // For 404 errors, don't throw - just return empty data to continue loading other sections
            if (is404Error) {
                progressService.log(`No fallback data available for ${sectionName}, skipping`, 'warning');
                const emptyData = {
                    topicSections: [],
                    references: { doc: {} }
                };
                return emptyData;
            }

            // For other errors (network, timeout, etc.), still throw
            throw new Error(`${ERROR_MESSAGES.NETWORK_ERROR}: ${error.message}`);
        }
    }

    /**
     * Load section data from cache files
     * @param {string} sectionName - Name of the section
     * @returns {Promise<object|null>} Section data or null if not found
     */
    async loadSectionDataFromCache(sectionName) {
        try {
            if (!this.cacheFileInitialized) {
                await this.initializeCacheFileService();
            }

            const data = await cacheFileService.loadSection(sectionName);
            if (data) {
                progressService.logCacheOperation('hit', `section ${sectionName} (cache file)`);

                // Parse the section JSON according to specifications
                const parsedSectionData = this.parseSectionJSON(data, sectionName);

                // Merge topicSections from main specification if needed
                if (!parsedSectionData.topicSections || parsedSectionData.topicSections.length === 0) {
                    try {
                        const mainSpec = await this.loadMainSpecFromCache();
                        if (mainSpec) {
                            const sectionDataFromMainSpec = this.extractSectionDataFromMainSpec(mainSpec, sectionName);

                            if (sectionDataFromMainSpec.topicSections && sectionDataFromMainSpec.topicSections.length > 0) {
                                parsedSectionData.topicSections = sectionDataFromMainSpec.topicSections;
                                progressService.log(`Merged ${sectionDataFromMainSpec.topicSections.length} topicSections from cached main spec for ${sectionName}`, 'info');
                            }
                        }
                    } catch (mainSpecError) {
                        progressService.log(`Warning: Could not merge topicSections from cached main spec: ${mainSpecError.message}`, 'warning');
                    }
                }

                // Cache in memory and localStorage for faster subsequent access
                const cacheKey = `${CACHE_CONFIG.SECTION_KEY_PREFIX}${sectionName}`;
                cacheService.set(cacheKey, parsedSectionData, CACHE_CONFIG.CACHE_DURATION);
                this.sectionData.set(sectionName, parsedSectionData);

                // Parse parameters for UI generation
                const parameters = this.parseParameters(parsedSectionData, sectionName);
                progressService.logSectionProgress(sectionName, 'success', { parameterCount: parameters.length });

                return parsedSectionData;
            } else {
                progressService.logCacheOperation('miss', `section ${sectionName} (cache file)`);
                return null;
            }
        } catch (error) {
            progressService.log(`Error loading section ${sectionName} from cache files: ${error.message}`, 'error');
            return null;
        }
    }

    /**
     * Check if a section identifier represents a sub-section (configuration type)
     * @param {string} sectionName - Section identifier
     * @returns {Promise<boolean>} True if this is a sub-section
     */
    async isSubSectionIdentifier(sectionName) {
        try {
            progressService.log(`Checking if ${sectionName} is a sub-section identifier`, 'info');

            // Check if we have cached information about this being a sub-section
            const mainSpec = this.mainSpec || await this.loadMainSpec();

            if (mainSpec && mainSpec.topicSections) {
                progressService.log(`Checking ${sectionName} against ${mainSpec.topicSections.length} topicSections`, 'info');

                // Check if this identifier appears in any topicSection's identifiers array
                for (const topicSection of mainSpec.topicSections) {
                    if (topicSection.identifiers) {
                        for (const identifier of topicSection.identifiers) {
                            const configTypeName = this.extractConfigTypeFromIdentifier(identifier);
                            if (configTypeName) {
                                const normalizedConfigType = configTypeName.toLowerCase();
                                const normalizedSectionName = sectionName.toLowerCase();

                                if (normalizedConfigType === normalizedSectionName) {
                                    progressService.log(`Found ${sectionName} as sub-section in topicSection: ${topicSection.title}`, 'info');
                                    return true;
                                }
                            }
                        }
                    }
                }

                progressService.log(`${sectionName} is not a sub-section identifier`, 'info');
            } else {
                progressService.log(`No topicSections found in main spec for sub-section check`, 'warning');
            }

            return false;
        } catch (error) {
            progressService.log(`Error checking sub-section status for ${sectionName}: ${error.message}`, 'warning');
            return false;
        }
    }

    /**
     * Step 3 & 4: Load and Parse Individual Configuration Type JSON Files
     * Constructs endpoint and loads individual configuration type data with comprehensive parsing
     * @param {string} configTypeName - Configuration type name
     * @returns {Promise<object>} Parsed configuration type data
     */
    async loadConfigurationTypeData(configTypeName) {
        // Validate input
        if (!configTypeName || typeof configTypeName !== 'string') {
            throw new Error(`Invalid configuration type name: ${configTypeName}`);
        }

        // Normalize the configuration type name
        const normalizedConfigType = configTypeName.toLowerCase().trim();
        const cacheKey = `${CACHE_CONFIG.SECTION_KEY_PREFIX}config_${normalizedConfigType}`;

        try {
            progressService.log(`Step 3: Loading individual configuration type: ${configTypeName} (normalized: ${normalizedConfigType})`, 'info');

            // Check cache first
            const cached = cacheService.get(cacheKey);
            if (cached) {
                progressService.logCacheOperation('hit', `config type ${normalizedConfigType}`);
                return cached;
            }

            // Step 3: Construct individual configuration type endpoint
            const configTypeUrl = this.constructConfigTypeEndpoint(normalizedConfigType);
            progressService.log(`Step 3: Constructed endpoint: ${configTypeUrl}`, 'info');
            progressService.logDataFetch(configTypeUrl, 'start');

            const rawConfigData = await this.fetchWithRetry(configTypeUrl);

            // Validate the response structure
            if (!rawConfigData || typeof rawConfigData !== 'object') {
                throw new Error(`Invalid configuration type data structure for ${normalizedConfigType}: received ${typeof rawConfigData}`);
            }

            // Step 4: Parse Individual Configuration Type JSON Files
            progressService.log(`Step 4: Parsing configuration type JSON for ${normalizedConfigType}`, 'info');
            const parsedConfigData = this.parseConfigurationTypeJSON(rawConfigData, normalizedConfigType);

            // Log comprehensive structure analysis
            this.logConfigurationTypeStructure(parsedConfigData, normalizedConfigType);

            // Calculate approximate size for logging
            const dataSize = JSON.stringify(parsedConfigData).length;
            progressService.logDataFetch(configTypeUrl, 'success', { size: dataSize });

            // Cache the parsed data with 24-hour expiration
            cacheService.set(cacheKey, parsedConfigData, CACHE_CONFIG.CACHE_DURATION);
            progressService.logCacheOperation('set', `config type ${normalizedConfigType}`, {
                size: dataSize,
                expiration: '24 hours'
            });

            // Parse parameters for UI generation
            const parameters = this.parseParameters(parsedConfigData, normalizedConfigType);
            progressService.logSectionProgress(normalizedConfigType, 'success', { parameterCount: parameters.length });

            progressService.log(`Successfully loaded and parsed configuration type: ${normalizedConfigType} (${parameters.length} parameters)`, 'success');
            return parsedConfigData;

        } catch (error) {
            progressService.logSectionProgress(normalizedConfigType, 'error', { error: error.message });
            progressService.logDataFetch(this.constructConfigTypeEndpoint(normalizedConfigType), 'error', { error: error.message });

            progressService.log(`Error loading configuration type ${normalizedConfigType}: ${error.message}`, 'error');

            // Check if this is a 404 error (missing configuration type)
            const is404Error = error.message.includes('HTTP 404') || error.message.includes('Not Found') ||
                              error.message.includes('404') || error.message.includes('fetch');

            if (is404Error) {
                progressService.log(`Configuration type ${normalizedConfigType} not found (404), using fallback`, 'warning');
            }

            // Try to use mock data as fallback
            let mockData = getMockSectionData(normalizedConfigType);
            if (!mockData) {
                mockData = getMockSectionDataFuzzy(normalizedConfigType);
            }

            // Also try with original config type name
            if (!mockData && normalizedConfigType !== configTypeName) {
                mockData = getMockSectionData(configTypeName);
                if (!mockData) {
                    mockData = getMockSectionDataFuzzy(configTypeName);
                }
            }

            if (mockData) {
                progressService.log(`Using mock data for configuration type: ${normalizedConfigType}`, 'warning');
                cacheService.set(cacheKey, mockData);
                const parameters = this.parseParameters(mockData, normalizedConfigType);
                progressService.logSectionProgress(normalizedConfigType, 'success', { parameterCount: parameters.length });
                return mockData;
            }

            // For 404 errors, return empty data structure
            if (is404Error) {
                progressService.log(`No fallback data available for ${normalizedConfigType}, creating empty structure`, 'warning');
                const emptyData = {
                    topicSections: [],
                    references: { doc: {} }
                };
                cacheService.set(cacheKey, emptyData);
                return emptyData;
            }

            // For other errors, re-throw
            throw new Error(`Failed to load configuration type ${normalizedConfigType}: ${error.message}`);
        }
    }

    /**
     * Step 2: Parse TopicSections from profile-specific-payload-keys.json
     * Processes each topicSection array item to create main sections
     * @param {object} mainSpec - Main specification data
     * @returns {Array} Array of section objects based on topicSections
     */
    parseSections(mainSpec) {
        try {
            progressService.log('Step 2: Parsing topicSections from profile-specific-payload-keys.json...', 'info');
            progressService.log(`Main spec structure: ${JSON.stringify(Object.keys(mainSpec), null, 2)}`, 'info');

            // Validate main spec structure
            if (!this.validateMainSpecStructure(mainSpec)) {
                throw new Error('Invalid main specification structure for parsing');
            }

            // Process each topicSection array item
            const sections = this.processTopicSections(mainSpec.topicSections);

            // Validate and normalize all sections
            const validatedSections = sections.map((section, index) => {
                return this.validateAndNormalizeSection(section, index);
            });

            // Log section processing results
            this.logSectionProcessingResults(validatedSections);

            progressService.log(`Successfully parsed ${validatedSections.length} sections from topicSections`, 'success');
            return validatedSections;
        } catch (error) {
            progressService.log(`Error parsing sections: ${error.message}`, 'error');
            console.error('Error parsing sections:', error);

            // Fallback to legacy parsing if section parsing fails
            return this.fallbackToLegacyParsing(mainSpec);
        }
    }

    /**
     * Process topicSections array to create main sections
     * Each topicSection becomes a main section that will load its own JSON file
     * @param {Array} topicSections - Array of topicSection objects
     * @returns {Array} Array of section objects
     */
    processTopicSections(topicSections) {
        const sections = [];

        progressService.log(`Processing ${topicSections.length} topicSections`, 'info');

        topicSections.forEach((topicSection, index) => {
            try {
                // Create main section from topicSection
                // This will lead to parsing individual JSON files like TopLevel.json, Accounts.json, etc.
                const section = this.createSectionFromTopicSection(topicSection, index);
                sections.push(section);

                progressService.log(`Created section: ${section.name} (${section.identifier}) from topicSection`, 'info');

            } catch (error) {
                progressService.log(`Error processing topicSection ${index}: ${error.message}`, 'warning');
            }
        });

        // Add known missing MDM sections that are part of Apple's official specification
        // but might not be present in the API response
        const missingSections = this.addKnownMissingSections(sections);
        sections.push(...missingSections);

        if (missingSections.length > 0) {
            progressService.log(`Added ${missingSections.length} known missing MDM sections`, 'info');
        }

        return sections;
    }

    /**
     * Create section object from topicSection
     * Each topicSection becomes a main section that loads its corresponding JSON file
     * @param {object} topicSection - TopicSection object
     * @param {number} index - Index in topicSections array
     * @returns {object} Section object
     */
    createSectionFromTopicSection(topicSection, index) {
        // Use title as the section display name (e.g., "Top Level", "Accounts")
        const sectionName = topicSection.title || `Section ${index + 1}`;

        // Create identifier from title for JSON file loading
        // "Top Level" -> "toplevel", "Accounts" -> "accounts"
        const sectionIdentifier = this.createIdentifierFromTitle(sectionName);

        // Get category and priority metadata for this section
        const metadata = getSectionMetadata({ name: sectionName, identifier: sectionIdentifier });

        const section = {
            name: sectionName,
            identifier: sectionIdentifier,
            deprecated: false,
            platforms: ['iOS', 'macOS', 'tvOS', 'watchOS'], // Will be updated from actual data
            parameters: [],
            // Category and priority for visual labels
            category: metadata.category,
            priority: metadata.priority,
            // Section metadata
            anchor: topicSection.anchor,
            title: topicSection.title,
            // Configuration identifiers from topicSection
            configurationIdentifiers: topicSection.identifiers || [],
            // API endpoint for this section's JSON file
            apiEndpoint: this.constructSectionEndpoint(sectionIdentifier),
            // Raw data for debugging
            rawTopicSection: topicSection
        };

        progressService.log(`Created section: ${sectionName} (${sectionIdentifier}) -> ${section.apiEndpoint}`, 'info');
        return section;
    }

    /**
     * Add known missing MDM sections that are part of Apple's official specification
     * but might not be present in the API response
     * @param {Array} existingSections - Already discovered sections
     * @returns {Array} Array of missing section objects to add
     */
    addKnownMissingSections(existingSections) {
        const missingSections = [];

        // Define known MDM sections that should be available
        const knownMDMSections = [
            {
                name: 'Firewall',
                identifier: 'firewall',
                description: 'Configure macOS firewall settings and rules',
                platforms: ['macOS'],
                category: 'Security',
                priority: 'high',
                identifiers: ['com.apple.security.firewall', 'Firewall']
            },
            {
                name: 'VPN',
                identifier: 'vpn',
                description: 'Configure VPN connections and settings',
                platforms: ['iOS', 'macOS', 'tvOS'],
                category: 'Network',
                priority: 'high',
                identifiers: ['com.apple.vpn.managed', 'VPN']
            },
            {
                name: 'Certificate Trust Settings',
                identifier: 'certificatetrustsettings',
                description: 'Configure certificate trust policies',
                platforms: ['iOS', 'macOS', 'tvOS', 'watchOS'],
                category: 'Security',
                priority: 'medium',
                identifiers: ['com.apple.security.certificatetrust', 'CertificateTrustSettings']
            },
            {
                name: 'Privacy Preferences Policy Control',
                identifier: 'privacypreferencespolicycontrol',
                description: 'Configure privacy and security preferences',
                platforms: ['macOS'],
                category: 'Security',
                priority: 'medium',
                identifiers: ['com.apple.TCC.configuration-profile-policy', 'PrivacyPreferencesPolicy']
            },
            {
                name: 'Software Update',
                identifier: 'softwareupdate',
                description: 'Configure automatic software update settings',
                platforms: ['iOS', 'macOS', 'tvOS', 'watchOS'],
                category: 'System',
                priority: 'high',
                identifiers: ['com.apple.SoftwareUpdate', 'SoftwareUpdate']
            },
            {
                name: 'Content Filter',
                identifier: 'contentfilter',
                description: 'Configure web content filtering',
                platforms: ['iOS', 'macOS'],
                category: 'Security',
                priority: 'medium',
                identifiers: ['com.apple.webcontent-filter', 'ContentFilter']
            },
            {
                name: 'DNS Settings',
                identifier: 'dnssettings',
                description: 'Configure DNS server settings',
                platforms: ['iOS', 'macOS', 'tvOS'],
                category: 'Network',
                priority: 'medium',
                identifiers: ['com.apple.dnsSettings.managed', 'DNSSettings']
            },
            {
                name: 'Managed App Configuration',
                identifier: 'managedappconfiguration',
                description: 'Configure settings for managed applications',
                platforms: ['iOS', 'macOS', 'tvOS'],
                category: 'Apps',
                priority: 'high',
                identifiers: ['com.apple.app.managed', 'ManagedAppConfiguration']
            },
            {
                name: 'Single Sign-On Extensions',
                identifier: 'singlesignonextensions',
                description: 'Configure Single Sign-On extensions',
                platforms: ['iOS', 'macOS'],
                category: 'Authentication',
                priority: 'medium',
                identifiers: ['com.apple.extensiblesso', 'SingleSignOnExtensions']
            },
            {
                name: 'Associated Domains',
                identifier: 'associateddomains',
                description: 'Configure associated domains for apps',
                platforms: ['iOS', 'macOS', 'tvOS'],
                category: 'Apps',
                priority: 'medium',
                identifiers: ['com.apple.developer.associated-domains', 'AssociatedDomains']
            }
        ];

        // Check which sections are missing
        knownMDMSections.forEach(knownSection => {
            const exists = existingSections.some(existing =>
                existing.identifier === knownSection.identifier ||
                existing.name.toLowerCase() === knownSection.name.toLowerCase() ||
                this.normalizeIdentifierForAPI(existing.name) === this.normalizeIdentifierForAPI(knownSection.name)
            );

            if (!exists) {
                const missingSection = {
                    name: knownSection.name,
                    identifier: knownSection.identifier,
                    description: knownSection.description,
                    platforms: knownSection.platforms,
                    deprecated: false,
                    parameters: [],
                    // Mark as synthetic section
                    isSynthetic: true,
                    category: knownSection.category,
                    priority: knownSection.priority,
                    // Store identifiers for parameter discovery
                    configurationIdentifiers: knownSection.identifiers,
                    // Create synthetic topicSection for compatibility
                    rawTopicSection: {
                        title: knownSection.name,
                        anchor: knownSection.identifier,
                        identifiers: knownSection.identifiers,
                        abstract: knownSection.description
                    },
                    // API endpoint for this section's JSON file
                    apiEndpoint: this.constructSectionEndpoint(knownSection.identifier)
                };

                missingSections.push(missingSection);
                progressService.log(`Added missing section: ${knownSection.name} (${knownSection.category})`, 'info');
            }
        });

        return missingSections;
    }

    /**
     * Create identifier from section title for JSON file loading
     * @param {string} title - Section title
     * @returns {string} Normalized identifier
     */
    createIdentifierFromTitle(title) {
        if (!title) return 'unknown';

        // Convert title to lowercase identifier
        // "Top Level" -> "toplevel"
        // "Accounts" -> "accounts"
        return title.toLowerCase()
                   .replace(/\s+/g, '')  // Remove spaces
                   .replace(/[^a-z0-9]/g, ''); // Remove non-alphanumeric characters
    }

    /**
     * Construct API endpoint for section JSON file
     * @param {string} sectionIdentifier - Section identifier
     * @returns {string} API endpoint URL
     */
    constructSectionEndpoint(sectionIdentifier) {
        // Construct endpoint like: https://developer.apple.com/tutorials/data/documentation/devicemanagement/TopLevel.json
        const capitalizedIdentifier = sectionIdentifier.charAt(0).toUpperCase() + sectionIdentifier.slice(1);
        return `${API_ENDPOINTS.CONFIG_TYPE_BASE}/${capitalizedIdentifier}.json`;
    }

    /**
     * Create sub-sections from identifiers array with parent-child relationships
     * @param {object} topicSection - TopicSection object
     * @param {object} parentSection - Parent section object
     * @returns {Array} Array of sub-section objects
     */
    createSubSectionsFromIdentifiers(topicSection, parentSection) {
        const subSections = [];

        progressService.log(`Creating sub-sections from ${topicSection.identifiers.length} identifiers for parent: ${parentSection.name}`, 'info');

        topicSection.identifiers.forEach((identifier) => {
            try {
                // Extract configuration type name from Apple identifier URL
                const configTypeName = this.extractConfigTypeFromIdentifier(identifier);

                if (configTypeName) {
                    const subSectionName = this.formatConfigTypeName(configTypeName);
                    const subSectionIdentifier = configTypeName.toLowerCase();

                    // Get category and priority metadata for this sub-section
                    const metadata = getSectionMetadata({
                        name: subSectionName,
                        identifier: subSectionIdentifier
                    });

                    const subSection = {
                        name: subSectionName,
                        identifier: subSectionIdentifier,
                        deprecated: false,
                        platforms: parentSection.platforms || ['iOS', 'macOS', 'tvOS', 'watchOS'],
                        parameters: [],
                        // Category and priority for visual labels
                        category: metadata.category,
                        priority: metadata.priority,
                        // Hierarchical properties
                        isSubSection: true,
                        parentSection: parentSection.identifier,
                        parentName: parentSection.name,
                        // Configuration type specific data
                        configurationTypeIdentifier: identifier,
                        apiEndpoint: this.constructConfigTypeEndpoint(configTypeName),
                        // Raw data for debugging
                        rawData: { identifier, parentTopicSection: topicSection }
                    };

                    subSections.push(subSection);
                    progressService.log(`Created sub-section: ${subSection.name} (${subSection.identifier}) under ${parentSection.name}`, 'info');
                } else {
                    progressService.log(`Could not extract config type from identifier: ${identifier}`, 'warning');
                }
            } catch (error) {
                progressService.log(`Error processing identifier ${identifier}: ${error.message}`, 'warning');
            }
        });

        return subSections;
    }

    /**
     * Log hierarchical structure analysis
     * @param {Array} sections - Array of section objects
     */
    logHierarchicalStructure(sections) {
        const mainSections = sections.filter(s => !s.isSubSection);
        const subSections = sections.filter(s => s.isSubSection);

        progressService.log(`Hierarchical structure analysis:`, 'info');
        progressService.log(`- Total sections: ${sections.length}`, 'info');
        progressService.log(`- Main sections: ${mainSections.length}`, 'info');
        progressService.log(`- Sub-sections: ${subSections.length}`, 'info');

        // Log main sections with their sub-sections
        mainSections.forEach(mainSection => {
            const childSections = subSections.filter(sub => sub.parentSection === mainSection.identifier);
            progressService.log(`- ${mainSection.name} (${mainSection.identifier}): ${childSections.length} sub-sections`, 'info');

            childSections.forEach(child => {
                progressService.log(`  └─ ${child.name} (${child.identifier})`, 'info');
            });
        });
    }

    /**
     * Fallback to legacy parsing if hierarchical parsing fails
     * @param {object} mainSpec - Main specification data
     * @returns {Array} Array of section objects
     */
    fallbackToLegacyParsing(mainSpec) {
        try {
            progressService.log('Falling back to legacy section parsing...', 'warning');

            // Enhanced dynamic parsing - try multiple possible structures
            const parsedSections = this.extractSectionsFromAnyStructure(mainSpec);

            // Validate and normalize all sections
            const validatedSections = parsedSections.map((section, index) => {
                return this.validateAndNormalizeSection(section, index);
            });

            progressService.log(`Legacy parsing produced ${validatedSections.length} sections`, 'warning');
            return validatedSections;
        } catch (error) {
            progressService.log(`Legacy parsing also failed: ${error.message}`, 'error');
            return [];
        }
    }

    /**
     * Step 4: Parse Individual Configuration Type JSON Files
     * Extracts and structures data from individual configuration type JSON files
     * @param {object} rawData - Raw configuration type JSON data
     * @param {string} configTypeName - Configuration type name
     * @returns {object} Parsed and structured configuration data
     */
    parseConfigurationTypeJSON(rawData, configTypeName) {
        try {
            progressService.log(`Parsing configuration type JSON for: ${configTypeName}`, 'info');

            const parsedData = {
                // Original data structure for backward compatibility
                ...rawData,

                // Step 4A: Property Definitions Table
                propertyDefinitions: this.extractPropertyDefinitions(rawData),

                // Step 4B: Payload Metadata Table
                payloadMetadata: this.extractPayloadMetadata(rawData),

                // Step 4C: Profile Availability Matrix
                profileAvailability: this.extractProfileAvailability(rawData),

                // Step 4D: Example Payload XML
                examplePayloadXML: this.extractExamplePayloadXML(rawData),

                // Additional parsing metadata
                parsingMetadata: {
                    configTypeName: configTypeName,
                    parsedAt: new Date().toISOString(),
                    schemaVersion: rawData.schemaVersion || 'unknown',
                    title: rawData.title || configTypeName
                }
            };

            progressService.log(`Successfully parsed configuration type JSON for: ${configTypeName}`, 'success');
            return parsedData;

        } catch (error) {
            progressService.log(`Error parsing configuration type JSON for ${configTypeName}: ${error.message}`, 'warning');

            // Return original data with error information if parsing fails
            return {
                ...rawData,
                parsingError: error.message,
                parsingMetadata: {
                    configTypeName: configTypeName,
                    parsedAt: new Date().toISOString(),
                    failed: true
                }
            };
        }
    }

    /**
     * Step 4A: Extract Property Definitions Table
     * Source: primaryContentSections[] where "kind": "declarations" or "kind": "properties"
     * @param {object} rawData - Raw configuration type data
     * @returns {Array} Array of property definition objects
     */
    extractPropertyDefinitions(rawData) {
        const propertyDefinitions = [];

        try {
            if (rawData.primaryContentSections && Array.isArray(rawData.primaryContentSections)) {
                rawData.primaryContentSections.forEach(section => {
                    // Strategy 1: Extract from declarations (legacy structure)
                    if (section.kind === 'declarations' && section.declarations) {
                        section.declarations.forEach(declaration => {
                            if (declaration.tokens) {
                                const property = this.parsePropertyDeclaration(declaration);
                                if (property) {
                                    propertyDefinitions.push(property);
                                }
                            }
                        });
                    }

                    // Strategy 2: Extract from properties (current Apple structure)
                    if (section.kind === 'properties' && section.items) {
                        section.items.forEach(item => {
                            const property = this.parsePropertyItem(item);
                            if (property) {
                                propertyDefinitions.push(property);
                            }
                        });
                    }
                });
            }

            progressService.log(`Extracted ${propertyDefinitions.length} property definitions`, 'info');
        } catch (error) {
            progressService.log(`Error extracting property definitions: ${error.message}`, 'warning');
        }

        return propertyDefinitions;
    }

    /**
     * Parse individual property declaration (legacy structure)
     * @param {object} declaration - Property declaration object
     * @returns {object|null} Parsed property object
     */
    parsePropertyDeclaration(declaration) {
        try {
            const property = {
                name: null,
                type: null,
                defaultValue: null,
                required: false,
                introducedVersion: null,
                description: null
            };

            // Extract property name
            if (declaration.names && declaration.names[0]) {
                property.name = declaration.names[0];
            }

            // Extract type information
            if (declaration.type && declaration.type[0] && declaration.type[0].text) {
                property.type = declaration.type[0].text;
            }

            // Extract default value
            if (declaration.attributes && declaration.attributes[0] && declaration.attributes[0].value) {
                property.defaultValue = declaration.attributes[0].value;
            }

            // Extract required status
            if (declaration.required !== undefined) {
                property.required = Boolean(declaration.required);
            }

            // Extract introduced version
            if (declaration.introducedVersion) {
                property.introducedVersion = declaration.introducedVersion;
            }

            // Extract description from content
            if (declaration.content && Array.isArray(declaration.content)) {
                const descriptionParts = [];
                declaration.content.forEach(contentItem => {
                    if (contentItem.inlineContent && Array.isArray(contentItem.inlineContent)) {
                        contentItem.inlineContent.forEach(inline => {
                            if (inline.text) {
                                descriptionParts.push(inline.text);
                            }
                        });
                    }
                });
                property.description = descriptionParts.join(' ').trim();
            }

            return property.name ? property : null;

        } catch (error) {
            progressService.log(`Error parsing property declaration: ${error.message}`, 'warning');
            return null;
        }
    }

    /**
     * Parse individual property item (current Apple structure)
     * @param {object} item - Property item object from properties section
     * @returns {object|null} Parsed property object
     */
    parsePropertyItem(item) {
        try {
            const property = {
                name: null,
                type: null,
                defaultValue: null,
                required: false,
                introducedVersion: null,
                description: null
            };

            // Extract property name
            if (item.name) {
                property.name = item.name;
            }

            // Extract type information
            if (item.type && Array.isArray(item.type)) {
                // Type is an array of objects with kind and text
                const typeText = item.type.map(t => t.text || t.kind).filter(Boolean).join('');
                property.type = typeText;
            }

            // Extract default value from attributes
            if (item.attributes && Array.isArray(item.attributes)) {
                const defaultAttr = item.attributes.find(attr => attr.kind === 'default');
                if (defaultAttr && defaultAttr.value !== undefined) {
                    property.defaultValue = defaultAttr.value;
                }
            }

            // Extract required status
            if (item.required !== undefined) {
                property.required = Boolean(item.required);
            }

            // Extract introduced version
            if (item.introducedVersion) {
                property.introducedVersion = item.introducedVersion;
            }

            // Extract description from content
            if (item.content && Array.isArray(item.content)) {
                const descriptionParts = [];
                item.content.forEach(contentItem => {
                    if (contentItem.type === 'paragraph' && contentItem.inlineContent) {
                        contentItem.inlineContent.forEach(inline => {
                            if (inline.text) {
                                descriptionParts.push(inline.text);
                            } else if (inline.type === 'codeVoice' && inline.code) {
                                descriptionParts.push(`\`${inline.code}\``);
                            }
                        });
                    }
                });
                property.description = descriptionParts.join(' ').trim();
            }

            progressService.log(`Parsed property: ${property.name} (${property.type})`, 'info');
            return property.name ? property : null;

        } catch (error) {
            progressService.log(`Error parsing property item: ${error.message}`, 'warning');
            return null;
        }
    }

    /**
     * Step 4B: Extract Payload Metadata Table
     * Source: Root-level metadata field
     * @param {object} rawData - Raw configuration type data
     * @returns {object} Payload metadata object
     */
    extractPayloadMetadata(rawData) {
        const metadata = {
            payloadType: null,
            symbolKind: null,
            supportedPlatforms: [],
            schemaVersion: null,
            objectName: null,
            abstract: null
        };

        try {
            // Extract from root-level metadata
            if (rawData.metadata) {
                metadata.symbolKind = rawData.metadata.symbolKind || null;
                metadata.abstract = rawData.metadata.abstract || null;
            }

            // Extract supported platforms
            if (rawData.platforms && Array.isArray(rawData.platforms)) {
                metadata.supportedPlatforms = rawData.platforms.map(platform => platform.name || platform).filter(Boolean);
            }

            // Extract schema version
            metadata.schemaVersion = rawData.schemaVersion || null;

            // Extract object name from title
            metadata.objectName = rawData.title || null;

            // Extract payload type from metadata or infer from title
            if (rawData.metadata && rawData.metadata.title) {
                metadata.payloadType = rawData.metadata.title;
            } else if (rawData.title) {
                metadata.payloadType = rawData.title;
            }

            progressService.log(`Extracted payload metadata for ${metadata.objectName || 'unknown'}`, 'info');
        } catch (error) {
            progressService.log(`Error extracting payload metadata: ${error.message}`, 'warning');
        }

        return metadata;
    }

    /**
     * Step 4C: Extract Profile Availability Matrix
     * Source: Section with "type": "table" containing availability information
     * @param {object} rawData - Raw configuration type data
     * @returns {Array} Array of availability objects
     */
    extractProfileAvailability(rawData) {
        const availabilityMatrix = [];

        try {
            if (rawData.primaryContentSections && Array.isArray(rawData.primaryContentSections)) {
                rawData.primaryContentSections.forEach(section => {
                    if (section.type === 'table' && section.rows) {
                        section.rows.forEach(row => {
                            if (row.cells && row.cells.length >= 2) {
                                const availability = {
                                    setting: this.extractCellText(row.cells[0]),
                                    availability: this.extractCellText(row.cells[1]),
                                    deviceChannel: row.cells[2] ? this.extractCellText(row.cells[2]) : null,
                                    userChannel: row.cells[3] ? this.extractCellText(row.cells[3]) : null,
                                    supervisionRequired: row.cells[4] ? this.extractCellText(row.cells[4]) : null
                                };

                                if (availability.setting && availability.availability) {
                                    availabilityMatrix.push(availability);
                                }
                            }
                        });
                    }
                });
            }

            progressService.log(`Extracted ${availabilityMatrix.length} availability entries`, 'info');
        } catch (error) {
            progressService.log(`Error extracting profile availability: ${error.message}`, 'warning');
        }

        return availabilityMatrix;
    }

    /**
     * Step 4D: Extract Example Payload XML
     * Source: Section with "type": "codeListing" and "syntax": "plist"
     * @param {object} rawData - Raw configuration type data
     * @returns {string|null} Example payload XML content
     */
    extractExamplePayloadXML(rawData) {
        try {
            if (rawData.primaryContentSections && Array.isArray(rawData.primaryContentSections)) {
                for (const section of rawData.primaryContentSections) {
                    if (section.type === 'codeListing' && section.syntax === 'plist' && section.code) {
                        progressService.log(`Extracted example payload XML`, 'info');
                        return section.code;
                    }
                }
            }

            // Also check in other possible locations
            if (rawData.sampleCode && rawData.sampleCode.code) {
                return rawData.sampleCode.code;
            }

            progressService.log(`No example payload XML found`, 'info');
        } catch (error) {
            progressService.log(`Error extracting example payload XML: ${error.message}`, 'warning');
        }

        return null;
    }

    /**
     * Extract text content from table cell
     * @param {object} cell - Table cell object
     * @returns {string|null} Extracted text
     */
    extractCellText(cell) {
        try {
            if (cell.content && Array.isArray(cell.content)) {
                const textParts = [];
                cell.content.forEach(contentItem => {
                    if (contentItem.inlineContent && Array.isArray(contentItem.inlineContent)) {
                        contentItem.inlineContent.forEach(inline => {
                            if (inline.text) {
                                textParts.push(inline.text);
                            }
                        });
                    }
                });
                return textParts.join(' ').trim() || null;
            }
            return null;
        } catch (error) {
            return null;
        }
    }

    /**
     * Log comprehensive structure analysis of configuration type
     * @param {object} parsedData - Parsed configuration type data
     * @param {string} configTypeName - Configuration type name
     */
    logConfigurationTypeStructure(parsedData, configTypeName) {
        progressService.log(`Configuration type structure analysis for ${configTypeName}:`, 'info');
        progressService.log(`- Property definitions: ${parsedData.propertyDefinitions?.length || 0}`, 'info');
        progressService.log(`- Payload metadata: ${parsedData.payloadMetadata?.objectName || 'unknown'}`, 'info');
        progressService.log(`- Profile availability entries: ${parsedData.profileAvailability?.length || 0}`, 'info');
        progressService.log(`- Example payload XML: ${parsedData.examplePayloadXML ? 'available' : 'not available'}`, 'info');
        progressService.log(`- Schema version: ${parsedData.parsingMetadata?.schemaVersion || 'unknown'}`, 'info');
    }

    /**
     * Parse section JSON according to specifications
     * Extracts properties, metadata, availability matrix, and example XML
     * @param {object} rawData - Raw section JSON data
     * @param {string} sectionName - Section name
     * @returns {object} Parsed section data with structured information
     */
    parseSectionJSON(rawData, sectionName) {
        try {
            progressService.log(`Parsing section JSON for: ${sectionName}`, 'info');

            const parsedData = {
                // Original data structure for backward compatibility
                ...rawData,

                // Structured parsing according to specifications
                sectionMetadata: this.extractSectionMetadata(rawData, sectionName),
                propertyDefinitions: this.extractPropertyDefinitions(rawData),
                payloadMetadata: this.extractPayloadMetadata(rawData),
                profileAvailability: this.extractProfileAvailability(rawData),
                examplePayloadXML: this.extractExamplePayloadXML(rawData),

                // Section-specific parsing metadata
                parsingMetadata: {
                    sectionName: sectionName,
                    parsedAt: new Date().toISOString(),
                    schemaVersion: rawData.schemaVersion || 'unknown',
                    title: rawData.title || sectionName,
                    payloadType: this.extractPayloadType(rawData)
                }
            };

            // Log parsing results
            this.logSectionParsingResults(parsedData, sectionName);

            progressService.log(`Successfully parsed section JSON for: ${sectionName}`, 'success');
            return parsedData;

        } catch (error) {
            progressService.log(`Error parsing section JSON for ${sectionName}: ${error.message}`, 'warning');

            // Return original data with error information if parsing fails
            return {
                ...rawData,
                parsingError: error.message,
                parsingMetadata: {
                    sectionName: sectionName,
                    parsedAt: new Date().toISOString(),
                    failed: true
                }
            };
        }
    }

    /**
     * Extract section metadata from raw data
     * @param {object} rawData - Raw section data
     * @param {string} sectionName - Section name
     * @returns {object} Section metadata
     */
    extractSectionMetadata(rawData, sectionName) {
        const metadata = {
            sectionName: sectionName,
            title: rawData.title || sectionName,
            abstract: null,
            platforms: [],
            schemaVersion: rawData.schemaVersion || null,
            symbolKind: null
        };

        try {
            // Extract from root-level metadata
            if (rawData.metadata) {
                metadata.abstract = rawData.metadata.abstract || null;
                metadata.symbolKind = rawData.metadata.symbolKind || null;
            }

            // Extract supported platforms
            if (rawData.platforms && Array.isArray(rawData.platforms)) {
                metadata.platforms = rawData.platforms.map(platform => platform.name || platform).filter(Boolean);
            }

            progressService.log(`Extracted section metadata for ${sectionName}`, 'info');
        } catch (error) {
            progressService.log(`Error extracting section metadata: ${error.message}`, 'warning');
        }

        return metadata;
    }

    /**
     * Extract payload type from raw data
     * @param {object} rawData - Raw section data
     * @returns {string|null} Payload type
     */
    extractPayloadType(rawData) {
        try {
            // Look for payload type in various locations
            if (rawData.metadata && rawData.metadata.title) {
                return rawData.metadata.title;
            }

            if (rawData.title) {
                return rawData.title;
            }

            // Look in property definitions for PayloadType
            if (rawData.primaryContentSections && Array.isArray(rawData.primaryContentSections)) {
                for (const section of rawData.primaryContentSections) {
                    if (section.kind === 'declarations' && section.declarations) {
                        for (const declaration of section.declarations) {
                            if (declaration.names && declaration.names.includes('PayloadType')) {
                                if (declaration.attributes && declaration.attributes[0] && declaration.attributes[0].value) {
                                    return declaration.attributes[0].value;
                                }
                            }
                        }
                    }
                }
            }

            return null;
        } catch (error) {
            progressService.log(`Error extracting payload type: ${error.message}`, 'warning');
            return null;
        }
    }

    /**
     * Log section parsing results
     * @param {object} parsedData - Parsed section data
     * @param {string} sectionName - Section name
     */
    logSectionParsingResults(parsedData, sectionName) {
        progressService.log(`Section parsing results for ${sectionName}:`, 'info');
        progressService.log(`- Property definitions: ${parsedData.propertyDefinitions?.length || 0}`, 'info');
        progressService.log(`- Payload metadata: ${parsedData.payloadMetadata?.objectName || 'unknown'}`, 'info');
        progressService.log(`- Profile availability entries: ${parsedData.profileAvailability?.length || 0}`, 'info');
        progressService.log(`- Example payload XML: ${parsedData.examplePayloadXML ? 'available' : 'not available'}`, 'info');
        progressService.log(`- Payload type: ${parsedData.parsingMetadata?.payloadType || 'unknown'}`, 'info');
    }

    /**
     * Log section processing results
     * @param {Array} sections - Array of processed sections
     */
    logSectionProcessingResults(sections) {
        progressService.log(`Section processing results:`, 'info');
        progressService.log(`- Total sections: ${sections.length}`, 'info');

        sections.forEach((section, index) => {
            progressService.log(`- ${index + 1}. ${section.name} (${section.identifier}) -> ${section.apiEndpoint}`, 'info');
        });
    }

    /**
     * Extract sections from any JSON structure dynamically
     * @param {object} data - JSON data to parse
     * @returns {Array} Array of potential section objects
     */
    extractSectionsFromAnyStructure(data) {
        const sections = [];

        if (!data || typeof data !== 'object') {
            return sections;
        }

        // Strategy 1: Apple's actual MDM API structure (topicSections) - PRIMARY
        if (data.topicSections && Array.isArray(data.topicSections)) {
            progressService.log('Found Apple MDM API structure: topicSections', 'info');
            progressService.log(`Processing ${data.topicSections.length} topic sections with hierarchical expansion`, 'info');

            data.topicSections.forEach((topicSection, index) => {
                if (this.looksLikeTopicSection(topicSection)) {
                    // Create main section
                    const mainSection = this.createSectionFromTopicSection(topicSection, index);
                    sections.push(mainSection);
                    progressService.log(`Created main section: ${mainSection.name} (${mainSection.identifier})`, 'info');

                    // Create sub-sections from identifiers array
                    const subSections = this.createSubSectionsFromIdentifiers(topicSection, mainSection);
                    sections.push(...subSections);

                    if (subSections.length > 0) {
                        progressService.log(`Created ${subSections.length} sub-sections for ${mainSection.name}`, 'info');
                    }
                }
            });
        }

        // Strategy 2: Apple's documentation structure (references) - FALLBACK
        if (sections.length === 0 && data.references) {
            progressService.log('Fallback to Apple documentation structure: references', 'info');
            const docReferences = data.references;

            Object.keys(docReferences).forEach(key => {
                const reference = docReferences[key];
                if (this.looksLikeSection(reference)) {
                    sections.push(this.createSectionFromReference(key, reference));
                }
            });
        }

        // Strategy 3: Look for alternative structures
        if (sections.length === 0) {
            sections.push(...this.findSectionsInAlternativeStructures(data));
        }

        // Strategy 4: Deep search for section-like objects
        if (sections.length === 0) {
            sections.push(...this.deepSearchForSections(data));
        }

        progressService.log(`Total sections extracted: ${sections.length}`, 'info');
        return sections;
    }

    /**
     * Find sections in alternative JSON structures
     * @param {object} data - JSON data to search
     * @returns {Array} Array of section objects
     */
    findSectionsInAlternativeStructures(data) {
        const sections = [];

        // Check for primaryContentSections (Apple alternative)
        if (data.primaryContentSections) {
            progressService.log('Found alternative structure: primaryContentSections', 'info');
            data.primaryContentSections.forEach((section, index) => {
                if (this.looksLikeSection(section)) {
                    sections.push(this.createSectionFromReference(
                        section.identifier || `section-${index}`,
                        section
                    ));
                }
            });
        }

        // Check for configurationTypes (future structure)
        if (data.configurationTypes || data.newStructure?.configurationTypes) {
            const configTypes = data.configurationTypes || data.newStructure.configurationTypes;
            progressService.log('Found future structure: configurationTypes', 'info');

            Object.keys(configTypes).forEach(key => {
                const config = configTypes[key];
                if (config.metadata || config.parameters) {
                    sections.push({
                        name: config.metadata?.displayName || config.displayName || key,
                        identifier: key,
                        description: config.metadata?.description || config.description || '',
                        platforms: config.metadata?.supportedPlatforms || config.platforms || [],
                        deprecated: config.metadata?.deprecated || config.deprecated || false,
                        url: config.metadata?.documentationUrl || config.url || '',
                        rawData: config
                    });
                }
            });
        }

        return sections;
    }

    /**
     * Deep search for section-like objects in any structure
     * @param {object} data - JSON data to search
     * @returns {Array} Array of section objects
     */
    deepSearchForSections(data) {
        const sections = [];

        const searchRecursively = (obj, currentPath = []) => {
            if (!obj || typeof obj !== 'object' || currentPath.length > 5) {
                return; // Prevent infinite recursion
            }

            // Check if current object looks like a section
            if (this.looksLikeSection(obj)) {
                const identifier = currentPath[currentPath.length - 1] || `found-section-${sections.length}`;
                sections.push(this.createSectionFromReference(identifier, obj));
                return; // Don't search deeper in found sections
            }

            // Search in child objects
            Object.keys(obj).forEach(key => {
                if (typeof obj[key] === 'object' && obj[key] !== null) {
                    searchRecursively(obj[key], [...currentPath, key]);
                }
            });
        };

        progressService.log('Performing deep search for section-like objects', 'info');
        searchRecursively(data);

        if (sections.length > 0) {
            progressService.log(`Deep search found ${sections.length} potential sections`, 'info');
        }

        return sections;
    }

    /**
     * Extract section-specific data from the main specification
     * @param {object} mainSpecData - Main specification data
     * @param {string} sectionName - Section name/identifier
     * @returns {object} Section-specific data
     */
    extractSectionDataFromMainSpec(mainSpecData, sectionName) {
        try {
            progressService.log(`Extracting data for section: ${sectionName} from profile-specific payload keys`, 'info');

            if (!mainSpecData || typeof mainSpecData !== 'object') {
                throw new Error('Invalid profile-specific payload keys data');
            }

            progressService.log(`Profile payload keys structure: ${Object.keys(mainSpecData).join(', ')}`, 'info');

            // Create section data structure that matches expected format
            const sectionData = {
                topicSections: [],
                references: mainSpecData.references || {}
            };

            // Find the specific topicSection for this section
            if (mainSpecData.topicSections && Array.isArray(mainSpecData.topicSections)) {
                const matchingTopicSection = mainSpecData.topicSections.find(topicSection => {
                    // Match by anchor (identifier) or title
                    const matchesAnchor = topicSection.anchor === sectionName;
                    const matchesTitle = topicSection.title === sectionName;
                    const normalizedAnchor = this.normalizeIdentifierForAPI(topicSection.anchor || '') ===
                                           this.normalizeIdentifierForAPI(sectionName);
                    const normalizedTitle = this.normalizeIdentifierForAPI(topicSection.title || '') ===
                                          this.normalizeIdentifierForAPI(sectionName);

                    // Additional flexible matching for common variations
                    const sectionLower = sectionName.toLowerCase().replace(/[^a-z0-9]/g, '');
                    const anchorLower = (topicSection.anchor || '').toLowerCase().replace(/[^a-z0-9]/g, '');
                    const titleLower = (topicSection.title || '').toLowerCase().replace(/[^a-z0-9]/g, '');
                    const flexibleMatch = sectionLower === anchorLower || sectionLower === titleLower;

                    return matchesAnchor || matchesTitle || normalizedAnchor || normalizedTitle || flexibleMatch;
                });

                if (matchingTopicSection) {
                    progressService.log(`Found matching topicSection for ${sectionName}`, 'info');
                    sectionData.topicSections = [matchingTopicSection];

                    // Log the identifiers that will be used for parameter discovery
                    if (matchingTopicSection.identifiers) {
                        progressService.log(`Section ${sectionName} has ${matchingTopicSection.identifiers.length} identifiers`, 'info');
                    }
                } else {
                    progressService.log(`No matching topicSection found for ${sectionName}, using fallback`, 'warning');

                    // Create a synthetic topicSection for backward compatibility
                    sectionData.topicSections = [{
                        title: sectionName,
                        anchor: sectionName,
                        identifiers: [sectionName] // Use section name as identifier
                    }];
                }
            } else {
                progressService.log(`No topicSections found in main spec, creating fallback for ${sectionName}`, 'warning');

                // Create a synthetic topicSection
                sectionData.topicSections = [{
                    title: sectionName,
                    anchor: sectionName,
                    identifiers: [sectionName]
                }];
            }

            progressService.log(`Created section data for ${sectionName} with ${sectionData.topicSections.length} topicSections`, 'info');
            return sectionData;

        } catch (error) {
            progressService.log(`Error extracting section data for ${sectionName}: ${error.message}`, 'error');

            // Return minimal fallback structure
            return {
                topicSections: [{
                    title: sectionName,
                    anchor: sectionName,
                    identifiers: [sectionName]
                }],
                references: {}
            };
        }
    }

    /**
     * Validate and normalize a section object
     * @param {object} section - Section to validate
     * @param {number} index - Section index for fallback naming
     * @returns {object} Validated and normalized section
     */
    validateAndNormalizeSection(section, index) {
        if (!section.identifier) {
            progressService.log(`Section at index ${index} missing identifier, generating one`, 'warning');
            section.identifier = `unknown-section-${index}`;
        }

        // Convert identifiers to proper API endpoint names
        section.identifier = this.normalizeIdentifierForAPI(section.identifier);

        if (!section.name) {
            progressService.log(`Section ${section.identifier} missing name, using identifier`, 'warning');
            section.name = section.identifier;
        }

        // Ensure arrays are properly initialized
        section.platforms = Array.isArray(section.platforms) ? section.platforms : [];
        section.deprecated = Boolean(section.deprecated);
        section.description = section.description || '';
        section.url = section.url || '';

        return section;
    }

    /**
     * Check if an object looks like a topicSection from Apple's MDM API
     * @param {object} obj - Object to check
     * @returns {boolean} True if it looks like a topicSection
     */
    looksLikeTopicSection(obj) {
        if (!obj || typeof obj !== 'object') return false;

        // Check for topicSection indicators
        const topicSectionIndicators = [
            obj.title && typeof obj.title === 'string',
            obj.anchor && typeof obj.anchor === 'string',
            obj.identifiers && Array.isArray(obj.identifiers),
            obj.identifiers && obj.identifiers.length > 0
        ];

        // Must have at least title and either anchor or identifiers
        const hasTitle = topicSectionIndicators[0];
        const hasAnchorOrIdentifiers = topicSectionIndicators[1] || topicSectionIndicators[2];

        return hasTitle && hasAnchorOrIdentifiers;
    }

    /**
     * Check if an object looks like a section definition
     * @param {object} obj - Object to check
     * @returns {boolean} True if it looks like a section
     */
    looksLikeSection(obj) {
        if (!obj || typeof obj !== 'object') return false;

        // Check for section indicators
        const sectionIndicators = [
            obj.type === 'section',
            obj.kind === 'symbol',
            obj.kind === 'content',
            (obj.title && obj.abstract),
            (obj.displayName && obj.description),
            (obj.name && obj.parameters),
            obj.configType,
            obj.payloadType
        ];

        return sectionIndicators.some(indicator => indicator);
    }

    /**
     * Create section object from Apple MDM API topicSection
     * @param {object} topicSection - TopicSection data from Apple's API
     * @param {number} index - Section index for fallback naming
     * @returns {object} Section object
     */
    createSectionFromTopicSection(topicSection, index) {
        // Use anchor as identifier, fallback to normalized title
        const identifier = topicSection.anchor ||
                          this.normalizeIdentifierForAPI(topicSection.title) ||
                          `section-${index}`;

        return {
            name: topicSection.title || `Section ${index + 1}`,
            identifier: identifier,
            description: topicSection.abstract || topicSection.description || '',
            platforms: topicSection.platforms || [],
            deprecated: topicSection.deprecated || false,
            url: topicSection.url || '',
            // Store identifiers for parameter discovery
            configurationTypes: topicSection.identifiers || [],
            // Keep original data for debugging and future extensibility
            rawData: topicSection
        };
    }

    /**
     * Create sub-sections from identifiers array in topicSection
     * @param {object} topicSection - TopicSection data from Apple's API
     * @param {object} parentSection - Parent section object
     * @returns {Array} Array of sub-section objects
     */
    createSubSectionsFromIdentifiers(topicSection, parentSection) {
        const subSections = [];

        if (!topicSection.identifiers || !Array.isArray(topicSection.identifiers)) {
            return subSections;
        }

        progressService.log(`Processing ${topicSection.identifiers.length} identifiers for ${parentSection.name}`, 'info');

        topicSection.identifiers.forEach((identifier) => {
            try {
                // Extract configuration type name from identifier URL
                const configTypeName = this.extractConfigTypeFromIdentifier(identifier);

                if (configTypeName && configTypeName !== parentSection.identifier) {
                    const subSection = {
                        name: this.formatConfigTypeName(configTypeName),
                        identifier: configTypeName.toLowerCase(),
                        description: `${configTypeName} configuration settings`,
                        platforms: parentSection.platforms || [],
                        deprecated: false,
                        url: '',
                        // Hierarchical relationship
                        parentSection: parentSection.identifier,
                        parentName: parentSection.name,
                        isSubSection: true,
                        // Configuration type specific data
                        configurationTypeIdentifier: identifier,
                        apiEndpoint: this.constructConfigTypeEndpoint(configTypeName),
                        // Keep original data
                        rawData: { identifier, parentTopicSection: topicSection }
                    };

                    subSections.push(subSection);
                    progressService.log(`Created sub-section: ${subSection.name} (${subSection.identifier})`, 'info');
                }
            } catch (error) {
                progressService.log(`Error processing identifier ${identifier}: ${error.message}`, 'warning');
            }
        });

        return subSections;
    }

    /**
     * Extract configuration type name from Apple identifier URL
     * @param {string} identifier - Apple identifier URL
     * @returns {string} Configuration type name
     */
    extractConfigTypeFromIdentifier(identifier) {
        if (!identifier || typeof identifier !== 'string') {
            return null;
        }

        // Extract from Apple's doc:// URLs
        // Example: "doc://com.apple.devicemanagement/documentation/DeviceManagement/CalDAV" -> "CalDAV"
        const docMatch = identifier.match(/\/DeviceManagement\/([^\/]+)$/);
        if (docMatch) {
            return docMatch[1];
        }

        // Fallback: extract last segment after last slash
        const segments = identifier.split('/');
        const lastSegment = segments[segments.length - 1];

        // Filter out common non-configuration segments
        const excludeSegments = ['DeviceManagement', 'documentation', 'com.apple.devicemanagement'];
        if (excludeSegments.includes(lastSegment)) {
            return null;
        }

        return lastSegment;
    }

    /**
     * Format configuration type name for display
     * @param {string} configTypeName - Raw configuration type name
     * @returns {string} Formatted display name
     */
    formatConfigTypeName(configTypeName) {
        if (!configTypeName) return 'Unknown Configuration';

        // Handle common abbreviations and formatting
        const formatMap = {
            'CalDAV': 'CalDAV',
            'CardDAV': 'CardDAV',
            'LDAP': 'LDAP',
            'VPN': 'VPN',
            'WiFi': 'WiFi',
            'AirPlay': 'AirPlay',
            'AirPrint': 'AirPrint'
        };

        if (formatMap[configTypeName]) {
            return formatMap[configTypeName];
        }

        // Convert camelCase to Title Case
        return configTypeName
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase())
            .trim();
    }

    /**
     * Construct API endpoint for configuration type
     * @param {string} configTypeName - Configuration type name
     * @returns {string} API endpoint URL
     */
    constructConfigTypeEndpoint(configTypeName) {
        if (!configTypeName || typeof configTypeName !== 'string') {
            progressService.log(`Invalid config type name for endpoint construction: ${configTypeName}`, 'warning');
            return '';
        }

        // Convert to lowercase and clean the name
        const normalizedName = configTypeName.toLowerCase().trim();

        // Validate the normalized name
        if (!normalizedName) {
            progressService.log(`Empty config type name after normalization: "${configTypeName}"`, 'warning');
            return '';
        }

        // Use the correct Apple API hierarchy for individual configuration types
        // Base: https://developer.apple.com/tutorials/data/documentation/devicemanagement/
        // Individual: https://developer.apple.com/tutorials/data/documentation/devicemanagement/{configtype}.json
        const endpoint = `${API_ENDPOINTS.CONFIG_TYPE_BASE}/${normalizedName}.json`;

        progressService.log(`Constructed endpoint for ${configTypeName}: ${endpoint}`, 'info');
        return endpoint;
    }

    /**
     * Create section object from reference data
     * @param {string} key - Section key/identifier
     * @param {object} reference - Reference data
     * @returns {object} Section object
     */
    createSectionFromReference(key, reference) {
        return {
            name: reference.title || reference.displayName || reference.name || key,
            identifier: key,
            description: reference.abstract || reference.description || '',
            platforms: reference.platforms || reference.supportedPlatforms || [],
            deprecated: reference.deprecated || reference.isDeprecated || false,
            url: reference.url || reference.documentationUrl || '',
            rawData: reference
        };
    }

    /**
     * Parse section data to extract parameters (Enhanced Dynamic Version)
     * @param {object} sectionData - Section-specific data
     * @param {string} sectionName - Name of the section
     * @returns {Array} Array of parameter objects
     */
    parseParameters(sectionData, sectionName) {
        try {
            const parameters = [];

            // Strategy 0: Extract from property definitions (highest priority - current Apple structure)
            if (sectionData.propertyDefinitions && Array.isArray(sectionData.propertyDefinitions)) {
                sectionData.propertyDefinitions.forEach(propDef => {
                    if (propDef.name) {
                        const parameter = this.createParameterFromPropertyDefinition(propDef);
                        parameters.push(parameter);
                        progressService.log(`Added parameter from property definition: ${propDef.name}`, 'info');
                    }
                });
            }

            // Strategy 1: Apple's current structure (topicSections + references)
            if (parameters.length === 0 && sectionData.topicSections) {
                sectionData.topicSections.forEach(topicSection => {
                    if (topicSection.identifiers) {
                        topicSection.identifiers.forEach(identifier => {
                            const reference = sectionData.references?.[identifier];
                            if (reference) {
                                parameters.push(this.parseParameter(reference, identifier));
                            }
                        });
                    }
                });
            }

            // Strategy 2: Direct references parsing
            if (parameters.length === 0 && sectionData.references) {
                Object.keys(sectionData.references).forEach(key => {
                    const reference = sectionData.references[key];
                    if (reference.kind === 'symbol' && reference.role === 'symbol') {
                        parameters.push(this.parseParameter(reference, key));
                    }
                });
            }

            // Strategy 3: Future structure (parameters object)
            if (parameters.length === 0 && sectionData.parameters) {
                Object.keys(sectionData.parameters).forEach(key => {
                    const paramData = sectionData.parameters[key];
                    parameters.push(this.parseParameter(paramData, key));
                });
            }

            // Strategy 4: Alternative structure (configurationParameters)
            if (parameters.length === 0 && sectionData.configurationParameters) {
                Object.keys(sectionData.configurationParameters).forEach(key => {
                    const paramData = sectionData.configurationParameters[key];
                    parameters.push(this.parseParameter(paramData, key));
                });
            }

            // Strategy 5: Deep search for parameter-like objects
            if (parameters.length === 0) {
                parameters.push(...this.deepSearchForParameters(sectionData));
            }

            progressService.log(`Parsed ${parameters.length} parameters for section ${sectionName}`, 'info');
            return parameters;
        } catch (error) {
            console.error(`Error parsing parameters for ${sectionName}:`, error);
            return [];
        }
    }

    /**
     * Create parameter object from property definition
     * @param {object} propDef - Property definition object
     * @returns {object} Parameter object
     */
    createParameterFromPropertyDefinition(propDef) {
        try {
            // Extract platform information from the property definition
            const platforms = this.extractPlatformsFromPropertyDefinition(propDef);

            return {
                key: propDef.name,
                name: propDef.name,
                type: this.normalizeParameterType(propDef.type),
                description: propDef.description || '',
                required: Boolean(propDef.required),
                deprecated: Boolean(propDef.deprecated),
                platforms: platforms,
                url: '', // Property definitions don't typically have URLs
                enumValues: [], // Could be enhanced to extract enum values if present
                defaultValue: propDef.defaultValue,
                constraints: {
                    introducedVersion: propDef.introducedVersion
                },
                rawData: propDef // Keep original data for debugging
            };
        } catch (error) {
            progressService.log(`Error creating parameter from property definition: ${error.message}`, 'warning');
            return {
                key: propDef.name || 'unknown',
                name: propDef.name || 'Unknown Parameter',
                type: 'string',
                description: 'Error parsing parameter',
                required: false,
                deprecated: false,
                platforms: [],
                url: '',
                enumValues: [],
                constraints: {},
                rawData: propDef
            };
        }
    }

    /**
     * Extract platform information from property definition
     * @param {object} propDef - Property definition object
     * @returns {Array} Array of platform names
     */
    extractPlatformsFromPropertyDefinition(propDef) {
        const platforms = [];

        // Check for introduced version which often indicates platform
        if (propDef.introducedVersion) {
            // For macOS versions like "10.7.0", assume macOS
            if (propDef.introducedVersion.match(/^\d+\.\d+/)) {
                platforms.push('macOS');
            }
        }

        // Default to common platforms if no specific platform info
        if (platforms.length === 0) {
            platforms.push('macOS'); // Accounts section is primarily for macOS
        }

        return platforms;
    }

    /**
     * Normalize parameter type to standard types
     * @param {string} type - Raw type string
     * @returns {string} Normalized type
     */
    normalizeParameterType(type) {
        if (!type || typeof type !== 'string') {
            return 'string';
        }

        const normalizedType = type.toLowerCase().trim();

        // Map Apple types to standard types
        const typeMap = {
            'boolean': 'boolean',
            'bool': 'boolean',
            'string': 'string',
            'number': 'number',
            'integer': 'number',
            'int': 'number',
            'array': 'array',
            'object': 'object',
            'dictionary': 'object'
        };

        return typeMap[normalizedType] || 'string';
    }

    /**
     * Deep search for parameter-like objects in any structure
     * @param {object} data - Data to search
     * @returns {Array} Array of parameter objects
     */
    deepSearchForParameters(data) {
        const parameters = [];

        const searchRecursively = (obj, currentPath = []) => {
            if (!obj || typeof obj !== 'object' || currentPath.length > 4) {
                return; // Prevent infinite recursion
            }

            // Check if current object looks like a parameter
            if (this.looksLikeParameter(obj)) {
                const identifier = currentPath[currentPath.length - 1] || `param-${parameters.length}`;
                parameters.push(this.parseParameter(obj, identifier));
                return; // Don't search deeper in found parameters
            }

            // Search in child objects
            Object.keys(obj).forEach(key => {
                if (typeof obj[key] === 'object' && obj[key] !== null) {
                    searchRecursively(obj[key], [...currentPath, key]);
                }
            });
        };

        searchRecursively(data);

        if (parameters.length > 0) {
            progressService.log(`Deep search found ${parameters.length} potential parameters`, 'info');
        }

        return parameters;
    }

    /**
     * Check if an object looks like a parameter definition
     * @param {object} obj - Object to check
     * @returns {boolean} True if it looks like a parameter
     */
    looksLikeParameter(obj) {
        if (!obj || typeof obj !== 'object') return false;

        // Check for parameter indicators
        const parameterIndicators = [
            obj.type || obj.dataType || obj.parameterType,
            obj.title || obj.displayName || obj.name,
            obj.abstract || obj.description,
            obj.kind === 'symbol',
            obj.possibleValues || obj.allowedValues || obj.enumValues,
            obj.required !== undefined || obj.isRequired !== undefined,
            obj.defaultValue !== undefined || obj.default !== undefined
        ];

        // Must have at least 2 indicators to be considered a parameter
        const indicatorCount = parameterIndicators.filter(indicator => indicator).length;
        return indicatorCount >= 2;
    }

    /**
     * Parse individual parameter from reference data (Enhanced Dynamic Version)
     * @param {object} reference - Parameter reference data
     * @param {string} identifier - Parameter identifier
     * @returns {object} Parsed parameter object
     */
    parseParameter(reference, identifier) {
        try {
            // Dynamic type detection and normalization
            const detectedType = this.detectParameterType(reference);

            // Extract all possible metadata dynamically
            const metadata = this.extractParameterMetadata(reference);

            return {
                key: identifier,
                name: metadata.name || identifier,
                type: detectedType,
                description: metadata.description || '',
                required: metadata.required || false,
                deprecated: metadata.deprecated || false,
                platforms: metadata.platforms || [],
                url: metadata.url || '',
                enumValues: metadata.enumValues || [],
                defaultValue: metadata.defaultValue,
                constraints: metadata.constraints || {},
                rawData: reference // Keep original data for future extensibility
            };
        } catch (error) {
            console.error(`Error parsing parameter ${identifier}:`, error);
            return {
                key: identifier,
                name: identifier,
                type: 'string',
                description: 'Error parsing parameter',
                required: false,
                deprecated: false,
                platforms: [],
                url: '',
                enumValues: [],
                constraints: {},
                rawData: reference
            };
        }
    }

    /**
     * Dynamically detect parameter type from reference data
     * @param {object} reference - Parameter reference data
     * @returns {string} Detected parameter type
     */
    detectParameterType(reference) {
        // Check multiple possible type fields
        const typeFields = [
            reference.type,
            reference.dataType,
            reference.parameterType,
            reference.valueType
        ];

        // Find the first non-null type
        let detectedType = typeFields.find(type => type && typeof type === 'string');

        // Apple-specific: Extract type from fragments
        if (!detectedType && reference.fragments && Array.isArray(reference.fragments)) {
            const typeFragment = reference.fragments.find(fragment =>
                fragment.kind === 'text' &&
                (fragment.text.includes('string') ||
                 fragment.text.includes('boolean') ||
                 fragment.text.includes('number') ||
                 fragment.text.includes('integer') ||
                 fragment.text.includes('array') ||
                 fragment.text.includes('object') ||
                 fragment.text.includes('dictionary'))
            );
            if (typeFragment) {
                detectedType = typeFragment.text.trim();
            }
        }

        // If no explicit type, infer from other properties
        if (!detectedType) {
            if (reference.possibleValues || reference.allowedValues || reference.enumValues) {
                detectedType = 'enum';
            } else if (reference.defaultValue !== undefined) {
                detectedType = typeof reference.defaultValue;
            } else if (reference.minimum !== undefined || reference.maximum !== undefined) {
                detectedType = 'number';
            } else {
                detectedType = 'string'; // Default fallback
            }
        }

        return this.normalizeType(detectedType);
    }

    /**
     * Extract all metadata from parameter reference
     * @param {object} reference - Parameter reference data
     * @returns {object} Extracted metadata
     */
    extractParameterMetadata(reference) {
        const metadata = {};

        // Name extraction (multiple possible fields)
        metadata.name = reference.title ||
                       reference.displayName ||
                       reference.name ||
                       reference.label;

        // Description extraction (handle Apple's abstract array structure)
        if (reference.abstract && Array.isArray(reference.abstract)) {
            metadata.description = reference.abstract
                .map(item => item.text || item.inlineContent?.map(inline => inline.text).join('') || '')
                .join(' ')
                .trim();
        } else {
            metadata.description = reference.abstract ||
                                  reference.description ||
                                  reference.summary ||
                                  reference.help;
        }

        // Required status
        metadata.required = reference.required ||
                           reference.isRequired ||
                           reference.mandatory ||
                           false;

        // Deprecated status
        metadata.deprecated = reference.deprecated ||
                             reference.isDeprecated ||
                             reference.obsolete ||
                             false;

        // Platform support
        metadata.platforms = reference.platforms ||
                            reference.supportedPlatforms ||
                            reference.compatibility ||
                            [];

        // Documentation URL
        metadata.url = reference.url ||
                      reference.documentationUrl ||
                      reference.helpUrl ||
                      reference.link;

        // Enum values
        metadata.enumValues = reference.possibleValues ||
                             reference.allowedValues ||
                             reference.enumValues ||
                             reference.options ||
                             [];

        // Default value
        metadata.defaultValue = reference.defaultValue ||
                               reference.default ||
                               reference.initialValue;

        // Constraints (comprehensive extraction)
        metadata.constraints = this.extractConstraints(reference);

        return metadata;
    }

    /**
     * Extract validation constraints from reference data
     * @param {object} reference - Parameter reference data
     * @returns {object} Extracted constraints
     */
    extractConstraints(reference) {
        const constraints = {};

        // Direct constraint fields
        if (reference.constraints && typeof reference.constraints === 'object') {
            Object.assign(constraints, reference.constraints);
        }

        // Individual constraint fields
        const constraintMappings = {
            minLength: ['minLength', 'minimumLength', 'minLen'],
            maxLength: ['maxLength', 'maximumLength', 'maxLen'],
            minimum: ['minimum', 'min', 'minValue'],
            maximum: ['maximum', 'max', 'maxValue'],
            pattern: ['pattern', 'regex', 'regexp', 'format'],
            minItems: ['minItems', 'minCount', 'minimumItems'],
            maxItems: ['maxItems', 'maxCount', 'maximumItems']
        };

        Object.keys(constraintMappings).forEach(constraintKey => {
            const possibleFields = constraintMappings[constraintKey];
            for (const field of possibleFields) {
                if (reference[field] !== undefined) {
                    constraints[constraintKey] = reference[field];
                    break;
                }
            }
        });

        return constraints;
    }

    /**
     * Normalize parameter type to standard format (Enhanced Dynamic Version)
     * @param {string} type - Original type string
     * @returns {string} Normalized type
     */
    normalizeType(type) {
        if (!type) return 'string';

        // Convert to string and normalize case
        const typeStr = String(type).trim();

        // Comprehensive type mapping for maximum compatibility
        const typeMap = {
            // Apple MDM standard types
            'String': 'string',
            'Boolean': 'boolean',
            'Number': 'number',
            'Integer': 'integer',
            'Array': 'array',
            'Dictionary': 'object',
            'Date': 'date',
            'Data': 'data',

            // Alternative naming conventions
            'Text': 'string',
            'Bool': 'boolean',
            'Int': 'integer',
            'Float': 'number',
            'Double': 'number',
            'Real': 'number',
            'List': 'array',
            'Object': 'object',
            'Map': 'object',
            'DateTime': 'date',
            'Timestamp': 'date',
            'Binary': 'data',
            'Blob': 'data',

            // Enumeration types
            'Enum': 'enum',
            'Enumeration': 'enum',
            'Choice': 'enum',
            'Select': 'enum',
            'Options': 'enum',

            // Future/unknown types - map to closest equivalent
            'NewType': 'string',
            'ComplexObject': 'object',
            'FutureType': 'string',
            'UnknownType': 'string'
        };

        // Try exact match first
        if (typeMap[typeStr]) {
            return typeMap[typeStr];
        }

        // Try case-insensitive match
        const lowerType = typeStr.toLowerCase();
        const matchingKey = Object.keys(typeMap).find(key =>
            key.toLowerCase() === lowerType
        );

        if (matchingKey) {
            return typeMap[matchingKey];
        }

        // Pattern-based matching for complex types
        if (lowerType.includes('string') || lowerType.includes('text')) {
            return 'string';
        } else if (lowerType.includes('bool')) {
            return 'boolean';
        } else if (lowerType.includes('int') || lowerType.includes('number')) {
            return lowerType.includes('int') ? 'integer' : 'number';
        } else if (lowerType.includes('array') || lowerType.includes('list')) {
            return 'array';
        } else if (lowerType.includes('object') || lowerType.includes('dict')) {
            return 'object';
        } else if (lowerType.includes('date') || lowerType.includes('time')) {
            return 'date';
        } else if (lowerType.includes('enum') || lowerType.includes('choice')) {
            return 'enum';
        }

        // Default fallback - use lowercase version
        return lowerType || 'string';
    }

    /**
     * Normalize section identifier for API endpoint
     * @param {string} identifier - Original identifier
     * @returns {string} Normalized identifier for API
     */
    normalizeIdentifierForAPI(identifier) {
        if (!identifier || typeof identifier !== 'string') {
            return 'unknown';
        }

        // Known Apple MDM section mappings
        const knownSections = {
            'toplevel': 'toplevel',
            'top level': 'toplevel',
            'top-level': 'toplevel',
            'wifi': 'wifi',
            'vpn': 'vpn',
            'email': 'email',
            'mail': 'email',
            'restrictions': 'restrictions',
            'passcode': 'passcode',
            'security': 'security',
            'certificates': 'certificates',
            'calendar': 'calendar',
            'contacts': 'contacts',
            'accounts': 'accounts',
            'network': 'network',
            'device': 'device',
            'apps': 'apps',
            'application': 'apps'
        };

        // Convert to lowercase for comparison
        const lowerIdentifier = identifier.toLowerCase();

        // Check for exact matches first
        if (knownSections[lowerIdentifier]) {
            return knownSections[lowerIdentifier];
        }

        // Check for partial matches
        for (const [key, value] of Object.entries(knownSections)) {
            if (lowerIdentifier.includes(key)) {
                return value;
            }
        }

        // If no match found, clean up the identifier
        // Remove common prefixes/suffixes and special characters
        let cleanIdentifier = lowerIdentifier
            .replace(/^(section|config|configuration|payload)[-_]?/i, '')
            .replace(/[-_]?(section|config|configuration|payload)$/i, '')
            .replace(/[^a-z0-9]/g, '')
            .toLowerCase();

        // If it's still a generated timestamp-like identifier, use a fallback
        if (/^(unknown|section|invalid)/.test(cleanIdentifier) || /^\d+$/.test(cleanIdentifier)) {
            return 'unknown';
        }

        return cleanIdentifier || 'unknown';
    }

    /**
     * Load all data (main spec and sections)
     * @param {boolean} forceRefresh - Force refresh from server
     * @returns {Promise<object>} Complete data structure
     */
    async loadAllData(forceRefresh = false) {
        if (this.isLoading && this.loadPromise) {
            progressService.log('Data loading already in progress, waiting...', 'info');
            return this.loadPromise;
        }

        this.isLoading = true;
        const startTime = Date.now();

        this.loadPromise = (async () => {
            try {
                progressService.updateStatus('Loading main specification...');

                // Load main specification
                const mainSpec = await this.loadMainSpec(forceRefresh);

                progressService.updateStatus('Parsing sections from specification...');

                // Parse sections from main spec
                const sections = this.parseSections(mainSpec);
                progressService.logParsingProgress('sections', sections.length);

                if (sections.length === 0) {
                    throw new Error('No sections found in specification');
                }

                progressService.updateStatus(`Loading ${sections.length} section configurations...`);

                // Load section data in parallel (with concurrency limit)
                const sectionPromises = sections.map(section =>
                    this.loadSectionData(section.identifier, forceRefresh)
                        .then(data => {
                            const parameters = this.parseParameters(data, section.identifier);
                            return {
                                ...section,
                                parameters,
                                rawData: data
                            };
                        })
                        .catch(error => {
                            progressService.logSectionProgress(section.identifier, 'error', { error: error.message });
                            return {
                                ...section,
                                parameters: [],
                                rawData: null,
                                error: error.message
                            };
                        })
                );

                // Process sections in batches to avoid overwhelming the server
                const batchSize = 5;
                const sectionsWithData = [];
                let processedCount = 0;

                progressService.log(`Processing ${sections.length} sections in batches of ${batchSize}...`, 'info');

                for (let i = 0; i < sectionPromises.length; i += batchSize) {
                    const batch = sectionPromises.slice(i, i + batchSize);
                    const batchNumber = Math.floor(i / batchSize) + 1;
                    const totalBatches = Math.ceil(sectionPromises.length / batchSize);

                    progressService.updateStatus(`Processing batch ${batchNumber}/${totalBatches}...`);
                    progressService.log(`Starting batch ${batchNumber}/${totalBatches} (${batch.length} sections)`, 'info');

                    const batchResults = await Promise.all(batch);
                    sectionsWithData.push(...batchResults);
                    processedCount += batchResults.length;

                    progressService.log(`Completed batch ${batchNumber}/${totalBatches} (${processedCount}/${sections.length} total)`, 'success');

                    // Small delay between batches
                    if (i + batchSize < sectionPromises.length) {
                        await new Promise(resolve => setTimeout(resolve, 100));
                    }
                }

                progressService.updateStatus('Finalizing data structure...');

                const result = {
                    mainSpec,
                    sections: sectionsWithData,
                    loadedAt: new Date().toISOString(),
                    totalSections: sectionsWithData.length,
                    totalParameters: sectionsWithData.reduce((sum, section) => sum + section.parameters.length, 0),
                    fromCache: !forceRefresh && cacheService.has(CACHE_CONFIG.MAIN_SPEC_KEY)
                };

                const loadTime = Date.now() - startTime;
                const errors = sectionsWithData.filter(s => s.error).map(s => s.error);

                progressService.logCompletion({
                    totalSections: result.totalSections,
                    totalParameters: result.totalParameters,
                    loadTime,
                    fromCache: result.fromCache,
                    errors
                });

                return result;

            } catch (error) {
                progressService.log(`Failed to load all data: ${error.message}`, 'error');
                throw error;
            } finally {
                this.isLoading = false;
                this.loadPromise = null;
            }
        })();

        return this.loadPromise;
    }

    /**
     * Get cached data if available
     * @returns {object|null} Cached data or null
     */
    getCachedData() {
        const mainSpec = cacheService.get(CACHE_CONFIG.MAIN_SPEC_KEY);
        if (!mainSpec) return null;

        const sections = this.parseSections(mainSpec);
        const sectionsWithData = [];

        for (const section of sections) {
            const sectionData = cacheService.get(`${CACHE_CONFIG.SECTION_KEY_PREFIX}${section.identifier}`);
            if (sectionData) {
                sectionsWithData.push({
                    ...section,
                    parameters: this.parseParameters(sectionData, section.identifier),
                    rawData: sectionData
                });
            }
        }

        if (sectionsWithData.length === 0) return null;

        return {
            mainSpec,
            sections: sectionsWithData,
            loadedAt: new Date(cacheService.getLastUpdate()).toISOString(),
            totalSections: sectionsWithData.length,
            totalParameters: sectionsWithData.reduce((sum, section) => sum + section.parameters.length, 0),
            fromCache: true
        };
    }

    /**
     * Check if data needs refresh
     * @returns {boolean} True if refresh is needed
     */
    needsRefresh() {
        return cacheService.needsRefresh();
    }

    /**
     * Clear all cached data
     * @returns {boolean} Success status
     */
    clearCache() {
        this.mainSpec = null;
        this.sectionData.clear();
        return cacheService.clear();
    }
}

// Create and export singleton instance
export const dataService = new DataService();
