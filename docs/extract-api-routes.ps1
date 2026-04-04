Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$routesFile = Join-Path $repoRoot 'api\routes\api.php'

if (!(Test-Path $routesFile)) {
  throw "Routes file not found: $routesFile"
}

$pattern = @'
Route::(get|post|put|patch|delete)\(\s*["']([^"']+)["']
'@

$lines = Get-Content $routesFile
$routes =
  foreach ($line in $lines) {
    if ($line -match $pattern) {
      [pscustomobject]@{
        method = $matches[1].ToUpperInvariant()
        path   = $matches[2]
      }
    }
  }

$routes |
  Sort-Object path, method |
  Format-Table -AutoSize

