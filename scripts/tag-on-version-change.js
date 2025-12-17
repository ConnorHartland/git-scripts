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

function main() {
  try {
    // Check if we're on main branch
    const currentBranch = exec('git rev-parse --abbrev-ref HEAD');
    if (currentBranch !== 'main') {
      console.error(`Error: Must be on main branch to create release tag`);
      console.error(`Current branch: ${currentBranch}`);
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

    console.log(`Current version in package.json: ${currentVersion}`);

    // Get the previous version from the parent commit
    let previousVersion = '';
    
    try {
      // Check if HEAD~1 exists
      exec('git rev-parse HEAD~1');
      
      try {
        // Check if package.json existed in the previous commit
        const previousPackageJson = exec('git show HEAD~1:package.json');
        const previousPkg = JSON.parse(previousPackageJson);
        previousVersion = previousPkg.version;
        console.log(`Previous version in package.json: ${previousVersion}`);
      } catch (error) {
        console.log('No package.json found in previous commit - treating as initial version');
      }
    } catch (error) {
      console.log('No previous commit found - treating as initial version');
    }

    // If versions are the same, no need to tag
    if (currentVersion === previousVersion) {
      console.log(`Version unchanged (${currentVersion}). No tag needed.`);
      process.exit(0);
    }

    console.log(`Version changed from '${previousVersion}' to '${currentVersion}' - creating tag`);

    const tagName = `v${currentVersion}`;

    // Check if tag already exists
    try {
      const existingTags = exec('git tag -l');
      if (existingTags.split('\n').includes(tagName)) {
        console.log(`Tag ${tagName} already exists. Skipping tag creation.`);
        process.exit(0);
      }
    } catch (error) {
      // No tags exist, continue
    }

    console.log(`Creating git tag: ${tagName}`);

    // Create annotated tag with release information
    const tagMessage = `Release version ${currentVersion}

This tag marks the release of version ${currentVersion}.
Previous version: ${previousVersion}

Created automatically after version change detected on main branch.`;

    exec(`git tag -a "${tagName}" -m "${tagMessage}"`);

    // Push the tag to remote
    exec(`git push origin "${tagName}"`);

    console.log(`✓ Successfully created and pushed tag: ${tagName}`);
    
    // Show tag details
    const tagDetails = exec(`git show --no-patch --format="Tag: %D%nDate: %ad%nMessage: %B" "${tagName}"`);
    console.log('Tag details:');
    console.log(tagDetails);

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

// Run the main function
main();

export { main };