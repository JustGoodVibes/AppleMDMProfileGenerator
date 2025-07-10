/**
 * Mock data based on Apple's actual MDM API structure
 * Used for comprehensive testing of hierarchical section functionality
 */

export const mockAppleIdentifiers = {
  // Top Level identifiers
  topLevel: 'doc://com.apple.devicemanagement/documentation/DeviceManagement/TopLevel',
  commonPayloadKeys: 'doc://com.apple.devicemanagement/documentation/DeviceManagement/CommonPayloadKeys',
  
  // Accounts identifiers
  accounts: 'doc://com.apple.devicemanagement/documentation/DeviceManagement/Accounts',
  calDAV: 'doc://com.apple.devicemanagement/documentation/DeviceManagement/CalDAV',
  cardDAV: 'doc://com.apple.devicemanagement/documentation/DeviceManagement/CardDAV',
  googleAccount: 'doc://com.apple.devicemanagement/documentation/DeviceManagement/GoogleAccount',
  ldap: 'doc://com.apple.devicemanagement/documentation/DeviceManagement/LDAP',
  mobileAccounts: 'doc://com.apple.devicemanagement/documentation/DeviceManagement/MobileAccounts',
  subscribedCalendars: 'doc://com.apple.devicemanagement/documentation/DeviceManagement/SubscribedCalendars',
  
  // System Configuration identifiers
  declarations: 'doc://com.apple.devicemanagement/documentation/DeviceManagement/Declarations',
  energySaver: 'doc://com.apple.devicemanagement/documentation/DeviceManagement/EnergySaver',
  fileProvider: 'doc://com.apple.devicemanagement/documentation/DeviceManagement/FileProvider',
  font: 'doc://com.apple.devicemanagement/documentation/DeviceManagement/Font',
  lockScreenMessage: 'doc://com.apple.devicemanagement/documentation/DeviceManagement/LockScreenMessage',
  screensaver: 'doc://com.apple.devicemanagement/documentation/DeviceManagement/Screensaver',
  systemExtensions: 'doc://com.apple.devicemanagement/documentation/DeviceManagement/SystemExtensions',
  systemLogging: 'doc://com.apple.devicemanagement/documentation/DeviceManagement/SystemLogging',
  timeServer: 'doc://com.apple.devicemanagement/documentation/DeviceManagement/TimeServer',
  
  // Certificates identifiers
  acmeCertificate: 'doc://com.apple.devicemanagement/documentation/DeviceManagement/ACMECertificate',
  activeDirectoryCertificate: 'doc://com.apple.devicemanagement/documentation/DeviceManagement/ActiveDirectoryCertificate',
  certificatePEM: 'doc://com.apple.devicemanagement/documentation/DeviceManagement/CertificatePEM',
  certificatePKCS1: 'doc://com.apple.devicemanagement/documentation/DeviceManagement/CertificatePKCS1',
  certificatePKCS12: 'doc://com.apple.devicemanagement/documentation/DeviceManagement/CertificatePKCS12',
  certificateRoot: 'doc://com.apple.devicemanagement/documentation/DeviceManagement/CertificateRoot',
  scep: 'doc://com.apple.devicemanagement/documentation/DeviceManagement/SCEP'
};

export const mockTopicSections = {
  // Accounts topicSection - the main test case
  accounts: {
    title: 'Accounts',
    anchor: 'Accounts',
    identifiers: [
      mockAppleIdentifiers.accounts,
      mockAppleIdentifiers.calDAV,
      mockAppleIdentifiers.cardDAV,
      mockAppleIdentifiers.googleAccount,
      mockAppleIdentifiers.ldap,
      mockAppleIdentifiers.mobileAccounts,
      mockAppleIdentifiers.subscribedCalendars
    ]
  },
  
  // Top Level topicSection
  topLevel: {
    title: 'Top Level',
    anchor: 'Top-Level',
    identifiers: [
      mockAppleIdentifiers.topLevel,
      mockAppleIdentifiers.commonPayloadKeys
    ]
  },
  
  // System Configuration topicSection
  systemConfiguration: {
    title: 'System Configuration',
    anchor: 'System-Configuration',
    identifiers: [
      mockAppleIdentifiers.declarations,
      mockAppleIdentifiers.energySaver,
      mockAppleIdentifiers.fileProvider,
      mockAppleIdentifiers.font,
      mockAppleIdentifiers.lockScreenMessage,
      mockAppleIdentifiers.screensaver,
      mockAppleIdentifiers.systemExtensions,
      mockAppleIdentifiers.systemLogging,
      mockAppleIdentifiers.timeServer
    ]
  },
  
  // Certificates topicSection
  certificates: {
    title: 'Certificates',
    anchor: 'Certificates',
    identifiers: [
      mockAppleIdentifiers.acmeCertificate,
      mockAppleIdentifiers.activeDirectoryCertificate,
      mockAppleIdentifiers.certificatePEM,
      mockAppleIdentifiers.certificatePKCS1,
      mockAppleIdentifiers.certificatePKCS12,
      mockAppleIdentifiers.certificateRoot,
      mockAppleIdentifiers.scep
    ]
  },
  
  // Single section with no sub-sections
  appStore: {
    title: 'App Store',
    anchor: 'App-Store',
    identifiers: [
      'doc://com.apple.devicemanagement/documentation/DeviceManagement/AppStore'
    ]
  }
};

