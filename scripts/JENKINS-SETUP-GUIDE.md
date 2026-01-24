# Jenkins CI/CD Setup Guide for Zeerostock EB Deployment

## Overview
This guide helps set up Jenkins for automated deployment to AWS Elastic Beanstalk with Application Load Balancer (ALB) and HTTPS support.

## Prerequisites

### Required Tools
- Jenkins 2.361+ with Git plugin
- AWS EB CLI v3.20+
- Node.js 24.6.0
- npm 11.5.1
- AWS Account with EB environments and ACM certificate configured

### AWS Setup
- **ACM Certificate**: Must be created in `ap-south-1` region
  - Note down the Certificate ARN: `arn:aws:acm:ap-south-1:ACCOUNT_ID:certificate/CERTIFICATE_ID`
- **EB Environments**: 
  - `zeerostock-staging` (optional, can be created via Jenkins)
  - `zeerostock-prod` (must exist)
- **IAM Roles**: 
  - `aws-elasticbeanstalk-ec2-role` (for EC2 instances)
  - `aws-elasticbeanstalk-service-role` (for EB service)

## Step 1: Configure Jenkins Credentials

### 1.1 AWS Credentials
1. Jenkins Dashboard → **Manage Jenkins** → **Manage Credentials**
2. Click **Add Credentials** → **Global**
3. Kind: **AWS Credentials**
4. ID: `aws-credentials`
5. Access Key ID: `YOUR_AWS_ACCESS_KEY`
6. Secret Access Key: `YOUR_AWS_SECRET_KEY`
7. Click **Create**

### 1.2 ACM Certificate ARN
1. Click **Add Credentials** → **Global**
2. Kind: **Secret text**
3. ID: `acm-certificate-arn`
4. Secret: `arn:aws:acm:ap-south-1:ACCOUNT_ID:certificate/CERTIFICATE_ID`
5. Click **Create**

### 1.3 AWS Region
1. Click **Add Credentials** → **Global**
2. Kind: **Secret text**
3. ID: `aws-region`
4. Secret: `ap-south-1`
5. Click **Create**

### 1.4 Environment-Specific .env Files

#### For Staging
1. Click **Add Credentials** → **Global**
2. Kind: **Secret file**
3. ID: `zeerostock-staging-env`
4. File: Upload/paste `.env` file with staging configuration
5. Required variables:
   ```
   NODE_ENV=staging
   DATABASE_URL=postgresql://...
   JWT_ACCESS_SECRET=...
   JWT_REFRESH_SECRET=...
   AWS_ACCESS_KEY_ID=...
   AWS_SECRET_ACCESS_KEY=...
   AWS_REGION=ap-south-1
   AWS_S3_BUCKET=...
   FRONTEND_URL=https://staging.zeerostock.com
   ```
6. Click **Create**

#### For Production
1. Click **Add Credentials** → **Global**
2. Kind: **Secret file**
3. ID: `zeerostock-production-env`
4. File: Upload/paste `.env` file with production configuration
5. Click **Create**

## Step 2: Install Required Jenkins Plugins

1. Jenkins Dashboard → **Manage Jenkins** → **Manage Plugins**
2. **Available** tab → Search and install:
   - **AWS Elastic Beanstalk Plugin**
   - **NodeJS Plugin**
   - **Pipeline: GitHub Groovy Libraries**
   - **Log Parser** (optional, for better logs)
   - **Slack Notification** (optional, for notifications)
3. Click **Install without restart**

## Step 3: Configure Global Tools

### 3.1 Configure Node.js
1. Jenkins Dashboard → **Manage Jenkins** → **Global Tool Configuration**
2. Scroll to **NodeJS**
3. Click **Add NodeJS**
4. Name: `NodeJS-24.6.0`
5. Version: `24.6.0`
6. Click **Save**

### 3.2 Configure EB CLI
1. Install on Jenkins server:
   ```bash
   pip install awsebcli
   ```
2. Verify installation:
   ```bash
   eb --version
   ```

## Step 4: Create Jenkins Job

### 4.1 Create Multibranch Pipeline Job
1. Jenkins Dashboard → **New Item**
2. Name: `Zeerostock-Backend-Deploy`
3. Type: **Multibranch Pipeline**
4. Click **OK**

### 4.2 Configure Branch Sources
1. **Branch Sources** section → Click **Add source** → **Git**
2. Project Repository: `https://github.com/Jatin-1111/Zeerostock-backend.git`
3. Credentials: Select your GitHub credentials
4. Behaviours:
   - Click **Add** → **Discover branches**
   - Include branches: `.*`
5. Click **Save**

### 4.3 Pipeline Configuration
The `Jenkinsfile` in the repository root will be automatically used.

## Step 5: Update .ebextensions Files

### 5.1 Update ALB HTTPS Configuration
Edit `.ebextensions/alb-https.config` and replace:
- `arn:aws:acm:ap-south-1:ACCOUNT_ID:certificate/CERTIFICATE_ID` with your actual certificate ARN

### 5.2 Verify All .ebextensions Files
```
.ebextensions/
├── alb-https.config        # ALB with SSL certificate
├── nodecommand.config      # Node.js command and scaling
└── nginx-https.config      # HTTPS redirect rules
```

## Step 6: Create EB Environments

### Option A: Using Jenkins UI (Recommended)
1. Jenkins Dashboard → **Build with Parameters**
2. Select job `Zeerostock-Backend-Deploy`
3. Set:
   - **DEPLOY_ENV**: `staging`
   - **CREATE_NEW_ENV**: ✓ (check this)
4. Click **Build**

