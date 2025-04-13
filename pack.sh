#!/bin/bash

# Build the package
npm run build

# Create a tarball
npm pack

echo "Package tarball created!"
echo "You can install it with:"
echo "  npm install -g honeycomb-trace-spans-1.0.0.tgz"
