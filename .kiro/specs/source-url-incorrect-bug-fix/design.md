# Source URL Incorrect Bugfix Design

## Overview

This bugfix addresses the issue where source URLs in retrieval results incorrectly point to the main website URL instead of the actual sub-page or document URL where keywords were found. The bug stems from three interconnected issues: (1) the `KeywordMatch` interface lacks a `sourceUrl` field, (2) the `parseLLMSearchResponse()` method doesn't extract `sourceUrl` from LLM responses, and (3) `TaskScheduler.ts` defaults to using `result.websiteUrl` when saving retrieval results. The fix involves adding the `sourceUrl` field to the interface, extracting it during parsing, and using it when saving results, with proper fallback to `result.websiteUrl` when `sourceUrl` is unavailable.

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug - when the LLM returns a `sourceUrl` field in the search response but the system fails to extract and use it
- **Property (P)**: The desired behavior when the bug condition occurs - the system should extract `sourceUrl` from the LLM response and use it when saving retrieval results
- **Preservation**: Existing fallback behavior (using `result.websiteUrl` when `sourceUrl` is unavailable) and document result handling that must remain unchanged
- **KeywordMatch**: The interface in `backend/src/types/index.ts` that represents a keyword search result
- **parseLLMSearchResponse()**: The method in `ContentRetriever.ts` (line 664-722) that parses LLM search responses into structured data
- **TaskScheduler.executeTask()**: The method in `TaskScheduler.ts` (line 280-350) that saves retrieval results to the database
- **sourceUrl**: The specific sub-page or document URL where a keyword was found (returned by the LLM)
- **websiteUrl**: The main website URL (e.g., https://www.nyse.com/index) used as a fallback

## Bug Details

### Bug Condition

The bug manifests when the LLM returns a search response containing a `sourceUrl` field that points to a specific sub-page or document, but the system fails to extract and use this URL. The `parseLLMSearchResponse()` method creates `KeywordMatch` objects without a `sourceUrl` field, and `TaskScheduler.executeTask()` defaults to using `result.websiteUrl` (the main website URL) when saving retrieval results.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type { llmResponse: object, keywordResult: object }
  OUTPUT: boolean
  
  RETURN input.keywordResult.sourceUrl IS_DEFINED
         AND input.keywordResult.found === true
         AND parsedKeywordMatch.sourceUrl IS_UNDEFINED
END FUNCTION
```

### Examples

- **Example 1**: LLM returns `{ keyword: "trading hours", found: true, sourceUrl: "https://www.nyse.com/markets/hours-calendars", context: "..." }` but the system saves `sourceUrl: "https://www.nyse.com/index"` to the database
  - Expected: `sourceUrl` should be `"https://www.nyse.com/markets/hours-calendars"`
  - Actual: `sourceUrl` is `"https://www.nyse.com/index"` (main website URL)

- **Example 2**: LLM returns `{ keyword: "compliance", found: true, sourceUrl: "https://www.sec.gov/rules/final/2023/33-11234.pdf", context: "..." }` but the system saves `sourceUrl: "https://www.sec.gov"` to the database
  - Expected: `sourceUrl` should be `"https://www.sec.gov/rules/final/2023/33-11234.pdf"`
  - Actual: `sourceUrl` is `"https://www.sec.gov"` (main website URL)

- **Example 3**: LLM returns `{ keyword: "market data", found: true, sourceUrl: "https://www.nasdaq.com/market-activity/stocks", context: "..." }` but the system saves `sourceUrl: "https://www.nasdaq.com"` to the database
  - Expected: `sourceUrl` should be `"https://www.nasdaq.com/market-activity/stocks"`
  - Actual: `sourceUrl` is `"https://www.nasdaq.com"` (main website URL)

- **Edge Case**: LLM returns `{ keyword: "test", found: true, context: "..." }` without a `sourceUrl` field - system should fall back to `result.websiteUrl`
  - Expected: `sourceUrl` should be `result.websiteUrl` (fallback behavior)

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Fallback to `result.websiteUrl` when LLM response does not include a `sourceUrl` field must continue to work
- Saving retrieval results for failed retrievals or websites with no matches must continue to use `result.websiteUrl`
- Document result handling (saving both `sourceUrl` and `documentUrl`) must remain unchanged
- Parsing of other fields (keyword, found, occurrences, contexts) must continue to work correctly
- LLM search prompt requirements must remain unchanged

**Scope:**
All inputs that do NOT involve LLM responses with a `sourceUrl` field should be completely unaffected by this fix. This includes:
- Failed retrievals (status === 'failed')
- Websites with no keyword matches (keywordMatches.length === 0)
- LLM responses that don't include `sourceUrl` in the JSON
- Document results processing (already handles `documentUrl` correctly)

## Hypothesized Root Cause

Based on the bug description and code analysis, the root causes are:

1. **Missing Interface Field**: The `KeywordMatch` interface in `backend/src/types/index.ts` (line 164-169) does not include a `sourceUrl` field, so the parsed data structure cannot store the source URL information

2. **Incomplete Parsing Logic**: The `parseLLMSearchResponse()` method in `ContentRetriever.ts` (line 664-722) creates `KeywordMatch` objects with only `keyword`, `found`, `occurrences`, and `contexts` fields, but does not extract or store the `sourceUrl` field from `result.sourceUrl` in the LLM response

3. **Incorrect Default Value**: The `TaskScheduler.executeTask()` method in `TaskScheduler.ts` (line 280-350) always uses `result.websiteUrl` when creating retrieval results, even when a more specific `sourceUrl` is available in the `KeywordMatch` object

4. **Data Flow Gap**: There is no mechanism to pass the `sourceUrl` from the LLM response through the `KeywordMatch` object to the database save operation

## Correctness Properties

Property 1: Bug Condition - Source URL Extraction and Usage

_For any_ LLM search response where a keyword result contains a `sourceUrl` field and `found` is true, the fixed system SHALL extract the `sourceUrl` from the LLM response, store it in the `KeywordMatch` object, and use it when saving the retrieval result to the database, ensuring users are directed to the specific sub-page or document where the keyword was found.

**Validates: Requirements 2.1, 2.2, 2.3, 2.4**

Property 2: Preservation - Fallback Behavior

_For any_ LLM search response where a keyword result does NOT contain a `sourceUrl` field, or for failed retrievals or websites with no matches, the fixed system SHALL produce exactly the same behavior as the original system, using `result.websiteUrl` as the fallback source URL and preserving all existing functionality for edge cases and error conditions.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

**File 1**: `backend/src/types/index.ts`

**Interface**: `KeywordMatch`

**Specific Changes**:
1. **Add sourceUrl Field**: Add an optional `sourceUrl?: string` field to the `KeywordMatch` interface to store the specific URL where the keyword was found

**File 2**: `backend/src/services/ContentRetriever.ts`

**Function**: `parseLLMSearchResponse()`

**Specific Changes**:
1. **Extract sourceUrl from LLM Response**: When creating the `KeywordMatch` object, extract `result.sourceUrl` from the LLM response and include it in the object
   - Add: `sourceUrl: result.sourceUrl` to the `keywordMatch` object construction
   - This should only be added if `result.sourceUrl` is defined

2. **Preserve Document Tracking Logic**: Ensure the existing logic that tracks which documents contain which keywords continues to work correctly with the new `sourceUrl` field

**File 3**: `backend/src/services/TaskScheduler.ts`

**Function**: `executeTask()`

**Specific Changes**:
1. **Use sourceUrl from KeywordMatch**: When creating retrieval results for successful keyword matches, use `keywordMatch.sourceUrl` if available, otherwise fall back to `result.websiteUrl`
   - Change: `sourceUrl: result.websiteUrl` to `sourceUrl: keywordMatch.sourceUrl || result.websiteUrl`
   - This applies to the section where `keywordMatch` results are saved (around line 315-325)

2. **Preserve Failed Retrieval Logic**: Keep the existing logic for failed retrievals unchanged - they should continue to use `result.websiteUrl`

3. **Preserve Document Result Logic**: Keep the existing logic for document results unchanged - they already handle `documentUrl` correctly

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code by verifying that source URLs are incorrectly set to the main website URL, then verify the fix correctly extracts and uses `sourceUrl` from LLM responses while preserving fallback behavior for edge cases.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm that the system incorrectly uses `result.websiteUrl` instead of the specific `sourceUrl` from the LLM response.

**Test Plan**: Write tests that mock LLM responses containing `sourceUrl` fields, run the unfixed code, and verify that the saved retrieval results incorrectly use `result.websiteUrl` instead of the specific `sourceUrl`. This will confirm the root cause analysis.

**Test Cases**:
1. **Sub-page URL Test**: Mock LLM response with `sourceUrl: "https://www.nyse.com/markets/hours-calendars"` and verify unfixed code saves `sourceUrl: "https://www.nyse.com/index"` (will fail on unfixed code)
2. **Document URL Test**: Mock LLM response with `sourceUrl: "https://www.sec.gov/rules/final/2023/33-11234.pdf"` and verify unfixed code saves `sourceUrl: "https://www.sec.gov"` (will fail on unfixed code)
3. **Multiple Keywords Test**: Mock LLM response with multiple keywords having different `sourceUrl` values and verify unfixed code saves all with the same `result.websiteUrl` (will fail on unfixed code)
4. **Missing sourceUrl Test**: Mock LLM response without `sourceUrl` field and verify unfixed code correctly falls back to `result.websiteUrl` (should pass on unfixed code)

**Expected Counterexamples**:
- Retrieval results saved to database have `sourceUrl` set to `result.websiteUrl` instead of the specific `sourceUrl` from the LLM response
- Possible causes: `KeywordMatch` interface missing `sourceUrl` field, `parseLLMSearchResponse()` not extracting `sourceUrl`, `TaskScheduler` not using `keywordMatch.sourceUrl`

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds (LLM response contains `sourceUrl`), the fixed system correctly extracts and uses the `sourceUrl`.

**Pseudocode:**
```
FOR ALL llmResponse WHERE llmResponse.keywordResults[i].sourceUrl IS_DEFINED DO
  keywordMatch := parseLLMSearchResponse_fixed(llmResponse)
  ASSERT keywordMatch.sourceUrl === llmResponse.keywordResults[i].sourceUrl
  
  retrievalResult := saveRetrievalResult_fixed(keywordMatch)
  ASSERT retrievalResult.sourceUrl === keywordMatch.sourceUrl
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold (LLM response missing `sourceUrl`, failed retrievals, no matches), the fixed system produces the same result as the original system.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT executeTask_original(input) = executeTask_fixed(input)
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain (various LLM response formats, edge cases)
- It catches edge cases that manual unit tests might miss (missing fields, null values, empty arrays)
- It provides strong guarantees that behavior is unchanged for all non-buggy inputs

**Test Plan**: Observe behavior on UNFIXED code first for edge cases (missing `sourceUrl`, failed retrievals, no matches), then write property-based tests capturing that behavior.

**Test Cases**:
1. **Missing sourceUrl Preservation**: Observe that unfixed code uses `result.websiteUrl` when `sourceUrl` is missing, then verify fixed code does the same
2. **Failed Retrieval Preservation**: Observe that unfixed code uses `result.websiteUrl` for failed retrievals, then verify fixed code does the same
3. **No Matches Preservation**: Observe that unfixed code uses `result.websiteUrl` when no matches are found, then verify fixed code does the same
4. **Document Results Preservation**: Observe that unfixed code correctly handles `documentUrl` for document results, then verify fixed code does the same

### Unit Tests

- Test `parseLLMSearchResponse()` with LLM responses containing `sourceUrl` fields
- Test `parseLLMSearchResponse()` with LLM responses missing `sourceUrl` fields
- Test `executeTask()` saving retrieval results with `sourceUrl` from `KeywordMatch`
- Test `executeTask()` falling back to `result.websiteUrl` when `keywordMatch.sourceUrl` is undefined
- Test edge cases: empty `sourceUrl`, null values, malformed URLs

### Property-Based Tests

- Generate random LLM responses with varying `sourceUrl` presence and verify correct extraction and usage
- Generate random combinations of successful/failed retrievals and verify preservation of fallback behavior
- Generate random document results and verify preservation of `documentUrl` handling
- Test that all non-sourceUrl fields (keyword, found, occurrences, contexts) continue to be extracted correctly

### Integration Tests

- Test full task execution flow with real LLM responses containing `sourceUrl` fields
- Test that saved retrieval results in the database have correct `sourceUrl` values
- Test that summary documents and comparison reports use the correct source URLs
- Test that frontend displays correct source links that navigate to specific sub-pages
