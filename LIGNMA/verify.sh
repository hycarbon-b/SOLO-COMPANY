#!/bin/bash
# LIGNMA Verification Script
# This script verifies that all components are properly set up

echo "======================================"
echo "  LIGNMA Verification Script"
echo "======================================"
echo ""

# Color codes for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PASS=0
FAIL=0
WARN=0

check_pass() {
    echo -e "${GREEN}✓${NC} $1"
    ((PASS++))
}

check_fail() {
    echo -e "${RED}✗${NC} $1"
    ((FAIL++))
}

check_warn() {
    echo -e "${YELLOW}⚠${NC} $1"
    ((WARN++))
}

echo "1. Checking project structure..."
echo "-----------------------------------"

# Check if key directories exist
if [ -d "src/services" ]; then
    check_pass "Services directory exists"
else
    check_fail "Services directory missing"
fi

if [ -d "src/app/components" ]; then
    check_pass "Components directory exists"
else
    check_fail "Components directory missing"
fi

echo ""
echo "2. Checking critical files..."
echo "-----------------------------------"

# Check if critical files exist
files=(
    "src/services/openclawGateway.ts"
    "src/app/components/MainContent.tsx"
    "src/app/components/ChatPanel.tsx"
    "package.json"
    "README.md"
    "QUICKSTART.md"
    "TESTING.md"
    "test-openclaw.js"
    "test-integration.js"
)

for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        check_pass "$file exists"
    else
        check_fail "$file missing"
    fi
done

echo ""
echo "3. Checking dependencies..."
echo "-----------------------------------"

if [ -d "node_modules" ]; then
    check_pass "node_modules directory exists"
    
    # Check if key packages are installed
    if [ -d "node_modules/react" ]; then
        check_pass "React is installed"
    else
        check_fail "React not found"
    fi
    
    if [ -d "node_modules/lucide-react" ]; then
        check_pass "Lucide React icons installed"
    else
        check_fail "Lucide React not found"
    fi
else
    check_fail "node_modules not found (run npm install)"
fi

echo ""
echo "4. Checking configuration..."
echo "-----------------------------------"

# Check package.json scripts
if grep -q "test:openclaw" package.json; then
    check_pass "OpenClaw test script configured"
else
    check_warn "OpenClaw test script not found in package.json"
fi

if grep -q "test:integration" package.json; then
    check_pass "Integration test script configured"
else
    check_warn "Integration test script not found in package.json"
fi

echo ""
echo "5. Checking code integration..."
echo "-----------------------------------"

# Check if MainContent imports openclawGateway
if grep -q "openclawGateway" src/app/components/MainContent.tsx; then
    check_pass "MainContent imports OpenClaw service"
else
    check_fail "MainContent missing OpenClaw import"
fi

# Check if sendToOpenClaw is used
if grep -q "sendToOpenClaw" src/app/components/MainContent.tsx; then
    check_pass "MainContent uses sendToOpenClaw function"
else
    check_fail "MainContent not calling sendToOpenClaw"
fi

# Check if ChatPanel has connection status
if grep -q "openclawConnected" src/app/components/ChatPanel.tsx; then
    check_pass "ChatPanel has connection status prop"
else
    check_fail "ChatPanel missing connection status"
fi

echo ""
echo "6. Checking documentation..."
echo "-----------------------------------"

# Check README content
if grep -q "OpenClaw" README.md; then
    check_pass "README documents OpenClaw integration"
else
    check_warn "README may not document OpenClaw"
fi

if grep -q "troubleshooting" TESTING.md; then
    check_pass "Testing guide includes troubleshooting"
else
    check_warn "Testing guide may lack troubleshooting section"
fi

echo ""
echo "======================================"
echo "  Verification Summary"
echo "======================================"
echo -e "${GREEN}Passed: $PASS${NC}"
echo -e "${RED}Failed: $FAIL${NC}"
echo -e "${YELLOW}Warnings: $WARN${NC}"
echo ""

if [ $FAIL -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed! LIGNMA is ready to use.${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Start OpenClaw Gateway on ws://127.0.0.1:18789"
    echo "  2. Run: npm run dev"
    echo "  3. Open browser to http://localhost:5178"
    echo "  4. Test with: npm run test:openclaw"
    exit 0
else
    echo -e "${RED}✗ Some checks failed. Please review the issues above.${NC}"
    exit 1
fi
