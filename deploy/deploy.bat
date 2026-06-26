@echo off
REM Learning Log System - One-Click Deployment Script (Windows)
REM Usage: deploy.bat [target_directory]

setlocal enabledelayedexpansion

set TARGET_DIR=%1
if "%TARGET_DIR%"=="" set TARGET_DIR=.

echo.
echo ====================================
echo Learning Log System Deployment
echo ====================================
echo.
echo Target directory: %TARGET_DIR%
echo.

REM Create directory structure
echo Creating directory structure...
if not exist "%TARGET_DIR%\backend" mkdir "%TARGET_DIR%\backend"
if not exist "%TARGET_DIR%\data" mkdir "%TARGET_DIR%\data"
if not exist "%TARGET_DIR%\frontend" mkdir "%TARGET_DIR%\frontend"

REM Copy backend files
echo Copying backend files...
if exist "backend\db.py" copy "backend\db.py" "%TARGET_DIR%\backend\" >nul
if exist "backend\main.py" copy "backend\main.py" "%TARGET_DIR%\backend\" >nul
if exist "backend\requirements.txt" copy "backend\requirements.txt" "%TARGET_DIR%\backend\" >nul

REM Create requirements.txt if not exists
if not exist "%TARGET_DIR%\backend\requirements.txt" (
    echo Creating requirements.txt...
    (
        echo fastapi==0.104.1
        echo uvicorn==0.24.0
        echo pydantic==2.5.0
    ) > "%TARGET_DIR%\backend\requirements.txt"
)

REM Check Python version
echo.
echo Checking Python version...
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python not found!
    echo Please install Python 3.8+ and try again.
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('python --version') do set PYTHON_VERSION=%%i
echo Found: !PYTHON_VERSION!

REM Install dependencies
echo.
echo Installing dependencies...
cd "%TARGET_DIR%\backend"
pip install -r requirements.txt --quiet
echo Dependencies installed

REM Initialize database
echo.
echo Initializing database...
python db.py

REM Start server
echo.
echo Starting server...
echo   API will be available at: http://localhost:8002
echo   API docs: http://localhost:8002/docs
echo.
echo Press Ctrl+C to stop the server
echo.

python main.py
