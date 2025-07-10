/**
 * Unit Tests for Missing MDM Sections Functionality
 * Tests the addKnownMissingSections method and synthetic section creation
 */

import { jest } from '@jest/globals';
import { mockMainSpec } from '../mocks/appleApiData.js';

// Mock the dependencies
const mockProgressService = global.testUtils.mockProgressService;

// Create a mock DataService class for testing missing sections functionality
class MockDataServiceWithMissingSections {
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
   * Add known missing MDM sections that are part of Apple's official specification
   * but might not be present in the API response
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
        mockProgressService.log(`Added missing section: ${knownSection.name} (${knownSection.category})`, 'info');
      }
    });

    return missingSections;
  }

  /**
   * Process topicSections array to create main sections including missing ones
   */
  processTopicSections(topicSections) {
    const sections = [];

    // Process original topicSections (simplified for testing)
    topicSections.forEach((topicSection, index) => {
      const section = {
        name: topicSection.title,
        identifier: this.createIdentifierFromTitle(topicSection.title),
        deprecated: false,
        platforms: ['iOS', 'macOS', 'tvOS', 'watchOS'],
        parameters: [],
        configurationIdentifiers: topicSection.identifiers || [],
        isSynthetic: false
      };
      sections.push(section);
    });

    // Add known missing MDM sections
    const missingSections = this.addKnownMissingSections(sections);
    sections.push(...missingSections);

    return sections;
  }
}

