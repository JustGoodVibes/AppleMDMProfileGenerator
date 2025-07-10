/**
 * Parameter Components
 * Handles rendering and management of individual configuration parameters
 */

import { PARAMETER_TYPES, BOOLEAN_STATES, ICONS, API_ENDPOINTS } from '../utils/constants.js';
import { sanitizeHTML, generateId, debounce } from '../utils/helpers.js';
import { exportService } from '../services/exportService.js';

class ParameterComponents {
    constructor() {
        this.parameterElements = new Map();
        this.debouncedUpdate = debounce(this.updateParameter.bind(this), 300);
    }

    /**
     * Create parameter element
     * @param {object} parameter - Parameter data
     * @param {string} sectionId - Section identifier
     * @returns {HTMLElement} Parameter element
     */
    createParameterElement(parameter, sectionId) {
        const paramEl = document.createElement('div');
        paramEl.className = 'parameter-item';
        paramEl.id = `param-${sectionId}-${parameter.key}`;
        paramEl.dataset.sectionId = sectionId;
        paramEl.dataset.parameterKey = parameter.key;
        
        // Add deprecated class if parameter is deprecated
        if (parameter.deprecated) {
            paramEl.classList.add('deprecated');
        }
        
        // Check if parameter is modified
        const isModified = exportService.isParameterModified(sectionId, parameter.key);
        if (isModified) {
            paramEl.classList.add('modified');
        }
        
        paramEl.innerHTML = `
            <div class="parameter-header">
                <div class="parameter-info">
                    <div class="parameter-name">${sanitizeHTML(parameter.name || parameter.key)}</div>
                    <div class="parameter-description">${sanitizeHTML(parameter.description || 'No description available')}</div>
                    <div class="parameter-meta">
                        ${this.createMetaBadges(parameter)}
                    </div>
                </div>
                <div class="parameter-actions">
                    ${parameter.url ? `<a href="${parameter.url}" target="_blank" class="doc-link" title="View Documentation">
                        <i class="${ICONS.EXTERNAL_LINK}"></i>
                    </a>` : ''}
                </div>
            </div>
            <div class="parameter-input">
                ${this.createInputElement(parameter, sectionId)}
            </div>
        `;
        
        // Store reference
        this.parameterElements.set(`${sectionId}.${parameter.key}`, paramEl);
        
        return paramEl;
    }

    /**
     * Create meta badges for parameter
     * @param {object} parameter - Parameter data
     * @returns {string} HTML string for meta badges
     */
    createMetaBadges(parameter) {
        const badges = [];
        
        // Type badge
        badges.push(`<span class="meta-badge type">${parameter.type}</span>`);
        
        // Required/Optional badge
        if (parameter.required) {
            badges.push('<span class="meta-badge required">Required</span>');
        } else {
            badges.push('<span class="meta-badge optional">Optional</span>');
        }
        
        // Deprecated badge
        if (parameter.deprecated) {
            badges.push('<span class="meta-badge deprecated">Deprecated</span>');
        }
        
        // Platform badges
        if (parameter.platforms && parameter.platforms.length > 0) {
            parameter.platforms.forEach(platform => {
                badges.push(`<span class="meta-badge platform">${platform}</span>`);
            });
        }
        
        return badges.join('');
    }

    /**
     * Create input element based on parameter type (Enhanced Dynamic Version)
     * @param {object} parameter - Parameter data
     * @param {string} sectionId - Section identifier
     * @returns {string} HTML string for input element
     */
    createInputElement(parameter, sectionId) {
        const inputId = `input-${sectionId}-${parameter.key}`;
        const currentValue = exportService.getParameter(sectionId, parameter.key);

        // Dynamic type detection and UI generation
        const uiType = this.determineUIType(parameter);

        switch (uiType) {
            case PARAMETER_TYPES.BOOLEAN:
                return this.createBooleanToggle(inputId, currentValue, parameter, sectionId);

            case PARAMETER_TYPES.STRING:
                return this.createStringInput(inputId, currentValue, parameter, sectionId);

            case PARAMETER_TYPES.NUMBER:
            case PARAMETER_TYPES.INTEGER:
                return this.createNumberInput(inputId, currentValue, parameter, sectionId);

            case PARAMETER_TYPES.ARRAY:
                return this.createArrayInput(inputId, currentValue, parameter, sectionId);

            case PARAMETER_TYPES.ENUM:
                return this.createEnumSelect(inputId, currentValue, parameter, sectionId);

            case PARAMETER_TYPES.DATE:
                return this.createDateInput(inputId, currentValue, parameter, sectionId);

            case PARAMETER_TYPES.OBJECT:
                return this.createObjectInput(inputId, currentValue, parameter, sectionId);

            case PARAMETER_TYPES.DATA:
                return this.createDataInput(inputId, currentValue, parameter, sectionId);

            default:
                // For unknown types, create adaptive input with type information
                return this.createAdaptiveInput(inputId, currentValue, parameter, sectionId);
        }
    }

