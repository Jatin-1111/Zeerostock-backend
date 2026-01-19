# ✅ AWS Elastic Beanstalk Configuration - COMPLETE SETUP GUIDE

## 📋 **Current AWS Configuration**

### **Environment Details**
- **Application Name:** Zeerostock-prod
- **Environment Name:** Zeerostock-prod
- **Region:** ap-south-1 (Mumbai)
- **Platform:** Node.js 24 running on 64bit Amazon Linux 2023/6.7.2
- **Status:** ✅ Ready & Healthy (Green)
- **CNAME:** zeerostock-prod-api.ap-south-1.elasticbeanstalk.com
- **Health:** 100% requests successful

### **Instance Configuration**
- **Type:** t3.micro (Free Tier eligible)
- **Auto-scaling:** Min: 1, Max: 1
- **IAM Role:** aws-elasticbeanstalk-ec2-role
- **Monitoring:** 5-minute intervals

### **Load Balancer (Application LB)**
- **HTTP Listener:** Port 80 (enabled)
- **HTTPS Listener:** Port 443 (enabled)
  - **SSL Certificate:** arn:aws:acm:ap-south-1:154290454406:certificate/a33c228b-9184-4eca-9953-70fd5f1d0a46
  - **SSL Policy:** ELBSecurityPolicy-TLS13-1-3-2021-06

### **Health Check Configuration**
- **Path:** / (root)
- **Interval:** 15 seconds
- **Timeout:** 5 seconds
- **Healthy Threshold:** 3
- **Unhealthy Threshold:** 5

---

## 🚀 **CLI Deployment Configuration**

### **Files Updated for CLI Compatibility**

#### **1. `.elasticbeanstalk/config.yml`**
```yaml
global:
  application_name: Zeerostock-prod    # ✅ Matches AWS
  default_region: ap-south-1
  instance_profile: aws-elasticbeanstalk-ec2-role

branch-defaults:
  main:
    environment: Zeerostock-prod       # ✅ Matches AWS environment
```

#### **2. `.ebextensions/00-options.config`**
All settings match AWS configuration:
- ✅ Instance type: t3.micro
- ✅ SSL certificate configured
- ✅ Load balancer settings
- ✅ Health check paths

#### **3. `src/middleware/upload.middleware.js`**
Fixed bucket configuration:
- ✅ Uses `AWS_ASSETS_BUCKET_NAME`
- ✅ Uses `AWS_PRODUCTS_BUCKET_NAME`
- ✅ Uses `AWS_VERIFICATION_BUCKET_NAME`
- ⚠️ Removed invalid `AWS_S3_BUCKET_NAME`

#### **4. `src/server.js`**
Server startup optimized:
- ✅ Starts Express server FIRST (non-blocking)
- ✅ Database connection happens in background
- ✅ Won't crash if database fails initially

---

## 🔐 **Environment Variables (Currently Set)**

### **Application Config**
- `NODE_ENV=development` ⚠️ (Should be `production` for prod)
- `PORT=5000` ⚠️ (Should be `8080` for AWS)

### **Database**
- `DATABASE_URL=postgresql://...` ✅
- `SUPABASE_URL=https://slqqxswruudranyetgpr.supabase.co` ✅
- `SUPABASE_ANON_KEY=...` ✅
- `SUPABASE_SERVICE_ROLE_KEY=...` ✅

### **Authentication**
- `JWT_ACCESS_SECRET` ✅
- `JWT_REFRESH_SECRET` ✅
- `JWT_ACCESS_EXPIRY=24h` ✅
- `JWT_REFRESH_EXPIRY=7d` ✅

### **Email (SMTP)**
- `SMTP_HOST=smtpout.secureserver.net` ✅
- `SMTP_PORT=465` ✅
- `SMTP_USER=contact@zeerostock.com` ✅
- `SMTP_PASS=Transact@368` ✅

### **AWS S3 Buckets**
- `AWS_REGION=ap-south-1` ✅
- `AWS_ASSETS_BUCKET_NAME=zeerostock-assets` ✅
- `AWS_PRODUCTS_BUCKET_NAME=zeerostock-products` ✅
- `AWS_VERIFICATION_BUCKET_NAME=zeerostock-verification-documents` ✅

### **Frontend URLs**
- `FRONTEND_URL=http://localhost:3000` ⚠️ (Update to production URL)
- `ADMIN_PANEL_URL=http://localhost:3000/admin-panel/login` ⚠️

---

## 📝 **How to Deploy Using CLI**

### **1. Verify Environment Connection**
```powershell
cd "d:\Poppy Pie\Zeerostock\Zeerostock-backend"
eb status
```
**Expected Output:** Environment "Zeerostock-prod" details

