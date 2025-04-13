# Installation Guide

## Local Development

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/honeycomb-trace-spans.git
   cd honeycomb-trace-spans
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the package:
   ```bash
   npm run build
   ```

4. Run the script:
   ```bash
   export HONEYCOMB_API_KEY=your_api_key
   npm start -- --trace-id your_trace_id
   ```

## Publishing to npm

1. Update the version in package.json:
   ```bash
   npm version patch # or minor or major
   ```

2. Publish to npm:
   ```bash
   npm publish
   ```

## Installation from npm

1. Install globally:
   ```bash
   npm install -g honeycomb-trace-spans
   ```

2. Run the command:
   ```bash
   export HONEYCOMB_API_KEY=your_api_key
   honeycomb-trace-spans --trace-id your_trace_id
   ```

## Using with npx

You can also use the package without installing it globally:

```bash
export HONEYCOMB_API_KEY=your_api_key
npx honeycomb-trace-spans --trace-id your_trace_id
```
