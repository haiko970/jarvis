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
echo et coche bien la case "Add python.exe to PATH" pendant l'installation.
echo.
pause
exit /b 1

:python_ok
if exist ".venv\Scripts\python.exe" goto deps_ok
echo.
echo === Premiere installation de Jarvis, patiente une ou deux minutes... ===
echo.
%PY% -m venv .venv
if errorlevel 1 goto erreur
".venv\Scripts\python.exe" -m pip install --upgrade pip
".venv\Scripts\python.exe" -m pip install -r requirements.txt
if errorlevel 1 goto erreur

:deps_ok
if /i not "%~1"=="voix" goto voix_ok
".venv\Scripts\python.exe" -c "import speech_recognition, pyttsx3, pyaudio" >nul 2>nul
if not errorlevel 1 goto voix_ok
echo.
echo === Installation du mode vocal... ===
".venv\Scripts\python.exe" -m pip install -r requirements-voix.txt
if errorlevel 1 goto erreur

:voix_ok
if exist ".env" goto lancer
echo.
echo ================================================================
echo  Il faut ta cle API Anthropic (elle commence par sk-ant-).
echo  Copie-la, puis fais un CLIC DROIT dans cette fenetre pour la coller,
echo  et appuie sur Entree.
echo ================================================================
set /p "CLE=Ta cle : "
if "%CLE%"=="" goto voix_ok
> .env echo ANTHROPIC_API_KEY=%CLE%
echo Cle enregistree dans le fichier .env
echo.

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
