@echo off
rem THE STRIP - offline launcher (Windows). Double-click me.
rem
rem All the work is in serve.ps1; this exists because Windows will not let you
rem double-click a .ps1 to run it. -ExecutionPolicy Bypass applies to THIS
rem invocation only and changes nothing about the machine's policy.
rem
rem Why a server is needed at all: the game is an ES module, and browsers refuse
rem to load modules over file://. The server runs on loopback, serves only this
rem folder, and shuts itself down as soon as your browser has taken a copy.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0serve.ps1"
