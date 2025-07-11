#!/usr/bin/env node

/**
 * Debug Cache Loading Script
 * Comprehensive debugging tool to analyze cache file loading issues
 */

import fs from 'fs';
import path from 'path';
import chalk from 'chalk';

const CACHE_DIR = path.join(process.cwd(), 'cache');

// Debug results
const debug = {
  manifest: null,
  cacheFiles: [],
  mainSpec: null,
  topicSections: [],
  sectionMapping: new Map(),
  issues: []
};

console.log(chalk.blue('🔍 Cache Loading Debug Script'));
console.log(chalk.blue('=============================='));
console.log();

/**
 * Load and analyze manifest.json
 */
function analyzeManifest() {
  console.log(chalk.cyan('📋 Analyzing manifest.json...'));
  
  const manifestPath = path.join(CACHE_DIR, 'manifest.json');
  
  if (!fs.existsSync(manifestPath)) {
    debug.issues.push('Manifest file not found');
    console.log(chalk.red('❌ Manifest file not found'));
    return false;
  }
  
  try {
    const manifestContent = fs.readFileSync(manifestPath, 'utf8');
    debug.manifest = JSON.parse(manifestContent);
    
    console.log(chalk.green(`✓ Manifest loaded: ${debug.manifest.total_files} files`));
    console.log(`   Generated at: ${debug.manifest.generated_at}`);
    
    return true;
  } catch (error) {
    debug.issues.push(`Manifest parsing error: ${error.message}`);
    console.log(chalk.red(`❌ Manifest parsing error: ${error.message}`));
    return false;
  }
}

/**
 * Discover all cache files
 */
function discoverCacheFiles() {
  console.log(chalk.cyan('\n📁 Discovering cache files...'));
  
  try {
    debug.cacheFiles = fs.readdirSync(CACHE_DIR)
      .filter(file => file.endsWith('.json') && file !== 'manifest.json')
      .sort();
    
    console.log(chalk.green(`✓ Found ${debug.cacheFiles.length} JSON files`));
    
    // Compare with manifest
    if (debug.manifest) {
      const manifestFiles = Object.keys(debug.manifest.files || {});
      const missingFromManifest = debug.cacheFiles.filter(f => !manifestFiles.includes(f));
      const missingFromCache = manifestFiles.filter(f => !debug.cacheFiles.includes(f));
      
      if (missingFromManifest.length > 0) {
        console.log(chalk.yellow(`⚠️  ${missingFromManifest.length} files not in manifest`));
        debug.issues.push(`Files not in manifest: ${missingFromManifest.join(', ')}`);
      }
      
      if (missingFromCache.length > 0) {
        console.log(chalk.yellow(`⚠️  ${missingFromCache.length} files missing from cache`));
        debug.issues.push(`Files missing from cache: ${missingFromCache.join(', ')}`);
      }
    }
    
    return true;
  } catch (error) {
    debug.issues.push(`Cache discovery error: ${error.message}`);
    console.log(chalk.red(`❌ Cache discovery error: ${error.message}`));
    return false;
  }
}

/**
 * Analyze main specification file
 */
function analyzeMainSpec() {
  console.log(chalk.cyan('\n📄 Analyzing main specification...'));
  
  const mainSpecPath = path.join(CACHE_DIR, 'profile-specific-payload-keys.json');
  
  if (!fs.existsSync(mainSpecPath)) {
    debug.issues.push('Main specification file not found');
    console.log(chalk.red('❌ Main specification file not found'));
    return false;
  }
  
  try {
    const mainSpecContent = fs.readFileSync(mainSpecPath, 'utf8');
    debug.mainSpec = JSON.parse(mainSpecContent);
    
    console.log(chalk.green('✓ Main specification loaded'));
    console.log(`   Structure: ${Object.keys(debug.mainSpec).join(', ')}`);
    
    // Analyze topicSections
    if (debug.mainSpec.topicSections && Array.isArray(debug.mainSpec.topicSections)) {
      debug.topicSections = debug.mainSpec.topicSections;
      console.log(chalk.green(`✓ Found ${debug.topicSections.length} topicSections`));
      
      // Map topicSections to expected file names
      debug.topicSections.forEach((topicSection, index) => {
        const title = topicSection.title || `Section ${index + 1}`;
        const identifier = createIdentifierFromTitle(title);
        const expectedFile = `${identifier}.json`;
        
        debug.sectionMapping.set(title, {
          identifier,
          expectedFile,
          exists: debug.cacheFiles.includes(expectedFile),
          topicSection
        });
      });
      
    } else {
      debug.issues.push('No topicSections found in main specification');
      console.log(chalk.red('❌ No topicSections found in main specification'));
    }
    
    return true;
  } catch (error) {
    debug.issues.push(`Main spec parsing error: ${error.message}`);
    console.log(chalk.red(`❌ Main spec parsing error: ${error.message}`));
    return false;
  }
}

/**
 * Create identifier from title (mimics dataService logic)
 */
function createIdentifierFromTitle(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .replace(/\s+/g, '');
}

