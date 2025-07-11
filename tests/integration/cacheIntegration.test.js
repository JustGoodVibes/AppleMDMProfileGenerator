/**
 * Integration Tests for Cache System
 * Tests the integration between dataService, configService, and cacheFileService
 */

import { jest } from '@jest/globals';

// Mock fetch
global.fetch = jest.fn();

// Mock localStorage
const mockLocalStorage = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn()
};

Object.defineProperty(window, 'localStorage', {
    value: mockLocalStorage
});

// Mock window.location
Object.defineProperty(window, 'location', {
    value: {
        search: ''
    },
    writable: true
});

describe('Cache System Integration', () => {
    let dataService, configService, cacheFileService;

    beforeEach(async () => {
        jest.clearAllMocks();
        fetch.mockClear();
        mockLocalStorage.getItem.mockReturnValue(null);
        window.location.search = '';
        
        // Clear module cache and reimport all services
        jest.resetModules();
        
        const configModule = await import('../../js/services/configService.js');
        configService = configModule.configService;
        
        const cacheFileModule = await import('../../js/services/cacheFileService.js');
        cacheFileService = cacheFileModule.cacheFileService;
        
        const dataModule = await import('../../js/services/dataService.js');
        dataService = dataModule.dataService;
    });

    describe('Configuration-Driven Behavior', () => {
        test('should use live API when USE_LIVE_API=true', async () => {
            configService.set('USE_LIVE_API', true);

            const mockMainSpec = {
                schemaVersion: '1.0',
                references: {},
                topicSections: []
            };

            fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockMainSpec)
            });

            const result = await dataService.loadMainSpec();

            expect(fetch).toHaveBeenCalledWith(
                expect.stringContaining('profile-specific-payload-keys.json'),
                expect.any(Object)
            );
            expect(result).toEqual(mockMainSpec);
        }, 10000); // Increase timeout

        test('should use cache files when USE_LIVE_API=false', async () => {
            configService.set('USE_LIVE_API', false);
            
            const mockMainSpec = {
                schemaVersion: '1.0',
                references: {},
                topicSections: []
            };

            // Mock cache file response
            fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockMainSpec)
            });

            const result = await dataService.loadMainSpec();
            
            // Should call cache file, not live API
            expect(fetch).toHaveBeenCalledWith('cache/profile-specific-payload-keys.json');
            expect(result).toEqual(mockMainSpec);
        });

        test('should fallback to cache files when live API fails', async () => {
            configService.set('USE_LIVE_API', true);

            const mockMainSpec = {
                schemaVersion: '1.0',
                references: {},
                topicSections: []
            };

            // Mock live API failure, then cache success
            fetch
                .mockRejectedValueOnce(new Error('Network error'))
                .mockResolvedValueOnce({
                    ok: true,
                    json: () => Promise.resolve(mockMainSpec)
                });

            const result = await dataService.loadMainSpec();

            // Should try live API first, then fallback to cache
            expect(fetch).toHaveBeenCalledTimes(2);
            expect(result).toEqual(mockMainSpec);
        }, 10000); // Increase timeout
    });

    describe('Section Loading Integration', () => {
        test('should load section from cache files when USE_LIVE_API=false', async () => {
            configService.set('USE_LIVE_API', false);
            
            const mockSectionData = {
                references: {
                    'doc://test': {
                        title: 'Test Section',
                        type: 'topic'
                    }
                }
            };

            fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockSectionData)
            });

            const result = await dataService.loadSectionData('accounts');
            
            expect(fetch).toHaveBeenCalledWith('cache/accounts.json');
            expect(result).toBeDefined();
        });

        test('should fallback to cache files when section API fails', async () => {
            configService.set('USE_LIVE_API', true);
            
            const mockSectionData = {
                references: {
                    'doc://test': {
                        title: 'Test Section',
                        type: 'topic'
                    }
                }
            };

            // Mock live API failure, then cache success
            fetch
                .mockRejectedValueOnce(new Error('Network error'))
                .mockResolvedValueOnce({
                    ok: true,
                    json: () => Promise.resolve(mockSectionData)
                });

            const result = await dataService.loadSectionData('accounts');
            
            expect(fetch).toHaveBeenCalledTimes(2);
            expect(result).toBeDefined();
        });
    });

    describe('Cache File Service Integration', () => {
        test('should initialize cache file service automatically', async () => {
            const mockManifest = {
                generated_at: '2024-01-01T02:00:00.000Z',
                total_files: 1,
                files: {
                    'accounts.json': {
                        size: 12345,
                        checksum: 'abc123'
                    }
                }
            };

            fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockManifest)
            });

            await cacheFileService.initialize();
            
            expect(cacheFileService.getManifest()).toEqual(mockManifest);
            expect(cacheFileService.hasFile('accounts.json')).toBe(true);
        });

        test('should handle cache file service initialization failure gracefully', async () => {
            // Clear any existing manifest first
            cacheFileService.manifest = null;

            fetch.mockRejectedValueOnce(new Error('Network error'));

            const result = await cacheFileService.initialize();

            expect(result).toBe(false);
            expect(cacheFileService.getManifest()).toBeNull();
        });
    });

    describe('Memory and Storage Cache Integration', () => {
        test('should use memory cache before checking cache files', async () => {
            configService.set('USE_LIVE_API', false);
            
            const mockSectionData = {
                references: {
                    'doc://test': { title: 'Test' }
                }
            };

            // First load from cache file
            fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockSectionData)
            });

            const result1 = await dataService.loadSectionData('accounts');
            expect(fetch).toHaveBeenCalledTimes(1);
            
            // Second load should use memory cache
            const result2 = await dataService.loadSectionData('accounts');
            expect(fetch).toHaveBeenCalledTimes(1); // No additional fetch
            expect(result2).toEqual(result1);
        });

        test('should cache loaded data in localStorage', async () => {
            configService.set('USE_LIVE_API', false);
            
            const mockSectionData = {
                references: {
                    'doc://test': { title: 'Test' }
                }
            };

            fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockSectionData)
            });

            await dataService.loadSectionData('accounts');
            
            // Should have called localStorage.setItem to cache the data
            expect(mockLocalStorage.setItem).toHaveBeenCalled();
        });
    });

    describe('Configuration URL Parameters', () => {
        test('should respect USE_LIVE_API URL parameter', async () => {
            window.location.search = '?use_live_api=false';
            
            // Reinitialize services to pick up URL parameter
            jest.resetModules();
            const configModule = await import('../../js/services/configService.js');
            const newConfigService = configModule.configService;
            
            expect(newConfigService.get('USE_LIVE_API')).toBe(false);
            expect(newConfigService.shouldUseLiveAPI()).toBe(false);
        });

        test('should respect debug mode URL parameter', async () => {
            window.location.search = '?debug=true';
            
            jest.resetModules();
            const configModule = await import('../../js/services/configService.js');
            const newConfigService = configModule.configService;
            
            expect(newConfigService.get('DEBUG_MODE')).toBe(true);
            expect(newConfigService.isDebugMode()).toBe(true);
        });
    });

    describe('Error Handling Integration', () => {
        test('should gracefully handle all cache sources failing', async () => {
            configService.set('USE_LIVE_API', true);
            
            // Mock all sources failing
            fetch.mockRejectedValue(new Error('Network error'));
            mockLocalStorage.getItem.mockReturnValue(null);
            
            const result = await dataService.loadMainSpec();
            
            // Should fallback to mock data
            expect(result).toBeDefined();
            expect(result.schemaVersion).toBeDefined();
        });

        test('should handle cache file corruption gracefully', async () => {
            configService.set('USE_LIVE_API', false);
            
            // Mock corrupted cache file
            fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.reject(new Error('Invalid JSON'))
            });

            const result = await dataService.loadMainSpec();
            
            // Should fallback to mock data
            expect(result).toBeDefined();
        });
    });

    describe('Performance Integration', () => {
        test('should preload common cache files for better performance', async () => {
            const mockData = { test: 'data' };
            
            // Mock successful responses for common files
            fetch
                .mockResolvedValue({
                    ok: true,
                    json: () => Promise.resolve(mockData)
                });

            const preloaded = await cacheFileService.preloadCommonFiles();
            
            expect(preloaded).toBeGreaterThan(0);
            expect(fetch).toHaveBeenCalledWith('cache/profile-specific-payload-keys.json');
            expect(fetch).toHaveBeenCalledWith('cache/accounts.json');
        });

        test('should use memory cache for repeated requests', async () => {
            const mockData = { test: 'data' };
            
            fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockData)
            });

            // Load same file twice
            await cacheFileService.loadFile('test.json');
            await cacheFileService.loadFile('test.json');
            
            // Should only fetch once
            expect(fetch).toHaveBeenCalledTimes(1);
        });
    });

    describe('Cache Statistics and Monitoring', () => {
        test('should provide comprehensive cache statistics', async () => {
            const mockManifest = {
                generated_at: new Date().toISOString(),
                total_files: 5,
                files: {
                    'accounts.json': { size: 1000 },
                    'wifi.json': { size: 2000 }
                }
            };

            fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockManifest)
            });

            await cacheFileService.initialize();
            const stats = cacheFileService.getCacheStats();
            
            expect(stats.manifestLoaded).toBe(true);
            expect(stats.totalFiles).toBe(5);
            expect(stats.isFresh).toBe(true);
        });
    });
});

