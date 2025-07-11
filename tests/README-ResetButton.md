# Reset Button Test Suite Documentation

## Overview

This comprehensive test suite validates the "Reset All" button functionality in the Apple MDM Profile Generator, ensuring that the recent bug fixes work correctly and preventing future regressions.

## Test Coverage

### 1. Button Interaction Tests
- **Reset button click triggers confirmation modal**
- **Modal displays correct warning text and buttons**
- **Cancel button closes modal without executing reset**
- **Confirm button executes reset operation**

### 2. Parameter Preservation Tests
- **Parameter definitions remain visible after reset**
- **Parameter containers are not removed from DOM**
- **SectionsData array preserves Apple's MDM specification data**
- **Loaded parameter sections maintain their loaded state**

### 3. Value Clearing Tests
- **All input field values are cleared/reset to defaults**
- **Boolean toggles reset to false state**
- **Array inputs are emptied but structure preserved**
- **Modified indicators are removed from parameters and sections**

### 4. UI State Tests
- **Export button returns to disabled state after reset**
- **Statistics display updates to reflect cleared parameters**
- **Section expand/collapse functionality remains intact**
- **Filter controls reset to default state**

### 5. Integration Tests
- **Complete reset workflow from button click to completion**
- **ExportService.clearModifiedParameters() is called**
- **LocalStorage is properly cleared**
- **Parameters can be reconfigured after reset**

### 6. Edge Cases and Error Scenarios
- **Rapid button clicks are handled gracefully**
- **Reset handles missing DOM elements gracefully**
- **Reset handles localStorage errors gracefully**
- **Reset handles component method failures gracefully**
- **Reset preserves critical application state on partial failure**
- **Modal keyboard navigation works correctly**
- **Reset button is properly disabled during operation**

### 7. Regression Prevention Tests
- **Parameter definitions are NOT cleared (regression test)**
- **SectionsData is NOT cleared (regression test)**
- **Parameter containers maintain loaded state (regression test)**

## Running the Tests

### Command Line (Jest)
```bash
# Run all reset button tests
npm run test:reset-button

# Run with coverage
npm run test:reset-button:coverage

# Run in watch mode
npm run test:reset-button:watch

# Run all tests
npm test

# Run with verbose output
npm run test:verbose
```

### Browser Testing
Open `test-reset-button-runner.html` in a browser for manual testing and visual validation.

## Test Files

### Main Test File
- **`tests/reset-button.test.js`** - Comprehensive Jest test suite

### Supporting Files
- **`tests/setup.js`** - Jest configuration and global mocks
- **`jest.config.js`** - Jest configuration
- **`test-reset-button-runner.html`** - Browser-based test runner

## Test Structure

### Mock Data
```javascript
const MOCK_SECTIONS_DATA = [
    {
        identifier: 'firewall',
        name: 'Firewall Configuration',
        parameters: [
            { key: 'enabled', type: 'boolean', defaultValue: false },
            { key: 'rules', type: 'array', defaultValue: [] },
            { key: 'logLevel', type: 'string', defaultValue: 'info' }
        ]
    },
    // ... more sections
];
```

### DOM Setup
Each test includes a complete DOM structure with:
- Reset button and confirmation modal
- Parameter sections with various input types
- Export button and statistics display
- Filter controls and navigation elements

### Mocked Services
- **localStorage** - Mocked for storage operations
- **exportService** - Mocked for parameter tracking
- **stateManager** - Mocked for state management
- **filterManager** - Mocked for filter operations

## Key Test Scenarios

### Regression Prevention
The test suite specifically prevents the regression bugs that were fixed:

1. **Parameter Definition Preservation**
   ```javascript
   // BEFORE FIX: This would fail (parameters removed)
   expect(postResetParameters.length).toBe(0); // ❌ Bug

   // AFTER FIX: This passes (parameters preserved)
   expect(postResetParameters.length).toBe(initialCount); // ✅ Fixed
   ```

