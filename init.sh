#!/bin/bash

# Initialize the npm package
npm install

# Create the dist directory
mkdir -p dist

# Build the package
npm run build

echo "Package initialized successfully!"
echo "You can now run the test script with:"
echo "  export HONEYCOMB_API_KEY=your_api_key && ./test.sh"
