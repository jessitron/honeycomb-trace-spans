#!/bin/bash

# Check if a version argument is provided
if [ -z "$1" ]; then
  echo "Usage: ./publish.sh <version>"
  echo "  where <version> is one of: patch, minor, major"
  exit 1
fi

# Update the version
npm version $1

# Build the package
npm run build

# Publish to npm
npm publish

echo "Package published successfully!"
