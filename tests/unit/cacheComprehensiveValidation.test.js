/**
 * Comprehensive Cache Validation Tests
 * Tests all 130 JSON files in the cache/ directory for integrity and functionality
 */

import { jest } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// Mock services
const mockConfigService = {
    isDebugMode: jest.fn(() => false),
    shouldUseLiveAPI: jest.fn(() => false),
    isCacheFirstMode: jest.fn(() => true)
};

const mockProgressService = {
    log: jest.fn(),
    logCacheOperation: jest.fn()
};

jest.mock('../../js/services/configService.js', () => ({
    configService: mockConfigService
}));

jest.mock('../../js/services/progressService.js', () => ({
    progressService: mockProgressService
}));

describe('Comprehensive Cache Validation', () => {
    let cacheFileService;
    let dataService;
    const cacheDir = path.join(process.cwd(), 'cache');
    let manifestData;
    let allCacheFiles;

    beforeAll(async () => {
        // Verify cache directory exists
        if (!fs.existsSync(cacheDir)) {
            throw new Error(`Cache directory not found: ${cacheDir}`);
        }

        // Get all JSON files in cache directory
        allCacheFiles = fs.readdirSync(cacheDir)
            .filter(file => file.endsWith('.json'))
            .sort();

        console.log(`Found ${allCacheFiles.length} JSON files in cache directory`);

        // Load manifest data
        const manifestPath = path.join(cacheDir, 'manifest.json');
        if (fs.existsSync(manifestPath)) {
            manifestData = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        }
    });

    beforeEach(async () => {
        jest.clearAllMocks();
        
        // Mock fetch to return actual file contents
        global.fetch = jest.fn().mockImplementation(async (url) => {
            const filename = url.replace(/.*\//, '');
            const filePath = path.join(cacheDir, filename);
            
            if (fs.existsSync(filePath)) {
                const content = fs.readFileSync(filePath, 'utf8');
                return {
                    ok: true,
                    status: 200,
                    json: async () => JSON.parse(content),
                    text: async () => content
                };
            } else {
                return {
                    ok: false,
                    status: 404,
                    statusText: 'Not Found'
                };
            }
        });

        // Import services
        jest.resetModules();
        const cacheModule = await import('../../js/services/cacheFileService.js');
        cacheFileService = cacheModule.cacheFileService;
        
        const dataModule = await import('../../js/services/dataService.js');
        dataService = dataModule.dataService;
    });

    describe('Cache Directory Structure', () => {
        test('should have exactly 130 JSON files (129 MDM files + manifest)', () => {
            expect(allCacheFiles).toHaveLength(130);
            expect(allCacheFiles).toContain('manifest.json');
        });

        test('should have manifest.json as one of the files', () => {
            expect(allCacheFiles).toContain('manifest.json');
        });

        test('manifest should list 129 files', () => {
            expect(manifestData).toBeDefined();
            expect(manifestData.total_files).toBe(129);
            expect(Object.keys(manifestData.files)).toHaveLength(129);
        });

        test('all files in manifest should exist in cache directory', () => {
            const manifestFiles = Object.keys(manifestData.files);
            const missingFiles = manifestFiles.filter(file => !allCacheFiles.includes(file));
            
            expect(missingFiles).toHaveLength(0);
            if (missingFiles.length > 0) {
                console.error('Missing files:', missingFiles);
            }
        });

        test('all cache files (except manifest) should be listed in manifest', () => {
            const cacheFilesWithoutManifest = allCacheFiles.filter(file => file !== 'manifest.json');
            const manifestFiles = Object.keys(manifestData.files);
            const unlisted = cacheFilesWithoutManifest.filter(file => !manifestFiles.includes(file));
            
            expect(unlisted).toHaveLength(0);
            if (unlisted.length > 0) {
                console.error('Unlisted files:', unlisted);
            }
        });
    });

    describe('CacheFileService - Manifest Loading', () => {
        test('should successfully load manifest.json', async () => {
            const manifest = await cacheFileService.loadManifest();
            
            expect(manifest).toBeDefined();
            expect(manifest).not.toBeNull();
            expect(typeof manifest).toBe('object');
            expect(manifest.generated_at).toBeDefined();
            expect(manifest.total_files).toBe(129);
            expect(manifest.files).toBeDefined();
            expect(typeof manifest.files).toBe('object');
        });

        test('manifest should have valid structure', async () => {
            const manifest = await cacheFileService.loadManifest();
            
            // Check required fields
            expect(manifest.generated_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
            expect(typeof manifest.total_files).toBe('number');
            expect(manifest.total_files).toBeGreaterThan(0);
            
            // Check files object structure
            Object.entries(manifest.files).forEach(([filename, metadata]) => {
                expect(filename).toMatch(/\.json$/);
                expect(metadata).toHaveProperty('size');
                expect(metadata).toHaveProperty('modified');
                expect(metadata).toHaveProperty('checksum');
                expect(typeof metadata.size).toBe('number');
                expect(metadata.size).toBeGreaterThan(0);
                expect(metadata.checksum).toMatch(/^[a-f0-9]{64}$/); // SHA-256 hash
            });
        });
    });

    describe('CacheFileService - Individual File Loading', () => {
        test('should load all files listed in manifest', async () => {
            await cacheFileService.loadManifest();
            const manifest = cacheFileService.getManifest();
            const filenames = Object.keys(manifest.files);
            
            const results = [];
            
            for (const filename of filenames) {
                try {
                    const data = await cacheFileService.loadFile(filename);
                    results.push({
                        filename,
                        success: data !== null && data !== undefined,
                        data,
                        error: null
                    });
                } catch (error) {
                    results.push({
                        filename,
                        success: false,
                        data: null,
                        error: error.message
                    });
                }
            }
            
            const failures = results.filter(r => !r.success);
            
            expect(failures).toHaveLength(0);
            
            if (failures.length > 0) {
                console.error('Failed to load files:', failures.map(f => `${f.filename}: ${f.error}`));
            }
            
            // All files should return valid objects
            const validData = results.filter(r => r.success && typeof r.data === 'object' && r.data !== null);
            expect(validData).toHaveLength(filenames.length);
        });

        test('should return valid JSON objects for all files', async () => {
            await cacheFileService.loadManifest();
            const manifest = cacheFileService.getManifest();
            const filenames = Object.keys(manifest.files);
            
            for (const filename of filenames) {
                const data = await cacheFileService.loadFile(filename);
                
                expect(data).toBeDefined();
                expect(data).not.toBeNull();
                expect(typeof data).toBe('object');
                
                // Should be valid JSON (not a string)
                expect(typeof data).not.toBe('string');
                
                // Should have some content
                expect(Object.keys(data).length).toBeGreaterThan(0);
            }
        });

        test('should handle memory caching correctly', async () => {
            await cacheFileService.loadManifest();
            const testFile = 'wifi.json';
            
            // First load
            const data1 = await cacheFileService.loadFile(testFile);
            expect(data1).toBeDefined();
            
            // Second load should use cache
            const data2 = await cacheFileService.loadFile(testFile);
            expect(data2).toBeDefined();
            expect(data2).toBe(data1); // Should be same object reference
            
            // Fetch should only be called once for the file
            const fetchCalls = global.fetch.mock.calls.filter(call => call[0].includes(testFile));
            expect(fetchCalls).toHaveLength(1);
        });
    });

    describe('File Integrity Validation', () => {
        test('should validate file sizes match manifest', async () => {
            await cacheFileService.loadManifest();
            const manifest = cacheFileService.getManifest();
            
            const sizeMismatches = [];
            
            for (const [filename, metadata] of Object.entries(manifest.files)) {
                const filePath = path.join(cacheDir, filename);
                const actualSize = fs.statSync(filePath).size;
                
                if (actualSize !== metadata.size) {
                    sizeMismatches.push({
                        filename,
                        expected: metadata.size,
                        actual: actualSize
                    });
                }
            }
            
            expect(sizeMismatches).toHaveLength(0);
            
            if (sizeMismatches.length > 0) {
                console.error('Size mismatches:', sizeMismatches);
            }
        });

        test('should validate file checksums match manifest', async () => {
            await cacheFileService.loadManifest();
            const manifest = cacheFileService.getManifest();
            
            const checksumMismatches = [];
            
            for (const [filename, metadata] of Object.entries(manifest.files)) {
                const filePath = path.join(cacheDir, filename);
                const content = fs.readFileSync(filePath);
                const actualChecksum = crypto.createHash('sha256').update(content).digest('hex');
                
                if (actualChecksum !== metadata.checksum) {
                    checksumMismatches.push({
                        filename,
                        expected: metadata.checksum,
                        actual: actualChecksum
                    });
                }
            }
            
            expect(checksumMismatches).toHaveLength(0);
            
            if (checksumMismatches.length > 0) {
                console.error('Checksum mismatches:', checksumMismatches);
            }
        });

        test('should validate Apple MDM documentation structure', async () => {
            await cacheFileService.loadManifest();
            const manifest = cacheFileService.getManifest();
            
            const structureIssues = [];
            
            for (const filename of Object.keys(manifest.files)) {
                const data = await cacheFileService.loadFile(filename);
                
                // Basic Apple MDM documentation structure validation
                if (!data.kind || !data.metadata || !data.identifier) {
                    structureIssues.push({
                        filename,
                        issue: 'Missing required Apple MDM documentation fields',
                        hasKind: !!data.kind,
                        hasMetadata: !!data.metadata,
                        hasIdentifier: !!data.identifier
                    });
                }
            }
            
            expect(structureIssues).toHaveLength(0);
            
            if (structureIssues.length > 0) {
                console.error('Structure issues:', structureIssues);
            }
        });
    });

    describe('Application Integration Tests', () => {
        test('should load main specification from cache successfully', async () => {
            const mainSpec = await cacheFileService.loadMainSpec();

            expect(mainSpec).toBeDefined();
            expect(mainSpec).not.toBeNull();
            expect(typeof mainSpec).toBe('object');

            // Should have Apple MDM documentation structure
            expect(mainSpec.kind).toBe('article');
            expect(mainSpec.metadata).toBeDefined();
            expect(mainSpec.topicSections).toBeDefined();
            expect(Array.isArray(mainSpec.topicSections)).toBe(true);
            expect(mainSpec.topicSections.length).toBeGreaterThan(0);
        });

        test('should load section data for major payload types', async () => {
            const majorSections = [
                'WiFi',
                'Restrictions',
                'Accounts',
                'Cellular',
                'VPN',
                'MDM',
                'CertificateRoot'
            ];

            const results = [];

            for (const sectionName of majorSections) {
                try {
                    const sectionData = await cacheFileService.loadSection(sectionName);
                    results.push({
                        section: sectionName,
                        success: sectionData !== null && sectionData !== undefined,
                        hasContent: sectionData && typeof sectionData === 'object'
                    });
                } catch (error) {
                    results.push({
                        section: sectionName,
                        success: false,
                        error: error.message
                    });
                }
            }

            const failures = results.filter(r => !r.success);
            expect(failures).toHaveLength(0);

            if (failures.length > 0) {
                console.error('Section loading failures:', failures);
            }

            // All sections should have valid content
            const validSections = results.filter(r => r.success && r.hasContent);
            expect(validSections).toHaveLength(majorSections.length);
        });

        test('should use cache-first loading logic', async () => {
            // Clear any previous calls
            global.fetch.mockClear();

            // Load main specification
            await cacheFileService.loadMainSpec();

            // Should have made fetch calls to cache files, not external APIs
            const fetchCalls = global.fetch.mock.calls;
            const cacheFileCalls = fetchCalls.filter(call =>
                call[0].includes('cache/') || call[0].includes('.json')
            );
            const externalApiCalls = fetchCalls.filter(call =>
                call[0].includes('developer.apple.com') || call[0].includes('apple.com')
            );

            expect(cacheFileCalls.length).toBeGreaterThan(0);
            expect(externalApiCalls).toHaveLength(0);
        });

        test('should handle cache file metadata correctly', async () => {
            await cacheFileService.loadManifest();

            // Test hasFile method
            expect(cacheFileService.hasFile('wifi.json')).toBe(true);
            expect(cacheFileService.hasFile('nonexistent.json')).toBe(false);

            // Test getFileMetadata method
            const wifiMetadata = cacheFileService.getFileMetadata('wifi.json');
            expect(wifiMetadata).toBeDefined();
            expect(wifiMetadata.size).toBeGreaterThan(0);
            expect(wifiMetadata.checksum).toMatch(/^[a-f0-9]{64}$/);
            expect(wifiMetadata.modified).toBeDefined();

            // Test nonexistent file
            const nonexistentMetadata = cacheFileService.getFileMetadata('nonexistent.json');
            expect(nonexistentMetadata).toBeNull();
        });
    });

    describe('Performance and Reliability Tests', () => {
        test('should prevent redundant file loads with memory caching', async () => {
            await cacheFileService.loadManifest();
            global.fetch.mockClear();

            const testFiles = ['wifi.json', 'restrictions.json', 'accounts.json'];

            // Load each file twice
            for (const filename of testFiles) {
                await cacheFileService.loadFile(filename);
                await cacheFileService.loadFile(filename); // Second load should use cache
            }

            // Should only have made one fetch call per file
            const fetchCalls = global.fetch.mock.calls;
            testFiles.forEach(filename => {
                const fileCalls = fetchCalls.filter(call => call[0].includes(filename));
                expect(fileCalls).toHaveLength(1);
            });
        });

        test('should handle missing files gracefully', async () => {
            const nonexistentFile = 'nonexistent-file.json';

            // Mock fetch to return 404 for this file
            global.fetch.mockImplementation(async (url) => {
                if (url.includes(nonexistentFile)) {
                    return {
                        ok: false,
                        status: 404,
                        statusText: 'Not Found'
                    };
                }
                // Default behavior for other files
                const filename = url.replace(/.*\//, '');
                const filePath = path.join(cacheDir, filename);
                if (fs.existsSync(filePath)) {
                    const content = fs.readFileSync(filePath, 'utf8');
                    return {
                        ok: true,
                        status: 200,
                        json: async () => JSON.parse(content)
                    };
                }
                return { ok: false, status: 404 };
            });

            const result = await cacheFileService.loadFile(nonexistentFile);
            expect(result).toBeNull();

            // Should not throw an error
            expect(() => cacheFileService.hasFile(nonexistentFile)).not.toThrow();
            expect(cacheFileService.hasFile(nonexistentFile)).toBe(false);
        });

        test('should handle concurrent file loading', async () => {
            await cacheFileService.loadManifest();
            const testFiles = ['wifi.json', 'restrictions.json', 'accounts.json', 'cellular.json'];

            // Load all files concurrently
            const promises = testFiles.map(filename => cacheFileService.loadFile(filename));
            const results = await Promise.all(promises);

            // All should succeed
            results.forEach((result, index) => {
                expect(result).toBeDefined();
                expect(result).not.toBeNull();
                expect(typeof result).toBe('object');
            });
        });

        test('should handle malformed JSON gracefully', async () => {
            const malformedFile = 'malformed.json';

            // Mock fetch to return invalid JSON
            global.fetch.mockImplementation(async (url) => {
                if (url.includes(malformedFile)) {
                    return {
                        ok: true,
                        status: 200,
                        json: async () => {
                            throw new SyntaxError('Unexpected token in JSON');
                        }
                    };
                }
                return { ok: false, status: 404 };
            });

            const result = await cacheFileService.loadFile(malformedFile);
            expect(result).toBeNull();

            // Should not crash the application
            expect(result).toBeDefined();
        });

        test('should measure loading performance', async () => {
            await cacheFileService.loadManifest();
            const manifest = cacheFileService.getManifest();
            const filenames = Object.keys(manifest.files).slice(0, 10); // Test first 10 files

            const startTime = Date.now();

            for (const filename of filenames) {
                await cacheFileService.loadFile(filename);
            }

            const endTime = Date.now();
            const duration = endTime - startTime;
            const avgTimePerFile = duration / filenames.length;

            // Should load files reasonably quickly (less than 100ms per file on average)
            expect(avgTimePerFile).toBeLessThan(100);

            console.log(`Performance: Loaded ${filenames.length} files in ${duration}ms (avg: ${avgTimePerFile.toFixed(2)}ms per file)`);
        });
    });

    describe('Error Handling and Edge Cases', () => {
        test('should handle network errors gracefully', async () => {
            // Mock fetch to simulate network error
            global.fetch.mockRejectedValue(new Error('Network error'));

            const result = await cacheFileService.loadFile('wifi.json');
            expect(result).toBeNull();
        });

        test('should handle empty manifest gracefully', async () => {
            // Mock fetch to return empty manifest
            global.fetch.mockImplementation(async (url) => {
                if (url.includes('manifest.json')) {
                    return {
                        ok: true,
                        status: 200,
                        json: async () => ({ files: {}, total_files: 0 })
                    };
                }
                return { ok: false, status: 404 };
            });

            const manifest = await cacheFileService.loadManifest();
            expect(manifest).toBeDefined();
            expect(manifest.total_files).toBe(0);
            expect(Object.keys(manifest.files)).toHaveLength(0);
        });

        test('should validate all files are accessible via the service', async () => {
            // This test ensures every file in the cache directory can be loaded
            const allJsonFiles = allCacheFiles.filter(file => file !== 'manifest.json');
            const loadResults = [];

            for (const filename of allJsonFiles) {
                try {
                    const data = await cacheFileService.loadFile(filename);
                    loadResults.push({
                        filename,
                        success: data !== null,
                        size: data ? JSON.stringify(data).length : 0
                    });
                } catch (error) {
                    loadResults.push({
                        filename,
                        success: false,
                        error: error.message
                    });
                }
            }

            const failures = loadResults.filter(r => !r.success);
            const successes = loadResults.filter(r => r.success);

            console.log(`Cache validation: ${successes.length}/${allJsonFiles.length} files loaded successfully`);

            if (failures.length > 0) {
                console.error('Failed files:', failures);
            }

            expect(failures).toHaveLength(0);
            expect(successes).toHaveLength(allJsonFiles.length);
        });
    });
});
