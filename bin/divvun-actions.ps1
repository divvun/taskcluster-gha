$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

$CWD = Get-Location
$SCRIPT_DIR = Split-Path -Parent $PSScriptRoot

Set-Location -Path $SCRIPT_DIR

$platform = if ($env:_DIVVUN_ACTIONS_PLATFORM) { $env:_DIVVUN_ACTIONS_PLATFORM } else { "windows" }
$environment = if ($env:_DIVVUN_ACTIONS_ENV) { $env:_DIVVUN_ACTIONS_ENV } else { "native" }

$env:_DIVVUN_ACTIONS_PWD = $CWD
$scriptArgs = if ($args.Count -eq 0) { @('-h') } else { $args }
& deno run -A --unstable-sloppy-imports index.ts $scriptArgs
