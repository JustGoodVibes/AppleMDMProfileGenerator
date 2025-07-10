# Apple MDM Profile Generator

A comprehensive web application for generating Apple Mobile Device Management (MDM) configuration profiles. This project dynamically loads Apple's official MDM specification and provides an intuitive interface for creating custom MDM profiles.

## Features

### Core Functionality
- **Dynamic Data Loading**: Automatically fetches and parses Apple's official MDM specification from their API
- **Comprehensive Section Coverage**: Supports all major MDM configuration areas including:
  - Core system settings (Accounts, Restrictions, Top Level)
  - Security & Privacy configurations (Firewall, VPN, Certificate Trust)
  - Network settings (WiFi, DNS, Proxy)
  - App Management (App Store, Managed App Configuration)
  - Device settings (AirPrint, Bluetooth, Camera)
  - Authentication services (Single Sign-On, Active Directory)
  - UI customizations (Dock, Finder, Desktop)

### Visual Enhancements
- **Category and Priority Labels**: Each section displays colored badges showing:
  - **Category**: Core, Security, Network, Apps, System, Authentication, Device, UI, Education
  - **Priority**: High (🔴), Medium (🟡), Low (🟢) with appropriate color coding
- **Hierarchical Section Structure**: Organized display matching Apple's official documentation
- **Responsive Design**: Works seamlessly across desktop, tablet, and mobile devices

### Advanced Filtering
- **Search Functionality**: Real-time search across section names, descriptions, and parameters
- **Priority-Based Filtering**: Filter sections by priority level (High/Medium/Low) with dropdown controls
- **Platform Filtering**: Show/hide sections based on target platform (iOS, macOS, tvOS, watchOS)
- **State Filtering**: Toggle between modified parameters, deprecated sections
- **Filter Persistence**: All filter preferences saved to localStorage

### User Experience
- **Interactive Interface**: Expandable/collapsible sections with smooth animations
- **Parameter Management**: Easy-to-use controls for configuring MDM parameters
- **Export Functionality**: Generate and download .mobileconfig files
- **Accessibility**: Full keyboard navigation and ARIA label support
- **Dark Mode Ready**: CSS variables prepared for dark mode implementation

## Technical Architecture

### Modular Design
- **Services**: Data fetching, caching, progress tracking, export functionality
- **Managers**: UI state management, filtering, section management
- **Components**: Reusable section and parameter components
- **Utilities**: Helper functions, constants, validation

### Data Processing
- **API Integration**: Direct integration with Apple's official MDM specification API
- **Intelligent Parsing**: Multiple parsing strategies with robust fallback mechanisms
- **Missing Section Detection**: Automatically adds known MDM sections not present in API
- **Hierarchical Processing**: Creates parent-child relationships between configuration sections

### Testing
- **Comprehensive Test Suite**: Unit tests for all major functionality
- **Badge System Tests**: Verification of category and priority labeling
- **Filter System Tests**: Complete testing of priority-based filtering
- **Integration Tests**: End-to-end testing of data flow and UI interactions

## Getting Started

1. **Clone the repository**:
   ```bash
   git clone https://github.com/JustGoodVibes/AppleMDMProfileGenerator.git
   cd AppleMDMProfileGenerator
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Run tests**:
   ```bash
   npm test
   ```

4. **Open the application**:
   Open `index.html` in a modern web browser or serve it using a local web server.

## Usage

1. **Load MDM Specifications**: The application automatically fetches Apple's latest MDM specification on startup
2. **Browse Sections**: Use the sidebar navigation to explore different MDM configuration areas
3. **Filter Content**: Use the priority dropdown and other filters to focus on specific sections
4. **Configure Parameters**: Expand sections and modify parameters as needed
5. **Export Profile**: Generate and download your custom .mobileconfig file

## Browser Compatibility

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Contributing

This project welcomes contributions! Please feel free to submit issues, feature requests, or pull requests.

## License

This project is not affiliated with Apple Inc. It uses Apple's publicly available MDM specification for educational and development purposes.

## Disclaimer

This tool is provided as-is for educational and development purposes. Always test MDM profiles thoroughly in a development environment before deploying to production devices.