    /**
     * Determine the appropriate UI type for a parameter
     * @param {object} parameter - Parameter data
     * @returns {string} UI type to use
     */
    determineUIType(parameter) {
        // Check if parameter has enum values - always use enum UI
        if (parameter.enumValues && parameter.enumValues.length > 0) {
            return PARAMETER_TYPES.ENUM;
        }

        // Check for known parameter types
        const knownTypes = Object.values(PARAMETER_TYPES);
        if (knownTypes.includes(parameter.type)) {
            return parameter.type;
        }

        // Infer UI type from parameter characteristics
        if (parameter.constraints) {
            if (parameter.constraints.minimum !== undefined || parameter.constraints.maximum !== undefined) {
                return PARAMETER_TYPES.NUMBER;
            }
            if (parameter.constraints.minLength !== undefined || parameter.constraints.maxLength !== undefined) {
                return PARAMETER_TYPES.STRING;
            }
        }

        // Infer from default value
        if (parameter.defaultValue !== undefined) {
            const defaultType = typeof parameter.defaultValue;
            if (defaultType === 'boolean') return PARAMETER_TYPES.BOOLEAN;
            if (defaultType === 'number') return PARAMETER_TYPES.NUMBER;
            if (Array.isArray(parameter.defaultValue)) return PARAMETER_TYPES.ARRAY;
            if (defaultType === 'object') return PARAMETER_TYPES.OBJECT;
        }

        // Pattern-based inference
        const lowerType = parameter.type.toLowerCase();
        if (lowerType.includes('bool')) return PARAMETER_TYPES.BOOLEAN;
        if (lowerType.includes('int') || lowerType.includes('number')) {
            return lowerType.includes('int') ? PARAMETER_TYPES.INTEGER : PARAMETER_TYPES.NUMBER;
        }
        if (lowerType.includes('array') || lowerType.includes('list')) return PARAMETER_TYPES.ARRAY;
        if (lowerType.includes('object') || lowerType.includes('dict')) return PARAMETER_TYPES.OBJECT;
        if (lowerType.includes('date') || lowerType.includes('time')) return PARAMETER_TYPES.DATE;
        if (lowerType.includes('data') || lowerType.includes('binary')) return PARAMETER_TYPES.DATA;

        // Default to string for unknown types
        return PARAMETER_TYPES.STRING;
    }

    /**
     * Create adaptive input for unknown parameter types
     * @param {string} inputId - Input element ID
     * @param {any} currentValue - Current value
     * @param {object} parameter - Parameter data
     * @param {string} sectionId - Section identifier
     * @returns {string} HTML string for adaptive input
     */
    createAdaptiveInput(inputId, currentValue, parameter, sectionId) {
        const value = currentValue !== undefined ? currentValue : '';

        return `
            <div class="input-group adaptive-input">
                <div class="adaptive-input-header">
                    <span class="unknown-type-badge">Unknown Type: ${parameter.type}</span>
                    <span class="adaptive-hint">Using text input with validation</span>
                </div>
                <textarea id="${inputId}"
                         class="textarea-input adaptive-textarea"
                         placeholder="Enter ${parameter.name || parameter.key}... (Type: ${parameter.type})"
                         data-section-id="${sectionId}"
                         data-parameter-key="${parameter.key}"
                         data-type="${parameter.type}"
                         data-original-type="${parameter.type}"
                         rows="3">${value}</textarea>
                <div class="adaptive-input-footer">
                    <small>This parameter uses an unknown type. The value will be stored as entered.</small>
                    ${parameter.rawData ? `<button type="button" class="view-raw-btn" onclick="this.showRawData('${parameter.key}')">View Raw Data</button>` : ''}
                </div>
            </div>
        `;
    }

