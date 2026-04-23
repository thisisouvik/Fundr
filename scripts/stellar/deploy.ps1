Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$ADMIN_WALLET  = "GDRHEIIOD4PZ4CQEZN5QLMZTVA5QEZWX2OBSQMVSFLYICDJH3FXLKX3Y"
$NETWORK       = "testnet"
$RPC_URL       = "https://soroban-testnet.stellar.org"
$HORIZON_URL   = "https://horizon-testnet.stellar.org"
$REPO_ROOT     = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$CONTRACTS_DIR = Join-Path $REPO_ROOT "contracts"
$ENV_FILE      = Join-Path $REPO_ROOT ".env.local"

function Write-Step([string]$msg) { Write-Host "" ; Write-Host ">> $msg" -ForegroundColor Cyan }
function Write-Ok([string]$msg)   { Write-Host "   [OK] $msg" -ForegroundColor Green }
function Write-Warn([string]$msg) { Write-Host "   [WARN] $msg" -ForegroundColor Yellow }
function Write-Fail([string]$msg) { Write-Host "   [FAIL] $msg" -ForegroundColor Red; exit 1 }

function Upsert-EnvLine {
    param([string]$File, [string]$Key, [string]$Value)
    if (Test-Path $File) {
        $content = Get-Content $File -Raw
        if ($content -match "(?m)^${Key}=") {
            $content = [regex]::Replace($content, "(?m)^${Key}=.*`r?`n?", "${Key}=${Value}`n")
        } else {
            $content = $content.TrimEnd() + [System.Environment]::NewLine + "${Key}=${Value}"
        }
        [System.IO.File]::WriteAllText($File, $content, [System.Text.Encoding]::UTF8)
    } else {
        Add-Content $File "${Key}=${Value}"
    }
}

# Step 1: Check tools
Write-Step "Checking prerequisites"
foreach ($tool in @("stellar", "cargo")) {
    if (-not (Get-Command $tool -ErrorAction SilentlyContinue)) {
        Write-Fail "$tool not found. See: https://developers.stellar.org/docs/tools/stellar-cli"
    }
    Write-Ok "$tool is available"
}

# Step 2: Load secret key
Write-Step "Loading deployer secret key"
$secretKey = $env:STELLAR_FACTORY_SECRET_KEY
if (-not $secretKey) {
    if (Test-Path $ENV_FILE) {
        $matchLine = Get-Content $ENV_FILE | Where-Object { $_ -match "^STELLAR_FACTORY_SECRET_KEY=.+" }
        if ($matchLine) {
            $secretKey = ($matchLine -replace "^STELLAR_FACTORY_SECRET_KEY=", "").Trim()
        }
    }
}
if (-not $secretKey) {
    Write-Fail "STELLAR_FACTORY_SECRET_KEY not found in .env.local or shell environment."
}
if (-not $secretKey.StartsWith("S")) {
    Write-Fail "STELLAR_FACTORY_SECRET_KEY does not look like a Stellar secret key (must start with S)."
}
Write-Ok "Secret key loaded (starts with S, length $($secretKey.Length))"

# Step 3: Check / fund account on Testnet
Write-Step "Checking Testnet balance for $ADMIN_WALLET"
$ErrorActionPreference = "Continue"
$acctJson = Invoke-RestMethod "$HORIZON_URL/accounts/$ADMIN_WALLET" 2>$null
$ErrorActionPreference = "Stop"
if ($acctJson) {
    $xlmBalance = ($acctJson.balances | Where-Object { $_.asset_type -eq "native" }).balance
    Write-Ok "Account exists - balance: $xlmBalance XLM"
} else {
    Write-Warn "Account not found on Testnet. Funding via Friendbot..."
    $ErrorActionPreference = "Continue"
    $fbResp = Invoke-RestMethod "https://friendbot.stellar.org?addr=$ADMIN_WALLET" 2>$null
    $ErrorActionPreference = "Stop"
    if ($fbResp) {
        Write-Ok "Friendbot funded $ADMIN_WALLET"
    } else {
        # 400 = already funded in a prior run; verify by re-fetching
        $acctCheck = Invoke-RestMethod "$HORIZON_URL/accounts/$ADMIN_WALLET" -ErrorAction Stop
        if ($acctCheck) {
            $bal = ($acctCheck.balances | Where-Object { $_.asset_type -eq "native" }).balance
            Write-Ok "Account already funded - balance: $bal XLM"
        } else {
            Write-Fail "Could not fund or locate account $ADMIN_WALLET on Testnet."
        }
    }
}

# Step 4: Build contracts using stellar contract build (handles wasm32 + stripping correctly)
Write-Step "Building Soroban contracts via stellar contract build"
$ErrorActionPreference = "Continue"
& stellar contract build --manifest-path (Join-Path $CONTRACTS_DIR "Cargo.toml")
$stellarBuildExit = $LASTEXITCODE
$ErrorActionPreference = "Stop"
if ($stellarBuildExit -ne 0) {
    Write-Fail "stellar contract build failed with exit code $stellarBuildExit"
}
Write-Ok "Build succeeded"

