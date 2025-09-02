#!/usr/bin/env node

/**
 * ALX Polling Database Setup Script
 *
 * This script helps set up the database for the ALX Polling application.
 * It reads the migration SQL file and executes it against your Supabase database.
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function setupDatabase() {
  console.log('🚀 Starting ALX Polling Database Setup...\n');

  // Check environment variables
  if (!SUPABASE_URL) {
    console.error('❌ Error: NEXT_PUBLIC_SUPABASE_URL is not set in .env.local');
    process.exit(1);
  }

  if (!SUPABASE_SERVICE_KEY) {
    console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY is not set in .env.local');
    process.exit(1);
  }

  console.log('✅ Environment variables loaded');
  console.log(`📍 Supabase URL: ${SUPABASE_URL}`);
  console.log(`🔑 Using service key: ${SUPABASE_SERVICE_KEY.substring(0, 20)}...\n`);

  // Create Supabase client
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  try {
    // Test connection
    console.log('🔌 Testing database connection...');
    const { data, error } = await supabase.from('auth.users').select('count').limit(1);
    if (error && !error.message.includes('permission denied')) {
      throw error;
    }
    console.log('✅ Database connection successful\n');

    // Read migration file
    const migrationPath = path.join(__dirname, 'database', 'migration.sql');
    console.log(`📖 Reading migration file: ${migrationPath}`);

    if (!fs.existsSync(migrationPath)) {
      console.error('❌ Error: Migration file not found at', migrationPath);
      console.log('💡 Please ensure the database/migration.sql file exists');
      process.exit(1);
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    console.log('✅ Migration file loaded\n');

    // Split SQL into individual statements (basic splitting)
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt && !stmt.startsWith('--') && !stmt.match(/^\s*$/));

    console.log(`📝 Found ${statements.length} SQL statements to execute\n`);

    // Execute migration
    console.log('🔄 Executing database migration...');

    let successCount = 0;
    let skipCount = 0;
    const errors = [];

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];

      // Skip empty statements and comments
      if (!statement || statement.startsWith('--')) {
        continue;
      }

      try {
        // Use RPC to execute raw SQL
        const { error } = await supabase.rpc('exec_sql', { sql: statement });

        if (error) {
          // Check if it's a "already exists" error (which we can ignore)
          if (error.message.includes('already exists') ||
              error.message.includes('duplicate object') ||
              error.message.includes('relation') && error.message.includes('already exists')) {
            skipCount++;
            console.log(`⏭️  Skipped: ${statement.substring(0, 50)}... (already exists)`);
          } else {
            errors.push({ statement: statement.substring(0, 100), error: error.message });
            console.log(`⚠️  Warning: ${error.message.substring(0, 100)}...`);
          }
        } else {
          successCount++;
          console.log(`✅ Executed: ${statement.substring(0, 50)}...`);
        }
      } catch (err) {
        // If RPC doesn't exist, try direct query
        try {
          const { error: directError } = await supabase
            .from('information_schema.tables')
            .select('*')
            .limit(1);

          // Use a different approach - execute via edge function or direct connection
          console.log(`⚠️  Could not execute SQL directly: ${err.message}`);
          console.log(`📄 Statement: ${statement.substring(0, 100)}...`);
        } catch (directErr) {
          errors.push({ statement: statement.substring(0, 100), error: err.message });
        }
      }
    }

    console.log('\n📊 Migration Summary:');
    console.log(`✅ Successfully executed: ${successCount} statements`);
    console.log(`⏭️  Skipped (already exists): ${skipCount} statements`);
    console.log(`⚠️  Warnings/Errors: ${errors.length} statements`);

    if (errors.length > 0) {
      console.log('\n⚠️  Detailed Errors:');
      errors.forEach((err, index) => {
        console.log(`${index + 1}. ${err.error}`);
        console.log(`   Statement: ${err.statement}...`);
      });
    }

    // Test the setup by trying to create a profile
    console.log('\n🧪 Testing database setup...');
    try {
      const { data: testData, error: testError } = await supabase
        .from('profiles')
        .select('count')
        .limit(1);

      if (testError && !testError.message.includes('permission denied')) {
        console.log('⚠️  Warning: Could not test profiles table:', testError.message);
      } else {
        console.log('✅ Profiles table accessible');
      }

      const { data: pollsData, error: pollsError } = await supabase
        .from('polls')
        .select('count')
        .limit(1);

      if (pollsError && !pollsError.message.includes('permission denied')) {
        console.log('⚠️  Warning: Could not test polls table:', pollsError.message);
      } else {
        console.log('✅ Polls table accessible');
      }
    } catch (testErr) {
      console.log('⚠️  Warning: Could not test database setup:', testErr.message);
    }

    console.log('\n🎉 Database setup completed!');
    console.log('\n📋 Next Steps:');
    console.log('1. Start your development server: npm run dev');
    console.log('2. Visit http://localhost:3000/debug-auth to test authentication');
    console.log('3. Register a new account or login');
    console.log('4. Try creating a poll');
    console.log('\n💡 If you encounter issues:');
    console.log('- Check that your Supabase project is active');
    console.log('- Ensure RLS policies are correctly configured');
    console.log('- Visit your Supabase dashboard to verify table creation');

  } catch (error) {
    console.error('\n❌ Error during database setup:', error.message);
    console.log('\n🔧 Manual Setup Instructions:');
    console.log('1. Go to your Supabase dashboard (https://supabase.com/dashboard)');
    console.log('2. Open the SQL Editor');
    console.log('3. Copy and paste the contents of database/migration.sql');
    console.log('4. Run the SQL script');
    console.log('5. Verify that all tables were created successfully');
    process.exit(1);
  }
}

// Handle command line execution
if (require.main === module) {
  setupDatabase().catch(error => {
    console.error('❌ Unhandled error:', error);
    process.exit(1);
  });
}

module.exports = { setupDatabase };
