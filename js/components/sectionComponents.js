/**
 * Section Components
 * Handles rendering and management of configuration sections
 */

import { ICONS, PLATFORMS, PLATFORM_ICONS, PRIORITY_LEVELS } from '../utils/constants.js';
import { sanitizeHTML, generateId, createSectionBadges, getSectionMetadata } from '../utils/helpers.js';
import { exportService } from '../services/exportService.js';

class SectionComponents {
    constructor() {
        this.expandedSections = new Set();
        this.sectionElements = new Map();
    }

    /**
     * Create section navigation item
     * @param {object} section - Section data
     * @returns {HTMLElement} Navigation item element
     */
    createSectionNavItem(section) {
        const navItem = document.createElement('a');
        navItem.href = `#section-${section.identifier}`;
        navItem.className = 'section-nav-item';
        navItem.dataset.sectionId = section.identifier;
        
        // Add modified indicator if section has modified parameters
        const hasModified = this.hasSectionModifiedParameters(section.identifier);
        if (hasModified) {
            navItem.classList.add('modified');
        }
        
        navItem.innerHTML = `
            <span class="nav-item-text">${sanitizeHTML(section.name)}</span>
            ${section.deprecated ? '<i class="fas fa-exclamation-triangle deprecated-icon" title="Deprecated"></i>' : ''}
            ${createSectionBadges(section)}
        `;
        
        // Add click handler for smooth scrolling
        navItem.addEventListener('click', (e) => {
            e.preventDefault();
            this.scrollToSection(section.identifier);
            this.setActiveNavItem(section.identifier);
        });
        
        return navItem;
    }

    /**
     * Create section header element
     * @param {object} section - Section data
     * @returns {HTMLElement} Section header element
     */
    createSectionHeader(section) {
        // Validate section data
        if (!section || typeof section !== 'object') {
            console.error('createSectionHeader called with invalid section:', section);
            return this.createErrorSectionHeader('Invalid Section Data');
        }

        // Ensure required properties exist with defaults
        const sectionData = {
            identifier: section.identifier || `unknown-${Date.now()}`,
            name: section.name || 'Unknown Section',
            deprecated: Boolean(section.deprecated),
            platforms: Array.isArray(section.platforms) ? section.platforms : [],
            parameters: Array.isArray(section.parameters) ? section.parameters : [],
            // Hierarchical properties
            isSubSection: section.isSubSection || false,
            parentSection: section.parentSection || null,
            parentName: section.parentName || null
        };

        const header = document.createElement('div');
        header.className = 'section-header';
        header.dataset.sectionId = sectionData.identifier;

        const isExpanded = this.expandedSections.has(sectionData.identifier);
        const hasModified = this.hasSectionModifiedParameters(sectionData.identifier);

        try {
            header.innerHTML = `
                <div class="section-header-content">
                    <div class="section-title">
                        ${sectionData.isSubSection ? '<i class="sub-section-indicator">└─</i>' : ''}
                        <i class="${this.getSectionIcon(sectionData.identifier)}"></i>
                        <span>${sanitizeHTML(sectionData.name)}</span>
                        ${sectionData.isSubSection && sectionData.parentName ?
                            `<span class="parent-section-info">← ${sanitizeHTML(sectionData.parentName)}</span>` : ''}
                    </div>
                    <div class="section-meta">
                        ${createSectionBadges(sectionData)}
                        ${sectionData.isSubSection ? '<span class="section-badge sub-section">Sub-Section</span>' : ''}
                        ${hasModified ? '<span class="section-badge modified">Modified</span>' : ''}
                        ${sectionData.deprecated ? '<span class="section-badge deprecated">Deprecated</span>' : ''}
                        ${this.createPlatformBadges(sectionData.platforms)}
                        <span class="section-badge platform">${sectionData.parameters.length} parameters</span>
                        <button class="section-toggle" title="${isExpanded ? 'Collapse' : 'Expand'} section">
                            <i class="${isExpanded ? ICONS.COLLAPSE : ICONS.EXPAND}"></i>
                        </button>
                    </div>
                </div>
            `;
        } catch (error) {
            console.error('Error creating section header HTML:', error, 'section:', sectionData);
            return this.createErrorSectionHeader(`Error: ${sectionData.name}`);
        }

        // Add click handler for toggle
        header.addEventListener('click', () => {
            this.toggleSection(sectionData.identifier);
        });

        return header;
    }

