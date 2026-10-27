#Requires -Version 5.1
<#
  20004 Edition - Windows offline storage migration
  Example: powershell -ExecutionPolicy Bypass -File .\scripts\migrate-data-windows.ps1 -Destination "D:\PromaData"
  Run only after closing Proma. Copies and validates; NEVER deletes the source.
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)][string]$Destination,
  [string]$ElectronSource = "",
  [switch]$Force
)
$ErrorActionPreference = 'Stop'
function Fail([string]$message) { throw "[Proma migration] $message" }
if (Get-Process -Name 'Proma','proma','electron' -ErrorAction SilentlyContinue | Where-Object { $_.Path -match 'proma|Proma' }) {
  Fail 'Proma 正在运行。请从托盘完全退出后重新执行，不能在线复制数据库。'
}
$dst = [System.IO.Path]::GetFullPath($Destination)
if (-not [System.IO.Path]::IsPathRooted($Destination)) { Fail '必须指定绝对路径，例如 D:\PromaData' }
if ($dst -match '^[Cc]:\\') { Fail '请选择非 C 盘的目标目录' }
$srcConfig = Join-Path $env:USERPROFILE '.proma'
if (-not (Test-Path -LiteralPath $srcConfig -PathType Container)) { Fail "找不到原始数据目录 $srcConfig" }
$srcConfigFull = [System.IO.Path]::GetFullPath($srcConfig).TrimEnd('\')
if ($dst.StartsWith(($srcConfigFull + '\'),[StringComparison]::OrdinalIgnoreCase)) { Fail '目标不能在原始数据目录内' }
if ([string]::IsNullOrWhiteSpace($ElectronSource)) {
  $choices = @((Join-Path $env:APPDATA 'Proma'),(Join-Path $env:APPDATA 'proma'),(Join-Path $env:APPDATA '@proma\electron'))
  $found = @($choices | Where-Object { Test-Path -LiteralPath $_ -PathType Container })
  if ($found.Count -gt 1) { Fail "检测到多个 Electron 数据目录，请使用 -ElectronSource 显式指定：$($found -join '; ')" }
  if ($found.Count -eq 1) { $ElectronSource = $found[0] }
}
if (-not $ElectronSource -or -not (Test-Path -LiteralPath $ElectronSource -PathType Container)) {
  Fail '无法可靠确定 Chromium/Electron 数据源目录。请用 -ElectronSource 指定完整旧目录，以免遗漏浏览器数据。'
}
$dstConfig = Join-Path $dst 'proma'
$dstElectron = Join-Path $dst 'electron'
if ((Test-Path -LiteralPath $dstConfig) -or (Test-Path -LiteralPath $dstElectron)) {
  if (-not $Force) { Fail '目标目录已含 proma 或 electron，请选择空目录；仅确认需覆盖时使用 -Force' }
}
New-Item -ItemType Directory -Force -Path $dst | Out-Null
$drive = [System.IO.Path]::GetPathRoot($dst)
$free = (Get-PSDrive -Name $drive.Substring(0,1)).Free
$sourceBytes = (Get-ChildItem -LiteralPath $srcConfig,$ElectronSource -File -Recurse -Force | Measure-Object -Property Length -Sum).Sum
if ($free -lt ($sourceBytes * 1.15)) { Fail "目标空间不足。源数据约 $sourceBytes 字节，建议至少预留 115%。" }
function Copy-Checked([string]$source,[string]$target) {
  New-Item -ItemType Directory -Force -Path $target | Out-Null
  & robocopy.exe $source $target /E /COPY:DAT /DCOPY:DAT /R:1 /W:1 /XJ /NFL /NDL /NP | Out-Null
  if ($LASTEXITCODE -ge 8) { Fail "复制失败：$source (robocopy=$LASTEXITCODE)" }
  $files = @(Get-ChildItem -LiteralPath $source -Recurse -File -Force)
  foreach ($f in $files) {
    $relative = $f.FullName.Substring($source.TrimEnd('\').Length).TrimStart('\')
    $out = Join-Path $target $relative
    if (-not (Test-Path -LiteralPath $out -PathType Leaf)) { Fail "目标缺少文件：$relative" }
    $destFile = Get-Item -LiteralPath $out
    if ($f.Length -ne $destFile.Length) { Fail "文件大小不一致：$relative" }
    if ((Get-FileHash -LiteralPath $f.FullName -Algorithm SHA256).Hash -ne (Get-FileHash -LiteralPath $out -Algorithm SHA256).Hash) {
      Fail "哈希校验失败：$relative"
    }
  }
  Write-Host "校验完成: $($files.Count) files, $target"
}
Copy-Checked $srcConfig $dstConfig
Copy-Checked $ElectronSource $dstElectron
$pointerDir = Join-Path $env:APPDATA 'Proma-20004'
New-Item -ItemType Directory -Force -Path $pointerDir | Out-Null
$pointer = Join-Path $pointerDir 'data-location.json'
$tmp = "$pointer.tmp"
@{ dataRoot = $dst; schemaVersion = 1 } | ConvertTo-Json | Set-Content -LiteralPath $tmp -Encoding UTF8
Move-Item -LiteralPath $tmp -Destination $pointer -Force
Write-Host "迁移成功：$dst"
Write-Host "原数据已保留；先运行新版 Proma 验证对话、附件、账号与浏览器，确认后再手动清理旧数据。"
