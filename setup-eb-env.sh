#!/bin/bash

# AWS Elastic Beanstalk Environment Setup Script
# Run this after creating your EB environment

echo "🚀 Setting up AWS Elastic Beanstalk Environment..."

# Check if EB CLI is installed
if ! command -v eb &> /dev/null; then
    echo "❌ EB CLI not found. Install it with: pip install awsebcli"
    exit 1
fi

# Environment name
ENV_NAME="Zeerostock-Backend-env"

echo "Setting environment variables for $ENV_NAME..."

# Set ALL environment variables from your .env file
# Note: AWS keys are excluded - use IAM instance role instead
eb setenv \
  NODE_ENV=production \
  PORT=8080 \
  FRONTEND_URL=https://zeerostock.com \
  ADMIN_PANEL_URL=https://zeerostock.com/admin-panel/login \
  SUPABASE_URL=https://slqqxswruudranyetgpr.supabase.co \
  SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNscXF4c3dydXVkcmFueWV0Z3ByIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU0NTQwMTAsImV4cCI6MjA4MTAzMDAxMH0.lJDVySKLtXDeM93ZGMd4H4ltX5ot_fEJOTIcU85sKdU \
  SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNscXF4c3dydXVkcmFueWV0Z3ByIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NTQ1NDAxMCwiZXhwIjoyMDgxMDMwMDEwfQ.Bj9kGK-ik_JCRKsFaeH5l_CYomDoBOXiEHSFNdZ5bqM \
  DATABASE_URL=postgresql://postgres.slqqxswruudranyetgpr:2RX0m1QaI2QFtwYO@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres \
  JWT_ACCESS_SECRET='$2y$10$AyUbVM2G0.ABf5xkZgP1JeS13to7mafRUU.8n4qDjamDye3gCeUoS' \
  JWT_REFRESH_SECRET='$2y$10$eRNMzn6cA6qHdJOkGm2UB.wwi.KKH7eAjfvthu0H4SBe0i0C6ffAW' \
  JWT_ACCESS_EXPIRY=24h \
  JWT_REFRESH_EXPIRY=7d \
  RESET_TOKEN_EXPIRY=15m \
  OTP_EXPIRY_MINUTES=10 \
  OTP_LENGTH=6 \
  SMTP_HOST=smtpout.secureserver.net \
  SMTP_PORT=465 \
  SMTP_SECURE=true \
  SMTP_USER=contact@zeerostock.com \
  SMTP_PASS=Transact@368 \
  EMAIL_FROM=contact@zeerostock.com \
  RATE_LIMIT_WINDOW_MS=900000 \
  RATE_LIMIT_MAX_REQUESTS=5 \
  BCRYPT_SALT_ROUNDS=12 \
  AWS_REGION=ap-south-1 \
  AWS_ASSETS_BUCKET_NAME=zeerostock-assets \
  AWS_VERIFICATION_BUCKET_NAME=zeerostock-verification-documents \
  AWS_PRODUCTS_BUCKET_NAME=zeerostock-products \
  --environment $ENV_NAME

echo "✅ All environment variables configured!"
echo ""
echo "⚠️  SECURITY NOTES:"
echo "   ✅ AWS credentials NOT set - using IAM instance role (recommended)"
echo "   ✅ All Supabase, JWT, and email credentials configured"
echo "   ✅ Ready for production deployment!"
echo ""
echo "📝 Next Steps:"
echo "   1. Ensure IAM role 'aws-elasticbeanstalk-ec2-role' has S3 permissions"
echo "   2. Verify certificate ARN in .ebextensions/00-options.config"
echo "   3. Deploy: eb deploy"
echo ""
echo "💡 For S3 access, use IAM instance role instead of AWS keys!"
echo "   Attach policy: AmazonS3FullAccess to aws-elasticbeanstalk-ec2-role"
echo ""
echo "🎉 Setup complete! Deploy with: eb deploy"