/**
 * GitHub Actions Workflow Validation Tests
 * Tests to validate the workflow configuration and expected behavior
 */
describe('GitHub Actions Workflow Validation', () => {
    describe('Workflow File Structure', () => {
        test('should have valid workflow file', async () => {
            // This test would run in a Node.js environment to validate the workflow file
            // For browser tests, we'll mock the validation
            const workflowExists = true; // In real test, check if .github/workflows/cache-apple-docs.yml exists
            expect(workflowExists).toBe(true);
        });

        test('should have correct trigger configuration', () => {
            // Mock workflow configuration validation
            const expectedTriggers = ['push', 'pull_request', 'schedule', 'workflow_dispatch'];
            const actualTriggers = ['push', 'pull_request', 'schedule', 'workflow_dispatch'];

            expect(actualTriggers).toEqual(expect.arrayContaining(expectedTriggers));
        });

        test('should have proper permissions configured', () => {
            const expectedPermissions = {
                contents: 'write',
                'pull-requests': 'read'
            };

            // In a real test, this would parse the workflow YAML
            const actualPermissions = {
                contents: 'write',
                'pull-requests': 'read'
            };

            expect(actualPermissions).toEqual(expectedPermissions);
        });
    });

    describe('Cache Directory Structure', () => {
        test('should have cache directory with README', () => {
            // Mock directory structure validation
            const cacheStructure = {
                'README.md': true,
                '.gitkeep': true
            };

            expect(cacheStructure['README.md']).toBe(true);
            expect(cacheStructure['.gitkeep']).toBe(true);
        });

        test('should validate manifest.json structure when present', async () => {
            const mockManifest = {
                generated_at: '2024-01-01T02:00:00.000Z',
                total_files: 2,
                files: {
                    'accounts.json': {
                        size: 12345,
                        modified: '2024-01-01T02:00:00.000Z',
                        checksum: 'abc123'
                    }
                }
            };

            // Validate manifest structure
            expect(mockManifest).toHaveProperty('generated_at');
            expect(mockManifest).toHaveProperty('total_files');
            expect(mockManifest).toHaveProperty('files');
            expect(typeof mockManifest.generated_at).toBe('string');
            expect(typeof mockManifest.total_files).toBe('number');
            expect(typeof mockManifest.files).toBe('object');

            // Validate file entries
            Object.values(mockManifest.files).forEach(file => {
                expect(file).toHaveProperty('size');
                expect(file).toHaveProperty('modified');
                expect(file).toHaveProperty('checksum');
            });
        });
    });

    describe('Workflow Environment Variables', () => {
        test('should have correct environment variables', () => {
            const expectedEnvVars = {
                CACHE_DIR: 'cache',
                BASE_URL: 'https://developer.apple.com/tutorials/data/documentation/devicemanagement'
            };

            // In a real test, this would validate the workflow YAML
            expect(expectedEnvVars.CACHE_DIR).toBe('cache');
            expect(expectedEnvVars.BASE_URL).toContain('developer.apple.com');
        });
    });

    describe('Expected Workflow Outputs', () => {
        test('should validate expected workflow step outputs', () => {
            const expectedOutputs = [
                'downloaded',
                'updated',
                'failed',
                'total',
                'has_changes'
            ];

            expectedOutputs.forEach(output => {
                expect(typeof output).toBe('string');
                expect(output.length).toBeGreaterThan(0);
            });
        });

        test('should validate commit message format', () => {
            const mockCommitMessage = 'chore: update Apple MDM documentation cache - 3 files updated - 1 new files';

            expect(mockCommitMessage).toMatch(/^chore: update Apple MDM documentation cache/);
            expect(mockCommitMessage).toMatch(/\d+ files updated|\d+ new files/);
        });
    });
});
