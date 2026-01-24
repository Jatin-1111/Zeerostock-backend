# Pre-Deployment Checklist

Complete this checklist before deploying to AWS Elastic Beanstalk with Jenkins.

## AWS Setup Checklist

- [ ] **ACM Certificate Created**
  - [ ] Certificate exists in `ap-south-1` region
  - [ ] Certificate status is "Issued"
  - [ ] Certificate ARN noted: `arn:aws:acm:ap-south-1:ACCOUNT_ID:certificate/CERTIFICATE_ID`
  - [ ] Domain matches your EB environment domain

- [ ] **IAM Roles Created**
  - [ ] `aws-elasticbeanstalk-ec2-role` exists
  - [ ] `aws-elasticbeanstalk-service-role` exists
  - [ ] Roles have necessary S3 and RDS permissions

- [ ] **S3 Buckets Configured**
  - [ ] `zeerostock-assets` bucket exists and is public
  - [ ] `zeerostock-verification-documents` bucket exists and is private
  - [ ] `zeerostock-products` bucket exists (if using product images)
  - [ ] Bucket policies allow EC2 role access

- [ ] **RDS/Database Configured**
  - [ ] PostgreSQL database exists in `ap-south-1`
  - [ ] Security group allows EC2 instances access
  - [ ] Connection string format: `postgresql://user:password@host:5432/dbname`
  - [ ] PgBouncer configured (if using Supabase)

- [ ] **Security Groups**
  - [ ] ALB security group allows 80 (HTTP) and 443 (HTTPS) inbound
  - [ ] EC2 security group allows 80 inbound from ALB
  - [ ] Database security group allows 5432 inbound from EC2

## Configuration Files Checklist

- [ ] **`.elasticbeanstalk/config.yml`**
  - [ ] Application name set to `zeerostock`
  - [ ] Default region set to `ap-south-1`
  - [ ] Environment mappings include `zeerostock-prod` and `zeerostock-staging`

- [ ] **`.ebextensions/alb-https.config`**
  - [ ] SSL Certificate ARN replaced with actual value
  - [ ] Security groups configured for ports 80 and 443
  - [ ] ALB listener configured for HTTPS on 443
  - [ ] HTTP listener configured to redirect to HTTPS

- [ ] **`.ebextensions/nodecommand.config`**
  - [ ] Node command set to `node src/server.js`
  - [ ] Instance type set to `t3.medium` (or your preference)
  - [ ] Auto-scaling configured (Min: 2, Max: 6)
  - [ ] CPU thresholds set (Upper: 70%, Lower: 30%)

- [ ] **`.ebextensions/nginx-https.config`**
  - [ ] X-Forwarded-Proto header configured
  - [ ] HTTP to HTTPS redirect configured
  - [ ] Proxy headers set correctly

- [ ] **`Jenkinsfile`**
  - [ ] Review all stages
  - [ ] Verify credential IDs match Jenkins configuration
  - [ ] Build timeout appropriate for your project

- [ ] **`src/app.js`**
  - [ ] `app.set('trust proxy', 1)` added for production
  - [ ] Health check endpoints defined

## Jenkins Setup Checklist

### Jenkins Credentials
- [ ] `aws-credentials` (AWS Access Key + Secret Key)
  - [ ] Access key has EB, S3, and ACM permissions
  - [ ] Secret key is correct
  
- [ ] `acm-certificate-arn` (Secret text)
  - [ ] Contains full ARN: `arn:aws:acm:ap-south-1:ACCOUNT_ID:certificate/ID`
  
- [ ] `aws-region` (Secret text)
  - [ ] Set to `ap-south-1`
  
- [ ] `zeerostock-staging-env` (Secret file)
  - [ ] Contains complete staging `.env` file
  - [ ] All required variables present:
    - [ ] `NODE_ENV=staging`
    - [ ] `DATABASE_URL=postgresql://...`
    - [ ] `JWT_ACCESS_SECRET=...`
    - [ ] `JWT_REFRESH_SECRET=...`
    - [ ] `AWS_ACCESS_KEY_ID=...`
    - [ ] `AWS_SECRET_ACCESS_KEY=...`
    - [ ] `AWS_REGION=ap-south-1`
    - [ ] `FRONTEND_URL=...`
  
- [ ] `zeerostock-production-env` (Secret file)
  - [ ] Contains complete production `.env` file
  - [ ] All required variables present (same as staging but production values)

### Jenkins Plugins
- [ ] AWS Elastic Beanstalk Plugin installed
- [ ] NodeJS Plugin installed
- [ ] Pipeline plugins installed
- [ ] Git plugin installed

### Global Tools
- [ ] Node.js 24.6.0 configured
  - [ ] Name: `NodeJS-24.6.0`
  - [ ] Version: `24.6.0`

