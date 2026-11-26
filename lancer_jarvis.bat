@echo off
rem Double-clique sur ce fichier pour installer (la premiere fois) et lancer Jarvis.
rem Pour le mode vocal, utilise plutot "lancer_jarvis_voix.bat".
rem Avec "brief" (lancement automatique au demarrage du PC), Jarvis fait le brief du jour.
rem Avec "discret" (lance par lancer_discret.vbs), Jarvis attend en arriere-plan sans fenetre.
cd /d "%~dp0"
title Jarvis

set "PY="
where py >nul 2>nul && set "PY=py"
if defined PY goto python_ok
where python >nul 2>nul && set "PY=python"
if defined PY goto python_ok
if /i "%~1"=="discret" goto erreur_discret
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
if /i "%~1"=="discret" goto erreur_discret
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
set "MODE="
if /i "%~1"=="voix" set "MODE=--voix"
if /i "%~1"=="brief" set "MODE=--brief"
if /i "%~1"=="discret" set "MODE=--discret"
".venv\Scripts\python.exe" -m jarvis %MODE%
rem Fermeture normale ("Jarvis, ferme-toi") : la fenetre noire se ferme toute seule.
if errorlevel 1 goto plantage
exit /b 0

:plantage
if /i "%~1"=="discret" goto erreur_discret
echo.
echo Jarvis s'est arrete a cause d'un probleme (voir le message au-dessus).
echo Fais une capture d'ecran de cette fenetre pour demander de l'aide.
pause
exit /b 1

:erreur
if /i "%~1"=="discret" goto erreur_discret
echo.
echo [ERREUR] Quelque chose s'est mal passe pendant l'installation.
echo Fais une capture d'ecran de cette fenetre pour demander de l'aide.
echo.
pause
exit /b 1

:erreur_discret
rem Mode discret : personne ne voit cette fenetre, alors on previent avec un message.
powershell -NoProfile -Command "Add-Type -AssemblyName PresentationFramework; [System.Windows.MessageBox]::Show('Jarvis n''a pas pu demarrer. Double-clique sur lancer_jarvis.bat dans le dossier de Jarvis pour voir le probleme.', 'Jarvis')" >nul 2>nul
exit /b 1
