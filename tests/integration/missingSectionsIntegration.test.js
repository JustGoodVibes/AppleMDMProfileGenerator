/**
 * Integration Tests for Missing MDM Sections
 * Tests the complete integration of missing sections with the existing system
 */

import { jest } from '@jest/globals';
import { mockMainSpec, mockTopicSections } from '../mocks/appleApiData.js';

// Mock the dependencies
const mockProgressService = global.testUtils.mockProgressService;
const mockCacheService = {
  get: jest.fn(),
  set: jest.fn(),
  has: jest.fn(),
  clear: jest.fn()
};

// Create a comprehensive mock DataService for integration testing
class MockDataServiceIntegration {
  constructor() {
    this.mainSpec = null;
  }

  /**
   * Normalize identifier for API comparison
   */
  normalizeIdentifierForAPI(identifier) {
    if (!identifier) return '';
    return identifier.toLowerCase().replace(/[^a-z0-9]/g, '');
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
   * Construct API endpoint for section JSON file
   */
  constructSectionEndpoint(sectionIdentifier) {
    return `https://developer.apple.com/tutorials/data/documentation/devicemanagement/${sectionIdentifier}.json`;
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
      apiEndpoint: this.constructSectionEndpoint(sectionIdentifier),
      rawTopicSection: topicSection,
      isSynthetic: false
    };
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
        name: 'Certificate Trust Settings',
        identifier: 'certificatetrustsettings',
        description: 'Configure certificate trust policies',
        platforms: ['iOS', 'macOS', 'tvOS', 'watchOS'],
        category: 'Security',
        priority: 'medium',
        identifiers: ['com.apple.security.certificatetrust', 'CertificateTrustSettings']
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
          rawTopicSection: {
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
   * Process topicSections array to create main sections
   */
  processTopicSections(topicSections) {
    const sections = [];

    mockProgressService.log(`Processing ${topicSections.length} topicSections`, 'info');

    topicSections.forEach((topicSection, index) => {
      try {
        const section = this.createSectionFromTopicSection(topicSection, index);
        sections.push(section);
        mockProgressService.log(`Created section: ${section.name} (${section.identifier}) from topicSection`, 'info');
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

    return sections;
  }

  /**
   * Parse sections from main spec
   */
  parseSections(mainSpec) {
    if (!mainSpec.topicSections || !Array.isArray(mainSpec.topicSections)) {
      throw new Error('Invalid main specification structure for parsing');
    }

    return this.processTopicSections(mainSpec.topicSections);
  }

  /**
   * Load all data (simulated for testing)
   */
  async loadAllData(forceRefresh = false) {
    const sections = this.parseSections(mockMainSpec);
    
    // Simulate loading section data for each section
    const sectionsWithData = sections.map(section => ({
      ...section,
      parameters: [], // Would be populated from actual API calls
      rawData: section.rawTopicSection
    }));

    return {
      sections: sectionsWithData,
      totalSections: sectionsWithData.length,
      originalSections: sectionsWithData.filter(s => !s.isSynthetic).length,
      syntheticSections: sectionsWithData.filter(s => s.isSynthetic).length
    };
  }
}

describe('Missing Sections Integration Tests', () => {
  let dataService;

  beforeEach(() => {
    dataService = new MockDataServiceIntegration();
    jest.clearAllMocks();
  });

  describe('Complete Integration Flow', () => {
    test('should integrate missing sections with original parsing workflow', async () => {
      const result = await dataService.loadAllData();

      expect(result.sections).toBeDefined();
      expect(result.totalSections).toBeGreaterThan(mockMainSpec.topicSections.length);
      expect(result.originalSections).toBe(mockMainSpec.topicSections.length);
      expect(result.syntheticSections).toBeGreaterThan(0);
    });

    test('should maintain original section properties after integration', async () => {
      const result = await dataService.loadAllData();
      const originalSections = result.sections.filter(s => !s.isSynthetic);

      // Verify original sections are preserved
      expect(originalSections).toHaveLength(mockMainSpec.topicSections.length);

      const accountsSection = originalSections.find(s => s.name === 'Accounts');
      expect(accountsSection).toBeDefined();
      expect(accountsSection.identifier).toBe('accounts');
      expect(accountsSection.isSynthetic).toBe(false);
    });

    test('should add all high-priority missing sections', async () => {
      const result = await dataService.loadAllData();
      const highPrioritySections = result.sections.filter(s => s.priority === 'high');

      expect(highPrioritySections.length).toBeGreaterThanOrEqual(4);

      const highPriorityNames = highPrioritySections.map(s => s.name);
      expect(highPriorityNames).toContain('Firewall');
      expect(highPriorityNames).toContain('VPN');
      expect(highPriorityNames).toContain('Software Update');
      expect(highPriorityNames).toContain('Managed App Configuration');
    });

    test('should categorize sections correctly', async () => {
      const result = await dataService.loadAllData();
      const categorizedSections = result.sections.filter(s => s.category);

      const securitySections = categorizedSections.filter(s => s.category === 'Security');
      const networkSections = categorizedSections.filter(s => s.category === 'Network');
      const systemSections = categorizedSections.filter(s => s.category === 'System');
      const appSections = categorizedSections.filter(s => s.category === 'Apps');

      expect(securitySections.length).toBeGreaterThanOrEqual(2);
      expect(networkSections.length).toBeGreaterThanOrEqual(1);
      expect(systemSections.length).toBeGreaterThanOrEqual(1);
      expect(appSections.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Section Hierarchy Preservation', () => {
    test('should maintain hierarchical structure with missing sections', async () => {
      const result = await dataService.loadAllData();

      // All sections should have required hierarchical properties
      result.sections.forEach(section => {
        expect(section).toHaveProperty('name');
        expect(section).toHaveProperty('identifier');
        expect(section).toHaveProperty('platforms');
        expect(section).toHaveProperty('deprecated');
        expect(section).toHaveProperty('parameters');
        expect(section).toHaveProperty('configurationIdentifiers');
        expect(section).toHaveProperty('rawTopicSection');
      });
    });

    test('should preserve original section ordering', async () => {
      const result = await dataService.loadAllData();
      const originalSections = result.sections.filter(s => !s.isSynthetic);

      // First few sections should match original order
      expect(originalSections[0].name).toBe('Top Level');
      expect(originalSections[1].name).toBe('Accounts');
      expect(originalSections[2].name).toBe('System Configuration');
    });

    test('should append synthetic sections after original sections', async () => {
      const result = await dataService.loadAllData();
      
      // Find the index of the first synthetic section
      const firstSyntheticIndex = result.sections.findIndex(s => s.isSynthetic);
      const lastOriginalIndex = result.sections.map(s => s.isSynthetic).lastIndexOf(false);

      expect(firstSyntheticIndex).toBeGreaterThan(lastOriginalIndex);
    });
  });

  describe('API Endpoint Generation', () => {
    test('should generate correct API endpoints for all sections', async () => {
      const result = await dataService.loadAllData();

      result.sections.forEach(section => {
        expect(section.apiEndpoint).toBe(
          `https://developer.apple.com/tutorials/data/documentation/devicemanagement/${section.identifier}.json`
        );
        expect(section.apiEndpoint).toMatch(/^https:\/\/developer\.apple\.com\/tutorials\/data\/documentation\/devicemanagement\/[a-z0-9]+\.json$/);
      });
    });

    test('should have unique API endpoints for all sections', async () => {
      const result = await dataService.loadAllData();
      const endpoints = result.sections.map(s => s.apiEndpoint);
      const uniqueEndpoints = [...new Set(endpoints)];

      expect(uniqueEndpoints).toHaveLength(endpoints.length);
    });
  });

  describe('Progress Logging Integration', () => {
    test('should log section processing progress', async () => {
      await dataService.loadAllData();

      expect(mockProgressService.log).toHaveBeenCalledWith(
        expect.stringMatching(/Processing \d+ topicSections/),
        'info'
      );
    });

    test('should log missing sections addition', async () => {
      await dataService.loadAllData();

      expect(mockProgressService.log).toHaveBeenCalledWith(
        expect.stringMatching(/Added \d+ known missing MDM sections/),
        'info'
      );
    });

    test('should log individual section creation', async () => {
      await dataService.loadAllData();

      expect(mockProgressService.log).toHaveBeenCalledWith(
        expect.stringMatching(/Created section: .+ \(.+\) from topicSection/),
        'info'
      );
    });

    test('should log individual missing section addition', async () => {
      await dataService.loadAllData();

      expect(mockProgressService.log).toHaveBeenCalledWith(
        'Added missing section: Firewall (Security)',
        'info'
      );
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle empty topicSections array', () => {
      const emptyMainSpec = { topicSections: [] };
      const sections = dataService.parseSections(emptyMainSpec);

      // Should still add missing sections even with empty original sections
      expect(sections.length).toBeGreaterThan(0);
      expect(sections.every(s => s.isSynthetic)).toBe(true);
    });

    test('should handle invalid topicSections gracefully', () => {
      const invalidMainSpec = {
        topicSections: [
          mockTopicSections.accounts, // Valid
          null, // Invalid
          { title: 'Invalid' }, // Missing identifiers
          undefined, // Invalid
          mockTopicSections.appStore // Valid
        ]
      };

      const sections = dataService.parseSections(invalidMainSpec);
      const originalSections = sections.filter(s => !s.isSynthetic);
      
      // Should process valid sections and skip invalid ones
      expect(originalSections.length).toBeLessThan(invalidMainSpec.topicSections.length);
      expect(sections.filter(s => s.isSynthetic).length).toBeGreaterThan(0);
    });

    test('should handle missing main spec structure', () => {
      expect(() => dataService.parseSections({})).toThrow('Invalid main specification structure');
      expect(() => dataService.parseSections({ topicSections: null })).toThrow();
      expect(() => dataService.parseSections({ topicSections: 'invalid' })).toThrow();
    });
  });

  describe('Regression Prevention', () => {
    test('should always include Firewall section', async () => {
      const result = await dataService.loadAllData();
      const firewallSection = result.sections.find(s => 
        s.name.toLowerCase().includes('firewall') || 
        s.identifier.toLowerCase().includes('firewall')
      );

      expect(firewallSection).toBeDefined();
      expect(firewallSection.name).toBe('Firewall');
      expect(firewallSection.category).toBe('Security');
      expect(firewallSection.priority).toBe('high');
    });

    test('should maintain minimum number of sections', async () => {
      const result = await dataService.loadAllData();
      
      // Should have at least original sections + high priority missing sections
      expect(result.totalSections).toBeGreaterThanOrEqual(mockMainSpec.topicSections.length + 4);
    });

    test('should preserve section structure consistency', async () => {
      const result = await dataService.loadAllData();

      // All sections should have consistent structure
      const requiredProperties = [
        'name', 'identifier', 'platforms', 'deprecated', 'parameters',
        'configurationIdentifiers', 'rawTopicSection', 'apiEndpoint'
      ];

      result.sections.forEach(section => {
        requiredProperties.forEach(prop => {
          expect(section).toHaveProperty(prop);
        });
      });
    });
  });
});
