-- Create cross_site_analyses table
CREATE TABLE IF NOT EXISTS cross_site_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id UUID NOT NULL REFERENCES executions(id) ON DELETE CASCADE,
  keyword VARCHAR(255) NOT NULL,
  differences JSONB NOT NULL,
  commonalities JSONB NOT NULL,
  analysis_summary TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_cross_site_analyses_execution_id ON cross_site_analyses(execution_id);
CREATE INDEX IF NOT EXISTS idx_cross_site_analyses_keyword ON cross_site_analyses(keyword);
