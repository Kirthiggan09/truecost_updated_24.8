@echo off
title TrueCost - Starting...
color 0A

echo.
echo  ==========================================
echo       TrueCost - Car Affordability Tool     
echo  ==========================================
echo.

:: Navigate to script directory
cd /d "%~dp0"

:: Check if Node.js is installed
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo  [ERROR] Node.js is not installed.
    echo  Install from: https://nodejs.org
    pause
    exit /b 1
)

:: Install dependencies if node_modules missing
if not exist "node_modules" (
    echo  [INFO] Installing dependencies ^(first time only^)...
    call npm install
    echo.
)

:: Kill any existing process on port 3000
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr :3000 ^| findstr LISTENING') do (
    echo  [INFO] Freeing port 3000 ^(PID %%a^)...
    taskkill /PID %%a /F >nul 2>&1
)

echo  [INFO] Starting TrueCost server...
timeout /t 1 /nobreak >nul

:: Open browser after short delay
start "" cmd /c "timeout /t 3 /nobreak >nul && start http://localhost:3000"

echo.
echo  ==========================================
echo   Server: http://localhost:3000
echo   Browser will open automatically...
echo   Close this window to stop the server.
echo  ==========================================
echo.

:: Start server (keeps window open)
node server.js