### Option B: Using EB CLI Manually
```bash
# Initialize EB (one-time)
eb init -p "Node.js 24 running on 64bit Amazon Linux 2" \
        -r ap-south-1 \
        --display-name "zeerostock" \
        zeerostock

# Create staging environment
eb create zeerostock-staging \
   --instance-type t3.medium \
   --scale 2 \
   --envvars NODE_ENV=staging

# Create production environment  
eb create zeerostock-prod \
   --instance-type t3.medium \
   --scale 2 \
   --envvars NODE_ENV=production
```

## Step 7: Deploy Application

### Using Jenkins UI
1. Jenkins Dashboard → Select `Zeerostock-Backend-Deploy` job
2. Click **Build with Parameters**
3. Configure:
   - **DEPLOY_ENV**: Select `staging` or `production`
   - **CREATE_NEW_ENV**: Uncheck (environments already exist)
4. Click **Build**
5. Monitor build progress in **Console Output**

### Build Stages
The pipeline executes these stages automatically:
1. **Checkout** - Clones repository
2. **Setup** - Sets environment variables
3. **Install Dependencies** - Runs `npm ci`
4. **Lint & Validate** - Syntax checks
5. **Security Check** - npm audit
6. **Health Check Validation** - Verifies endpoints
7. **Environment Configuration** - Sets .env variables
8. **Deploy to EB** - Deploys to environment
9. **Health Check** - Verifies deployment
10. **Smoke Tests** - Tests HTTPS and redirects
11. **Retrieve Logs** - Gets EB logs

## Step 8: Verify Deployment

### Check Application Status
```bash
# View environment health
eb health zeerostock-staging

# Stream recent logs
eb logs zeerostock-staging --stream

# Check environment status
eb status zeerostock-staging
```

### Test HTTPS/SSL
```bash
# Test health endpoint
curl -k https://zeerostock-staging.elasticbeanstalk.com/api/health

# Test HTTP redirect to HTTPS
curl -i http://zeerostock-staging.elasticbeanstalk.com/

# Verify SSL certificate
openssl s_client -connect zeerostock-staging.elasticbeanstalk.com:443 -servername zeerostock-staging.elasticbeanstalk.com
```

## Troubleshooting

### Health Check Failures
1. Check application logs: `eb logs zeerostock-staging`
2. Verify health endpoint: `curl http://localhost:5000/api/health`
3. Check ALB target health in AWS Console
4. Verify security groups allow port 80/443

### Deployment Fails at Environment Configuration
1. Verify credential ID exists: `zeerostock-staging-env`
2. Check .env file format and required variables
3. Ensure `scripts/eb-env-manager.js` has execute permissions

### SSL Certificate Issues
1. Verify certificate ARN in `.ebextensions/alb-https.config`
2. Check certificate is in `ap-south-1` region
3. Verify certificate status is "Issued" in ACM console
4. Ensure certificate domain matches EB environment

### Port/Connection Issues
- Verify security group allows 80 and 443
- Check ALB listener configuration in AWS Console
- Verify Target Group health checks are passing

## Deployment Workflow

### Development → Staging
1. Push changes to `develop` branch
2. Jenkins automatically detects and builds
3. Deploys to `zeerostock-staging` environment
4. Access at: `https://zeerostock-staging.elasticbeanstalk.com`

### Staging → Production
1. Merge `develop` to `main` branch
2. Jenkins automatically detects and builds
3. Requires manual approval for production (optional)
4. Deploys to `zeerostock-prod` environment
5. Access at: `https://zeerostock-prod.elasticbeanstalk.com`

## Environment Variable Management

### Using eb-env-manager.js Script
```bash
# Set environment variables from .env file
node scripts/eb-env-manager.js set zeerostock-staging --file .env.staging

# Get all environment variables
node scripts/eb-env-manager.js get zeerostock-staging

# Delete specific variable
node scripts/eb-env-manager.js delete zeerostock-staging DATABASE_URL
```

### Manual Configuration
```bash
# Using EB CLI
eb setenv VARIABLE_NAME=value -e zeerostock-staging

# Check variables
eb printenv zeerostock-staging
```

## Monitoring & Maintenance

### Regular Tasks
- Monitor CloudWatch logs: AWS Console → CloudWatch → Logs
- Check EB environment health: `eb health zeerostock-staging`
- Review Jenkins build logs after each deployment
- Update dependencies: `npm update`, `npm audit fix`

### Scaling Configuration
Modify in `.ebextensions/nodecommand.config`:
- `MinSize`: Minimum instances (default: 2)
- `MaxSize`: Maximum instances (default: 6)
- `DesiredCapacity`: Target instances (default: 2)
- `UpperThreshold`: CPU threshold to scale up (default: 70%)
- `LowerThreshold`: CPU threshold to scale down (default: 30%)

## Security Considerations

### HTTPS/SSL
- ✓ ALB terminates SSL on port 443
- ✓ Application communicates with ALB on port 80
- ✓ Nginx enforces HTTP→HTTPS redirect
- ✓ Express trusts X-Forwarded-Proto header in production

### Security Headers
- ✓ HSTS enabled with preload
- ✓ Content-Security-Policy configured
- ✓ Helmet security middleware active

### Credentials Management
- Never commit `.env` files
- Store credentials in Jenkins Secret Manager
- Use IAM roles for AWS SDK operations
- Rotate credentials regularly

## Additional Resources

- [AWS Elastic Beanstalk Documentation](https://docs.aws.amazon.com/elasticbeanstalk/)
- [EB CLI Reference](https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/ebcli.html)
- [Jenkins Pipeline Documentation](https://www.jenkins.io/doc/book/pipeline/)
- [Node.js on Elastic Beanstalk](https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/create-deploy-nodejs.html)

## Support

For issues or questions:
1. Check Jenkins Console Output
2. Review EB logs: `eb logs zeerostock-staging --stream`
3. Check AWS CloudWatch logs
4. Review this guide's Troubleshooting section
