/**
 * Unit Tests for CacheFileService
 * Tests cache file reading and management functionality
 */

import { jest } from '@jest/globals';

// Mock fetch
global.fetch = jest.fn();

// Mock configService
const mockConfigService = {
    isDebugMode: jest.fn(() => false),
    get: jest.fn()
};

jest.mock('../../js/services/configService.js', () => ({
    configService: mockConfigService
}));

// Mock progressService
const mockProgressService = {
    log: jest.fn(),
    logCacheOperation: jest.fn()
};

jest.mock('../../js/services/progressService.js', () => ({
    progressService: mockProgressService
}));

describe('CacheFileService', () => {
    let cacheFileService;

    beforeEach(async () => {
        jest.clearAllMocks();
        fetch.mockClear();
        
        // Clear module cache and reimport
        jest.resetModules();
        const module = await import('../../js/services/cacheFileService.js');
        cacheFileService = module.cacheFileService;
    });

    describe('Manifest Loading', () => {
        test('should load manifest successfully', async () => {
            const mockManifest = {
                generated_at: '2024-01-01T02:00:00.000Z',
                total_files: 2,
                files: {
                    'accounts.json': {
                        size: 12345,
                        modified: '2024-01-01T02:00:00.000Z',
                        checksum: 'abc123'
                    },
                    'wifi.json': {
                        size: 67890,
                        modified: '2024-01-01T02:00:00.000Z',
                        checksum: 'def456'
                    }
                }
            };

            fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockManifest)
            });

            const manifest = await cacheFileService.loadManifest();
            
            expect(fetch).toHaveBeenCalledWith('cache/manifest.json');
            expect(manifest).toEqual(mockManifest);
            expect(cacheFileService.getManifest()).toEqual(mockManifest);
        });

        test('should handle manifest not found', async () => {
            fetch.mockResolvedValueOnce({
                ok: false,
                status: 404
            });

            const manifest = await cacheFileService.loadManifest();
            
            expect(manifest).toBeNull();
            expect(cacheFileService.getManifest()).toBeNull();
        });

        test('should handle manifest fetch error', async () => {
            fetch.mockRejectedValueOnce(new Error('Network error'));

            const manifest = await cacheFileService.loadManifest();
            
            expect(manifest).toBeNull();
        });
    });

    describe('File Operations', () => {
        beforeEach(async () => {
            // Setup manifest
            const mockManifest = {
                generated_at: '2024-01-01T02:00:00.000Z',
                total_files: 2,
                files: {
                    'accounts.json': {
                        size: 12345,
                        modified: '2024-01-01T02:00:00.000Z',
                        checksum: 'abc123'
                    },
                    'wifi.json': {
                        size: 67890,
                        modified: '2024-01-01T02:00:00.000Z',
                        checksum: 'def456'
                    }
                }
            };

            fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockManifest)
            });

            await cacheFileService.loadManifest();
            fetch.mockClear();
        });

        test('should check if file exists in manifest', () => {
            expect(cacheFileService.hasFile('accounts.json')).toBe(true);
            expect(cacheFileService.hasFile('wifi.json')).toBe(true);
            expect(cacheFileService.hasFile('nonexistent.json')).toBe(false);
        });

        test('should get file metadata', () => {
            const metadata = cacheFileService.getFileMetadata('accounts.json');
            
            expect(metadata).toEqual({
                size: 12345,
                modified: '2024-01-01T02:00:00.000Z',
                checksum: 'abc123'
            });
        });

        test('should load file successfully', async () => {
            const mockFileData = {
                references: {
                    'doc://test': {
                        title: 'Test Section',
                        type: 'topic'
                    }
                }
            };

            fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockFileData)
            });

            const data = await cacheFileService.loadFile('accounts.json');
            
            expect(fetch).toHaveBeenCalledWith('cache/accounts.json');
            expect(data).toEqual(mockFileData);
        });

        test('should handle file not found', async () => {
            fetch.mockResolvedValueOnce({
                ok: false,
                status: 404
            });

            const data = await cacheFileService.loadFile('nonexistent.json');
            
            expect(data).toBeNull();
        });

        test('should cache loaded files in memory', async () => {
            const mockFileData = { test: 'data' };

            fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockFileData)
            });

            // First load
            const data1 = await cacheFileService.loadFile('test.json');
            expect(fetch).toHaveBeenCalledTimes(1);
            
            // Second load should use memory cache
            const data2 = await cacheFileService.loadFile('test.json');
            expect(fetch).toHaveBeenCalledTimes(1); // No additional fetch
            expect(data2).toEqual(mockFileData);
        });
    });

    describe('Specialized Loading Methods', () => {
        test('should load main specification', async () => {
            const mockMainSpec = { schemaVersion: '1.0' };

            fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockMainSpec)
            });

            const data = await cacheFileService.loadMainSpec();
            
            expect(fetch).toHaveBeenCalledWith('cache/profile-specific-payload-keys.json');
            expect(data).toEqual(mockMainSpec);
        });

        test('should load section with .json extension', async () => {
            const mockSectionData = { test: 'section' };

            fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockSectionData)
            });

            const data = await cacheFileService.loadSection('accounts.json');
            
            expect(fetch).toHaveBeenCalledWith('cache/accounts.json');
            expect(data).toEqual(mockSectionData);
        });

        test('should load section without .json extension', async () => {
            const mockSectionData = { test: 'section' };

            fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockSectionData)
            });

            const data = await cacheFileService.loadSection('accounts');
            
            expect(fetch).toHaveBeenCalledWith('cache/accounts.json');
            expect(data).toEqual(mockSectionData);
        });
    });

    describe('Cache Management', () => {
        test('should get available files from manifest', async () => {
            const mockManifest = {
                files: {
                    'accounts.json': {},
                    'wifi.json': {},
                    'vpn.json': {}
                }
            };

            fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockManifest)
            });

            await cacheFileService.loadManifest();
            const files = await cacheFileService.getAvailableFiles();
            
            expect(files).toEqual(['accounts.json', 'wifi.json', 'vpn.json']);
        });

        test('should check cache freshness', async () => {
            const recentTime = new Date(Date.now() - 1000 * 60 * 60).toISOString(); // 1 hour ago
            const oldTime = new Date(Date.now() - 1000 * 60 * 60 * 25).toISOString(); // 25 hours ago

            const mockManifest = {
                generated_at: recentTime
            };

            fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockManifest)
            });

            await cacheFileService.loadManifest();
            
            expect(cacheFileService.isCacheFresh()).toBe(true);
            
            // Test with old timestamp
            cacheFileService.manifest.generated_at = oldTime;
            expect(cacheFileService.isCacheFresh()).toBe(false);
        });

        test('should get cache statistics', async () => {
            const mockManifest = {
                generated_at: '2024-01-01T02:00:00.000Z',
                total_files: 3
            };

            fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockManifest)
            });

            await cacheFileService.loadManifest();
            
            const stats = cacheFileService.getCacheStats();
            
            expect(stats.manifestLoaded).toBe(true);
            expect(stats.totalFiles).toBe(3);
            expect(stats.generatedAt).toBe('2024-01-01T02:00:00.000Z');
        });

        test('should clear memory cache', () => {
            cacheFileService.loadedFiles.set('test.json', { test: 'data' });
            expect(cacheFileService.loadedFiles.size).toBe(1);
            
            cacheFileService.clearMemoryCache();
            expect(cacheFileService.loadedFiles.size).toBe(0);
        });

        test('should preload common files', async () => {
            const mockData = { test: 'data' };

            // Mock successful responses for common files
            fetch
                .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockData) })
                .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockData) })
                .mockResolvedValueOnce({ ok: false, status: 404 })
                .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(mockData) });

            const preloaded = await cacheFileService.preloadCommonFiles();
            
            expect(preloaded).toBe(3); // 3 successful loads out of 4 attempts
        });
    });

    describe('Initialization', () => {
        test('should initialize successfully', async () => {
            const mockManifest = {
                generated_at: '2024-01-01T02:00:00.000Z',
                total_files: 1
            };

            fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockManifest)
            });

            const result = await cacheFileService.initialize();
            
            expect(result).toBe(true);
            expect(cacheFileService.getManifest()).toEqual(mockManifest);
        });

        test('should handle initialization failure', async () => {
            fetch.mockRejectedValueOnce(new Error('Network error'));

            const result = await cacheFileService.initialize();
            
            expect(result).toBe(false);
        });
    });

    describe('Debug Mode', () => {
        test('should log debug information when debug mode is enabled', async () => {
            mockConfigService.isDebugMode.mockReturnValue(true);
            
            const mockData = { test: 'data' };
            fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockData)
            });

            await cacheFileService.loadFile('test.json');
            
            expect(mockProgressService.log).toHaveBeenCalledWith(
                expect.stringContaining('Loading cache file'),
                expect.any(String)
            );
        });
    });
});
