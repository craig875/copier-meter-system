# Quick Login Test Script
$baseUrl = "http://localhost:3001"

Write-Host "Login Test Script" -ForegroundColor Cyan
Write-Host "=================" -ForegroundColor Cyan
Write-Host ""

# You'll need to provide your credentials
$email = Read-Host "Enter your email"
$password = Read-Host "Enter your password" -AsSecureString
$plainPassword = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($password)
)

$body = @{
    email = $email
    password = $plainPassword
} | ConvertTo-Json

Write-Host ""
Write-Host "Attempting login..." -ForegroundColor Yellow

try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/auth/login" -Method POST -Body $body -ContentType "application/json" -UseBasicParsing
    $responseData = $response.Content | ConvertFrom-Json
    
    Write-Host "✓ Login successful!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Token (save this for testing):" -ForegroundColor Cyan
    Write-Host $responseData.token -ForegroundColor White
    Write-Host ""
    Write-Host "User Info:" -ForegroundColor Cyan
    Write-Host "  Name: $($responseData.user.name)" -ForegroundColor White
    Write-Host "  Email: $($responseData.user.email)" -ForegroundColor White
    Write-Host "  Role: $($responseData.user.role)" -ForegroundColor White
    Write-Host ""
    Write-Host "Now update test-dashboard.ps1 with this token and run it!" -ForegroundColor Yellow
    
} catch {
    Write-Host "✗ Login failed" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response: $responseBody" -ForegroundColor Red
    }
}
