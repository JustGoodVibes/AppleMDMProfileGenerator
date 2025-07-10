/**
 * Unit Tests for Firewall Section Functionality
 * Specific tests for the Firewall section since it was explicitly mentioned as missing
 */

import { jest } from '@jest/globals';

// Mock the dependencies
const mockProgressService = global.testUtils.mockProgressService;

// Create a mock DataService class for testing Firewall section specifically
class MockDataServiceFirewall {
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
   * Get the Firewall section definition
   */
  getFirewallSectionDefinition() {
    return {
      name: 'Firewall',
      identifier: 'firewall',
      description: 'Configure macOS firewall settings and rules',
      platforms: ['macOS'],
      category: 'Security',
      priority: 'high',
      identifiers: ['com.apple.security.firewall', 'Firewall']
    };
  }

  /**
   * Create Firewall section object
   */
  createFirewallSection() {
    const firewallDef = this.getFirewallSectionDefinition();
    
    return {
      name: firewallDef.name,
      identifier: firewallDef.identifier,
      description: firewallDef.description,
      platforms: firewallDef.platforms,
      deprecated: false,
      parameters: [],
      // Mark as synthetic section
      isSynthetic: true,
      category: firewallDef.category,
      priority: firewallDef.priority,
      // Store identifiers for parameter discovery
      configurationIdentifiers: firewallDef.identifiers,
      // Create synthetic topicSection for compatibility
      rawTopicSection: {
        title: firewallDef.name,
        anchor: firewallDef.identifier,
        identifiers: firewallDef.identifiers,
        abstract: firewallDef.description
      },
      // API endpoint for this section's JSON file
      apiEndpoint: this.constructSectionEndpoint(firewallDef.identifier)
    };
  }

  /**
   * Check if Firewall section exists in a list of sections
   */
  hasFirewallSection(sections) {
    if (!sections || !Array.isArray(sections)) {
      return false;
    }

    return sections.some(section => {
      if (!section) return false;

      const name = section.name || '';
      const identifier = section.identifier || '';

      return name.toLowerCase().includes('firewall') ||
             identifier.toLowerCase().includes('firewall') ||
             this.normalizeIdentifierForAPI(name) === 'firewall';
    });
  }

  /**
   * Find Firewall section in a list of sections
   */
  findFirewallSection(sections) {
    if (!sections || !Array.isArray(sections)) {
      return undefined;
    }

    return sections.find(section => {
      if (!section) return false;

      const name = section.name || '';
      const identifier = section.identifier || '';

      return name.toLowerCase().includes('firewall') ||
             identifier.toLowerCase().includes('firewall') ||
             this.normalizeIdentifierForAPI(name) === 'firewall';
    });
  }

  /**
   * Add known missing MDM sections (simplified for Firewall testing)
   */
  addKnownMissingSections(existingSections) {
    const missingSections = [];
    
    // Check if Firewall section exists
    if (!this.hasFirewallSection(existingSections)) {
      const firewallSection = this.createFirewallSection();
      missingSections.push(firewallSection);
      mockProgressService.log(`Added missing section: ${firewallSection.name} (${firewallSection.category})`, 'info');
    }

    return missingSections;
  }
}

