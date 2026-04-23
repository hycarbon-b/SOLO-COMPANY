# LIGNMA Verification Script (PowerShell)
# This script verifies that all components are properly set up

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "  LIGNMA Verification Script" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host ""

$PASS = 0
$FAIL = 0
$WARN = 0

function Check-Pass {
    param($message)
    Write-Host "✓ $message" -ForegroundColor Green
    $script:PASS++
}

function Check-Fail {
    param($message)
    Write-Host "✗ $message" -ForegroundColor Red
    $script:FAIL++
}

function Check-Warn {
    param($message)
    Write-Host "⚠ $message" -ForegroundColor Yellow
    $script:WARN++
}

Write-Host "1. Checking project structure..." -ForegroundColor White
Write-Host "-----------------------------------" -ForegroundColor Gray

# Check if key directories exist
if (Test-Path "src/services") {
    Check-Pass "Services directory exists"
} else {
    Check-Fail "Services directory missing"
}

if (Test-Path "src/app/components") {
    Check-Pass "Components directory exists"
} else {
    Check-Fail "Components directory missing"
}

Write-Host ""
Write-Host "2. Checking critical files..." -ForegroundColor White
Write-Host "-----------------------------------" -ForegroundColor Gray

# Check if critical files exist
$files = @(
    "src/services/openclawGateway.ts",
    "src/app/components/MainContent.tsx",
    "src/app/components/ChatPanel.tsx",
    "package.json",
    "README.md",
    "QUICKSTART.md",
    "TESTING.md",
    "test-openclaw.js",
    "test-integration.js"
)

foreach ($file in $files) {
    if (Test-Path $file) {
        Check-Pass "$file exists"
    } else {
        Check-Fail "$file missing"
    }
}

Write-Host ""
Write-Host "3. Checking dependencies..." -ForegroundColor White
Write-Host "-----------------------------------" -ForegroundColor Gray

if (Test-Path "node_modules") {
    Check-Pass "node_modules directory exists"
    
    # Check if key packages are installed
    if (Test-Path "node_modules/react") {
        Check-Pass "React is installed"
    } else {
        Check-Fail "React not found"
    }
    
    if (Test-Path "node_modules/lucide-react") {
        Check-Pass "Lucide React icons installed"
    } else {
        Check-Fail "Lucide React not found"
    }
} else {
    Check-Fail "node_modules not found (run npm install)"
}

Write-Host ""
Write-Host "4. Checking configuration..." -ForegroundColor White
Write-Host "-----------------------------------" -ForegroundColor Gray

# Check package.json scripts
$packageJson = Get-Content "package.json" -Raw | ConvertFrom-Json
if ($packageJson.scripts."test:openclaw") {
    Check-Pass "OpenClaw test script configured"
} else {
    Check-Warn "OpenClaw test script not found in package.json"
}

if ($packageJson.scripts."test:integration") {
    Check-Pass "Integration test script configured"
} else {
    Check-Warn "Integration test script not found in package.json"
}

Write-Host ""
Write-Host "5. Checking code integration..." -ForegroundColor White
Write-Host "-----------------------------------" -ForegroundColor Gray

# Check if MainContent imports openclawGateway
$mainContent = Get-Content "src/app/components/MainContent.tsx" -Raw
if ($mainContent -match "openclawGateway") {
    Check-Pass "MainContent imports OpenClaw service"
} else {
    Check-Fail "MainContent missing OpenClaw import"
}

# Check if sendToOpenClaw is used
if ($mainContent -match "sendToOpenClaw") {
    Check-Pass "MainContent uses sendToOpenClaw function"
} else {
    Check-Fail "MainContent not calling sendToOpenClaw"
}

# Check if ChatPanel has connection status
$chatPanel = Get-Content "src/app/components/ChatPanel.tsx" -Raw
if ($chatPanel -match "openclawConnected") {
    Check-Pass "ChatPanel has connection status prop"
} else {
    Check-Fail "ChatPanel missing connection status"
}

Write-Host ""
Write-Host "6. Checking documentation..." -ForegroundColor White
Write-Host "-----------------------------------" -ForegroundColor Gray

# Check README content
$readme = Get-Content "README.md" -Raw
if ($readme -match "OpenClaw") {
    Check-Pass "README documents OpenClaw integration"
} else {
    Check-Warn "README may not document OpenClaw"
}

$testing = Get-Content "TESTING.md" -Raw
if ($testing -match "troubleshooting") {
    Check-Pass "Testing guide includes troubleshooting"
} else {
    Check-Warn "Testing guide may lack troubleshooting section"
}

Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "  Verification Summary" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "Passed:   $PASS" -ForegroundColor Green
Write-Host "Failed:   $FAIL" -ForegroundColor Red
Write-Host "Warnings: $WARN" -ForegroundColor Yellow
Write-Host ""

if ($FAIL -eq 0) {
    Write-Host "✓ All checks passed! LIGNMA is ready to use." -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "  1. Start OpenClaw Gateway on ws://127.0.0.1:18789"
    Write-Host "  2. Run: npm run dev"
    Write-Host "  3. Open browser to http://localhost:5178"
    Write-Host "  4. Test with: npm run test:openclaw"
    exit 0
} else {
    Write-Host "✗ Some checks failed. Please review the issues above." -ForegroundColor Red
    exit 1
}
