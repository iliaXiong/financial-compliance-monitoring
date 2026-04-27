-- Create summary_documents table
CREATE TABLE IF NOT EXISTS summary_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id UUID NOT NULL REFERENCES executions(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  sources JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_summary_documents_execution_id ON summary_documents(execution_id);
