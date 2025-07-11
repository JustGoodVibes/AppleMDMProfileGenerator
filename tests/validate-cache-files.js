#!/usr/bin/env node

/**
 * Cache Files Validation Script
 * Validates all JSON files in the cache directory by loading and parsing them
 * This script works in Node.js environment by reading files directly from the filesystem
 */

import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import crypto from 'crypto';

const CACHE_DIR = path.join(process.cwd(), 'cache');

// Validation results
const results = {
  total: 0,
  success: 0,
  failed: 0,
  issues: [],
  manifestInfo: null,
  sizeValidation: {
    checked: 0,
    mismatched: 0,
    mismatches: []
  },
  checksumValidation: {
    checked: 0,
    mismatched: 0,
    mismatches: []
  }
};

console.log(chalk.blue('🔍 Cache Files Validation Script'));
console.log(chalk.blue('==================================='));
console.log();

// Check if cache directory exists
if (!fs.existsSync(CACHE_DIR)) {
  console.error(chalk.red('❌ Cache directory not found:', CACHE_DIR));
  process.exit(1);
}

/**
 * Load and validate manifest.json
 */
function loadManifest() {
  const manifestPath = path.join(CACHE_DIR, 'manifest.json');

  if (!fs.existsSync(manifestPath)) {
    console.warn(chalk.yellow('⚠️  Manifest file not found - skipping integrity checks'));
    return null;
  }

  try {
    const manifestContent = fs.readFileSync(manifestPath, 'utf8');
    const manifest = JSON.parse(manifestContent);

    console.log(chalk.cyan(`📋 Manifest loaded: ${manifest.total_files} files, generated at ${manifest.generated_at}`));
    return manifest;
  } catch (error) {
    console.warn(chalk.yellow(`⚠️  Error loading manifest: ${error.message}`));
    return null;
  }
}

/**
 * Calculate file checksum (SHA-256)
 */
function calculateChecksum(filePath) {
  const fileBuffer = fs.readFileSync(filePath);
  const hashSum = crypto.createHash('sha256');
  hashSum.update(fileBuffer);
  return hashSum.digest('hex');
}

/**
 * Validate Apple MDM documentation structure
 */
function validateAppleMDMStructure(data) {
  const errors = [];

  // Basic object validation
  if (!data || typeof data !== 'object') {
    errors.push('Not a valid object');
    return errors;
  }

  // Check for required Apple MDM documentation fields
  if (!data.kind) {
    errors.push('Missing required field: kind');
  }

  if (!data.metadata) {
    errors.push('Missing required field: metadata');
  }

  if (!data.identifier) {
    errors.push('Missing required field: identifier');
  }

  // Additional structure validation
  if (data.metadata && typeof data.metadata !== 'object') {
    errors.push('metadata field must be an object');
  }

  if (data.metadata && data.metadata.title && typeof data.metadata.title !== 'string') {
    errors.push('metadata.title must be a string');
  }

  return errors;
}

