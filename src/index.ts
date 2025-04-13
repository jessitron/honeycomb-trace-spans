#!/usr/bin/env node

/**
 * Standalone script to retrieve all spans in a trace from Honeycomb
 *
 * Usage:
 *   honeycomb-trace-spans --trace-id <trace_id> [--time-range <seconds>]
 *   honeycomb-trace-spans --trace-id <trace_id> --start-time <unix_timestamp> --end-time <unix_timestamp>
 *
 * Examples:
 *   honeycomb-trace-spans --trace-id abcd1234
 *   honeycomb-trace-spans --trace-id abcd1234 --time-range 86400
 *   honeycomb-trace-spans --trace-id abcd1234 --start-time 1617235200 --end-time 1617321600
 */

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const params: Record<string, string> = {};

  for (let i = 0; i < args.length; i += 2) {
    const arg = args[i];
    const nextArg = args[i + 1];
    if (arg && nextArg) {
      const key = arg.replace(/^--/, "");
      params[key] = nextArg;
    }
  }

  // Validate required parameters
  if (!params["trace-id"]) {
    console.error("Error: Missing required parameter --trace-id");
    showUsage();
    process.exit(1);
  }

  // Parse time parameters
  let timeRange = params["time-range"]
    ? parseInt(params["time-range"], 10)
    : 3600; // Default to 1 hour
  let startTime = params["start-time"]
    ? parseInt(params["start-time"], 10)
    : undefined;
  let endTime = params["end-time"]
    ? parseInt(params["end-time"], 10)
    : undefined;

  // Validate that if one of start-time or end-time is provided, both must be provided
  if ((startTime && !endTime) || (!startTime && endTime)) {
    console.error(
      "Error: Both --start-time and --end-time must be provided together"
    );
    showUsage();
    process.exit(1);
  }

  return {
    traceId: params["trace-id"],
    timeRange: timeRange,
    startTime: startTime,
    endTime: endTime,
  };
}

// Show usage information
function showUsage() {
  console.log(`
Usage:
  honeycomb-trace-spans --trace-id <trace_id> [--time-range <seconds>]
  honeycomb-trace-spans --trace-id <trace_id> --start-time <unix_timestamp> --end-time <unix_timestamp>

Examples:
  honeycomb-trace-spans --trace-id abcd1234
  honeycomb-trace-spans --trace-id abcd1234 --time-range 86400
  honeycomb-trace-spans --trace-id abcd1234 --start-time 1617235200 --end-time 1617321600
  `);
}

