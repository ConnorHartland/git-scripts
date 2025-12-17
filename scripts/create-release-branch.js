#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function exec(command, options = {}) {
  try {
    return execSync(command, { encoding: 'utf8', ...options }).trim();
  } catch (error) {
    throw new Error(`Command failed: ${command}\n${error.message}`);
  }
}

function main() {
  try {
    // Check if TYPE environment variable is set
    const type = process.env.TYPE;
    if (!type) {
      console.error('Error: TYPE environment variable not set');
      console.error('Usage: TYPE=<Major|Minor|Patch> node scripts/create-release-branch.js');
      process.exit(1);
    }

    // Validate TYPE parameter
    const validTypes = ['Major', 'Minor', 'Patch'];
    if (!validTypes.includes(type)) {
      console.error('Error: TYPE must be one of: Major, Minor, Patch');
      console.error(`Received: ${type}`);
      process.exit(1);
    }

    // Ensure we're on main branch
    const currentBranch = exec('git rev-parse --abbrev-ref HEAD');
    if (currentBranch !== 'main') {
      console.error('Error: Must be on main branch to create release branch');
      console.error(`Current branch: ${currentBranch}`);
      process.exit(1);
    }

    // Ensure working directory is clean
    try {
      exec('git diff-index --quiet HEAD --');
    } catch (error) {
      console.error('Error: Working directory has uncommitted changes');
      process.exit(1);
    }

    // Check if package.json exists
    if (!fs.existsSync('package.json')) {
      console.error('Error: package.json not found in current directory');
      process.exit(1);
    }

    // Read current version from package.json
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const currentVersion = packageJson.version;

    if (!currentVersion) {
      console.error('Error: Could not read version from package.json');
      process.exit(1);
    }

    console.log(`Current version on main: ${currentVersion}`);

    // Parse version components
    const versionParts = currentVersion.split('.');
    if (versionParts.length !== 3) {
      console.error(`Error: Invalid version format in package.json: ${currentVersion}`);
      console.error('Expected format: major.minor.patch (e.g., 1.2.3)');
      process.exit(1);
    }

    const [majorStr, minorStr, patchStr] = versionParts;
    const major = parseInt(majorStr, 10);
    const minor = parseInt(minorStr, 10);
    const patch = parseInt(patchStr, 10);

    // Validate version format
    if (isNaN(major) || isNaN(minor) || isNaN(patch)) {
      console.error(`Error: Invalid version format in package.json: ${currentVersion}`);
      console.error('Expected format: major.minor.patch (e.g., 1.2.3)');
      process.exit(1);
    }

    // Calculate new version based on TYPE
    let newMajor, newMinor, newPatch;
    
    switch (type) {
      case 'Major':
        newMajor = major + 1;
        newMinor = 0;
        newPatch = 0;
        break;
      case 'Minor':
        newMajor = major;
        newMinor = minor + 1;
        newPatch = 0;
        break;
      case 'Patch':
        newMajor = major;
        newMinor = minor;
        newPatch = patch + 1;
        break;
    }

    const newVersion = `${newMajor}.${newMinor}.${newPatch}`;
    const releaseBranch = `release/v${newVersion}`;

    console.log(`New version: ${newVersion}`);
    console.log(`Creating release branch: ${releaseBranch}`);

    // Check if branch already exists
    try {
      exec(`git show-ref --verify --quiet refs/heads/${releaseBranch}`);
      console.error(`Error: Branch ${releaseBranch} already exists`);
      process.exit(1);
    } catch (error) {
      // Branch doesn't exist, which is what we want
    }

    // Create and checkout the new release branch
    exec(`git checkout -b "${releaseBranch}"`);

    // Push the new branch to remote with upstream tracking
    exec(`git push -u origin "${releaseBranch}"`);

    // Export the version for use in subsequent pipeline steps
    const cloneDir = process.env.BITBUCKET_CLONE_DIR || process.cwd();
    const versionEnvPath = path.join(cloneDir, 'version.env');
    fs.writeFileSync(versionEnvPath, `export VERSION=${newVersion}\n`);

    console.log(`Successfully created and pushed branch: ${releaseBranch}`);
    console.log(`Version: ${newVersion}`);
    console.log('Next steps:');
    console.log('  1. Run version bump script to update version numbers');
    console.log('  2. Build and package the extension');
    console.log('  3. Deploy and create PR');

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { main };