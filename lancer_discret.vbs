' Lance Jarvis en arriere-plan, sans fenetre noire (demarrage du PC en mode discret).
' Jarvis attend alors pres de l'horloge : clic sur son icone, ou Ctrl + Alt + J.
Set shell = CreateObject("WScript.Shell")
dossier = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)
shell.CurrentDirectory = dossier
shell.Run """" & dossier & "\lancer_jarvis.bat"" discret", 0, False
