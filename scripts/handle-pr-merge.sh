#!/bin/bash

# Exit on any error
set -e

# This script can be called via Bitbucket webhook when a PR is merged
# or as part of a pipeline trigger

echo "Checking if this is a release PR merge..."

# Check if we have the required environment variables for PR detection
if [ -n "$BITBUCKET_PR_ID" ] && [ -n "$BITBUCKET_PR_DESTINATION_BRANCH" ]; then
  echo "PR ID: $BITBUCKET_PR_ID"
  echo "Destination Branch: $BITBUCKET_PR_DESTINATION_BRANCH"
  
  # Only proceed if merging to main
  if [ "$BITBUCKET_PR_DESTINATION_BRANCH" != "main" ]; then
    echo "PR not merging to main. Skipping tag creation."
    exit 0
  fi
  
  # Check if this is a release PR by examining the source branch or title
  if [ -n "$BITBUCKET_PR_SOURCE_BRANCH" ]; then
    if [[ "$BITBUCKET_PR_SOURCE_BRANCH" =~ ^release/v[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
      echo "✓ Detected release PR from branch: $BITBUCKET_PR_SOURCE_BRANCH"
      
      # Extract version from branch name
      VERSION=$(echo "$BITBUCKET_PR_SOURCE_BRANCH" | sed 's/release\/v//')
      echo "Release version: $VERSION"
      
      # Switch to main branch and create tag
      git checkout main
      git pull origin main
      
      # Create the tag
      TAG_NAME="v${VERSION}"
      
      # Check if tag already exists
      if git tag -l | grep -q "^${TAG_NAME}$"; then
        echo "Tag ${TAG_NAME} already exists. Skipping."
        exit 0
      fi
      
      echo "Creating release tag: ${TAG_NAME}"
      git tag -a "$TAG_NAME" -m "Release version ${VERSION}

Automatically created after merging release PR #${BITBUCKET_PR_ID}
Source branch: ${BITBUCKET_PR_SOURCE_BRANCH}
Merged to: ${BITBUCKET_PR_DESTINATION_BRANCH}"

      git push origin "$TAG_NAME"
      echo "✓ Successfully created and pushed tag: ${TAG_NAME}"
      
      exit 0
    fi
  fi
fi

echo "Not a release PR merge. Using fallback detection method..."

# Fallback: Use the existing create-git-tag.sh logic
bash scripts/create-git-tag.sh