    /**
     * Create error section header for malformed data
     * @param {string} errorMessage - Error message to display
     * @returns {HTMLElement} Error section header element
     */
    createErrorSectionHeader(errorMessage) {
        const header = document.createElement('div');
        header.className = 'section-header error-section';
        header.innerHTML = `
            <div class="section-header-content">
                <div class="section-title">
                    <i class="fas fa-exclamation-triangle"></i>
                    <span>${sanitizeHTML(errorMessage)}</span>
                </div>
                <div class="section-meta">
                    <span class="section-badge error">Error</span>
                </div>
            </div>
        `;
        return header;
    }

    /**
     * Create platform badges for section
     * @param {Array} platforms - Array of platform names
     * @returns {string} HTML string for platform badges
     */
    createPlatformBadges(platforms) {
        if (!platforms || platforms.length === 0) {
            return '<span class="section-badge platform">All Platforms</span>';
        }
        
        return platforms.map(platform => {
            const icon = PLATFORM_ICONS[platform] || 'fas fa-device';
            return `<span class="section-badge platform" title="${platform}">
                <i class="${icon}"></i> ${platform}
            </span>`;
        }).join('');
    }

    /**
     * Create section content container with table format display
     * @param {object} section - Section data
     * @returns {HTMLElement} Section content element
     */
    createSectionContent(section) {
        const content = document.createElement('div');
        content.className = 'section-content';
        content.id = `section-content-${section.identifier}`;

        const isExpanded = this.expandedSections.has(section.identifier);
        if (isExpanded) {
            content.classList.add('expanded');
        }

        // Add section description if available
        if (section.description) {
            const description = document.createElement('div');
            description.className = 'section-description';
            description.innerHTML = `<p>${sanitizeHTML(section.description)}</p>`;
            content.appendChild(description);
        }

        // Create structured content according to specifications
        this.createStructuredSectionContent(content, section);

        return content;
    }

    /**
     * Create structured section content with tables according to specifications
     * @param {HTMLElement} container - Container element
     * @param {object} section - Section data
     */
    createStructuredSectionContent(container, section) {
        // 1. Properties Table (Main configurable parameters)
        if (section.propertyDefinitions && section.propertyDefinitions.length > 0) {
            const propertiesSection = this.createPropertiesTable(section);
            container.appendChild(propertiesSection);
        }

        // 2. Payload Metadata Table
        if (section.payloadMetadata) {
            const metadataSection = this.createPayloadMetadataTable(section.payloadMetadata);
            container.appendChild(metadataSection);
        }

        // 3. Profile Availability Matrix
        if (section.profileAvailability && section.profileAvailability.length > 0) {
            const availabilitySection = this.createProfileAvailabilityTable(section.profileAvailability);
            container.appendChild(availabilitySection);
        }

        // 4. Example Payload XML
        if (section.examplePayloadXML) {
            const exampleSection = this.createExamplePayloadSection(section.examplePayloadXML);
            container.appendChild(exampleSection);
        }

        // Fallback: Legacy parameters container for backward compatibility
        if ((!section.propertyDefinitions || section.propertyDefinitions.length === 0) &&
            section.parameters && section.parameters.length > 0) {
            const parametersContainer = document.createElement('div');
            parametersContainer.className = 'parameters-container legacy-parameters';
            parametersContainer.id = `parameters-${section.identifier}`;
            container.appendChild(parametersContainer);
        }
    }

