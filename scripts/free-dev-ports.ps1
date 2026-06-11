param(
  [int[]]$Ports = @(5100, 5180)
)

$killed = @()

foreach ($port in $Ports) {
  $connections = Get-NetTCPConnection -State Listen -LocalPort $port -ErrorAction SilentlyContinue
  if ($connections) {
    $processIds = $connections | Select-Object -ExpandProperty OwningProcess -Unique
    foreach ($processId in $processIds) {
      try {
        Stop-Process -Id $processId -Force -ErrorAction Stop
        $killed += [PSCustomObject]@{ Port = $port; ProcessId = $processId }
      } catch {
        Write-Warning "Failed to stop PID $processId on port ${port}: $($_.Exception.Message)"
      }
    }
  }
}

if ($killed.Count -eq 0) {
  Write-Host "No dev ports were occupied."
} else {
  Write-Host "Freed dev ports:"
  $killed | Sort-Object Port, ProcessId | Format-Table -AutoSize
}