/**
 * Analyze section mapping
 */
function analyzeSectionMapping() {
  console.log(chalk.cyan('\n🔗 Analyzing section mapping...'));
  
  if (debug.sectionMapping.size === 0) {
    console.log(chalk.yellow('⚠️  No section mapping available'));
    return;
  }
  
  let foundSections = 0;
  let missingSections = 0;
  
  console.log('\nSection Mapping Analysis:');
  console.log('========================');
  
  debug.sectionMapping.forEach((mapping, title) => {
    if (mapping.exists) {
      console.log(chalk.green(`✓ ${title} → ${mapping.expectedFile}`));
      foundSections++;
    } else {
      console.log(chalk.red(`✗ ${title} → ${mapping.expectedFile} (MISSING)`));
      missingSections++;
      debug.issues.push(`Missing section file: ${mapping.expectedFile} for "${title}"`);
    }
  });
  
  console.log(`\nMapping Summary:`);
  console.log(`  Found sections: ${foundSections}`);
  console.log(`  Missing sections: ${missingSections}`);
  console.log(`  Total expected: ${debug.sectionMapping.size}`);
}

/**
 * Test cache file loading simulation
 */
function testCacheFileLoading() {
  console.log(chalk.cyan('\n🧪 Testing cache file loading simulation...'));
  
  let loadableFiles = 0;
  let unloadableFiles = 0;
  
  debug.cacheFiles.forEach(filename => {
    try {
      const filePath = path.join(CACHE_DIR, filename);
      const content = fs.readFileSync(filePath, 'utf8');
      const data = JSON.parse(content);
      
      // Basic validation
      if (data && typeof data === 'object') {
        loadableFiles++;
      } else {
        unloadableFiles++;
        debug.issues.push(`Invalid data structure in ${filename}`);
      }
    } catch (error) {
      unloadableFiles++;
      debug.issues.push(`Cannot load ${filename}: ${error.message}`);
    }
  });
  
  console.log(`Loadable files: ${loadableFiles}`);
  console.log(`Unloadable files: ${unloadableFiles}`);
}

/**
 * Generate comprehensive report
 */
function generateReport() {
  console.log(chalk.blue('\n📊 Comprehensive Debug Report'));
  console.log(chalk.blue('=============================='));
  
  console.log('\n🔍 Discovery Summary:');
  console.log(`   Cache files found: ${debug.cacheFiles.length}`);
  console.log(`   Manifest files listed: ${debug.manifest ? Object.keys(debug.manifest.files || {}).length : 'N/A'}`);
  console.log(`   TopicSections in main spec: ${debug.topicSections.length}`);
  console.log(`   Expected section files: ${debug.sectionMapping.size}`);
  
  const foundSections = Array.from(debug.sectionMapping.values()).filter(m => m.exists).length;
  const missingSections = debug.sectionMapping.size - foundSections;
  
  console.log(`   Section files found: ${foundSections}`);
  console.log(`   Section files missing: ${missingSections}`);
  
  if (debug.issues.length > 0) {
    console.log(chalk.red('\n❌ Issues Found:'));
    debug.issues.forEach((issue, index) => {
      console.log(chalk.red(`   ${index + 1}. ${issue}`));
    });
  }
  
  console.log(chalk.cyan('\n💡 Recommendations:'));
  
  if (missingSections > 0) {
    console.log(chalk.yellow('   • Some topicSections do not have corresponding cache files'));
    console.log(chalk.yellow('   • This may indicate incomplete cache generation or naming mismatches'));
  }
  
  if (debug.cacheFiles.length !== debug.sectionMapping.size) {
    console.log(chalk.yellow('   • Number of cache files does not match expected sections'));
    console.log(chalk.yellow('   • Check if there are extra files or missing mappings'));
  }
  
  if (debug.issues.length === 0) {
    console.log(chalk.green('   • No major issues detected with cache file structure'));
    console.log(chalk.green('   • Issue may be in the browser loading logic'));
  }
  
  console.log(chalk.cyan('\n🔧 Next Steps:'));
  console.log('   1. Check browser console for JavaScript errors');
  console.log('   2. Verify network requests in browser dev tools');
  console.log('   3. Enable debug mode: add ?debug=true to URL');
  console.log('   4. Check if USE_LIVE_API is affecting cache loading');
}

/**
 * Main execution
 */
async function main() {
  try {
    // Check cache directory
    if (!fs.existsSync(CACHE_DIR)) {
      console.error(chalk.red('❌ Cache directory not found:', CACHE_DIR));
      process.exit(1);
    }
    
    // Run analysis steps
    analyzeManifest();
    discoverCacheFiles();
    analyzeMainSpec();
    analyzeSectionMapping();
    testCacheFileLoading();
    generateReport();
    
    // Exit with appropriate code
    process.exit(debug.issues.length > 0 ? 1 : 0);
    
  } catch (error) {
    console.error(chalk.red('❌ Debug script failed:'), error);
    process.exit(1);
  }
}

// Run the debug script
main();
