# Stops the local preview: website, API server and database.
$here = $PSScriptRoot
$apiPort = 8080
if (Test-Path (Join-Path $here '.env')) {
  foreach ($line in Get-Content (Join-Path $here '.env')) {
    if ($line -match '^PORT=(\d+)$') { $apiPort = [int]$Matches[1] }
  }
}
# Restrict shutdown to node processes identified by our PID files or API log.
foreach ($service in @(@{ Name = 'web'; Port = 5173; Pattern = 'vite' }, @{ Name = 'api'; Port = $apiPort; Pattern = 'dist[/\\]index\.mjs' })) {
  $processIds = @()
  $pidPath = Join-Path $here ($service.Name + '.pid')
  if (Test-Path $pidPath) { $processIds += [int](Get-Content $pidPath -TotalCount 1) }
  if ($service.Name -eq 'api' -and (Test-Path (Join-Path $here 'logs\api.log'))) {
    $apiLog = Get-Content (Join-Path $here 'logs\api.log') -Raw
    foreach ($networkLine in netstat -ano -p tcp) {
      if ($networkLine -match ('^\s*TCP\s+\S+:' + $service.Port + '\s+\S+\s+LISTENING\s+(\d+)\s*$')) {
        $candidate = [int]$Matches[1]
        if ($apiLog -match ('\(' + $candidate + '\)')) { $processIds += $candidate }
      }
    }
  }
  foreach ($processId in $processIds | Select-Object -Unique) {
    $ownedProcess = Get-CimInstance Win32_Process -Filter "ProcessId=$processId" -ErrorAction SilentlyContinue
    if ($ownedProcess.Name -eq 'node.exe' -and $ownedProcess.CommandLine -match $service.Pattern) {
      Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
      "Stopped $($service.Name)"
    }
  }
  Remove-Item -LiteralPath $pidPath -Force -ErrorAction SilentlyContinue
}
$pgCtl = Join-Path $here "node_modules\@embedded-postgres\windows-x64\native\bin\pg_ctl.exe"
if (Test-Path (Join-Path $here "data\postmaster.pid")) {
  $serverPid = [int](Get-Content (Join-Path $here 'data\postmaster.pid') -TotalCount 1)
  $server = Get-CimInstance Win32_Process -Filter "ProcessId=$serverPid" -ErrorAction SilentlyContinue
  $helper = if ($server) { Get-CimInstance Win32_Process -Filter "ProcessId=$($server.ParentProcessId)" -ErrorAction SilentlyContinue }
  & $pgCtl stop -D (Join-Path $here "data") -m fast *> $null
  "Stopped database"
  if ($helper.Name -eq 'node.exe' -and $helper.CommandLine -match 'db\.mjs') {
    Stop-Process -Id $helper.ProcessId -Force -ErrorAction SilentlyContinue
  }
}
