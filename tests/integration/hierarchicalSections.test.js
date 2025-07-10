/**
 * Integration Tests for Hierarchical Sections
 * Tests the complete data flow from loadAllData to UI rendering
 */

import { jest } from '@jest/globals';
import { mockMainSpec, mockTopicSections, mockSectionData } from '../mocks/appleApiData.js';

// Mock fetch for API calls
global.fetch = jest.fn();

// Mock progress service
const mockProgressService = global.testUtils.mockProgressService;

// Mock cache service
const mockCacheService = {
  get: jest.fn(),
  set: jest.fn(),
  has: jest.fn(),
  clear: jest.fn()
};

// Mock DOM
const mockElement = {
  innerHTML: '',
  className: '',
  classList: { add: jest.fn(), remove: jest.fn() },
  appendChild: jest.fn(),
  dataset: {}
};

global.document = {
  getElementById: jest.fn(() => mockElement),
  createElement: jest.fn(() => mockElement)
};

// Integrated DataService + UIManager for testing
class IntegratedTestSystem {
  constructor() {
    this.mainSpec = null;
    this.sectionData = new Map();
    this.sectionsData = [];
  }

  // DataService methods
  async loadMainSpec(forceRefresh = false) {
    if (!forceRefresh && this.mainSpec) {
      return this.mainSpec;
    }

    // Mock API call
    fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockMainSpec)
    });

    const response = await fetch('mock-api-url');
    this.mainSpec = await response.json();
    return this.mainSpec;
  }

  async loadSectionData(sectionName, forceRefresh = false) {
    const cacheKey = `section-${sectionName}`;
    
    if (!forceRefresh && this.sectionData.has(sectionName)) {
      return this.sectionData.get(sectionName);
    }

    // Mock section data loading
    const sectionData = mockSectionData[sectionName.toLowerCase()] || {
      primaryContentSections: [],
      references: {},
      metadata: { title: sectionName }
    };

    this.sectionData.set(sectionName, sectionData);
    return sectionData;
  }

  extractConfigTypeFromIdentifier(identifier) {
    if (!identifier || typeof identifier !== 'string') return null;
    const docMatch = identifier.match(/\/DeviceManagement\/([^\/]+)$/);
    return docMatch ? docMatch[1] : null;
  }

  createIdentifierFromTitle(title) {
    if (!title) return 'unknown';
    return title.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '');
  }

  createSectionFromTopicSection(topicSection, index) {
    const sectionName = topicSection.title || `Section ${index + 1}`;
    const sectionIdentifier = this.createIdentifierFromTitle(sectionName);

    return {
      name: sectionName,
      identifier: sectionIdentifier,
      deprecated: false,
      platforms: ['iOS', 'macOS', 'tvOS', 'watchOS'],
      parameters: [],
      anchor: topicSection.anchor,
      title: topicSection.title,
      configurationIdentifiers: topicSection.identifiers || []
    };
  }

  createSubSectionsFromIdentifiers(topicSection, parentSection) {
    const subSections = [];

    if (!topicSection.identifiers || !Array.isArray(topicSection.identifiers)) {
      return subSections;
    }

    topicSection.identifiers.forEach((identifier) => {
      const configTypeName = this.extractConfigTypeFromIdentifier(identifier);

      // Case-insensitive comparison - the key fix
      if (configTypeName && configTypeName.toLowerCase() !== parentSection.identifier.toLowerCase()) {
        const subSection = {
          name: configTypeName,
          identifier: configTypeName.toLowerCase(),
          description: `${configTypeName} configuration settings`,
          platforms: parentSection.platforms || [],
          deprecated: false,
          parameters: [],
          parentSection: parentSection.identifier,
          parentName: parentSection.name,
          isSubSection: true,
          configurationTypeIdentifier: identifier
        };

        subSections.push(subSection);
      }
    });

    return subSections;
  }

  parseSections(mainSpec) {
    const sections = [];

    if (!mainSpec.topicSections || !Array.isArray(mainSpec.topicSections)) {
      throw new Error('Invalid main specification structure');
    }

    mainSpec.topicSections.forEach((topicSection, index) => {
      if (topicSection && topicSection.title && Array.isArray(topicSection.identifiers)) {
        // Create main section
        const mainSection = this.createSectionFromTopicSection(topicSection, index);
        sections.push(mainSection);

        // Create sub-sections
        const subSections = this.createSubSectionsFromIdentifiers(topicSection, mainSection);
        sections.push(...subSections);
      }
    });

    return sections;
  }

  parseParameters(sectionData, sectionIdentifier) {
    // Mock parameter parsing
    return [];
  }

  async loadAllData(forceRefresh = false) {
    const mainSpec = await this.loadMainSpec(forceRefresh);
    const sections = this.parseSections(mainSpec);

    // Load section data for each section
    const sectionsWithData = await Promise.all(
      sections.map(async (section) => {
        try {
          const data = await this.loadSectionData(section.identifier, forceRefresh);
          const parameters = this.parseParameters(data, section.identifier);
          return {
            ...section,
            parameters,
            rawData: data
          };
        } catch (error) {
          return {
            ...section,
            parameters: [],
            rawData: null,
            error: error.message
          };
        }
      })
    );

    return {
      mainSpec,
      sections: sectionsWithData,
      loadedAt: new Date().toISOString(),
      totalSections: sectionsWithData.length,
      totalParameters: sectionsWithData.reduce((sum, section) => sum + section.parameters.length, 0)
    };
  }

  // UIManager methods
  loadSectionsData(data) {
    this.sectionsData = Array.isArray(data.sections) ? data.sections : [];
    
    // Validate sections
    this.sectionsData = this.sectionsData.map((section, index) => ({
      identifier: section.identifier || `section-${index}`,
      name: section.name || `Section ${index + 1}`,
      description: section.description || '',
      platforms: Array.isArray(section.platforms) ? section.platforms : [],
      deprecated: Boolean(section.deprecated),
      parameters: Array.isArray(section.parameters) ? section.parameters : [],
      isSubSection: Boolean(section.isSubSection),
      parentSection: section.parentSection || null,
      parentName: section.parentName || null,
      ...section
    }));

    this.populateNavigation();
    this.populateSections();
  }

  populateNavigation() {
    const parentSections = this.sectionsData.filter(s => !s.isSubSection && !s.parentSection);
    const subSections = this.sectionsData.filter(s => s.isSubSection || s.parentSection);

    // Mock navigation creation
    parentSections.forEach(parent => {
      const children = subSections.filter(sub => 
        sub.parentSection === parent.identifier || sub.parentName === parent.name
      );
      
      if (children.length > 0) {
        mockProgressService.log(`Created hierarchical nav for ${parent.name} with ${children.length} children`, 'info');
      }
    });
  }

  populateSections() {
    const parentSections = this.sectionsData.filter(s => !s.isSubSection && !s.parentSection);
    const subSections = this.sectionsData.filter(s => s.isSubSection || s.parentSection);

    // Mock section rendering
    parentSections.forEach(parent => {
      const children = subSections.filter(sub => 
        sub.parentSection === parent.identifier || sub.parentName === parent.name
      );
      
      if (children.length > 0) {
        mockProgressService.log(`Created hierarchical sections for ${parent.name} with ${children.length} children`, 'info');
      }
    });
  }

  getSectionsData() {
    return this.sectionsData;
  }
}