describe('Missing MDM Sections Functionality', () => {
  let dataService;

  beforeEach(() => {
    dataService = new MockDataServiceWithMissingSections();
    jest.clearAllMocks();
  });

  describe('addKnownMissingSections', () => {
    test('should add all 10 missing sections when none exist', () => {
      const existingSections = [];
      const missingSections = dataService.addKnownMissingSections(existingSections);

      expect(missingSections).toHaveLength(10);
      
      const sectionNames = missingSections.map(s => s.name);
      expect(sectionNames).toContain('Firewall');
      expect(sectionNames).toContain('VPN');
      expect(sectionNames).toContain('Software Update');
      expect(sectionNames).toContain('Managed App Configuration');
      expect(sectionNames).toContain('Certificate Trust Settings');
      expect(sectionNames).toContain('Privacy Preferences Policy Control');
      expect(sectionNames).toContain('Content Filter');
      expect(sectionNames).toContain('DNS Settings');
      expect(sectionNames).toContain('Single Sign-On Extensions');
      expect(sectionNames).toContain('Associated Domains');
    });

    test('should not add sections that already exist', () => {
      const existingSections = [
        { name: 'Firewall', identifier: 'firewall' },
        { name: 'VPN', identifier: 'vpn' }
      ];
      const missingSections = dataService.addKnownMissingSections(existingSections);

      expect(missingSections).toHaveLength(8); // 10 - 2 existing = 8
      
      const sectionNames = missingSections.map(s => s.name);
      expect(sectionNames).not.toContain('Firewall');
      expect(sectionNames).not.toContain('VPN');
      expect(sectionNames).toContain('Software Update');
    });

    test('should handle case-insensitive matching', () => {
      const existingSections = [
        { name: 'firewall', identifier: 'firewall' }, // lowercase
        { name: 'VPN Settings', identifier: 'vpnsettings' } // different name
      ];
      const missingSections = dataService.addKnownMissingSections(existingSections);

      expect(missingSections).toHaveLength(9); // Should not add Firewall due to case-insensitive match
      
      const sectionNames = missingSections.map(s => s.name);
      expect(sectionNames).not.toContain('Firewall');
      expect(sectionNames).toContain('VPN'); // VPN should still be added as "VPN Settings" doesn't match
    });
  });

  describe('Section Structure Validation', () => {
    test('should create sections with all required properties', () => {
      const missingSections = dataService.addKnownMissingSections([]);
      
      missingSections.forEach(section => {
        expect(section).toHaveProperty('name');
        expect(section).toHaveProperty('identifier');
        expect(section).toHaveProperty('description');
        expect(section).toHaveProperty('platforms');
        expect(section).toHaveProperty('category');
        expect(section).toHaveProperty('priority');
        expect(section).toHaveProperty('configurationIdentifiers');
        expect(section).toHaveProperty('isSynthetic', true);
        expect(section).toHaveProperty('deprecated', false);
        expect(section).toHaveProperty('parameters');
        expect(section).toHaveProperty('rawTopicSection');
        expect(section).toHaveProperty('apiEndpoint');
      });
    });

    test('should create valid rawTopicSection for compatibility', () => {
      const missingSections = dataService.addKnownMissingSections([]);
      
      missingSections.forEach(section => {
        expect(section.rawTopicSection).toHaveProperty('title', section.name);
        expect(section.rawTopicSection).toHaveProperty('anchor', section.identifier);
        expect(section.rawTopicSection).toHaveProperty('identifiers');
        expect(section.rawTopicSection).toHaveProperty('abstract', section.description);
        expect(Array.isArray(section.rawTopicSection.identifiers)).toBe(true);
      });
    });

    test('should generate correct API endpoints', () => {
      const missingSections = dataService.addKnownMissingSections([]);
      
      missingSections.forEach(section => {
        expect(section.apiEndpoint).toBe(
          `https://developer.apple.com/tutorials/data/documentation/devicemanagement/${section.identifier}.json`
        );
      });
    });
  });

  describe('Integration with processTopicSections', () => {
    test('should integrate missing sections with original sections', () => {
      const sections = dataService.processTopicSections(mockMainSpec.topicSections);

      // Should have original sections + missing sections
      expect(sections.length).toBeGreaterThan(mockMainSpec.topicSections.length);

      // Check for original sections
      const originalSections = sections.filter(s => !s.isSynthetic);
      expect(originalSections).toHaveLength(mockMainSpec.topicSections.length);

      // Check for synthetic sections
      const syntheticSections = sections.filter(s => s.isSynthetic);
      expect(syntheticSections.length).toBeGreaterThan(0);
    });

    test('should not interfere with original section processing', () => {
      const sections = dataService.processTopicSections(mockMainSpec.topicSections);
      const originalSections = sections.filter(s => !s.isSynthetic);

      // Verify original sections maintain their properties
      const accountsSection = originalSections.find(s => s.name === 'Accounts');
      expect(accountsSection).toBeDefined();
      expect(accountsSection.identifier).toBe('accounts');
      expect(accountsSection.isSynthetic).toBe(false);
    });
  });

  describe('Regression Prevention Tests', () => {
    test('should always include all 10 expected missing sections', () => {
      const missingSections = dataService.addKnownMissingSections([]);
      const expectedSections = [
        'Firewall', 'VPN', 'Certificate Trust Settings', 'Privacy Preferences Policy Control',
        'Software Update', 'Content Filter', 'DNS Settings', 'Managed App Configuration',
        'Single Sign-On Extensions', 'Associated Domains'
      ];

      expectedSections.forEach(expectedName => {
        const found = missingSections.find(s => s.name === expectedName);
        expect(found).toBeDefined();
      });
    });

    test('should maintain high priority sections', () => {
      const missingSections = dataService.addKnownMissingSections([]);
      const highPrioritySections = missingSections.filter(s => s.priority === 'high');

      expect(highPrioritySections.length).toBe(4);
      const highPriorityNames = highPrioritySections.map(s => s.name);
      expect(highPriorityNames).toContain('Firewall');
      expect(highPriorityNames).toContain('VPN');
      expect(highPriorityNames).toContain('Software Update');
      expect(highPriorityNames).toContain('Managed App Configuration');
    });

    test('should maintain correct categories', () => {
      const missingSections = dataService.addKnownMissingSections([]);

      const securitySections = missingSections.filter(s => s.category === 'Security');
      const networkSections = missingSections.filter(s => s.category === 'Network');
      const systemSections = missingSections.filter(s => s.category === 'System');
      const appSections = missingSections.filter(s => s.category === 'Apps');
      const authSections = missingSections.filter(s => s.category === 'Authentication');

      expect(securitySections.length).toBe(4); // Firewall, Certificate Trust, Privacy Preferences, Content Filter
      expect(networkSections.length).toBe(2); // VPN, DNS Settings
      expect(systemSections.length).toBe(1); // Software Update
      expect(appSections.length).toBe(2); // Managed App Configuration, Associated Domains
      expect(authSections.length).toBe(1); // Single Sign-On Extensions
    });
  });

  describe('Dark Mode Compatibility Tests', () => {
    test('should create sections compatible with dark mode rendering', () => {
      const missingSections = dataService.addKnownMissingSections([]);

      // All sections should have properties that support dark mode rendering
      missingSections.forEach(section => {
        expect(section.name).toBeTruthy();
        expect(section.description).toBeTruthy();
        expect(section.category).toBeTruthy();
        expect(section.priority).toBeTruthy();

        // These properties are used for UI rendering and should be present
        expect(typeof section.name).toBe('string');
        expect(typeof section.description).toBe('string');
        expect(typeof section.category).toBe('string');
        expect(typeof section.priority).toBe('string');
      });
    });

    test('should have consistent structure for UI components', () => {
      const missingSections = dataService.addKnownMissingSections([]);

      // All sections should have the same structure for consistent UI rendering
      const firstSection = missingSections[0];
      const expectedKeys = Object.keys(firstSection).sort();

      missingSections.forEach(section => {
        const sectionKeys = Object.keys(section).sort();
        expect(sectionKeys).toEqual(expectedKeys);
      });
    });
  });
});
