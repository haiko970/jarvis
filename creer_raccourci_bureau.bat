@echo off
rem Double-clique sur ce fichier pour creer un raccourci "Jarvis" sur le Bureau.
rem Si tu deplaces le dossier de Jarvis, relance ce fichier pour mettre le raccourci a jour.
cd /d "%~dp0"
set "JARVIS_DIR=%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$dir = $env:JARVIS_DIR;" ^
  "$desktop = [Environment]::GetFolderPath('Desktop');" ^
  "$s = (New-Object -ComObject WScript.Shell).CreateShortcut((Join-Path $desktop 'Jarvis.lnk'));" ^
  "$s.TargetPath = (Join-Path $dir 'lancer_jarvis.bat');" ^
  "$s.WorkingDirectory = $dir;" ^
  "$s.IconLocation = (Join-Path $dir 'jarvis\static\jarvis.ico');" ^
  "$s.Description = 'Jarvis, ton assistant personnel';" ^
  "$s.Save()"
if errorlevel 1 (
  echo.
  echo [ERREUR] Impossible de creer le raccourci.
) else (
  echo.
  echo Raccourci "Jarvis" cree sur ton Bureau !
  echo Si tu deplaces le dossier de Jarvis, relance ce fichier.
)
echo.
pause
