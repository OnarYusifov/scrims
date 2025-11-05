# Cleanup Windows Port Forwarding - Run in PowerShell as Admin

Write-Host "🧹 Cleaning up Windows port forwarding..." -ForegroundColor Yellow

# Remove port forwards
netsh interface portproxy delete v4tov4 listenport=3000 listenaddress=0.0.0.0 2>$null
netsh interface portproxy delete v4tov4 listenport=3001 listenaddress=0.0.0.0 2>$null

# Remove firewall rules (optional - comment out if you want to keep them)
Remove-NetFirewallRule -DisplayName "WSL2 Frontend" -ErrorAction SilentlyContinue
Remove-NetFirewallRule -DisplayName "WSL2 Backend" -ErrorAction SilentlyContinue

Write-Host "✅ Port forwarding cleaned up!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Verify cleanup:" -ForegroundColor Cyan
netsh interface portproxy show all

