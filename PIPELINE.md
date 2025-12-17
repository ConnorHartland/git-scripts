# Chrome Extension CI/CD Pipeline Documentation

## Overview

This document describes the automated CI/CD pipeline for the Chrome extension built with Vite. The pipeline uses Bitbucket Pipelines with a manual release trigger to automate release branch creation, version management, building, packaging, deployment, and PR creation.

## Pipeline Workflow

The release workflow follows these steps:

1. **Manual Trigger** - Developer triggers `create-release` pipeline with version type
2. **Branch Creation** - Creates `release/v{version}` branch from main
3. **Version Bump** - Updates version in package.json and manifest.json
4. **Build & Package** - Compiles extension and creates signed CRX file
5. **Deploy to Dev** - Automatically deploys to development environment
6. **Deploy to Prod** - Manual approval required for production deployment
7. **Create PR** - Automatically creates pull request to merge back to main

## Triggering the Release Pipeline

### How to Trigger

1. Navigate to your repository in Bitbucket
2. Go to **Pipelines** in the left sidebar
3. Click **Run pipeline**
4. Select **Custom: create-release** from the pipeline dropdown
5. Choose the **TYPE** parameter value:
   - **Major** - For breaking changes (1.0.0 → 2.0.0)
   - **Minor** - For new features (1.0.0 → 1.1.0)
   - **Patch** - For bug fixes (1.0.0 → 1.0.1)
6. Click **Run**

### TYPE Parameter Options

| Type | Description | Example |
|------|-------------|---------|
| `Major` | Breaking changes, incompatible API changes | 1.2.3 → 2.0.0 |
| `Minor` | New features, backwards compatible | 1.2.3 → 1.3.0 |
| `Patch` | Bug fixes, backwards compatible | 1.2.3 → 1.2.4 |

