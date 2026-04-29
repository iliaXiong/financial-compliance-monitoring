const { Pool } = require('pg');

// Supabase连接配置 - 使用直连端口
const pool = new Pool({
  host: 'aws-0-ap-southeast-1.pooler.supabase.com',
  port: 5432,  // 使用直连端口而不是Pooler
  database: 'postgres',
  user: 'postgres.ynbaatdsceqtqwmqhlgu',
  password: 'KhpGTR6dMFzZz7qq',
  ssl: {
    rejectUnauthorized: false
  }
});

async function createDemoUser() {
  console.log('==========================================');
  console.log('在Supabase中创建演示用户');
  console.log('==========================================\n');

  try {
    // 测试连接
    console.log('正在连接到Supabase数据库...');
    await pool.query('SELECT NOW()');
    console.log('✅ 数据库连接成功\n');

    // 创建演示用户
    console.log('正在创建演示用户...');
    const insertResult = await pool.query(`
      INSERT INTO users (id, email, password_hash, name, created_at, updated_at)
      VALUES (
        '00000000-0000-0000-0000-000000000000',
        'demo@example.com',
        '$2b$10$dummyhashfordemopurposesonly',
        'Demo User',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      )
      ON CONFLICT (id) DO NOTHING
      RETURNING id, email, name
    `);

    if (insertResult.rowCount > 0) {
      console.log('✅ 演示用户创建成功！\n');
    } else {
      console.log('ℹ️  演示用户已存在，跳过创建\n');
    }

    // 验证用户
    console.log('正在验证用户...');
    const verifyResult = await pool.query(`
      SELECT id, email, name, created_at 
      FROM users 
      WHERE id = '00000000-0000-0000-0000-000000000000'
    `);

    if (verifyResult.rows.length > 0) {
      const user = verifyResult.rows[0];
      console.log('✅ 用户验证成功！\n');
      console.log('用户信息：');
      console.log(`  ID: ${user.id}`);
      console.log(`  Email: ${user.email}`);
      console.log(`  Name: ${user.name}`);
      console.log(`  Created: ${user.created_at}\n`);
      
      console.log('==========================================');
      console.log('✅ 完成！现在可以在前端创建任务了');
      console.log('==========================================');
    } else {
      console.log('❌ 用户验证失败');
    }

  } catch (error) {
    console.error('\n❌ 错误:', error.message);
    console.error('\n详细信息:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

createDemoUser();
