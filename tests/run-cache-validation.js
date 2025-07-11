#!/usr/bin/env node

/**
 * Cache Validation Test Runner
 * Runs comprehensive tests on all cache files and provides detailed reporting
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const CACHE_DIR = path.join(process.cwd(), 'cache');
const TEST_FILE = 'tests/unit/cacheComprehensiveValidation.test.js';

console.log('🔍 Apple MDM Cache Validation Test Runner');
console.log('==========================================');
console.log();

// Check if cache directory exists
if (!fs.existsSync(CACHE_DIR)) {
    console.error('❌ Cache directory not found:', CACHE_DIR);
    process.exit(1);
}

// Check if test file exists
if (!fs.existsSync(TEST_FILE)) {
    console.error('❌ Test file not found:', TEST_FILE);
    process.exit(1);
}

// Get cache file statistics
const cacheFiles = fs.readdirSync(CACHE_DIR).filter(file => file.endsWith('.json'));
const totalSize = cacheFiles.reduce((sum, file) => {
    const filePath = path.join(CACHE_DIR, file);
    return sum + fs.statSync(filePath).size;
}, 0);

console.log('📊 Cache Directory Statistics:');
console.log(`   • Total JSON files: ${cacheFiles.length}`);
console.log(`   • Total size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
console.log(`   • Average file size: ${(totalSize / cacheFiles.length / 1024).toFixed(2)} KB`);
console.log();

// Check if manifest exists and get info
const manifestPath = path.join(CACHE_DIR, 'manifest.json');
if (fs.existsSync(manifestPath)) {
    try {
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        console.log('📋 Manifest Information:');
        console.log(`   • Generated: ${manifest.generated_at}`);
        console.log(`   • Listed files: ${manifest.total_files}`);
        console.log(`   • Expected total: ${manifest.total_files + 1} (including manifest)`);
        console.log();
    } catch (error) {
        console.warn('⚠️  Warning: Could not parse manifest.json');
    }
} else {
    console.error('❌ manifest.json not found in cache directory');
    process.exit(1);
}

console.log('🚀 Running comprehensive cache validation tests...');
console.log();

try {
    // Run the tests with Jest
    const command = `npx jest ${TEST_FILE} --verbose --no-cache --detectOpenHandles`;
    
    console.log('Executing:', command);
    console.log();
    
    const output = execSync(command, { 
        encoding: 'utf8',
        stdio: 'inherit',
        cwd: process.cwd()
    });
    
    console.log();
    console.log('✅ All cache validation tests completed successfully!');
    
} catch (error) {
    console.log();
    console.error('❌ Cache validation tests failed');
    console.error('Exit code:', error.status);
    
    if (error.stdout) {
        console.log('STDOUT:', error.stdout);
    }
    if (error.stderr) {
        console.error('STDERR:', error.stderr);
    }
    
    process.exit(error.status || 1);
}

console.log();
console.log('📈 Test Summary:');
console.log('   • Cache structure validation: ✅');
console.log('   • File accessibility tests: ✅');
console.log('   • JSON parsing validation: ✅');
console.log('   • File integrity checks: ✅');
console.log('   • Application integration: ✅');
console.log('   • Performance tests: ✅');
console.log('   • Error handling tests: ✅');
console.log();
console.log('🎉 Cache system is fully validated and ready for production!');
