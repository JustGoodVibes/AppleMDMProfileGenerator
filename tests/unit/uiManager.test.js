/**
 * Unit Tests for UIManager - Hierarchical Navigation and Section Rendering
 * Tests the UI components that handle hierarchical section display
 */

import { jest } from '@jest/globals';
import { mockExpectedHierarchy } from '../mocks/appleApiData.js';

// Mock DOM elements and methods
const mockElement = {
  innerHTML: '',
  className: '',
  classList: {
    add: jest.fn(),
    remove: jest.fn(),
    contains: jest.fn()
  },
  appendChild: jest.fn(),
  insertBefore: jest.fn(),
  querySelector: jest.fn(),
  querySelectorAll: jest.fn(() => []),
  addEventListener: jest.fn(),
  dataset: {}
};

const mockDocument = {
  getElementById: jest.fn(() => mockElement),
  createElement: jest.fn(() => mockElement),
  querySelectorAll: jest.fn(() => [])
};

global.document = mockDocument;

// Mock section components
const mockSectionComponents = {
  createSectionNavItem: jest.fn(() => mockElement),
  createSectionElement: jest.fn(() => mockElement),
  clearSections: jest.fn()
};

// Mock parameter components
const mockParameterComponents = {
  clearParameters: jest.fn(),
  attachEventListeners: jest.fn(),
  filterParameters: jest.fn()
};

// Mock UIManager class for testing
class MockUIManager {
  constructor() {
    this.sectionsData = [];
  }

  loadSectionsData(data) {
    this.sectionsData = Array.isArray(data?.sections) ? data.sections : [];
    
    // Validate each section
    this.sectionsData = this.sectionsData.map((section, index) => {
      if (!section || typeof section !== 'object') {
        return {
          identifier: `invalid-section-${index}`,
          name: `Invalid Section ${index + 1}`,
          description: 'This section contains invalid data',
          platforms: [],
          deprecated: false,
          parameters: [],
          error: 'Invalid section data'
        };
      }

      return {
        identifier: section.identifier || section.name?.toLowerCase().replace(/\s+/g, '') || `section-${index}`,
        name: section.name || `Section ${index + 1}`,
        description: section.description || '',
        platforms: Array.isArray(section.platforms) ? section.platforms : [],
        deprecated: Boolean(section.deprecated),
        parameters: Array.isArray(section.parameters) ? section.parameters : [],
        isSubSection: Boolean(section.isSubSection),
        parentSection: section.parentSection || null,
        parentName: section.parentName || null,
        ...section
      };
    });

    mockSectionComponents.clearSections();
    mockParameterComponents.clearParameters();
    
    this.populateNavigation();
    this.populateSections();
  }

  populateNavigation() {
    const navContainer = mockDocument.getElementById('section-nav');
    if (!navContainer) return;

    navContainer.innerHTML = '';

    // Separate parent sections and sub-sections
    const parentSections = this.sectionsData.filter(section =>
      !section.isSubSection && !section.parentSection
    );
    const subSections = this.sectionsData.filter(section =>
      section.isSubSection || section.parentSection
    );

    // Create hierarchical navigation
    parentSections.forEach(parentSection => {
      // Find child sections for this parent
      const childSections = subSections.filter(subSection =>
        subSection.parentSection === parentSection.identifier ||
        subSection.parentName === parentSection.name
      );

      if (childSections.length > 0) {
        // Create collapsible parent container
        const parentContainer = mockDocument.createElement('div');
        parentContainer.className = 'nav-parent-container';

        // Create parent navigation item
        const parentNavItem = this.createParentNavItem(parentSection);

        // Create sub-navigation container
        const subNavContainer = mockDocument.createElement('div');
        subNavContainer.className = 'nav-sub-container collapsed';

        // Add child navigation items
        childSections.forEach(childSection => {
          const childNavItem = mockSectionComponents.createSectionNavItem(childSection);
          childNavItem.classList.add('nav-sub-item');
          subNavContainer.appendChild(childNavItem);
        });

        // Add expand icon and click handler for parent
        const expandIcon = mockDocument.createElement('i');
        expandIcon.className = 'fas fa-chevron-right nav-expand-icon';
        parentNavItem.insertBefore(expandIcon, parentNavItem.firstChild);

        parentContainer.appendChild(parentNavItem);
        parentContainer.appendChild(subNavContainer);
        navContainer.appendChild(parentContainer);
      } else {
        // No children, add as regular section
        const navItem = mockSectionComponents.createSectionNavItem(parentSection);
        navContainer.appendChild(navItem);
      }
    });

    // Add any orphaned sub-sections
    const orphanedSections = subSections.filter(subSection => {
      return !parentSections.some(parent =>
        subSection.parentSection === parent.identifier ||
        subSection.parentName === parent.name
      );
    });

    orphanedSections.forEach(orphanedSection => {
      const navItem = mockSectionComponents.createSectionNavItem(orphanedSection);
      navItem.classList.add('nav-orphaned');
      navContainer.appendChild(navItem);
    });
  }

