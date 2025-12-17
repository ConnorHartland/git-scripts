# Requirements Document

## Introduction

This document specifies the requirements for an automated CI/CD pipeline for a Chrome extension built with Vite. The pipeline automates release branch creation, version management, building, packaging, deployment, and PR creation using Bitbucket Pipelines with a manual release trigger workflow.

## Glossary

- **Pipeline**: The automated CI/CD workflow defined in bitbucket-pipelines.yml
- **Extension Package**: The compiled Chrome extension in CRX format
- **Update Manifest**: An XML file that describes available extension versions for auto-update
- **Main Branch**: The central git branch from which release branches are created and to which they are merged back
- **Release Branch**: A git branch created from main following the pattern release/v{version}
- **Version Bump**: The automated increment of version numbers in package.json and manifest.json
- **Release Type**: The type of version increment (Major, Minor, or Patch) specified when creating a release
- **CRX3**: Chrome Extension package format version 3
- **Private Key**: The cryptographic key used to sign the extension package
- **Pull Request**: A git merge request to integrate release branch changes back into main

## Requirements

### Requirement 1

**User Story:** As a developer, I want to manually trigger a release creation pipeline, so that I can control when releases are created and specify the version increment type.

#### Acceptance Criteria

1. WHEN the repository contains a bitbucket-pipelines.yml file THEN the Pipeline SHALL be recognized by Bitbucket
2. THE Pipeline SHALL define a custom pipeline named create-release
3. THE create-release pipeline SHALL accept a parameter named TYPE with allowed values: Major, Minor, Patch
4. WHEN a developer triggers create-release THEN the Pipeline SHALL execute only when manually invoked
5. THE Pipeline SHALL use the main branch as the source for creating release branches

### Requirement 2

**User Story:** As a developer, I want the pipeline to create a release branch with the correct version, so that releases are isolated and properly versioned.

#### Acceptance Criteria

1. WHEN create-release executes THEN the Pipeline SHALL read the current version from package.json on the Main Branch
2. WHEN the current version is read THEN the Pipeline SHALL increment it according to the TYPE parameter (Major, Minor, or Patch)
3. WHEN the new version is calculated THEN the Pipeline SHALL create a Release Branch named release/v{new_version}
4. WHEN the Release Branch is created THEN the Pipeline SHALL check out the Release Branch
5. THE Pipeline SHALL follow semantic versioning conventions (major.minor.patch)

### Requirement 3

**User Story:** As a developer, I want version numbers automatically updated on the release branch, so that all files reflect the correct release version.

#### Acceptance Criteria

1. WHEN the Release Branch is checked out THEN the Pipeline SHALL update the version number in package.json
2. WHEN the Release Branch is checked out THEN the Pipeline SHALL update the version number in manifest.json
3. WHEN version numbers are updated THEN the Pipeline SHALL ensure both files contain identical version values
4. WHEN version updates are complete THEN the Pipeline SHALL commit the updated files to the Release Branch
5. WHEN the commit is created THEN the Pipeline SHALL push the Release Branch to the remote repository

### Requirement 4

**User Story:** As a developer, I want the extension to be built automatically on the release branch, so that I don't need to manually compile the code.

#### Acceptance Criteria

1. WHEN the version commit is pushed THEN the Pipeline SHALL run npm install to install dependencies
2. WHEN dependencies are installed THEN the Pipeline SHALL run npm run build to compile the extension
3. WHEN the build completes THEN the Pipeline SHALL produce a dist/ directory containing the compiled extension
4. WHEN the build completes THEN the dist/ directory SHALL contain a valid manifest.json file with the updated version
5. IF the build fails THEN the Pipeline SHALL halt execution and report the error

### Requirement 5

**User Story:** As a developer, I want the extension to be packaged as a signed CRX file, so that it can be distributed and installed.

#### Acceptance Criteria