describe('Firewall Section Functionality', () => {
  let dataService;

  beforeEach(() => {
    dataService = new MockDataServiceFirewall();
    jest.clearAllMocks();
  });

  describe('Firewall Section Definition', () => {
    test('should have correct Firewall section definition', () => {
      const firewallDef = dataService.getFirewallSectionDefinition();

      expect(firewallDef).toEqual({
        name: 'Firewall',
        identifier: 'firewall',
        description: 'Configure macOS firewall settings and rules',
        platforms: ['macOS'],
        category: 'Security',
        priority: 'high',
        identifiers: ['com.apple.security.firewall', 'Firewall']
      });
    });

    test('should create Firewall section with all required properties', () => {
      const firewallSection = dataService.createFirewallSection();

      expect(firewallSection).toMatchObject({
        name: 'Firewall',
        identifier: 'firewall',
        description: 'Configure macOS firewall settings and rules',
        platforms: ['macOS'],
        deprecated: false,
        isSynthetic: true,
        category: 'Security',
        priority: 'high'
      });

      expect(firewallSection.parameters).toEqual([]);
      expect(firewallSection.configurationIdentifiers).toEqual(['com.apple.security.firewall', 'Firewall']);
      expect(firewallSection.apiEndpoint).toBe('https://developer.apple.com/tutorials/data/documentation/devicemanagement/firewall.json');
    });

    test('should create valid rawTopicSection for Firewall', () => {
      const firewallSection = dataService.createFirewallSection();

      expect(firewallSection.rawTopicSection).toEqual({
        title: 'Firewall',
        anchor: 'firewall',
        identifiers: ['com.apple.security.firewall', 'Firewall'],
        abstract: 'Configure macOS firewall settings and rules'
      });
    });
  });

  describe('Firewall Section Detection', () => {
    test('should detect existing Firewall section by name', () => {
      const sections = [
        { name: 'Firewall', identifier: 'firewall' },
        { name: 'VPN', identifier: 'vpn' }
      ];

      expect(dataService.hasFirewallSection(sections)).toBe(true);
    });

    test('should detect existing Firewall section by identifier', () => {
      const sections = [
        { name: 'Security Firewall', identifier: 'firewall' },
        { name: 'VPN', identifier: 'vpn' }
      ];

      expect(dataService.hasFirewallSection(sections)).toBe(true);
    });

    test('should detect Firewall section case-insensitively', () => {
      const sections = [
        { name: 'firewall', identifier: 'security-firewall' },
        { name: 'VPN', identifier: 'vpn' }
      ];

      expect(dataService.hasFirewallSection(sections)).toBe(true);
    });

    test('should not detect Firewall when it does not exist', () => {
      const sections = [
        { name: 'VPN', identifier: 'vpn' },
        { name: 'DNS Settings', identifier: 'dnssettings' }
      ];

      expect(dataService.hasFirewallSection(sections)).toBe(false);
    });

    test('should find Firewall section correctly', () => {
      const sections = [
        { name: 'VPN', identifier: 'vpn' },
        { name: 'Firewall', identifier: 'firewall', category: 'Security' },
        { name: 'DNS Settings', identifier: 'dnssettings' }
      ];

      const firewallSection = dataService.findFirewallSection(sections);
      expect(firewallSection).toBeDefined();
      expect(firewallSection.name).toBe('Firewall');
      expect(firewallSection.category).toBe('Security');
    });
  });

  describe('Firewall Section Integration', () => {
    test('should add Firewall section when missing', () => {
      const existingSections = [
        { name: 'VPN', identifier: 'vpn' },
        { name: 'DNS Settings', identifier: 'dnssettings' }
      ];

      const missingSections = dataService.addKnownMissingSections(existingSections);

      expect(missingSections).toHaveLength(1);
      expect(missingSections[0].name).toBe('Firewall');
      expect(missingSections[0].isSynthetic).toBe(true);
    });

    test('should not add Firewall section when it already exists', () => {
      const existingSections = [
        { name: 'Firewall', identifier: 'firewall' },
        { name: 'VPN', identifier: 'vpn' }
      ];

      const missingSections = dataService.addKnownMissingSections(existingSections);

      expect(missingSections).toHaveLength(0);
    });

    test('should log when Firewall section is added', () => {
      const existingSections = [];
      dataService.addKnownMissingSections(existingSections);

      expect(mockProgressService.log).toHaveBeenCalledWith(
        'Added missing section: Firewall (Security)',
        'info'
      );
    });
  });

  describe('Firewall Section Properties Validation', () => {
    test('should have Security category', () => {
      const firewallSection = dataService.createFirewallSection();
      expect(firewallSection.category).toBe('Security');
    });

    test('should have high priority', () => {
      const firewallSection = dataService.createFirewallSection();
      expect(firewallSection.priority).toBe('high');
    });

    test('should support macOS platform only', () => {
      const firewallSection = dataService.createFirewallSection();
      expect(firewallSection.platforms).toEqual(['macOS']);
    });

    test('should have correct configuration identifiers', () => {
      const firewallSection = dataService.createFirewallSection();
      expect(firewallSection.configurationIdentifiers).toEqual([
        'com.apple.security.firewall',
        'Firewall'
      ]);
    });

    test('should be marked as synthetic', () => {
      const firewallSection = dataService.createFirewallSection();
      expect(firewallSection.isSynthetic).toBe(true);
    });

    test('should not be deprecated', () => {
      const firewallSection = dataService.createFirewallSection();
      expect(firewallSection.deprecated).toBe(false);
    });

    test('should have empty parameters array initially', () => {
      const firewallSection = dataService.createFirewallSection();
      expect(firewallSection.parameters).toEqual([]);
      expect(Array.isArray(firewallSection.parameters)).toBe(true);
    });

    test('should have correct API endpoint', () => {
      const firewallSection = dataService.createFirewallSection();
      expect(firewallSection.apiEndpoint).toBe(
        'https://developer.apple.com/tutorials/data/documentation/devicemanagement/firewall.json'
      );
    });
  });

  describe('Firewall Section Edge Cases', () => {
    test('should handle empty sections array', () => {
      expect(dataService.hasFirewallSection([])).toBe(false);
      expect(dataService.findFirewallSection([])).toBeUndefined();
    });

    test('should handle null/undefined sections', () => {
      expect(dataService.hasFirewallSection(null)).toBe(false);
      expect(dataService.hasFirewallSection(undefined)).toBe(false);
    });

    test('should handle sections with missing properties', () => {
      const sections = [
        { name: 'Firewall' }, // missing identifier
        { identifier: 'firewall' }, // missing name
        {} // empty object
      ];

      expect(dataService.hasFirewallSection(sections)).toBe(true);
    });

    test('should handle sections with null/undefined names and identifiers', () => {
      const sections = [
        { name: null, identifier: null },
        { name: undefined, identifier: undefined },
        { name: '', identifier: '' }
      ];

      expect(dataService.hasFirewallSection(sections)).toBe(false);
    });
  });
});
