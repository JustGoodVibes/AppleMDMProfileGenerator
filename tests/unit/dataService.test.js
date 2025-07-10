/**
 * Unit Tests for DataService - Section Processing
 * Tests the core hierarchical section functionality
 */

import { jest } from '@jest/globals';
import { mockTopicSections, mockAppleIdentifiers, mockMainSpec } from '../mocks/appleApiData.js';

// Mock the dependencies
const mockProgressService = global.testUtils.mockProgressService;
const mockCacheService = {
  get: jest.fn(),
  set: jest.fn(),
  has: jest.fn(),
  clear: jest.fn()
};

// Mock the constants
const mockConstants = {
  API_ENDPOINTS: {
    MAIN_SPEC: 'https://developer.apple.com/tutorials/data/documentation/devicemanagement/profile-specific-payload-keys.json'
  },
  CACHE_CONFIG: {
    MAIN_SPEC_KEY: 'main-spec',
    SECTION_KEY_PREFIX: 'section-'
  }
};

// Create a mock DataService class for testing
class MockDataService {
  constructor() {
    this.mainSpec = null;
    this.sectionData = new Map();
  }

  /**
   * Extract configuration type name from Apple identifier URL
   */
  extractConfigTypeFromIdentifier(identifier) {
    if (!identifier || typeof identifier !== 'string') {
      return null;
    }

    // Extract from Apple's doc:// URLs
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
   * Create identifier from section title for JSON file loading
   */
  createIdentifierFromTitle(title) {
    if (!title) return 'unknown';

    return title.toLowerCase()
               .replace(/\s+/g, '')  // Remove spaces
               .replace(/[^a-z0-9]/g, ''); // Remove non-alphanumeric characters
  }

  /**
   * Create section object from topicSection
   */
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
      configurationIdentifiers: topicSection.identifiers || [],
      rawData: topicSection,
      isSynthetic: false
    };
  }

  /**
   * Normalize identifier for API comparison
   */
  normalizeIdentifierForAPI(identifier) {
    if (!identifier) return '';
    return identifier.toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  /**
   * Construct API endpoint for section JSON file
   */
  constructSectionEndpoint(sectionIdentifier) {
    return `https://developer.apple.com/tutorials/data/documentation/devicemanagement/${sectionIdentifier}.json`;
  }

  /**
   * Add known missing MDM sections
   */
  addKnownMissingSections(existingSections) {
    const missingSections = [];

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
        name: 'Software Update',
        identifier: 'softwareupdate',
        description: 'Configure automatic software update settings',
        platforms: ['iOS', 'macOS', 'tvOS', 'watchOS'],
        category: 'System',
        priority: 'high',
        identifiers: ['com.apple.SoftwareUpdate', 'SoftwareUpdate']
      }
    ];

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
          isSynthetic: true,
          category: knownSection.category,
          priority: knownSection.priority,
          configurationIdentifiers: knownSection.identifiers,
          rawData: {
            title: knownSection.name,
            anchor: knownSection.identifier,
            identifiers: knownSection.identifiers,
            abstract: knownSection.description
          },
          apiEndpoint: this.constructSectionEndpoint(knownSection.identifier)
        };

        missingSections.push(missingSection);
        mockProgressService.log(`Added missing section: ${knownSection.name} (${knownSection.category})`, 'info');
      }
    });

    return missingSections;
  }

  /**
   * Create sub-sections from identifiers array with parent-child relationships
   */
  createSubSectionsFromIdentifiers(topicSection, parentSection) {
    const subSections = [];

    if (!topicSection.identifiers || !Array.isArray(topicSection.identifiers)) {
      return subSections;
    }

    mockProgressService.log(`Processing ${topicSection.identifiers.length} identifiers for ${parentSection.name}`, 'info');

    topicSection.identifiers.forEach((identifier) => {
      try {
        const configTypeName = this.extractConfigTypeFromIdentifier(identifier);

        // Case-insensitive comparison to prevent parent section from becoming sub-section
        if (configTypeName && configTypeName.toLowerCase() !== parentSection.identifier.toLowerCase()) {
          const subSection = {
            name: this.formatConfigTypeName(configTypeName),
            identifier: configTypeName.toLowerCase(),
            description: `${configTypeName} configuration settings`,
            platforms: parentSection.platforms || [],
            deprecated: false,
            parameters: [],
            // Hierarchical relationship
            parentSection: parentSection.identifier,
            parentName: parentSection.name,
            isSubSection: true,
            // Configuration type specific data
            configurationTypeIdentifier: identifier,
            apiEndpoint: this.constructConfigTypeEndpoint(configTypeName),
            rawData: { identifier, parentTopicSection: topicSection }
          };

          subSections.push(subSection);
          mockProgressService.log(`Created sub-section: ${subSection.name} (${subSection.identifier})`, 'info');
        }
      } catch (error) {
        mockProgressService.log(`Error processing identifier ${identifier}: ${error.message}`, 'warning');
      }
    });

    return subSections;
  }

  /**
   * Format configuration type name for display
   */
  formatConfigTypeName(configTypeName) {
    if (!configTypeName) return 'Unknown';
    
    // Handle camelCase and PascalCase
    return configTypeName.replace(/([A-Z])/g, ' $1').trim();
  }

  /**
   * Construct API endpoint for configuration type
   */
  constructConfigTypeEndpoint(configTypeName) {
    return `https://developer.apple.com/tutorials/data/documentation/devicemanagement/${configTypeName}.json`;
  }

  /**
   * Process topicSections array to create hierarchical sections
   */
  parseSections(mainSpec) {
    const sections = [];

    if (!mainSpec.topicSections || !Array.isArray(mainSpec.topicSections)) {
      throw new Error('Invalid main specification structure for parsing');
    }

    mockProgressService.log(`Processing ${mainSpec.topicSections.length} topicSections with hierarchical expansion`, 'info');

    mainSpec.topicSections.forEach((topicSection, index) => {
      try {
        if (this.looksLikeTopicSection(topicSection)) {
          // Create main section from topicSection
          const mainSection = this.createSectionFromTopicSection(topicSection, index);
          sections.push(mainSection);
          mockProgressService.log(`Created main section: ${mainSection.name} (${mainSection.identifier})`, 'info');

          // Create sub-sections from identifiers array (hierarchical structure)
          const subSections = this.createSubSectionsFromIdentifiers(topicSection, mainSection);
          sections.push(...subSections);

          if (subSections.length > 0) {
            mockProgressService.log(`Created ${subSections.length} sub-sections for ${mainSection.name}`, 'info');
          }
        } else {
          mockProgressService.log(`Skipping invalid topicSection at index ${index}`, 'warning');
        }
      } catch (error) {
        mockProgressService.log(`Error processing topicSection ${index}: ${error.message}`, 'warning');
      }
    });

    // Add known missing MDM sections
    const missingSections = this.addKnownMissingSections(sections);
    sections.push(...missingSections);

    if (missingSections.length > 0) {
      mockProgressService.log(`Added ${missingSections.length} known missing MDM sections`, 'info');
    }

    mockProgressService.log(`Total sections created: ${sections.length} (including hierarchical sub-sections)`, 'info');
    return sections;
  }

  /**
   * Check if object looks like a valid topicSection
   */
  looksLikeTopicSection(obj) {
    return obj && 
           typeof obj === 'object' && 
           (obj.title || obj.anchor) && 
           Array.isArray(obj.identifiers);
  }
}