    /**
     * Create three-state boolean toggle
     * @param {string} inputId - Input element ID
     * @param {any} currentValue - Current value
     * @param {object} parameter - Parameter data
     * @param {string} sectionId - Section identifier
     * @returns {string} HTML string for boolean toggle
     */
    createBooleanToggle(inputId, currentValue, parameter, sectionId) {
        const states = [
            { value: BOOLEAN_STATES.DEFAULT, label: 'Default', icon: ICONS.BOOLEAN_DEFAULT, class: 'default' },
            { value: BOOLEAN_STATES.TRUE, label: 'True', icon: ICONS.BOOLEAN_TRUE, class: 'true' },
            { value: BOOLEAN_STATES.FALSE, label: 'False', icon: ICONS.BOOLEAN_FALSE, class: 'false' }
        ];
        
        const activeState = currentValue === true ? BOOLEAN_STATES.TRUE : 
                           currentValue === false ? BOOLEAN_STATES.FALSE : 
                           BOOLEAN_STATES.DEFAULT;
        
        const stateButtons = states.map(state => `
            <button type="button" 
                    class="toggle-state ${state.class} ${state.value === activeState ? 'active' : ''}"
                    data-value="${state.value}"
                    data-section-id="${sectionId}"
                    data-parameter-key="${parameter.key}">
                <i class="${state.icon}"></i>
                <span>${state.label}</span>
            </button>
        `).join('');
        
        return `
            <div class="boolean-toggle">
                <div class="toggle-states" id="${inputId}">
                    ${stateButtons}
                </div>
            </div>
        `;
    }

    /**
     * Create string input
     * @param {string} inputId - Input element ID
     * @param {any} currentValue - Current value
     * @param {object} parameter - Parameter data
     * @param {string} sectionId - Section identifier
     * @returns {string} HTML string for string input
     */
    createStringInput(inputId, currentValue, parameter, sectionId) {
        const value = currentValue !== undefined ? sanitizeHTML(String(currentValue)) : '';
        const isTextarea = parameter.description && parameter.description.length > 100;
        
        if (isTextarea) {
            return `
                <div class="input-group">
                    <textarea id="${inputId}" 
                              class="textarea-input"
                              placeholder="Enter ${parameter.name || parameter.key}..."
                              data-section-id="${sectionId}"
                              data-parameter-key="${parameter.key}"
                              data-type="${parameter.type}"
                              rows="3">${value}</textarea>
                </div>
            `;
        } else {
            return `
                <div class="input-group">
                    <input type="text" 
                           id="${inputId}"
                           class="text-input"
                           placeholder="Enter ${parameter.name || parameter.key}..."
                           value="${value}"
                           data-section-id="${sectionId}"
                           data-parameter-key="${parameter.key}"
                           data-type="${parameter.type}">
                </div>
            `;
        }
    }

    /**
     * Create number input
     * @param {string} inputId - Input element ID
     * @param {any} currentValue - Current value
     * @param {object} parameter - Parameter data
     * @param {string} sectionId - Section identifier
     * @returns {string} HTML string for number input
     */
    createNumberInput(inputId, currentValue, parameter, sectionId) {
        const value = currentValue !== undefined ? currentValue : '';
        const step = parameter.type === PARAMETER_TYPES.INTEGER ? '1' : 'any';
        
        return `
            <div class="input-group">
                <input type="number" 
                       id="${inputId}"
                       class="number-input"
                       placeholder="Enter ${parameter.name || parameter.key}..."
                       value="${value}"
                       step="${step}"
                       data-section-id="${sectionId}"
                       data-parameter-key="${parameter.key}"
                       data-type="${parameter.type}">
            </div>
        `;
    }

    /**
     * Create array input
     * @param {string} inputId - Input element ID
     * @param {any} currentValue - Current value
     * @param {object} parameter - Parameter data
     * @param {string} sectionId - Section identifier
     * @returns {string} HTML string for array input
     */
    createArrayInput(inputId, currentValue, parameter, sectionId) {
        const values = Array.isArray(currentValue) ? currentValue : [];
        
        const itemsHtml = values.map((value, index) => `
            <div class="array-item">
                <input type="text" 
                       class="text-input"
                       value="${sanitizeHTML(String(value))}"
                       placeholder="Item ${index + 1}"
                       data-index="${index}">
                <button type="button" class="remove-item-btn" data-index="${index}">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `).join('');
        
        return `
            <div class="array-input" id="${inputId}" 
                 data-section-id="${sectionId}"
                 data-parameter-key="${parameter.key}"
                 data-type="${parameter.type}">
                <div class="array-header">
                    <span class="array-title">${parameter.name || parameter.key} (${values.length} items)</span>
                    <button type="button" class="add-item-btn">
                        <i class="fas fa-plus"></i> Add Item
                    </button>
                </div>
                <div class="array-items">
                    ${itemsHtml}
                </div>
            </div>
        `;
    }

