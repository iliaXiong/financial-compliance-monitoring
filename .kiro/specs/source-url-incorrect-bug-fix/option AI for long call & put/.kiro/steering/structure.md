# Project Structure

## Current State

This is a new project with specification documents only. No source code has been implemented yet.

## Planned Structure

Based on the design document, the project should follow this organization:

```
.
├── src/
│   ├── dialog/              # Dialog engine and state management
│   │   ├── DialogEngine.ts
│   │   └── StateManager.ts
│   ├── analyzers/           # Analysis components
│   │   ├── UnderlyingAnalyzer.ts
│   │   └── OptionAnalyzer.ts
│   ├── services/            # Business services
│   │   ├── TradeService.ts
│   │   ├── LLMService.ts
│   │   └── DataProvider.ts
│   ├── calculators/         # Computation utilities
│   │   └── GreeksCalculator.ts
│   ├── types/               # TypeScript interfaces and enums
│   │   ├── dialog.ts
│   │   ├── market.ts
│   │   └── option.ts
│   └── utils/               # Helper functions
├── tests/
│   ├── unit/                # Unit tests
│   ├── property/            # Property-based tests
│   └── integration/         # Integration tests
└── .kiro/
    ├── specs/               # Specification documents
    └── steering/            # Project guidance rules
```

## Architecture Layers

1. **Interaction Layer**: Dialog engine, state manager
2. **Business Logic Layer**: Analyzers, trade service
3. **Data Layer**: Data provider, Greeks calculator, watchlist manager
4. **External Integration Layer**: LLM service, external data APIs

## Key Conventions

- Use TypeScript interfaces from design.md as contracts
- Implement error handling following the four error categories: Validation, Data, Business Logic, System
- All components should return structured error responses, never throw unhandled exceptions
- Maintain session state throughout dialog flow
- Use dependency injection for testability
