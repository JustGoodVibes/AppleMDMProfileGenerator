/**
 * Export Service
 * Handles generation and export of Apple MDM configuration profiles
 */

import { EXPORT_CONFIG, XML_TEMPLATES, PARAMETER_TYPES } from '../utils/constants.js';
import { escapeXML, formatDate, generateId, downloadFile } from '../utils/helpers.js';

class ExportService {
    constructor() {
        this.modifiedParameters = new Map();
    }

    /**
     * Set modified parameter value
     * @param {string} sectionId - Section identifier
     * @param {string} parameterKey - Parameter key
     * @param {any} value - Parameter value
     * @param {object} parameterInfo - Parameter metadata
     */
    setParameter(sectionId, parameterKey, value, parameterInfo) {
        const key = `${sectionId}.${parameterKey}`;
        this.modifiedParameters.set(key, {
            sectionId,
            parameterKey,
            value,
            type: parameterInfo.type,
            platforms: parameterInfo.platforms || [],
            required: parameterInfo.required || false
        });
    }

    /**
     * Remove parameter from modified list
     * @param {string} sectionId - Section identifier
     * @param {string} parameterKey - Parameter key
     */
    removeParameter(sectionId, parameterKey) {
        const key = `${sectionId}.${parameterKey}`;
        this.modifiedParameters.delete(key);
    }

    /**
     * Get modified parameter value
     * @param {string} sectionId - Section identifier
     * @param {string} parameterKey - Parameter key
     * @returns {any} Parameter value or undefined
     */
    getParameter(sectionId, parameterKey) {
        const key = `${sectionId}.${parameterKey}`;
        const param = this.modifiedParameters.get(key);
        return param ? param.value : undefined;
    }

    /**
     * Check if parameter is modified
     * @param {string} sectionId - Section identifier
     * @param {string} parameterKey - Parameter key
     * @returns {boolean} True if parameter is modified
     */
    isParameterModified(sectionId, parameterKey) {
        const key = `${sectionId}.${parameterKey}`;
        return this.modifiedParameters.has(key);
    }

    /**
     * Get all modified parameters
     * @returns {Map} Map of modified parameters
     */
    getModifiedParameters() {
        return new Map(this.modifiedParameters);
    }

    /**
     * Get count of modified parameters
     * @returns {number} Number of modified parameters
     */
    getModifiedCount() {
        return this.modifiedParameters.size;
    }

    /**
     * Clear all modified parameters
     */
    clearModifiedParameters() {
        this.modifiedParameters.clear();
    }

    /**
     * Convert JavaScript value to XML plist format
     * @param {any} value - Value to convert
     * @param {string} type - Parameter type
     * @param {number} indent - Indentation level
     * @returns {string} XML representation
     */
    valueToXML(value, type, indent = 1) {
        const tabs = '\t'.repeat(indent);
        
        if (value === null || value === undefined) {
            return '';
        }

        switch (type) {
            case PARAMETER_TYPES.STRING:
                return `${tabs}${XML_TEMPLATES.STRING(escapeXML(String(value)))}`;
                
            case PARAMETER_TYPES.BOOLEAN:
                return value ? `${tabs}${XML_TEMPLATES.TRUE}` : `${tabs}${XML_TEMPLATES.FALSE}`;
                
            case PARAMETER_TYPES.INTEGER:
                return `${tabs}${XML_TEMPLATES.INTEGER(parseInt(value, 10))}`;
                
            case PARAMETER_TYPES.NUMBER:
                return `${tabs}${XML_TEMPLATES.REAL(parseFloat(value))}`;
                
            case PARAMETER_TYPES.DATE:
                const dateValue = value instanceof Date ? value : new Date(value);
                return `${tabs}${XML_TEMPLATES.DATE(dateValue.toISOString())}`;
                
            case PARAMETER_TYPES.DATA:
                // Assume base64 encoded data
                return `${tabs}${XML_TEMPLATES.DATA(String(value))}`;
                
            case PARAMETER_TYPES.ARRAY:
                if (!Array.isArray(value) || value.length === 0) {
                    return `${tabs}${XML_TEMPLATES.ARRAY_OPEN}\n${tabs}${XML_TEMPLATES.ARRAY_CLOSE}`;
                }
                
                let arrayXML = `${tabs}${XML_TEMPLATES.ARRAY_OPEN}\n`;
                value.forEach(item => {
                    // Assume array items are strings unless specified otherwise
                    arrayXML += this.valueToXML(item, PARAMETER_TYPES.STRING, indent + 1) + '\n';
                });
                arrayXML += `${tabs}${XML_TEMPLATES.ARRAY_CLOSE}`;
                return arrayXML;
                
            case PARAMETER_TYPES.OBJECT:
                if (!value || typeof value !== 'object') {
                    return `${tabs}${XML_TEMPLATES.DICT_OPEN}\n${tabs}${XML_TEMPLATES.DICT_CLOSE}`;
                }
                
                let dictXML = `${tabs}${XML_TEMPLATES.DICT_OPEN}\n`;
                Object.keys(value).forEach(key => {
                    dictXML += `${tabs}\t${XML_TEMPLATES.KEY(escapeXML(key))}\n`;
                    dictXML += this.valueToXML(value[key], PARAMETER_TYPES.STRING, indent + 1) + '\n';
                });
                dictXML += `${tabs}${XML_TEMPLATES.DICT_CLOSE}`;
                return dictXML;
                
            default:
                // Default to string
                return `${tabs}${XML_TEMPLATES.STRING(escapeXML(String(value)))}`;
        }
    }

