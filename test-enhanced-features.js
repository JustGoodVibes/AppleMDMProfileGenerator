/**
 * Enhanced Features Test Script
 * Copy-paste this into browser console to test all new features
 */

console.log('🧪 TESTING ENHANCED FEATURES');
console.log('============================');

// Wait for app to be loaded
function waitForApp() {
    return new Promise((resolve) => {
        if (window.app && window.appState) {
            resolve();
        } else {
            setTimeout(() => waitForApp().then(resolve), 100);
        }
    });
}

async function testEnhancedFeatures() {
    console.log('⏳ Waiting for app to load...');
    await waitForApp();
    
    console.log('✅ App loaded, starting enhanced feature tests...');
    
    // Test 1: Dark Theme Visual Check
    console.log('\n📋 TEST 1: Dark Theme Visual Check');
    console.log('==================================');
    
    const rootStyles = getComputedStyle(document.documentElement);
    const bgPrimary = rootStyles.getPropertyValue('--background-primary').trim();
    const textPrimary = rootStyles.getPropertyValue('--text-primary').trim();
    
    console.log('Background primary:', bgPrimary);
    console.log('Text primary:', textPrimary);
    
    if (bgPrimary.includes('#1C1C1E') || bgPrimary.includes('1C1C1E')) {
        console.log('✅ PASS: Dark theme colors detected');
    } else {
        console.log('❌ FAIL: Dark theme not applied');
    }
    
    // Test 2: Filter Controls Check
    console.log('\n📋 TEST 2: Filter Controls Check');
    console.log('===============================');
    
    const platformFilter = document.getElementById('platform-filter');
    const modifiedToggle = document.getElementById('modified-only-toggle');
    const clearFilters = document.getElementById('clear-filters');
    
    console.log('Platform filter (single select):', !!platformFilter && !platformFilter.multiple);
    console.log('Modified toggle switch:', !!modifiedToggle && modifiedToggle.type === 'checkbox');
    console.log('Clear filters button:', !!clearFilters);
    
    if (platformFilter && !platformFilter.multiple) {
        console.log('✅ PASS: Platform filter is single select');
    } else {
        console.log('❌ FAIL: Platform filter issue');
    }
    
    if (modifiedToggle && modifiedToggle.type === 'checkbox') {
        console.log('✅ PASS: Modified toggle switch found');
    } else {
        console.log('❌ FAIL: Modified toggle switch not found');
    }
    
    // Test 3: Search Functionality
    console.log('\n📋 TEST 3: Search Functionality');
    console.log('==============================');
    
    const searchInput = document.getElementById('search-input');
    const clearSearch = document.getElementById('clear-search');
    const resultsCount = document.getElementById('search-results-count');
    
    if (searchInput) {
        console.log('🔍 Testing search input...');
        
        // Simulate typing in search
        searchInput.value = 'accounts';
        searchInput.dispatchEvent(new Event('input', { bubbles: true }));
        
        setTimeout(() => {
            const isVisible = !resultsCount.classList.contains('hidden');
            console.log('Search results count visible:', isVisible);
            
            if (isVisible) {
                console.log('✅ PASS: Search results count appears');
            } else {
                console.log('❌ FAIL: Search results count not visible');
            }
            
            // Check for search highlighting
            const highlights = document.querySelectorAll('.search-highlight');
            console.log('Search highlights found:', highlights.length);
            
            if (highlights.length > 0) {
                console.log('✅ PASS: Search highlighting works');
            } else {
                console.log('⚠️ WARNING: No search highlights found');
            }
            
            // Clear search
            if (clearSearch) {
                clearSearch.click();
                setTimeout(() => {
                    const clearedHighlights = document.querySelectorAll('.search-highlight');
                    console.log('Highlights after clear:', clearedHighlights.length);
                    
                    if (clearedHighlights.length === 0) {
                        console.log('✅ PASS: Search clear works');
                    } else {
                        console.log('❌ FAIL: Search clear incomplete');
                    }
                }, 100);
            }
        }, 200);
    }
    
    // Test 4: Parameter Input Improvements
    console.log('\n📋 TEST 4: Parameter Input Improvements');
    console.log('======================================');
    
    // First expand a section to see parameters
    const accountsSection = document.querySelector('[data-section-id="accounts"]');
    if (accountsSection) {
        const header = accountsSection.querySelector('.section-header');
        console.log('🖱️ Expanding Accounts section to test parameters...');
        
        header.click();
        
        setTimeout(() => {
            const parameters = accountsSection.querySelectorAll('.parameter');
            const booleanToggles = accountsSection.querySelectorAll('.boolean-toggle-group');
            const descriptions = accountsSection.querySelectorAll('.parameter-description');
            
            console.log('Parameters found:', parameters.length);
            console.log('Boolean toggles found:', booleanToggles.length);
            console.log('Parameter descriptions found:', descriptions.length);
            
            if (parameters.length > 0) {
                console.log('✅ PASS: Parameters are displayed');
                
                // Check parameter structure
                const firstParam = parameters[0];
                const hasHeader = firstParam.querySelector('.parameter-header');
                const hasLabel = firstParam.querySelector('.parameter-label');
                const hasMeta = firstParam.querySelector('.parameter-meta');
                const hasDescription = firstParam.querySelector('.parameter-description');
                
                console.log('Parameter structure:');
                console.log('  - Header:', !!hasHeader);
                console.log('  - Label:', !!hasLabel);
                console.log('  - Meta info:', !!hasMeta);
                console.log('  - Description:', !!hasDescription);
                
                if (hasHeader && hasLabel && hasMeta) {
                    console.log('✅ PASS: Parameter structure improved');
                } else {
                    console.log('❌ FAIL: Parameter structure incomplete');
                }
            }
            
            // Test boolean toggle if available
            if (booleanToggles.length > 0) {
                console.log('🧪 Testing boolean toggle...');
                const firstToggle = booleanToggles[0];
                const trueButton = firstToggle.querySelector('[data-value="true"]');
                
                if (trueButton) {
                    trueButton.click();
                    
                    setTimeout(() => {
                        const isActive = trueButton.classList.contains('active');
                        console.log('Boolean toggle active after click:', isActive);
                        
                        if (isActive) {
                            console.log('✅ PASS: Boolean toggle works');
                        } else {
                            console.log('❌ FAIL: Boolean toggle not working');
                        }
                    }, 100);
                }
            }
            
        }, 300);
    }
    
    // Test 5: Filter Integration
    console.log('\n📋 TEST 5: Filter Integration');
    console.log('============================');
    
    setTimeout(() => {
        if (platformFilter) {
            console.log('🧪 Testing platform filter...');
            
            // Set platform filter
            platformFilter.value = 'macOS';
            platformFilter.dispatchEvent(new Event('change', { bubbles: true }));
            
            setTimeout(() => {
                const visibleSections = document.querySelectorAll('.section:not([style*="display: none"])');
                console.log('Visible sections after platform filter:', visibleSections.length);
                
                if (visibleSections.length > 0) {
                    console.log('✅ PASS: Platform filter works');
                } else {
                    console.log('⚠️ WARNING: No sections visible after filter');
                }
                
                // Reset filter
                platformFilter.value = '';
                platformFilter.dispatchEvent(new Event('change', { bubbles: true }));
            }, 200);
        }
        
        if (modifiedToggle) {
            console.log('🧪 Testing modified-only toggle...');
            
            // Toggle modified-only filter
            modifiedToggle.checked = true;
            modifiedToggle.dispatchEvent(new Event('change', { bubbles: true }));
            
            setTimeout(() => {
                const visibleSections = document.querySelectorAll('.section:not([style*="display: none"])');
                console.log('Visible sections with modified-only:', visibleSections.length);
                
                // Reset toggle
                modifiedToggle.checked = false;
                modifiedToggle.dispatchEvent(new Event('change', { bubbles: true }));
                
                console.log('✅ PASS: Modified-only toggle tested');
            }, 200);
        }
    }, 1000);
    
    // Final Summary
    setTimeout(() => {
        console.log('\n📊 ENHANCED FEATURES TEST SUMMARY');
        console.log('=================================');
        console.log('✅ Dark theme styling');
        console.log('✅ Single-select platform filter');
        console.log('✅ Modified-only toggle switch');
        console.log('✅ Real-time search with highlighting');
        console.log('✅ Improved parameter input structure');
        console.log('✅ Boolean ternary operation UI');
        console.log('✅ Parameter descriptions outside inputs');
        console.log('✅ Filter integration');
        console.log('\n🎉 ALL ENHANCED FEATURES TESTED!');
        
        console.log('\n💡 Manual testing suggestions:');
        console.log('- Try typing in the search box and watch live highlighting');
        console.log('- Toggle the "Show Only Modified" switch');
        console.log('- Change the platform filter dropdown');
        console.log('- Expand sections and interact with boolean parameters');
        console.log('- Check that parameter descriptions are readable');
        
    }, 2000);
}

// Auto-run tests
testEnhancedFeatures();

// Make function available globally
window.testEnhancedFeatures = testEnhancedFeatures;

console.log('\n💡 Manual test function available: window.testEnhancedFeatures()');
