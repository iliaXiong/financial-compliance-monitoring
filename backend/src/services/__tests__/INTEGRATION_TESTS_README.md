# Integration Tests - Financial Compliance Monitoring System

## Overview

This document describes the integration tests implemented for Task 19.1 of the Financial Compliance Monitoring System.

## Test File Location

`backend/src/services/__tests__/integration.test.ts`

## Test Coverage

The integration tests cover the complete task creation and execution flow, testing the integration between multiple services without requiring actual database or Redis infrastructure.

### Test Suites

#### 1. Task Creation and Validation
Tests the TaskManager service's validation logic:
- **Property 1**: Rejects task creation with empty keywords
- **Property 1**: Rejects task creation with empty target websites
- Validates URL format requirements
- Validates schedule configuration

#### 2. Multi-Website Parallel Retrieval
Tests the SubagentOrchestrator and ContentRetriever integration:
- **Property 4**: Creates retrieval attempts for all website-keyword combinations (N × M)
- **Property 6**: Continues processing other websites when one fails (error tolerance)
- **Property 12**: Handles timeout and returns partial results

#### 3. Content Retrieval and Analysis
Tests the ContentRetriever and AnalysisService integration:
- **Property 8**: Searches keywords in both page and document content
- **Property 9**: Generates summary document with sources using LLM API

#### 4. Property-Based Testing
Uses fast-check library for property-based testing:
- **Property 1**: Validates all task configurations consistently (50 iterations)
- **Property 4**: Calculates correct number of retrieval attempts for any N websites and M keywords (50 iterations)

#### 5. Complete Workflow
Tests the end-to-end workflow:
- Task validation → Parallel retrieval → Analysis → Summary generation
- Verifies all components work together correctly

## Test Results

```
Test Suites: 1 passed, 1 total
Tests:       11 passed, 11 total
```

All integration tests pass successfully.

## Key Features Tested

### 1. Data Consistency
- Task configuration round-trip (create → retrieve)
- Retrieval results persistence
- Summary document generation with sources

### 2. Error Tolerance
- Single website failure doesn't stop processing
- Document reading failures don't prevent page content processing
- Timeout handling with partial results

### 3. Parallel Processing
- Multiple websites processed concurrently
- Correct number of retrieval attempts (N websites × M keywords)
- Timeout control mechanism

### 4. Validation Logic
- Form validation for empty fields
- URL format validation
- Schedule configuration validation

## Mocking Strategy

The tests use mocked external dependencies to focus on service integration logic:

- **axios**: Mocked for HTTP requests
- **Database**: Not required (validation logic tested without DB)
- **LLM API**: Mocked using global.fetch
- **Jina Reader**: Mocked via axios

This approach allows testing the integration logic without requiring actual infrastructure, making tests fast and reliable.

## Property-Based Testing

The tests use `fast-check` library to generate random test data and verify properties hold across all inputs:

- Minimum 50 iterations per property test
- Smart generators that produce valid data
- Filters to ensure data meets constraints

## Running the Tests

```bash
# Run integration tests
npm test -- src/services/__tests__/integration.test.ts

# Run with coverage
npm test -- src/services/__tests__/integration.test.ts --coverage

# Run in watch mode
npm test -- src/services/__tests__/integration.test.ts --watch
```

## Design Document Properties Validated

The integration tests validate the following properties from the design document:

- **Property 1**: 任务创建表单验证
- **Property 4**: 多网站检索完整性
- **Property 6**: 错误容错性
- **Property 8**: 文档内容搜索
- **Property 9**: 总结文档生成
- **Property 12**: 并行执行超时处理

## Notes

- Tests are designed to run without actual database or Redis
- External services (Jina Reader, LLM API) are mocked
- Focus is on testing service integration logic
- All tests complete in under 5 seconds
