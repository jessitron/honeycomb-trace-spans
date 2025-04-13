#!/bin/bash

# Build the package
npm run build

# Install the package globally
npm install -g .

echo "Package installed globally!"
echo "You can now run the command with:"
echo "  export HONEYCOMB_API_KEY=your_api_key && honeycomb-trace-spans --trace-id your_trace_id"
