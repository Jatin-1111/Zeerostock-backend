# Elastic Beanstalk Environment Variables Management

This folder contains scripts to help you manage environment variables for your AWS Elastic Beanstalk deployment.

## Prerequisites

1. **AWS CLI** installed and configured:

   ```bash
   # Install AWS CLI
   # Windows: Download from https://aws.amazon.com/cli/
   # Mac: brew install awscli
   # Linux: sudo apt-get install awscli

   # Configure AWS credentials
   aws configure
   ```

2. **AWS Credentials** with appropriate permissions:
   - `elasticbeanstalk:UpdateEnvironment`
   - `elasticbeanstalk:DescribeConfigurationSettings`

## Available Scripts

### 1. PowerShell Script (Windows)

```powershell
# Set all variables from .env file
.\scripts\set-eb-env.ps1 -EnvironmentName "your-eb-environment-name"

# Specify custom .env file
.\scripts\set-eb-env.ps1 -EnvironmentName "zeerostock-backend-prod" -EnvFile ".env.production"

# Specify custom application name
.\scripts\set-eb-env.ps1 -EnvironmentName "zeerostock-backend-prod" -ApplicationName "my-app"
```

### 2. Bash Script (Linux/Mac)

```bash
# Make script executable
chmod +x scripts/set-eb-env.sh

# Set all variables from .env file
./scripts/set-eb-env.sh your-eb-environment-name

# Specify custom application and env file
./scripts/set-eb-env.sh zeerostock-backend-prod zeerostock-backend .env.production
```

### 3. JSON-based Bash Script (Better for special characters)

```bash
# Make script executable
chmod +x scripts/set-eb-env-json.sh

# Set all variables using JSON format (better for complex values)
./scripts/set-eb-env-json.sh your-eb-environment-name

# Specify custom env file
./scripts/set-eb-env-json.sh zeerostock-backend-prod .env.production
```

### 4. Node.js Script (Cross-platform)

First, install the required dependency:

```bash
npm install @aws-sdk/client-elastic-beanstalk
```

Then use the script:

```bash
# Set environment variables
node scripts/eb-env-manager.js set your-eb-environment-name

# Set from custom file
node scripts/eb-env-manager.js set your-eb-environment-name --file .env.production

# Get current environment variables
node scripts/eb-env-manager.js get your-eb-environment-name

# Delete specific variables
node scripts/eb-env-manager.js delete your-eb-environment-name JWT_SECRET NODE_ENV
```

## Quick Start Guide

### Step 1: Find Your EB Environment Name

```bash
# List all EB environments
aws elasticbeanstalk describe-environments --query "Environments[*].[EnvironmentName,Status]" --output table
```

### Step 2: Choose a Script

For **Windows PowerShell**:

```powershell
.\scripts\set-eb-env.ps1 -EnvironmentName "zeerostock-backend-prod"
```

For **Linux/Mac**:

```bash
chmod +x scripts/set-eb-env-json.sh
./scripts/set-eb-env-json.sh zeerostock-backend-prod
```

For **Node.js** (Cross-platform):

```bash
npm install @aws-sdk/client-elastic-beanstalk
node scripts/eb-env-manager.js set zeerostock-backend-prod
```

### Step 3: Verify

After running the script, verify the variables were set:

```bash
# Using AWS CLI
aws elasticbeanstalk describe-configuration-settings \
  --environment-name your-eb-environment-name \
  --query "ConfigurationSettings[0].OptionSettings[?Namespace=='aws:elasticbeanstalk:application:environment']"

# Using Node.js script
node scripts/eb-env-manager.js get your-eb-environment-name
```

## Important Notes

1. **Environment Restart**: EB will restart your environment to apply changes. This may cause brief downtime.

2. **Sensitive Data**: Never commit `.env` files with production secrets to Git. Use `.gitignore`.

3. **AWS Region**: Make sure your AWS CLI is configured for the correct region:

   ```bash
   aws configure get region
   ```

4. **Permissions**: Ensure your IAM user/role has the necessary EB permissions.

5. **Backup**: Always backup your current environment variables before making changes:
   ```bash
   aws elasticbeanstalk describe-configuration-settings \
     --environment-name your-env > eb-config-backup.json
   ```

## Troubleshooting

### Error: "Environment not found"

- Check environment name: `aws elasticbeanstalk describe-environments`
- Verify AWS region is correct

### Error: "Access Denied"

- Check IAM permissions
- Ensure AWS credentials are properly configured

### Error: "Invalid option value"

- Some characters need escaping (use JSON script for complex values)
- Check for multiline values in .env file

## Best Practices

1. **Use different .env files** for different environments:
   - `.env.development`
   - `.env.staging`
   - `.env.production`

2. **Version Control**: Keep a template file:

   ```bash
   # Create .env.example without sensitive values
   cp .env .env.example
   # Remove actual secrets from .env.example
   ```

3. **Gradual Rollout**: Test on staging environment first:

   ```bash
   node scripts/eb-env-manager.js set zeerostock-backend-staging
   # Test thoroughly
   node scripts/eb-env-manager.js set zeerostock-backend-prod
   ```

4. **Documentation**: Document all environment variables in your README or wiki.

## Alternative: Using EB CLI

You can also use the EB CLI for interactive management:

```bash
# Install EB CLI
pip install awsebcli

# Initialize
eb init

# Set single variable
eb setenv DATABASE_URL=postgresql://...

# Set multiple variables
eb setenv VAR1=value1 VAR2=value2 VAR3=value3

# Print current variables
eb printenv
```

## Support

For issues or questions:

- Check AWS EB documentation: https://docs.aws.amazon.com/elasticbeanstalk/
- Review CloudWatch logs for deployment errors
- Contact your AWS administrator for permission issues
