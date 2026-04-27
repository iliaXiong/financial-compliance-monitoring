const { Pool } = require('pg');

async function testConnection() {
  console.log('Testing Supabase Session Pooler connection...\n');
  
  // 使用 Session Pooler (IPv4 兼容)
  const config = {
    host: 'db.ynbaatdsceqtqwmqhlgu.supabase.co',
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: 'KhpGTR6dMFzZz7qq',
    connectionTimeoutMillis: 10000,
  };
  
  console.log('连接配置:');
  console.log(`  Host: ${config.host}`);
  console.log(`  Port: ${config.port}`);
  console.log(`  Database: ${config.database}`);
  console.log(`  User: ${config.user}`);
  console.log('');
  
  const pool = new Pool(config);
  
  try {
    console.log('正在连接...');
    const result = await pool.query('SELECT version(), current_database(), current_user, inet_server_addr()');
    console.log('✅ 连接成功！\n');
    console.log('数据库信息:');
    console.log(`  数据库: ${result.rows[0].current_database}`);
    console.log(`  用户: ${result.rows[0].current_user}`);
    console.log(`  服务器IP: ${result.rows[0].inet_server_addr || 'N/A'}`);
    console.log('');
    
    // 测试创建表权限
    console.log('测试数据库权限...');
    await pool.query('CREATE TABLE IF NOT EXISTS test_connection (id SERIAL PRIMARY KEY)');
    await pool.query('DROP TABLE IF EXISTS test_connection');
    console.log('✅ 数据库权限正常\n');
    
    return true;
  } catch (error) {
    console.log('❌ 连接失败\n');
    console.log('错误信息:', error.message);
    console.log('错误代码:', error.code);
    console.log('');
    
    if (error.code === 'ENOTFOUND') {
      console.log('DNS 解析失败。可能的原因:');
      console.log('  1. 项目使用 IPv6，但你的网络只支持 IPv4');
      console.log('  2. 需要使用 Session Pooler 或 Transaction Pooler');
      console.log('  3. 项目可能还在创建中');
    } else if (error.code === 'ECONNREFUSED') {
      console.log('连接被拒绝。可能的原因:');
      console.log('  1. 端口不正确');
      console.log('  2. 防火墙阻止连接');
    } else if (error.message.includes('password')) {
      console.log('认证失败。请检查:');
      console.log('  1. 数据库密码是否正确');
      console.log('  2. 用户名是否正确');
    }
    
    return false;
  } finally {
    await pool.end();
  }
}

testConnection()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('测试失败:', error);
    process.exit(1);
  });
