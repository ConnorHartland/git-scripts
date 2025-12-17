#!/usr/bin/env node

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import https from 'https';

function exec(command, options = {}) {
  try {
    return execSync(command, { encoding: 'utf8', ...options }).trim();
  } catch (error) {
    throw new Error(`Command failed: ${command}\n${error.message}`);
  }
}

function updateManifestVersion(newVersion) {
  // npm version handles package.json, we just need to sync manifest.json
  const manifestPath = 'src/manifest.json';
  if (fs.existsSync(manifestPath)) {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    manifest.version = newVersion;
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  }
}

// Packaging and update manifest generation moved to separate scripts
// that run in deployment steps where env vars are available
async function createPullRequest(version) {
  const workspace = process.env.BITBUCKET_WORKSPACE;
  const repoSlug = process.env.BITBUCKET_REPO_SLUG;
  const accessToken = process.env.BITBUCKET_ACCESS_TOKEN;
  
  if (!workspace || !repoSlug || !accessToken) {
    throw new Error('Bitbucket environment variables not set');
  }
  
  const prPayload = {
    title: `Release v${version}`,
    description: `Automated release for version ${version}`,
    source: { branch: { name: `release/v${version}` } },
    destination: { branch: { name: 'main' } },
    close_source_branch: false
  };
  
  const options = {
    hostname: 'api.bitbucket.org',
    path: `/2.0/repositories/${workspace}/${repoSlug}/pullrequests`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`
    }
  };
  
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode === 201) {
          console.log('✓ Pull request created successfully');
          resolve();
        } else {
          reject(new Error(`PR creation failed: ${res.statusCode} ${body}`));
        }
      });
    });
    req.on('error', reject);
    req.write(JSON.stringify(prPayload));
    req.end();
  });
}

async function main() {
  try {
    const type = process.env.TYPE;
    if (!type || !['Major', 'Minor', 'Patch'].includes(type)) {
      throw new Error('TYPE must be Major, Minor, or Patch');
    }
    
    // 1. Create release branch
    console.log('Creating release branch...');
    const currentBranch = exec('git rev-parse --abbrev-ref HEAD');
    if (currentBranch !== 'main') throw new Error('Must be on main branch');
    
    // 2. Use npm version to bump and get new version
    console.log(`Bumping version (${type.toLowerCase()})...`);
    const versionType = type.toLowerCase(); // npm expects lowercase
    const newVersion = exec(`npm version ${versionType} --no-git-tag-version`);
    const cleanVersion = newVersion.replace('v', ''); // npm returns v1.2.3, we want 1.2.3
    
    const releaseBranch = `release/v${cleanVersion}`;
    
    // Create and switch to release branch
    exec(`git checkout -b "${releaseBranch}"`);
    
    // Update manifest.json to match package.json
    updateManifestVersion(cleanVersion);
    
    // Commit version changes
    exec('git add package.json');
    if (fs.existsSync('src/manifest.json')) {
      exec('git add src/manifest.json');
    }
    exec(`git commit -m "Bump version to ${cleanVersion}"`);
    exec(`git push -u origin "${releaseBranch}"`);
    
    console.log(`✓ Release branch ${releaseBranch} created and pushed`);
    console.log(`The release pipeline will now run on the ${releaseBranch} branch`);
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

// Run the main function
main();

export { main, createPullRequest };