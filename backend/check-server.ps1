# Check if server is running
Write-Host "Checking if server is running..." -ForegroundColor Cyan
Write-Host ""

try {
    $response = Invoke-WebRequest -Uri "http://localhost:3001/api/health" -Method GET -UseBasicParsing -TimeoutSec 3
    Write-Host "✓ Server is running!" -ForegroundColor Green
    Write-Host "Status Code: $($response.StatusCode)" -ForegroundColor White
    Write-Host "Response: $($response.Content)" -ForegroundColor Gray
} catch {
    Write-Host "✗ Server is not responding" -ForegroundColor Red
    Write-Host ""
    Write-Host "Make sure the server is started with: npm run dev" -ForegroundColor Yellow
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}
