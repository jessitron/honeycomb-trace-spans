#!/bin/bash

# Check if a GitHub username is provided
if [ -z "$1" ]; then
  echo "Usage: ./push-to-github.sh <github_username>"
  echo "  where <github_username> is your GitHub username"
  exit 1
fi

# Set the GitHub username
GITHUB_USERNAME=$1

# Add the GitHub remote
git remote add origin https://github.com/$GITHUB_USERNAME/honeycomb-trace-spans.git

# Push the code to GitHub
git push -u origin main

echo "Code pushed to GitHub!"
echo "You can now view your repository at: https://github.com/$GITHUB_USERNAME/honeycomb-trace-spans"