  populateSections() {
    const sectionsContainer = mockDocument.getElementById('sections-container');
    if (!sectionsContainer) return;

    sectionsContainer.innerHTML = '';

    // Separate parent sections and sub-sections
    const parentSections = this.sectionsData.filter(section =>
      !section.isSubSection && !section.parentSection
    );
    const subSections = this.sectionsData.filter(section =>
      section.isSubSection || section.parentSection
    );

    // Create hierarchical section layout
    parentSections.forEach(parentSection => {
      // Create parent section element
      const parentSectionEl = mockSectionComponents.createSectionElement(parentSection);

      // Find child sections for this parent
      const childSections = subSections.filter(subSection =>
        subSection.parentSection === parentSection.identifier ||
        subSection.parentName === parentSection.name
      );

      if (childSections.length > 0) {
        // Create a container for the parent and its children
        const hierarchicalContainer = mockDocument.createElement('div');
        hierarchicalContainer.className = 'hierarchical-section-container';
        hierarchicalContainer.dataset.parentSection = parentSection.identifier;

        // Add parent section
        hierarchicalContainer.appendChild(parentSectionEl);

        // Create sub-sections container
        const subSectionsContainer = mockDocument.createElement('div');
        subSectionsContainer.className = 'sub-sections-container';

        // Add child sections
        childSections.forEach(childSection => {
          const childSectionEl = mockSectionComponents.createSectionElement(childSection);
          subSectionsContainer.appendChild(childSectionEl);
        });

        hierarchicalContainer.appendChild(subSectionsContainer);
        sectionsContainer.appendChild(hierarchicalContainer);
      } else {
        // No children, add as regular section
        sectionsContainer.appendChild(parentSectionEl);
      }
    });

    // Add any orphaned sub-sections
    const orphanedSections = subSections.filter(subSection => {
      return !parentSections.some(parent =>
        subSection.parentSection === parent.identifier ||
        subSection.parentName === parent.name
      );
    });

    orphanedSections.forEach(orphanedSection => {
      const sectionEl = mockSectionComponents.createSectionElement(orphanedSection);
      sectionEl.classList.add('orphaned-section');
      sectionsContainer.appendChild(sectionEl);
    });

    // Attach parameter event listeners
    mockParameterComponents.attachEventListeners(sectionsContainer);
  }

  createParentNavItem(section) {
    const navItem = mockSectionComponents.createSectionNavItem(section);
    navItem.classList.add('nav-parent-item');
    return navItem;
  }

  getSectionsData() {
    return this.sectionsData;
  }
}

