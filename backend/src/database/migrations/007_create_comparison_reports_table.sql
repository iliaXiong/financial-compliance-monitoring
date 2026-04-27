-- Create comparison_reports table
CREATE TABLE IF NOT EXISTS comparison_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  current_execution_id UUID NOT NULL REFERENCES executions(id) ON DELETE CASCADE,
  previous_execution_id UUID NOT NULL REFERENCES executions(id) ON DELETE CASCADE,
  website_url TEXT NOT NULL,
  keyword VARCHAR(255) NOT NULL,
  changes JSONB NOT NULL,
  summary TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_comparison_reports_current_execution ON comparison_reports(current_execution_id);
CREATE INDEX IF NOT EXISTS idx_comparison_reports_previous_execution ON comparison_reports(previous_execution_id);
