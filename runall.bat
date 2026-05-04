@echo off
setlocal enabledelayedexpansion

REM Get the current directory
set "SERVICES_DIR=%~dp0"

start cmd /k cd "2016-roblox-main" ^& call run.bat
start cmd /k cd "game-server" ^& call run.bat

REM Run RCCService with admin privileges using VBScript
cscript.exe "%SERVICES_DIR%elevate-rcc.vbs"

start cmd /k cd "Roblox/Roblox.Website" ^& call run.bat
start cmd /k cd "AssetValidationServiceV2" ^& call run.bat