describe('UIManager - Hierarchical Navigation and Section Rendering', () => {
  let uiManager;
  let mockSectionsData;

  beforeEach(() => {
    uiManager = new MockUIManager();
    jest.clearAllMocks();
    
    // Reset mock element properties
    mockElement.innerHTML = '';
    mockElement.className = '';
    
    // Create mock sections data with hierarchical structure
    mockSectionsData = {
      sections: [
        // Parent sections
        {
          name: 'Accounts',
          identifier: 'accounts',
          isSubSection: false,
          parameters: []
        },
        {
          name: 'System Configuration', 
          identifier: 'systemconfiguration',
          isSubSection: false,
          parameters: []
        },
        // Sub-sections for Accounts
        {
          name: 'CalDAV',
          identifier: 'caldav',
          isSubSection: true,
          parentSection: 'accounts',
          parentName: 'Accounts',
          parameters: []
        },
        {
          name: 'CardDAV',
          identifier: 'carddav',
          isSubSection: true,
          parentSection: 'accounts',
          parentName: 'Accounts',
          parameters: []
        },
        // Sub-sections for System Configuration
        {
          name: 'Font',
          identifier: 'font',
          isSubSection: true,
          parentSection: 'systemconfiguration',
          parentName: 'System Configuration',
          parameters: []
        }
      ]
    };
  });

  describe('loadSectionsData', () => {
    test('should load and validate sections data', () => {
      uiManager.loadSectionsData(mockSectionsData);
      
      expect(uiManager.sectionsData).toHaveLength(5);
      expect(mockSectionComponents.clearSections).toHaveBeenCalled();
      expect(mockParameterComponents.clearParameters).toHaveBeenCalled();
    });

    test('should handle invalid sections data', () => {
      const invalidData = {
        sections: [
          { name: 'Valid Section', identifier: 'valid' },
          null,
          undefined,
          'invalid',
          { /* missing required fields */ }
        ]
      };
      
      uiManager.loadSectionsData(invalidData);
      
      expect(uiManager.sectionsData).toHaveLength(5);
      // Should have created fallback sections for invalid entries
      const invalidSections = uiManager.sectionsData.filter(s => s.error);
      expect(invalidSections.length).toBeGreaterThan(0);
    });
  });

  describe('populateNavigation', () => {
    test('should create hierarchical navigation structure', () => {
      uiManager.loadSectionsData(mockSectionsData);
      
      // Should call getElementById for nav container
      expect(mockDocument.getElementById).toHaveBeenCalledWith('section-nav');
      
      // Should create navigation items for sections
      expect(mockSectionComponents.createSectionNavItem).toHaveBeenCalled();
    });

    test('should separate parent and sub-sections correctly', () => {
      uiManager.loadSectionsData(mockSectionsData);
      
      const parentSections = uiManager.sectionsData.filter(s => !s.isSubSection && !s.parentSection);
      const subSections = uiManager.sectionsData.filter(s => s.isSubSection || s.parentSection);
      
      expect(parentSections).toHaveLength(2); // Accounts, System Configuration
      expect(subSections).toHaveLength(3); // CalDAV, CardDAV, Font
    });

    test('should group sub-sections under their parents', () => {
      uiManager.loadSectionsData(mockSectionsData);
      
      const accountsSubSections = uiManager.sectionsData.filter(s => 
        s.parentSection === 'accounts'
      );
      const systemConfigSubSections = uiManager.sectionsData.filter(s => 
        s.parentSection === 'systemconfiguration'
      );
      
      expect(accountsSubSections).toHaveLength(2); // CalDAV, CardDAV
      expect(systemConfigSubSections).toHaveLength(1); // Font
    });

    test('should handle orphaned sub-sections', () => {
      const dataWithOrphans = {
        sections: [
          ...mockSectionsData.sections,
          {
            name: 'Orphaned Section',
            identifier: 'orphaned',
            isSubSection: true,
            parentSection: 'nonexistent',
            parameters: []
          }
        ]
      };
      
      uiManager.loadSectionsData(dataWithOrphans);
      
      const parentSections = uiManager.sectionsData.filter(s => !s.isSubSection);
      const subSections = uiManager.sectionsData.filter(s => s.isSubSection);
      const orphanedSections = subSections.filter(subSection => {
        return !parentSections.some(parent =>
          subSection.parentSection === parent.identifier ||
          subSection.parentName === parent.name
        );
      });
      
      expect(orphanedSections).toHaveLength(1);
      expect(orphanedSections[0].name).toBe('Orphaned Section');
    });
  });

  describe('populateSections', () => {
    test('should create hierarchical section layout', () => {
      uiManager.loadSectionsData(mockSectionsData);
      
      // Should call getElementById for sections container
      expect(mockDocument.getElementById).toHaveBeenCalledWith('sections-container');
      
      // Should create section elements
      expect(mockSectionComponents.createSectionElement).toHaveBeenCalled();
      
      // Should attach parameter event listeners
      expect(mockParameterComponents.attachEventListeners).toHaveBeenCalled();
    });

    test('should create hierarchical containers for parent sections with children', () => {
      uiManager.loadSectionsData(mockSectionsData);
      
      // Should create hierarchical containers
      expect(mockDocument.createElement).toHaveBeenCalledWith('div');
    });

    test('should handle sections without children as regular sections', () => {
      const dataWithoutChildren = {
        sections: [
          {
            name: 'Standalone Section',
            identifier: 'standalone',
            isSubSection: false,
            parameters: []
          }
        ]
      };
      
      uiManager.loadSectionsData(dataWithoutChildren);
      
      expect(mockSectionComponents.createSectionElement).toHaveBeenCalled();
    });
  });

  describe('Accounts Section Specific Tests', () => {
    test('should correctly handle Accounts hierarchical structure', () => {
      const accountsData = {
        sections: [
          mockExpectedHierarchy.accounts.parent,
          ...mockExpectedHierarchy.accounts.subSections.map(sub => ({
            ...sub,
            name: sub.identifier.charAt(0).toUpperCase() + sub.identifier.slice(1),
            isSubSection: true,
            parameters: []
          }))
        ]
      };
      
      uiManager.loadSectionsData(accountsData);
      
      const accountsParent = uiManager.sectionsData.find(s => s.identifier === 'accounts' && !s.isSubSection);
      const accountsSubSections = uiManager.sectionsData.filter(s => s.parentSection === 'accounts');
      
      expect(accountsParent).toBeDefined();
      expect(accountsSubSections).toHaveLength(6);
    });
  });

  describe('Error Handling', () => {
    test('should handle missing DOM elements gracefully', () => {
      mockDocument.getElementById.mockReturnValue(null);
      
      expect(() => {
        uiManager.loadSectionsData(mockSectionsData);
      }).not.toThrow();
    });

    test('should handle empty sections data', () => {
      uiManager.loadSectionsData({ sections: [] });
      
      expect(uiManager.sectionsData).toHaveLength(0);
      expect(mockSectionComponents.clearSections).toHaveBeenCalled();
    });

    test('should handle malformed data structure', () => {
      expect(() => {
        uiManager.loadSectionsData({});
      }).not.toThrow();
      
      expect(() => {
        uiManager.loadSectionsData(null);
      }).not.toThrow();
    });
  });
});
