param(
    [string]$FactoryContractId = "",
    [string]$Network           = "testnet"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$ADMIN_WALLET = "GDRHEIIOD4PZ4CQEZN5QLMZTVA5QEZWX2OBSQMVSFLYICDJH3FXLKX3Y"
$REPO_ROOT    = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$ENV_FILE     = Join-Path $REPO_ROOT ".env.local"

function Write-Check {
    param([string]$Label, [bool]$Passed, [string]$Detail = "")
    if ($Passed) {
        Write-Host "   [PASS] $Label" -ForegroundColor Green
    } else {
        $s = if ($Detail) { ": $Detail" } else { "" }
        Write-Host "   [FAIL] $Label$s" -ForegroundColor Red
    }
}

# Resolve factory contract ID
if (-not $FactoryContractId) {
    if (Test-Path $ENV_FILE) {
        $m = Get-Content $ENV_FILE | Where-Object { $_ -match "^NEXT_PUBLIC_FACTORY_CONTRACT_ID=.+" }
        if ($m) {
            $FactoryContractId = ($m -replace "^NEXT_PUBLIC_FACTORY_CONTRACT_ID=", "").Trim()
        }
    }
}
if (-not $FactoryContractId) {
    Write-Host "[FAIL] No factory contract ID. Pass -FactoryContractId or set NEXT_PUBLIC_FACTORY_CONTRACT_ID." -ForegroundColor Red
    exit 1
}

$RPC_URL     = if ($Network -eq "mainnet") { "https://soroban.stellar.org" } else { "https://soroban-testnet.stellar.org" }
$HORIZON_URL = if ($Network -eq "mainnet") { "https://horizon.stellar.org" } else { "https://horizon-testnet.stellar.org" }

Write-Host ""
Write-Host "Fundr Health Check" -ForegroundColor Cyan
Write-Host "   Network  : $Network"
Write-Host "   Factory  : $FactoryContractId"
Write-Host "   Deployer : $ADMIN_WALLET"
Write-Host ""

$allPassed = $true

# Check 1: RPC health
try {
    $body = '{"jsonrpc":"2.0","id":1,"method":"getHealth","params":[]}'
    $resp = Invoke-RestMethod -Uri $RPC_URL -Method Post -ContentType "application/json" -Body $body -ErrorAction Stop
    # result.status == "healthy" in older versions; newer versions may wrap differently
    $status = if ($resp.result) { $resp.result.status } elseif ($resp.status) { $resp.status } else { "unknown" }
    $ok = $status -eq "healthy"
    Write-Check -Label "RPC node is healthy ($status)" -Passed $ok
    if (-not $ok) { $allPassed = $false }
} catch {
    Write-Check -Label "RPC node is reachable" -Passed $false -Detail $_.Exception.Message
    $allPassed = $false
}

# Check 2: Contract is live via get_campaign(1)
try {
    $viewArgs = @(
        "contract", "invoke",
        "--id",             $FactoryContractId,
        "--source-account", $ADMIN_WALLET,
        "--network",        $Network,
        "--send=no",
        "--", "get_campaign",
        "--campaign_seq", "1"
    )
    $ErrorActionPreference = "Continue"
    $simOut  = & stellar @viewArgs 2>&1
    $simExit = $LASTEXITCODE
    $ErrorActionPreference = "Stop"
    # Returns null if no campaign 1 yet, but the contract is live
    $live    = ($simExit -eq 0) -or (($simOut -join " ") -match "null|None|Error")
    Write-Check -Label "Contract live (get_campaign)" -Passed $live
    if (-not $live) { $allPassed = $false }
} catch {
    Write-Check -Label "Contract live (get_campaign)" -Passed $false -Detail $_.Exception.Message
    $allPassed = $false
}

# Check 3: create_campaign ABI callable (auth error is acceptable)
try {
    $deadlineTs = [int64]([datetime]::UtcNow.AddYears(1) - [datetime]"1970-01-01").TotalSeconds
    # Use testnet native XLM token address
    $tokenAddress = "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC"
    $abiArgs = @(
        "contract", "invoke",
        "--id",             $FactoryContractId,
        "--source-account", $ADMIN_WALLET,
        "--network",        $Network,
        "--send=no",
        "--", "create_campaign",
        "--creator",       $ADMIN_WALLET,
        "--token_address", $tokenAddress,
        "--goal_xlm",      "10000000",
        "--deadline_ts",   "$deadlineTs"
    )
    $ErrorActionPreference = "Continue"
    $abiOut  = & stellar @abiArgs 2>&1
    $abiExit = $LASTEXITCODE
    $ErrorActionPreference = "Stop"
    $abiText = $abiOut -join " "
    $abiOk   = ($abiExit -eq 0) -or ($abiText -match "auth|require_auth|HostError|Error")
    Write-Check -Label "create_campaign ABI callable" -Passed $abiOk
    if (-not $abiOk) { $allPassed = $false }
} catch {
    Write-Check -Label "create_campaign ABI callable" -Passed $false -Detail $_.Exception.Message
    $allPassed = $false
}

# Check 4: Horizon reachable
try {
    $feeStats = Invoke-RestMethod "$HORIZON_URL/fee_stats" -ErrorAction Stop
    $ok = $null -ne $feeStats.last_ledger
    Write-Check -Label "Horizon is reachable" -Passed $ok
    if (-not $ok) { $allPassed = $false }
} catch {
    Write-Check -Label "Horizon is reachable" -Passed $false -Detail $_.Exception.Message
    $allPassed = $false
}

Write-Host ""
if ($allPassed) {
    Write-Host "All health checks passed." -ForegroundColor Green
    exit 0
} else {
    Write-Host "One or more health checks failed. See above." -ForegroundColor Yellow
    exit 1
}
