# Design Document

## Overview

This design describes an automated CI/CD pipeline for a Chrome extension built with Vite. The pipeline uses Bitbucket Pipelines with a manual release trigger to automate release branch creation, version management, building, packaging, deployment, and PR creation. The workflow is initiated manually with a version type parameter, creating a complete release flow from branch creation through production deployment and back-merge to main.

## Architecture

The pipeline follows a manual-trigger release workflow:

```
Manual Trigger (create-release with TYPE: Major/Minor/Patch)
    ↓
Create release/v{version} branch from main
    ↓
Bump version on release branch
    ↓
Build & Package
    ↓
Deploy to Dev (automatic)
    ↓
Deploy to Prod (manual approval)
    ↓
Create PR: release/v{version} → main
```

### Pipeline Structure

The bitbucket-pipelines.yml will define a custom pipeline:

**create-release Pipeline** (manually triggered)
   - Calculate new version based on TYPE parameter
   - Create and checkout release branch
   - Update version in package.json and manifest.json
   - Commit and push version changes
   - Build the extension
   - Package as CRX
   - Generate update manifest XML
   - Deploy to dev environment
   - Deploy to prod environment (manual trigger)
   - Create pull request back to main
   - Store artifacts

### Build Environment

- Node.js environment with npm
- crx3 CLI tool for packaging
- Base64 decoding capability for key management
- Git for branch creation, version commits, and PR creation
- Bitbucket API access for PR creation
- AWS CLI for S3 deployment (or alternative storage)

## Components and Interfaces

### 1. Bitbucket Pipeline Configuration (bitbucket-pipelines.yml)

The main configuration file that orchestrates the release workflow.

**Structure:**
```yaml
pipelines:
  custom:
    create-release:
      - variables:
          - name: TYPE
            allowed-values:
              - Major
              - Minor
              - Patch
      - step: create-release-branch
      - step: build-and-package
      - step: deploy-to-dev
      - step: deploy-to-prod (manual)
      - step: create-pull-request
```

**Responsibilities:**
- Define custom release pipeline with TYPE parameter
- Create and manage release branches
- Configure build environment
- Manage step execution order
- Handle deployments with manual approval
- Create PR for back-merge
- Handle artifact storage

### 2. Release Branch Creation Script

A bash/Node.js script that creates the release branch with proper versioning.

**Inputs:**
- TYPE parameter (Major/Minor/Patch)
- Current package.json from main branch

**Outputs:**
- New release branch named release/v{version}
- Checked out release branch

**Interface:**
```bash
# scripts/create-release-branch.sh
# Read current version from package.json
# Calculate new version based on TYPE
# Create branch: release/v{new_version}
# Checkout the new branch
```

### 3. Version Bump Script

A Node.js script that updates version numbers on the release branch.

**Inputs:**
- New version number (calculated from TYPE parameter)
- package.json on release branch
- manifest.json source (before build)

**Outputs:**
- Updated package.json with new version
- Updated manifest.json with new version
- Git commit with version changes
- Pushed release branch

**Interface:**
```javascript
// scripts/bump-version.js
function bumpVersion(newVersion) {
  // Update package.json with newVersion
  // Update src/manifest.json with newVersion
  // Commit changes
  // Push to remote
}
```

### 4. Build Process

Uses Vite's build system to compile the extension.

**Inputs:**
- Source code with updated version
- package.json dependencies
- Vite configuration

**Outputs:**
- dist/ directory with compiled assets
- dist/manifest.json with correct version

**Commands:**
```bash
npm install
npm run build
```

### 5. CRX Packaging

Uses crx3 tool to create signed extension package.

**Inputs:**
- dist/ directory (built extension)
- key.pem (decoded private key)

**Outputs:**
- complaint.crx (signed extension package)

**Commands:**
```bash
echo "$EXTENSION_PRIVATE_KEY" | base64 -d > key.pem
crx3 pack dist/ -p key.pem -o complaint.crx
```

### 6. Update Manifest Generator

A Node.js script that generates Chrome's update manifest XML.

**Inputs:**
- Current version from package.json
- CRX file location/URL
- Extension ID

**Outputs:**
- update.xml file

**Interface:**
```javascript
// scripts/generate-update-xml.js
function generateUpdateXML() {
  // Read version from package.json
  // Get CRX URL (from environment or config)
  // Generate XML following Chrome's schema
  // Write to update.xml
}
```

**XML Schema:**
```xml
<?xml version='1.0' encoding='UTF-8'?>
<gupdate xmlns='http://www.google.com/update2/response' protocol='2.0'>
  <app appid='EXTENSION_ID'>
    <updatecheck codebase='CRX_URL' version='VERSION' />
  </app>
</gupdate>
```

### 7. Deployment Scripts

Scripts to deploy the extension package and update manifest to storage.

**Inputs:**
- complaint.crx file
- update.xml file
- Environment (dev or prod)
- Storage configuration (S3 bucket, etc.)

**Outputs:**
- Files uploaded to storage
- Public URLs for access