### Jenkins Server
- [ ] EB CLI installed: `pip install awsebcli`
- [ ] AWS CLI installed: `pip install awscli`
- [ ] Node.js 24.6.0 available
- [ ] npm 11.5.1 available
- [ ] Git installed

### Jenkins Job
- [ ] Multibranch Pipeline job created
- [ ] Git repository URL configured
- [ ] Branch discovery configured
- [ ] Jenkinsfile path correct (default: `Jenkinsfile`)

## Environment Checklist (Staging)

- [ ] EB Environment `zeerostock-staging` created
  - [ ] Instance type: t3.medium or larger
  - [ ] Auto-scaling enabled
  - [ ] ALB configured
  - [ ] SSL certificate associated
  - [ ] Environment variables set
  - [ ] Health check endpoint configured

- [ ] Application Deployment
  - [ ] First deployment successful
  - [ ] No errors in deployment logs
  - [ ] Health check passing (green in EB console)

- [ ] HTTPS/SSL Verification
  - [ ] Can access application via HTTPS
  - [ ] HTTP requests redirect to HTTPS
  - [ ] SSL certificate valid (no warnings)
  - [ ] Security headers present (HSTS, CSP)

- [ ] Health Check Endpoint
  - [ ] `/api/health` responds with 200 OK
  - [ ] Response contains expected JSON structure
  - [ ] ALB targets show healthy

- [ ] Application Functionality
  - [ ] Database connection working
  - [ ] File uploads to S3 working
  - [ ] Email notifications working (if applicable)
  - [ ] JWT authentication working

## Environment Checklist (Production)

- [ ] EB Environment `zeerostock-prod` created
  - [ ] Instance type: t3.medium or larger
  - [ ] Auto-scaling enabled
  - [ ] ALB configured
  - [ ] SSL certificate associated (production domain)
  - [ ] Environment variables set
  - [ ] Health check endpoint configured

- [ ] Pre-Production Testing Complete
  - [ ] Staging environment fully tested
  - [ ] No critical issues in staging logs
  - [ ] Performance acceptable under load
  - [ ] All security checks passed

- [ ] Production Deployment
  - [ ] Deployment successful
  - [ ] No errors in deployment logs
  - [ ] Health checks passing
  - [ ] Monitoring/alerting configured

- [ ] Production Verification
  - [ ] Application accessible via HTTPS
  - [ ] SSL certificate valid for production domain
  - [ ] Database connection to production RDS
  - [ ] S3 buckets using production credentials
  - [ ] All third-party integrations working

## Monitoring Checklist

- [ ] **CloudWatch Monitoring**
  - [ ] CloudWatch Logs enabled for EB environment
  - [ ] Log groups created for application logs
  - [ ] Alarms configured for:
    - [ ] ALB target unhealthy
    - [ ] High CPU usage
    - [ ] High memory usage
    - [ ] Application errors

- [ ] **Jenkins Monitoring**
  - [ ] Build notifications configured (optional Slack/email)
  - [ ] Build logs retention configured
  - [ ] Failed build alerts configured

- [ ] **Application Monitoring**
  - [ ] Error tracking configured (if using Sentry, DataDog, etc.)
  - [ ] Performance monitoring configured
  - [ ] Uptime monitoring configured

## Post-Deployment Checklist

- [ ] **First Deployment**
  - [ ] Jenkins job triggered successfully
  - [ ] Build completed without errors
  - [ ] Application deployed to staging
  - [ ] Health checks passed
  - [ ] Smoke tests passed
  - [ ] Logs reviewed for any warnings

- [ ] **Rollback Procedure**
  - [ ] Know how to rollback via: `eb abort` or `eb deploy --version <version>`
  - [ ] EB version history understood
  - [ ] Database backup strategy confirmed

- [ ] **Team Communication**
  - [ ] Team notified of new deployment process
  - [ ] Documentation shared with team
  - [ ] Access credentials shared securely
  - [ ] Support contacts identified

## Troubleshooting Preparation

- [ ] **Common Issues Documented**
  - [ ] Health check failures resolution
  - [ ] SSL certificate errors resolution
  - [ ] Environment variable missing resolution
  - [ ] Database connection errors resolution

- [ ] **Contact Information**
  - [ ] AWS Support contact (if applicable)
  - [ ] Jenkins administrator contact
  - [ ] Database administrator contact
  - [ ] DevOps team contact

## Final Review

- [ ] All configuration files reviewed
- [ ] All AWS resources verified
- [ ] Jenkins setup complete
- [ ] Team trained on new deployment process
- [ ] Documentation available to team
- [ ] Ready for first deployment to staging

---

**Date Completed**: _______________

**Completed By**: _______________

**Approved By**: _______________

---

## Notes

_Use this space for any additional notes or configuration specifics:_

```




```