    /**
     * Create complete section element with table format for parameters
     * @param {object} section - Section data
     * @returns {HTMLElement} Complete section element
     */
    createSectionElement(section) {
        // Validate section data
        if (!section || typeof section !== 'object') {
            console.error('createSectionElement called with invalid section:', section);
            return this.createErrorSectionElement('Invalid Section Data');
        }

        // Log section data for debugging
        console.log('Creating section element for:', {
            identifier: section.identifier,
            name: section.name,
            hasParameters: Array.isArray(section.parameters),
            parameterCount: section.parameters?.length || 0,
            hasPropertyDefinitions: section.propertyDefinitions?.length > 0,
            hasPayloadMetadata: Boolean(section.payloadMetadata),
            hasProfileAvailability: section.profileAvailability?.length > 0
        });

        // Ensure required properties exist with defaults
        const sectionData = {
            identifier: section.identifier || `unknown-${Date.now()}`,
            name: section.name || 'Unknown Section',
            deprecated: Boolean(section.deprecated),
            platforms: Array.isArray(section.platforms) ? section.platforms : [],
            parameters: Array.isArray(section.parameters) ? section.parameters : [],
            description: section.description || '',
            error: section.error || null,
            // Enhanced data for table format display
            propertyDefinitions: section.propertyDefinitions || [],
            payloadMetadata: section.payloadMetadata || null,
            profileAvailability: section.profileAvailability || [],
            examplePayloadXML: section.examplePayloadXML || null,
            parsingMetadata: section.parsingMetadata || null,
            // Hierarchical properties
            isSubSection: section.isSubSection || false,
            parentSection: section.parentSection || null,
            parentName: section.parentName || null
        };

        const sectionEl = document.createElement('section');
        sectionEl.className = sectionData.isSubSection ? 'config-section sub-section' : 'config-section';
        sectionEl.id = `section-${sectionData.identifier}`;
        sectionEl.dataset.sectionId = sectionData.identifier;

        // Add hierarchical data attributes
        if (sectionData.isSubSection) {
            sectionEl.dataset.parentSection = sectionData.parentSection;
            sectionEl.dataset.isSubSection = 'true';
        }

        // Add error class if section has errors
        if (sectionData.error) {
            sectionEl.classList.add('error-section');
            console.warn(`Section ${sectionData.identifier} has error:`, sectionData.error);
        }

        // Add deprecated class if section is deprecated
        if (sectionData.deprecated) {
            sectionEl.classList.add('deprecated');
        }

        // Add modified class if section has modified parameters
        const hasModified = this.hasSectionModifiedParameters(sectionData.identifier);
        if (hasModified) {
            sectionEl.classList.add('modified');
        }

        try {
            // Create and append header
            const header = this.createSectionHeader(sectionData);
            sectionEl.appendChild(header);

            // Create and append content
            const content = this.createSectionContent(sectionData);
            sectionEl.appendChild(content);

            // Store reference
            this.sectionElements.set(sectionData.identifier, sectionEl);

        } catch (error) {
            console.error('Error creating section element:', error, 'section:', sectionData);
            return this.createErrorSectionElement(`Error creating section: ${sectionData.name}`);
        }

        return sectionEl;
    }

    /**
     * Create error section element for malformed data
     * @param {string} errorMessage - Error message to display
     * @returns {HTMLElement} Error section element
     */
    createErrorSectionElement(errorMessage) {
        const sectionEl = document.createElement('section');
        sectionEl.className = 'config-section error-section';
        sectionEl.id = `section-error-${Date.now()}`;

        const header = this.createErrorSectionHeader(errorMessage);
        sectionEl.appendChild(header);

        const content = document.createElement('div');
        content.className = 'section-content';
        content.innerHTML = `
            <div class="error-message">
                <p>This section could not be loaded due to malformed data.</p>
                <p>Please check the console for more details.</p>
            </div>
        `;
        sectionEl.appendChild(content);

        return sectionEl;
    }

    /**
     * Toggle section expanded/collapsed state
     * @param {string} sectionId - Section identifier
     */
    toggleSection(sectionId) {
        const isExpanded = this.expandedSections.has(sectionId);
        
        if (isExpanded) {
            this.collapseSection(sectionId);
        } else {
            this.expandSection(sectionId);
        }
    }