**Commands:**
```bash
# Deploy to S3 (example)
aws s3 cp complaint.crx s3://${S3_BUCKET}/complaint.crx --acl public-read
aws s3 cp update.xml s3://${S3_BUCKET}/update.xml --acl public-read
```

### 8. Pull Request Creation Script

A script that uses Bitbucket API to create a PR from release branch to main.

**Inputs:**
- Release branch name
- Version number
- Bitbucket credentials/token

**Outputs:**
- Created pull request

**Interface:**
```bash
# scripts/create-pr.sh
# Use Bitbucket API to create PR
# Title: "Release v{version}"
# Source: release/v{version}
# Destination: main
```

## Data Models

### Version Information

```typescript
interface Version {
  major: number;
  minor: number;
  patch: number;
  toString(): string; // "1.2.3"
}
```

### Package Manifest

```typescript
interface PackageJson {
  name: string;
  version: string;
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  scripts: Record<string, string>;
}
```

### Chrome Extension Manifest

```typescript
interface ChromeManifest {
  manifest_version: number;
  name: string;
  version: string;
  description: string;
  // ... other Chrome extension fields
}
```

### Update Manifest

```typescript
interface UpdateManifest {
  extensionId: string;
  version: string;
  crxUrl: string;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property Reflection

Reviewing the testable properties identified in prework:

**Redundancies identified:**
- Properties 3.1 and 3.2 (version update in package.json and manifest.json) are both covered by property 3.3 (both files have identical versions after bump)
- Properties 6.2 and 6.3 can be combined into a single comprehensive property about update manifest content

**Consolidated properties:**
- Version consistency (3.3) subsumes individual file version checks (3.1, 3.2)
- Update manifest completeness combines version reading (6.2) and URL inclusion (6.3)

### Testable Properties

Property 1: Version increment correctness
*For any* valid semantic version and increment type (Major, Minor, Patch), the version increment function should produce the correct next version according to semver rules
**Validates: Requirements 2.2**

Property 2: Release branch naming
*For any* valid version number, the release branch name should follow the pattern release/v{version}
**Validates: Requirements 2.3**

Property 3: Semantic version format
*For any* version generated by the version calculation, the version string should match the semantic versioning pattern (major.minor.patch where each component is a non-negative integer)
**Validates: Requirements 2.5**

Property 4: Version consistency after bump
*For any* valid package.json and manifest.json pair, after running the version bump script, both files should contain identical version strings
**Validates: Requirements 3.1, 3.2, 3.3**

Property 5: Update manifest completeness
*For any* valid package.json with a version, the generated update manifest XML should contain both that version number and a non-empty CRX URL
**Validates: Requirements 6.2, 6.3**

Property 6: Update manifest XML validity
*For any* generated update manifest, it should be valid XML that conforms to Chrome's update manifest schema (gupdate root element with app and updatecheck children)
**Validates: Requirements 6.4**

Property 7: PR title formatting
*For any* valid version number, the generated PR title should be "Release v{version}"
**Validates: Requirements 10.2**

Property 8: Required environment variable validation
*For any* script that depends on environment variables, executing without required variables should fail with a clear error message before attempting dependent operations
**Validates: Requirements 11.4**

Property 9: Required tool validation
*For any* script that depends on external tools (npm, crx3, node), executing without required tools available should fail with a clear error message before attempting dependent operations
**Validates: Requirements 11.5**

### Example Test Cases

Example 1: Version extraction from package.json
Given a valid package.json file, the version reading function should correctly extract the version string
**Validates: Requirements 2.1**

Example 2: Build output structure
Given a successful build execution, the dist/ directory should exist and contain a valid manifest.json file with the updated version
**Validates: Requirements 4.4**

Example 3: CRX package creation
Given a built dist/ directory and valid key.pem file, the packaging process should produce a complaint.crx file
**Validates: Requirements 5.4**

Example 4: PR creation after deployment
Given a successful prod deployment, a pull request should be created from the release branch to main
**Validates: Requirements 10.1**

## Error Handling

### Build Failures

**Scenario:** npm install or npm run build fails

**Handling:**
- Pipeline step exits with non-zero code
- Bitbucket Pipelines halts execution
- Error output displayed in pipeline logs
- No subsequent steps execute

### Missing Environment Variables

**Scenario:** EXTENSION_PRIVATE_KEY not set

**Handling:**
- Validation script checks for variable before use
- Script exits with error code 1
- Clear error message: "EXTENSION_PRIVATE_KEY environment variable not set"
- Pipeline halts before attempting key operations

### Invalid Private Key

**Scenario:** EXTENSION_PRIVATE_KEY cannot be decoded or is invalid

**Handling:**
- Base64 decode failure caught
- Script exits with error code 1
- Error message indicates decode failure
- No key.pem file created

### CRX Packaging Failure

**Scenario:** crx3 tool fails to package extension

**Handling:**
- crx3 command exits with non-zero code
- Pipeline step fails
- crx3 error output captured in logs
- No complaint.crx file created

### Version Bump Conflicts

**Scenario:** Git commit fails due to conflicts or permissions

**Handling:**
- Git command exits with non-zero code
- Script captures git error output
- Pipeline fails with descriptive message
- Version changes not persisted

### Missing Required Tools

**Scenario:** crx3, npm, or node not available in environment

**Handling:**
- Validation script checks for tool availability using `which` or `command -v`
- Script exits with error code 1
- Clear error message: "Required tool [tool_name] not found"
- Pipeline halts before attempting operations

## Testing Strategy

### Unit Testing

Since this is primarily a CI/CD configuration project, traditional unit tests will focus on the helper scripts:

**Version Bump Script Tests:**
- Test version increment logic (patch, minor, major)
- Test file reading and writing
- Test error handling for missing files
- Test git commit creation

**Update Manifest Generator Tests:**
- Test XML generation with various inputs
- Test version extraction from package.json
- Test URL formatting
- Test error handling for missing data

**Validation Scripts Tests:**
- Test environment variable checking
- Test tool availability checking
- Test error message formatting

### Property-Based Testing

We will use **fast-check** (JavaScript/TypeScript property-based testing library) to verify universal properties.

**Configuration:**
- Minimum 100 iterations per property test
- Each property test tagged with format: `**Feature: chrome-extension-cicd, Property {number}: {property_text}**`

**Property Test Coverage:**

1. **Version Consistency Property** - Generate random valid package.json and manifest.json files, run version bump, verify versions match
2. **Semantic Version Format Property** - Generate random version numbers, run bump operations, verify output matches semver pattern
3. **Update Manifest Completeness Property** - Generate random package.json files with versions, generate update manifest, verify version and URL present
4. **Update Manifest XML Validity Property** - Generate random extension metadata, create update manifest, verify XML structure and schema compliance
5. **Environment Variable Validation Property** - Generate random sets of environment variables (with and without required ones), verify scripts fail appropriately
6. **Tool Validation Property** - Mock tool availability scenarios, verify scripts detect missing tools correctly

### Integration Testing

**Pipeline Execution Tests:**
- Test complete pipeline run on main branch (build only)
- Test complete pipeline run on release branch (full workflow)
- Test pipeline failure scenarios (missing env vars, build failures)

**End-to-End Tests:**
- Create test repository with sample extension
- Trigger pipeline via git push
- Verify artifacts produced
- Verify version numbers updated correctly

### Manual Testing

**Bitbucket Configuration:**
- Verify pipeline appears in Bitbucket UI
- Verify environment variables configured correctly
- Verify artifacts stored and accessible

**Extension Installation:**
- Install generated CRX file in Chrome
- Verify extension loads correctly
- Test auto-update mechanism with update manifest

## Implementation Notes

### Script Organization

```
scripts/
  ├── bump-version.js       # Version increment logic
  ├── generate-update-xml.js # Update manifest generation
  ├── validate-env.js       # Environment validation
  └── package-extension.sh  # CRX packaging wrapper
