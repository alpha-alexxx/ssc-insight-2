<#
.SYNOPSIS
  Create the project-local graphify environment (Python 3.13 + graphifyy) if it is missing.

.DESCRIPTION
  The upstream graphify CLI installs as the `graphifyy` package. This repo keeps its
  interpreter inside .graphify-venv/ instead of a global uv tool, because the global
  uv tool env is tied to a Python version that may be upgraded out from under it.
  Re-running is safe; uv skips packages that are already installed.
#>
$ErrorActionPreference = 'Stop'

$repo = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$venv = Join-Path $repo '.graphify-venv'
$python = Join-Path $venv 'Scripts\python.exe'

if (-not $env:UV_CACHE_DIR) { $env:UV_CACHE_DIR = Join-Path $repo '.uv-cache' }

if (-not (Test-Path $python)) {
    $candidate = 'C:\Users\ankit\AppData\Roaming\uv\python\cpython-3.13-windows-x86_64-none\python.exe'
    if (Test-Path $candidate) {
        uv venv $venv --python $candidate
    } else {
        uv venv $venv --python 3.13
    }
    if ($LASTEXITCODE -ne 0) { throw 'uv venv failed' }
}

uv pip install --python $python 'graphifyy[sql]'
if ($LASTEXITCODE -ne 0) { throw 'uv pip install graphifyy failed' }

& $python -c "import graphify; print('graphify ready')"
if ($LASTEXITCODE -ne 0) { throw 'graphify import failed' }
