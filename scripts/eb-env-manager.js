#!/usr/bin/env node

/**
 * Elastic Beanstalk Environment Variable Manager
 * A Node.js script to manage EB environment variables
 * 
 * Requirements: AWS SDK for JavaScript v3
 * Install: npm install @aws-sdk/client-elastic-beanstalk
 * 
 * Usage:
 *   node scripts/eb-env-manager.js set <env-name> [--file .env]
 *   node scripts/eb-env-manager.js get <env-name>
 *   node scripts/eb-env-manager.js delete <env-name> <key1> [key2...]
 */

const fs = require('fs');
const path = require('path');

// Check if AWS SDK is available
let ElasticBeanstalkClient, UpdateEnvironmentCommand, DescribeConfigurationSettingsCommand;
try {
    const { ElasticBeanstalkClient: EBClient, UpdateEnvironmentCommand: UpdateCmd, DescribeConfigurationSettingsCommand: DescribeCmd } = require('@aws-sdk/client-elastic-beanstalk');
    ElasticBeanstalkClient = EBClient;
    UpdateEnvironmentCommand = UpdateCmd;
    DescribeConfigurationSettingsCommand = DescribeCmd;
} catch (error) {
    console.error('\x1b[31m%s\x1b[0m', 'Error: @aws-sdk/client-elastic-beanstalk is not installed');
    console.log('Install it with: npm install @aws-sdk/client-elastic-beanstalk');
    process.exit(1);
}

// Parse command line arguments
const args = process.argv.slice(2);
const command = args[0];
const envName = args[1];

// Colors
const colors = {
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    cyan: '\x1b[36m',
    reset: '\x1b[0m'
};

// Helper functions
function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function parseEnvFile(filePath) {
    if (!fs.existsSync(filePath)) {
        log(`Error: ${filePath} not found!`, 'red');
        process.exit(1);
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const envVars = {};

    lines.forEach(line => {
        line = line.trim();

        // Skip empty lines and comments
        if (!line || line.startsWith('#')) return;

        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
            let key = match[1].trim();
            let value = match[2].trim();

            // Remove quotes
            value = value.replace(/^["']|["']$/g, '');

            envVars[key] = value;
        }
    });

    return envVars;
}

async function setEnvironmentVariables(environmentName, filePath = '.env') {
    log(`Setting environment variables for: ${environmentName}`, 'green');

    const envVars = parseEnvFile(filePath);
    const keys = Object.keys(envVars);

    if (keys.length === 0) {
        log('No environment variables found', 'yellow');
        return;
    }

    log(`\nFound ${keys.length} variables:`, 'cyan');
    keys.forEach(key => log(`  - ${key}`, 'cyan'));

    // Create option settings
    const optionSettings = keys.map(key => ({
        Namespace: 'aws:elasticbeanstalk:application:environment',
        OptionName: key,
        Value: envVars[key]
    }));

    try {
        const client = new ElasticBeanstalkClient({ region: process.env.AWS_REGION || 'ap-south-1' });

        log('\nUploading to Elastic Beanstalk...', 'yellow');

        const command = new UpdateEnvironmentCommand({
            EnvironmentName: environmentName,
            OptionSettings: optionSettings
        });

        await client.send(command);

        log('\n✓ Success! Environment variables have been set.', 'green');
        log('Note: The environment will restart to apply changes.', 'yellow');

    } catch (error) {
        log(`\nError: ${error.message}`, 'red');
        process.exit(1);
    }
}

async function getEnvironmentVariables(environmentName) {
    log(`Fetching environment variables for: ${environmentName}`, 'green');

    try {
        const client = new ElasticBeanstalkClient({ region: process.env.AWS_REGION || 'ap-south-1' });

        const command = new DescribeConfigurationSettingsCommand({
            EnvironmentName: environmentName
        });

        const response = await client.send(command);

        if (!response.ConfigurationSettings || response.ConfigurationSettings.length === 0) {
            log('No configuration found', 'yellow');
            return;
        }

        const settings = response.ConfigurationSettings[0].OptionSettings;
        const envVars = settings.filter(s =>
            s.Namespace === 'aws:elasticbeanstalk:application:environment'
        );

        log(`\nFound ${envVars.length} environment variables:\n`, 'green');

        envVars.forEach(setting => {
            const value = setting.Value.length > 50
                ? setting.Value.substring(0, 47) + '...'
                : setting.Value;
            log(`${setting.OptionName}=${value}`, 'cyan');
        });

    } catch (error) {
        log(`\nError: ${error.message}`, 'red');
        process.exit(1);
    }
}

async function deleteEnvironmentVariables(environmentName, keys) {
    log(`Deleting environment variables from: ${environmentName}`, 'green');
    log(`Keys to delete: ${keys.join(', ')}`, 'yellow');

    try {
        const client = new ElasticBeanstalkClient({ region: process.env.AWS_REGION || 'ap-south-1' });

        // Set values to empty string to delete
        const optionSettings = keys.map(key => ({
            Namespace: 'aws:elasticbeanstalk:application:environment',
            OptionName: key,
            Value: ''
        }));

        const command = new UpdateEnvironmentCommand({
            EnvironmentName: environmentName,
            OptionSettings: optionSettings
        });

        await client.send(command);

        log('\n✓ Success! Variables have been deleted.', 'green');

    } catch (error) {
        log(`\nError: ${error.message}`, 'red');
        process.exit(1);
    }
}

// Main
async function main() {
    if (!command || !envName) {
        console.log('Elastic Beanstalk Environment Variable Manager\n');
        console.log('Usage:');
        console.log('  Set variables:    node scripts/eb-env-manager.js set <env-name> [--file .env]');
        console.log('  Get variables:    node scripts/eb-env-manager.js get <env-name>');
        console.log('  Delete variables: node scripts/eb-env-manager.js delete <env-name> <key1> [key2...]\n');
        console.log('Examples:');
        console.log('  node scripts/eb-env-manager.js set zeerostock-backend-prod');
        console.log('  node scripts/eb-env-manager.js set zeerostock-backend-prod --file .env.production');
        console.log('  node scripts/eb-env-manager.js get zeerostock-backend-prod');
        console.log('  node scripts/eb-env-manager.js delete zeerostock-backend-prod JWT_SECRET NODE_ENV');
        process.exit(1);
    }

    switch (command.toLowerCase()) {
        case 'set':
            const fileIndex = args.indexOf('--file');
            const filePath = fileIndex !== -1 ? args[fileIndex + 1] : '.env';
            await setEnvironmentVariables(envName, filePath);
            break;

        case 'get':
            await getEnvironmentVariables(envName);
            break;

        case 'delete':
            const keysToDelete = args.slice(2);
            if (keysToDelete.length === 0) {
                log('Error: No keys specified for deletion', 'red');
                process.exit(1);
            }
            await deleteEnvironmentVariables(envName, keysToDelete);
            break;

        default:
            log(`Unknown command: ${command}`, 'red');
            process.exit(1);
    }
}

main().catch(console.error);
