#!/usr/bin/env node

const https = require('https');

function makeRequest(options, data) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          body: body
        });
      });
    });

    req.on('error', reject);
    
    if (data) {
      req.write(data);
    }
    
    req.end();
  });
}

async function main() {
  try {
    // Check if VERSION environment variable is set
    const version = process.env.VERSION;
    if (!version) {
      console.error('Error: VERSION environment variable not set');
      console.error('Usage: VERSION=<version> node scripts/create-pr.js');
      process.exit(1);
    }

    // Validate VERSION format (semantic versioning: major.minor.patch)
    const versionRegex = /^[0-9]+\.[0-9]+\.[0-9]+$/;
    if (!versionRegex.test(version)) {
      console.error('Error: VERSION must follow semantic versioning format (e.g., 1.2.3)');
      console.error(`Received: ${version}`);
      process.exit(1);
    }

    // Check required environment variables for Bitbucket API
    const workspace = process.env.BITBUCKET_WORKSPACE;
    const repoSlug = process.env.BITBUCKET_REPO_SLUG;

    if (!workspace) {
      console.error('Error: BITBUCKET_WORKSPACE environment variable not set');
      process.exit(1);
    }

    if (!repoSlug) {
      console.error('Error: BITBUCKET_REPO_SLUG environment variable not set');
      process.exit(1);
    }

    // Bitbucket credentials - try multiple sources
    let authHeader;
    const accessToken = process.env.BITBUCKET_ACCESS_TOKEN;
    const username = process.env.BITBUCKET_USERNAME;
    const appPassword = process.env.BITBUCKET_APP_PASSWORD;

    if (accessToken) {
      authHeader = `Bearer ${accessToken}`;
    } else if (username && appPassword) {
      const credentials = Buffer.from(`${username}:${appPassword}`).toString('base64');
      authHeader = `Basic ${credentials}`;
    } else {
      console.error('Error: Bitbucket authentication not configured');
      console.error('Set either:');
      console.error('  - BITBUCKET_ACCESS_TOKEN, or');
      console.error('  - BITBUCKET_USERNAME and BITBUCKET_APP_PASSWORD');
      process.exit(1);
    }

    const releaseBranch = `release/v${version}`;
    const targetBranch = 'main';
    const prTitle = `Release v${version}`;
    const prDescription = `Automated release for version ${version}

This PR merges the release branch back into main to keep version numbers synchronized.

## Changes
- Version bumped to ${version}
- Extension built and packaged
- Deployed to dev and prod environments

Please review and merge to complete the release process.`;

    console.log('Creating pull request...');
    console.log(`  Source branch: ${releaseBranch}`);
    console.log(`  Target branch: ${targetBranch}`);
    console.log(`  Title: ${prTitle}`);

    // Prepare JSON payload for Bitbucket API
    const prPayload = {
      title: prTitle,
      description: prDescription,
      source: {
        branch: {
          name: releaseBranch
        }
      },
      destination: {
        branch: {
          name: targetBranch
        }
      },
      close_source_branch: false
    };

    // Bitbucket API request options
    const options = {
      hostname: 'api.bitbucket.org',
      port: 443,
      path: `/2.0/repositories/${workspace}/${repoSlug}/pullrequests`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader
      }
    };

    // Make API request
    const response = await makeRequest(options, JSON.stringify(prPayload));

    // Check if request was successful
    if (response.statusCode === 201) {
      console.log('✓ Pull request created successfully!');
      
      try {
        const responseData = JSON.parse(response.body);
        
        if (responseData.id) {
          console.log(`  PR ID: ${responseData.id}`);
        }
        
        if (responseData.links && responseData.links.html && responseData.links.html.href) {
          console.log(`  PR URL: ${responseData.links.html.href}`);
        }
      } catch (parseError) {
        console.log('  (Could not parse response for details)');
      }
    } else {
      console.error('✗ Failed to create pull request');
      console.error(`  HTTP Status: ${response.statusCode}`);
      console.error(`  Response: ${response.body}`);
      process.exit(1);
    }

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { main };