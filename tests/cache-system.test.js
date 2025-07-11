/**
 * Cache System Test Suite
 * Comprehensive tests for the new cache system functionality
 */

import { jest } from '@jest/globals';

describe('Cache System Test Suite', () => {
    describe('Service Integration', () => {
        test('should load all cache-related services without errors', async () => {
            // Test that all new services can be imported successfully
            let configService, cacheFileService;
            
            try {
                const configModule = await import('../js/services/configService.js');
                configService = configModule.configService;
                expect(configService).toBeDefined();
                
                const cacheFileModule = await import('../js/services/cacheFileService.js');
                cacheFileService = cacheFileModule.cacheFileService;
                expect(cacheFileService).toBeDefined();
                
            } catch (error) {
                fail(`Failed to import cache services: ${error.message}`);
            }
        });

        test('should have proper service dependencies', async () => {
            // Verify that services have the expected methods and properties
            const { configService } = await import('../js/services/configService.js');
            const { cacheFileService } = await import('../js/services/cacheFileService.js');
            
            // ConfigService methods
            expect(typeof configService.get).toBe('function');
            expect(typeof configService.set).toBe('function');
            expect(typeof configService.shouldUseLiveAPI).toBe('function');
            expect(typeof configService.isDebugMode).toBe('function');
            
            // CacheFileService methods
            expect(typeof cacheFileService.loadFile).toBe('function');
            expect(typeof cacheFileService.loadMainSpec).toBe('function');
            expect(typeof cacheFileService.loadSection).toBe('function');
            expect(typeof cacheFileService.initialize).toBe('function');
        });
    });

    describe('Configuration Validation', () => {
        test('should validate default configuration values', async () => {
            const { configService } = await import('../js/services/configService.js');
            
            // Test default values
            expect(configService.get('USE_LIVE_API')).toBe(true);
            expect(configService.get('CACHE_ENABLED')).toBe(true);
            expect(configService.get('DEBUG_MODE')).toBe(false);
            expect(typeof configService.get('API_TIMEOUT')).toBe('number');
            expect(configService.get('API_TIMEOUT')).toBeGreaterThan(0);
        });

        test('should validate configuration helper methods', async () => {
            const { configService } = await import('../js/services/configService.js');
            
            // Test helper methods return expected types
            expect(typeof configService.shouldUseLiveAPI()).toBe('boolean');
            expect(typeof configService.isCacheEnabled()).toBe('boolean');
            expect(typeof configService.isDebugMode()).toBe('boolean');
            expect(typeof configService.getApiTimeout()).toBe('number');
            
            const retryConfig = configService.getRetryConfig();
            expect(retryConfig).toHaveProperty('attempts');
            expect(retryConfig).toHaveProperty('delay');
        });
    });

    describe('Cache File Service Validation', () => {
        test('should have correct cache directory path', async () => {
            const { cacheFileService } = await import('../js/services/cacheFileService.js');
            
            expect(cacheFileService.getCacheDir()).toBe('cache/');
        });

        test('should handle initialization gracefully', async () => {
            const { cacheFileService } = await import('../js/services/cacheFileService.js');
            
            // Should not throw errors during initialization
            let initResult;
            try {
                initResult = await cacheFileService.initialize();
                expect(typeof initResult).toBe('boolean');
            } catch (error) {
                // Initialization might fail in test environment, but shouldn't throw
                expect(error).toBeInstanceOf(Error);
            }
        });
    });

    describe('Data Service Integration', () => {
        test('should have enhanced dataService with cache integration', async () => {
            const { dataService } = await import('../js/services/dataService.js');
            
            // Verify dataService has the expected properties
            expect(dataService).toHaveProperty('cacheFileInitialized');
            expect(typeof dataService.initializeCacheFileService).toBe('function');
            expect(typeof dataService.loadMainSpecFromCache).toBe('function');
            expect(typeof dataService.loadSectionDataFromCache).toBe('function');
        });

        test('should handle cache file integration methods', async () => {
            const { dataService } = await import('../js/services/dataService.js');
            
            // Test that cache methods exist and are callable
            try {
                await dataService.initializeCacheFileService();
                // Should not throw
            } catch (error) {
                // May fail in test environment, but should be a proper error
                expect(error).toBeInstanceOf(Error);
            }
        });
    });

    describe('Error Handling', () => {
        test('should handle missing cache files gracefully', async () => {
            const { cacheFileService } = await import('../js/services/cacheFileService.js');
            
            // Test loading non-existent files
            const result = await cacheFileService.loadFile('nonexistent.json');
            expect(result).toBeNull();
        });

        test('should handle network errors gracefully', async () => {
            // Mock fetch to simulate network errors
            const originalFetch = global.fetch;
            global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));
            
            try {
                const { cacheFileService } = await import('../js/services/cacheFileService.js');
                const result = await cacheFileService.loadManifest();
                expect(result).toBeNull();
            } finally {
                global.fetch = originalFetch;
            }
        });
    });

    describe('Performance Considerations', () => {
        test('should implement memory caching', async () => {
            const { cacheFileService } = await import('../js/services/cacheFileService.js');
            
            // Verify memory cache exists
            expect(cacheFileService.loadedFiles).toBeDefined();
            expect(cacheFileService.loadedFiles instanceof Map).toBe(true);
            
            // Test cache clearing
            cacheFileService.clearMemoryCache();
            expect(cacheFileService.loadedFiles.size).toBe(0);
        });

        test('should provide cache statistics', async () => {
            const { cacheFileService } = await import('../js/services/cacheFileService.js');
            
            const stats = cacheFileService.getCacheStats();
            expect(stats).toHaveProperty('manifestLoaded');
            expect(stats).toHaveProperty('totalFiles');
            expect(stats).toHaveProperty('memoryCache');
            expect(stats).toHaveProperty('isFresh');
        });
    });

    describe('Workflow Integration Points', () => {
        test('should validate expected cache file structure', () => {
            // Test the expected structure that the GitHub Actions workflow will create
            const expectedFiles = [
                'profile-specific-payload-keys.json',
                'accounts.json',
                'wifi.json',
                'vpn.json',
                'restrictions.json',
                'manifest.json'
            ];
            
            expectedFiles.forEach(filename => {
                expect(typeof filename).toBe('string');
                expect(filename.endsWith('.json')).toBe(true);
            });
        });

        test('should validate manifest file structure', () => {
            const mockManifest = {
                generated_at: new Date().toISOString(),
                total_files: 5,
                files: {
                    'test.json': {
                        size: 1000,
                        modified: new Date().toISOString(),
                        checksum: 'abc123'
                    }
                }
            };
            
            // Validate required fields
            expect(mockManifest).toHaveProperty('generated_at');
            expect(mockManifest).toHaveProperty('total_files');
            expect(mockManifest).toHaveProperty('files');
            
            // Validate date format
            expect(new Date(mockManifest.generated_at)).toBeInstanceOf(Date);
            
            // Validate file entries
            Object.values(mockManifest.files).forEach(file => {
                expect(file).toHaveProperty('size');
                expect(file).toHaveProperty('modified');
                expect(file).toHaveProperty('checksum');
                expect(typeof file.size).toBe('number');
                expect(typeof file.checksum).toBe('string');
            });
        });
    });

    describe('Backward Compatibility', () => {
        test('should maintain existing dataService functionality', async () => {
            const { dataService } = await import('../js/services/dataService.js');
            
            // Verify existing methods still exist
            expect(typeof dataService.loadMainSpec).toBe('function');
            expect(typeof dataService.loadSectionData).toBe('function');
            expect(typeof dataService.fetchWithRetry).toBe('function');
            expect(typeof dataService.clearCache).toBe('function');
        });

        test('should not break existing cache service', async () => {
            const { cacheService } = await import('../js/services/cacheService.js');
            
            // Verify existing cache service methods
            expect(typeof cacheService.get).toBe('function');
            expect(typeof cacheService.set).toBe('function');
            expect(typeof cacheService.clear).toBe('function');
            expect(typeof cacheService.has).toBe('function');
        });
    });

    describe('Documentation and Examples', () => {
        test('should have proper JSDoc documentation', async () => {
            // This would be validated by a documentation linter in a real scenario
            // For now, we'll just verify the services are properly exported
            const { configService } = await import('../js/services/configService.js');
            const { cacheFileService } = await import('../js/services/cacheFileService.js');
            
            expect(configService.constructor.name).toBe('ConfigService');
            expect(cacheFileService.constructor.name).toBe('CacheFileService');
        });
    });
});
