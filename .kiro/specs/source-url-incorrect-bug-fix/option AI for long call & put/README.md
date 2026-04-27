# Options Trading Tool

A conversational trading assistant focused on Long Call and Long Put option strategies.

## Overview

This tool helps traders analyze underlying assets, evaluate market sentiment, filter suitable option contracts, and provide convenient trading access through interactive dialogue.

## Features

- 🎯 Underlying asset selection and validation (supports ticker symbols and Chinese names)
- 📊 Market sentiment analysis and strategy recommendation
- 🔍 Option contract filtering and ranking
- 🔗 Trade link generation and watchlist management
- 🌐 Modern web interface with real-time chat
- 💻 Command-line interface for terminal users

## Project Structure

```
.
├── public/                  # Web interface files
│   ├── index.html          # Main HTML page
│   ├── styles.css          # Styling
│   └── app.js              # Frontend logic
├── src/
│   ├── dialog/              # Dialog engine and state management
│   ├── analyzers/           # Analysis components
│   ├── services/            # Business services
│   ├── calculators/         # Computation utilities
│   ├── types/               # TypeScript interfaces and enums
│   └── utils/               # Helper functions
├── tests/
│   ├── unit/                # Unit tests
│   ├── property/            # Property-based tests
│   └── integration/         # Integration tests
├── server.mjs               # Web server
├── demo-simple.mjs          # Command-line demo
└── .kiro/                   # Specification documents
```

## Getting Started

### Installation

```bash
npm install
```

### Running the Application

#### Option 1: Web Interface (Recommended)

Launch the modern web interface:

```bash
npm run web
```

Then open your browser and visit: `http://localhost:3000`

Features:
- 🎨 Modern, responsive UI with gradient design
- 💬 Real-time chat interface
- 🚀 Quick start buttons for popular stocks
- 📱 Mobile-friendly layout

See [WEB_INTERFACE.md](./WEB_INTERFACE.md) for detailed usage guide.

#### Option 2: Command Line Demo

Run the interactive command-line demo:

```bash
npm run demo
```

#### Option 3: TypeScript Development Mode

```bash
npm run dev
```

### Development

```bash
# Build the project
npm run build

# Watch mode
npm run dev
```

### Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run property-based tests only
npm run test:property

# Run tests with coverage
npm run test:coverage
```

## Testing Strategy

This project uses a dual testing approach:

- **Unit Tests**: Verify specific examples, edge cases, and error conditions
- **Property-Based Tests**: Verify universal properties across all inputs using `fast-check`
  - Minimum 100 iterations per property test
  - All 16 correctness properties from the design document are tested

### Coverage Requirements

- Overall code coverage: 80% minimum
- Core business logic: 90%+ coverage

## Tech Stack

- **Language**: TypeScript
- **Testing**: Vitest + fast-check
- **Architecture**: State machine-driven multi-turn dialog system
- **Frontend**: Vanilla JavaScript with modern CSS
- **Server**: Node.js HTTP server

## Documentation

- [START.md](./START.md) - Quick start guide
- [WEB_INTERFACE.md](./WEB_INTERFACE.md) - Web interface usage guide
- [DATA_ARCHITECTURE.md](./DATA_ARCHITECTURE.md) - Data architecture overview
- [SWITCH_TO_REAL_DATA.md](./SWITCH_TO_REAL_DATA.md) - Guide to integrate real data sources

## License

MIT