    /**
     * Create enum select
     * @param {string} inputId - Input element ID
     * @param {any} currentValue - Current value
     * @param {object} parameter - Parameter data
     * @param {string} sectionId - Section identifier
     * @returns {string} HTML string for enum select
     */
    createEnumSelect(inputId, currentValue, parameter, sectionId) {
        const options = parameter.enumValues || [];
        const value = currentValue !== undefined ? currentValue : '';
        
        const optionsHtml = [
            '<option value="">Select an option...</option>',
            ...options.map(option => `
                <option value="${sanitizeHTML(String(option))}" ${option === value ? 'selected' : ''}>
                    ${sanitizeHTML(String(option))}
                </option>
            `)
        ].join('');
        
        return `
            <div class="input-group">
                <select id="${inputId}"
                        class="select-input"
                        data-section-id="${sectionId}"
                        data-parameter-key="${parameter.key}"
                        data-type="${parameter.type}">
                    ${optionsHtml}
                </select>
            </div>
        `;
    }

    /**
     * Create date input
     * @param {string} inputId - Input element ID
     * @param {any} currentValue - Current value
     * @param {object} parameter - Parameter data
     * @param {string} sectionId - Section identifier
     * @returns {string} HTML string for date input
     */
    createDateInput(inputId, currentValue, parameter, sectionId) {
        let value = '';
        if (currentValue) {
            const date = new Date(currentValue);
            if (!isNaN(date.getTime())) {
                value = date.toISOString().split('T')[0];
            }
        }
        
        return `
            <div class="input-group">
                <input type="date" 
                       id="${inputId}"
                       class="text-input"
                       value="${value}"
                       data-section-id="${sectionId}"
                       data-parameter-key="${parameter.key}"
                       data-type="${parameter.type}">
            </div>
        `;
    }

    /**
     * Create object input for complex object types
     * @param {string} inputId - Input element ID
     * @param {any} currentValue - Current value
     * @param {object} parameter - Parameter data
     * @param {string} sectionId - Section identifier
     * @returns {string} HTML string for object input
     */
    createObjectInput(inputId, currentValue, parameter, sectionId) {
        const value = currentValue ? JSON.stringify(currentValue, null, 2) : '';

        return `
            <div class="input-group object-input-group">
                <div class="object-input-header">
                    <span class="object-type-badge">Object</span>
                    <button type="button" class="format-json-btn" onclick="parameterComponents.formatJSON('${inputId}')">Format JSON</button>
                </div>
                <textarea id="${inputId}"
                         class="textarea-input object-textarea"
                         placeholder="Enter JSON object for ${parameter.name || parameter.key}..."
                         data-section-id="${sectionId}"
                         data-parameter-key="${parameter.key}"
                         data-type="${parameter.type}"
                         rows="6">${value}</textarea>
                <div class="object-input-footer">
                    <small>Enter a valid JSON object. Use the Format button to validate and format.</small>
                </div>
            </div>
        `;
    }

    /**
     * Create data input for binary/base64 data types
     * @param {string} inputId - Input element ID
     * @param {any} currentValue - Current value
     * @param {object} parameter - Parameter data
     * @param {string} sectionId - Section identifier
     * @returns {string} HTML string for data input
     */
    createDataInput(inputId, currentValue, parameter, sectionId) {
        const value = currentValue !== undefined ? currentValue : '';

        return `
            <div class="input-group data-input-group">
                <div class="data-input-header">
                    <span class="data-type-badge">Data (Base64)</span>
                    <div class="data-input-controls">
                        <button type="button" class="file-upload-btn" onclick="parameterComponents.uploadFile('${inputId}')">Upload File</button>
                        <button type="button" class="validate-base64-btn" onclick="parameterComponents.validateBase64('${inputId}')">Validate</button>
                    </div>
                </div>
                <textarea id="${inputId}"
                         class="textarea-input data-textarea"
                         placeholder="Enter base64 encoded data for ${parameter.name || parameter.key}..."
                         data-section-id="${sectionId}"
                         data-parameter-key="${parameter.key}"
                         data-type="${parameter.type}"
                         rows="4">${value}</textarea>
                <div class="data-input-footer">
                    <small>Enter base64 encoded data or use the Upload button to encode a file.</small>
                </div>
                <input type="file" id="${inputId}-file" style="display: none;" onchange="parameterComponents.handleFileUpload(event, '${inputId}')">
            </div>
        `;
    }