    /**
     * Expand section
     * @param {string} sectionId - Section identifier
     */
    expandSection(sectionId) {
        this.expandedSections.add(sectionId);
        
        const sectionEl = this.sectionElements.get(sectionId);
        if (sectionEl) {
            const content = sectionEl.querySelector('.section-content');
            const toggle = sectionEl.querySelector('.section-toggle i');
            
            if (content) {
                content.classList.add('expanded');
            }
            
            if (toggle) {
                toggle.className = ICONS.COLLAPSE;
                toggle.parentElement.title = 'Collapse section';
            }
        }
        
        // Trigger parameter loading if not already loaded
        this.loadSectionParameters(sectionId);
    }

    /**
     * Collapse section
     * @param {string} sectionId - Section identifier
     */
    collapseSection(sectionId) {
        this.expandedSections.delete(sectionId);
        
        const sectionEl = this.sectionElements.get(sectionId);
        if (sectionEl) {
            const content = sectionEl.querySelector('.section-content');
            const toggle = sectionEl.querySelector('.section-toggle i');
            
            if (content) {
                content.classList.remove('expanded');
            }
            
            if (toggle) {
                toggle.className = ICONS.EXPAND;
                toggle.parentElement.title = 'Expand section';
            }
        }
    }

    /**
     * Load parameters for a section
     * @param {string} sectionId - Section identifier
     */
    loadSectionParameters(sectionId) {
        const parametersContainer = document.getElementById(`parameters-${sectionId}`);
        if (!parametersContainer || parametersContainer.dataset.loaded === 'true') {
            return;
        }
        
        // This will be called by the main app to load parameters
        const event = new CustomEvent('loadSectionParameters', {
            detail: { sectionId }
        });
        document.dispatchEvent(event);
        
        parametersContainer.dataset.loaded = 'true';
    }

    /**
     * Check if section has modified parameters
     * @param {string} sectionId - Section identifier
     * @returns {boolean} True if section has modified parameters
     */
    hasSectionModifiedParameters(sectionId) {
        const modifiedParams = exportService.getModifiedParameters();
        for (const [key, param] of modifiedParams) {
            if (param.sectionId === sectionId) {
                return true;
            }
        }
        return false;
    }

    /**
     * Update section modified state
     * @param {string} sectionId - Section identifier
     */
    updateSectionModifiedState(sectionId) {
        const hasModified = this.hasSectionModifiedParameters(sectionId);
        
        // Update section element
        const sectionEl = this.sectionElements.get(sectionId);
        if (sectionEl) {
            sectionEl.classList.toggle('modified', hasModified);
            
            // Update modified badge
            const existingBadge = sectionEl.querySelector('.section-badge.modified');
            if (hasModified && !existingBadge) {
                const metaContainer = sectionEl.querySelector('.section-meta');
                const modifiedBadge = document.createElement('span');
                modifiedBadge.className = 'section-badge modified';
                modifiedBadge.textContent = 'Modified';
                metaContainer.insertBefore(modifiedBadge, metaContainer.firstChild);
            } else if (!hasModified && existingBadge) {
                existingBadge.remove();
            }
        }
        
        // Update navigation item
        const navItem = document.querySelector(`[data-section-id="${sectionId}"]`);
        if (navItem) {
            navItem.classList.toggle('modified', hasModified);
        }
    }

    /**
     * Get icon for section based on its type
     * @param {string} sectionId - Section identifier
     * @returns {string} Icon class string
     */
    getSectionIcon(sectionId) {
        // Add defensive check for undefined/null sectionId
        if (!sectionId || typeof sectionId !== 'string') {
            console.warn('getSectionIcon called with invalid sectionId:', sectionId);
            return 'fas fa-cogs'; // Default icon
        }

        const iconMap = {
            'accounts': 'fas fa-user-circle',
            'wifi': 'fas fa-wifi',
            'vpn': 'fas fa-shield-alt',
            'email': 'fas fa-envelope',
            'calendar': 'fas fa-calendar',
            'contacts': 'fas fa-address-book',
            'certificates': 'fas fa-certificate',
            'restrictions': 'fas fa-ban',
            'passcode': 'fas fa-lock',
            'apps': 'fas fa-th',
            'network': 'fas fa-network-wired',
            'security': 'fas fa-shield-alt',
            'device': 'fas fa-mobile-alt',
            'system': 'fas fa-cog'
        };

        try {
            const lowerSectionId = sectionId.toLowerCase();
            for (const [key, icon] of Object.entries(iconMap)) {
                if (lowerSectionId.includes(key)) {
                    return icon;
                }
            }
        } catch (error) {
            console.error('Error in getSectionIcon:', error, 'sectionId:', sectionId);
        }

        return 'fas fa-cogs'; // Default icon
    }

