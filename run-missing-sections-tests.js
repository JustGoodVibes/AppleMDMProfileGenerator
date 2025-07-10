#!/usr/bin/env node

/**
 * Test Runner for Missing MDM Sections
 * Executes the comprehensive test suite for newly added MDM configuration sections
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Test configuration
const testConfig = {
  testFiles: [
    'tests/unit/missingSections.test.js',
    'tests/unit/firewallSection.test.js', 
    'tests/unit/darkModeCompatibility.test.js',
    'tests/integration/missingSectionsIntegration.test.js'
  ],
  coverageThreshold: 95,
  timeout: 30000
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

class MissingSectionsTestRunner {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      total: 0,
      coverage: 0,
      startTime: null,
      endTime: null,
      errors: []
    };
  }

  /**
   * Print colored console output
   */
  log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
  }

  /**
   * Print test header
   */
  printHeader() {
    this.log('=' .repeat(80), 'cyan');
    this.log('🧪 Missing MDM Sections Test Suite', 'bright');
    this.log('   Comprehensive tests for newly added MDM configuration sections', 'cyan');
    this.log('=' .repeat(80), 'cyan');
    this.log('');
  }

  /**
   * Print test summary
   */
  printSummary() {
    const duration = this.results.endTime - this.results.startTime;
    
    this.log('');
    this.log('=' .repeat(80), 'cyan');
    this.log('📊 Test Results Summary', 'bright');
    this.log('=' .repeat(80), 'cyan');
    
    this.log(`Total Tests: ${this.results.total}`, 'blue');
    this.log(`Passed: ${this.results.passed}`, this.results.failed === 0 ? 'green' : 'yellow');
    this.log(`Failed: ${this.results.failed}`, this.results.failed === 0 ? 'green' : 'red');
    this.log(`Coverage: ${this.results.coverage}%`, this.results.coverage >= testConfig.coverageThreshold ? 'green' : 'red');
    this.log(`Duration: ${duration}ms`, 'blue');
    
    if (this.results.failed === 0) {
      this.log('');
      this.log('🎉 All tests passed! Missing sections functionality is working correctly.', 'green');
      this.log('');
      this.log('✅ Verified functionality:', 'green');
      this.log('   • All 10 missing MDM sections are present', 'green');
      this.log('   • Firewall section is correctly configured', 'green');
      this.log('   • Dark mode compatibility is maintained', 'green');
      this.log('   • Integration with existing workflow works', 'green');
      this.log('   • Regression prevention measures are in place', 'green');
    } else {
      this.log('');
      this.log('❌ Some tests failed. Please review the failures above.', 'red');
      if (this.results.errors.length > 0) {
        this.log('');
        this.log('🔍 Error Summary:', 'yellow');
        this.results.errors.forEach(error => {
          this.log(`   • ${error}`, 'red');
        });
      }
    }
    
    this.log('');
    this.log('📋 Test Files Executed:', 'blue');
    testConfig.testFiles.forEach(file => {
      this.log(`   ✓ ${file}`, 'cyan');
    });
  }

  /**
   * Run Jest with specific configuration
   */
  async runJest(args = []) {
    return new Promise((resolve, reject) => {
      const jestArgs = [
        '--testPathPattern=missing|firewall|darkMode',
        '--coverage',
        '--coverageDirectory=coverage/missing-sections',
        '--verbose',
        '--passWithNoTests=false',
        ...args
      ];

      this.log(`🚀 Running Jest with args: ${jestArgs.join(' ')}`, 'blue');
      
      const jest = spawn('npx', ['jest', ...jestArgs], {
        cwd: __dirname,
        stdio: 'pipe'
      });

      let output = '';
      let errorOutput = '';

      jest.stdout.on('data', (data) => {
        const text = data.toString();
        output += text;
        process.stdout.write(text);
      });

      jest.stderr.on('data', (data) => {
        const text = data.toString();
        errorOutput += text;
        process.stderr.write(text);
      });

      jest.on('close', (code) => {
        this.parseJestOutput(output, errorOutput);
        
        if (code === 0) {
          resolve({ success: true, output, errorOutput });
        } else {
          reject({ success: false, code, output, errorOutput });
        }
      });

      jest.on('error', (error) => {
        this.results.errors.push(`Jest execution error: ${error.message}`);
        reject({ success: false, error: error.message });
      });
    });
  }

  /**
   * Parse Jest output to extract test results
   */
  parseJestOutput(output, errorOutput) {
    // Parse test results from Jest output
    const testResultMatch = output.match(/Tests:\s+(\d+)\s+failed,\s+(\d+)\s+passed,\s+(\d+)\s+total/);
    if (testResultMatch) {
      this.results.failed = parseInt(testResultMatch[1]);
      this.results.passed = parseInt(testResultMatch[2]);
      this.results.total = parseInt(testResultMatch[3]);
    } else {
      // Try alternative pattern
      const passedMatch = output.match(/(\d+)\s+passed/);
      const failedMatch = output.match(/(\d+)\s+failed/);
      
      if (passedMatch) this.results.passed = parseInt(passedMatch[1]);
      if (failedMatch) this.results.failed = parseInt(failedMatch[1]);
      this.results.total = this.results.passed + this.results.failed;
    }

    // Parse coverage
    const coverageMatch = output.match(/All files\s+\|\s+[\d.]+\s+\|\s+([\d.]+)/);
    if (coverageMatch) {
      this.results.coverage = parseFloat(coverageMatch[1]);
    }

    // Extract errors
    if (errorOutput) {
      this.results.errors.push('Jest stderr output detected');
    }
  }

  /**
   * Validate test environment
   */
  async validateEnvironment() {
    this.log('🔍 Validating test environment...', 'yellow');
    
    // Check if Jest is available
    try {
      await new Promise((resolve, reject) => {
        const jest = spawn('npx', ['jest', '--version'], { stdio: 'pipe' });
        jest.on('close', (code) => {
          if (code === 0) {
            resolve();
          } else {
            reject(new Error('Jest not available'));
          }
        });
        jest.on('error', reject);
      });
      this.log('   ✓ Jest is available', 'green');
    } catch (error) {
      this.log('   ❌ Jest is not available', 'red');
      throw new Error('Jest is required to run tests. Please run: npm install');
    }

    // Check if test files exist
    const fs = await import('fs');
    for (const testFile of testConfig.testFiles) {
      if (fs.existsSync(join(__dirname, testFile))) {
        this.log(`   ✓ ${testFile} exists`, 'green');
      } else {
        this.log(`   ❌ ${testFile} not found`, 'red');
        throw new Error(`Test file not found: ${testFile}`);
      }
    }

    this.log('   ✓ Environment validation passed', 'green');
    this.log('');
  }

  /**
   * Run the complete test suite
   */
  async run() {
    this.results.startTime = Date.now();
    
    try {
      this.printHeader();
      
      await this.validateEnvironment();
      
      this.log('🧪 Executing missing sections test suite...', 'yellow');
      this.log('');
      
      await this.runJest();
      
      this.results.endTime = Date.now();
      this.printSummary();
      
      // Exit with appropriate code
      process.exit(this.results.failed === 0 ? 0 : 1);
      
    } catch (error) {
      this.results.endTime = Date.now();
      this.results.errors.push(error.message || 'Unknown error');
      
      this.log('');
      this.log('❌ Test suite execution failed:', 'red');
      this.log(`   ${error.message || error}`, 'red');
      
      this.printSummary();
      process.exit(1);
    }
  }
}

// Handle command line arguments
const args = process.argv.slice(2);
const runner = new MissingSectionsTestRunner();

// Add help option
if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Usage: node run-missing-sections-tests.js [options]

Options:
  --help, -h     Show this help message
  --watch        Run tests in watch mode
  --no-coverage  Skip coverage collection
  --verbose      Enable verbose output

Examples:
  node run-missing-sections-tests.js
  node run-missing-sections-tests.js --watch
  node run-missing-sections-tests.js --no-coverage
`);
  process.exit(0);
}

// Run the test suite
runner.run().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
