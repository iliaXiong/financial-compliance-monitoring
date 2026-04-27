-- Create original_contents table
CREATE TABLE IF NOT EXISTS original_contents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  retrieval_result_id UUID NOT NULL REFERENCES retrieval_results(id) ON DELETE CASCADE,
  content_type VARCHAR(50) NOT NULL,
  raw_content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_original_contents_retrieval_result_id ON original_contents(retrieval_result_id);
