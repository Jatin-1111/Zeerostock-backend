# AWS Elastic Beanstalk Environment Setup Script (Windows)
# Run this after creating your EB environment

Write-Host "🚀 Setting up AWS Elastic Beanstalk Environment..." -ForegroundColor Green

# Check if EB CLI is installed
if (!(Get-Command eb -ErrorAction SilentlyContinue)) {
    Write-Host "❌ EB CLI not found. Install it with: pip install awsebcli" -ForegroundColor Red
    exit 1
}

# Environment name
$ENV_NAME = "Zeerostock-Backend-env"

Write-Host "Setting environment variables for $ENV_NAME..." -ForegroundColor Yellow

# Set ALL environment variables from your .env file
# Note: AWS keys are excluded - use IAM instance role instead
eb setenv `
    NODE_ENV=production `
    PORT=8080 `
    FRONTEND_URL=https://zeerostock.com `
    ADMIN_PANEL_URL=https://zeerostock.com/admin-panel/login `
    SUPABASE_URL=https://slqqxswruudranyetgpr.supabase.co `
    SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNscXF4c3dydXVkcmFueWV0Z3ByIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0NTQwMTAsImV4cCI6MjA4MTAzMDAxMH0.lJDVySKLtXDeM93ZGMd4H4ltX5ot_fEJOTIcU85sKdU `
    SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNscXF4c3dydXVkcmFueWV0Z3ByIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTQ1NDAxMCwiZXhwIjoyMDgxMDMwMDEwfQ.Bj9kGK-ik_JCRKsFaeH5l_CYomDoBOXiEHSFNdZ5bqM `
    DATABASE_URL=postgresql://postgres.slqqxswruudranyetgpr:2RX0m1QaI2QFtwYO@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres `
    JWT_ACCESS_SECRET='$2y$10$AyUbVM2G0.ABf5xkZgP1JeS13to7mafRUU.8n4qDjamDye3gCeUoS' `
    JWT_REFRESH_SECRET='$2y$10$eRNMzn6cA6qHdJOkGm2UB.wwi.KKH7eAjfvthu0H4SBe0i0C6ffAW' `
    JWT_ACCESS_EXPIRY=24h `
    JWT_REFRESH_EXPIRY=7d `
    RESET_TOKEN_EXPIRY=15m `
    OTP_EXPIRY_MINUTES=10 `
    OTP_LENGTH=6 `
    SMTP_HOST=smtpout.secureserver.net `
    SMTP_PORT=465 `
    SMTP_SECURE=true `
    SMTP_USER=contact@zeerostock.com `
    SMTP_PASS=Transact@368 `
    EMAIL_FROM=contact@zeerostock.com `
    RATE_LIMIT_WINDOW_MS=900000 `
    RATE_LIMIT_MAX_REQUESTS=5 `
    BCRYPT_SALT_ROUNDS=12 `
    AWS_REGION=ap-south-1 `
    AWS_ASSETS_BUCKET_NAME=zeerostock-assets `
    AWS_VERIFICATION_BUCKET_NAME=zeerostock-verification-documents `
    AWS_PRODUCTS_BUCKET_NAME=zeerostock-products `
    --environment $ENV_NAME

Write-Host ""
Write-Host "✅ All environment variables configured!" -ForegroundColor Green
Write-Host ""
Write-Host "⚠️  SECURITY NOTES:" -ForegroundColor Yellow
Write-Host "   ✅ AWS credentials NOT set - using IAM instance role (recommended)"
Write-Host "   ✅ All Supabase, JWT, and email credentials configured"
Write-Host "   ✅ Ready for production deployment!"
Write-Host ""
Write-Host "📝 Next Steps:" -ForegroundColor Cyan
Write-Host "   1. Ensure IAM role 'aws-elasticbeanstalk-ec2-role' has S3 permissions"
Write-Host "   2. Verify certificate ARN in .ebextensions/00-options.config"
Write-Host "   3. Deploy: eb deploy"
Write-Host ""
Write-Host "💡 For S3 access, use IAM instance role instead of AWS keys!" -ForegroundColor Cyan
Write-Host "   Attach policy: AmazonS3FullAccess to aws-elasticbeanstalk-ec2-role"
Write-Host ""
Write-Host "🎉 Setup complete! Deploy with: eb deploy" -ForegroundColor Green
