#!/bin/bash

# Check if HONEYCOMB_API_KEY is set
if [ -z "$HONEYCOMB_API_KEY" ]; then
  echo "Error: HONEYCOMB_API_KEY environment variable is not set"
  exit 1
fi

# Check if a trace ID is provided
if [ -z "$1" ]; then
  echo "Usage: ./run.sh <trace_id> [time_range]"
  echo "  where <trace_id> is the Honeycomb trace ID"
  echo "  and [time_range] is an optional time range in seconds (default: 3600)"
  exit 1
fi

# Set the trace ID
TRACE_ID=$1

# Set the time range (default: 3600)
TIME_RANGE=${2:-3600}

# Run the script
node dist/index.js --trace-id $TRACE_ID --time-range $TIME_RANGE