The pipeline follows [Semantic Versioning](https://semver.org/) conventions.

## Required Environment Variables

The following environment variables must be configured in your Bitbucket repository settings:

### EXTENSION_PRIVATE_KEY
- **Purpose**: Private key for signing the Chrome extension CRX package
- **Format**: Base64-encoded PEM private key
- **Security**: Store as a **Secured** variable in Bitbucket

### CRX_BASE_URL
- **Purpose**: Base URL where the CRX files will be hosted for auto-updates
- **Format**: HTTPS URL (e.g., `https://your-domain.com/extensions/`)
- **Example**: `https://example.s3.amazonaws.com/chrome-extension/`

### EXTENSION_ID
- **Purpose**: Chrome extension ID for the update manifest
- **Format**: 32-character extension ID from Chrome Web Store
- **Example**: `abcdefghijklmnopqrstuvwxyz123456`

### S3_BUCKET
- **Purpose**: AWS S3 bucket name for storing extension files
- **Format**: S3 bucket name
- **Example**: `my-extension-releases`

### Setting Environment Variables in Bitbucket

1. Go to your repository in Bitbucket
2. Navigate to **Repository settings** → **Pipelines** → **Repository variables**
3. Add each variable:
   - Name: Variable name (e.g., `EXTENSION_PRIVATE_KEY`)
   - Value: Variable value
   - **Important**: Check **Secured** for sensitive variables like `EXTENSION_PRIVATE_KEY`

## Private Key Setup

### Generating a Private Key

If you don't have a private key for your extension:

```bash
# Generate a new private key
openssl genrsa -out extension-key.pem 2048
```

### Base64 Encoding the Private Key

The `EXTENSION_PRIVATE_KEY` environment variable must contain the base64-encoded private key:

```bash
# Encode your private key to base64
base64 -i extension-key.pem | tr -d '\n'
```

**Example workflow:**
```bash
# 1. Generate key (if needed)
openssl genrsa -out extension-key.pem 2048

# 2. Encode to base64 (copy this output)
base64 -i extension-key.pem | tr -d '\n'

# 3. Store the base64 output in Bitbucket as EXTENSION_PRIVATE_KEY
# 4. Delete the local key file for security
rm extension-key.pem
```

**Security Note**: Never commit the private key file to your repository. Always store it as a secured environment variable in Bitbucket.

## Pipeline Steps Explained

### 1. Create Release Branch
- Reads current version from `package.json` on main branch
- Calculates new version based on TYPE parameter
- Creates `release/v{new_version}` branch
- Checks out the new release branch

### 2. Version Bump
- Updates version in `package.json`
- Updates version in `src/manifest.json` (or manifest source)
- Commits changes with message "Bump version to X.Y.Z"
- Pushes changes to remote release branch

### 3. Build Extension
- Runs `npm install` to install dependencies
- Runs `npm run build` to compile the extension
- Produces `dist/` directory with compiled assets

### 4. Package Extension
- Decodes `EXTENSION_PRIVATE_KEY` from base64
- Uses `crx3` tool to create signed CRX package
- Produces `complaint.crx` file
- Cleans up temporary key file

### 5. Generate Update Manifest
- Reads version from `package.json`
- Creates Chrome update manifest XML
- Includes extension ID and CRX download URL
- Produces `update.xml` file

### 6. Deploy to Dev (Automatic)
- Uploads `complaint.crx` to dev environment
- Uploads `update.xml` to dev environment
- Outputs accessible URLs for testing

### 7. Deploy to Prod (Manual)
- **Requires manual approval** in Bitbucket Pipelines UI
- Uploads `complaint.crx` to production environment
- Uploads `update.xml` to production environment
- Outputs production URLs

### 8. Create Pull Request
- Creates PR from `release/v{version}` to `main`
- Sets title to "Release v{version}"
- Includes version information in description

## Pull Request Merge Process

### After Pipeline Completion

1. **Review the PR**: A pull request will be automatically created from the release branch to main
2. **Test the Release**: Use the dev environment URLs to test the extension
3. **Approve Production**: If testing passes, approve the production deployment step in Bitbucket Pipelines
4. **Review PR Changes**: The PR will contain:
   - Updated version in `package.json`
   - Updated version in `manifest.json`
   - Any other changes made during the release process

### Merging the PR

1. **Code Review**: Have team members review the version changes
2. **Merge Strategy**: For release branches merging back to main, use **Merge commit**:
   - **Why Merge commit**: Preserves the complete release history and individual commits made during the release process
   - **Avoid Squash**: Squashing would lose the detailed history of version bumps, build changes, and other release-specific commits
   - **Avoid Fast-forward**: While cleaner, it doesn't clearly mark the release merge point in history
   - Release branches contain important historical context that should be preserved
3. **Clean Up**: Delete the release branch after successful merge

### Bitbucket Merge Strategy Options

**For Release Branches → Main:**
- ✅ **Merge commit** - Recommended for releases
- ❌ **Squash** - Loses important release commit history  
- ❌ **Fast-forward** - Doesn't mark the merge point clearly

**For Feature Branches → Main:**
- ❌ **Merge commit** - Creates unnecessary merge commits
- ✅ **Squash** - Recommended for clean history
- ⚠️ **Fast-forward** - Only available for linear history (rare)

### Post-Merge

After merging the PR:
- Main branch will have the updated version numbers
- The release is complete and deployed to production
- Chrome users will receive the update automatically (if auto-update is configured)

## Troubleshooting

### Common Issues

**Pipeline fails at "Create release branch" step:**
- Check that main branch exists and is accessible
- Verify git permissions for the pipeline

**Pipeline fails at "Package extension" step:**
- Verify `EXTENSION_PRIVATE_KEY` is set and properly base64-encoded
- Check that `crx3` tool is available in the pipeline environment

**Pipeline fails at "Deploy" steps:**
- Verify AWS credentials are configured
- Check that `S3_BUCKET` exists and is accessible
- Ensure bucket permissions allow public read access for CRX files

**Update manifest not working:**
- Verify `EXTENSION_ID` matches your Chrome Web Store extension
- Check that `CRX_BASE_URL` is accessible via HTTPS
- Ensure `update.xml` is served with correct MIME type

### Getting Help

If you encounter issues:
1. Check the pipeline logs in Bitbucket for specific error messages
2. Verify all environment variables are set correctly
3. Test individual scripts locally if possible
4. Review the Chrome extension documentation for update manifest requirements

## Security Best Practices

1. **Private Key Security**:
   - Never commit private keys to the repository
   - Use Bitbucket's secured variables for `EXTENSION_PRIVATE_KEY`
   - Regularly rotate private keys if compromised

2. **Environment Variables**:
   - Mark sensitive variables as "Secured" in Bitbucket
   - Limit access to repository settings
   - Audit who has access to pipeline variables

3. **Deployment Security**:
   - Use HTTPS for all CRX and update manifest URLs
   - Implement proper S3 bucket policies
   - Consider using signed URLs for additional security

4. **Code Review**:
   - Always review PRs before merging to main
   - Verify version numbers are correct
   - Check that no sensitive information is committed