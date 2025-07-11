# Cache System Test Suite

This document describes the comprehensive test suite for the new cache system functionality in the Apple MDM Profile Generator.

## Overview

The cache system introduces several new components that work together to provide offline functionality and improved performance:

- **ConfigService**: Manages application configuration including the `USE_LIVE_API` parameter
- **CacheFileService**: Handles reading JSON files from the `cache/` directory
- **Enhanced DataService**: Integrates cache file support with existing functionality
- **GitHub Actions Workflow**: Automatically maintains the cache of Apple MDM documentation

## Test Structure

### Unit Tests

#### ConfigService Tests (`tests/unit/configService.test.js`)
Tests the configuration management functionality:

- **Default Configuration**: Validates default values and complete configuration object
- **URL Parameter Loading**: Tests loading configuration from URL parameters
- **LocalStorage Integration**: Tests saving/loading configuration from localStorage
- **Configuration Methods**: Tests get/set/update/reset functionality
- **Helper Methods**: Tests `shouldUseLiveAPI()`, `isCacheEnabled()`, etc.
- **Import/Export**: Tests JSON import/export functionality
- **Validation**: Tests configuration value validation and type conversion

#### CacheFileService Tests (`tests/unit/cacheFileService.test.js`)
Tests the cache file reading and management functionality:

- **Manifest Loading**: Tests loading and parsing the manifest.json file
- **File Operations**: Tests loading individual cache files and metadata
- **Specialized Loading**: Tests `loadMainSpec()` and `loadSection()` methods
- **Cache Management**: Tests file listing, freshness checking, and statistics
- **Initialization**: Tests service initialization and error handling
- **Debug Mode**: Tests debug logging functionality

### Integration Tests

#### Cache Integration Tests (`tests/integration/cacheIntegration.test.js`)
Tests the integration between all cache system components:

- **Configuration-Driven Behavior**: Tests USE_LIVE_API parameter effects
- **Section Loading Integration**: Tests section loading with cache fallback
- **Cache File Service Integration**: Tests automatic initialization
- **Memory and Storage Cache Integration**: Tests multi-level caching
- **Configuration URL Parameters**: Tests URL parameter handling
- **Error Handling Integration**: Tests graceful failure handling
- **Performance Integration**: Tests preloading and memory caching
- **Cache Statistics**: Tests monitoring and statistics functionality
- **GitHub Actions Workflow Validation**: Tests workflow configuration

### Comprehensive Test Suite

#### Cache System Tests (`tests/cache-system.test.js`)
High-level tests that validate the entire cache system:

- **Service Integration**: Tests that all services load without errors
- **Configuration Validation**: Tests default values and helper methods
- **Cache File Service Validation**: Tests basic functionality
- **Data Service Integration**: Tests enhanced dataService functionality
- **Error Handling**: Tests graceful error handling
- **Performance Considerations**: Tests memory caching and statistics
- **Workflow Integration Points**: Tests expected file structures
- **Backward Compatibility**: Tests that existing functionality still works

## Running Tests

### Individual Test Suites

```bash
# Run all cache-related tests
npm run test:cache

# Run with coverage
npm run test:cache:coverage

# Watch mode for development
npm run test:cache:watch

# Run specific test files
npm run test:config                    # ConfigService tests
npm run test:cache-files              # CacheFileService tests
npm run test:cache-integration        # Integration tests
```

### All Tests

```bash
# Run all tests including cache system tests
npm test

# Run with coverage
npm run test:coverage
```

## Test Configuration

The tests use Jest with the following configuration:

- **Environment**: jsdom (for browser environment simulation)
- **Mocking**: localStorage, fetch, and service dependencies
- **Coverage**: Tracks coverage for all new cache system files
- **Module Resolution**: Supports ES6 imports and module mocking

## Mock Strategy

### Global Mocks
- **fetch**: Mocked globally to simulate API responses and errors
- **localStorage**: Mocked to test configuration persistence
- **window.location**: Mocked to test URL parameter handling

### Service Mocks
- **progressService**: Mocked to avoid logging during tests
- **configService**: Mocked in dependent tests to control behavior
- **constants**: Mocked to provide test-specific values

## Test Data

### Mock Manifest Structure
```json
{
  "generated_at": "2024-01-01T02:00:00.000Z",
  "total_files": 3,
  "files": {
    "accounts.json": {
      "size": 12345,
      "modified": "2024-01-01T02:00:00.000Z",
      "checksum": "abc123"
    }
  }
}
```

### Mock Configuration
```javascript
{
  "USE_LIVE_API": true,
  "CACHE_ENABLED": true,
  "DEBUG_MODE": false,
  "API_TIMEOUT": 30000,
  "RETRY_ATTEMPTS": 3,
  "RETRY_DELAY": 1000
}
```

## Expected Behaviors

### USE_LIVE_API=false (Default - Cache-First)
1. Try cache files first
2. Fallback to localStorage cache
3. Fallback to mock data if cache files unavailable
4. Skip live API calls entirely

### USE_LIVE_API=true (Cache-First with Live API Fallback)
1. Try cache files first
2. Fallback to live Apple API if cache unavailable
3. Fallback to localStorage cache
4. Fallback to mock data

### Error Handling
- Network errors should trigger fallback chain
- Corrupted cache files should be handled gracefully
- Missing cache files should not break the application
- All errors should be logged appropriately

## Performance Expectations

### Memory Caching
- Loaded files should be cached in memory for subsequent requests
- Memory cache should be clearable for testing
- Cache statistics should be available

### File Loading
- Common files should be preloadable
- File integrity should be validated when possible
- Loading should be asynchronous and non-blocking

## Continuous Integration

These tests are designed to run in CI environments and should:

- Pass consistently without external dependencies
- Complete within reasonable time limits
- Provide meaningful error messages on failure
- Generate coverage reports for new functionality

## Debugging Tests

### Debug Mode
Enable debug mode in tests by setting:
```javascript
configService.set('DEBUG_MODE', true);
```

### Verbose Logging
Run tests with verbose output:
```bash
npm run test:cache -- --verbose
```

### Coverage Reports
Generate detailed coverage reports:
```bash
npm run test:cache:coverage
```

The coverage report will show which parts of the cache system are tested and which need additional coverage.

## Contributing

When adding new cache system functionality:

1. Add unit tests for individual components
2. Add integration tests for component interactions
3. Update the comprehensive test suite
4. Ensure backward compatibility tests pass
5. Update this documentation

### Test Naming Conventions
- Use descriptive test names that explain the expected behavior
- Group related tests using `describe` blocks
- Use `test` for individual test cases
- Prefix test files with the component name (e.g., `configService.test.js`)

### Mock Guidelines
- Mock external dependencies (fetch, localStorage)
- Use realistic mock data that matches expected API responses
- Reset mocks between tests to ensure isolation
- Document complex mocking scenarios
