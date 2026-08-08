# Puts "The Strip" on the Desktop with the game's own icon — the Windows
# counterpart of dragging The Strip.app to the macOS Dock.
#
# This is a .ps1 and not a one-liner inside the .cmd on purpose: quoting a
# PowerShell -Command through cmd.exe needs carets and backslash-escaped quotes,
# and the first version of it was already unreadable and one edit away from
# silently producing a broken shortcut. Here $PSScriptRoot does the work and
# there is nothing to escape.

$ErrorActionPreference = 'Stop'

$dir      = $PSScriptRoot
$target   = Join-Path $dir 'The Strip.cmd'
$icon     = Join-Path $dir 'the-strip.ico'
$linkPath = Join-Path ([Environment]::GetFolderPath('Desktop')) 'The Strip.lnk'

if (-not (Test-Path -LiteralPath $target)) {
  Write-Host 'Could not find "The Strip.cmd" next to this script.'
  Write-Host 'Keep every file from the zip together in one folder.'
  Read-Host 'Press Enter to close'
  exit 1
}

$shortcut = (New-Object -ComObject WScript.Shell).CreateShortcut($linkPath)
$shortcut.TargetPath       = $target
$shortcut.WorkingDirectory = $dir
$shortcut.IconLocation     = $icon
$shortcut.Description      = 'The Strip - cross a blind minefield by listening'
$shortcut.Save()

Write-Host "Shortcut created: $linkPath"
Write-Host ''
Write-Host 'Keep it and this folder together - the shortcut points into the folder.'
Start-Sleep -Seconds 3
