/**
 * Jest Test Setup
 * Global test configuration and utilities
 */

// Mock DOM APIs that might not be available in Jest environment
global.fetch = jest.fn();
global.console.warn = jest.fn();
global.console.error = jest.fn();

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

// Mock sessionStorage
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.sessionStorage = sessionStorageMock;

// Mock URL constructor for Apple identifier URLs
global.URL = class URL {
  constructor(url) {
    this.href = url;
    this.pathname = url.split('://')[1]?.split('/').slice(1).join('/') || '';
  }
};

// Global test utilities
global.testUtils = {
  /**
   * Create a mock topicSection for testing
   */
  createMockTopicSection: (title, identifiers = []) => ({
    title,
    anchor: title.replace(/\s+/g, '-'),
    identifiers: identifiers.map(id => 
      typeof id === 'string' && id.startsWith('doc://') 
        ? id 
        : `doc://com.apple.devicemanagement/documentation/DeviceManagement/${id}`
    )
  }),

  /**
   * Create a mock section object
   */
  createMockSection: (name, identifier, isSubSection = false, parentSection = null) => ({
    name,
    identifier: identifier || name.toLowerCase().replace(/\s+/g, ''),
    description: `${name} configuration settings`,
    platforms: ['iOS', 'macOS', 'tvOS', 'watchOS'],
    deprecated: false,
    parameters: [],
    isSubSection,
    parentSection,
    parentName: parentSection ? 'Parent Section' : undefined
  }),

  /**
   * Create mock main spec data
   */
  createMockMainSpec: (topicSections = []) => ({
    topicSections,
    references: {},
    metadata: {
      title: 'Profile-Specific Payload Keys',
      role: 'collectionGroup'
    }
  }),

  /**
   * Wait for async operations in tests
   */
  waitFor: (ms = 0) => new Promise(resolve => setTimeout(resolve, ms)),

  /**
   * Mock progress service for tests
   */
  mockProgressService: {
    log: jest.fn(),
    updateStatus: jest.fn(),
    logParsingProgress: jest.fn(),
    logSectionProgress: jest.fn(),
    logCacheOperation: jest.fn()
  }
};

// Reset all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
  fetch.mockClear();
  localStorageMock.getItem.mockClear();
  localStorageMock.setItem.mockClear();
  localStorageMock.removeItem.mockClear();
  localStorageMock.clear.mockClear();
  sessionStorageMock.getItem.mockClear();
  sessionStorageMock.setItem.mockClear();
  sessionStorageMock.removeItem.mockClear();
  sessionStorageMock.clear.mockClear();
});

// Global error handler for unhandled promise rejections in tests
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
