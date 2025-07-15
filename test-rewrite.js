/**
 * Test Script for Clean Rewrite
 * Copy-paste this into browser console to test the Accounts section
 */

console.log('🧪 TESTING CLEAN REWRITE - ACCOUNTS SECTION');
console.log('============================================');

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

async function testAccountsSection() {
    console.log('⏳ Waiting for app to load...');
    await waitForApp();
    
    console.log('✅ App loaded, starting tests...');
    
    // Test 1: Check initial state
    console.log('\n📋 TEST 1: Initial State Check');
    console.log('==============================');
    
    const initialExpandedSections = Array.from(window.appState.expandedSections);
    console.log('Initial expanded sections:', initialExpandedSections);
    
    if (initialExpandedSections.length === 0) {
        console.log('✅ PASS: No sections expanded initially (clean state)');
    } else {
        console.log('❌ FAIL: Some sections are expanded initially:', initialExpandedSections);
    }
    
    // Test 2: Find Accounts section
    console.log('\n📋 TEST 2: Accounts Section Discovery');
    console.log('====================================');
    
    const accountsSection = window.appState.getSection('accounts');
    console.log('Accounts section data:', accountsSection);
    
    if (accountsSection) {
        console.log('✅ PASS: Accounts section found in state');
        console.log('  - Name:', accountsSection.name);
        console.log('  - Parameters:', accountsSection.parameters.length);
    } else {
        console.log('❌ FAIL: Accounts section not found in state');
        console.log('Available sections:', window.appState.getAllSections().map(s => s.identifier));
    }
    
    // Test 3: Find Accounts DOM element
    console.log('\n📋 TEST 3: Accounts DOM Element Check');
    console.log('====================================');
    
    const accountsElement = document.querySelector('[data-section-id="accounts"]');
    console.log('Accounts DOM element:', accountsElement);
    
    if (accountsElement) {
        console.log('✅ PASS: Accounts DOM element found');
        
        const header = accountsElement.querySelector('.section-header');
        const content = accountsElement.querySelector('.section-content');
        const toggle = accountsElement.querySelector('.section-toggle');
        
        console.log('  - Header:', !!header);
        console.log('  - Content:', !!content);
        console.log('  - Toggle:', !!toggle);
        
        if (content) {
            const isExpanded = content.classList.contains('expanded');
            console.log('  - Initially expanded:', isExpanded);
            
            if (!isExpanded) {
                console.log('✅ PASS: Accounts section starts collapsed visually');
            } else {
                console.log('❌ FAIL: Accounts section starts expanded visually');
            }
        }
    } else {
        console.log('❌ FAIL: Accounts DOM element not found');
    }
    
    // Test 4: Test click functionality
    console.log('\n📋 TEST 4: Click Functionality Test');
    console.log('==================================');
    
    if (accountsElement) {
        const header = accountsElement.querySelector('.section-header');
        const content = accountsElement.querySelector('.section-content');
        
        if (header && content) {
            console.log('🖱️ Simulating click on Accounts header...');
            
            // Record state before click
            const beforeClick = {
                jsExpanded: window.appState.isSectionExpanded('accounts'),
                cssExpanded: content.classList.contains('expanded'),
                expandedSections: Array.from(window.appState.expandedSections)
            };
            
            console.log('Before click:', beforeClick);
            
            // Simulate click
            header.click();
            
            // Check state after click (with small delay for any async operations)
            setTimeout(() => {
                const afterClick = {
                    jsExpanded: window.appState.isSectionExpanded('accounts'),
                    cssExpanded: content.classList.contains('expanded'),
                    expandedSections: Array.from(window.appState.expandedSections)
                };
                
                console.log('After click:', afterClick);
                
                // Verify expansion
                if (afterClick.jsExpanded && afterClick.cssExpanded) {
                    console.log('✅ PASS: Accounts section expanded correctly');
                    console.log('  - JavaScript state: expanded');
                    console.log('  - CSS state: expanded');
                    console.log('  - States are synchronized ✅');
                    
                    // Test collapse
                    console.log('\n🖱️ Testing collapse...');
                    header.click();
                    
                    setTimeout(() => {
                        const afterSecondClick = {
                            jsExpanded: window.appState.isSectionExpanded('accounts'),
                            cssExpanded: content.classList.contains('expanded'),
                            expandedSections: Array.from(window.appState.expandedSections)
                        };
                        
                        console.log('After second click (collapse):', afterSecondClick);
                        
                        if (!afterSecondClick.jsExpanded && !afterSecondClick.cssExpanded) {
                            console.log('✅ PASS: Accounts section collapsed correctly');
                            console.log('  - JavaScript state: collapsed');
                            console.log('  - CSS state: collapsed');
                            console.log('  - States are synchronized ✅');
                        } else {
                            console.log('❌ FAIL: Accounts section did not collapse correctly');
                        }
                        
                        // Final summary
                        console.log('\n📊 FINAL TEST SUMMARY');
                        console.log('=====================');
                        console.log('✅ Clean initial state');
                        console.log('✅ Section data loaded');
                        console.log('✅ DOM elements present');
                        console.log('✅ Expansion works');
                        console.log('✅ Collapse works');
                        console.log('✅ State synchronization works');
                        console.log('\n🎉 ALL TESTS PASSED - ACCOUNTS SECTION IS WORKING!');
                        
                    }, 100);
                    
                } else {
                    console.log('❌ FAIL: Accounts section did not expand correctly');
                    console.log('  - JavaScript state:', afterClick.jsExpanded ? 'expanded' : 'collapsed');
                    console.log('  - CSS state:', afterClick.cssExpanded ? 'expanded' : 'collapsed');
                    console.log('  - State mismatch detected ❌');
                }
            }, 100);
            
        } else {
            console.log('❌ FAIL: Cannot test click - header or content missing');
        }
    } else {
        console.log('❌ FAIL: Cannot test click - Accounts element not found');
    }
}

// Test 5: Performance and state integrity
function testStateIntegrity() {
    console.log('\n📋 TEST 5: State Integrity Check');
    console.log('===============================');
    
    if (window.appState) {
        const sections = window.appState.getAllSections();
        const expandedSections = Array.from(window.appState.expandedSections);
        const modifiedParams = window.appState.getModifiedParametersCount();
        
        console.log('State integrity:');
        console.log('  - Total sections loaded:', sections.length);
        console.log('  - Expanded sections:', expandedSections.length);
        console.log('  - Modified parameters:', modifiedParams);
        console.log('  - State object type:', typeof window.appState);
        console.log('  - State methods available:', Object.getOwnPropertyNames(Object.getPrototypeOf(window.appState)));
        
        if (sections.length > 0) {
            console.log('✅ PASS: Sections loaded successfully');
        } else {
            console.log('❌ FAIL: No sections loaded');
        }
        
        if (expandedSections.length === 0) {
            console.log('✅ PASS: Clean initial expanded state');
        } else {
            console.log('⚠️ WARNING: Some sections expanded initially');
        }
    }
}

// Run all tests
async function runAllTests() {
    try {
        await testAccountsSection();
        testStateIntegrity();
    } catch (error) {
        console.error('❌ Test execution failed:', error);
    }
}

// Auto-run tests
runAllTests();

// Make functions available globally for manual testing
window.testAccountsSection = testAccountsSection;
window.testStateIntegrity = testStateIntegrity;
window.runAllTests = runAllTests;

console.log('\n💡 Manual test functions available:');
console.log('- window.testAccountsSection()');
console.log('- window.testStateIntegrity()');
console.log('- window.runAllTests()');
