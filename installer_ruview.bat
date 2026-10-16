@echo off
rem Installe (ou met a jour) RuView : detection de presence par le WiFi.
rem https://github.com/ruvnet/RuView
rem RuView est range dans ton dossier personnel (%USERPROFILE%\RuView), a cote de Jarvis.
rem La premiere fois, compte 30 a 60 minutes (outils de Microsoft + compilation).
rem Ensuite, relance ce fichier quand tu veux mettre RuView a jour.
cd /d "%~dp0"
title Installation de RuView
set "RUVIEW=%USERPROFILE%\RuView"

echo.
echo === Installation de RuView (detection de presence par le WiFi) ===
echo.
echo Windows va peut-etre te demander plusieurs fois l'autorisation : clique sur "Oui".
echo Laisse cette fenetre ouverte jusqu'au message "RuView est pret".
echo.

where winget >nul 2>nul
if not errorlevel 1 goto winget_ok
echo [ERREUR] L'outil "winget" de Windows est introuvable.
echo Installe "Programme d'installation d'application" depuis le Microsoft Store, puis relance ce fichier.
goto erreur

:winget_ok
rem --- 1. Git (pour telecharger RuView) ---
where git >nul 2>nul
if not errorlevel 1 goto git_ok
if exist "%ProgramFiles%\Git\cmd\git.exe" goto git_path
echo [1/4] Installation de Git...
winget install --id Git.Git -e --silent --accept-source-agreements --accept-package-agreements
:git_path
set "PATH=%ProgramFiles%\Git\cmd;%PATH%"
where git >nul 2>nul
if errorlevel 1 goto erreur
:git_ok
echo [1/4] Git est pret.

rem --- 2. Rust (le langage de RuView) ---
set "PATH=%USERPROFILE%\.cargo\bin;%PATH%"
where cargo >nul 2>nul
if not errorlevel 1 goto rust_ok
echo [2/4] Installation de Rust...
winget install --id Rustlang.Rustup -e --silent --accept-source-agreements --accept-package-agreements
where rustup >nul 2>nul
if errorlevel 1 goto erreur
rustup default stable
:rust_ok
echo [2/4] Rust est pret.

rem --- 3. Outils de compilation de Microsoft (C++) ---
set "VSWHERE=%ProgramFiles(x86)%\Microsoft Visual Studio\Installer\vswhere.exe"
set "VC="
if exist "%VSWHERE%" for /f "usebackq delims=" %%i in (`"%VSWHERE%" -products * -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath`) do set "VC=%%i"
if defined VC goto vc_ok
echo [3/4] Installation des outils de compilation de Microsoft (environ 3 Go, c'est long)...
winget install --id Microsoft.VisualStudio.2022.BuildTools -e --accept-source-agreements --accept-package-agreements --override "--wait --passive --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"
if errorlevel 1 goto erreur
:vc_ok
echo [3/4] Les outils de compilation sont prets.

rem --- 4. Telechargement et compilation de RuView ---
if exist "%RUVIEW%\.git" goto maj
echo [4/4] Telechargement de RuView...
git -c core.longpaths=true clone --depth 1 --recurse-submodules --shallow-submodules https://github.com/ruvnet/RuView.git "%RUVIEW%"
if errorlevel 1 goto erreur
goto compiler
:maj
echo [4/4] Mise a jour de RuView...
git -C "%RUVIEW%" config core.longpaths true
git -C "%RUVIEW%" pull --ff-only
if errorlevel 1 goto erreur
git -C "%RUVIEW%" submodule update --init --recursive --depth 1
if errorlevel 1 goto erreur

:compiler
echo.
echo Compilation de RuView : 10 a 30 minutes, le PC va chauffer un peu, c'est normal.
echo.
cd /d "%RUVIEW%\v2"
rem Version "Windows" : sans les bibliotheques de calcul difficiles a installer (BLAS).
cargo build --release --no-default-features -p wifi-densepose-sensing-server
if errorlevel 1 goto erreur

echo.
echo ==============================================================
echo  RuView est pret !
echo  Relance Jarvis : le cadre "Presence" s'allume tout seul.
echo  Demande-lui : "Jarvis, il y a quelqu'un dans la piece ?"
echo ==============================================================
echo.
pause
exit /b 0

:erreur
echo.
echo [ERREUR] Quelque chose s'est mal passe pendant l'installation de RuView.
echo Ferme cette fenetre et relance installer_ruview.bat (il reprend ou il s'est arrete).
echo Si ca recommence, fais une capture d'ecran de cette fenetre pour demander de l'aide.
echo.
pause
exit /b 1
