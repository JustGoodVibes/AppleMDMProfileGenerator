/**
 * Mock Data Service
 * Provides fallback data when Apple's API is not accessible
 */

export const mockMainSpec = {
    "references": {
        "doc://com.apple.devicemanagement/documentation/DeviceManagement/WiFi": {
            "type": "topic",
            "kind": "symbol",
            "title": "WiFi",
            "abstract": [{"type": "text", "text": "Configure WiFi network settings for devices"}],
            "platforms": ["iOS", "macOS", "tvOS"],
            "deprecated": false,
            "url": "/documentation/devicemanagement/wifi"
        },
        "doc://com.apple.devicemanagement/documentation/DeviceManagement/VPN": {
            "type": "topic",
            "kind": "symbol",
            "title": "VPN",
            "abstract": [{"type": "text", "text": "Configure VPN connection settings"}],
            "platforms": ["iOS", "macOS"],
            "deprecated": false,
            "url": "/documentation/devicemanagement/vpn"
        },
        "doc://com.apple.devicemanagement/documentation/DeviceManagement/Mail": {
            "type": "topic",
            "kind": "symbol",
            "title": "Mail",
            "abstract": [{"type": "text", "text": "Configure email account settings"}],
            "platforms": ["iOS", "macOS"],
            "deprecated": false,
            "url": "/documentation/devicemanagement/mail"
        },
        "doc://com.apple.devicemanagement/documentation/DeviceManagement/Restrictions": {
            "type": "topic",
            "kind": "symbol",
            "title": "Restrictions",
            "abstract": [{"type": "text", "text": "Configure device restrictions and parental controls"}],
            "platforms": ["iOS", "macOS", "tvOS"],
            "deprecated": false,
            "url": "/documentation/devicemanagement/restrictions"
        },
        "doc://com.apple.devicemanagement/documentation/DeviceManagement/Passcode": {
            "type": "topic",
            "kind": "symbol",
            "title": "Passcode",
            "abstract": [{"type": "text", "text": "Configure passcode and security requirements"}],
            "platforms": ["iOS", "macOS"],
            "deprecated": false,
            "url": "/documentation/devicemanagement/passcode"
        },
        "doc://com.apple.devicemanagement/documentation/DeviceManagement/CertificateRoot": {
            "type": "topic",
            "kind": "symbol",
            "title": "CertificateRoot",
            "abstract": [{"type": "text", "text": "Configure certificate settings for device authentication"}],
            "platforms": ["iOS", "macOS", "tvOS"],
            "deprecated": false,
            "url": "/documentation/devicemanagement/certificateroot"
        },
        "doc://com.apple.devicemanagement/documentation/DeviceManagement/CalDAV": {
            "type": "topic",
            "kind": "symbol",
            "title": "CalDAV",
            "abstract": [{"type": "text", "text": "Configure calendar account settings"}],
            "platforms": ["iOS", "macOS"],
            "deprecated": false,
            "url": "/documentation/devicemanagement/caldav"
        },
        "doc://com.apple.devicemanagement/documentation/DeviceManagement/CardDAV": {
            "type": "topic",
            "kind": "symbol",
            "title": "CardDAV",
            "abstract": [{"type": "text", "text": "Configure contacts account settings"}],
            "platforms": ["iOS", "macOS"],
            "deprecated": false,
            "url": "/documentation/devicemanagement/carddav"
        }
    },
    "topicSections": [
        {
            "title": "Networking",
            "anchor": "Networking",
            "identifiers": [
                "doc://com.apple.devicemanagement/documentation/DeviceManagement/WiFi",
                "doc://com.apple.devicemanagement/documentation/DeviceManagement/VPN"
            ]
        },
        {
            "title": "Mail",
            "anchor": "Mail",
            "identifiers": [
                "doc://com.apple.devicemanagement/documentation/DeviceManagement/Mail"
            ]
        },
        {
            "title": "Security",
            "anchor": "Security",
            "identifiers": [
                "doc://com.apple.devicemanagement/documentation/DeviceManagement/Restrictions",
                "doc://com.apple.devicemanagement/documentation/DeviceManagement/Passcode"
            ]
        },
        {
            "title": "Certificates",
            "anchor": "Certificates",
            "identifiers": [
                "doc://com.apple.devicemanagement/documentation/DeviceManagement/CertificateRoot"
            ]
        },
        {
            "title": "Accounts",
            "anchor": "Accounts",
            "identifiers": [
                "doc://com.apple.devicemanagement/documentation/DeviceManagement/CalDAV",
                "doc://com.apple.devicemanagement/documentation/DeviceManagement/CardDAV"
            ]
        }
    ]
};

