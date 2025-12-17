#!/usr/bin/env node

const { execSync } = require('child_process');

function exec(command, options = {}) {
  try {
    return execSync(command, { encoding: 'utf8', ...options }).trim();
  } catch (error) {
    throw new Error(`Command failed: ${command}\n${error.message}`);
  }
}

function main() {
  try {
    console.log('Checking if this is a release PR merge...');

    // Check if we have the required environment variables for PR detection
    const prId = process.env.BITBUCKET_PR_ID;
    const destinationBranch = process.env.BITBUCKET_PR_DESTINATION_BRANCH;
    const sourceBranch = process.env.BITBUCKET_PR_SOURCE_BRANCH;

    if (prId && destinationBranch) {
      console.log(`PR ID: ${prId}`);
      console.log(`Destination Branch: ${destinationBranch}`);
      
      // Only proceed if merging to main
      if (destinationBranch !== 'main') {
        console.log('PR not merging to main. Skipping tag creation.');
        process.exit(0);
      }
      
      // Check if this is a release PR by examining the source branch
      if (sourceBranch) {
        const releasePattern = /^release\/v[0-9]+\.[0-9]+\.[0-9]+$/;
        if (releasePattern.test(sourceBranch)) {
          console.log(`✓ Detected release PR from branch: ${sourceBranch}`);
          
          // Extract version from branch name
          const version = sourceBranch.replace('release/v', '');
          console.log(`Release version: ${version}`);
          
          // Switch to main branch and create tag
          exec('git checkout main');
          exec('git pull origin main');
          
          // Create the tag
          const tagName = `v${version}`;
          
          // Check if tag already exists
          try {
            const existingTags = exec('git tag -l');
            if (existingTags.split('\n').includes(tagName)) {
              console.log(`Tag ${tagName} already exists. Skipping.`);
              process.exit(0);
            }
          } catch (error) {
            // No tags exist, continue
          }
          
          console.log(`Creating release tag: ${tagName}`);
          
          const tagMessage = `Release version ${version}

Automatically created after merging release PR #${prId}
Source branch: ${sourceBranch}
Merged to: ${destinationBranch}`;

          exec(`git tag -a "${tagName}" -m "${tagMessage}"`);
          exec(`git push origin "${tagName}"`);
          
          console.log(`✓ Successfully created and pushed tag: ${tagName}`);
          process.exit(0);
        }
      }
    }

    console.log('Not a release PR merge. Using fallback detection method...');

    // Fallback: Use the existing create-git-tag.js logic
    const createGitTag = require('./create-git-tag.js');
    createGitTag.main();

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { main };