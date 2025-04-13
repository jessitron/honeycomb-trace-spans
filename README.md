# honeycomb-trace-spans

A command-line tool to retrieve all spans in a trace from Honeycomb.

## Installation

You can install this package globally:

```bash
npm install -g honeycomb-trace-spans
```

Or use it with npx:

```bash
npx honeycomb-trace-spans --trace-id <trace_id>
```

## Usage

[Get a Honeycomb API Key for your team and environment.](https://docs.honeycomb.io/configure/environments/manage-api-keys/#find-api-keys)

```bash
export HONEYCOMB_API_KEY=your_api_key
honeycomb-trace-spans --trace-id <trace_id> [--time-range <seconds>]
honeycomb-trace-spans --trace-id <trace_id> --start-time <unix_timestamp> --end-time <unix_timestamp>
```

### Parameters

- `--trace-id`: The trace ID to retrieve spans for (required)
- `--time-range`: Time range in seconds to look for spans (optional, default: 3600 seconds/1 hour)
- `--start-time`: Start time as Unix timestamp in seconds (optional, must be used with --end-time)
- `--end-time`: End time as Unix timestamp in seconds (optional, must be used with --start-time)

### Environment Variables

- `HONEYCOMB_API_KEY`: Your Honeycomb API key (required)
- `HONEYCOMB_API_ENDPOINT`: Custom API endpoint (optional, default: https://api.honeycomb.io)

## Examples

```bash
# Set your Honeycomb API key
export HONEYCOMB_API_KEY=your_api_key

# Retrieve spans for a trace with default time range (1 hour)
honeycomb-trace-spans --trace-id abcd1234efgh5678

# Retrieve spans for a trace with a custom time range (last 24 hours)
honeycomb-trace-spans --trace-id abcd1234efgh5678 --time-range 86400

# Retrieve spans for a trace with an absolute time range
honeycomb-trace-spans --trace-id abcd1234efgh5678 --start-time 1617235200 --end-time 1617321600

# With an absolute time range from yesterday to now
honeycomb-trace-spans --trace-id abcd1234efgh5678 --start-time $(date -v-1d +%s) --end-time $(date +%s)
```

## Output

The script outputs structured JSON data that's optimized for agent consumption, while still providing the trace URL for human use.

Example output:

```json
{
  "summary": {
    "traceId": "abcd1234efgh5678",
    "spanCount": 16,
    "services": ["service-a", "service-b", "service-c"],
    "rootSpans": 1,
    "timeRange": {
      "start": 1617235200,
      "end": 1617321600
    },
    "traceUrl": "https://ui.honeycomb.io/team/environments/env/trace?trace_id=abcd1234efgh5678&trace_start_ts=1617235200&trace_end_ts=1617321600"
  },
  "spans": [
    {
      "spanId": "span1",
      "parentId": "ROOT",
      "name": "request",
      "service": "service-a",
      "duration": 100.5,
      "attributes": {}
    }
    // ... more spans ...
  ]
}
```

## License

MIT