```

### Environment Variables Required

- `EXTENSION_PRIVATE_KEY` - Base64-encoded private key for signing
- `CRX_BASE_URL` - Base URL where CRX files will be hosted (for update manifest)
- `EXTENSION_ID` - Chrome extension ID (for update manifest)
- `BITBUCKET_ACCESS_TOKEN` - Token for creating PRs via Bitbucket API (or use built-in credentials)
- `S3_BUCKET` - S3 bucket name for deployment (or alternative storage config)

### Dependencies

**Runtime:**
- Node.js (v16+)
- npm
- crx3 CLI tool
- git

**Development:**
- fast-check (property-based testing)
- jest or vitest (test runner)
- xml2js (XML parsing for validation)

### Pipeline Artifacts

The release workflow should store the following as artifacts:
- `complaint.crx` - Signed extension package
- `update.xml` - Update manifest
- `dist/` - Built extension directory (for debugging)

### Git Workflow

1. Development happens on `main` branch
2. When ready for release, manually trigger `create-release` pipeline with TYPE parameter
3. Pipeline creates `release/v{version}` branch from main
4. Pipeline bumps version and commits to release branch
5. Pipeline builds, packages, and deploys
6. Pipeline creates PR from release branch back to main
7. After manual review, PR is merged to keep main up to date

## Security Considerations

1. **Private Key Protection:**
   - Never commit key.pem to repository
   - Store EXTENSION_PRIVATE_KEY in Bitbucket's secure environment variables
   - Use base64 encoding for storage
   - Clean up key.pem after use

2. **Environment Variable Access:**
   - Restrict access to pipeline environment variables
   - Use Bitbucket's secured variables feature
   - Audit access to EXTENSION_PRIVATE_KEY

3. **Artifact Storage:**
   - Ensure CRX files stored securely
   - Control access to pipeline artifacts
   - Consider artifact retention policies

4. **Update Manifest Security:**
   - Serve update.xml over HTTPS only
   - Validate CRX_BASE_URL uses HTTPS
   - Ensure update manifest URL matches Chrome Web Store requirements
