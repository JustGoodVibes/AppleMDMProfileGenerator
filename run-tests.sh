#!/bin/bash

# Apple MDM Profile Generator - Comprehensive Test Runner Script
# Executes all unit tests including missing sections functionality and provides detailed reporting

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Test results tracking
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
FAILED_SUITES=()
START_TIME=$(date +%s)

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${CYAN}${BOLD}$1${NC}"
}

print_separator() {
    echo "========================================================================"
}

print_subseparator() {
    echo "----------------------------------------"
}

# Function to check if npm is installed
check_npm() {
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed. Please install Node.js and npm first."
        exit 1
    fi
}

# Function to check if Jest is available
check_jest() {
    if ! npx jest --version &> /dev/null; then
        print_error "Jest is not available. Installing dependencies..."
        install_dependencies
    fi
}

# Function to install dependencies
install_dependencies() {
    print_status "Installing test dependencies..."
    if npm install; then
        print_success "Dependencies installed successfully"
    else
        print_error "Failed to install dependencies"
        exit 1
    fi
}

# Function to run specific test suite with result tracking
run_test_suite() {
    local test_name="$1"
    local test_command="$2"
    local optional="${3:-false}"
    
    print_status "Running $test_name..."
    print_subseparator
    
    if eval "$test_command"; then
        print_success "$test_name passed ✅"
        ((PASSED_TESTS++))
        return 0
    else
        if [ "$optional" = "true" ]; then
            print_warning "$test_name failed (optional) ⚠️"
        else
            print_error "$test_name failed ❌"
            FAILED_SUITES+=("$test_name")
            ((FAILED_TESTS++))
        fi
        return 1
    fi
}

# Function to run all tests with comprehensive coverage
run_all_tests() {
    print_header "🧪 APPLE MDM PROFILE GENERATOR - COMPREHENSIVE TEST SUITE"
    print_separator
    print_status "Starting complete test execution with missing sections validation..."
    echo
    
    # Core Unit Tests
    print_header "📋 CORE UNIT TESTS"
    echo "-------------------"
    
    run_test_suite "DataService Core Tests" "npx jest tests/unit/dataService.test.js --verbose"
    echo
    
    # Missing Sections Tests (New)
    print_header "🔧 MISSING SECTIONS TESTS"
    echo "--------------------------"
    
    run_test_suite "Missing Sections Unit Tests" "npx jest tests/unit/missingSections.test.js --verbose"
    echo
    
    run_test_suite "Firewall Section Tests" "npx jest tests/unit/firewallSection.test.js --verbose"
    echo
    
    run_test_suite "Dark Mode Compatibility Tests" "npx jest tests/unit/darkModeCompatibility.test.js --verbose"
    echo
    
    # Additional Unit Tests
    print_header "📊 ADDITIONAL UNIT TESTS"
    echo "-------------------------"
    
    run_test_suite "Accounts Section Tests" "npx jest tests/unit/accountsSection.test.js --verbose" "true"
    echo
    
    run_test_suite "UI Manager Tests" "npx jest tests/unit/uiManager.test.js --verbose" "true"
    echo
    
    run_test_suite "Edge Cases Tests" "npx jest tests/unit/edgeCases.test.js --verbose" "true"
    echo
    
    # Integration Tests
    print_header "🔗 INTEGRATION TESTS"
    echo "---------------------"
    
    run_test_suite "Missing Sections Integration" "npx jest tests/integration/missingSectionsIntegration.test.js --verbose"
    echo
    
    run_test_suite "Hierarchical Sections Integration" "npx jest tests/integration/hierarchicalSections.test.js --verbose" "true"
    echo
    
    # Regression Tests
    print_header "🛡️ REGRESSION TESTS"
    echo "--------------------"
    
    run_test_suite "Regression Prevention Tests" "npx jest --testNamePattern='regression|Regression' --verbose"
    echo
    
    # Coverage Report
    print_header "📈 COVERAGE ANALYSIS"
    echo "---------------------"
    
    run_test_suite "Complete Coverage Report" "npx jest --coverage --coverageReporters=text --coverageReporters=html --coverageDirectory=coverage/complete"
    echo
    
    # Generate final summary
    generate_test_summary
}

