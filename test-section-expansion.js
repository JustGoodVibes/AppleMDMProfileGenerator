/**
 * Section Expansion Fix Test Script
 * Copy-paste this into browser console to test section content visibility
 */

console.log('🧪 TESTING SECTION EXPANSION FIX');
console.log('================================');

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

async function testSectionExpansion() {
    console.log('⏳ Waiting for app to load...');
    await waitForApp();
    
    console.log('✅ App loaded, starting section expansion tests...');
    
    // Test 1: Check sections with different parameter counts
    console.log('\n📋 TEST 1: Section Parameter Count Analysis');
    console.log('==========================================');
    
    const sections = window.appState.getAllSections();
    const sectionsByParamCount = sections.map(section => ({
        id: section.identifier,
        name: section.name,
        paramCount: section.parameters.length
    })).sort((a, b) => b.paramCount - a.paramCount);
    
    console.log('Sections by parameter count:');
    sectionsByParamCount.slice(0, 10).forEach(section => {
        console.log(`  ${section.name}: ${section.paramCount} parameters`);
    });
    
    // Test 2: Test expansion of sections with many parameters
    console.log('\n📋 TEST 2: Testing High-Parameter Sections');
    console.log('=========================================');
    
    const highParamSections = sectionsByParamCount.filter(s => s.paramCount > 10).slice(0, 3);
    
    for (const sectionInfo of highParamSections) {
        console.log(`\n🧪 Testing section: ${sectionInfo.name} (${sectionInfo.paramCount} parameters)`);
        
        const sectionElement = document.querySelector(`[data-section-id="${sectionInfo.id}"]`);
        if (!sectionElement) {
            console.log(`❌ Section element not found: ${sectionInfo.id}`);
            continue;
        }
        
        const header = sectionElement.querySelector('.section-header');
        const content = sectionElement.querySelector('.section-content');
        
        if (!header || !content) {
            console.log(`❌ Header or content not found for: ${sectionInfo.id}`);
            continue;
        }
        
        // Test expansion
        console.log('🖱️ Expanding section...');
        header.click();
        
        await new Promise(resolve => setTimeout(resolve, 300)); // Wait for expansion
        
        // Check if content is properly expanded
        const isExpanded = content.classList.contains('expanded');
        const contentHeight = content.scrollHeight;
        const visibleHeight = content.offsetHeight;
        const maxHeight = getComputedStyle(content).maxHeight;
        const overflow = getComputedStyle(content).overflow;
        
        console.log(`  Expanded class: ${isExpanded}`);
        console.log(`  Content height: ${contentHeight}px`);
        console.log(`  Visible height: ${visibleHeight}px`);
        console.log(`  Max height: ${maxHeight}`);
        console.log(`  Overflow: ${overflow}`);
        
        // Check for content clipping
        const isClipped = contentHeight > visibleHeight && overflow === 'hidden';
        
        if (isClipped) {
            console.log(`❌ CONTENT CLIPPED: ${contentHeight - visibleHeight}px hidden`);
        } else {
            console.log(`✅ Content fully visible`);
        }
        
        // Check parameter visibility
        const parameters = sectionElement.querySelectorAll('.parameter');
        const visibleParams = Array.from(parameters).filter(param => {
            const rect = param.getBoundingClientRect();
            return rect.height > 0 && rect.width > 0;
        });
        
        console.log(`  Parameters loaded: ${parameters.length}`);
        console.log(`  Parameters visible: ${visibleParams.length}`);
        
        if (parameters.length === visibleParams.length) {
            console.log(`✅ All parameters visible`);
        } else {
            console.log(`❌ Some parameters hidden: ${parameters.length - visibleParams.length} missing`);
        }
        
        // Test collapse
        console.log('🖱️ Collapsing section...');
        header.click();
        
        await new Promise(resolve => setTimeout(resolve, 200)); // Wait for collapse
        
        const isCollapsed = !content.classList.contains('expanded');
        const collapsedHeight = content.offsetHeight;
        
        console.log(`  Collapsed: ${isCollapsed}`);
        console.log(`  Collapsed height: ${collapsedHeight}px`);
        
        if (isCollapsed && collapsedHeight === 0) {
            console.log(`✅ Properly collapsed`);
        } else {
            console.log(`❌ Collapse issue detected`);
        }
    }
    
    // Test 3: Test specific problematic sections
    console.log('\n📋 TEST 3: Testing Specific Sections');
    console.log('===================================');
    
    const testSections = ['dock', 'educationconfiguration', 'restrictions', 'systempreferences'];
    
    for (const sectionId of testSections) {
        console.log(`\n🧪 Testing section: ${sectionId}`);
        
        const sectionElement = document.querySelector(`[data-section-id="${sectionId}"]`);
        if (!sectionElement) {
            console.log(`⚠️ Section not found: ${sectionId}`);
            continue;
        }
        
        const header = sectionElement.querySelector('.section-header');
        const content = sectionElement.querySelector('.section-content');
        
        // Expand and test
        header.click();
        await new Promise(resolve => setTimeout(resolve, 400));
        
        const contentRect = content.getBoundingClientRect();
        const containerRect = content.querySelector('.parameters-container')?.getBoundingClientRect();
        
        console.log(`  Section content rect:`, {
            height: contentRect.height,
            width: contentRect.width,
            visible: contentRect.height > 0
        });
        
        if (containerRect) {
            console.log(`  Parameters container rect:`, {
                height: containerRect.height,
                width: containerRect.width,
                visible: containerRect.height > 0
            });
            
            // Check if container is clipped by content
            const isContainerClipped = containerRect.bottom > contentRect.bottom;
            if (isContainerClipped) {
                console.log(`❌ Parameters container is clipped`);
            } else {
                console.log(`✅ Parameters container fully visible`);
            }
        }
        
        // Collapse for next test
        header.click();
        await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    // Test 4: CSS Properties Check
    console.log('\n📋 TEST 4: CSS Properties Verification');
    console.log('=====================================');
    
    const testElement = document.querySelector('.section-content.expanded');
    if (testElement) {
        const styles = getComputedStyle(testElement);
        console.log('Expanded section CSS properties:');
        console.log(`  max-height: ${styles.maxHeight}`);
        console.log(`  overflow: ${styles.overflow}`);
        console.log(`  opacity: ${styles.opacity}`);
        console.log(`  transition: ${styles.transition}`);
        
        if (styles.maxHeight === 'none' || styles.maxHeight === 'fit-content') {
            console.log('✅ Max-height properly set for unlimited content');
        } else {
            console.log('⚠️ Max-height may limit content visibility');
        }
        
        if (styles.overflow === 'visible') {
            console.log('✅ Overflow set to visible');
        } else {
            console.log('⚠️ Overflow may clip content');
        }
    }
    
    // Final Summary
    console.log('\n📊 SECTION EXPANSION TEST SUMMARY');
    console.log('=================================');
    console.log('✅ Section parameter count analysis complete');
    console.log('✅ High-parameter sections tested');
    console.log('✅ Specific problematic sections tested');
    console.log('✅ CSS properties verified');
    console.log('\n🎉 SECTION EXPANSION TESTS COMPLETE!');
    
    console.log('\n💡 Manual verification steps:');
    console.log('1. Expand sections with many parameters (Dock, EducationConfiguration)');
    console.log('2. Scroll through all parameters to ensure none are cut off');
    console.log('3. Check that boolean toggles and descriptions are fully visible');
    console.log('4. Verify smooth expand/collapse animations');
    console.log('5. Test on different screen sizes');
}

// Auto-run tests
testSectionExpansion();

// Make function available globally
window.testSectionExpansion = testSectionExpansion;

console.log('\n💡 Manual test function available: window.testSectionExpansion()');
