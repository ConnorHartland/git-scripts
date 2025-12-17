#!/bin/bash

# Exit on any error
set -e

# Check if TYPE environment variable is set
if [ -z "$TYPE" ]; then
  echo "Error: TYPE environment variable not set"
  echo "Usage: TYPE=<Major|Minor|Patch> ./scripts/create-release-branch.sh"
  exit 1
fi

# Validate TYPE parameter
if [[ ! "$TYPE" =~ ^(Major|Minor|Patch)$ ]]; then
  echo "Error: TYPE must be one of: Major, Minor, Patch"
  echo "Received: $TYPE"
  exit 1
fi

# Ensure we're on main branch
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$CURRENT_BRANCH" != "main" ]; then
  echo "Error: Must be on main branch to create release branch"
  echo "Current branch: $CURRENT_BRANCH"
  exit 1
fi

# Ensure working directory is clean
if ! git diff-index --quiet HEAD --; then
  echo "Error: Working directory has uncommitted changes"
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

echo "Current version on main: $CURRENT_VERSION"

# Parse version components
IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT_VERSION"

# Validate version format
if ! [[ "$MAJOR" =~ ^[0-9]+$ ]] || ! [[ "$MINOR" =~ ^[0-9]+$ ]] || ! [[ "$PATCH" =~ ^[0-9]+$ ]]; then
  echo "Error: Invalid version format in package.json: $CURRENT_VERSION"
  echo "Expected format: major.minor.patch (e.g., 1.2.3)"
  exit 1
fi

# Calculate new version based on TYPE
case "$TYPE" in
  Major)
    NEW_MAJOR=$((MAJOR + 1))
    NEW_MINOR=0
    NEW_PATCH=0
    ;;
  Minor)
    NEW_MAJOR=$MAJOR
    NEW_MINOR=$((MINOR + 1))
    NEW_PATCH=0
    ;;
  Patch)
    NEW_MAJOR=$MAJOR
    NEW_MINOR=$MINOR
    NEW_PATCH=$((PATCH + 1))
    ;;
esac

NEW_VERSION="${NEW_MAJOR}.${NEW_MINOR}.${NEW_PATCH}"
RELEASE_BRANCH="release/v${NEW_VERSION}"

echo "New version: $NEW_VERSION"
echo "Creating release branch: $RELEASE_BRANCH"

# Check if branch already exists
if git show-ref --verify --quiet "refs/heads/$RELEASE_BRANCH"; then
  echo "Error: Branch $RELEASE_BRANCH already exists"
  exit 1
fi

# Create and checkout the new release branch
git checkout -b "$RELEASE_BRANCH"

# Push the new branch to remote with upstream tracking
git push -u origin "$RELEASE_BRANCH"

# Export the version for use in subsequent pipeline steps
echo "export VERSION=$NEW_VERSION" >> $BITBUCKET_CLONE_DIR/version.env

echo "Successfully created and pushed branch: $RELEASE_BRANCH"
echo "Version: $NEW_VERSION"
echo "Next steps:"
echo "  1. Run version bump script to update version numbers"
echo "  2. Build and package the extension"
echo "  3. Deploy and create PR"
