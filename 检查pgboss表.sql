-- 检查pg-boss相关的表是否存在

-- 1. 查看所有schema
SELECT 
  '=== 所有Schema ===' as section,
  schema_name
FROM information_schema.schemata
ORDER BY schema_name;

-- 2. 查看pgboss schema中的表
SELECT 
  '=== pgboss Schema中的表 ===' as section,
  table_name
FROM information_schema.tables
WHERE table_schema = 'pgboss'
ORDER BY table_name;

-- 3. 查看public schema中的表
SELECT 
  '=== public Schema中的表 ===' as section,
  table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- 4. 如果pgboss表存在，查看job队列
SELECT 
  '=== pg-boss Job队列 ===' as section,
  name,
  state,
  COUNT(*) as count
FROM pgboss.job
GROUP BY name, state
ORDER BY name, state;

-- 5. 查看pg-boss版本表
SELECT 
  '=== pg-boss版本 ===' as section,
  version,
  maintained_on,
  cron_on
FROM pgboss.version;
