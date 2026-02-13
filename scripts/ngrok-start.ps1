#!/usr/bin/env pwsh
# ngrok Management Script for Delivery Gjilan Project
# Usage: .\scripts\ngrok-start.ps1 [api|all|customer|driver]

param(
    [Parameter(Position = 0)]
    [ValidateSet('api', 'all', 'customer', 'driver')]
    [string]$Mode = 'api',
    
    [switch]$KillExisting
)

# Colors for output
$Green = "`e[32m"
$Yellow = "`e[33m"
$Red = "`e[31m"
$Reset = "`e[0m"

Write-Host "${Green}🚀 ngrok Tunnel Manager${Reset}`n"

# Check if ngrok is installed
try {
    $ngrokVersion = ngrok version 2>&1
    Write-Host "${Green}✓ ngrok found: $ngrokVersion${Reset}"
}
catch {
    Write-Host "${Red}✗ ngrok not found. Install it first:${Reset}"
    Write-Host "  https://ngrok.com/download"
    exit 1
}

# Kill existing if requested
if ($KillExisting) {
    Write-Host "${Yellow}Stopping existing ngrok sessions...${Reset}"
    try {
        ngrok kill 2>&1 | Out-Null
        Start-Sleep -Seconds 2
        Write-Host "${Green}✓ Previous sessions stopped${Reset}`n"
    }
    catch {
        Write-Host "${Yellow}⚠ No existing sessions to kill${Reset}`n"
    }
}

Write-Host "${Yellow}Starting mode: $Mode${Reset}`n"

switch ($Mode) {
    'api' {
        Write-Host "Tunnel: API (4000)"
        Write-Host "${Green}→ Dashboard: http://localhost:4040${Reset}`n"
        ngrok start api
    }
    
    'all' {
        Write-Host "Tunnels: API (4000) + Metro Customer (8082) + Metro Driver (8083)"
        Write-Host "${Green}→ Dashboard: http://localhost:4040${Reset}`n"
        ngrok start --all
    }
    
    'customer' {
        Write-Host "Tunnel: Metro Customer (8082)"
        Write-Host "${Green}→ Dashboard: http://localhost:4040${Reset}`n"
        ngrok start metro-customer
    }
    
    'driver' {
        Write-Host "Tunnel: Metro Driver (8083)"
        Write-Host "${Green}→ Dashboard: http://localhost:4040${Reset}`n"
        ngrok start metro-driver
    }
}

Write-Host "`n${Green}Tunnel running!${Reset}"
Write-Host "Press Ctrl+C to stop"