1. WHEN the build completes successfully THEN the Pipeline SHALL decode the EXTENSION_PRIVATE_KEY environment variable from base64
2. WHEN the private key is decoded THEN the Pipeline SHALL write it to a file named key.pem
3. WHEN the private key file exists THEN the Pipeline SHALL execute crx3 pack dist/ -p key.pem -o complaint.crx
4. WHEN packaging completes THEN the Pipeline SHALL produce a file named complaint.crx
5. IF the private key is missing or invalid THEN the Pipeline SHALL halt execution and report the error

### Requirement 6

**User Story:** As a developer, I want an update manifest XML file generated automatically, so that Chrome can auto-update the extension.

#### Acceptance Criteria

1. WHEN packaging completes successfully THEN the Pipeline SHALL execute a script to generate the Update Manifest
2. WHEN generating the Update Manifest THEN the Pipeline SHALL read version information from package.json
3. WHEN generating the Update Manifest THEN the Pipeline SHALL include the Extension Package download URL
4. WHEN generating the Update Manifest THEN the Pipeline SHALL produce a valid XML file conforming to Chrome's update manifest schema
5. THE Pipeline SHALL make the Update Manifest accessible for Chrome's auto-update mechanism

### Requirement 7

**User Story:** As a developer, I want secure handling of the extension signing key, so that the private key is never exposed in the repository.

#### Acceptance Criteria

1. THE Pipeline SHALL retrieve the Private Key from a secure environment variable named EXTENSION_PRIVATE_KEY
2. THE Pipeline SHALL store the Private Key value as base64-encoded data
3. WHEN the Private Key is used THEN the Pipeline SHALL decode it only in memory or temporary files
4. THE Pipeline SHALL NOT commit the Private Key file to the repository
5. WHEN the pipeline completes THEN the Pipeline SHALL ensure temporary key files are cleaned up

### Requirement 8

**User Story:** As a developer, I want the extension automatically deployed to dev environment, so that I can test the release before production.

#### Acceptance Criteria

1. WHEN the Update Manifest is generated THEN the Pipeline SHALL automatically deploy to the dev environment
2. WHEN deploying to dev THEN the Pipeline SHALL upload the Extension Package to the dev storage location
3. WHEN deploying to dev THEN the Pipeline SHALL upload the Update Manifest to the dev storage location
4. WHEN deployment completes THEN the Pipeline SHALL output the URLs where the files are accessible
5. THE Pipeline SHALL store the Extension Package and Update Manifest as build artifacts

### Requirement 9

**User Story:** As a developer, I want manual control over production deployment, so that I can verify the release in dev before making it public.

#### Acceptance Criteria

1. WHEN dev deployment completes THEN the Pipeline SHALL wait for manual approval before deploying to prod
2. WHEN manual approval is given THEN the Pipeline SHALL deploy to the prod environment
3. WHEN deploying to prod THEN the Pipeline SHALL upload the Extension Package to the prod storage location
4. WHEN deploying to prod THEN the Pipeline SHALL upload the Update Manifest to the prod storage location
5. WHEN prod deployment completes THEN the Pipeline SHALL output the URLs where the files are accessible

### Requirement 10

**User Story:** As a developer, I want a pull request automatically created to merge the release back into main, so that main stays up to date with released versions.

#### Acceptance Criteria

1. WHEN prod deployment completes successfully THEN the Pipeline SHALL create a Pull Request from the Release Branch to the Main Branch
2. WHEN creating the Pull Request THEN the Pipeline SHALL set the title to "Release v{version}"
3. WHEN creating the Pull Request THEN the Pipeline SHALL set the description to include the version number and release notes
4. THE Pull Request SHALL require manual review and approval before merging
5. WHEN the Pull Request is merged THEN the Main Branch SHALL contain the updated version numbers

### Requirement 11

**User Story:** As a developer, I want the pipeline to fail fast with clear error messages, so that I can quickly identify and fix issues.

#### Acceptance Criteria

1. IF any step fails THEN the Pipeline SHALL immediately halt execution
2. WHEN a failure occurs THEN the Pipeline SHALL report which step failed
3. WHEN a failure occurs THEN the Pipeline SHALL provide error output from the failed command
4. THE Pipeline SHALL validate that required environment variables exist before executing dependent steps
5. THE Pipeline SHALL validate that required tools (npm, crx3, node) are available before executing dependent steps