$WASM_DIR      = Join-Path $CONTRACTS_DIR "target\wasm32v1-none\release"
$FACTORY_WASM  = Join-Path $WASM_DIR "crowdfund_factory.wasm"
$CAMPAIGN_WASM = Join-Path $WASM_DIR "campaign.wasm"

if (-not (Test-Path $FACTORY_WASM)) {
    Write-Fail "Factory WASM not found at: $FACTORY_WASM"
}
Write-Ok "Factory WASM ready: $FACTORY_WASM"

# Step 5: Deploy CrowdfundFactory
# stellar CLI writes progress to stderr; use Continue mode so those lines
# don't trigger RemoteException. Capture stdout only for the contract ID.
Write-Step "Deploying CrowdfundFactory to $NETWORK"

$factoryArgs = @(
    "contract", "deploy",
    "--wasm",           $FACTORY_WASM,
    "--source-account", $secretKey,
    "--network",        $NETWORK,
    "--ignore-checks",
    "--optimize"
)

$tmpStderr   = [System.IO.Path]::GetTempFileName()
$ErrorActionPreference = "Continue"
$factoryOutput = & stellar @factoryArgs 2>$tmpStderr
$factoryExit   = $LASTEXITCODE
$ErrorActionPreference = "Stop"
$stderrContent = Get-Content $tmpStderr -Raw -ErrorAction SilentlyContinue
Remove-Item $tmpStderr -Force -ErrorAction SilentlyContinue

if ($factoryExit -ne 0) {
    Write-Host "STDOUT: $($factoryOutput -join "`n")"
    Write-Host "STDERR: $stderrContent"
    Write-Fail "Factory deployment failed (exit code $factoryExit)"
}

# The CLI prints only the contract ID (C...) to stdout on success
$factoryContractId = ""
foreach ($line in $factoryOutput) {
    $t = $line.ToString().Trim()
    if ($t -match "^C[A-Z2-7]{55}$") {
        $factoryContractId = $t
        break
    }
}
if (-not $factoryContractId) {
    $factoryContractId = ($factoryOutput | Where-Object { $_.ToString().Trim() } | Select-Object -Last 1).ToString().Trim()
}

Write-Ok "Factory contract ID: $factoryContractId"

# Step 6: Write IDs to .env.local
Write-Step "Updating .env.local"
Upsert-EnvLine -File $ENV_FILE -Key "NEXT_PUBLIC_FACTORY_CONTRACT_ID" -Value $factoryContractId
Upsert-EnvLine -File $ENV_FILE -Key "NEXT_PUBLIC_STELLAR_NETWORK"     -Value "TESTNET"
Upsert-EnvLine -File $ENV_FILE -Key "NEXT_PUBLIC_SOROBAN_RPC_URL"     -Value $RPC_URL
Upsert-EnvLine -File $ENV_FILE -Key "NEXT_PUBLIC_STELLAR_HORIZON_URL" -Value $HORIZON_URL
Write-Ok ".env.local updated with NEXT_PUBLIC_FACTORY_CONTRACT_ID=$factoryContractId"

# Step 7: Deploy Campaign contract (optional)
if (Test-Path $CAMPAIGN_WASM) {
    Write-Step "Deploying Campaign contract to $NETWORK"
    $campaignArgs = @(
        "contract", "deploy",
        "--wasm",           $CAMPAIGN_WASM,
        "--source-account", $secretKey,
        "--network",        $NETWORK,
        "--ignore-checks",
        "--optimize"
    )
    $tmpStderr2 = [System.IO.Path]::GetTempFileName()
    $ErrorActionPreference = "Continue"
    $campaignOutput = & stellar @campaignArgs 2>$tmpStderr2
    $campaignExit   = $LASTEXITCODE
    $ErrorActionPreference = "Stop"
    Remove-Item $tmpStderr2 -Force -ErrorAction SilentlyContinue

    if ($campaignExit -eq 0) {
        $campaignId = ($campaignOutput | Where-Object { $_.ToString().Trim() } | Select-Object -Last 1).ToString().Trim()
        Upsert-EnvLine -File $ENV_FILE -Key "NEXT_PUBLIC_CAMPAIGN_CONTRACT_ID" -Value $campaignId
        Write-Ok "Campaign contract ID: $campaignId"
    } else {
        Write-Warn "Campaign deploy failed (non-fatal). Output:"
        Write-Host ($campaignOutput -join "`n")
    }
} else {
    Write-Warn "campaign.wasm not found - skipping Campaign deploy"
}

# Step 8: Run health check
Write-Step "Running health check"
$healthScript = Join-Path $PSScriptRoot "health-check.ps1"
if (Test-Path $healthScript) {
    & $healthScript -FactoryContractId $factoryContractId -Network $NETWORK
} else {
    Write-Warn "health-check.ps1 not found - skipping"
}

Write-Host ""
Write-Host "Deployment complete!" -ForegroundColor Magenta
Write-Host "   Factory  : $factoryContractId"
Write-Host "   Network  : $NETWORK"
Write-Host "   Deployer : $ADMIN_WALLET"