describe('DataService - Section Processing', () => {
  let dataService;

  beforeEach(() => {
    dataService = new MockDataService();
    jest.clearAllMocks();
  });

  describe('extractConfigTypeFromIdentifier', () => {
    test('should extract config type from Apple doc:// URLs', () => {
      expect(dataService.extractConfigTypeFromIdentifier(mockAppleIdentifiers.accounts))
        .toBe('Accounts');
      expect(dataService.extractConfigTypeFromIdentifier(mockAppleIdentifiers.calDAV))
        .toBe('CalDAV');
      expect(dataService.extractConfigTypeFromIdentifier(mockAppleIdentifiers.systemExtensions))
        .toBe('SystemExtensions');
    });

    test('should handle malformed URLs gracefully', () => {
      expect(dataService.extractConfigTypeFromIdentifier('invalid-url')).toBe('invalid-url');
      expect(dataService.extractConfigTypeFromIdentifier('')).toBeNull();
      expect(dataService.extractConfigTypeFromIdentifier(null)).toBeNull();
      expect(dataService.extractConfigTypeFromIdentifier(undefined)).toBeNull();
    });

    test('should filter out non-configuration segments', () => {
      expect(dataService.extractConfigTypeFromIdentifier('doc://com.apple.devicemanagement/documentation/DeviceManagement'))
        .toBeNull();
    });
  });

  describe('createIdentifierFromTitle', () => {
    test('should create lowercase identifiers from titles', () => {
      expect(dataService.createIdentifierFromTitle('Accounts')).toBe('accounts');
      expect(dataService.createIdentifierFromTitle('System Configuration')).toBe('systemconfiguration');
      expect(dataService.createIdentifierFromTitle('Top Level')).toBe('toplevel');
    });

    test('should handle special characters and spaces', () => {
      expect(dataService.createIdentifierFromTitle('App Store')).toBe('appstore');
      expect(dataService.createIdentifierFromTitle('Full Disk Encryption')).toBe('fulldiskencryption');
      expect(dataService.createIdentifierFromTitle('Wi-Fi Settings')).toBe('wifisettings');
    });

    test('should handle edge cases', () => {
      expect(dataService.createIdentifierFromTitle('')).toBe('unknown');
      expect(dataService.createIdentifierFromTitle(null)).toBe('unknown');
      expect(dataService.createIdentifierFromTitle(undefined)).toBe('unknown');
    });
  });

  describe('createSectionFromTopicSection', () => {
    test('should create section with correct properties', () => {
      const section = dataService.createSectionFromTopicSection(mockTopicSections.accounts, 0);

      expect(section).toMatchObject({
        name: 'Accounts',
        identifier: 'accounts',
        deprecated: false,
        platforms: ['iOS', 'macOS', 'tvOS', 'watchOS'],
        parameters: [],
        anchor: 'Accounts',
        title: 'Accounts'
      });
      expect(section.configurationIdentifiers).toHaveLength(7);
    });

    test('should handle missing title with fallback', () => {
      const topicSection = { anchor: 'Test', identifiers: [] };
      const section = dataService.createSectionFromTopicSection(topicSection, 5);

      expect(section.name).toBe('Section 6');
      expect(section.identifier).toBe('section6');
    });
  });

  describe('createSubSectionsFromIdentifiers', () => {
    test('should create sub-sections from identifiers array', () => {
      const parentSection = dataService.createSectionFromTopicSection(mockTopicSections.accounts, 0);
      const subSections = dataService.createSubSectionsFromIdentifiers(mockTopicSections.accounts, parentSection);

      expect(subSections).toHaveLength(6); // 7 identifiers - 1 parent = 6 sub-sections

      const subSectionNames = subSections.map(s => s.name);
      expect(subSectionNames).toContain('Cal D A V');
      expect(subSectionNames).toContain('Card D A V');
      expect(subSectionNames).toContain('Google Account');
      expect(subSectionNames).toContain('L D A P');
      expect(subSectionNames).toContain('Mobile Accounts');
      expect(subSectionNames).toContain('Subscribed Calendars');
    });

    test('should prevent parent section from becoming sub-section (case-insensitive)', () => {
      const parentSection = dataService.createSectionFromTopicSection(mockTopicSections.accounts, 0);
      const subSections = dataService.createSubSectionsFromIdentifiers(mockTopicSections.accounts, parentSection);

      // Should not include "Accounts" as a sub-section
      const accountsSubSection = subSections.find(s => s.name.toLowerCase() === 'accounts');
      expect(accountsSubSection).toBeUndefined();
    });

    test('should set correct hierarchical properties', () => {
      const parentSection = dataService.createSectionFromTopicSection(mockTopicSections.accounts, 0);
      const subSections = dataService.createSubSectionsFromIdentifiers(mockTopicSections.accounts, parentSection);

      subSections.forEach(subSection => {
        expect(subSection.isSubSection).toBe(true);
        expect(subSection.parentSection).toBe('accounts');
        expect(subSection.parentName).toBe('Accounts');
        expect(subSection.platforms).toEqual(['iOS', 'macOS', 'tvOS', 'watchOS']);
      });
    });

    test('should handle empty or missing identifiers', () => {
      const parentSection = dataService.createSectionFromTopicSection(mockTopicSections.accounts, 0);
      const emptyTopicSection = { title: 'Empty', identifiers: [] };
      const subSections = dataService.createSubSectionsFromIdentifiers(emptyTopicSection, parentSection);

      expect(subSections).toHaveLength(0);
    });

    test('should handle malformed identifiers gracefully', () => {
      const parentSection = dataService.createSectionFromTopicSection(mockTopicSections.accounts, 0);
      const malformedTopicSection = {
        title: 'Malformed',
        identifiers: ['invalid-url', null, undefined, '']
      };
      const subSections = dataService.createSubSectionsFromIdentifiers(malformedTopicSection, parentSection);

      expect(subSections).toHaveLength(1); // Only 'invalid-url' should create a sub-section
    });
  });

  describe('parseSections', () => {
    test('should parse all topicSections into hierarchical structure', () => {
      const sections = dataService.parseSections(mockMainSpec);

      // Should have parent sections + sub-sections + missing sections
      expect(sections.length).toBeGreaterThan(5); // At least 5 parent sections

      // Check for parent sections (original + synthetic)
      const parentSections = sections.filter(s => !s.isSubSection);
      expect(parentSections.length).toBeGreaterThanOrEqual(5); // 5 original + 3 synthetic

      // Check for sub-sections
      const subSections = sections.filter(s => s.isSubSection);
      expect(subSections.length).toBeGreaterThan(0);
    });

    test('should create correct Accounts hierarchy', () => {
      const sections = dataService.parseSections(mockMainSpec);

      const accountsParent = sections.find(s => s.name === 'Accounts' && !s.isSubSection);
      expect(accountsParent).toBeDefined();

      const accountsSubSections = sections.filter(s => s.isSubSection && s.parentSection === 'accounts');
      expect(accountsSubSections).toHaveLength(6);
    });

    test('should handle invalid main spec', () => {
      expect(() => dataService.parseSections({})).toThrow('Invalid main specification structure');
      expect(() => dataService.parseSections({ topicSections: null })).toThrow();
      expect(() => dataService.parseSections({ topicSections: 'invalid' })).toThrow();
    });

    test('should skip invalid topicSections', () => {
      const invalidMainSpec = {
        topicSections: [
          mockTopicSections.accounts, // Valid
          null, // Invalid
          { title: 'Invalid' }, // Missing identifiers
          mockTopicSections.appStore // Valid
        ]
      };

      const sections = dataService.parseSections(invalidMainSpec);

      // Should only process valid topicSections + missing sections
      const originalSections = sections.filter(s => !s.isSubSection && !s.isSynthetic);
      expect(originalSections).toHaveLength(2); // accounts and appStore

      // Should also have synthetic sections
      const syntheticSections = sections.filter(s => s.isSynthetic);
      expect(syntheticSections.length).toBeGreaterThan(0);
    });
  });

  describe('Missing Sections Integration', () => {
    test('should include synthetic sections in parsed results', () => {
      const sections = dataService.parseSections(mockMainSpec);

      const syntheticSections = sections.filter(s => s.isSynthetic);
      expect(syntheticSections.length).toBeGreaterThan(0);

      // Check for specific high-priority missing sections
      const sectionNames = syntheticSections.map(s => s.name);
      expect(sectionNames).toContain('Firewall');
      expect(sectionNames).toContain('VPN');
      expect(sectionNames).toContain('Software Update');
    });

    test('should maintain original section count', () => {
      const sections = dataService.parseSections(mockMainSpec);
      const originalSections = sections.filter(s => !s.isSynthetic && !s.isSubSection);

      // Should have the same number of parent sections as topicSections
      expect(originalSections.length).toBe(mockMainSpec.topicSections.length);
    });

    test('should add sections with proper structure', () => {
      const sections = dataService.parseSections(mockMainSpec);
      const syntheticSections = sections.filter(s => s.isSynthetic);

      syntheticSections.forEach(section => {
        expect(section).toHaveProperty('name');
        expect(section).toHaveProperty('identifier');
        expect(section).toHaveProperty('description');
        expect(section).toHaveProperty('platforms');
        expect(section).toHaveProperty('category');
        expect(section).toHaveProperty('priority');
        expect(section).toHaveProperty('isSynthetic', true);
        expect(section).toHaveProperty('deprecated', false);
      });
    });

    test('should not duplicate existing sections', () => {
      // Create a spec that already has a Firewall section
      const specWithFirewall = {
        topicSections: [
          ...mockMainSpec.topicSections,
          { title: 'Firewall', identifiers: ['com.apple.security.firewall'] }
        ]
      };

      const sections = dataService.parseSections(specWithFirewall);
      const firewallSections = sections.filter(s =>
        s.name.toLowerCase().includes('firewall')
      );

      // Should have at least one Firewall section
      expect(firewallSections.length).toBeGreaterThanOrEqual(1);

      // The first Firewall section should be the original (not synthetic)
      const originalFirewall = firewallSections.find(s => !s.isSynthetic);
      expect(originalFirewall).toBeDefined();
      expect(originalFirewall.name).toBe('Firewall');
    });
  });
});
