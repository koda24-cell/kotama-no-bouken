# Local-only safety gate for the two author-supplied Blender files. Never upload originals.
param(
  [Parameter(Mandatory=$true)][string]$BlenderExe,
  [Parameter(Mandatory=$true)][string]$ClamScanExe,
  [Parameter(Mandatory=$true)][string]$SourceDir,
  [Parameter(Mandatory=$true)][string]$OutputDir
)
$ErrorActionPreference='Stop'
New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null
$expected = @{
 'Lassyla_Material.blend'='ecda84d13cf48e98e571d434cba4dc49d30f01aeaabc93e118fa7fed1ec4d2c0'
 'Palm_Tree_Demo.blend'='da01d11a6ad24032bcc63e48cc2f0e8c9dc068f4e7a56bd7176aaebf1de7d44e'
}
foreach($exe in @($BlenderExe,$ClamScanExe)) { if (!(Test-Path -LiteralPath $exe -PathType Leaf)) {throw "Missing executable: $exe"} }
foreach ($name in $expected.Keys) {
 $source=Join-Path $SourceDir $name
 if (!(Test-Path -LiteralPath $source -PathType Leaf)) {throw "Missing source: $name"}
 $hash=(Get-FileHash -Algorithm SHA256 -LiteralPath $source).Hash.ToLowerInvariant()
 if ($hash -ne $expected[$name]) {throw "SHA256 mismatch: $name"}
 & $ClamScanExe --no-summary -- $source
 if ($LASTEXITCODE -ne 0) {throw "ClamAV did not pass: $name"}
 $target=Join-Path $OutputDir ([IO.Path]::GetFileNameWithoutExtension($name))
 New-Item -ItemType Directory -Force -Path $target | Out-Null
 $env:AUDIT_OUTPUT_DIR=$target
 & $BlenderExe --background --factory-startup --disable-autoexec $source --python (Join-Path $PSScriptRoot 'inspect_original_blend.py')
 if ($LASTEXITCODE -ne 0 -or !(Test-Path (Join-Path $target 'inspection.json'))) {throw "Blender inspection failed: $name"}
}
Write-Host 'ClamAV and Blender inspection passed for both originals. Rendering not performed.'
