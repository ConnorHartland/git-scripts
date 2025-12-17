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

# Check if this looks like a release merge by examining recent commit messages
RECENT_COMMITS=$(git log --oneline -5 --grep="Merge.*release/v" --grep="Release v" --grep="Bump version to")

if [ -z "$RECENT_COMMITS" ]; then
  echo "No recent release-related commits found. Skipping tag creation."
  echo "Recent commits:"
  git log --oneline -5
  exit 0
fi

echo "Recent release-related commits found:"
echo "$RECENT_COMMITS"

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

Created automatically after release branch merge to main."

# Push the tag to remote
git push origin "$TAG_NAME"

echo "✓ Successfully created and pushed tag: ${TAG_NAME}"
echo "Tag details:"
git show --no-patch --format="Tag: %D%nDate: %ad%nMessage: %B" "$TAG_NAME"