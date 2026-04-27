# Technology Stack

## Architecture

State machine-driven multi-turn dialog system with LLM integration for market analysis.

## Core Components

- **Dialog Engine**: Manages conversation flow and state transitions
- **Underlying Analyzer**: Validates and analyzes underlying assets
- **Option Analyzer**: Filters and ranks option contracts
- **Trade Service**: Generates trade links and manages watchlists
- **Data Provider**: Unified interface for external market data APIs
- **LLM Service**: Market sentiment analysis and natural language generation
- **Greeks Calculator**: Option Greeks computation

## Tech Stack (Planned)

- **Language**: TypeScript (based on design interfaces)
- **Testing**: 
  - Unit tests with Jest or Vitest
  - Property-based testing with `fast-check`
  - Minimum 100 iterations per property test
- **Data Sources**: Real-time option data APIs (Yahoo Finance, Alpha Vantage, or specialized providers)
- **Storage**: Session state and watchlist persistence

## Testing Requirements

- Code coverage: Minimum 80%, core business logic 90%+
- All 16 correctness properties must have corresponding property tests
- Property tests must run at least 100 iterations
- Test comments must reference design properties using format:
  `Feature: options-trading-tool, Property {number}: {property_text}`

## Common Commands

Once implemented, typical commands will include:

```bash
# Install dependencies
npm install

# Run tests
npm test

# Run property tests only
npm run test:property

# Run with coverage
npm run test:coverage

# Start development server
npm run dev

# Build for production
npm run build
```