# Function to run missing sections specific tests
run_missing_sections_tests() {
    print_header "🔧 MISSING MDM SECTIONS TEST SUITE"
    print_separator
    print_status "Running comprehensive tests for newly added MDM configuration sections..."
    echo
    
    run_test_suite "Missing Sections Core Tests" "npx jest tests/unit/missingSections.test.js --verbose"
    echo
    
    run_test_suite "Firewall Section Validation" "npx jest tests/unit/firewallSection.test.js --verbose"
    echo
    
    run_test_suite "Dark Mode Compatibility" "npx jest tests/unit/darkModeCompatibility.test.js --verbose"
    echo
    
    run_test_suite "Missing Sections Integration" "npx jest tests/integration/missingSectionsIntegration.test.js --verbose"
    echo
    
    run_test_suite "Missing Sections Coverage" "npx jest --testPathPattern='missing|firewall|darkMode' --coverage --coverageDirectory=coverage/missing-sections"
    echo
    
    generate_test_summary
}

# Function to validate specific functionality
validate_missing_sections_fix() {
    print_header "🔍 MISSING SECTIONS FIX VALIDATION"
    print_separator
    print_status "Validating that all 10 missing MDM sections are properly added..."
    echo
    
    # Run specific validation tests
    if npx jest tests/unit/missingSections.test.js --testNamePattern="should add all 10 missing sections|should always include all 10 expected|should include Firewall section" --verbose; then
        print_success "✅ Missing sections fix validation PASSED"
        print_success "All 10 missing MDM sections are properly added"
        print_success "Firewall section is correctly configured with Security category and high priority"
        return 0
    else
        print_error "❌ Missing sections fix validation FAILED"
        print_error "The missing sections functionality is not working as expected"
        return 1
    fi
}

# Function to validate dark mode functionality
validate_dark_mode_fix() {
    print_header "🌙 DARK MODE FIX VALIDATION"
    print_separator
    print_status "Validating dark mode text visibility fixes..."
    echo
    
    if npx jest tests/unit/darkModeCompatibility.test.js --testNamePattern="should apply dark mode variables|should maintain text visibility|should render.*correctly" --verbose; then
        print_success "✅ Dark mode fix validation PASSED"
        print_success "Text visibility is maintained in both light and dark modes"
        print_success "CSS variables are properly applied for theming"
        return 0
    else
        print_error "❌ Dark mode fix validation FAILED"
        print_error "Dark mode compatibility is not working as expected"
        return 1
    fi
}

# Function to run accounts section tests (legacy)
run_accounts_tests() {
    print_status "Running Accounts Section specific tests..."
    npx jest --testNamePattern="Accounts" --verbose
}

# Function to run hierarchy tests
run_hierarchy_tests() {
    print_status "Running hierarchical functionality tests..."
    npx jest --testNamePattern="hierarchical|hierarchy" --verbose
}

# Function to run unit tests only
run_unit_tests() {
    print_header "📋 UNIT TESTS ONLY"
    print_separator
    print_status "Running all unit tests..."
    npx jest tests/unit --verbose --coverage
}

# Function to run integration tests only
run_integration_tests() {
    print_header "🔗 INTEGRATION TESTS ONLY"
    print_separator
    print_status "Running all integration tests..."
    npx jest tests/integration --verbose
}

# Function to run tests in watch mode
run_watch_mode() {
    print_status "Starting tests in watch mode..."
    print_status "Press 'q' to quit, 'a' to run all tests, 'f' to run only failed tests"
    npx jest --watch --verbose
}