    /**
     * Format JSON in object input
     * @param {string} inputId - Input element ID
     */
    formatJSON(inputId) {
        const input = document.getElementById(inputId);
        if (!input) return;

        try {
            const parsed = JSON.parse(input.value);
            input.value = JSON.stringify(parsed, null, 2);
            input.classList.remove('error');
        } catch (error) {
            input.classList.add('error');
            console.error('Invalid JSON:', error);
        }
    }

    /**
     * Upload file for data input
     * @param {string} inputId - Input element ID
     */
    uploadFile(inputId) {
        const fileInput = document.getElementById(`${inputId}-file`);
        if (fileInput) {
            fileInput.click();
        }
    }

    /**
     * Handle file upload for data input
     * @param {Event} event - File input change event
     * @param {string} inputId - Target input element ID
     */
    handleFileUpload(event, inputId) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const base64 = e.target.result.split(',')[1]; // Remove data:type;base64, prefix
            const input = document.getElementById(inputId);
            if (input) {
                input.value = base64;
                // Trigger change event
                input.dispatchEvent(new Event('input', { bubbles: true }));
            }
        };
        reader.readAsDataURL(file);
    }

    /**
     * Validate base64 data
     * @param {string} inputId - Input element ID
     */
    validateBase64(inputId) {
        const input = document.getElementById(inputId);
        if (!input) return;

        try {
            atob(input.value);
            input.classList.remove('error');
            input.classList.add('valid');
            setTimeout(() => input.classList.remove('valid'), 2000);
        } catch (error) {
            input.classList.add('error');
            console.error('Invalid base64:', error);
        }
    }

    /**
     * Attach event listeners to parameter inputs
     * @param {HTMLElement} container - Container element
     */
    attachEventListeners(container) {
        // Boolean toggle handlers
        container.addEventListener('click', (e) => {
            if (e.target.closest('.toggle-state')) {
                this.handleBooleanToggle(e);
            } else if (e.target.closest('.add-item-btn')) {
                this.handleArrayAddItem(e);
            } else if (e.target.closest('.remove-item-btn')) {
                this.handleArrayRemoveItem(e);
            }
        });
        
        // Input change handlers
        container.addEventListener('input', (e) => {
            if (e.target.matches('.text-input, .number-input, .textarea-input, .select-input')) {
                this.handleInputChange(e);
            } else if (e.target.closest('.array-input')) {
                this.handleArrayInputChange(e);
            }
        });
        
        // Input blur handlers for validation
        container.addEventListener('blur', (e) => {
            if (e.target.matches('.text-input, .number-input, .textarea-input')) {
                this.validateInput(e.target);
            }
        }, true);
    }

    /**
     * Handle boolean toggle click
     * @param {Event} e - Click event
     */
    handleBooleanToggle(e) {
        const button = e.target.closest('.toggle-state');
        const sectionId = button.dataset.sectionId;
        const parameterKey = button.dataset.parameterKey;
        const value = button.dataset.value;
        
        // Update toggle state
        const toggleContainer = button.parentElement;
        toggleContainer.querySelectorAll('.toggle-state').forEach(btn => {
            btn.classList.remove('active');
        });
        button.classList.add('active');
        
        // Convert value to appropriate type
        let paramValue;
        if (value === BOOLEAN_STATES.TRUE) {
            paramValue = true;
        } else if (value === BOOLEAN_STATES.FALSE) {
            paramValue = false;
        } else {
            paramValue = undefined; // Default state
        }
        
        this.updateParameter(sectionId, parameterKey, paramValue);
    }

    /**
     * Handle input change
     * @param {Event} e - Input event
     */
    handleInputChange(e) {
        const input = e.target;
        const sectionId = input.dataset.sectionId;
        const parameterKey = input.dataset.parameterKey;
        const type = input.dataset.type;
        
        let value = input.value;
        
        // Convert value based on type
        if (type === PARAMETER_TYPES.NUMBER || type === PARAMETER_TYPES.INTEGER) {
            value = value === '' ? undefined : (type === PARAMETER_TYPES.INTEGER ? parseInt(value, 10) : parseFloat(value));
        } else if (type === PARAMETER_TYPES.DATE) {
            value = value === '' ? undefined : new Date(value);
        } else if (value === '') {
            value = undefined;
        }
        
        this.debouncedUpdate(sectionId, parameterKey, value);
    }

    /**
     * Handle array add item
     * @param {Event} e - Click event
     */
    handleArrayAddItem(e) {
        const arrayContainer = e.target.closest('.array-input');
        const itemsContainer = arrayContainer.querySelector('.array-items');
        const currentItems = itemsContainer.querySelectorAll('.array-item');
        const newIndex = currentItems.length;
        
        const newItem = document.createElement('div');
        newItem.className = 'array-item';
        newItem.innerHTML = `
            <input type="text" 
                   class="text-input"
                   placeholder="Item ${newIndex + 1}"
                   data-index="${newIndex}">
            <button type="button" class="remove-item-btn" data-index="${newIndex}">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        itemsContainer.appendChild(newItem);
        newItem.querySelector('input').focus();
        
        this.updateArrayParameter(arrayContainer);
    }

    /**
     * Handle array remove item
     * @param {Event} e - Click event
     */
    handleArrayRemoveItem(e) {
        const arrayContainer = e.target.closest('.array-input');
        const item = e.target.closest('.array-item');
        
        item.remove();
        this.updateArrayParameter(arrayContainer);
        this.reindexArrayItems(arrayContainer);
    }

    /**
     * Handle array input change
     * @param {Event} e - Input event
     */
    handleArrayInputChange(e) {
        if (e.target.matches('.array-item input')) {
            const arrayContainer = e.target.closest('.array-input');
            this.debouncedUpdate = debounce(() => {
                this.updateArrayParameter(arrayContainer);
            }, 300);
            this.debouncedUpdate();
        }
    }

    /**
     * Update array parameter value
     * @param {HTMLElement} arrayContainer - Array container element
     */
    updateArrayParameter(arrayContainer) {
        const sectionId = arrayContainer.dataset.sectionId;
        const parameterKey = arrayContainer.dataset.parameterKey;
        
        const inputs = arrayContainer.querySelectorAll('.array-item input');
        const values = Array.from(inputs)
            .map(input => input.value.trim())
            .filter(value => value !== '');
        
        // Update title with count
        const title = arrayContainer.querySelector('.array-title');
        if (title) {
            title.textContent = `${parameterKey} (${values.length} items)`;
        }
        
        this.updateParameter(sectionId, parameterKey, values.length > 0 ? values : undefined);
    }

    /**
     * Reindex array items after removal
     * @param {HTMLElement} arrayContainer - Array container element
     */
    reindexArrayItems(arrayContainer) {
        const items = arrayContainer.querySelectorAll('.array-item');
        items.forEach((item, index) => {
            const input = item.querySelector('input');
            const button = item.querySelector('.remove-item-btn');
            
            input.dataset.index = index;
            input.placeholder = `Item ${index + 1}`;
            button.dataset.index = index;
        });
    }

    /**
     * Update parameter value in export service
     * @param {string} sectionId - Section identifier
     * @param {string} parameterKey - Parameter key
     * @param {any} value - Parameter value
     */
    updateParameter(sectionId, parameterKey, value) {
        const paramKey = `${sectionId}.${parameterKey}`;
        const paramEl = this.parameterElements.get(paramKey);
        
        if (value === undefined || value === null || value === '') {
            exportService.removeParameter(sectionId, parameterKey);
            if (paramEl) {
                paramEl.classList.remove('modified');
            }
        } else {
            // Get parameter info for validation
            const parameterInfo = this.getParameterInfo(sectionId, parameterKey);
            exportService.setParameter(sectionId, parameterKey, value, parameterInfo);
            if (paramEl) {
                paramEl.classList.add('modified');
            }
        }
        
        // Trigger section update
        const event = new CustomEvent('parameterChanged', {
            detail: { sectionId, parameterKey, value }
        });
        document.dispatchEvent(event);
    }

    /**
     * Get parameter info for validation
     * @param {string} sectionId - Section identifier
     * @param {string} parameterKey - Parameter key
     * @returns {object} Parameter info
     */
    getParameterInfo(sectionId, parameterKey) {
        // This would normally come from the loaded data
        // For now, return basic info
        return {
            type: PARAMETER_TYPES.STRING,
            required: false,
            platforms: []
        };
    }

    /**
     * Validate input value
     * @param {HTMLElement} input - Input element
     * @returns {boolean} True if valid
     */
    validateInput(input) {
        const type = input.dataset.type;
        const value = input.value;
        
        // Remove previous validation classes
        input.classList.remove('invalid', 'valid');
        
        if (value === '') {
            return true; // Empty is valid for optional fields
        }
        
        let isValid = true;
        
        switch (type) {
            case PARAMETER_TYPES.NUMBER:
            case PARAMETER_TYPES.INTEGER:
                isValid = !isNaN(value) && value !== '';
                if (type === PARAMETER_TYPES.INTEGER) {
                    isValid = isValid && Number.isInteger(parseFloat(value));
                }
                break;
                
            case PARAMETER_TYPES.DATE:
                isValid = !isNaN(new Date(value).getTime());
                break;
                
            default:
                isValid = true;
        }
        
        input.classList.add(isValid ? 'valid' : 'invalid');
        return isValid;
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
     * Filter parameters based on criteria
     * @param {HTMLElement} container - Container element
     * @param {object} filters - Filter criteria
     */
    filterParameters(container, filters) {
        const { search, showModifiedOnly, hideDeprecated, platform } = filters;
        
        const parameters = container.querySelectorAll('.parameter-item');
        parameters.forEach(paramEl => {
            let visible = true;

            // Clear previous search highlights
            this.clearSearchHighlights(paramEl);

            // Search filter
            if (search && search.trim() !== '') {
                const searchLower = search.toLowerCase();
                const paramNameEl = paramEl.querySelector('.parameter-name');
                const paramDescEl = paramEl.querySelector('.parameter-description');

                const paramName = paramNameEl?.textContent.toLowerCase() || '';
                const paramDesc = paramDescEl?.textContent.toLowerCase() || '';

                // Also search in parameter key/identifier
                const paramKey = paramEl.dataset.parameterKey?.toLowerCase() || '';

                // Search in meta badges (type, platform, etc.)
                const metaBadges = paramEl.querySelectorAll('.meta-badge');
                let metaMatch = false;
                metaBadges.forEach(badge => {
                    if (badge.textContent.toLowerCase().includes(searchLower)) {
                        metaMatch = true;
                    }
                });

                const paramNameMatch = paramName.includes(searchLower);
                const paramDescMatch = paramDesc.includes(searchLower);
                const paramKeyMatch = paramKey.includes(searchLower);

                visible = visible && (paramNameMatch || paramDescMatch || paramKeyMatch || metaMatch);

                // Apply highlighting if parameter is visible
                if (visible) {
                    if (paramNameMatch && paramNameEl) {
                        paramNameEl.innerHTML = this.highlightSearchTerm(paramNameEl.textContent, search);
                    }
                    if (paramDescMatch && paramDescEl) {
                        paramDescEl.innerHTML = this.highlightSearchTerm(paramDescEl.textContent, search);
                    }
                }
            }
            
            // Modified only filter
            if (showModifiedOnly) {
                visible = visible && paramEl.classList.contains('modified');
            }
            
            // Deprecated filter
            if (hideDeprecated) {
                visible = visible && !paramEl.classList.contains('deprecated');
            }
            
            // Platform filter
            if (platform && platform !== 'all') {
                const platformBadges = paramEl.querySelectorAll('.meta-badge.platform');
                let hasPlatform = false;
                platformBadges.forEach(badge => {
                    if (badge.textContent.includes(platform)) {
                        hasPlatform = true;
                    }
                });
                visible = visible && (hasPlatform || platformBadges.length === 0);
            }
            
            paramEl.style.display = visible ? 'block' : 'none';
        });
    }

    /**
     * Clear all parameter elements
     */
    clearParameters() {
        this.parameterElements.clear();
    }
}

// Create and export singleton instance
export const parameterComponents = new ParameterComponents();
