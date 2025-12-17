#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Parse semantic version string into components
 * @param {string} version - Version string (e.g., "1.2.3")
 * @returns {{major: number, minor: number, patch: number}}
 */
function parseVersion(version) {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) {
    throw new Error(`Invalid version format: ${version}. Expected format: major.minor.patch`);
  }
  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10)
  };
}

/**
 * Increment version based on type
 * @param {{major: number, minor: number, patch: number}} version
 * @param {string} type - 'major', 'minor', or 'patch'
 * @returns {{major: number, minor: number, patch: number}}
 */
function incrementVersion(version, type) {
  const newVersion = { ...version };
  
  switch (type) {
    case 'major':
      newVersion.major += 1;
      newVersion.minor = 0;
      newVersion.patch = 0;
      break;
    case 'minor':
      newVersion.minor += 1;
      newVersion.patch = 0;
      break;
    case 'patch':
      newVersion.patch += 1;
      break;
    default:
      throw new Error(`Invalid version type: ${type}. Must be 'major', 'minor', or 'patch'`);
  }
  
  return newVersion;
}

/**
 * Convert version object to string
 * @param {{major: number, minor: number, patch: number}} version
 * @returns {string}
 */
function versionToString(version) {
  return `${version.major}.${version.minor}.${version.patch}`;
}

/**
 * Main function to bump version
 */
function main() {
  // Parse command line arguments
  const args = process.argv.slice(2);
  
  // Check if version is provided as argument
  if (args.length === 0) {
    console.error('Error: Version parameter is required');
    console.error('Usage: node bump-version.js <version>');
    console.error('Example: node bump-version.js 1.2.3');
    process.exit(1);
  }
  
  const newVersionString = args[0];
  
  // Validate version format
  try {
    parseVersion(newVersionString);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
  
  console.log(`Setting version to: ${newVersionString}`);
  
  // Define file paths
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  const srcManifestJsonPath = path.join(process.cwd(), 'src', 'manifest.json');
  
  // Check if package.json exists
  if (!fs.existsSync(packageJsonPath)) {
    console.error('Error: package.json not found');
    process.exit(1);
  }
  
  // Read and parse package.json
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const oldVersion = packageJson.version || 'unknown';
  console.log(`Current version: ${oldVersion}`);
  
  // Update package.json
  packageJson.version = newVersionString;
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n', 'utf8');
  console.log('Updated package.json');
  
  // Update src/manifest.json if it exists
  if (fs.existsSync(srcManifestJsonPath)) {
    const manifestJson = JSON.parse(fs.readFileSync(srcManifestJsonPath, 'utf8'));
    manifestJson.version = newVersionString;
    fs.writeFileSync(srcManifestJsonPath, JSON.stringify(manifestJson, null, 2) + '\n', 'utf8');
    console.log('Updated src/manifest.json');
  } else {
    console.warn('Warning: src/manifest.json not found, skipping manifest update');
  }
  
  // Commit changes
  try {
    execSync('git add package.json', { stdio: 'inherit' });
    
    if (fs.existsSync(srcManifestJsonPath)) {
      execSync('git add src/manifest.json', { stdio: 'inherit' });
    }
    
    execSync(`git commit -m "Bump version to ${newVersionString}"`, { stdio: 'inherit' });
    console.log(`Committed version bump to ${newVersionString}`);
    
    // Push changes to remote
    try {
      execSync('git push origin HEAD', { stdio: 'inherit' });
      console.log('Pushed changes to remote');
    } catch (pushError) {
      console.error('Warning: Failed to push changes to remote');
      console.error(pushError.message);
      console.error('You may need to push manually');
    }
  } catch (error) {
    console.error('Error: Failed to commit changes');
    console.error(error.message);
    process.exit(1);
  }
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
  parseVersion,
  incrementVersion,
  versionToString
};
