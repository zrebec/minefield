# THE STRIP — offline launcher (Windows). Started by "The Strip.cmd".
#
# Same shape as the macOS launcher: serve this folder, hand the page to the
# browser, and shut down once the browser has taken its copy. From then on a
# service worker keeps the game running with no server at all.
#
# Unlike macOS there is NO runtime ladder here, and that is the point. macOS may
# or may not have python3/php/node/ruby, so serve.sh has to hunt for one.
# Windows 10 and later always ship PowerShell, and PowerShell has
# System.Net.HttpListener — so the server IS this file. Nothing to detect,
# nothing to install, no "your machine has no runtime" failure mode.
#
# The prefix is http://localhost:… on purpose: Windows lets a normal user
# reserve the loopback name without an admin URL ACL, which http://127.0.0.1:…
# would demand. (One consequence worth knowing: this makes the Windows origin
# `localhost:8137` while macOS uses `127.0.0.1:8137`, so the two keep separate
# high-score tables — see docs/offline.md.)

$ErrorActionPreference = 'Stop'

$Port = 8137
$Url  = "http://localhost:$Port/"

$GameDir = Join-Path $PSScriptRoot 'game'
if (-not (Test-Path -LiteralPath $GameDir -PathType Container)) {
  Write-Host 'The "game" folder is missing from this directory.'
  Write-Host 'Unzip the whole package and keep its files together.'
  Write-Host ''
  Read-Host 'Press Enter to close'
  exit 1
}
# Trailing separator matters for the containment check below: without it,
# "…\game" also prefix-matches "…\gameEVIL".
$Root = (Resolve-Path $GameDir).Path.TrimEnd('\') + '\'

# A .js served as anything but text/javascript makes the browser refuse the
# module and the screen stays black. Same map as serve.sh.
$Mime = @{
  '.html'        = 'text/html'
  '.js'          = 'text/javascript'
  '.css'         = 'text/css'
  '.svg'         = 'image/svg+xml'
  '.png'         = 'image/png'
  '.ico'         = 'image/x-icon'
  '.webmanifest' = 'application/manifest+json'
  '.json'        = 'application/json'
}

Write-Host 'THE STRIP - offline'
Write-Host ''

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add($Url)
try {
  $listener.Start()
} catch {
  Write-Host "Could not open port $Port. Something else on this PC is probably using it."
  Write-Host 'Close it and try again, or play online at https://zrebec.github.io/minefield/'
  Write-Host ''
  Read-Host 'Press Enter to close'
  exit 1
}

Write-Host "Opened $Url"
Write-Host 'Waiting for your browser to take its copy...'
Write-Host ''
Start-Process $Url

$served    = New-Object System.Collections.Generic.HashSet[string]
$started   = Get-Date
$lastReq   = $null
$IdleQuit  = 3     # seconds of quiet after the last request
$MaxAfter  = 25    # hard cap once the browser has connected
$MaxWait   = 300   # give up if the browser never connects at all

# One pending accept, carried across iterations — do NOT move GetContextAsync()
# inside the loop body. Calling it every 500 ms would queue a new accept each
# time and abandon the previous one; when a request finally arrived, any one of
# those hundreds of pending tasks could be the one to receive it, while the
# variable we happen to be waiting on stayed unfinished. The server would sit
# there timing out with the browser hanging on a request it had already
# accepted. (Reasoned, not observed — there is no Windows machine here.)
$task = $listener.GetContextAsync()

while ($true) {
  if (-not $task.Wait(500)) {
    $now = Get-Date
    if ($lastReq) {
      if (($now - $lastReq).TotalSeconds -ge $IdleQuit) { break }
      if (($now - $lastReq).TotalSeconds -ge $MaxAfter) { break }
    } elseif (($now - $started).TotalSeconds -ge $MaxWait) {
      break
    }
    continue
  }

  $ctx  = $task.Result
  $task = $listener.GetContextAsync()   # queue the next accept before serving this one
  $rel  = [System.Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath)
  if ($rel -eq '/') { $rel = '/index.html' }
  $lastReq = Get-Date
  [void]$served.Add($rel)

  $path = Join-Path $Root ($rel.TrimStart('/') -replace '/', '\')
  $full = [System.IO.Path]::GetFullPath($path)

  # Never serve outside the game folder, whatever the URL claims.
  if (-not $full.StartsWith($Root, [StringComparison]::OrdinalIgnoreCase) -or -not (Test-Path -LiteralPath $full -PathType Leaf)) {
    $ctx.Response.StatusCode = 404
    $ctx.Response.Close()
    continue
  }

  $bytes = [System.IO.File]::ReadAllBytes($full)
  $ext   = [System.IO.Path]::GetExtension($full).ToLowerInvariant()
  $ctx.Response.ContentType = if ($Mime.ContainsKey($ext)) { $Mime[$ext] } else { 'application/octet-stream' }
  $ctx.Response.ContentLength64 = $bytes.Length
  $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
  $ctx.Response.Close()
}

$listener.Stop()
$listener.Close()

if ($served.Count -gt 0) {
  Write-Host "Done - your browser has the game ($($served.Count) files)."
  Write-Host ''
  Write-Host 'The local server is shutting down now. The tab you just opened keeps'
  Write-Host 'working with it gone - it has its own copy.'
  Write-Host ''
  Write-Host 'For a shortcut you can keep, run "Create desktop shortcut.cmd" once.'
} else {
  Write-Host 'Your browser never opened the game.'
  Write-Host "Open $Url yourself, or just run this again."
}

Write-Host ''
Start-Sleep -Seconds 3
