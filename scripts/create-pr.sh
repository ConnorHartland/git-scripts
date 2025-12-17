#!/bin/bash

# Exit on any error
set -e

# Check if VERSION environment variable is set
if [ -z "$VERSION" ]; then
  echo "Error: VERSION environment variable not set"
  echo "Usage: VERSION=<version> ./scripts/create-pr.sh"
  exit 1
fi

# Validate VERSION format (semantic versioning: major.minor.patch)
if ! [[ "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "Error: VERSION must follow semantic versioning format (e.g., 1.2.3)"
  echo "Received: $VERSION"
  exit 1
fi

# Check required environment variables for Bitbucket API
if [ -z "$BITBUCKET_WORKSPACE" ]; then
  echo "Error: BITBUCKET_WORKSPACE environment variable not set"
  exit 1
fi

if [ -z "$BITBUCKET_REPO_SLUG" ]; then
  echo "Error: BITBUCKET_REPO_SLUG environment variable not set"
  exit 1
fi

# Bitbucket credentials - try multiple sources
if [ -n "$BITBUCKET_ACCESS_TOKEN" ]; then
  AUTH_HEADER="Authorization: Bearer $BITBUCKET_ACCESS_TOKEN"
elif [ -n "$BITBUCKET_USERNAME" ] && [ -n "$BITBUCKET_APP_PASSWORD" ]; then
  AUTH_CREDENTIALS="$BITBUCKET_USERNAME:$BITBUCKET_APP_PASSWORD"
else
  echo "Error: Bitbucket authentication not configured"
  echo "Set either:"
  echo "  - BITBUCKET_ACCESS_TOKEN, or"
  echo "  - BITBUCKET_USERNAME and BITBUCKET_APP_PASSWORD"
  exit 1
fi

RELEASE_BRANCH="release/v${VERSION}"
TARGET_BRANCH="main"
PR_TITLE="Release v${VERSION}"
PR_DESCRIPTION="Automated release for version ${VERSION}

This PR merges the release branch back into main to keep version numbers synchronized.

## Changes
- Version bumped to ${VERSION}
- Extension built and packaged
- Deployed to dev and prod environments

Please review and merge to complete the release process."

echo "Creating pull request..."
echo "  Source branch: $RELEASE_BRANCH"
echo "  Target branch: $TARGET_BRANCH"
echo "  Title: $PR_TITLE"

# Prepare JSON payload for Bitbucket API
PR_PAYLOAD=$(cat <<EOF
{
  "title": "$PR_TITLE",
  "description": "$PR_DESCRIPTION",
  "source": {
    "branch": {
      "name": "$RELEASE_BRANCH"
    }
  },
  "destination": {
    "branch": {
      "name": "$TARGET_BRANCH"
    }
  },
  "close_source_branch": false
}
EOF
)

# Bitbucket API endpoint
API_URL="https://api.bitbucket.org/2.0/repositories/${BITBUCKET_WORKSPACE}/${BITBUCKET_REPO_SLUG}/pullrequests"

# Make API request
if [ -n "$BITBUCKET_ACCESS_TOKEN" ]; then
  RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL" \
    -H "Content-Type: application/json" \
    -H "$AUTH_HEADER" \
    -d "$PR_PAYLOAD")
else
  RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$API_URL" \
    -H "Content-Type: application/json" \
    -u "$AUTH_CREDENTIALS" \
    -d "$PR_PAYLOAD")
fi

# Extract HTTP status code (last line)
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
# Extract response body (all but last line)
RESPONSE_BODY=$(echo "$RESPONSE" | sed '$d')

# Check if request was successful
if [ "$HTTP_CODE" -eq 201 ]; then
  echo "✓ Pull request created successfully!"
  
  # Extract PR ID and URL from response
  PR_ID=$(echo "$RESPONSE_BODY" | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)
  PR_LINK=$(echo "$RESPONSE_BODY" | grep -o '"html":{"href":"[^"]*"' | head -1 | cut -d'"' -f4)
  
  if [ -n "$PR_LINK" ]; then
    echo "  PR URL: $PR_LINK"
  fi
  if [ -n "$PR_ID" ]; then
    echo "  PR ID: $PR_ID"
  fi
else
  echo "✗ Failed to create pull request"
  echo "  HTTP Status: $HTTP_CODE"
  echo "  Response: $RESPONSE_BODY"
  exit 1
fi

</content>
</invoke>