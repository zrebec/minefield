@echo off
rem Puts "Minefield" on your Desktop with the game's own icon.
rem Run it once; running it again just overwrites the same shortcut.
rem
rem The work is in shortcut.ps1 — see the note at the top of that file for why
rem it is not inlined here.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0shortcut.ps1"