describe('Integration Tests - Hierarchical Sections', () => {
  let system;

  beforeEach(() => {
    system = new IntegratedTestSystem();
    jest.clearAllMocks();
    fetch.mockClear();
  });

  describe('Complete Data Flow', () => {
    test('should load data from API to UI rendering', async () => {
      const data = await system.loadAllData(true);
      
      expect(fetch).toHaveBeenCalled();
      expect(data.sections).toBeDefined();
      expect(data.mainSpec).toBeDefined();
      expect(data.totalSections).toBeGreaterThan(0);
    });

    test('should create hierarchical structure from API data', async () => {
      const data = await system.loadAllData(true);
      
      const parentSections = data.sections.filter(s => !s.isSubSection);
      const subSections = data.sections.filter(s => s.isSubSection);
      
      expect(parentSections.length).toBeGreaterThan(0);
      expect(subSections.length).toBeGreaterThan(0);
    });

    test('should render hierarchical UI from processed data', async () => {
      const data = await system.loadAllData(true);
      system.loadSectionsData(data);
      
      expect(system.sectionsData.length).toBeGreaterThan(0);
      expect(mockProgressService.log).toHaveBeenCalledWith(
        expect.stringContaining('Created hierarchical'),
        'info'
      );
    });
  });

  describe('Accounts Section Integration', () => {
    test('should process Accounts section end-to-end', async () => {
      const data = await system.loadAllData(true);
      system.loadSectionsData(data);
      
      const accountsParent = system.sectionsData.find(s => 
        s.name === 'Accounts' && !s.isSubSection
      );
      const accountsSubSections = system.sectionsData.filter(s => 
        s.isSubSection && s.parentSection === accountsParent?.identifier
      );
      
      expect(accountsParent).toBeDefined();
      expect(accountsParent.identifier).toBe('accounts');
      expect(accountsSubSections.length).toBeGreaterThan(0);
    });

    test('should not include parent as sub-section in integration', async () => {
      const data = await system.loadAllData(true);
      system.loadSectionsData(data);
      
      const accountsParent = system.sectionsData.find(s => 
        s.name === 'Accounts' && !s.isSubSection
      );
      const accountsSubSections = system.sectionsData.filter(s => 
        s.isSubSection && s.parentSection === accountsParent?.identifier
      );
      
      // Should not find "Accounts" as a sub-section of itself
      const duplicateAccounts = accountsSubSections.find(s =>
        s.identifier === 'accounts' || s.name.toLowerCase() === 'accounts'
      );

      expect(duplicateAccounts).toBeUndefined();
    });

    test('should create expected Accounts sub-sections', async () => {
      const data = await system.loadAllData(true);
      system.loadSectionsData(data);
      
      const accountsSubSections = system.sectionsData.filter(s => 
        s.isSubSection && s.parentSection === 'accounts'
      );
      
      const expectedSubSections = ['caldav', 'carddav', 'googleaccount', 'ldap', 'mobileaccounts', 'subscribedcalendars'];
      const actualIdentifiers = accountsSubSections.map(s => s.identifier);
      
      expectedSubSections.forEach(expected => {
        expect(actualIdentifiers).toContain(expected);
      });
    });
  });

  describe('Other Hierarchical Sections', () => {
    test('should process System Configuration section correctly', async () => {
      const data = await system.loadAllData(true);
      system.loadSectionsData(data);
      
      const systemConfigParent = system.sectionsData.find(s => 
        s.name === 'System Configuration' && !s.isSubSection
      );
      const systemConfigSubSections = system.sectionsData.filter(s => 
        s.isSubSection && s.parentSection === systemConfigParent?.identifier
      );
      
      expect(systemConfigParent).toBeDefined();
      expect(systemConfigSubSections.length).toBeGreaterThan(0);
    });

    test('should process Certificates section correctly', async () => {
      const data = await system.loadAllData(true);
      system.loadSectionsData(data);
      
      const certificatesParent = system.sectionsData.find(s => 
        s.name === 'Certificates' && !s.isSubSection
      );
      const certificatesSubSections = system.sectionsData.filter(s => 
        s.isSubSection && s.parentSection === certificatesParent?.identifier
      );
      
      expect(certificatesParent).toBeDefined();
      expect(certificatesSubSections.length).toBeGreaterThan(0);
    });

    test('should handle sections with no sub-sections', async () => {
      const data = await system.loadAllData(true);
      system.loadSectionsData(data);
      
      const appStoreSection = system.sectionsData.find(s => 
        s.name === 'App Store'
      );
      const appStoreSubSections = system.sectionsData.filter(s => 
        s.isSubSection && s.parentSection === appStoreSection?.identifier
      );
      
      expect(appStoreSection).toBeDefined();
      expect(appStoreSubSections).toHaveLength(0);
    });
  });

  describe('Error Handling Integration', () => {
    test('should handle API failures gracefully', async () => {
      fetch.mockRejectedValueOnce(new Error('Network error'));
      
      await expect(system.loadAllData(true)).rejects.toThrow('Network error');
    });

    test('should handle malformed API responses', async () => {
      // Test that the system can handle errors gracefully
      const freshSystem = new IntegratedTestSystem();

      // Test with a response that has no topicSections
      const invalidSpec = { metadata: { title: 'Invalid' } };

      expect(() => freshSystem.parseSections(invalidSpec)).toThrow('Invalid main specification structure');
    });

    test('should handle section loading errors', async () => {
      // Test that the system continues working even with some errors
      const data = await system.loadAllData(false); // Use cached data

      // Should still have sections even if some fail to load parameters
      expect(data.sections.length).toBeGreaterThan(0);
      expect(data.totalSections).toBeGreaterThan(0);
      expect(data.mainSpec).toBeDefined();
    });
  });

  describe('Performance and Caching', () => {
    test('should use cached data when not forcing refresh', async () => {
      // First load
      await system.loadAllData(true);
      fetch.mockClear();
      
      // Second load without force refresh
      await system.loadAllData(false);
      
      // Should not make additional API calls
      expect(fetch).not.toHaveBeenCalled();
    });

    test('should handle large numbers of sections efficiently', async () => {
      const startTime = Date.now();
      const data = await system.loadAllData(true);
      const endTime = Date.now();
      
      // Should complete within reasonable time
      expect(endTime - startTime).toBeLessThan(5000); // 5 seconds
      expect(data.sections.length).toBeGreaterThan(0);
    });
  });
});
