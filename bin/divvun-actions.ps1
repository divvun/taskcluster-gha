$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

$CWD = Get-Location
$SCRIPT_DIR = Split-Path -Parent $PSScriptRoot

try {
    Set-Location -Path $SCRIPT_DIR

    $env:_DIVVUN_ACTIONS_PLATFORM = if ($env:_DIVVUN_ACTIONS_PLATFORM) { $env:_DIVVUN_ACTIONS_PLATFORM } else { "windows" }
    $env:_DIVVUN_ACTIONS_ENV = if ($env:_DIVVUN_ACTIONS_ENV) { $env:_DIVVUN_ACTIONS_ENV } else { "native" }

    $env:_DIVVUN_ACTIONS_PWD = $CWD
    $env:CI = 1
    $scriptArgs = if ($args.Count -eq 0) { @('-h') } else { $args }
    
    # Have to run it through cmd.exe because PS has trouble piping data... lol
    cmd /c "deno -q run -A main.ts $scriptArgs | deno -q run -A ./util/redactor.ts"
} finally {
    Set-Location -Path $CWD
}

