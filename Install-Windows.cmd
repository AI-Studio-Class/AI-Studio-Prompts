@echo off
cd /d "%~dp0"
where py >nul 2>nul
if %errorlevel% equ 0 (
  py -3 scripts\install.py
) else (
  python scripts\install.py
)
set "studio_result=%errorlevel%"
pause
exit /b %studio_result%
