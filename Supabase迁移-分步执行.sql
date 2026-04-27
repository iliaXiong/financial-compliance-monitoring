-- ============================================
-- 步骤 1: 创建 users 表
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ============================================
-- 步骤 2: 创建 tasks 表
-- ============================================
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  keywords TEXT[] NOT NULL,
  target_websites TEXT[] NOT NULL,
  schedule_type VARCHAR(20) NOT NULL CHECK (schedule_type IN ('once', 'daily', 'weekly', 'monthly')),
  schedule_time TIME,
  schedule_day_of_week INTEGER CHECK (schedule_day_of_week BETWEEN 0 AND 6),
  schedule_day_of_month INTEGER CHECK (schedule_day_of_month BETWEEN 1 AND 31),
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'deleted')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_executed_at TIMESTAMP,
  next_execution_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_next_execution ON tasks(next_execution_at) WHERE status = 'active';

-- ============================================
-- 步骤 3: 创建 executions 表
-- ============================================
CREATE TABLE IF NOT EXISTS executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed')),
  start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  end_time TIMESTAMP,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_executions_task_id ON executions(task_id);
CREATE INDEX IF NOT EXISTS idx_executions_start_time ON executions(start_time DESC);
CREATE INDEX IF NOT EXISTS idx_executions_status ON executions(status);

-- ============================================
-- 步骤 4: 创建 retrieval_results 表
-- ============================================
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

CREATE INDEX IF NOT EXISTS idx_retrieval_results_execution_id ON retrieval_results(execution_id);
CREATE INDEX IF NOT EXISTS idx_retrieval_results_keyword ON retrieval_results(keyword);
CREATE INDEX IF NOT EXISTS idx_retrieval_results_found ON retrieval_results(found);

-- ============================================
-- 步骤 5: 创建 original_contents 表
-- ============================================
CREATE TABLE IF NOT EXISTS original_contents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  retrieval_result_id UUID NOT NULL REFERENCES retrieval_results(id) ON DELETE CASCADE,
  content_type VARCHAR(50) NOT NULL,
  raw_content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_original_contents_retrieval_result_id ON original_contents(retrieval_result_id);

-- ============================================
-- 步骤 6: 创建 summary_documents 表
-- ============================================
CREATE TABLE IF NOT EXISTS summary_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id UUID NOT NULL REFERENCES executions(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  sources JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_summary_documents_execution_id ON summary_documents(execution_id);

-- ============================================
-- 步骤 7: 创建 comparison_reports 表
-- ============================================
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

CREATE INDEX IF NOT EXISTS idx_comparison_reports_current_execution ON comparison_reports(current_execution_id);
CREATE INDEX IF NOT EXISTS idx_comparison_reports_previous_execution ON comparison_reports(previous_execution_id);

-- ============================================
-- 步骤 8: 创建 cross_site_analyses 表
-- ============================================
CREATE TABLE IF NOT EXISTS cross_site_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id UUID NOT NULL REFERENCES executions(id) ON DELETE CASCADE,
  keyword VARCHAR(255) NOT NULL,
  differences JSONB NOT NULL,
  commonalities JSONB NOT NULL,
  analysis_summary TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cross_site_analyses_execution_id ON cross_site_analyses(execution_id);
CREATE INDEX IF NOT EXISTS idx_cross_site_analyses_keyword ON cross_site_analyses(keyword);
