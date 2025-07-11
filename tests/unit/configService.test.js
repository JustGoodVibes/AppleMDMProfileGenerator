/**
 * Unit Tests for ConfigService
 * Tests configuration management functionality
 */

import { jest } from '@jest/globals';

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

// Mock constants
jest.mock('../../js/utils/constants.js', () => ({
    CACHE_CONFIG: {
        CACHE_DURATION: 24 * 60 * 60 * 1000
    }
}));

describe('ConfigService', () => {
    let configService;

    beforeEach(async () => {
        jest.clearAllMocks();
        mockLocalStorage.getItem.mockReturnValue(null);
        window.location.search = '';
        
        // Clear module cache and reimport
        jest.resetModules();
        const module = await import('../../js/services/configService.js');
        configService = module.configService;
    });

    describe('Default Configuration', () => {
        test('should have correct default values', () => {
            expect(configService.get('USE_LIVE_API')).toBe(true);
            expect(configService.get('CACHE_ENABLED')).toBe(true);
            expect(configService.get('DEBUG_MODE')).toBe(false);
            expect(configService.get('API_TIMEOUT')).toBe(30000);
            expect(configService.get('RETRY_ATTEMPTS')).toBe(3);
            expect(configService.get('RETRY_DELAY')).toBe(1000);
        });

        test('should return complete configuration object', () => {
            const config = configService.getAll();
            expect(config).toHaveProperty('USE_LIVE_API');
            expect(config).toHaveProperty('CACHE_ENABLED');
            expect(config).toHaveProperty('DEBUG_MODE');
            expect(config).toHaveProperty('API_TIMEOUT');
            expect(config).toHaveProperty('RETRY_ATTEMPTS');
            expect(config).toHaveProperty('RETRY_DELAY');
        });
    });

    describe('URL Parameter Loading', () => {
        test('should load USE_LIVE_API from URL parameter', async () => {
            window.location.search = '?use_live_api=false';
            
            jest.resetModules();
            const module = await import('../../js/services/configService.js');
            const service = module.configService;
            
            expect(service.get('USE_LIVE_API')).toBe(false);
        });

        test('should load debug mode from URL parameter', async () => {
            window.location.search = '?debug=true';
            
            jest.resetModules();
            const module = await import('../../js/services/configService.js');
            const service = module.configService;
            
            expect(service.get('DEBUG_MODE')).toBe(true);
        });

        test('should load API timeout from URL parameter', async () => {
            window.location.search = '?api_timeout=60000';
            
            jest.resetModules();
            const module = await import('../../js/services/configService.js');
            const service = module.configService;
            
            expect(service.get('API_TIMEOUT')).toBe(60000);
        });

        test('should handle multiple URL parameters', async () => {
            window.location.search = '?use_live_api=false&debug=true&api_timeout=45000';
            
            jest.resetModules();
            const module = await import('../../js/services/configService.js');
            const service = module.configService;
            
            expect(service.get('USE_LIVE_API')).toBe(false);
            expect(service.get('DEBUG_MODE')).toBe(true);
            expect(service.get('API_TIMEOUT')).toBe(45000);
        });
    });

    describe('LocalStorage Integration', () => {
        test('should load configuration from localStorage', async () => {
            const storedConfig = {
                USE_LIVE_API: false,
                DEBUG_MODE: true,
                API_TIMEOUT: 45000
            };
            mockLocalStorage.getItem.mockReturnValue(JSON.stringify(storedConfig));
            
            jest.resetModules();
            const module = await import('../../js/services/configService.js');
            const service = module.configService;
            
            expect(service.get('USE_LIVE_API')).toBe(false);
            expect(service.get('DEBUG_MODE')).toBe(true);
            expect(service.get('API_TIMEOUT')).toBe(45000);
        });

        test('should save configuration to localStorage', () => {
            configService.set('USE_LIVE_API', false, true);
            
            expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
                'apple_mdm_config',
                expect.stringContaining('"USE_LIVE_API":false')
            );
        });

        test('should handle localStorage errors gracefully', async () => {
            mockLocalStorage.getItem.mockImplementation(() => {
                throw new Error('localStorage error');
            });
            
            jest.resetModules();
            const module = await import('../../js/services/configService.js');
            const service = module.configService;
            
            // Should still have default values
            expect(service.get('USE_LIVE_API')).toBe(true);
        });
    });

    describe('Configuration Methods', () => {
        test('should set and get configuration values', () => {
            configService.set('USE_LIVE_API', false);
            expect(configService.get('USE_LIVE_API')).toBe(false);
            
            configService.set('API_TIMEOUT', 60000);
            expect(configService.get('API_TIMEOUT')).toBe(60000);
        });

        test('should update multiple configuration values', () => {
            const updates = {
                USE_LIVE_API: false,
                DEBUG_MODE: true,
                API_TIMEOUT: 45000
            };
            
            configService.update(updates);
            
            expect(configService.get('USE_LIVE_API')).toBe(false);
            expect(configService.get('DEBUG_MODE')).toBe(true);
            expect(configService.get('API_TIMEOUT')).toBe(45000);
        });

        test('should reset configuration to defaults', () => {
            configService.set('USE_LIVE_API', false);
            configService.set('DEBUG_MODE', true);
            
            configService.reset();
            
            expect(configService.get('USE_LIVE_API')).toBe(true);
            expect(configService.get('DEBUG_MODE')).toBe(false);
        });
    });

    describe('Helper Methods', () => {
        test('shouldUseLiveAPI should return correct value', () => {
            configService.set('USE_LIVE_API', true);
            configService.set('CACHE_ENABLED', true);
            expect(configService.shouldUseLiveAPI()).toBe(true);
            
            configService.set('USE_LIVE_API', false);
            expect(configService.shouldUseLiveAPI()).toBe(false);
            
            configService.set('USE_LIVE_API', true);
            configService.set('CACHE_ENABLED', false);
            expect(configService.shouldUseLiveAPI()).toBe(false);
        });

        test('isCacheEnabled should return correct value', () => {
            configService.set('CACHE_ENABLED', true);
            expect(configService.isCacheEnabled()).toBe(true);
            
            configService.set('CACHE_ENABLED', false);
            expect(configService.isCacheEnabled()).toBe(false);
        });

        test('isDebugMode should return correct value', () => {
            configService.set('DEBUG_MODE', true);
            expect(configService.isDebugMode()).toBe(true);
            
            configService.set('DEBUG_MODE', false);
            expect(configService.isDebugMode()).toBe(false);
        });

        test('getApiTimeout should return correct value', () => {
            configService.set('API_TIMEOUT', 45000);
            expect(configService.getApiTimeout()).toBe(45000);
        });

        test('getRetryConfig should return correct values', () => {
            configService.set('RETRY_ATTEMPTS', 5);
            configService.set('RETRY_DELAY', 2000);
            
            const retryConfig = configService.getRetryConfig();
            expect(retryConfig.attempts).toBe(5);
            expect(retryConfig.delay).toBe(2000);
        });
    });

    describe('Import/Export', () => {
        test('should export configuration as JSON', () => {
            configService.set('USE_LIVE_API', false);
            configService.set('DEBUG_MODE', true);
            
            const exported = configService.export();
            const parsed = JSON.parse(exported);
            
            expect(parsed.USE_LIVE_API).toBe(false);
            expect(parsed.DEBUG_MODE).toBe(true);
        });

        test('should import configuration from JSON', () => {
            const configJson = JSON.stringify({
                USE_LIVE_API: false,
                DEBUG_MODE: true,
                API_TIMEOUT: 60000
            });
            
            configService.import(configJson);
            
            expect(configService.get('USE_LIVE_API')).toBe(false);
            expect(configService.get('DEBUG_MODE')).toBe(true);
            expect(configService.get('API_TIMEOUT')).toBe(60000);
        });

        test('should handle invalid JSON import', () => {
            expect(() => {
                configService.import('invalid json');
            }).toThrow('Invalid configuration JSON');
        });
    });

    describe('Validation', () => {
        test('should validate boolean values', () => {
            configService.set('USE_LIVE_API', 'true');
            expect(configService.get('USE_LIVE_API')).toBe(true);
            
            configService.set('DEBUG_MODE', 0);
            expect(configService.get('DEBUG_MODE')).toBe(false);
        });

        test('should validate numeric values', () => {
            configService.set('API_TIMEOUT', '45000');
            expect(configService.get('API_TIMEOUT')).toBe(30000); // Should use default for invalid number
            
            configService.set('API_TIMEOUT', -1000);
            expect(configService.get('API_TIMEOUT')).toBe(30000); // Should use default for negative number
        });
    });
});
