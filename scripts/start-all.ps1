$root = Split-Path -Parent $PSScriptRoot

$apiPath = Join-Path $root 'api'
$adminPath = Join-Path $root 'admin-panel'
$customerPath = Join-Path $root 'mobile-customer'
$driverPath = Join-Path $root 'mobile-driver'

Start-Process -FilePath 'powershell' -ArgumentList '-NoExit', '-Command', "Set-Location '$apiPath'; npm run dev"
Start-Process -FilePath 'powershell' -ArgumentList '-NoExit', '-Command', "Set-Location '$adminPath'; npm run dev"
Start-Process -FilePath 'powershell' -ArgumentList '-NoExit', '-Command', "Set-Location '$customerPath'; npm start"
Start-Process -FilePath 'powershell' -ArgumentList '-NoExit', '-Command', "Set-Location '$driverPath'; npm start"
Start-Process -FilePath 'powershell' -ArgumentList '-NoExit', '-Command', 'ngrok http 4000'
