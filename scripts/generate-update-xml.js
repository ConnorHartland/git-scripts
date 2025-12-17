#!/usr/bin/env node

import fs from 'fs';

function readVersion() {
  if (!fs.existsSync('package.json')) {
    throw new Error('package.json not found');
  }
  
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  if (!packageJson.version) {
    throw new Error('Version not found in package.json');
  }
  
  return packageJson.version;
}

function validateEnvironment() {
  const crxBaseUrl = process.env.CRX_BASE_URL;
  const extensionId = process.env.EXTENSION_ID;
  
  if (!crxBaseUrl) {
    throw new Error('CRX_BASE_URL environment variable not set');
  }
  
  if (!extensionId) {
    throw new Error('EXTENSION_ID environment variable not set');
  }
  
  return { crxBaseUrl, extensionId };
}

function generateUpdateXML(extensionId, version, crxUrl) {
  return `<?xml version='1.0' encoding='UTF-8'?>
<gupdate xmlns='http://www.google.com/update2/response' protocol='2.0'>
  <app appid='${extensionId}'>
    <updatecheck codebase='${crxUrl}' version='${version}' />
  </app>
</gupdate>
`;
}

function main() {
  try {
    console.log('Generating Chrome extension update manifest...');
    
    // Read version from package.json
    const version = readVersion();
    console.log(`Version: ${version}`);
    
    // Validate and get environment variables
    const { crxBaseUrl, extensionId } = validateEnvironment();
    console.log(`CRX Base URL: ${crxBaseUrl}`);
    console.log(`Extension ID: ${extensionId}`);
    
    // Generate the CRX URL
    const crxUrl = `${crxBaseUrl}/complaint.crx`;
    
    // Generate the XML
    const xml = generateUpdateXML(extensionId, version, crxUrl);
    
    // Write to update.xml
    fs.writeFileSync('update.xml', xml);
    
    console.log('✓ Successfully generated update.xml');
    console.log('Update manifest contents:');
    console.log(xml);
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

// Run the main function
main();

export { generateUpdateXML, validateEnvironment, readVersion, main };