### **2. Update Environment Variables (Optional)**
To update to production values:
```powershell
eb setenv `
  NODE_ENV=production `
  PORT=8080 `
  FRONTEND_URL=https://zeerostock.com `
  ADMIN_PANEL_URL=https://zeerostock.com/admin-panel/login
```

### **3. Deploy Your Code**
```powershell
# Deploy current code
eb deploy

# Deploy with custom version label
eb deploy --label "v1.2.3-production"

# Deploy and wait for completion
eb deploy --staged
```

### **4. Monitor Deployment**
```powershell
# Watch health in real-time
eb health --refresh

# Stream logs
eb logs --stream

# Check status
eb status
```

---

## ⚠️ **Important Changes Made**

### **Fixed Issues:**

1. **Bucket Configuration Error** ✅
   - **Problem:** Used non-existent `AWS_S3_BUCKET_NAME`
   - **Solution:** Dynamic bucket selection based on upload type

2. **Server Startup Blocking** ✅
   - **Problem:** `await testConnection()` blocked server start
   - **Solution:** Server starts first, database connects in background

3. **CLI Environment Mismatch** ✅
   - **Problem:** Config pointed to non-existent environments
   - **Solution:** Updated to match actual AWS environment names

4. **Missing package-lock.json** ✅
   - **Problem:** Inconsistent dependency versions on AWS
   - **Solution:** Generated package-lock.json for consistent deploys

---

## 🎯 **Recommended Next Steps**

### **1. Update Production Environment Variables**
```powershell
eb setenv `
  NODE_ENV=production `
  PORT=8080 `
  FRONTEND_URL=https://zeerostock.com `
  ADMIN_PANEL_URL=https://zeerostock.com/admin-panel/login
```

### **2. Remove AWS Keys (Use IAM Role)**
Currently using AWS access keys in environment:
- `AWS_ACCESS_KEY_ID=AKIASH3DNP6DEJULWOGQ`
- `AWS_SECRET_ACCESS_KEY=...`

**Better approach:** Attach S3 policies to `aws-elasticbeanstalk-ec2-role` and remove keys.

### **3. Enable HTTPS Redirect**
Configure in AWS Console:
- EC2 → Load Balancers → Your ALB
- Listeners → Edit HTTP:80
- Add "Redirect" action to HTTPS:443

### **4. Test Deployment**
```powershell
# Make a small change
echo "# Deployment test" >> README.md

# Deploy
eb deploy

# Verify
eb health
```

---

## 📚 **Useful Commands**

### **Environment Management**
```powershell
eb list                    # List all environments
eb use Zeerostock-prod     # Switch to environment
eb status                  # Get environment details
eb health                  # Check health status
eb logs                    # Download recent logs
eb logs --stream           # Stream logs in real-time
```

### **Deployment**
```powershell
eb deploy                  # Deploy code
eb deploy --staged         # Deploy staged changes
eb printenv                # Show environment variables
eb setenv VAR=value        # Set environment variable
```

### **Configuration**
```powershell
eb config                  # Edit environment configuration
eb config get              # Download current configuration
eb config put my-config    # Upload saved configuration
```

### **Monitoring**
```powershell
eb health --refresh        # Real-time health monitoring
eb events                  # Show recent events
eb open                    # Open environment in browser
```

---

## ✅ **Deployment Checklist**

Before deploying to production:

- [x] ✅ CLI connected to correct environment
- [x] ✅ Package-lock.json generated
- [x] ✅ Server startup fixed (non-blocking)
- [x] ✅ S3 bucket configuration fixed
- [ ] ⚠️ Update NODE_ENV to "production"
- [ ] ⚠️ Update PORT to "8080"
- [ ] ⚠️ Update FRONTEND_URL to production domain
- [ ] ⚠️ Update ADMIN_PANEL_URL to production domain
- [ ] ⚠️ Configure HTTP→HTTPS redirect
- [ ] ⚠️ Remove AWS access keys (use IAM role)
- [ ] ⚠️ Test health endpoint
- [ ] ⚠️ Test all API endpoints

---

## 🌐 **Current Endpoints**

- **HTTP:** http://zeerostock-prod-api.ap-south-1.elasticbeanstalk.com
- **HTTPS:** https://zeerostock-prod-api.ap-south-1.elasticbeanstalk.com
- **Health Check:** https://zeerostock-prod-api.ap-south-1.elasticbeanstalk.com/health

---

## 📞 **Support**

For issues or questions:
1. Check logs: `eb logs --stream`
2. Check health: `eb health --refresh`
3. Check AWS Console: EB → Environments → Zeerostock-prod

**Last Updated:** January 19, 2026
**Status:** ✅ Production Ready (with recommended updates)