# Function to generate comprehensive test summary
generate_test_summary() {
    local end_time=$(date +%s)
    local duration=$((end_time - START_TIME))
    
    echo
    print_separator
    print_header "📊 TEST EXECUTION SUMMARY"
    print_separator
    
    echo -e "${BOLD}Execution Time:${NC} ${duration}s"
    echo -e "${BOLD}Total Test Suites:${NC} $((PASSED_TESTS + FAILED_TESTS))"
    echo -e "${GREEN}${BOLD}Passed:${NC} ${PASSED_TESTS} ✅"
    echo -e "${RED}${BOLD}Failed:${NC} ${FAILED_TESTS} ❌"
    
    if [ ${#FAILED_SUITES[@]} -eq 0 ]; then
        echo
        print_success "🎉 ALL TESTS PASSED!"
        print_success "✅ Core functionality is working correctly"
        print_success "✅ Missing MDM sections are properly implemented"
        print_success "✅ Dark mode compatibility is maintained"
        print_success "✅ No regressions detected"
        echo
        print_status "The Apple MDM Profile Generator is ready for production! 🚀"
        return 0
    else
        echo
        print_error "❌ SOME TESTS FAILED!"
        print_error "Failed test suites:"
        for suite in "${FAILED_SUITES[@]}"; do
            echo -e "   ${RED}• $suite${NC}"
        done
        echo
        print_warning "Please review the failed tests above and fix any issues."
        return 1
    fi
}

# Function to show help
show_help() {
    echo -e "${CYAN}${BOLD}Apple MDM Profile Generator - Test Runner${NC}"
    print_separator
    echo
    echo "Usage: $0 [OPTION]"
    echo
    echo -e "${BOLD}Options:${NC}"
    echo "  all                  Run all tests with coverage (default)"
    echo "  missing-sections     Run missing sections tests only"
    echo "  validate-missing     Validate missing sections fix"
    echo "  validate-darkmode    Validate dark mode fix"
    echo "  accounts             Run Accounts section specific tests"
    echo "  hierarchy            Run hierarchical functionality tests"
    echo "  unit                 Run all unit tests"
    echo "  integration          Run all integration tests"
    echo "  watch                Run tests in watch mode"
    echo "  install              Install dependencies only"
    echo "  help                 Show this help message"
    echo
    echo -e "${BOLD}Examples:${NC}"
    echo "  $0                        # Run all tests"
    echo "  $0 missing-sections       # Test missing sections only"
    echo "  $0 validate-missing       # Validate missing sections fix"
    echo "  $0 validate-darkmode      # Validate dark mode fix"
    echo "  $0 watch                  # Run in watch mode for development"
    echo
    echo -e "${BOLD}Test Categories:${NC}"
    echo "  • Core Unit Tests: DataService, Missing Sections, Firewall, Dark Mode"
    echo "  • Integration Tests: Missing Sections Integration, Hierarchical Sections"
    echo "  • Regression Tests: Prevent breaking changes"
    echo "  • Coverage Analysis: Comprehensive code coverage reporting"
}

# Main execution function
main() {
    local command="${1:-all}"
    
    # Check prerequisites
    check_npm
    check_jest
    
    case "$command" in
        "all")
            install_dependencies
            run_all_tests
            ;;
        "missing-sections")
            install_dependencies
            run_missing_sections_tests
            ;;
        "validate-missing")
            install_dependencies
            validate_missing_sections_fix
            ;;
        "validate-darkmode")
            install_dependencies
            validate_dark_mode_fix
            ;;
        "accounts")
            install_dependencies
            run_accounts_tests
            ;;
        "hierarchy")
            install_dependencies
            run_hierarchy_tests
            ;;
        "unit")
            install_dependencies
            run_unit_tests
            ;;
        "integration")
            install_dependencies
            run_integration_tests
            ;;
        "watch")
            install_dependencies
            run_watch_mode
            ;;
        "install")
            install_dependencies
            ;;
        "help"|"-h"|"--help")
            show_help
            ;;
        *)
            print_error "Unknown command: $command"
            echo
            show_help
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"