    /**
     * Scroll to section smoothly
     * @param {string} sectionId - Section identifier
     */
    scrollToSection(sectionId) {
        const sectionEl = document.getElementById(`section-${sectionId}`);
        if (sectionEl) {
            sectionEl.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    }

    /**
     * Set active navigation item
     * @param {string} sectionId - Section identifier
     */
    setActiveNavItem(sectionId) {
        // Remove active class from all nav items
        document.querySelectorAll('.section-nav-item').forEach(item => {
            item.classList.remove('active');
        });
        
        // Add active class to current item
        const activeItem = document.querySelector(`[data-section-id="${sectionId}"]`);
        if (activeItem) {
            activeItem.classList.add('active');
        }
    }

    /**
     * Highlight search terms in text
     * @param {string} text - Text to highlight
     * @param {string} searchTerm - Term to highlight
     * @returns {string} HTML with highlighted terms
     */
    highlightSearchTerm(text, searchTerm) {
        if (!searchTerm || !text) return text;

        const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        return text.replace(regex, '<mark class="search-highlight">$1</mark>');
    }

    /**
     * Clear search highlights
     * @param {HTMLElement} element - Element to clear highlights from
     */
    clearSearchHighlights(element) {
        const highlights = element.querySelectorAll('.search-highlight');
        highlights.forEach(highlight => {
            const parent = highlight.parentNode;
            parent.replaceChild(document.createTextNode(highlight.textContent), highlight);
            parent.normalize();
        });
    }

    /**
     * Filter sections based on criteria
     * @param {object} filters - Filter criteria
     */
    filterSections(filters) {
        const {
            search,
            showModifiedOnly,
            hideDeprecated,
            platform,
            showPriorityHigh,
            showPriorityMedium,
            showPriorityLow
        } = filters;
        
        this.sectionElements.forEach((sectionEl, sectionId) => {
            let visible = true;

            // Clear previous search highlights
            this.clearSearchHighlights(sectionEl);

            // Search filter
            if (search && search.trim() !== '') {
                const searchLower = search.toLowerCase();
                const sectionTitleEl = sectionEl.querySelector('.section-title span');
                const sectionDescEl = sectionEl.querySelector('.section-description p');

                const sectionName = sectionTitleEl?.textContent.toLowerCase() || '';
                const sectionDescription = sectionDescEl?.textContent.toLowerCase() || '';

                // Check section name and description match
                const sectionNameMatch = sectionName.includes(searchLower);
                const sectionDescMatch = sectionDescription.includes(searchLower);

                // Also search in parameter names and descriptions
                let parameterMatch = false;
                const parameterItems = sectionEl.querySelectorAll('.parameter-item');
                parameterItems.forEach(paramEl => {
                    const paramName = paramEl.querySelector('.parameter-name')?.textContent.toLowerCase() || '';
                    const paramDesc = paramEl.querySelector('.parameter-description')?.textContent.toLowerCase() || '';
                    if (paramName.includes(searchLower) || paramDesc.includes(searchLower)) {
                        parameterMatch = true;
                    }
                });

                visible = visible && (sectionNameMatch || sectionDescMatch || parameterMatch);

                // Apply highlighting if section is visible
                if (visible) {
                    if (sectionNameMatch && sectionTitleEl) {
                        sectionTitleEl.innerHTML = this.highlightSearchTerm(sectionTitleEl.textContent, search);
                    }
                    if (sectionDescMatch && sectionDescEl) {
                        sectionDescEl.innerHTML = this.highlightSearchTerm(sectionDescEl.textContent, search);
                    }
                }
            }
            
            // Modified only filter
            if (showModifiedOnly) {
                visible = visible && this.hasSectionModifiedParameters(sectionId);
            }
            
            // Deprecated filter
            if (hideDeprecated) {
                visible = visible && !sectionEl.classList.contains('deprecated');
            }
            
            // Platform filter
            if (platform && platform !== 'all') {
                const platformBadges = sectionEl.querySelectorAll('.section-badge.platform');
                let hasPlatform = false;
                platformBadges.forEach(badge => {
                    if (badge.textContent.includes(platform)) {
                        hasPlatform = true;
                    }
                });
                visible = visible && hasPlatform;
            }

            // Priority filter
            if (showPriorityHigh !== undefined || showPriorityMedium !== undefined || showPriorityLow !== undefined) {
                // Get section metadata to determine priority
                const sectionData = this.getSectionDataFromElement(sectionEl);
                const metadata = getSectionMetadata(sectionData);
                const sectionPriority = metadata.priority;

                let priorityVisible = false;

                // Check if this priority level should be shown
                if (sectionPriority === PRIORITY_LEVELS.HIGH && showPriorityHigh) {
                    priorityVisible = true;
                } else if (sectionPriority === PRIORITY_LEVELS.MEDIUM && showPriorityMedium) {
                    priorityVisible = true;
                } else if (sectionPriority === PRIORITY_LEVELS.LOW && showPriorityLow) {
                    priorityVisible = true;
                }

                visible = visible && priorityVisible;
            }

            // Apply visibility
            sectionEl.style.display = visible ? 'block' : 'none';
            
            // Update navigation item visibility
            const navItem = document.querySelector(`[data-section-id="${sectionId}"]`);
            if (navItem) {
                navItem.style.display = visible ? 'block' : 'none';
            }
        });
    }

    /**
     * Get section data from DOM element
     * @param {HTMLElement} sectionEl - Section element
     * @returns {object} Section data object
     */
    getSectionDataFromElement(sectionEl) {
        const sectionId = sectionEl.dataset.sectionId || sectionEl.querySelector('.section-header')?.dataset.sectionId;
        const sectionTitleEl = sectionEl.querySelector('.section-title span');
        const sectionName = sectionTitleEl?.textContent || 'Unknown Section';

        return {
            identifier: sectionId,
            name: sectionName,
            // Try to get existing category/priority from data attributes if available
            category: sectionEl.dataset.category,
            priority: sectionEl.dataset.priority
        };
    }

    /**
     * Get all section elements
     * @returns {Map} Map of section elements
     */
    getSectionElements() {
        return this.sectionElements;
    }

    /**
     * Clear all sections
     */
    clearSections() {
        this.sectionElements.clear();
        this.expandedSections.clear();
    }

    /**
     * Create Properties Table (🔧 Properties section)
     * @param {object} section - Section data
     * @returns {HTMLElement} Properties table section
     */
    createPropertiesTable(section) {
        const propertiesSection = document.createElement('div');
        propertiesSection.className = 'properties-section';

        const header = document.createElement('h3');
        header.innerHTML = '🔧 Properties';
        header.className = 'section-table-header';
        propertiesSection.appendChild(header);

        const table = document.createElement('table');
        table.className = 'properties-table';

        // Table header
        const thead = document.createElement('thead');
        thead.innerHTML = `
            <tr>
                <th>Property</th>
                <th>Type</th>
                <th>Default</th>
                <th>Required</th>
                <th>Introduced In</th>
                <th>Description</th>
                <th>Control</th>
            </tr>
        `;
        table.appendChild(thead);

        // Table body
        const tbody = document.createElement('tbody');
        section.propertyDefinitions.forEach(property => {
            const row = this.createPropertyRow(property, section.identifier);
            tbody.appendChild(row);
        });
        table.appendChild(tbody);

        propertiesSection.appendChild(table);
        return propertiesSection;
    }

    /**
     * Create individual property row with controls
     * @param {object} property - Property definition
     * @param {string} sectionId - Section identifier
     * @returns {HTMLElement} Table row element
     */
    createPropertyRow(property, sectionId) {
        const row = document.createElement('tr');
        row.className = 'property-row';
        row.dataset.propertyName = property.name;

        // Create control based on property type
        const control = this.createPropertyControl(property, sectionId);

        row.innerHTML = `
            <td class="property-name">
                <code>${sanitizeHTML(property.name || 'Unknown')}</code>
            </td>
            <td class="property-type">
                <span class="type-badge">${sanitizeHTML(property.type || 'unknown')}</span>
            </td>
            <td class="property-default">
                ${property.defaultValue ? `<code>${sanitizeHTML(property.defaultValue)}</code>` : '<em>none</em>'}
            </td>
            <td class="property-required">
                ${property.required ? '<span class="required-badge">Yes</span>' : '<span class="optional-badge">No</span>'}
            </td>
            <td class="property-introduced">
                ${property.introducedVersion ? `<span class="version-badge">${sanitizeHTML(property.introducedVersion)}</span>` : '<em>unknown</em>'}
            </td>
            <td class="property-description">
                ${property.description ? sanitizeHTML(property.description) : '<em>No description available</em>'}
            </td>
            <td class="property-control">
                ${control.outerHTML}
            </td>
        `;

        return row;
    }

    /**
     * Create property control based on type
     * @param {object} property - Property definition
     * @param {string} sectionId - Section identifier
     * @returns {HTMLElement} Control element
     */
    createPropertyControl(property, sectionId) {
        const controlId = `${sectionId}-${property.name}`;

        if (property.type === 'boolean') {
            // Three-state toggle for boolean parameters
            const container = document.createElement('div');
            container.className = 'three-state-toggle';
            container.innerHTML = `
                <select id="${controlId}" name="${property.name}" class="three-state-select">
                    <option value="">Default</option>
                    <option value="true">True</option>
                    <option value="false">False</option>
                </select>
            `;
            return container;
        } else if (property.type === 'string') {
            const input = document.createElement('input');
            input.type = 'text';
            input.id = controlId;
            input.name = property.name;
            input.className = 'property-input string-input';
            input.placeholder = property.defaultValue || 'Enter value...';
            return input;
        } else if (property.type === 'integer' || property.type === 'number') {
            const input = document.createElement('input');
            input.type = 'number';
            input.id = controlId;
            input.name = property.name;
            input.className = 'property-input number-input';
            input.placeholder = property.defaultValue || '0';
            return input;
        } else {
            // Generic text input for other types
            const input = document.createElement('input');
            input.type = 'text';
            input.id = controlId;
            input.name = property.name;
            input.className = 'property-input generic-input';
            input.placeholder = `${property.type} value...`;
            return input;
        }
    }

    /**
     * Create Payload Metadata Table (📦 Payload Metadata section)
     * @param {object} payloadMetadata - Payload metadata
     * @returns {HTMLElement} Payload metadata table section
     */
    createPayloadMetadataTable(payloadMetadata) {
        const metadataSection = document.createElement('div');
        metadataSection.className = 'payload-metadata-section';

        const header = document.createElement('h3');
        header.innerHTML = '📦 Payload Metadata';
        header.className = 'section-table-header';
        metadataSection.appendChild(header);

        const table = document.createElement('table');
        table.className = 'metadata-table';

        const tbody = document.createElement('tbody');

        const metadataFields = [
            { label: 'Payload Type', value: payloadMetadata.payloadType },
            { label: 'Symbol Kind', value: payloadMetadata.symbolKind },
            { label: 'Supported Platform', value: payloadMetadata.supportedPlatforms?.join(', ') },
            { label: 'Schema Version', value: payloadMetadata.schemaVersion },
            { label: 'Object Name', value: payloadMetadata.objectName },
            { label: 'Abstract', value: payloadMetadata.abstract }
        ];

        metadataFields.forEach(field => {
            if (field.value) {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td class="metadata-field"><strong>${field.label}</strong></td>
                    <td class="metadata-value">${sanitizeHTML(field.value)}</td>
                `;
                tbody.appendChild(row);
            }
        });

        table.appendChild(tbody);
        metadataSection.appendChild(table);
        return metadataSection;
    }

    /**
     * Create Profile Availability Matrix (📋 Profile Availability Matrix section)
     * @param {Array} profileAvailability - Profile availability data
     * @returns {HTMLElement} Profile availability table section
     */
    createProfileAvailabilityTable(profileAvailability) {
        const availabilitySection = document.createElement('div');
        availabilitySection.className = 'profile-availability-section';

        const header = document.createElement('h3');
        header.innerHTML = '📋 Profile Availability Matrix';
        header.className = 'section-table-header';
        availabilitySection.appendChild(header);

        const table = document.createElement('table');
        table.className = 'availability-table';

        // Table header
        const thead = document.createElement('thead');
        thead.innerHTML = `
            <tr>
                <th>Setting</th>
                <th>Availability</th>
            </tr>
        `;
        table.appendChild(thead);

        // Table body
        const tbody = document.createElement('tbody');
        profileAvailability.forEach(item => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="availability-setting">${sanitizeHTML(item.setting || 'Unknown')}</td>
                <td class="availability-value">${sanitizeHTML(item.availability || 'Unknown')}</td>
            `;
            tbody.appendChild(row);
        });
        table.appendChild(tbody);

        availabilitySection.appendChild(table);
        return availabilitySection;
    }

    /**
     * Create Example Payload XML Section (🧪 Example Payload XML section)
     * @param {string} exampleXML - Example payload XML
     * @returns {HTMLElement} Example XML section
     */
    createExamplePayloadSection(exampleXML) {
        const exampleSection = document.createElement('div');
        exampleSection.className = 'example-payload-section';

        const header = document.createElement('h3');
        header.innerHTML = '🧪 Example Payload XML';
        header.className = 'section-table-header';
        exampleSection.appendChild(header);

        const codeContainer = document.createElement('div');
        codeContainer.className = 'code-container';

        const pre = document.createElement('pre');
        pre.className = 'xml-code';

        const code = document.createElement('code');
        code.className = 'language-xml';
        code.textContent = exampleXML;

        pre.appendChild(code);
        codeContainer.appendChild(pre);
        exampleSection.appendChild(codeContainer);

        return exampleSection;
    }

    /**
     * Reset all sections to their initial state
     * Used during application reset
     */
    resetAllSections() {
        try {
            // Clear expanded sections set
            this.expandedSections.clear();

            // Reset all section UI states
            const allSections = document.querySelectorAll('.config-section');
            allSections.forEach(section => {
                // Collapse all sections
                const content = section.querySelector('.section-content');
                if (content) {
                    content.classList.remove('expanded');
                    content.style.display = 'none';
                }

                // Reset toggle icons
                const toggle = section.querySelector('.section-toggle i');
                if (toggle) {
                    toggle.className = ICONS.EXPAND;
                }

                // Update tooltip
                const toggleBtn = section.querySelector('.section-toggle');
                if (toggleBtn) {
                    toggleBtn.setAttribute('data-tooltip', 'Expand section');
                }

                // Remove modified indicators
                section.classList.remove('modified');

                // Reset parameter container state but preserve loaded parameters
                const parametersContainer = section.querySelector('[id^="parameters-"]');
                if (parametersContainer) {
                    // Keep the loaded state as 'true' if parameters are already loaded
                    // This preserves the parameter definitions while allowing value reset
                    if (parametersContainer.dataset.loaded === 'true' && parametersContainer.children.length > 0) {
                        // Parameters are loaded, keep them but they'll be reset by clearAllParameters()
                        console.log(`Preserving loaded parameters for section: ${section.id}`);
                    } else {
                        // No parameters loaded yet, keep as unloaded
                        parametersContainer.dataset.loaded = 'false';
                    }
                }
            });

            // Clear navigation active states
            const navItems = document.querySelectorAll('.section-nav-item');
            navItems.forEach(item => {
                item.classList.remove('active', 'modified');
            });

            console.log('Section components reset successfully');

        } catch (error) {
            console.error('Error resetting section components:', error);
        }
    }
}

// Create and export singleton instance
export const sectionComponents = new SectionComponents();
