# Start Development Environment for IT Helpdesk Ticketing System

# Ensure we are in the project root directory
$ProjectRoot = Resolve-Path .

Write-Host "🚀 Starting Docker containers (PostgreSQL, Redis, MailHog)..." -ForegroundColor Cyan
docker compose up -d

Write-Host "⏳ Waiting for database to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Start backend in a new PowerShell window
Write-Host "🖥️ Launching Backend Server on port 3001..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$ProjectRoot\backend'; npm run start"

# Start frontend in a new PowerShell window
Write-Host "🖥️ Launching Frontend Server on port 3000..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$ProjectRoot\frontend'; npm run dev"

Write-Host "🎉 Development environment starting!" -ForegroundColor Green
Write-Host "   - Backend API: http://localhost:3001/api" -ForegroundColor Green
Write-Host "   - Frontend UI: http://localhost:3000" -ForegroundColor Green
Write-Host "   - MailHog UI: http://localhost:8025" -ForegroundColor Green
