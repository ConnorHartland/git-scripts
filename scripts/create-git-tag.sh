#!/bin/bash

# Exit on any error
set -e

# Check if we're on main branch
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$CURRENT_BRANCH" != "main" ]; then
  echo "Error: Must be on main branch to create release tag"
  echo "Current branch: $CURRENT_BRANCH"
  exit 1
fi

# Check if package.json exists
if [ ! -f "package.json" ]; then
  echo "Error: package.json not found in current directory"
  exit 1
fi

# Read current version from package.json
CURRENT_VERSION=$(node -p "require('./package.json').version")

if [ -z "$CURRENT_VERSION" ]; then
  echo "Error: Could not read version from package.json"
  exit 1
fi

echo "Current version in package.json: ${CURRENT_VERSION}"

# Get the previous version from the parent commit
# This checks if the version changed in the most recent merge
PREVIOUS_VERSION=""
if git rev-parse HEAD~1 >/dev/null 2>&1; then
  # Check if package.json existed in the previous commit
  if git show HEAD~1:package.json >/dev/null 2>&1; then
    PREVIOUS_VERSION=$(git show HEAD~1:package.json | node -p "JSON.parse(require('fs').readFileSync('/dev/stdin', 'utf8')).version")
    echo "Previous version in package.json: ${PREVIOUS_VERSION}"
  else
    echo "No package.json found in previous commit - treating as initial version"
  fi
else
  echo "No previous commit found - treating as initial version"
fi

# If versions are the same, no need to tag
if [ "$CURRENT_VERSION" = "$PREVIOUS_VERSION" ]; then
  echo "Version unchanged (${CURRENT_VERSION}). No tag needed."
  exit 0
fi

echo "Version changed from '${PREVIOUS_VERSION}' to '${CURRENT_VERSION}' - creating tag"

TAG_NAME="v${CURRENT_VERSION}"

# Check if tag already exists
if git tag -l | grep -q "^${TAG_NAME}$"; then
  echo "Tag ${TAG_NAME} already exists. Skipping tag creation."
  git tag -l | grep "^${TAG_NAME}$"
  exit 0
fi

echo "Creating git tag: ${TAG_NAME}"

# Create annotated tag with release information
git tag -a "$TAG_NAME" -m "Release version ${CURRENT_VERSION}

This tag marks the release of version ${CURRENT_VERSION}.
Previous version: ${PREVIOUS_VERSION}

Created automatically after version change detected on main branch."

# Push the tag to remote
git push origin "$TAG_NAME"

echo "✓ Successfully created and pushed tag: ${TAG_NAME}"
echo "Tag details:"
git show --no-patch --format="Tag: %D%nDate: %ad%nMessage: %B" "$TAG_NAME"