// Main function
async function main() {
  try {
    // Parse command line arguments
    const { traceId, timeRange, startTime, endTime } = parseArgs();

    // Always use __all__ as the dataset to query across all datasets
    const dataset = "__all__";

    // Check for API key
    const apiKey = process.env.HONEYCOMB_API_KEY;
    if (!apiKey) {
      console.error("Error: HONEYCOMB_API_KEY environment variable is not set");
      process.exit(1);
    }

    const apiEndpoint =
      process.env.HONEYCOMB_API_ENDPOINT || "https://api.honeycomb.io";

    // Log what time range we're using
    if (startTime && endTime) {
      const startDate = new Date(startTime * 1000).toISOString();
      const endDate = new Date(endTime * 1000).toISOString();
      console.log(
        `Retrieving spans for trace ${traceId} across all datasets from ${startDate} to ${endDate}...`
      );
    } else {
      console.log(
        `Retrieving spans for trace ${traceId} across all datasets (last ${timeRange} seconds)...`
      );
    }

    // Create query to retrieve all spans in the trace
    const query: {
      calculations: { op: string }[];
      filters: { column: string; op: string; value: string }[];
      breakdowns: string[];
      limit: number;
      time_range?: number;
      start_time?: number;
      end_time?: number;
    } = {
      calculations: [{ op: "COUNT" }],
      filters: [{ column: "trace.trace_id", op: "=", value: traceId }],
      breakdowns: [
        "trace.span_id",
        "name",
        "trace.parent_id",
        "service.name",
        "duration_ms",
      ],
      limit: 1000, // Set a high limit to get all spans
    };

    // Add time parameters to the query
    if (startTime && endTime) {
      // Use absolute time range
      query.start_time = startTime;
      query.end_time = endTime;
    } else {
      // Use relative time range
      query.time_range = timeRange;
    }

    // Create the query
    const queryResponse = await request<{ id: string }>(
      apiKey,
      apiEndpoint,
      `/1/queries/${dataset}`,
      {
        method: "POST",
        body: JSON.stringify(query),
      }
    );

    const queryId = queryResponse.id;

    // Create query result
    const queryResultResponse = await request<{ id: string }>(
      apiKey,
      apiEndpoint,
      `/1/query_results/${dataset}`,
      {
        method: "POST",
        body: JSON.stringify({ query_id: queryId }),
      }
    );

    const queryResultId = queryResultResponse.id;

    // Poll for results
    let attempts = 0;
    const maxAttempts = 10;
    let result: {
      data?: {
        results?: Array<Record<string, any>>;
        series?: any[];
      };
    } | null = null;

    while (attempts < maxAttempts) {
      const response = await request<{
        data?: {
          results?: Array<Record<string, any>>;
          series?: any[];
        };
      }>(apiKey, apiEndpoint, `/1/query_results/${dataset}/${queryResultId}`);

      if (response.data?.results) {
        result = response;
        break;
      }

      // Wait before trying again
      await new Promise((resolve) => setTimeout(resolve, 1000));
      attempts++;
    }

    if (!result) {
      throw new Error("Query timed out");
    }

    // Check if we got results
    if (!result.data?.results || result.data.results.length === 0) {
      // Get team info and environment name for UI link
      const authInfo = await request<{
        team?: { slug: string };
        environment?: { slug: string; name: string };
      }>(apiKey, apiEndpoint, "/1/auth");
      const teamSlug = authInfo.team?.slug;
      const envName = authInfo.environment?.name || "unknown";

      if (teamSlug) {
        // Create link to view the trace in Honeycomb UI
        let traceUrl = `https://ui.honeycomb.io/${teamSlug}/environments/${envName}/trace?trace_id=${encodeURIComponent(
          traceId
        )}`;

        // Add time range parameters to the URL
        if (startTime && endTime) {
          traceUrl += `&trace_start_ts=${startTime}&trace_end_ts=${endTime}`;
        } else if (timeRange) {
          const endTimeSec = Math.floor(Date.now() / 1000);
          const startTimeSec = endTimeSec - timeRange;
          traceUrl += `&trace_start_ts=${startTimeSec}&trace_end_ts=${endTimeSec}`;
        }

        // Output the trace URL separately for human use
        console.log(`\nView trace in Honeycomb UI: ${traceUrl}`);

        // Output structured JSON for agent use
        console.log(
          JSON.stringify(
            {
              summary: {
                traceId,
                spanCount: 0,
                services: [],
                rootSpans: 0,
                timeRange: {
                  start: startTime || Math.floor(Date.now() / 1000) - timeRange,
                  end: endTime || Math.floor(Date.now() / 1000),
                },
                traceUrl: traceUrl,
              },
              spans: [],
            },
            null,
            2
          )
        );
      } else {
        console.log(`No spans found for trace ID: ${traceId}`);
      }
      return;
    }

    // Check if the only result is a COUNT of 0
    if (result.data.results.length === 1) {
      const firstResult = result.data.results[0];
      if (
        firstResult &&
        typeof firstResult === "object" &&
        "data" in firstResult &&
        firstResult.data &&
        typeof firstResult.data === "object" &&
        "COUNT" in firstResult.data &&
        firstResult.data.COUNT === 0
      ) {
        // Get team info and environment name for UI link
        const authInfo = await request<{
          team?: { slug: string };
          environment?: { slug: string; name: string };
        }>(apiKey, apiEndpoint, "/1/auth");
        const teamSlug = authInfo.team?.slug;
        const envName = authInfo.environment?.name || "unknown";

        if (teamSlug) {
          // Create link to view the trace in Honeycomb UI
          let traceUrl = `https://ui.honeycomb.io/${teamSlug}/environments/${envName}/trace?trace_id=${encodeURIComponent(
            traceId
          )}`;

          // Add time range parameters to the URL
          if (startTime && endTime) {
            traceUrl += `&trace_start_ts=${startTime}&trace_end_ts=${endTime}`;
          } else if (timeRange) {
            const endTimeSec = Math.floor(Date.now() / 1000);
            const startTimeSec = endTimeSec - timeRange;
            traceUrl += `&trace_start_ts=${startTimeSec}&trace_end_ts=${endTimeSec}`;
          }

          // Output the trace URL separately for human use
          console.log(`\nView trace in Honeycomb UI: ${traceUrl}`);

          // Output structured JSON for agent use
          console.log(
            JSON.stringify(
              {
                summary: {
                  traceId,
                  spanCount: 0,
                  services: [],
                  rootSpans: 0,
                  timeRange: {
                    start:
                      startTime || Math.floor(Date.now() / 1000) - timeRange,
                    end: endTime || Math.floor(Date.now() / 1000),
                  },
                  traceUrl: traceUrl,
                },
                spans: [],
              },
              null,
              2
            )
          );
        } else {
          console.log(`No spans found for trace ID: ${traceId}`);
        }
        return;
      }
    }

    // Process the results to extract the actual span data
    const processedSpans = result.data.results.map((span) => {
      // Check if the span data is nested inside a 'data' property
      if (span.data && typeof span.data === "object") {
        return span.data;
      }
      return span;
    });

    // Sort spans by parent_id to help visualize the trace structure
    const sortedSpans = [...processedSpans].sort((a, b) => {
      const aParentId = String(a["trace.parent_id"] || a["parent_id"] || "");
      const bParentId = String(b["trace.parent_id"] || b["parent_id"] || "");
      return aParentId.localeCompare(bParentId);
    });

    // Create a structured representation of the spans
    const structuredSpans = sortedSpans.map((span) => {
      // Try different field names that might be used for the same concept
      const spanId =
        span["trace.span_id"] || span["span.id"] || span["span_id"] || "N/A";
      const parentId =
        span["trace.parent_id"] ||
        span["parent.id"] ||
        span["parent_id"] ||
        "ROOT";
      const name = span["name"] || span["span.name"] || "N/A";
      const service = span["service.name"] || span["service"] || "N/A";
      const duration = span["duration_ms"] || span["duration"] || "N/A";

      // Create a structured object with the span data
      const structuredSpan = {
        spanId,
        parentId,
        name,
        service,
        duration,
        // Include all other attributes from the original span
        attributes: {} as Record<string, any>,
      };

      // Add all other attributes to the attributes object
      for (const [key, value] of Object.entries(span)) {
        if (
          ![
            "trace.span_id",
            "span.id",
            "span_id",
            "trace.parent_id",
            "parent.id",
            "parent_id",
            "name",
            "span.name",
            "service.name",
            "service",
            "duration_ms",
            "duration",
            "COUNT", // Skip the COUNT field
          ].includes(key)
        ) {
          structuredSpan.attributes[key] = value;
        }
      }

      return structuredSpan;
    });

    // We'll output the JSON data after getting the trace URL

    // Get team info and environment name for UI link
    const authInfo = await request<{
      team?: { slug: string };
      environment?: { slug: string; name: string };
    }>(apiKey, apiEndpoint, "/1/auth");
    const teamSlug = authInfo.team?.slug;
    const envName = authInfo.environment?.name || "unknown";

    if (teamSlug) {
      // Create link to view the trace in Honeycomb UI
      let traceUrl = `https://ui.honeycomb.io/${teamSlug}/environments/${envName}/trace?trace_id=${encodeURIComponent(
        traceId
      )}`;

      // Add time range parameters to the URL
      if (startTime && endTime) {
        // Use seconds since epoch for the UI
        traceUrl += `&trace_start_ts=${startTime}&trace_end_ts=${endTime}`;
      } else if (timeRange) {
        // Calculate start and end times based on the relative time range
        const endTimeSec = Math.floor(Date.now() / 1000);
        const startTimeSec = endTimeSec - timeRange;
        traceUrl += `&trace_start_ts=${startTimeSec}&trace_end_ts=${endTimeSec}`;
      }

      // Output the trace URL separately for human use
      console.log(`\nView trace in Honeycomb UI: ${traceUrl}`);

      // Also include the trace URL in the JSON output for agent use
      const outputData = {
        summary: {
          traceId,
          spanCount: structuredSpans.length,
          services: [
            ...new Set(
              structuredSpans
                .map((span) => span.service)
                .filter((s) => s !== "N/A")
            ),
          ],
          rootSpans: structuredSpans.filter((span) => span.parentId === "ROOT")
            .length,
          timeRange: {
            start: startTime || Math.floor(Date.now() / 1000) - timeRange,
            end: endTime || Math.floor(Date.now() / 1000),
          },
          traceUrl: traceUrl,
        },
        spans: structuredSpans,
      };

      // Output the structured data as JSON for easy parsing by an agent
      console.log(JSON.stringify(outputData, null, 2));
    }
  } catch (error) {
    console.error("Error retrieving trace spans:", error);

    // Provide helpful suggestions based on the error
    if ((error as any).statusCode === 401) {
      console.error("\nSuggestions:");
      console.error(
        "1. Check that your Honeycomb API key is valid and has the necessary permissions"
      );
      console.error(
        "2. Make sure you've set the HONEYCOMB_API_KEY environment variable"
      );
    } else if ((error as any).statusCode === 404) {
      console.error("\nSuggestions:");
      console.error("1. Verify that the dataset exists");
      console.error("2. Check that the trace ID is correct");
    }

    process.exit(1);
  }
}

// Import fetch for Node.js environments
import fetch, { RequestInit, Headers } from "node-fetch";

// Helper function to make API requests
async function request<T = any>(
  apiKey: string,
  apiEndpoint: string,
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${apiEndpoint}${path}`;

  const headers = new Headers({
    "X-Honeycomb-Team": apiKey,
    "Content-Type": "application/json",
    "User-Agent": "honeycomb-trace-spans/1.0.0",
    ...options.headers,
  });

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `Honeycomb API error: ${response.statusText}`;

    try {
      const errorJson = JSON.parse(errorText);
      if (errorJson.error) {
        errorMessage = `Honeycomb API error: ${errorJson.error}`;
      }
    } catch (e) {
      // If we can't parse the error as JSON, use the raw text
      if (errorText) {
        errorMessage = `Honeycomb API error: ${errorText}`;
      }
    }

    const error = new Error(errorMessage);
    (error as any).statusCode = response.status;
    throw error;
  }

  return response.json() as Promise<T>;
}

// Run the script
main().catch(console.error);
