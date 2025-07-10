/**
 * Unit Tests for Section Badge Functionality
 * Tests the visual category and priority labels for MDM sections
 */

import { getSectionMetadata, createCategoryBadge, createPriorityBadge, createSectionBadges } from '../../js/utils/helpers.js';
import { SECTION_CATEGORIES, PRIORITY_LEVELS } from '../../js/utils/constants.js';

describe('Section Badge Functionality', () => {
    describe('getSectionMetadata', () => {
        test('should return metadata for known sections', () => {
            const section = { name: 'Firewall', identifier: 'firewall' };
            const metadata = getSectionMetadata(section);
            
            expect(metadata.category).toBe(SECTION_CATEGORIES.SECURITY);
            expect(metadata.priority).toBe(PRIORITY_LEVELS.HIGH);
        });

        test('should return metadata for sections with existing category/priority', () => {
            const section = { 
                name: 'Test Section', 
                identifier: 'test',
                category: SECTION_CATEGORIES.APPS,
                priority: PRIORITY_LEVELS.MEDIUM
            };
            const metadata = getSectionMetadata(section);
            
            expect(metadata.category).toBe(SECTION_CATEGORIES.APPS);
            expect(metadata.priority).toBe(PRIORITY_LEVELS.MEDIUM);
        });

        test('should provide fallback metadata for unknown sections', () => {
            const section = { name: 'Unknown Section', identifier: 'unknown' };
            const metadata = getSectionMetadata(section);
            
            expect(metadata.category).toBe(SECTION_CATEGORIES.CORE);
            expect(metadata.priority).toBe(PRIORITY_LEVELS.MEDIUM);
        });

        test('should handle pattern matching for security-related sections', () => {
            const section = { name: 'Security Settings', identifier: 'securitysettings' };
            const metadata = getSectionMetadata(section);
            
            expect(metadata.category).toBe(SECTION_CATEGORIES.SECURITY);
            expect(metadata.priority).toBe(PRIORITY_LEVELS.HIGH);
        });

        test('should handle pattern matching for network-related sections', () => {
            const section = { name: 'WiFi Configuration', identifier: 'wificonfig' };
            const metadata = getSectionMetadata(section);
            
            expect(metadata.category).toBe(SECTION_CATEGORIES.NETWORK);
            expect(metadata.priority).toBe(PRIORITY_LEVELS.HIGH);
        });

        test('should handle null/undefined sections gracefully', () => {
            const metadata1 = getSectionMetadata(null);
            const metadata2 = getSectionMetadata(undefined);
            
            expect(metadata1.category).toBe(SECTION_CATEGORIES.SYSTEM);
            expect(metadata1.priority).toBe(PRIORITY_LEVELS.MEDIUM);
            expect(metadata2.category).toBe(SECTION_CATEGORIES.SYSTEM);
            expect(metadata2.priority).toBe(PRIORITY_LEVELS.MEDIUM);
        });
    });

    describe('createCategoryBadge', () => {
        test('should create category badge with correct HTML structure', () => {
            const badge = createCategoryBadge(SECTION_CATEGORIES.SECURITY);
            
            expect(badge).toContain('section-badge category security');
            expect(badge).toContain('Security');
            expect(badge).toContain('aria-label="Section category: Security"');
            expect(badge).toContain('role="img"');
        });

        test('should return empty string for null/undefined category', () => {
            expect(createCategoryBadge(null)).toBe('');
            expect(createCategoryBadge(undefined)).toBe('');
            expect(createCategoryBadge('')).toBe('');
        });

        test('should handle multi-word categories correctly', () => {
            const badge = createCategoryBadge('Test Category');
            
            expect(badge).toContain('testcategory');
            expect(badge).toContain('Test Category');
        });
    });

    describe('createPriorityBadge', () => {
        test('should create priority badge with correct HTML structure', () => {
            const badge = createPriorityBadge(PRIORITY_LEVELS.HIGH);
            
            expect(badge).toContain('section-badge priority high');
            expect(badge).toContain('High');
            expect(badge).toContain('aria-label="Priority level: High"');
            expect(badge).toContain('role="img"');
            expect(badge).toContain('🔴'); // High priority icon
        });

        test('should use correct icons for different priority levels', () => {
            const highBadge = createPriorityBadge(PRIORITY_LEVELS.HIGH);
            const mediumBadge = createPriorityBadge(PRIORITY_LEVELS.MEDIUM);
            const lowBadge = createPriorityBadge(PRIORITY_LEVELS.LOW);
            
            expect(highBadge).toContain('🔴');
            expect(mediumBadge).toContain('🟡');
            expect(lowBadge).toContain('🟢');
        });

        test('should capitalize priority text correctly', () => {
            const badge = createPriorityBadge('medium');
            
            expect(badge).toContain('Medium');
            expect(badge).toContain('priority medium');
        });

        test('should return empty string for null/undefined priority', () => {
            expect(createPriorityBadge(null)).toBe('');
            expect(createPriorityBadge(undefined)).toBe('');
            expect(createPriorityBadge('')).toBe('');
        });
    });

    describe('createSectionBadges', () => {
        test('should create combined badges with correct structure', () => {
            const section = { name: 'VPN', identifier: 'vpn' };
            const badges = createSectionBadges(section);
            
            expect(badges).toContain('badge-container');
            expect(badges).toContain('role="group"');
            expect(badges).toContain('Network category');
            expect(badges).toContain('high priority');
            expect(badges).toContain('section-badge category network');
            expect(badges).toContain('section-badge priority high');
        });

        test('should handle sections with existing metadata', () => {
            const section = { 
                name: 'Custom Section',
                identifier: 'custom',
                category: SECTION_CATEGORIES.APPS,
                priority: PRIORITY_LEVELS.LOW
            };
            const badges = createSectionBadges(section);
            
            expect(badges).toContain('Apps category');
            expect(badges).toContain('low priority');
        });

        test('should provide fallback badges for unknown sections', () => {
            const section = { name: 'Unknown', identifier: 'unknown' };
            const badges = createSectionBadges(section);
            
            expect(badges).toContain('badge-container');
            expect(badges).toContain('section-badge category');
            expect(badges).toContain('section-badge priority');
        });
    });

    describe('Integration with Known MDM Sections', () => {
        const knownSections = [
            { name: 'Accounts', identifier: 'accounts', expectedCategory: SECTION_CATEGORIES.CORE },
            { name: 'App Store', identifier: 'appstore', expectedCategory: SECTION_CATEGORIES.APPS },
            { name: 'Security & Privacy', identifier: 'securityandprivacy', expectedCategory: SECTION_CATEGORIES.SECURITY },
            { name: 'VPN', identifier: 'vpn', expectedCategory: SECTION_CATEGORIES.NETWORK },
            { name: 'Software Update', identifier: 'softwareupdate', expectedCategory: SECTION_CATEGORIES.SYSTEM },
            { name: 'Active Directory', identifier: 'activedirectory', expectedCategory: SECTION_CATEGORIES.AUTHENTICATION },
            { name: 'AirPrint', identifier: 'airprint', expectedCategory: SECTION_CATEGORIES.DEVICE },
            { name: 'Dock', identifier: 'dock', expectedCategory: SECTION_CATEGORIES.UI },
            { name: 'Education', identifier: 'education', expectedCategory: SECTION_CATEGORIES.EDUCATION }
        ];

        test.each(knownSections)('should correctly categorize $name section', ({ name, identifier, expectedCategory }) => {
            const section = { name, identifier };
            const metadata = getSectionMetadata(section);
            
            expect(metadata.category).toBe(expectedCategory);
            expect([PRIORITY_LEVELS.HIGH, PRIORITY_LEVELS.MEDIUM, PRIORITY_LEVELS.LOW]).toContain(metadata.priority);
        });

        test('should create valid badges for all known sections', () => {
            knownSections.forEach(({ name, identifier }) => {
                const section = { name, identifier };
                const badges = createSectionBadges(section);
                
                expect(badges).toContain('badge-container');
                expect(badges).toContain('section-badge category');
                expect(badges).toContain('section-badge priority');
                expect(badges).toContain('role="group"');
                expect(badges).toContain('aria-label');
            });
        });
    });
});