    /**
     * Generate payload dictionary for a section
     * @param {string} sectionId - Section identifier
     * @param {Array} sectionParameters - Section parameters
     * @returns {string} XML payload dictionary
     */
    generatePayloadDict(sectionId, sectionParameters) {
        const sectionModified = Array.from(this.modifiedParameters.values())
            .filter(param => param.sectionId === sectionId);
            
        if (sectionModified.length === 0) {
            return '';
        }

        let payloadXML = '\t\t<dict>\n';
        
        // Add PayloadType (required for all payloads)
        payloadXML += `\t\t\t${XML_TEMPLATES.KEY('PayloadType')}\n`;
        payloadXML += `\t\t\t${XML_TEMPLATES.STRING(sectionId)}\n`;
        
        // Add PayloadIdentifier (required for all payloads)
        payloadXML += `\t\t\t${XML_TEMPLATES.KEY('PayloadIdentifier')}\n`;
        payloadXML += `\t\t\t${XML_TEMPLATES.STRING(`${sectionId}.${generateId()}`)}\n`;
        
        // Add PayloadUUID (required for all payloads)
        payloadXML += `\t\t\t${XML_TEMPLATES.KEY('PayloadUUID')}\n`;
        payloadXML += `\t\t\t${XML_TEMPLATES.STRING(generateId('uuid'))}\n`;
        
        // Add PayloadVersion (required for all payloads)
        payloadXML += `\t\t\t${XML_TEMPLATES.KEY('PayloadVersion')}\n`;
        payloadXML += `\t\t\t${XML_TEMPLATES.INTEGER(1)}\n`;
        
        // Add modified parameters
        sectionModified.forEach(param => {
            payloadXML += `\t\t\t${XML_TEMPLATES.KEY(param.parameterKey)}\n`;
            payloadXML += this.valueToXML(param.value, param.type, 3) + '\n';
        });
        
        payloadXML += '\t\t</dict>';
        return payloadXML;
    }

    /**
     * Generate complete configuration profile XML
     * @param {object} profileInfo - Profile metadata
     * @param {Array} sections - Available sections
     * @returns {string} Complete XML configuration profile
     */
    generateProfileXML(profileInfo, sections) {
        const {
            name = EXPORT_CONFIG.DEFAULT_PROFILE_NAME,
            identifier = EXPORT_CONFIG.DEFAULT_IDENTIFIER,
            description = EXPORT_CONFIG.DEFAULT_DESCRIPTION
        } = profileInfo;

        let xml = XML_TEMPLATES.PLIST_HEADER + '\n';
        xml += XML_TEMPLATES.DICT_OPEN + '\n';
        
        // Profile metadata
        xml += `\t${XML_TEMPLATES.KEY('PayloadContent')}\n`;
        xml += `\t${XML_TEMPLATES.ARRAY_OPEN}\n`;
        
        // Generate payload dictionaries for sections with modified parameters
        const payloads = [];
        sections.forEach(section => {
            const payloadDict = this.generatePayloadDict(section.identifier, section.parameters);
            if (payloadDict) {
                payloads.push(payloadDict);
            }
        });
        
        xml += payloads.join('\n') + '\n';
        xml += `\t${XML_TEMPLATES.ARRAY_CLOSE}\n`;
        
        // Profile properties
        xml += `\t${XML_TEMPLATES.KEY('PayloadDescription')}\n`;
        xml += `\t${XML_TEMPLATES.STRING(escapeXML(description))}\n`;
        
        xml += `\t${XML_TEMPLATES.KEY('PayloadDisplayName')}\n`;
        xml += `\t${XML_TEMPLATES.STRING(escapeXML(name))}\n`;
        
        xml += `\t${XML_TEMPLATES.KEY('PayloadIdentifier')}\n`;
        xml += `\t${XML_TEMPLATES.STRING(escapeXML(identifier))}\n`;
        
        xml += `\t${XML_TEMPLATES.KEY('PayloadType')}\n`;
        xml += `\t${XML_TEMPLATES.STRING('Configuration')}\n`;
        
        xml += `\t${XML_TEMPLATES.KEY('PayloadUUID')}\n`;
        xml += `\t${XML_TEMPLATES.STRING(generateId('profile'))}\n`;
        
        xml += `\t${XML_TEMPLATES.KEY('PayloadVersion')}\n`;
        xml += `\t${XML_TEMPLATES.INTEGER(EXPORT_CONFIG.PROFILE_VERSION)}\n`;
        
        xml += `\t${XML_TEMPLATES.KEY('PayloadFormat')}\n`;
        xml += `\t${XML_TEMPLATES.INTEGER(EXPORT_CONFIG.PROFILE_FORMAT)}\n`;
        
        xml += XML_TEMPLATES.DICT_CLOSE + '\n';
        xml += XML_TEMPLATES.PLIST_FOOTER;
        
        return xml;
    }

