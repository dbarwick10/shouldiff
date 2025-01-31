@echo off
echo Setting up Shouldiff Server...

:: Store the current directory
set ORIGINAL_DIR=%CD%

:: Create and navigate to temp directory in user's temp folder
set TEMP_DIR=%TEMP%\shouldiff-temp
if exist "%TEMP_DIR%" rmdir /s /q "%TEMP_DIR%"
mkdir "%TEMP_DIR%"
cd /d "%TEMP_DIR%"

:: Clone the repository
echo Cloning repository...
git clone -b testMain --single-branch https://github.com/dbarwick10/shouldiff.git .

:: Navigate to server directory
cd server

:: Install dependencies
echo Installing dependencies...
call npm install

:: Create cleanup script that will run when this window is closed
echo @echo off > cleanup.bat
echo timeout /t 1 /nobreak > nul >> cleanup.bat
echo cd /d "%ORIGINAL_DIR%" >> cleanup.bat
echo rmdir /s /q "%TEMP_DIR%" >> cleanup.bat
echo exit >> cleanup.bat

:: Start the server and trigger cleanup when window closes
echo Starting server...
start /b cmd /c "node server.js & cleanup.bat"

echo Server is running! Close this window to stop the server and clean up.
pause