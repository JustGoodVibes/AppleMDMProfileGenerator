/**
 * Unit Tests for Accounts Section Hierarchical Structure
 * Tests the specific fix for Accounts section sub-section creation
 */

import { jest } from '@jest/globals';
import { mockTopicSections, mockAppleIdentifiers, mockExpectedHierarchy } from '../mocks/appleApiData.js';

// Mock the progress service
const mockProgressService = global.testUtils.mockProgressService;

// Import the same MockDataService from the main test file
class MockDataService {
  extractConfigTypeFromIdentifier(identifier) {
    if (!identifier || typeof identifier !== 'string') {
      return null;
    }

    const docMatch = identifier.match(/\/DeviceManagement\/([^\/]+)$/);
    if (docMatch) {
      return docMatch[1];
    }

    const segments = identifier.split('/');
    const lastSegment = segments[segments.length - 1];

    const excludeSegments = ['DeviceManagement', 'documentation', 'com.apple.devicemanagement'];
    if (excludeSegments.includes(lastSegment)) {
      return null;
    }

    return lastSegment;
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
      configurationIdentifiers: topicSection.identifiers || [],
      rawData: topicSection
    };
  }

  formatConfigTypeName(configTypeName) {
    if (!configTypeName) return 'Unknown';
    return configTypeName.replace(/([A-Z])/g, ' $1').trim();
  }

  constructConfigTypeEndpoint(configTypeName) {
    return `https://developer.apple.com/tutorials/data/documentation/devicemanagement/${configTypeName}.json`;
  }

  createSubSectionsFromIdentifiers(topicSection, parentSection) {
    const subSections = [];

    if (!topicSection.identifiers || !Array.isArray(topicSection.identifiers)) {
      return subSections;
    }

    mockProgressService.log(`Processing ${topicSection.identifiers.length} identifiers for ${parentSection.name}`, 'info');

    topicSection.identifiers.forEach((identifier) => {
      try {
        const configTypeName = this.extractConfigTypeFromIdentifier(identifier);

        // CRITICAL FIX: Case-insensitive comparison to prevent parent section from becoming sub-section
        if (configTypeName && configTypeName.toLowerCase() !== parentSection.identifier.toLowerCase()) {
          const subSection = {
            name: this.formatConfigTypeName(configTypeName),
            identifier: configTypeName.toLowerCase(),
            description: `${configTypeName} configuration settings`,
            platforms: parentSection.platforms || [],
            deprecated: false,
            parameters: [],
            parentSection: parentSection.identifier,
            parentName: parentSection.name,
            isSubSection: true,
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
}

describe('Accounts Section - Hierarchical Structure', () => {
  let dataService;

  beforeEach(() => {
    dataService = new MockDataService();
    jest.clearAllMocks();
  });

  describe('Accounts TopicSection Processing', () => {
    test('should have correct structure in mock data', () => {
      const accountsTopicSection = mockTopicSections.accounts;
      
      expect(accountsTopicSection.title).toBe('Accounts');
      expect(accountsTopicSection.anchor).toBe('Accounts');
      expect(accountsTopicSection.identifiers).toHaveLength(7);
      expect(accountsTopicSection.identifiers[0]).toBe(mockAppleIdentifiers.accounts);
    });

    test('should extract correct config types from Accounts identifiers', () => {
      const accountsTopicSection = mockTopicSections.accounts;
      const extractedTypes = accountsTopicSection.identifiers.map(id => 
        dataService.extractConfigTypeFromIdentifier(id)
      );

      expect(extractedTypes).toEqual([
        'Accounts',
        'CalDAV', 
        'CardDAV',
        'GoogleAccount',
        'LDAP',
        'MobileAccounts',
        'SubscribedCalendars'
      ]);
    });
  });

  describe('Accounts Parent Section Creation', () => {
    test('should create parent section with lowercase identifier', () => {
      const parentSection = dataService.createSectionFromTopicSection(mockTopicSections.accounts, 0);
      
      expect(parentSection.name).toBe('Accounts');
      expect(parentSection.identifier).toBe('accounts'); // lowercase
      expect(parentSection.isSubSection).toBeUndefined(); // Not a sub-section
    });

    test('should preserve original case in title and anchor', () => {
      const parentSection = dataService.createSectionFromTopicSection(mockTopicSections.accounts, 0);
      
      expect(parentSection.title).toBe('Accounts'); // Original case
      expect(parentSection.anchor).toBe('Accounts'); // Original case
    });
  });

  describe('Accounts Sub-Section Creation', () => {
    test('should create exactly 6 sub-sections from 7 identifiers', () => {
      const parentSection = dataService.createSectionFromTopicSection(mockTopicSections.accounts, 0);
      const subSections = dataService.createSubSectionsFromIdentifiers(mockTopicSections.accounts, parentSection);
      
      // 7 identifiers - 1 parent (Accounts) = 6 sub-sections
      expect(subSections).toHaveLength(6);
    });

    test('should create all expected Accounts sub-sections', () => {
      const parentSection = dataService.createSectionFromTopicSection(mockTopicSections.accounts, 0);
      const subSections = dataService.createSubSectionsFromIdentifiers(mockTopicSections.accounts, parentSection);
      
      const subSectionIdentifiers = subSections.map(s => s.identifier).sort();
      const expectedIdentifiers = [
        'caldav',
        'carddav', 
        'googleaccount',
        'ldap',
        'mobileaccounts',
        'subscribedcalendars'
      ].sort();
      
      expect(subSectionIdentifiers).toEqual(expectedIdentifiers);
    });

    test('should NOT include parent "Accounts" as a sub-section', () => {
      const parentSection = dataService.createSectionFromTopicSection(mockTopicSections.accounts, 0);
      const subSections = dataService.createSubSectionsFromIdentifiers(mockTopicSections.accounts, parentSection);
      
      // Should not find any sub-section with identifier "accounts"
      const accountsSubSection = subSections.find(s => s.identifier === 'accounts');
      expect(accountsSubSection).toBeUndefined();
      
      // Should not find any sub-section with name exactly matching "Accounts"
      const accountsNameSubSection = subSections.find(s => s.name.toLowerCase() === 'accounts');
      expect(accountsNameSubSection).toBeUndefined();
    });

    test('should set correct hierarchical properties for all sub-sections', () => {
      const parentSection = dataService.createSectionFromTopicSection(mockTopicSections.accounts, 0);
      const subSections = dataService.createSubSectionsFromIdentifiers(mockTopicSections.accounts, parentSection);
      
      subSections.forEach(subSection => {
        expect(subSection.isSubSection).toBe(true);
        expect(subSection.parentSection).toBe('accounts');
        expect(subSection.parentName).toBe('Accounts');
        expect(subSection.platforms).toEqual(['iOS', 'macOS', 'tvOS', 'watchOS']);
        expect(subSection.configurationTypeIdentifier).toMatch(/^doc:\/\/com\.apple\.devicemanagement/);
        expect(subSection.apiEndpoint).toMatch(/^https:\/\/developer\.apple\.com/);
      });
    });
  });

  describe('Case-Insensitive Filtering Logic', () => {
    test('should handle case mismatch between parent identifier and config type', () => {
      // This is the core bug that was fixed
      const parentSection = {
        name: 'Accounts',
        identifier: 'accounts', // lowercase
        platforms: ['iOS', 'macOS', 'tvOS', 'watchOS']
      };

      const testTopicSection = {
        title: 'Accounts',
        identifiers: [
          'doc://com.apple.devicemanagement/documentation/DeviceManagement/Accounts', // uppercase "Accounts"
          'doc://com.apple.devicemanagement/documentation/DeviceManagement/CalDAV'
        ]
      };

      const subSections = dataService.createSubSectionsFromIdentifiers(testTopicSection, parentSection);
      
      // Should only create CalDAV sub-section, not Accounts
      expect(subSections).toHaveLength(1);
      expect(subSections[0].identifier).toBe('caldav');
    });

    test('should work with different case variations', () => {
      const testCases = [
        { parentId: 'accounts', configType: 'Accounts' },
        { parentId: 'ACCOUNTS', configType: 'accounts' },
        { parentId: 'Accounts', configType: 'ACCOUNTS' },
        { parentId: 'accounts', configType: 'ACCOUNTS' }
      ];

      testCases.forEach(({ parentId, configType }) => {
        const parentSection = {
          name: 'Test',
          identifier: parentId,
          platforms: []
        };

        const testTopicSection = {
          title: 'Test',
          identifiers: [
            `doc://com.apple.devicemanagement/documentation/DeviceManagement/${configType}`,
            'doc://com.apple.devicemanagement/documentation/DeviceManagement/Other'
          ]
        };

        const subSections = dataService.createSubSectionsFromIdentifiers(testTopicSection, parentSection);
        
        // Should only create "Other" sub-section, not the parent
        expect(subSections).toHaveLength(1);
        expect(subSections[0].identifier).toBe('other');
      });
    });
  });

  describe('Expected vs Actual Hierarchy Validation', () => {
    test('should match expected hierarchy structure', () => {
      const parentSection = dataService.createSectionFromTopicSection(mockTopicSections.accounts, 0);
      const subSections = dataService.createSubSectionsFromIdentifiers(mockTopicSections.accounts, parentSection);
      
      const expected = mockExpectedHierarchy.accounts;
      
      // Validate parent
      expect(parentSection.name).toBe(expected.parent.name);
      expect(parentSection.identifier).toBe(expected.parent.identifier);
      expect(parentSection.isSubSection || false).toBe(expected.parent.isSubSection);
      
      // Validate sub-sections count
      expect(subSections).toHaveLength(expected.subSections.length);
      
      // Validate each sub-section
      expected.subSections.forEach(expectedSub => {
        const actualSub = subSections.find(s => s.identifier === expectedSub.identifier);
        expect(actualSub).toBeDefined();
        expect(actualSub.parentSection).toBe(expectedSub.parentSection);
      });
    });
  });

  describe('Parameter Distribution', () => {
    test('should prepare for parameter distribution between parent and sub-sections', () => {
      const parentSection = dataService.createSectionFromTopicSection(mockTopicSections.accounts, 0);
      const subSections = dataService.createSubSectionsFromIdentifiers(mockTopicSections.accounts, parentSection);
      
      // Parent should have empty parameters array (to be populated later)
      expect(parentSection.parameters).toEqual([]);
      
      // Each sub-section should have empty parameters array (to be populated later)
      subSections.forEach(subSection => {
        expect(subSection.parameters).toEqual([]);
      });
      
      // Each sub-section should have API endpoint for loading its specific parameters
      subSections.forEach(subSection => {
        expect(subSection.apiEndpoint).toBeTruthy();
        expect(subSection.configurationTypeIdentifier).toBeTruthy();
      });
    });
  });
});
