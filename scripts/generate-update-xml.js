#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Validate required environment variables
 * @returns {{crxBaseUrl: string, extensionId: string}}
 */
function validateEnvironment() {
  const crxBaseUrl = process.env.CRX_BASE_URL;
  const extensionId = process.env.EXTENSION_ID;
  
  if (!crxBaseUrl) {
    console.error('Error: CRX_BASE_URL environment variable not set');
    process.exit(1);
  }
  
  if (!extensionId) {
    console.error('Error: EXTENSION_ID environment variable not set');
    process.exit(1);
  }
  
  return { crxBaseUrl, extensionId };
}

/**
 * Read version from package.json
 * @returns {string}
 */
function readVersion() {
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  
  if (!fs.existsSync(packageJsonPath)) {
    console.error('Error: package.json not found');
    process.exit(1);
  }
  
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  if (!packageJson.version) {
    console.error('Error: version field not found in package.json');
    process.exit(1);
  }
  
  return packageJson.version;
}

/**
 * Generate Chrome update manifest XML
 * @param {string} extensionId - Chrome extension ID
 * @param {string} version - Extension version
 * @param {string} crxUrl - URL to the CRX file
 * @returns {string}
 */
function generateUpdateXML(extensionId, version, crxUrl) {
  return `<?xml version='1.0' encoding='UTF-8'?>
<gupdate xmlns='http://www.google.com/update2/response' protocol='2.0'>
  <app appid='${extensionId}'>
    <updatecheck codebase='${crxUrl}' version='${version}' />
  </app>
</gupdate>
`;
}

/**
 * Main function to generate update manifest
 */
function main() {
  console.log('Generating Chrome update manifest...');
  
  // Validate environment variables
  const { crxBaseUrl, extensionId } = validateEnvironment();
  console.log(`Extension ID: ${extensionId}`);
  console.log(`CRX Base URL: ${crxBaseUrl}`);
  
  // Read version from package.json
  const version = readVersion();
  console.log(`Version: ${version}`);
  
  // Construct CRX URL
  const crxUrl = `${crxBaseUrl}/complaint.crx`;
  console.log(`CRX URL: ${crxUrl}`);
  
  // Generate XML
  const xml = generateUpdateXML(extensionId, version, crxUrl);
  
  // Write to update.xml
  const outputPath = path.join(process.cwd(), 'update.xml');
  fs.writeFileSync(outputPath, xml, 'utf8');
  console.log(`Update manifest written to ${outputPath}`);
}

// Run main function
if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

// Export functions for testing
module.exports = {
  validateEnvironment,
  readVersion,
  generateUpdateXML
};