async function validateCacheFiles() {
  try {
    // Load manifest for integrity checking
    results.manifestInfo = loadManifest();
    console.log();

    // Get all JSON files in the cache directory (excluding manifest.json)
    const cacheFiles = fs.readdirSync(CACHE_DIR)
      .filter(file => file.endsWith('.json') && file !== 'manifest.json')
      .sort();

    results.total = cacheFiles.length;

    console.log(chalk.cyan(`Found ${cacheFiles.length} JSON files to validate`));
    console.log();

    // Process each file
    for (const filename of cacheFiles) {
      try {
        process.stdout.write(chalk.yellow(`Validating ${filename}... `));

        const filePath = path.join(CACHE_DIR, filename);

        // Read and parse the file
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const data = JSON.parse(fileContent);

        // Validate Apple MDM structure
        const structureErrors = validateAppleMDMStructure(data);

        if (structureErrors.length > 0) {
          throw new Error(structureErrors.join(', '));
        }

        // Integrity checks against manifest
        if (results.manifestInfo && results.manifestInfo.files && results.manifestInfo.files[filename]) {
          const manifestEntry = results.manifestInfo.files[filename];

          // Size validation
          const actualSize = fs.statSync(filePath).size;
          results.sizeValidation.checked++;

          if (manifestEntry.size && actualSize !== manifestEntry.size) {
            results.sizeValidation.mismatched++;
            results.sizeValidation.mismatches.push({
              filename,
              expected: manifestEntry.size,
              actual: actualSize
            });
          }

          // Checksum validation
          if (manifestEntry.checksum) {
            results.checksumValidation.checked++;
            const actualChecksum = calculateChecksum(filePath);

            if (actualChecksum !== manifestEntry.checksum) {
              results.checksumValidation.mismatched++;
              results.checksumValidation.mismatches.push({
                filename,
                expected: manifestEntry.checksum,
                actual: actualChecksum
              });
            }
          }
        }

        results.success++;
        console.log(chalk.green('✓ Valid'));
      } catch (error) {
        results.failed++;
        const issue = {
          filename,
          error: error.message || 'Unknown error'
        };
        results.issues.push(issue);
        console.log(chalk.red(`✗ Invalid - ${error.message}`));
      }
    }

    // Generate comprehensive summary report
    console.log();
    console.log(chalk.blue('📊 Validation Summary Report'));
    console.log(chalk.blue('============================'));
    console.log();

    // Basic validation results
    console.log(chalk.cyan('📋 File Parsing Results:'));
    console.log(`   Total files processed: ${results.total}`);
    console.log(chalk.green(`   Successfully parsed: ${results.success}`));
    console.log(chalk.red(`   Files with errors: ${results.failed}`));
    console.log();

    // Integrity validation results
    if (results.manifestInfo) {
      console.log(chalk.cyan('🔍 Integrity Validation Results:'));

      // Size validation
      console.log(`   Size checks performed: ${results.sizeValidation.checked}`);
      if (results.sizeValidation.mismatched > 0) {
        console.log(chalk.red(`   Size mismatches: ${results.sizeValidation.mismatched}`));
      } else {
        console.log(chalk.green(`   Size mismatches: 0`));
      }

      // Checksum validation
      console.log(`   Checksum checks performed: ${results.checksumValidation.checked}`);
      if (results.checksumValidation.mismatched > 0) {
        console.log(chalk.red(`   Checksum mismatches: ${results.checksumValidation.mismatched}`));
      } else {
        console.log(chalk.green(`   Checksum mismatches: 0`));
      }
      console.log();
    }

    // Performance metrics
    const successRate = results.total > 0 ? ((results.success / results.total) * 100).toFixed(1) : 0;
    console.log(chalk.cyan('📈 Performance Metrics:'));
    console.log(`   Success rate: ${successRate}%`);
    console.log(`   Cache coverage: ${results.total} files`);
    console.log();

    // Detailed error reporting
    if (results.failed > 0) {
      console.log(chalk.red('❌ Files with Parsing Errors:'));
      results.issues.forEach((issue, index) => {
        console.log(chalk.red(`   ${index + 1}. ${issue.filename}: ${issue.error}`));
      });
      console.log();
    }

    // Size mismatch details
    if (results.sizeValidation.mismatched > 0) {
      console.log(chalk.red('📏 Files with Size Mismatches:'));
      results.sizeValidation.mismatches.forEach((mismatch, index) => {
        console.log(chalk.red(`   ${index + 1}. ${mismatch.filename}: expected ${mismatch.expected} bytes, got ${mismatch.actual} bytes`));
      });
      console.log();
    }

    // Checksum mismatch details
    if (results.checksumValidation.mismatched > 0) {
      console.log(chalk.red('🔐 Files with Checksum Mismatches:'));
      results.checksumValidation.mismatches.forEach((mismatch, index) => {
        console.log(chalk.red(`   ${index + 1}. ${mismatch.filename}`));
        console.log(chalk.red(`      Expected: ${mismatch.expected}`));
        console.log(chalk.red(`      Actual:   ${mismatch.actual}`));
      });
      console.log();
    }

    // Final status
    const hasErrors = results.failed > 0 || results.sizeValidation.mismatched > 0 || results.checksumValidation.mismatched > 0;

    if (hasErrors) {
      console.log(chalk.red('❌ Validation completed with errors!'));
      console.log(chalk.yellow('💡 Recommendations:'));

      if (results.failed > 0) {
        console.log(chalk.yellow('   • Check JSON syntax and Apple MDM structure in failed files'));
      }

      if (results.sizeValidation.mismatched > 0 || results.checksumValidation.mismatched > 0) {
        console.log(chalk.yellow('   • Consider refreshing cache files that failed integrity checks'));
        console.log(chalk.yellow('   • Run cache update workflow to ensure files are current'));
      }

      process.exit(1);
    } else {
      console.log(chalk.green('✅ All cache files passed validation!'));
      console.log(chalk.green('🎉 Cache system is healthy and ready for use'));

      if (results.manifestInfo) {
        console.log(chalk.cyan(`📅 Cache last updated: ${results.manifestInfo.generated_at}`));
      }
    }
  } catch (error) {
    console.error(chalk.red('❌ Validation process failed:'), error);
    console.error(chalk.red('Stack trace:'), error.stack);
    process.exit(1);
  }
}

// Run the validation
validateCacheFiles();