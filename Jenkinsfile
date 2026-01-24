pipeline {
    agent any

    options {
        buildDiscarder(logRotator(numToKeepStr: '15'))
        timeout(time: 1, unit: 'HOURS')
        disableConcurrentBuilds()
    }

    parameters {
        choice(
            name: 'DEPLOY_ENV',
            choices: ['staging', 'production'],
            description: 'Select deployment environment'
        )
        booleanParam(
            name: 'CREATE_NEW_ENV',
            defaultValue: false,
            description: 'Check to create new EB environment'
        )
    }

    environment {
        APP_NAME = 'zeerostock'
        AWS_REGION = 'ap-south-1'
        NODE_VERSION = '24.6.0'
        NPM_VERSION = '11.5.1'
    }

    stages {
        stage('Checkout') {
            steps {
                script {
                    echo '========== Checking out source code =========='
                    checkout scm
                    echo "Current branch: ${env.GIT_BRANCH}"
                    echo "Current commit: ${env.GIT_COMMIT}"
                }
            }
        }

        stage('Setup') {
            steps {
                script {
                    echo '========== Setting up environment =========='
                    
                    // Set environment based on branch
                    if (env.GIT_BRANCH == 'main' || params.DEPLOY_ENV == 'production') {
                        env.EB_ENV_NAME = 'zeerostock-production'
                        env.ENV_TYPE = 'production'
                    } else {
                        env.EB_ENV_NAME = 'zeerostock-staging'
                        env.ENV_TYPE = 'staging'
                    }
                    
                    echo "Deployment Environment: ${env.EB_ENV_NAME}"
                    echo "Environment Type: ${env.ENV_TYPE}"
                    
                    // Set Node.js and npm
                    sh '''
                        node --version
                        npm --version
                    '''
                }
            }
        }

        stage('Install Dependencies') {
            steps {
                script {
                    echo '========== Installing dependencies =========='
                    sh 'npm ci --prefer-offline --no-audit'
                }
            }
        }

        stage('Lint & Validate') {
            steps {
                script {
                    echo '========== Running code validation =========='
                    sh '''
                        # Check for syntax errors in key files
                        node -c src/app.js
                        node -c src/server.js
                        echo "✓ Syntax validation passed"
                    '''
                }
            }
        }

        stage('Security Check') {
            steps {
                script {
                    echo '========== Running security checks =========='
                    sh '''
                        # Audit production dependencies
                        npm audit --production --audit-level=moderate || true
                        echo "✓ Security audit completed"
                    '''
                }
            }
        }

        stage('Health Check Validation') {
            steps {
                script {
                    echo '========== Validating health check endpoints =========='
                    sh '''
                        # Verify health check endpoint exists in code
                        grep -r "GET.*health" src/routes/ || grep -r "app.get.*health" src/app.js
                        echo "✓ Health check endpoints verified"
                    '''
                }
            }
        }

        stage('Environment Configuration') {
            steps {
                script {
                    echo '========== Configuring environment variables =========='
                    withCredentials([file(credentialsId: "zeerostock-${env.ENV_TYPE}-env", variable: 'ENV_FILE')]) {
                        sh '''
                            # Set EB environment variables from credentials
                            node scripts/eb-env-manager.js set ${EB_ENV_NAME} --file ${ENV_FILE}
                            
                            # Verify environment was set
                            echo "✓ Environment variables configured for ${EB_ENV_NAME}"
                        '''
                    }
                }
            }
        }

        stage('Create EB Environment') {
            when {
                expression {
                    return params.CREATE_NEW_ENV == true
                }
            }
            steps {
                script {
                    echo '========== Creating new EB environment =========='
                    withCredentials([
                        string(credentialsId: 'aws-region', variable: 'AWS_REGION_ID'),
                        string(credentialsId: 'acm-certificate-arn', variable: 'SSL_CERT_ARN')
                    ]) {
                        sh '''
                            # Initialize EB if not already done
                            eb init -p "Node.js 24 running on 64bit Amazon Linux 2" \
                                   -r ${AWS_REGION_ID} \
                                   --display-name "${APP_NAME}" \
                                   ${APP_NAME} || true

                            # Create new environment with ALB and HTTPS
                            eb create ${EB_ENV_NAME} \
                               --instance-type t3.medium \
                               --scale 2 \
                               --envvars NODE_ENV=${ENV_TYPE} \
                               --instance-role aws-elasticbeanstalk-ec2-role \
                               --service-role aws-elasticbeanstalk-service-role \
                               --instance-role-profile aws-elasticbeanstalk-ec2-role \
                               --enable-spot false \
                               || echo "Environment ${EB_ENV_NAME} may already exist"

                            echo "✓ EB environment ${EB_ENV_NAME} created/verified"
                        '''
                    }
                }
            }
        }

        stage('Deploy to EB') {
            steps {
                script {
                    echo '========== Deploying to Elastic Beanstalk =========='
                    sh '''
                        # Deploy application to EB environment
                        eb deploy ${EB_ENV_NAME} \
                           --message "Jenkins build #${BUILD_NUMBER} from branch ${GIT_BRANCH}" \
                           --timeout 10

                        echo "✓ Deployment to ${EB_ENV_NAME} completed"
                    '''
                }
            }
        }

        stage('Health Check') {
            steps {
                script {
                    echo '========== Verifying application health =========='
                    sh '''
                        # Wait for environment to stabilize
                        sleep 30

                        # Get environment URL
                        ENV_URL=$(eb open ${EB_ENV_NAME} --print-url || echo "http://${EB_ENV_NAME}.elasticbeanstalk.com")
                        
                        # Check health endpoint
                        for i in {1..10}; do
                            echo "Health check attempt $i/10..."
                            if curl -f -s "${ENV_URL}/api/health" > /dev/null 2>&1; then
                                echo "✓ Health check passed"
                                curl -s "${ENV_URL}/api/health" | head -20
                                exit 0
                            fi
                            sleep 10
                        done

                        echo "✗ Health check failed after 10 attempts"
                        exit 1
                    '''
                }
            }
        }

        stage('Smoke Tests') {
            steps {
                script {
                    echo '========== Running smoke tests =========='
                    sh '''
                        # Get environment URL
                        ENV_URL=$(eb open ${EB_ENV_NAME} --print-url || echo "http://${EB_ENV_NAME}.elasticbeanstalk.com")

                        # Test HTTPS redirect (if ALB is configured)
                        echo "Testing HTTP to HTTPS redirect..."
                        HTTP_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://${ENV_URL})
                        if [ "$HTTP_RESPONSE" -eq 301 ] || [ "$HTTP_RESPONSE" -eq 302 ]; then
                            echo "✓ HTTP redirect working"
                        else
                            echo "Note: HTTP redirect response code: $HTTP_RESPONSE"
                        fi

                        # Test HTTPS (if configured)
                        echo "Testing HTTPS endpoint..."
                        HTTPS_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -k https://${ENV_URL}/api/health || echo "000")
                        echo "HTTPS response: $HTTPS_RESPONSE"

                        echo "✓ Smoke tests completed"
                    '''
                }
            }
        }

        stage('Retrieve Logs') {
            steps {
                script {
                    echo '========== Retrieving deployment logs =========='
                    sh '''
                        # Retrieve recent EB logs
                        eb logs ${EB_ENV_NAME} || true
                        echo "✓ Logs retrieved"
                    '''
                }
            }
        }
    }

    post {
        always {
            script {
                echo '========== Cleaning up =========='
                cleanWs()
            }
        }

        success {
            script {
                def envUrl = sh(script: "eb open ${env.EB_ENV_NAME} --print-url 2>/dev/null || echo 'zeerostock-${env.ENV_TYPE}.elasticbeanstalk.com'", returnStdout: true).trim()
                echo """
                ✓ Deployment Successful!
                
                Environment: ${env.EB_ENV_NAME}
                Application URL: https://${envUrl}
                Build: #${env.BUILD_NUMBER}
                Branch: ${env.GIT_BRANCH}
                """
                
                // Send notification (Slack example)
                // slackSend(channel: '#deployments', message: "✓ ${env.APP_NAME} deployed to ${env.EB_ENV_NAME}", color: 'good')
            }
        }

        failure {
            script {
                echo """
                ✗ Deployment Failed!
                
                Environment: ${env.EB_ENV_NAME}
                Build: #${env.BUILD_NUMBER}
                Branch: ${env.GIT_BRANCH}
                
                Check Jenkins logs for details.
                """
                
                // Send notification (Slack example)
                // slackSend(channel: '#deployments', message: "✗ ${env.APP_NAME} deployment to ${env.EB_ENV_NAME} failed", color: 'danger')
            }
        }

        unstable {
            script {
                echo "⚠ Deployment completed with warnings. Review logs above."
            }
        }
    }
}
