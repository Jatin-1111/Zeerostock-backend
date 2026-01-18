# PowerShell Script to Set Environment Variables to AWS Elastic Beanstalk
# Usage: .\scripts\set-eb-env.ps1 -EnvironmentName "your-eb-environment-name"

param(
    [Parameter(Mandatory=$true)]
    [string]$EnvironmentName,
    
    [Parameter(Mandatory=$false)]
    [string]$ApplicationName = "zeerostock-backend",
    
    [Parameter(Mandatory=$false)]
    [string]$EnvFile = ".env"
)

Write-Host "Setting environment variables to Elastic Beanstalk environment: $EnvironmentName" -ForegroundColor Green

# Check if AWS CLI is installed
try {
    aws --version | Out-Null
} catch {
    Write-Host "Error: AWS CLI is not installed. Please install it first." -ForegroundColor Red
    Write-Host "Visit: https://aws.amazon.com/cli/" -ForegroundColor Yellow
    exit 1
}

# Check if .env file exists
if (-not (Test-Path $EnvFile)) {
    Write-Host "Error: $EnvFile file not found!" -ForegroundColor Red
    exit 1
}

# Read .env file and create option settings
$envVars = Get-Content $EnvFile | Where-Object {
    $_.Trim() -ne "" -and -not $_.StartsWith("#")
}

$optionSettings = @()

foreach ($line in $envVars) {
    if ($line -match "^([^=]+)=(.*)$") {
        $key = $matches[1].Trim()
        $value = $matches[2].Trim()
        
        # Remove quotes if present
        $value = $value -replace '^["'']|["'']$', ''
        
        # Escape special characters for JSON
        $value = $value -replace '\\', '\\'
        $value = $value -replace '"', '\"'
        
        $optionSettings += @{
            Namespace = "aws:elasticbeanstalk:application:environment"
            OptionName = $key
            Value = $value
        }
        
        Write-Host "  Adding: $key" -ForegroundColor Cyan
    }
}

if ($optionSettings.Count -eq 0) {
    Write-Host "No environment variables found in $EnvFile" -ForegroundColor Yellow
    exit 0
}

Write-Host "`nTotal variables to set: $($optionSettings.Count)" -ForegroundColor Green
Write-Host "`nUploading to Elastic Beanstalk..." -ForegroundColor Yellow

# Set environment variables using AWS CLI with JSON
try {
    # Convert to JSON (not compressed for better compatibility)
    $jsonSettings = $optionSettings | ConvertTo-Json -Depth 10
    
    # Create temporary file for JSON
    $tempFile = Join-Path $env:TEMP "eb-env-settings.json"
    
    # Write JSON without BOM
    [System.IO.File]::WriteAllText($tempFile, $jsonSettings, [System.Text.UTF8Encoding]($false))
    
    Write-Host "`nJSON file created at: $tempFile" -ForegroundColor Gray
    
    # Convert Windows path to proper format for AWS CLI
    $tempFileUri = $tempFile -replace '\\', '/'
    
    # Update environment using JSON file
    Write-Host "Running: aws elasticbeanstalk update-environment --environment-name $EnvironmentName --option-settings file://$tempFileUri" -ForegroundColor Gray
    
    $output = aws elasticbeanstalk update-environment `
        --environment-name $EnvironmentName `
        --option-settings "file://$tempFileUri" 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`nSuccess! Environment variables have been set." -ForegroundColor Green
        Write-Host "Note: The environment will restart to apply changes." -ForegroundColor Yellow
        Write-Host "`nResponse:" -ForegroundColor Gray
        Write-Host $output
    } else {
        Write-Host "`nError occurred:" -ForegroundColor Red
        Write-Host $output
        Write-Host "`nJSON content:" -ForegroundColor Yellow
        Get-Content $tempFile
        exit 1
    }
    
    # Remove temp file
    if (Test-Path $tempFile) {
        Remove-Item $tempFile -Force
    }
    
} catch {
    Write-Host "`nError setting environment variables: $_" -ForegroundColor Red
    if (Test-Path $tempFile) {
        Write-Host "`nJSON content:" -ForegroundColor Yellow
        Get-Content $tempFile
        Remove-Item $tempFile -Force
    }
    exit 1
}

Write-Host "`nDone!" -ForegroundColor Green
