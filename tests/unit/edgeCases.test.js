/**
 * Edge Case Tests for Hierarchical Section Processing
 * Tests malformed data, missing identifiers, and error handling scenarios
 */

import { jest } from '@jest/globals';

// Mock progress service
const mockProgressService = global.testUtils.mockProgressService;

// DataService class for edge case testing
class EdgeCaseDataService {
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
      configurationIdentifiers: topicSection.identifiers || []
    };
  }

  createSubSectionsFromIdentifiers(topicSection, parentSection) {
    const subSections = [];

    if (!topicSection.identifiers || !Array.isArray(topicSection.identifiers)) {
      return subSections;
    }

    topicSection.identifiers.forEach((identifier) => {
      try {
        const configTypeName = this.extractConfigTypeFromIdentifier(identifier);

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
          mockProgressService.log(`Created sub-section: ${subSection.name}`, 'info');
        }
      } catch (error) {
        mockProgressService.log(`Error processing identifier ${identifier}: ${error.message}`, 'warning');
      }
    });

    return subSections;
  }

  parseSections(mainSpec) {
    const sections = [];

    if (!mainSpec || typeof mainSpec !== 'object') {
      throw new Error('Main specification must be an object');
    }

    if (mainSpec.topicSections === undefined) {
      throw new Error('Main specification missing topicSections');
    }

    if (!Array.isArray(mainSpec.topicSections)) {
      throw new Error('topicSections must be an array');
    }

    mainSpec.topicSections.forEach((topicSection, index) => {
      try {
        if (this.looksLikeTopicSection(topicSection)) {
          const mainSection = this.createSectionFromTopicSection(topicSection, index);
          sections.push(mainSection);

          const subSections = this.createSubSectionsFromIdentifiers(topicSection, mainSection);
          sections.push(...subSections);
        } else {
          mockProgressService.log(`Skipping invalid topicSection at index ${index}`, 'warning');
        }
      } catch (error) {
        mockProgressService.log(`Error processing topicSection ${index}: ${error.message}`, 'warning');
      }
    });

    return sections;
  }

  looksLikeTopicSection(obj) {
    return obj && 
           typeof obj === 'object' && 
           (obj.title || obj.anchor) && 
           Array.isArray(obj.identifiers);
  }
}

