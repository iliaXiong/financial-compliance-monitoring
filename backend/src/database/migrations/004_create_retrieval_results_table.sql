-- Create retrieval_results table
CREATE TABLE IF NOT EXISTS retrieval_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id UUID NOT NULL REFERENCES executions(id) ON DELETE CASCADE,
  website_url TEXT NOT NULL,
  keyword VARCHAR(255) NOT NULL,
  found BOOLEAN NOT NULL DEFAULT false,
  content TEXT,
  context TEXT,
  source_url TEXT,
  document_url TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_retrieval_results_execution_id ON retrieval_results(execution_id);
CREATE INDEX IF NOT EXISTS idx_retrieval_results_keyword ON retrieval_results(keyword);
CREATE INDEX IF NOT EXISTS idx_retrieval_results_found ON retrieval_results(found);
