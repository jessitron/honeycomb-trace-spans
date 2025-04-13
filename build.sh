#!/bin/bash

# Install dependencies
npm install

# Build the package
npm run build

echo "Build completed successfully!"
echo "You can now run the script with:"
echo "  export HONEYCOMB_API_KEY=your_api_key && node dist/index.js --trace-id your_trace_id"