export const mockMainSpec = {
  topicSections: [
    mockTopicSections.topLevel,
    mockTopicSections.accounts,
    mockTopicSections.systemConfiguration,
    mockTopicSections.certificates,
    mockTopicSections.appStore
  ],
  references: {
    [mockAppleIdentifiers.accounts]: {
      title: 'Accounts',
      abstract: [{ type: 'text', text: 'The payload you use to configure guest accounts.' }],
      kind: 'symbol',
      role: 'symbol'
    },
    [mockAppleIdentifiers.calDAV]: {
      title: 'CalDAV',
      abstract: [{ type: 'text', text: 'The payload you use to configure a Calendar account.' }],
      kind: 'symbol',
      role: 'symbol'
    }
  },
  metadata: {
    title: 'Profile-Specific Payload Keys',
    role: 'collectionGroup'
  }
};

export const mockSectionData = {
  accounts: {
    primaryContentSections: [
      {
        kind: 'content',
        content: [
          {
            type: 'heading',
            text: 'Properties',
            level: 2
          },
          {
            type: 'termList',
            items: [
              {
                term: {
                  inlineContent: [{ type: 'codeVoice', code: 'DisableGuestAccount' }]
                },
                definition: {
                  content: [
                    {
                      type: 'paragraph',
                      inlineContent: [
                        { type: 'text', text: 'If true, the system disables the guest account.' }
                      ]
                    }
                  ]
                }
              },
              {
                term: {
                  inlineContent: [{ type: 'codeVoice', code: 'EnableGuestAccount' }]
                },
                definition: {
                  content: [
                    {
                      type: 'paragraph',
                      inlineContent: [
                        { type: 'text', text: 'If true, the system enables the guest account.' }
                      ]
                    }
                  ]
                }
              }
            ]
          }
        ]
      }
    ],
    references: {},
    metadata: {
      title: 'Accounts'
    }
  }
};

export const mockExpectedHierarchy = {
  accounts: {
    parent: {
      name: 'Accounts',
      identifier: 'accounts',
      isSubSection: false
    },
    subSections: [
      { name: 'CalDAV', identifier: 'caldav', parentSection: 'accounts' },
      { name: 'CardDAV', identifier: 'carddav', parentSection: 'accounts' },
      { name: 'GoogleAccount', identifier: 'googleaccount', parentSection: 'accounts' },
      { name: 'LDAP', identifier: 'ldap', parentSection: 'accounts' },
      { name: 'MobileAccounts', identifier: 'mobileaccounts', parentSection: 'accounts' },
      { name: 'SubscribedCalendars', identifier: 'subscribedcalendars', parentSection: 'accounts' }
    ]
  },
  systemConfiguration: {
    parent: {
      name: 'System Configuration',
      identifier: 'systemconfiguration',
      isSubSection: false
    },
    subSections: [
      { name: 'Declarations', identifier: 'declarations', parentSection: 'systemconfiguration' },
      { name: 'EnergySaver', identifier: 'energysaver', parentSection: 'systemconfiguration' },
      { name: 'FileProvider', identifier: 'fileprovider', parentSection: 'systemconfiguration' },
      { name: 'Font', identifier: 'font', parentSection: 'systemconfiguration' },
      { name: 'LockScreenMessage', identifier: 'lockscreenmessage', parentSection: 'systemconfiguration' },
      { name: 'Screensaver', identifier: 'screensaver', parentSection: 'systemconfiguration' },
      { name: 'SystemExtensions', identifier: 'systemextensions', parentSection: 'systemconfiguration' },
      { name: 'SystemLogging', identifier: 'systemlogging', parentSection: 'systemconfiguration' },
      { name: 'TimeServer', identifier: 'timeserver', parentSection: 'systemconfiguration' }
    ]
  }
};
