Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$apiRoot = Join-Path $repoRoot 'api'
$scribeDir = Join-Path $apiRoot 'storage\app\private\scribe'
$outDir = Join-Path $repoRoot 'docs\api-contract'

$openapiIn = Join-Path $scribeDir 'openapi.yaml'
$postmanIn = Join-Path $scribeDir 'collection.json'

if (!(Test-Path $openapiIn)) {
  throw "Missing: $openapiIn. Run: php artisan scribe:generate"
}
if (!(Test-Path $postmanIn)) {
  throw "Missing: $postmanIn. Run: php artisan scribe:generate"
}

New-Item -ItemType Directory -Force -Path $outDir | Out-Null

Copy-Item -Force $openapiIn (Join-Path $outDir 'openapi.yaml')
Copy-Item -Force $postmanIn (Join-Path $outDir 'postman-collection.json')

Write-Host "Exported:"
Write-Host ("- " + (Join-Path $outDir 'openapi.yaml'))
Write-Host ("- " + (Join-Path $outDir 'postman-collection.json'))

