# Local portable MariaDB (MySQL-compatible) used by the sadra backend.
# No admin/service required. Safe to run repeatedly.
#
#   powershell -ExecutionPolicy Bypass -File scripts/db.ps1          # start
#   powershell -ExecutionPolicy Bypass -File scripts/db.ps1 -Stop    # stop
#   powershell -ExecutionPolicy Bypass -File scripts/db.ps1 -Status  # status
#
# Override defaults with env vars if your install lives elsewhere:
#   SADRA_MARIADB_HOME, SADRA_MYSQL_DATADIR, MYSQL_PORT
param([switch]$Stop, [switch]$Status)

$ErrorActionPreference = 'Stop'

$mariaHome = if ($env:SADRA_MARIADB_HOME) { $env:SADRA_MARIADB_HOME } else { 'C:\Users\Sadra\AppData\Local\mariadb\mariadb-11.4.5-winx64' }
$dataDir = if ($env:SADRA_MYSQL_DATADIR) { $env:SADRA_MYSQL_DATADIR } else { 'C:\Users\Sadra\AppData\Local\mariadb\data' }
$port = if ($env:MYSQL_PORT) { $env:MYSQL_PORT } else { '3306' }

$daemon = Join-Path $mariaHome 'bin\mariadbd.exe'
$admin = Join-Path $mariaHome 'bin\mariadb-admin.exe'

function Test-DbPort {
  Test-NetConnection -ComputerName 127.0.0.1 -Port $port -InformationLevel Quiet -WarningAction SilentlyContinue
}

if ($Status) {
  if (Test-DbPort) { Write-Output "MariaDB is running on port $port" } else { Write-Output "MariaDB is NOT running on port $port" }
  exit 0
}

if ($Stop) {
  if (-not (Test-DbPort)) { Write-Output "MariaDB is not running on port $port"; exit 0 }
  & $admin --host=127.0.0.1 --port=$port --user=root shutdown
  Write-Output 'MariaDB stopped.'
  exit 0
}

if (Test-DbPort) {
  Write-Output "MariaDB already running on port $port"
  exit 0
}

if (-not (Test-Path $daemon)) { throw "mariadbd.exe not found at: $daemon (set SADRA_MARIADB_HOME)" }

Write-Output "Starting MariaDB (datadir: $dataDir)..."
Start-Process -FilePath $daemon -ArgumentList "--datadir=$dataDir", "--port=$port", '--bind-address=127.0.0.1' -WindowStyle Hidden

for ($i = 0; $i -lt 30; $i++) {
  Start-Sleep -Milliseconds 500
  if (Test-DbPort) { Write-Output "MariaDB is ready on port $port"; exit 0 }
}

throw "MariaDB did not become ready on port $port within 15s."
