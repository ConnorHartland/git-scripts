# Implementation Plan

- [x] 1. Create version calculation and branch creation script
  - Create scripts/create-release-branch.sh
  - Accept TYPE parameter (Major, Minor, Patch) from environment variable
  - Read current version from package.json on main branch
  - Calculate new version based on TYPE
  - Create release branch named release/v{new_version}
  - Checkout the new release branch
  - _Requirements: 1.3, 2.1, 2.2, 2.3, 2.5_

- [ ]* 1.1 Write property test for version increment
  - **Property 1: Version increment correctness**
  - **Validates: Requirements 2.2**

- [ ]* 1.2 Write property test for branch naming
  - **Property 2: Release branch naming**
  - **Validates: Requirements 2.3**

- [ ]* 1.3 Write property test for semantic version format
  - **Property 3: Semantic version format**
  - **Validates: Requirements 2.5**

- [x] 2. Update version bump script for new workflow
  - Modify scripts/bump-version.js to accept version as parameter
  - Update package.json with provided version
  - Update src/manifest.json (or manifest source) with provided version
  - Commit changes with message "Bump version to X.Y.Z"
  - Push changes to remote release branch
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ]* 2.1 Write property test for version consistency
  - **Property 4: Version consistency after bump**
  - **Validates: Requirements 3.1, 3.2, 3.3**

- [x] 3. Update packaging script
  - Ensure scripts/package-extension.sh validates EXTENSION_PRIVATE_KEY
  - Decode base64 key to key.pem
  - Run crx3 pack dist/ -p key.pem -o complaint.crx
  - Remove key.pem after packaging
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 7.3, 7.5_

- [x] 4. Update update manifest generator
  - Ensure scripts/generate-update-xml.js reads version from package.json
  - Read CRX_BASE_URL and EXTENSION_ID from environment variables
  - Generate Chrome update manifest XML
  - Write to update.xml
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [ ]* 4.1 Write property test for update manifest completeness
  - **Property 5: Update manifest completeness**
  - **Validates: Requirements 6.2, 6.3**

- [ ]* 4.2 Write property test for XML validity
  - **Property 6: Update manifest XML validity**
  - **Validates: Requirements 6.4**

- [x] 5. Create PR creation script
  - Create scripts/create-pr.sh
  - Accept version parameter
  - Use Bitbucket API to create PR from release/v{version} to main
  - Set PR title to "Release v{version}"
  - Set PR description with version info
  - _Requirements: 10.1, 10.2, 10.3_

- [ ]* 5.1 Write property test for PR title formatting
  - **Property 7: PR title formatting**
  - **Validates: Requirements 10.2**

- [x] 6. Create Bitbucket Pipelines configuration with custom pipeline
  - Update bitbucket-pipelines.yml to define custom create-release pipeline
  - Add TYPE variable with allowed values: Major, Minor, Patch
  - Step 1: Create release branch and bump version
  - Step 2: Build extension (npm install, npm run build)
  - Step 3: Package extension (install crx3, run packaging script)
  - Step 4: Generate update manifest
  - Step 5: Deploy to dev (automatic)
  - Step 6: Deploy to prod (manual trigger)
  - Step 7: Create pull request
  - Store complaint.crx and update.xml as artifacts
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 4.1, 4.2, 4.3, 4.4, 4.5, 8.1, 8.2, 8.3, 8.4, 8.5, 9.1, 9.2, 9.3, 9.4, 9.5_

- [ ]* 6.1 Write property test for environment variable validation
  - **Property 8: Required environment variable validation**
  - **Validates: Requirements 11.4**

- [ ]* 6.2 Write property test for tool validation
  - **Property 9: Required tool validation**
  - **Validates: Requirements 11.5**

- [ ] 7. Update setup documentation
  - Update or create PIPELINE.md with new workflow instructions
  - Document how to trigger create-release pipeline
  - Document TYPE parameter options
  - Document required environment variables (EXTENSION_PRIVATE_KEY, CRX_BASE_URL, EXTENSION_ID, S3_BUCKET)
  - Include example of base64 encoding the private key
  - Explain PR merge process
  - _Requirements: 7.1, 7.2_
