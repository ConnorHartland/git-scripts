#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');

function exec(command, options = {}) {
  try {
    return execSync(command, { encoding: 'utf8', ...options }).trim();
  } catch (error) {
    throw new Error(`Command failed: ${command}\n${error.message}`);
  }
}

function main() {
  let keyFilePath = null;
  
  try {
    // Check if EXTENSION_PRIVATE_KEY environment variable exists
    const privateKey = process.env.EXTENSION_PRIVATE_KEY;
    if (!privateKey) {
      console.error('Error: EXTENSION_PRIVATE_KEY environment variable not set');
      process.exit(1);
    }

    // Decode base64 key to key.pem
    keyFilePath = 'key.pem';
    const keyData = Buffer.from(privateKey, 'base64');
    fs.writeFileSync(keyFilePath, keyData);

    // Run crx3 pack
    exec('crx3 pack dist/ -p key.pem -o complaint.crx');

    console.log('Extension packaged successfully as complaint.crx');

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    // Ensure key.pem is removed (cleanup)
    if (keyFilePath && fs.existsSync(keyFilePath)) {
      try {
        fs.unlinkSync(keyFilePath);
      } catch (cleanupError) {
        console.warn(`Warning: Could not remove ${keyFilePath}: ${cleanupError.message}`);
      }
    }
  }
}

if (require.main === module) {
  main();
}

module.exports = { main };