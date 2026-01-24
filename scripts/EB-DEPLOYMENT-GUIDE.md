# EB Deployment Configuration - Quick Reference

## File Structure

```
Zeerostock-backend/
├── .elasticbeanstalk/
│   └── config.yml                    # EB environment configuration
├── .ebextensions/
│   ├── alb-https.config             # ALB listener, SSL, security groups
│   ├── nodecommand.config           # Node.js, scaling, CloudWatch
│   └── nginx-https.config           # HTTP→HTTPS redirect, proxy headers
├── Jenkinsfile                       # CI/CD pipeline definition
├── scripts/
│   ├── JENKINS-SETUP-GUIDE.md       # Detailed Jenkins setup instructions
│   └── eb-env-manager.js            # Environment variable management tool
└── src/
    └── app.js                        # Updated to trust proxy headers
```

## Key Configuration Details

### EB Environments

- **Staging**: `zeerostock-staging` (for develop/feature branches)
- **Production**: `zeerostock-production` (for main branch)
- **Region**: `ap-south-1` (Mumbai)
- **Instance Type**: t3.medium (configurable)
- **Instances**: 2-6 (auto-scaling enabled)

### HTTPS/SSL Configuration

- **Certificate**: AWS ACM (update ARN in `.ebextensions/alb-https.config`)
- **Port Mapping**:
  - ALB listens on 443 (HTTPS)
  - ALB listens on 80 (HTTP → redirect to HTTPS)
  - EC2 instances listen on 80 (HTTP only, ALB handles SSL termination)
- **Headers**: X-Forwarded-Proto, X-Forwarded-Host set by ALB

### Health Check

- **Endpoint**: `/api/health`
- **Interval**: 15 seconds
- **Healthy Threshold**: 3 consecutive passes
- **Unhealthy Threshold**: 5 consecutive failures

### Jenkins Pipeline Stages

1. Checkout
2. Setup
3. Install Dependencies
4. Lint & Validate
5. Security Check
6. Health Check Validation
7. Environment Configuration
8. Create EB Environment (optional)
9. Deploy to EB
10. Health Check Verification
11. Smoke Tests
12. Retrieve Logs

### Required Jenkins Credentials

| ID                                | Type            | Purpose              |
| --------------------------------- | --------------- | -------------------- |
| `aws-credentials`                 | AWS Credentials | AWS API access       |
| `acm-certificate-arn`             | Secret text     | SSL certificate ARN  |
| `aws-region`                      | Secret text     | AWS region           |
| `zeerostock-staging-env`          | Secret file     | Staging .env file    |
| `zeerostock-productionuction-env` | Secret file     | Production .env file |

### Application Configuration

- **Node.js Version**: 24.6.0
- **npm Version**: 11.5.1
- **Main Entry Point**: `src/server.js`
- **Express App**: `src/app.js`
- **Start Command**: `node src/server.js`
- **Environment Variable**: `NODE_ENV` (production/staging/development)

### AWS Requirements

- **IAM Roles**:
  - `aws-elasticbeanstalk-ec2-role` (EC2 instances)
  - `aws-elasticbeanstalk-service-role` (EB service)
- **S3 Buckets**:
  - Assets: `zeerostock-assets`
  - Verification: `zeerostock-verification-documents`
  - Products: `zeerostock-productionucts`
- **Database**: PostgreSQL (Supabase) with PgBouncer

## Deployment Flow

### Automatic (Git-Triggered)

```
Push to develop/feature branch
    ↓
Jenkins detects change
    ↓
Run pipeline
    ↓
Deploy to zeerostock-staging
    ↓
Health check & validation
```

### Production (Manual)

```
Merge to main branch
    ↓
Jenkins pipeline triggered
    ↓
Build passes all checks
    ↓
Manual approval (optional)
    ↓
Deploy to zeerostock-production
```

## Next Steps

1. **Update ACM Certificate ARN**
   - Edit `.ebextensions/alb-https.config`
   - Replace `arn:aws:acm:ap-south-1:ACCOUNT_ID:certificate/CERTIFICATE_ID`

2. **Create EB Environments** (if not exist)

   ```bash
   eb create zeerostock-staging --instance-type t3.medium --scale 2
   ```

3. **Configure Jenkins**
   - Follow [scripts/JENKINS-SETUP-GUIDE.md](scripts/JENKINS-SETUP-GUIDE.md)
   - Add AWS credentials
   - Configure Node.js tool
   - Install plugins

4. **Create Jenkins Job**
   - New Multibranch Pipeline
   - Point to GitHub Zeerostock-backend repo
   - Configure branch source

5. **Verify Deployment**

   ```bash
   # Check environment
   eb status zeerostock-staging

   # Test health endpoint
   curl -k https://zeerostock-staging.elasticbeanstalk.com/api/health
   ```

## Common Commands

### EB CLI

```bash
# Initialize EB (one-time)
eb init -p "Node.js 24 running on 64bit Amazon Linux 2" -r ap-south-1 zeerostock

# List environments
eb list

# Deploy to specific environment
eb deploy zeerostock-staging

# Check environment status
eb status zeerostock-staging

# Stream logs
eb logs zeerostock-staging --stream

# SSH into instance
eb ssh zeerostock-staging

# Scale environment
eb scale 3 -e zeerostock-staging  # Set to 3 instances

# Terminate environment
eb terminate zeerostock-staging
```

### Environment Variables

```bash
# Set variables from .env file
node scripts/eb-env-manager.js set zeerostock-staging --file .env.staging

# Get all variables
node scripts/eb-env-manager.js get zeerostock-staging

# Set single variable
eb setenv DATABASE_URL=postgresql://... -e zeerostock-staging

# View all variables
eb printenv zeerostock-staging
```

## Troubleshooting Links

### Common Issues

- **ALB Health Check Failing**: Check `.ebextensions/alb-https.config` health check endpoint
- **SSL Certificate Error**: Verify certificate ARN and region in `.ebextensions/alb-https.config`
- **Environment Variables Missing**: Run `eb printenv zeerostock-staging` to verify
- **Deployment Timeout**: Increase timeout in Jenkinsfile `timeout(time: 1, unit: 'HOURS')`
- **Port Already in Use**: Check security group and ALB listener configuration

### Log Locations

- **EB Logs**: `eb logs zeerostock-staging`
- **Application Logs**: CloudWatch → Logs → `/aws/elasticbeanstalk/zeerostock-staging/var/log`
- **Nginx Logs**: `/var/log/nginx/access.log` and `error.log`
- **Node.js Logs**: Stream via `eb logs -stream`

## Support

Detailed setup instructions: See [scripts/JENKINS-SETUP-GUIDE.md](scripts/JENKINS-SETUP-GUIDE.md)