export const mockSectionData = {
    "wifi": {
        "topicSections": [{
            "identifiers": ["wifi-ssid", "wifi-password", "wifi-security", "wifi-hidden"]
        }],
        "references": {
            "wifi-ssid": {
                    "kind": "symbol",
                    "type": "String",
                    "title": "SSID_STR",
                    "abstract": "The network name (SSID) of the WiFi network",
                    "required": true,
                    "platforms": ["iOS", "macOS", "tvOS"]
                },
                "wifi-password": {
                    "kind": "symbol", 
                    "type": "String",
                    "title": "Password",
                    "abstract": "The password for the WiFi network",
                    "required": false,
                    "platforms": ["iOS", "macOS", "tvOS"]
                },
                "wifi-security": {
                    "kind": "symbol",
                    "type": "String", 
                    "title": "EncryptionType",
                    "abstract": "The encryption type for the WiFi network",
                    "required": false,
                    "possibleValues": ["None", "WEP", "WPA", "WPA2", "WPA3"],
                    "platforms": ["iOS", "macOS", "tvOS"]
                },
                "wifi-hidden": {
                    "kind": "symbol",
                    "type": "Boolean",
                    "title": "IsHiddenNetwork", 
                    "abstract": "Whether the network is hidden",
                    "required": false,
                    "platforms": ["iOS", "macOS", "tvOS"]
                }
        }
    },
    "vpn": {
        "topicSections": [{
            "identifiers": ["vpn-type", "vpn-server", "vpn-username", "vpn-password"]
        }],
        "references": {
            "vpn-type": {
                    "kind": "symbol",
                    "type": "String",
                    "title": "VPNType",
                    "abstract": "The type of VPN connection",
                    "required": true,
                    "possibleValues": ["L2TP", "PPTP", "IPSec", "IKEv2", "AlwaysOn"],
                    "platforms": ["iOS", "macOS"]
                },
                "vpn-server": {
                    "kind": "symbol",
                    "type": "String", 
                    "title": "RemoteAddress",
                    "abstract": "The server address for the VPN connection",
                    "required": true,
                    "platforms": ["iOS", "macOS"]
                },
                "vpn-username": {
                    "kind": "symbol",
                    "type": "String",
                    "title": "UserName",
                    "abstract": "The username for VPN authentication",
                    "required": false,
                    "platforms": ["iOS", "macOS"]
                },
                "vpn-password": {
                    "kind": "symbol",
                    "type": "String",
                    "title": "Password",
                    "abstract": "The password for VPN authentication",
                    "required": false,
                    "platforms": ["iOS", "macOS"]
                }
        }
    },
    "email": {
        "topicSections": [{
            "identifiers": ["email-address", "email-server", "email-port", "email-ssl"]
        }],
        "references": {
            "doc": {
                "email-address": {
                    "kind": "symbol",
                    "type": "String",
                    "title": "EmailAddress",
                    "abstract": "The email address for the account",
                    "required": true,
                    "platforms": ["iOS", "macOS"]
                },
                "email-server": {
                    "kind": "symbol",
                    "type": "String",
                    "title": "IncomingMailServerHostName", 
                    "abstract": "The hostname of the incoming mail server",
                    "required": true,
                    "platforms": ["iOS", "macOS"]
                },
                "email-port": {
                    "kind": "symbol",
                    "type": "Integer",
                    "title": "IncomingMailServerPortNumber",
                    "abstract": "The port number for the incoming mail server",
                    "required": false,
                    "platforms": ["iOS", "macOS"]
                },
                "email-ssl": {
                    "kind": "symbol",
                    "type": "Boolean",
                    "title": "IncomingMailServerUseSSL",
                    "abstract": "Whether to use SSL for the incoming mail server",
                    "required": false,
                    "platforms": ["iOS", "macOS"]
                }
            }
        }
    },
    "restrictions": {
        "topicSections": [{
            "identifiers": ["allow-camera", "allow-safari", "allow-app-install", "force-encrypted-backup"]
        }],
        "references": {
            "doc": {
                "allow-camera": {
                    "kind": "symbol",
                    "type": "Boolean",
                    "title": "allowCamera",
                    "abstract": "Allow use of the camera",
                    "required": false,
                    "platforms": ["iOS", "macOS", "tvOS"]
                },
                "allow-safari": {
                    "kind": "symbol",
                    "type": "Boolean",
                    "title": "allowSafari",
                    "abstract": "Allow use of Safari browser",
                    "required": false,
                    "platforms": ["iOS"]
                },
                "allow-app-install": {
                    "kind": "symbol",
                    "type": "Boolean",
                    "title": "allowAppInstallation",
                    "abstract": "Allow installation of apps",
                    "required": false,
                    "platforms": ["iOS", "macOS"]
                },
                "force-encrypted-backup": {
                    "kind": "symbol",
                    "type": "Boolean",
                    "title": "forceEncryptedBackup",
                    "abstract": "Force encrypted backups",
                    "required": false,
                    "platforms": ["iOS"]
                }
            }
        }
    },
    "passcode": {
        "topicSections": [{
            "identifiers": ["require-passcode", "min-length", "max-age", "require-alphanumeric"]
        }],
        "references": {
            "doc": {
                "require-passcode": {
                    "kind": "symbol",
                    "type": "Boolean",
                    "title": "forcePIN",
                    "abstract": "Require a passcode on the device",
                    "required": false,
                    "platforms": ["iOS", "macOS"]
                },
                "min-length": {
                    "kind": "symbol",
                    "type": "Integer",
                    "title": "minLength",
                    "abstract": "Minimum passcode length",
                    "required": false,
                    "platforms": ["iOS", "macOS"]
                },
                "max-age": {
                    "kind": "symbol",
                    "type": "Integer",
                    "title": "maxPINAgeInDays",
                    "abstract": "Maximum passcode age in days",
                    "required": false,
                    "platforms": ["iOS", "macOS"]
                },
                "require-alphanumeric": {
                    "kind": "symbol",
                    "type": "Boolean",
                    "title": "requireAlphanumeric",
                    "abstract": "Require alphanumeric passcode",
                    "required": false,
                    "platforms": ["iOS", "macOS"]
                }
            }
        }
    },
    "certificates": {
        "topicSections": [{
            "identifiers": ["cert-type", "cert-data", "cert-password", "cert-keychain"]
        }],
        "references": {
            "doc": {
                "cert-type": {
                    "kind": "symbol",
                    "type": "String",
                    "title": "CertificateType",
                    "abstract": "The type of certificate",
                    "required": true,
                    "possibleValues": ["PKCS1", "PKCS12", "X509"],
                    "platforms": ["iOS", "macOS", "tvOS"]
                },
                "cert-data": {
                    "kind": "symbol",
                    "type": "Data",
                    "title": "PayloadContent",
                    "abstract": "The certificate data in base64 format",
                    "required": true,
                    "platforms": ["iOS", "macOS", "tvOS"]
                },
                "cert-password": {
                    "kind": "symbol",
                    "type": "String",
                    "title": "Password",
                    "abstract": "The password for the certificate",
                    "required": false,
                    "platforms": ["iOS", "macOS", "tvOS"]
                },
                "cert-keychain": {
                    "kind": "symbol",
                    "type": "String",
                    "title": "KeychainAccessGroup",
                    "abstract": "The keychain access group for the certificate",
                    "required": false,
                    "platforms": ["iOS", "macOS"]
                }
            }
        }
    },
    "calendar": {
        "topicSections": [{
            "identifiers": ["cal-server", "cal-username", "cal-password", "cal-ssl"]
        }],
        "references": {
            "doc": {
                "cal-server": {
                    "kind": "symbol",
                    "type": "String",
                    "title": "CalDAVHostName",
                    "abstract": "The hostname of the CalDAV server",
                    "required": true,
                    "platforms": ["iOS", "macOS"]
                },
                "cal-username": {
                    "kind": "symbol",
                    "type": "String",
                    "title": "CalDAVUsername",
                    "abstract": "The username for CalDAV authentication",
                    "required": false,
                    "platforms": ["iOS", "macOS"]
                },
                "cal-password": {
                    "kind": "symbol",
                    "type": "String",
                    "title": "CalDAVPassword",
                    "abstract": "The password for CalDAV authentication",
                    "required": false,
                    "platforms": ["iOS", "macOS"]
                },
                "cal-ssl": {
                    "kind": "symbol",
                    "type": "Boolean",
                    "title": "CalDAVUseSSL",
                    "abstract": "Whether to use SSL for CalDAV connection",
                    "required": false,
                    "platforms": ["iOS", "macOS"]
                }
            }
        }
    },
    "contacts": {
        "topicSections": [{
            "identifiers": ["contact-server", "contact-username", "contact-password", "contact-ssl"]
        }],
        "references": {
            "doc": {
                "contact-server": {
                    "kind": "symbol",
                    "type": "String",
                    "title": "CardDAVHostName",
                    "abstract": "The hostname of the CardDAV server",
                    "required": true,
                    "platforms": ["iOS", "macOS"]
                },
                "contact-username": {
                    "kind": "symbol",
                    "type": "String",
                    "title": "CardDAVUsername",
                    "abstract": "The username for CardDAV authentication",
                    "required": false,
                    "platforms": ["iOS", "macOS"]
                },
                "contact-password": {
                    "kind": "symbol",
                    "type": "String",
                    "title": "CardDAVPassword",
                    "abstract": "The password for CardDAV authentication",
                    "required": false,
                    "platforms": ["iOS", "macOS"]
                },
                "contact-ssl": {
                    "kind": "symbol",
                    "type": "Boolean",
                    "title": "CardDAVUseSSL",
                    "abstract": "Whether to use SSL for CardDAV connection",
                    "required": false,
                    "platforms": ["iOS", "macOS"]
                }
            }
        }
    }
};

