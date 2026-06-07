Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "    Installing CyberCoder CLI (@codeva_chat/cli)" -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host ""

# Check for npm
if (!(Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] npm is not installed or not in PATH." -ForegroundColor Red
    Write-Host "Please install Node.js from https://nodejs.org/ first." -ForegroundColor Yellow
    Exit
}

Write-Host "[INFO] Found npm. Proceeding with installation..." -ForegroundColor Green
Write-Host "Running: npm install -g cybercoder-cli@latest"
Write-Host ""

# Run npm install
$process = Start-Process -FilePath "npm.cmd" -ArgumentList "install", "-g", "cybercoder-cli@latest" -Wait -NoNewWindow -PassThru

if ($process.ExitCode -ne 0) {
    Write-Host ""
    Write-Host "[ERROR] Installation failed. Please check the logs above." -ForegroundColor Red
    Exit $process.ExitCode
}

Write-Host ""
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "[SUCCESS] CyberCoder installed successfully!" -ForegroundColor Green
Write-Host "You can now use the 'cm' or 'cybercoder' command." -ForegroundColor Yellow
Write-Host "Run 'cm --help' to get started."
Write-Host "===================================================" -ForegroundColor Cyan
