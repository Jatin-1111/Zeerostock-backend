/**
 * Update all S3 URLs in frontend files
 * Replaces old zeerostock-documents URLs with new zeerostock-assets URLs
 */

const fs = require('fs').promises;
const path = require('path');

// Load the new URLs
const assetUrls = require('./reorganized-asset-urls.json');

const FRONTEND_PATH = path.join(__dirname, '../../Zeerostock-frontend');

// Create URL mapping
const urlMap = {};

// Add asset URLs
for (const [fileName, url] of Object.entries(assetUrls.assets)) {
    // The filename might be URL encoded in the old URLs
    const encodedName = encodeURIComponent(fileName).replace(/%20/g, '%2520');
    urlMap[fileName] = url;
    urlMap[encodedName] = url;
}

// Add category icon URLs
for (const [fileName, url] of Object.entries(assetUrls.categoryIcons)) {
    const encodedName = encodeURIComponent(fileName).replace(/%20/g, '%2520');
    urlMap[fileName] = url;
    urlMap[encodedName] = url;
}

/**
 * Find all TypeScript/JavaScript files in directory
 */
async function findTSFiles(dir, fileList = []) {
    try {
        const files = await fs.readdir(dir, { withFileTypes: true });

        for (const file of files) {
            const filePath = path.join(dir, file.name);

            if (file.isDirectory()) {
                // Skip node_modules, .next, .git
                if (!['node_modules', '.next', '.git', 'dist', 'build'].includes(file.name)) {
                    await findTSFiles(filePath, fileList);
                }
            } else if (file.isFile() && /\.(tsx?|jsx?)$/.test(file.name)) {
                fileList.push(filePath);
            }
        }
    } catch (error) {
        console.error(`Error reading directory ${dir}:`, error.message);
    }

    return fileList;
}

/**
 * Replace URLs in a file
 */
async function updateFileUrls(filePath) {
    try {
        let content = await fs.readFile(filePath, 'utf8');
        let replacements = 0;
        const originalContent = content;

        // Pattern to match old S3 URLs
        const oldDomain = 'zeerostock-documents.s3.ap-south-1.amazonaws.com';

        // Find all occurrences of the old domain
        if (content.includes(oldDomain)) {
            // Replace each occurrence
            const regex = new RegExp(`https://${oldDomain}/(?:Assets|Category%20Icons)/([^?"]+)(?:\\?[^"]*)?`, 'g');

            content = content.replace(regex, (match, fileKey) => {
                // Decode the file key
                const decodedKey = decodeURIComponent(fileKey);

                // Try to find the new URL
                if (urlMap[decodedKey]) {
                    replacements++;
                    return urlMap[decodedKey];
                } else if (urlMap[fileKey]) {
                    replacements++;
                    return urlMap[fileKey];
                }

                // If not found, try without path prefix
                const fileName = decodedKey.split('/').pop();
                if (urlMap[fileName]) {
                    replacements++;
                    return urlMap[fileName];
                }

                console.warn(`No mapping found for: ${decodedKey}`);
                return match;
            });

            if (replacements > 0) {
                await fs.writeFile(filePath, content, 'utf8');
                return replacements;
            }
        }

        return 0;
    } catch (error) {
        console.error(`Error processing ${filePath}:`, error.message);
        return 0;
    }
}

/**
 * Update next.config files
 */
async function updateNextConfig() {
    const configFiles = [
        path.join(FRONTEND_PATH, 'next.config.ts'),
        path.join(FRONTEND_PATH, 'next.config.mjs')
    ];

    let updated = 0;

    for (const configPath of configFiles) {
        try {
            const exists = await fs.access(configPath).then(() => true).catch(() => false);
            if (!exists) continue;

            let content = await fs.readFile(configPath, 'utf8');

            const oldHostname = 'zeerostock-documents.s3.ap-south-1.amazonaws.com';
            const newHostname = 'zeerostock-assets.s3.ap-south-1.amazonaws.com';

            if (content.includes(oldHostname)) {
                content = content.replace(
                    new RegExp(oldHostname, 'g'),
                    newHostname
                );
                await fs.writeFile(configPath, content, 'utf8');
                updated++;
                console.log(`✅ Updated: ${path.basename(configPath)}`);
            }
        } catch (error) {
            console.error(`Error updating ${configPath}:`, error.message);
        }
    }

    return updated;
}

/**
 * Main update function
 */
async function updateUrls() {
    console.log('=================================================');
    console.log('     Update Frontend S3 URLs Script');
    console.log('=================================================\n');
    console.log('Replacing old URLs with new public URLs...\n');

    try {
        // Update next.config files
        console.log('📝 Updating Next.js config files...');
        await updateNextConfig();

        // Find all TS/JS files
        console.log('\n📝 Finding TypeScript/JavaScript files...');
        const files = await findTSFiles(path.join(FRONTEND_PATH, 'src'));
        console.log(`Found ${files.length} files to check\n`);

        // Update each file
        let totalReplacements = 0;
        let filesUpdated = 0;

        for (const file of files) {
            const replacements = await updateFileUrls(file);
            if (replacements > 0) {
                totalReplacements += replacements;
                filesUpdated++;
                const relativePath = path.relative(FRONTEND_PATH, file);
                console.log(`✅ ${relativePath}: ${replacements} URL(s) updated`);
            }
        }

        // Summary
        console.log('\n=================================================');
        console.log('✅ UPDATE COMPLETED!');
        console.log('=================================================\n');
        console.log(`Files processed: ${files.length}`);
        console.log(`Files updated: ${filesUpdated}`);
        console.log(`Total URLs replaced: ${totalReplacements}`);
        console.log('\n=================================================\n');
        console.log('Next Steps:');
        console.log('1. Test your frontend to ensure all images load correctly');
        console.log('2. Delete the .next folder and rebuild:');
        console.log('   rm -rf .next');
        console.log('   npm run build');
        console.log('=================================================\n');

    } catch (error) {
        console.error('\n❌ Update failed:', error.message);
        console.error(error.stack);
        process.exit(1);
    }
}

// Run the update
updateUrls();