/**
 * Get mock data for a specific section
 * @param {string} sectionName - Section name
 * @returns {object|null} Mock section data
 */
export function getMockSectionData(sectionName) {
    return mockSectionData[sectionName.toLowerCase()] || null;
}

/**
 * Check if mock data is available for a section
 * @param {string} sectionName - Section name
 * @returns {boolean} True if mock data exists
 */
export function hasMockSectionData(sectionName) {
    if (!sectionName || typeof sectionName !== 'string') {
        return false;
    }

    const lowerSectionName = sectionName.toLowerCase();

    // Direct match
    if (lowerSectionName in mockSectionData) {
        return true;
    }

    // Check for partial matches
    const availableSections = Object.keys(mockSectionData);
    return availableSections.some(section =>
        lowerSectionName.includes(section) || section.includes(lowerSectionName)
    );
}

/**
 * Get mock data for a section with fuzzy matching
 * @param {string} sectionName - Section name
 * @returns {object|null} Mock section data
 */
export function getMockSectionDataFuzzy(sectionName) {
    if (!sectionName || typeof sectionName !== 'string') {
        return null;
    }

    const lowerSectionName = sectionName.toLowerCase();

    // Direct match first
    if (lowerSectionName in mockSectionData) {
        return mockSectionData[lowerSectionName];
    }

    // Fuzzy matching
    const availableSections = Object.keys(mockSectionData);
    for (const section of availableSections) {
        if (lowerSectionName.includes(section) || section.includes(lowerSectionName)) {
            return mockSectionData[section];
        }
    }

    return null;
}
