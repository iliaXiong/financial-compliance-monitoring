# Bugfix Requirements Document

## Introduction

The source URLs in retrieval results are incorrectly pointing to the main website URL instead of the actual sub-page or document URL where the keyword was found. This makes source links useless for users trying to verify information, as they are redirected to the main website homepage rather than the specific page containing the relevant content.

The bug occurs because the `KeywordMatch` interface lacks a `sourceUrl` field, the `parseLLMSearchResponse()` method does not extract the `sourceUrl` from the LLM response, and `TaskScheduler.ts` defaults to using `result.websiteUrl` (the main website URL) when saving retrieval results.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN the LLM returns a search response with a `sourceUrl` field pointing to a sub-page or document THEN the system does not extract or store the `sourceUrl` from the LLM response

1.2 WHEN saving retrieval results to the database THEN the system uses `result.websiteUrl` (the main website URL) instead of the actual `sourceUrl` where the keyword was found

1.3 WHEN users click on source links in the summary document or retrieval results THEN they are taken to the main website URL (e.g., https://www.nyse.com/index) instead of the specific sub-page or document where the content was found

1.4 WHEN the `KeywordMatch` object is created in `parseLLMSearchResponse()` THEN it does not include a `sourceUrl` field, causing the actual source URL information to be lost

### Expected Behavior (Correct)

2.1 WHEN the LLM returns a search response with a `sourceUrl` field pointing to a sub-page or document THEN the system SHALL extract and store the `sourceUrl` from the LLM response in the `KeywordMatch` object

2.2 WHEN saving retrieval results to the database THEN the system SHALL use the actual `sourceUrl` from the `KeywordMatch` object (if available) instead of defaulting to `result.websiteUrl`

2.3 WHEN users click on source links in the summary document or retrieval results THEN they SHALL be taken directly to the specific sub-page or document URL where the keyword was found

2.4 WHEN the `KeywordMatch` object is created in `parseLLMSearchResponse()` THEN it SHALL include a `sourceUrl` field populated with the value from the LLM response

### Unchanged Behavior (Regression Prevention)

3.1 WHEN the LLM response does not include a `sourceUrl` field for a keyword match THEN the system SHALL CONTINUE TO fall back to using `result.websiteUrl` as the source URL

3.2 WHEN saving retrieval results for failed retrievals or websites with no matches THEN the system SHALL CONTINUE TO use `result.websiteUrl` as the source URL

3.3 WHEN processing document results THEN the system SHALL CONTINUE TO save both `sourceUrl` and `documentUrl` fields correctly

3.4 WHEN the LLM search prompt requests `sourceUrl` in the JSON response format THEN the system SHALL CONTINUE TO include this requirement in the prompt

3.5 WHEN parsing the LLM response for other fields (keyword, found, occurrences, contexts) THEN the system SHALL CONTINUE TO extract these fields correctly
