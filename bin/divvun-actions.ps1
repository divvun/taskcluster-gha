$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

$CWD = Get-Location
$SCRIPT_DIR = Split-Path -Parent $PSScriptRoot

Set-Location -Path $SCRIPT_DIR

$platform = if ($env:_DIVVUN_ACTIONS_PLATFORM) { $env:_DIVVUN_ACTIONS_PLATFORM } else { "windows" }
$environment = if ($env:_DIVVUN_ACTIONS_ENV) { $env:_DIVVUN_ACTIONS_ENV } else { "native" }

$envPath = "node_modules-$platform-$environment"
$modulesDir = Join-Path $env:LOCALAPPDATA "Divvun Actions" "$platform-$environment" "node_modules"

# Create junction from envPath to modulesDir
if (!(Test-Path -Path $envPath)) {
  New-Item -ItemType Directory -Path $modulesDir -Force | Out-Null
  New-Item -ItemType Junction -Path $envPath -Target $modulesDir -Force | Out-Null
  
  echo "Installing deps to $modulesDir"
  & pnpm config set node-linker hoisted
  & pnpm install -s --force --frozen-lockfile --modules-dir $envPath --virtual-store-dir (Join-Path $envPath ".pnpm")
}

# Set environment variable and run the TypeScript file
$env:_DIVVUN_ACTIONS_PWD = $CWD
$env:NODE_PATH = Join-Path $SCRIPT_DIR $envPath
$scriptArgs = if ($args.Count -eq 0) { @('-h') } else { $args }
$tsxPath = Join-Path $envPath '.bin' 'tsx.ps1'
Start-Process -FilePath pwsh -ArgumentList (@($tsxPath, 'index.ts') + $scriptArgs) -NoNewWindow -Wait
