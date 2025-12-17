#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';

function exec(command, options = {}) {
  try {
    return execSync(command, { encoding: 'utf8', ...options }).trim();
  } catch (error) {
    throw new Error(`Command failed: ${command}\n${error.message}`);
  }
}

function packageExtension() {
  const privateKey = process.env.EXTENSION_PRIVATE_KEY;
  if (!privateKey) throw new Error('EXTENSION_PRIVATE_KEY not set');
  
  console.log('Packaging extension with private key...');
  
  const keyData = Buffer.from(privateKey, 'base64');
  fs.writeFileSync('key.pem', keyData);
  
  try {
    exec('crx3 pack dist/ -p key.pem -o complaint.crx');
    console.log('✓ Successfully created complaint.crx');
  } finally {
    if (fs.existsSync('key.pem')) {
      fs.unlinkSync('key.pem');
      console.log('✓ Cleaned up private key file');
    }
  }
}

// Run the packaging function
packageExtension();

export { packageExtension };