    /**
     * Generate preview of modified parameters
     * @param {Array} sections - Available sections
     * @returns {object} Preview data
     */
    generatePreview(sections) {
        const modifiedBySections = new Map();
        
        // Group modified parameters by section
        this.modifiedParameters.forEach((param, key) => {
            if (!modifiedBySections.has(param.sectionId)) {
                modifiedBySections.set(param.sectionId, []);
            }
            modifiedBySections.get(param.sectionId).push(param);
        });
        
        const preview = {
            totalModified: this.modifiedParameters.size,
            sections: [],
            summary: ''
        };
        
        // Generate section previews
        modifiedBySections.forEach((params, sectionId) => {
            const section = sections.find(s => s.identifier === sectionId);
            if (section) {
                preview.sections.push({
                    name: section.name,
                    identifier: sectionId,
                    parameterCount: params.length,
                    parameters: params.map(p => ({
                        key: p.parameterKey,
                        value: p.value,
                        type: p.type
                    }))
                });
            }
        });
        
        // Generate summary text
        if (preview.totalModified === 0) {
            preview.summary = 'No parameters have been modified.';
        } else {
            const sectionCount = preview.sections.length;
            preview.summary = `${preview.totalModified} parameter${preview.totalModified > 1 ? 's' : ''} modified across ${sectionCount} section${sectionCount > 1 ? 's' : ''}.`;
        }
        
        return preview;
    }

    /**
     * Export configuration profile as .mobileconfig file
     * @param {object} profileInfo - Profile metadata
     * @param {Array} sections - Available sections
     * @returns {boolean} Success status
     */
    exportProfile(profileInfo, sections) {
        try {
            if (this.modifiedParameters.size === 0) {
                throw new Error('No parameters have been modified. Cannot export empty profile.');
            }
            
            const xml = this.generateProfileXML(profileInfo, sections);
            const filename = `${profileInfo.name || EXPORT_CONFIG.DEFAULT_PROFILE_NAME}${EXPORT_CONFIG.FILE_EXTENSION}`;
            
            downloadFile(xml, filename, EXPORT_CONFIG.MIME_TYPE);
            
            console.log(`Profile exported successfully: ${filename}`);
            return true;
        } catch (error) {
            console.error('Export failed:', error);
            throw error;
        }
    }

    /**
     * Validate profile before export
     * @param {object} profileInfo - Profile metadata
     * @returns {object} Validation result
     */
    validateProfile(profileInfo) {
        const errors = [];
        const warnings = [];
        
        // Check if any parameters are modified
        if (this.modifiedParameters.size === 0) {
            errors.push('No parameters have been modified');
        }
        
        // Validate profile metadata
        if (!profileInfo.name || profileInfo.name.trim() === '') {
            errors.push('Profile name is required');
        }
        
        if (!profileInfo.identifier || profileInfo.identifier.trim() === '') {
            errors.push('Profile identifier is required');
        } else if (!/^[a-zA-Z0-9.-]+$/.test(profileInfo.identifier)) {
            errors.push('Profile identifier contains invalid characters');
        }
        
        // Check for required parameters that are missing
        const requiredMissing = [];
        this.modifiedParameters.forEach((param, key) => {
            if (param.required && (param.value === null || param.value === undefined || param.value === '')) {
                requiredMissing.push(param.parameterKey);
            }
        });
        
        if (requiredMissing.length > 0) {
            errors.push(`Required parameters are empty: ${requiredMissing.join(', ')}`);
        }
        
        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }
}

// Create and export singleton instance
export const exportService = new ExportService();
