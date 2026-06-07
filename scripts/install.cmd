@echo off
setlocal

echo ===================================================
echo     Installing CyberCoder CLI (@codeva_chat/cli)
echo ===================================================
echo.

:: Check for Node.js
where npm >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] npm is not installed or not in PATH.
    echo Please install Node.js from https://nodejs.org/ first.
    exit /b 1
)

echo [INFO] Found npm. Proceeding with installation...
echo Running: npm install -g cybercoder-cli@latest
echo.

call npm install -g cybercoder-cli@latest

if %ERRORLEVEL% neq 0 (
    echo.
    echo [ERROR] Installation failed. Please check the logs above.
    exit /b %ERRORLEVEL%
)

echo.
echo ===================================================
echo [SUCCESS] CyberCoder installed successfully!
echo You can now use the 'cm' or 'cybercoder' command.
echo Run 'cm --help' to get started.
echo ===================================================
pause
