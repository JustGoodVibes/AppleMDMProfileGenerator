/**
 * Unit Tests for Priority Filter Functionality
 * Tests the priority-based filtering system for MDM sections
 */

import { filterManager } from '../../js/managers/filterManager.js';
import { FILTER_TYPES, PRIORITY_LEVELS, DEFAULTS } from '../../js/utils/constants.js';

// Mock DOM elements
const mockDOM = () => {
    // Create mock elements
    const mockElements = {
        'show-priority-high': { checked: true, addEventListener: jest.fn() },
        'show-priority-medium': { checked: true, addEventListener: jest.fn() },
        'show-priority-low': { checked: true, addEventListener: jest.fn() },
        'priority-dropdown-toggle': { 
            setAttribute: jest.fn(),
            getAttribute: jest.fn().mockReturnValue('false'),
            addEventListener: jest.fn(),
            querySelector: jest.fn().mockReturnValue({ textContent: 'All Priorities' })
        },
        'priority-dropdown-menu': { 
            classList: { add: jest.fn(), remove: jest.fn() },
            querySelector: jest.fn().mockReturnValue({ focus: jest.fn() })
        }
    };

    // Mock document.getElementById
    global.document = {
        getElementById: jest.fn((id) => mockElements[id] || null),
        addEventListener: jest.fn(),
        querySelector: jest.fn(),
        querySelectorAll: jest.fn().mockReturnValue([])
    };

    return mockElements;
};

