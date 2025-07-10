# Apple MDM Profile Generator - Test Suite

This comprehensive test suite validates the hierarchical section functionality of the Apple MDM Profile Generator, with a focus on the recently fixed Accounts section sub-section creation.

## Test Structure

```
tests/
├── setup.js                           # Global test configuration
├── mocks/
│   └── appleApiData.js                # Mock data based on Apple's API
├── unit/
│   ├── dataService.test.js            # Core section processing tests
│   ├── accountsSection.test.js        # Accounts-specific hierarchy tests
│   ├── uiManager.test.js              # UI rendering and navigation tests
│   └── edgeCases.test.js              # Error handling and edge cases
└── integration/
    └── hierarchicalSections.test.js   # End-to-end integration tests
```

## Test Categories

### 1. Section Processing Tests (`dataService.test.js`)
Tests the core data processing methods:
- `extractConfigTypeFromIdentifier()` - URL parsing and config type extraction
- `createIdentifierFromTitle()` - Title normalization for identifiers
- `createSectionFromTopicSection()` - Parent section creation
- `createSubSectionsFromIdentifiers()` - Sub-section creation with filtering
- `parseSections()` - Complete hierarchical structure creation

### 2. Accounts Section Tests (`accountsSection.test.js`)
Focused tests for the specific bug fix:
- Validates exactly 6 sub-sections are created from 7 identifiers
- Tests case-insensitive filtering prevents parent duplication
- Verifies correct hierarchical properties are set
- Validates against expected Apple documentation structure

### 3. UI Manager Tests (`uiManager.test.js`)
Tests the UI rendering components:
- `populateNavigation()` - Hierarchical navigation creation
- `populateSections()` - Section grouping and rendering
- Orphaned section handling
- DOM manipulation and event handling

### 4. Integration Tests (`hierarchicalSections.test.js`)
End-to-end workflow validation:
- Complete data flow: API → Processing → UI
- Multi-section hierarchical validation
- Performance and caching behavior
- Error propagation and recovery

### 5. Edge Cases Tests (`edgeCases.test.js`)
Robustness and error handling:
- Malformed topicSection data
- Invalid identifier formats
- Null/undefined handling
- Large dataset performance
- Unicode and special characters

## Key Test Scenarios

### The Accounts Section Fix
The primary focus is validating the case-insensitive comparison fix:

```javascript
// Before fix: "Accounts" !== "accounts" (failed)
// After fix: "Accounts".toLowerCase() !== "accounts".toLowerCase() (works)
```

**Critical Test Cases:**
- Parent section identifier: `"accounts"` (lowercase)
- Config type from identifier: `"Accounts"` (uppercase)
- Expected result: 6 sub-sections (CalDAV, CardDAV, GoogleAccount, LDAP, MobileAccounts, SubscribedCalendars)
- Should NOT include: "Accounts" as a sub-section of itself

### Hierarchical Structure Validation
Tests ensure proper parent-child relationships:

```
Accounts (parent)
├── CalDAV (sub-section)
├── CardDAV (sub-section)
├── GoogleAccount (sub-section)
├── LDAP (sub-section)
├── MobileAccounts (sub-section)
└── SubscribedCalendars (sub-section)
```

## Running Tests

### Install Dependencies
```bash
npm install
```

### Run All Tests
```bash
npm test
```

### Run Specific Test Suites
```bash
# Accounts section tests only
npm run test:accounts

# Hierarchical functionality tests
npm run test:hierarchy

# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# Watch mode for development
npm run test:watch

# Coverage report
npm run test:coverage

# Verbose output
npm run test:verbose
```

### Individual Test Files
```bash
# Section processing tests
npx jest tests/unit/dataService.test.js

# Accounts-specific tests
npx jest tests/unit/accountsSection.test.js

# UI manager tests
npx jest tests/unit/uiManager.test.js

# Edge cases
npx jest tests/unit/edgeCases.test.js

# Integration tests
npx jest tests/integration/hierarchicalSections.test.js
```

## Mock Data

The test suite uses realistic mock data based on Apple's actual API structure:

- **`mockAppleIdentifiers`** - Real Apple doc:// URLs
- **`mockTopicSections`** - Actual topicSection structures
- **`mockMainSpec`** - Complete main specification mock
- **`mockExpectedHierarchy`** - Expected hierarchical outcomes

## Test Utilities

Global test utilities are available in all tests:

```javascript
// Create mock topicSection
global.testUtils.createMockTopicSection('Accounts', ['CalDAV', 'CardDAV']);

// Create mock section
global.testUtils.createMockSection('Accounts', 'accounts', false);

// Create mock main spec
global.testUtils.createMockMainSpec([topicSection1, topicSection2]);

// Wait for async operations
await global.testUtils.waitFor(100);
```

## Coverage Goals

The test suite aims for:
- **90%+ line coverage** on core functionality
- **100% coverage** on the Accounts section fix
- **Edge case coverage** for all error scenarios
- **Integration coverage** for complete workflows

## Continuous Integration

Tests are designed to run in CI/CD environments:
- No external dependencies (uses mocks)
- Deterministic results
- Fast execution (< 30 seconds)
- Clear failure reporting

## Debugging Tests

For debugging failing tests:

```bash
# Run with verbose output
npm run test:verbose

# Run specific test with debugging
npx jest --verbose --no-cache tests/unit/accountsSection.test.js

# Debug in watch mode
npm run test:watch -- --verbose
```

## Contributing

When adding new tests:
1. Follow the existing naming conventions
2. Use the provided mock data when possible
3. Add edge cases for new functionality
4. Update this README if adding new test categories
5. Ensure tests are deterministic and fast
