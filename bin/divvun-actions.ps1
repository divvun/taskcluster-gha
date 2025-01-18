$CWD = Get-Location
$SCRIPT_DIR = Split-Path -Parent $PSScriptRoot

Set-Location -Path $SCRIPT_DIR

# Check if node_modules exists, otherwise pnpm install
if (!(Test-Path -Path "$SCRIPT_DIR/node_modules")) {
  Remove-Item -Path "$SCRIPT_DIR/node_modules" -Recurse -Force -ErrorAction SilentlyContinue
  & pnpm install -s
}

# Set environment variable and run the TypeScript file
$env:_DIVVUN_ACTIONS_PWD = $CWD
$pnpm = (Get-Command pnpm).Path
Start-Process -FilePath pwsh -ArgumentList $(@($pnpm, 'tsx', 'index.ts') + $args) -NoNewWindow -Wait