2. **SectionsData Preservation**
   ```javascript
   // BEFORE FIX: This would fail (data cleared)
   expect(uiManager.sectionsData.length).toBe(0); // ❌ Bug

   // AFTER FIX: This passes (data preserved)
   expect(uiManager.sectionsData.length).toBe(2); // ✅ Fixed
   ```

3. **Loaded State Preservation**
   ```javascript
   // BEFORE FIX: This would fail (forced to false)
   expect(container.dataset.loaded).toBe('false'); // ❌ Bug

   // AFTER FIX: This passes (state preserved)
   expect(container.dataset.loaded).toBe('true'); // ✅ Fixed
   ```

## Custom Matchers

The test suite includes custom Jest matchers for better assertions:

```javascript
// Check if element is visible in DOM
expect(element).toBeVisibleInDOM();

// Check parameter definition count
expect(container).toHaveParameterDefinitions(3);

// Check if parameter values are empty
expect(container).toHaveEmptyParameterValues();
```

## Test Utilities

### Helper Functions
```javascript
// Create mock DOM elements
testHelpers.createElement(tag, attributes, textContent);

// Simulate user input
testHelpers.simulateInput(element, value);

// Simulate button clicks
testHelpers.simulateClick(element);

// Wait for DOM updates
await testHelpers.waitForDOMUpdate();
```

### Mock Parameter Creation
```javascript
// Create mock parameters for testing
testHelpers.createMockParameters(container, sectionId, parameters);
```

## Expected Results

### All Tests Passing
When all tests pass, you should see:
```
✅ Passed: 35
❌ Failed: 0
📈 Success Rate: 100%
```

### Test Categories
- **Button Interaction Tests**: 4 tests
- **Parameter Preservation Tests**: 4 tests
- **Value Clearing Tests**: 4 tests
- **UI State Tests**: 4 tests
- **Integration Tests**: 4 tests
- **Edge Cases**: 7 tests
- **Regression Prevention**: 3 tests

## Debugging Failed Tests

### Common Issues
1. **DOM Elements Missing**: Check if the test DOM setup matches the actual application structure
2. **Async Operations**: Ensure proper waiting for async operations to complete
3. **Mock Configuration**: Verify that mocks are properly configured for the tested functionality

### Debug Commands
```bash
# Run with debug output
npm run test:reset-button -- --verbose

# Run specific test
npm run test:reset-button -- --testNamePattern="Parameter definitions"

# Run with coverage to see what's not tested
npm run test:reset-button:coverage
```

## Maintenance

### Adding New Tests
1. Add test cases to the appropriate `describe` block
2. Follow the existing naming convention
3. Include both positive and negative test cases
4. Update this documentation

### Updating Mocks
1. Keep mocks in sync with actual implementation
2. Update mock data when API structure changes
3. Ensure mocks cover all used functionality

### Performance Considerations
- Tests should complete within 10 seconds
- Use `jest.useFakeTimers()` for timing-dependent tests
- Mock heavy operations like API calls

## Integration with CI/CD

### GitHub Actions
```yaml
- name: Run Reset Button Tests
  run: npm run test:reset-button:coverage

- name: Upload Coverage
  uses: codecov/codecov-action@v3
  with:
    file: ./coverage/lcov.info
```

### Coverage Requirements
- **Minimum Coverage**: 80% for all metrics
- **Critical Functions**: 100% coverage for reset-related functions
- **Regression Tests**: Must maintain 100% pass rate

## Conclusion

This test suite provides comprehensive coverage of the Reset All button functionality, ensuring that:

1. **Bug fixes are validated** - Recent parameter preservation fixes are tested
2. **Regressions are prevented** - Specific tests prevent the bugs from reoccurring
3. **Edge cases are handled** - Error scenarios and unusual conditions are tested
4. **Integration works** - Complete workflows are validated
5. **Performance is maintained** - Tests ensure reset operations are efficient

The test suite serves as both validation and documentation of the expected behavior, making it easier to maintain and enhance the reset functionality in the future.