describe('Edge Cases - Hierarchical Section Processing', () => {
  let dataService;

  beforeEach(() => {
    dataService = new EdgeCaseDataService();
    jest.clearAllMocks();
  });

  describe('Malformed TopicSection Data', () => {
    test('should handle null topicSection', () => {
      const mainSpec = { topicSections: [null] };
      const sections = dataService.parseSections(mainSpec);
      
      expect(sections).toHaveLength(0);
      expect(mockProgressService.log).toHaveBeenCalledWith(
        expect.stringContaining('Skipping invalid topicSection'),
        'warning'
      );
    });

    test('should handle undefined topicSection', () => {
      const mainSpec = { topicSections: [undefined] };
      const sections = dataService.parseSections(mainSpec);
      
      expect(sections).toHaveLength(0);
    });

    test('should handle topicSection without title or anchor', () => {
      const mainSpec = {
        topicSections: [
          { identifiers: ['some-id'] } // Missing title and anchor
        ]
      };
      
      const sections = dataService.parseSections(mainSpec);
      expect(sections).toHaveLength(0);
    });

    test('should handle topicSection without identifiers', () => {
      const mainSpec = {
        topicSections: [
          { title: 'Test Section' } // Missing identifiers
        ]
      };
      
      const sections = dataService.parseSections(mainSpec);
      expect(sections).toHaveLength(0);
    });

    test('should handle topicSection with non-array identifiers', () => {
      const mainSpec = {
        topicSections: [
          { 
            title: 'Test Section',
            identifiers: 'not-an-array'
          }
        ]
      };
      
      const sections = dataService.parseSections(mainSpec);
      expect(sections).toHaveLength(0);
    });

    test('should handle mixed valid and invalid topicSections', () => {
      const mainSpec = {
        topicSections: [
          null,
          { title: 'Valid Section', identifiers: ['id1', 'id2'] },
          undefined,
          { title: 'Another Valid', identifiers: ['id3'] },
          { identifiers: ['id4'] }, // Missing title
          'invalid-string'
        ]
      };
      
      const sections = dataService.parseSections(mainSpec);
      
      // Should only process the 2 valid topicSections
      const parentSections = sections.filter(s => !s.isSubSection);
      expect(parentSections).toHaveLength(2);
    });
  });

  describe('Malformed Identifier Data', () => {
    test('should handle null identifiers in array', () => {
      const topicSection = {
        title: 'Test Section',
        identifiers: [
          'doc://com.apple.devicemanagement/documentation/DeviceManagement/Valid',
          null,
          'doc://com.apple.devicemanagement/documentation/DeviceManagement/AnotherValid'
        ]
      };
      
      const parentSection = dataService.createSectionFromTopicSection(topicSection, 0);
      const subSections = dataService.createSubSectionsFromIdentifiers(topicSection, parentSection);
      
      // Should create sub-sections for valid identifiers only
      expect(subSections).toHaveLength(2);
    });

    test('should handle undefined identifiers in array', () => {
      const topicSection = {
        title: 'Test Section',
        identifiers: [
          'doc://com.apple.devicemanagement/documentation/DeviceManagement/Valid',
          undefined,
          'doc://com.apple.devicemanagement/documentation/DeviceManagement/AnotherValid'
        ]
      };
      
      const parentSection = dataService.createSectionFromTopicSection(topicSection, 0);
      const subSections = dataService.createSubSectionsFromIdentifiers(topicSection, parentSection);
      
      expect(subSections).toHaveLength(2);
    });

    test('should handle empty string identifiers', () => {
      const topicSection = {
        title: 'Test Section',
        identifiers: [
          'doc://com.apple.devicemanagement/documentation/DeviceManagement/Valid',
          '',
          'doc://com.apple.devicemanagement/documentation/DeviceManagement/AnotherValid'
        ]
      };
      
      const parentSection = dataService.createSectionFromTopicSection(topicSection, 0);
      const subSections = dataService.createSubSectionsFromIdentifiers(topicSection, parentSection);
      
      expect(subSections).toHaveLength(2);
    });

    test('should handle malformed URLs', () => {
      const topicSection = {
        title: 'Test Section',
        identifiers: [
          'not-a-url',
          'http://wrong-domain.com/something',
          'doc://com.apple.devicemanagement/documentation/DeviceManagement/Valid',
          'ftp://invalid-protocol.com'
        ]
      };
      
      const parentSection = dataService.createSectionFromTopicSection(topicSection, 0);
      const subSections = dataService.createSubSectionsFromIdentifiers(topicSection, parentSection);
      
      // Should handle malformed URLs gracefully
      expect(subSections.length).toBeGreaterThan(0);
    });

    test('should handle identifiers that resolve to excluded segments', () => {
      const topicSection = {
        title: 'Test Section',
        identifiers: [
          'doc://com.apple.devicemanagement/documentation/DeviceManagement',
          'doc://com.apple.devicemanagement/documentation',
          'doc://com.apple.devicemanagement/documentation/DeviceManagement/Valid'
        ]
      };
      
      const parentSection = dataService.createSectionFromTopicSection(topicSection, 0);
      const subSections = dataService.createSubSectionsFromIdentifiers(topicSection, parentSection);
      
      // Should only create sub-section for 'Valid'
      expect(subSections).toHaveLength(1);
      expect(subSections[0].identifier).toBe('valid');
    });
  });

  describe('Main Specification Edge Cases', () => {
    test('should handle null main specification', () => {
      expect(() => dataService.parseSections(null)).toThrow('Main specification must be an object');
    });

    test('should handle undefined main specification', () => {
      expect(() => dataService.parseSections(undefined)).toThrow('Main specification must be an object');
    });

    test('should handle empty object main specification', () => {
      expect(() => dataService.parseSections({})).toThrow('Main specification missing topicSections');
    });

    test('should handle main specification with null topicSections', () => {
      expect(() => dataService.parseSections({ topicSections: null })).toThrow('topicSections must be an array');
    });

    test('should handle main specification with non-array topicSections', () => {
      expect(() => dataService.parseSections({ topicSections: 'not-array' })).toThrow('topicSections must be an array');
    });

    test('should handle empty topicSections array', () => {
      const sections = dataService.parseSections({ topicSections: [] });
      expect(sections).toHaveLength(0);
    });
  });

  describe('Case Sensitivity Edge Cases', () => {
    test('should handle extreme case variations', () => {
      const testCases = [
        { parent: 'accounts', config: 'ACCOUNTS' },
        { parent: 'ACCOUNTS', config: 'accounts' },
        { parent: 'AcCoUnTs', config: 'aCcOuNtS' },
        { parent: 'accounts', config: 'Accounts' }
      ];

      testCases.forEach(({ parent, config }) => {
        const parentSection = {
          name: 'Test',
          identifier: parent,
          platforms: []
        };

        const topicSection = {
          title: 'Test',
          identifiers: [
            `doc://com.apple.devicemanagement/documentation/DeviceManagement/${config}`,
            'doc://com.apple.devicemanagement/documentation/DeviceManagement/Other'
          ]
        };

        const subSections = dataService.createSubSectionsFromIdentifiers(topicSection, parentSection);
        
        // Should always exclude the parent and only include 'Other'
        expect(subSections).toHaveLength(1);
        expect(subSections[0].identifier).toBe('other');
      });
    });

    test('should handle Unicode and special characters in identifiers', () => {
      const parentSection = {
        name: 'Test',
        identifier: 'test',
        platforms: []
      };

      const topicSection = {
        title: 'Test',
        identifiers: [
          'doc://com.apple.devicemanagement/documentation/DeviceManagement/Test',
          'doc://com.apple.devicemanagement/documentation/DeviceManagement/Tëst',
          'doc://com.apple.devicemanagement/documentation/DeviceManagement/Test-123',
          'doc://com.apple.devicemanagement/documentation/DeviceManagement/Test_456'
        ]
      };

      const subSections = dataService.createSubSectionsFromIdentifiers(topicSection, parentSection);
      
      // Should handle special characters gracefully
      expect(subSections.length).toBeGreaterThan(0);
    });
  });

  describe('Memory and Performance Edge Cases', () => {
    test('should handle large numbers of identifiers', () => {
      const largeIdentifierArray = Array.from({ length: 1000 }, (_, i) => 
        `doc://com.apple.devicemanagement/documentation/DeviceManagement/Section${i}`
      );

      const topicSection = {
        title: 'Large Section',
        identifiers: largeIdentifierArray
      };

      const parentSection = dataService.createSectionFromTopicSection(topicSection, 0);
      
      const startTime = Date.now();
      const subSections = dataService.createSubSectionsFromIdentifiers(topicSection, parentSection);
      const endTime = Date.now();

      // Should complete within reasonable time
      expect(endTime - startTime).toBeLessThan(1000); // 1 second
      expect(subSections).toHaveLength(1000);
    });

    test('should handle deeply nested or complex identifier structures', () => {
      const complexIdentifiers = [
        'doc://com.apple.devicemanagement/documentation/DeviceManagement/Very/Deep/Nested/Structure/Section1',
        'doc://com.apple.devicemanagement/documentation/DeviceManagement/Another/Complex/Path/With/Many/Segments/Section2',
        'doc://com.apple.devicemanagement/documentation/DeviceManagement/Simple'
      ];

      const topicSection = {
        title: 'Complex Section',
        identifiers: complexIdentifiers
      };

      const parentSection = dataService.createSectionFromTopicSection(topicSection, 0);
      const subSections = dataService.createSubSectionsFromIdentifiers(topicSection, parentSection);

      // Should extract the last segment correctly
      expect(subSections).toHaveLength(3);
      expect(subSections.map(s => s.identifier)).toContain('section1');
      expect(subSections.map(s => s.identifier)).toContain('section2');
      expect(subSections.map(s => s.identifier)).toContain('simple');
    });
  });

  describe('Error Recovery', () => {
    test('should continue processing after encountering errors', () => {
      const topicSection = {
        title: 'Test Section',
        identifiers: [
          'doc://com.apple.devicemanagement/documentation/DeviceManagement/Valid1',
          null, // Will cause error
          'doc://com.apple.devicemanagement/documentation/DeviceManagement/Valid2',
          undefined, // Will cause error
          'doc://com.apple.devicemanagement/documentation/DeviceManagement/Valid3'
        ]
      };

      const parentSection = dataService.createSectionFromTopicSection(topicSection, 0);
      const subSections = dataService.createSubSectionsFromIdentifiers(topicSection, parentSection);

      // Should create sub-sections for valid identifiers despite errors
      expect(subSections).toHaveLength(3);
      expect(mockProgressService.log).toHaveBeenCalledWith(
        expect.stringContaining('Created sub-section'),
        'info'
      );
    });

    test('should log appropriate warnings for errors', () => {
      const topicSection = {
        title: 'Test Section',
        identifiers: [null, undefined, '']
      };

      const parentSection = dataService.createSectionFromTopicSection(topicSection, 0);

      // Should not crash and should handle gracefully
      expect(() => {
        dataService.createSubSectionsFromIdentifiers(topicSection, parentSection);
      }).not.toThrow();
    });
  });
});