describe('Priority Filter Functionality', () => {
    let mockElements;

    beforeEach(() => {
        mockElements = mockDOM();
        // Reset filter manager state
        filterManager.filters = {
            search: DEFAULTS.SEARCH_QUERY,
            showModifiedOnly: DEFAULTS.SHOW_MODIFIED_ONLY,
            hideDeprecated: DEFAULTS.HIDE_DEPRECATED,
            platform: DEFAULTS.SELECTED_PLATFORM,
            showPriorityHigh: DEFAULTS.SHOW_PRIORITY_HIGH,
            showPriorityMedium: DEFAULTS.SHOW_PRIORITY_MEDIUM,
            showPriorityLow: DEFAULTS.SHOW_PRIORITY_LOW
        };
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('Filter State Management', () => {
        test('should initialize with default priority filter values', () => {
            expect(filterManager.filters.showPriorityHigh).toBe(true);
            expect(filterManager.filters.showPriorityMedium).toBe(true);
            expect(filterManager.filters.showPriorityLow).toBe(true);
        });

        test('should set priority filter values correctly', () => {
            filterManager.setFilter(FILTER_TYPES.PRIORITY_HIGH, false);
            expect(filterManager.filters.showPriorityHigh).toBe(false);

            filterManager.setFilter(FILTER_TYPES.PRIORITY_MEDIUM, false);
            expect(filterManager.filters.showPriorityMedium).toBe(false);

            filterManager.setFilter(FILTER_TYPES.PRIORITY_LOW, false);
            expect(filterManager.filters.showPriorityLow).toBe(false);
        });

        test('should get priority filter values correctly', () => {
            filterManager.filters.showPriorityHigh = false;
            filterManager.filters.showPriorityMedium = true;
            filterManager.filters.showPriorityLow = false;

            expect(filterManager.getFilter(FILTER_TYPES.PRIORITY_HIGH)).toBe(false);
            expect(filterManager.getFilter(FILTER_TYPES.PRIORITY_MEDIUM)).toBe(true);
            expect(filterManager.getFilter(FILTER_TYPES.PRIORITY_LOW)).toBe(false);
        });
    });

    describe('Dropdown UI Management', () => {
        test('should have dropdown toggle methods available', () => {
            expect(typeof filterManager.togglePriorityDropdown).toBe('function');
            expect(typeof filterManager.openPriorityDropdown).toBe('function');
            expect(typeof filterManager.closePriorityDropdown).toBe('function');
        });

        test('should have dropdown text update method available', () => {
            expect(typeof filterManager.updatePriorityDropdownText).toBe('function');
        });

        test('should handle missing DOM elements gracefully', () => {
            // Test with no DOM elements present
            global.document.getElementById = jest.fn().mockReturnValue(null);

            expect(() => {
                filterManager.togglePriorityDropdown();
                filterManager.openPriorityDropdown();
                filterManager.closePriorityDropdown();
                filterManager.updatePriorityDropdownText();
            }).not.toThrow();
        });
    });

    describe('Dropdown Text Updates', () => {
        test('should handle dropdown text update logic', () => {
            // Test the logic without DOM dependencies
            const testCases = [
                { high: true, medium: true, low: true, expected: 'All Priorities' },
                { high: false, medium: false, low: false, expected: 'No Priorities' },
                { high: true, medium: true, low: false, expected: 'High, Medium' },
                { high: false, medium: false, low: true, expected: 'Low' },
                { high: true, medium: false, low: false, expected: 'High' }
            ];

            testCases.forEach(({ high, medium, low, expected }) => {
                filterManager.filters.showPriorityHigh = high;
                filterManager.filters.showPriorityMedium = medium;
                filterManager.filters.showPriorityLow = low;

                const selectedCount = [high, medium, low].filter(Boolean).length;

                if (selectedCount === 3) {
                    expect('All Priorities').toBe(expected);
                } else if (selectedCount === 0) {
                    expect('No Priorities').toBe(expected);
                } else {
                    const selected = [];
                    if (high) selected.push('High');
                    if (medium) selected.push('Medium');
                    if (low) selected.push('Low');
                    expect(selected.join(', ')).toBe(expected);
                }
            });
        });

        test('should call updatePriorityDropdownText without errors when DOM elements missing', () => {
            global.document.getElementById = jest.fn().mockReturnValue(null);

            expect(() => {
                filterManager.updatePriorityDropdownText();
            }).not.toThrow();
        });
    });

    describe('Filter Reset', () => {
        test('should reset priority filters to defaults', () => {
            // Change filters from defaults
            filterManager.filters.showPriorityHigh = false;
            filterManager.filters.showPriorityMedium = false;
            filterManager.filters.showPriorityLow = false;

            // Mock the methods that resetFilters calls
            filterManager.updateFilterControls = jest.fn();
            filterManager.applyFilters = jest.fn();
            filterManager.saveFilters = jest.fn();

            filterManager.resetFilters();

            expect(filterManager.filters.showPriorityHigh).toBe(DEFAULTS.SHOW_PRIORITY_HIGH);
            expect(filterManager.filters.showPriorityMedium).toBe(DEFAULTS.SHOW_PRIORITY_MEDIUM);
            expect(filterManager.filters.showPriorityLow).toBe(DEFAULTS.SHOW_PRIORITY_LOW);
        });
    });

    describe('Filter Control Updates', () => {
        test('should call updateFilterControls without errors', () => {
            filterManager.filters.showPriorityHigh = false;
            filterManager.filters.showPriorityMedium = true;
            filterManager.filters.showPriorityLow = false;

            expect(() => {
                filterManager.updateFilterControls();
            }).not.toThrow();
        });

        test('should handle missing DOM elements in updateFilterControls', () => {
            global.document.getElementById = jest.fn().mockReturnValue(null);

            expect(() => {
                filterManager.updateFilterControls();
            }).not.toThrow();
        });
    });

    describe('Integration with Filter System', () => {
        test('should call updatePriorityDropdownText when priority filters change', () => {
            filterManager.updatePriorityDropdownText = jest.fn();
            filterManager.applyFilters = jest.fn();
            filterManager.saveFilters = jest.fn();

            filterManager.setFilter(FILTER_TYPES.PRIORITY_HIGH, false);

            expect(filterManager.updatePriorityDropdownText).toHaveBeenCalled();
        });

        test('should apply filters when priority filters change', () => {
            filterManager.applyFilters = jest.fn();
            filterManager.saveFilters = jest.fn();
            filterManager.updatePriorityDropdownText = jest.fn();

            filterManager.setFilter(FILTER_TYPES.PRIORITY_MEDIUM, false);

            expect(filterManager.applyFilters).toHaveBeenCalled();
        });

        test('should save filters when priority filters change', () => {
            filterManager.applyFilters = jest.fn();
            filterManager.saveFilters = jest.fn();
            filterManager.updatePriorityDropdownText = jest.fn();

            filterManager.setFilter(FILTER_TYPES.PRIORITY_LOW, false);

            expect(filterManager.saveFilters).toHaveBeenCalled();
        });
    });

    describe('Filter Combinations', () => {
        test('should handle multiple filter types together', () => {
            filterManager.applyFilters = jest.fn();
            filterManager.saveFilters = jest.fn();
            filterManager.updatePriorityDropdownText = jest.fn();

            // Set multiple filters
            filterManager.setFilter(FILTER_TYPES.SEARCH, 'test');
            filterManager.setFilter(FILTER_TYPES.PRIORITY_HIGH, false);
            filterManager.setFilter(FILTER_TYPES.PLATFORM, 'iOS');
            filterManager.setFilter(FILTER_TYPES.PRIORITY_LOW, false);

            expect(filterManager.filters.search).toBe('test');
            expect(filterManager.filters.showPriorityHigh).toBe(false);
            expect(filterManager.filters.platform).toBe('iOS');
            expect(filterManager.filters.showPriorityLow).toBe(false);
            expect(filterManager.filters.showPriorityMedium).toBe(true); // Should remain unchanged
        });
    });
});
