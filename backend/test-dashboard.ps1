# Test Dashboard Endpoint
# First, you need to login and get a token, then use it here

$baseUrl = "http://localhost:3001"
$token = "YOUR_JWT_TOKEN_HERE"  # Replace with actual token after login

Write-Host "Testing Dashboard Endpoint..." -ForegroundColor Cyan
Write-Host ""

# Test health endpoint first
Write-Host "1. Testing Health Endpoint..." -ForegroundColor Yellow
try {
    $healthResponse = Invoke-WebRequest -Uri "$baseUrl/api/health" -Method GET -UseBasicParsing
    Write-Host "✓ Server is running!" -ForegroundColor Green
    Write-Host "Response: $($healthResponse.Content)" -ForegroundColor Gray
} catch {
    Write-Host "✗ Server is not running or not accessible" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    exit
}

Write-Host ""

# Test dashboard endpoint (requires authentication)
Write-Host "2. Testing Dashboard Endpoint..." -ForegroundColor Yellow
if ($token -eq "YOUR_JWT_TOKEN_HERE") {
    Write-Host "⚠ You need to login first to get a token!" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "To get a token, first login:" -ForegroundColor Cyan
    Write-Host "  POST $baseUrl/api/auth/login" -ForegroundColor Gray
    Write-Host "  Body: { `"email`": `"your-email@example.com`", `"password`": `"your-password`" }" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Then update the `$token variable in this script with the token from the response." -ForegroundColor Cyan
} else {
    try {
        $headers = @{
            "Authorization" = "Bearer $token"
            "Content-Type" = "application/json"
        }
        
        $dashboardResponse = Invoke-WebRequest -Uri "$baseUrl/api/dashboard" -Method GET -Headers $headers -UseBasicParsing
        $dashboardData = $dashboardResponse.Content | ConvertFrom-Json
        
        Write-Host "✓ Dashboard endpoint is working!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Modules found: $($dashboardData.modules.Count)" -ForegroundColor Cyan
        Write-Host ""
        
        foreach ($module in $dashboardData.modules) {
            Write-Host "  - $($module.name) ($($module.id))" -ForegroundColor White
            Write-Host "    Description: $($module.description)" -ForegroundColor Gray
            Write-Host "    Route: $($module.route)" -ForegroundColor Gray
            Write-Host "    Category: $($module.category)" -ForegroundColor Gray
            Write-Host ""
        }
        
        Write-Host "Modules by Category:" -ForegroundColor Cyan
        $dashboardData.modulesByCategory.PSObject.Properties | ForEach-Object {
            Write-Host "  $($_.Name): $($_.Value.Count) module(s)" -ForegroundColor White
        }
        
    } catch {
        Write-Host "✗ Dashboard endpoint failed" -ForegroundColor Red
        Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
        if ($_.Exception.Response) {
            $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
            $responseBody = $reader.ReadToEnd()
            Write-Host "Response: $responseBody" -ForegroundColor Red
        }
    }
}

Write-Host ""
Write-Host "3. Testing Fibre Products Endpoint (requires auth)..." -ForegroundColor Yellow
if ($token -ne "YOUR_JWT_TOKEN_HERE") {
    try {
        $headers = @{
            "Authorization" = "Bearer $token"
            "Content-Type" = "application/json"
        }
        
        $productsResponse = Invoke-WebRequest -Uri "$baseUrl/api/fibre-products" -Method GET -Headers $headers -UseBasicParsing
        $productsData = $productsResponse.Content | ConvertFrom-Json
        
        Write-Host "✓ Fibre Products endpoint is working!" -ForegroundColor Green
        Write-Host "Products found: $($productsData.products.Count)" -ForegroundColor Cyan
    } catch {
        Write-Host "✗ Fibre Products endpoint failed" -ForegroundColor Red
        Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    }
}
