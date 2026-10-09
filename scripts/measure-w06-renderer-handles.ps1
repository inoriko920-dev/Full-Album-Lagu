# CI-only OS telemetry, launched by the Node Windows test runner.
# This is NOT an application service: src/main/ is forbidden to spawn tools.
param(
  [Parameter(Mandatory = $true)][string]$PidFile,
  [Parameter(Mandatory = $true)][string]$IdleMarker,
  [Parameter(Mandatory = $true)][string]$OutputFile
)

$ErrorActionPreference = "Stop"
$deadline = [DateTime]::UtcNow.AddSeconds(120)

while (!(Test-Path -LiteralPath $PidFile)) {
  if ([DateTime]::UtcNow -ge $deadline) {
    throw "T06 renderer PID handoff did not arrive"
  }
  Start-Sleep -Milliseconds 50
}

$pidText = (Get-Content -LiteralPath $PidFile -Raw).Trim()
[int]$targetProcessId = 0
if (![int]::TryParse($pidText, [ref]$targetProcessId) -or $targetProcessId -le 0) {
  throw "T06 renderer PID handoff was invalid"
}

$samples = [System.Collections.Generic.List[object]]::new()
while ([DateTime]::UtcNow -lt $deadline) {
  $target = Get-Process -Id $targetProcessId -ErrorAction SilentlyContinue
  if ($null -eq $target) {
    break
  }
  $phase = if (Test-Path -LiteralPath $IdleMarker) { "idle" } else { "active" }
  $count = [int]$target.HandleCount
  if ($count -le 0) {
    # A Process instance can remain observable momentarily after Chromium
    # has closed its handles. Do not treat an OS shutdown sample as an
    # application leak. The strict active/idle minimums below still apply:
    # premature shutdown MUST fail rather than fabricating observations.
    break
  }
  $null = $samples.Add([pscustomobject]@{
    timestampMs = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
    pid = $targetProcessId
    phase = $phase
    handleCount = $count
  })
  Start-Sleep -Milliseconds 100
}

$active = @($samples | Where-Object { $_.phase -eq "active" })
$idle = @($samples | Where-Object { $_.phase -eq "idle" })
if ($active.Count -lt 8 -or $idle.Count -lt 3) {
  throw "T06 insufficient native Windows OS resource samples (active=$($active.Count), idle=$($idle.Count))"
}
$payload = @{
  source = "Windows Get-Process HandleCount (external CI harness)"
  pid = $targetProcessId
  samplingIntervalMs = 100
  samples = $samples.ToArray()
  activeCount = $active.Count
  idleCount = $idle.Count
  firstActiveHandles = $active[0].handleCount
  lastIdleHandles = $idle[$idle.Count - 1].handleCount
}
$json = ConvertTo-Json -InputObject $payload -Depth 6
[System.IO.File]::WriteAllText(
  $OutputFile,
  $json,
  [System.Text.UTF8Encoding]::new($false)
)
Write-Output "T06 Windows external renderer handle sampling PASS"
