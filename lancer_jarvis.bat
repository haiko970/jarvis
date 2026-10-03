@echo off
rem Double-clique sur ce fichier pour installer (la premiere fois) et lancer Jarvis.
rem Pour le mode vocal, utilise plutot "lancer_jarvis_voix.bat".
cd /d "%~dp0"
title Jarvis

set "PY="
where py >nul 2>nul && set "PY=py"
if defined PY goto python_ok
where python >nul 2>nul && set "PY=python"
if defined PY goto python_ok
echo.
echo [ERREUR] Python n'est pas installe, ou pas trouve.
echo Installe-le depuis https://www.python.org/downloads/
echo.
pause
exit /b 1

:python_ok
where ollama >nul 2>nul
if not errorlevel 1 goto ollama_ok
if exist "%LOCALAPPDATA%\Programs\Ollama\ollama.exe" goto ollama_ok
echo.
echo [ERREUR] Ollama n'est pas installe.
echo Telecharge-le sur https://ollama.com/download , installe-le, puis relance Jarvis.
echo.
pause
exit /b 1

:ollama_ok
if exist ".venv\Scripts\python.exe" goto venv_ok
echo.
echo === Premiere installation de Jarvis, patiente une ou deux minutes... ===
echo.
%PY% -m venv .venv
if errorlevel 1 goto erreur
".venv\Scripts\python.exe" -m pip install --upgrade pip

:venv_ok
echo Verification des composants...
".venv\Scripts\python.exe" -m pip install -q --disable-pip-version-check -r requirements.txt
if errorlevel 1 goto erreur

if /i not "%~1"=="voix" goto lancer
".venv\Scripts\python.exe" -c "import speech_recognition, pyttsx3, pyaudio" >nul 2>nul
if not errorlevel 1 goto lancer
echo.
echo === Installation du mode vocal... ===
".venv\Scripts\python.exe" -m pip install -r requirements-voix.txt
if errorlevel 1 goto erreur

:lancer
if /i "%~1"=="voix" (
  ".venv\Scripts\python.exe" -m jarvis --voix
) else (
  ".venv\Scripts\python.exe" -m jarvis
)
echo.
pause
exit /b 0

:erreur
echo.
echo [ERREUR] Quelque chose s'est mal passe pendant l'installation.
echo Fais une capture d'ecran de cette fenetre pour demander de l'aide.
echo.
pause
exit /b 1
