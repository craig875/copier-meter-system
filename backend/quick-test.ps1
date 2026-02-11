# Quick Test Script - Login and View Dashboard
$baseUrl = "http://localhost:3001"

Write-Host "=== Quick Dashboard Test ===" -ForegroundColor Cyan
Write-Host ""

# Test credentials from seed file
$email = "admin@example.com"
$password = "admin123"

Write-Host "1. Logging in as admin..." -ForegroundColor Yellow
$loginBody = @{
    email = $email
    password = $password
} | ConvertTo-Json

try {
    $loginResponse = Invoke-WebRequest -Uri "$baseUrl/api/auth/login" -Method POST -Body $loginBody -ContentType "application/json" -UseBasicParsing
    $loginData = $loginResponse.Content | ConvertFrom-Json
    $token = $loginData.token
    
    Write-Host "✓ Login successful!" -ForegroundColor Green
    Write-Host "  User: $($loginData.user.name) ($($loginData.user.role))" -ForegroundColor Gray
    Write-Host ""
    
    Write-Host "2. Fetching dashboard..." -ForegroundColor Yellow
    $headers = @{
        "Authorization" = "Bearer $token"
    }
    
    $dashboardResponse = Invoke-WebRequest -Uri "$baseUrl/api/dashboard" -Method GET -Headers $headers -UseBasicParsing
    $dashboardData = $dashboardResponse.Content | ConvertFrom-Json
    
    Write-Host "✓ Dashboard loaded!" -ForegroundColor Green
    Write-Host ""
    Write-Host "=== Available Modules ===" -ForegroundColor Cyan
    Write-Host ""
    
    foreach ($module in $dashboardData.modules) {
        Write-Host "📦 $($module.name)" -ForegroundColor White
        Write-Host "   ID: $($module.id)" -ForegroundColor Gray
        Write-Host "   Description: $($module.description)" -ForegroundColor Gray
        Write-Host "   Route: $($module.route)" -ForegroundColor Gray
        Write-Host "   Category: $($module.category)" -ForegroundColor Gray
        Write-Host ""
    }
    
    Write-Host "=== Modules by Category ===" -ForegroundColor Cyan
    $dashboardData.modulesByCategory.PSObject.Properties | ForEach-Object {
        Write-Host "$($_.Name): $($_.Value.Count) module(s)" -ForegroundColor White
    }
    
    Write-Host ""
    Write-Host "=== Full JSON Response ===" -ForegroundColor Cyan
    $dashboardData | ConvertTo-Json -Depth 10
    
} catch {
    Write-Host "✗ Error occurred" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response: $responseBody" -ForegroundColor Red
    }
}
