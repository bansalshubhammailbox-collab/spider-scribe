import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Testing database access...');
    
    // Get Supabase credentials
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(JSON.stringify({ 
        error: 'Missing Supabase credentials',
        supabaseUrl: !!supabaseUrl,
        supabaseServiceKey: !!supabaseServiceKey
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Creating Supabase client...');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const testResults = {
      supabase_connection: false,
      tables_accessible: {},
      errors: []
    };

    // Test each table
    const tables = ['test_sessions', 'test_results', 'annotation_files', 'schema_files'];
    
    for (const table of tables) {
      try {
        console.log(`Testing table: ${table}`);
        const { data, error, count } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });
          
        if (error) {
          console.error(`Error accessing ${table}:`, error);
          testResults.tables_accessible[table] = false;
          testResults.errors.push(`${table}: ${error.message}`);
        } else {
          console.log(`Table ${table} accessible, row count: ${count}`);
          testResults.tables_accessible[table] = true;
        }
      } catch (tableError) {
        console.error(`Exception testing ${table}:`, tableError);
        testResults.tables_accessible[table] = false;
        testResults.errors.push(`${table}: ${tableError.message}`);
      }
    }

    // Test basic insert/select on test_sessions
    try {
      console.log('Testing insert capability...');
      const testSessionData = {
        session_name: 'Database Test Session',
        database: 'TEST_DB',
        total_questions: 0
      };
      
      const { data: insertData, error: insertError } = await supabase
        .from('test_sessions')
        .insert(testSessionData)
        .select()
        .single();
        
      if (insertError) {
        testResults.errors.push(`Insert test failed: ${insertError.message}`);
      } else {
        console.log('Insert test successful:', insertData.id);
        
        // Clean up test data
        await supabase
          .from('test_sessions')
          .delete()
          .eq('id', insertData.id);
          
        testResults.supabase_connection = true;
      }
    } catch (insertException) {
      testResults.errors.push(`Insert exception: ${insertException.message}`);
    }

    const allTablesAccessible = Object.values(testResults.tables_accessible).every(Boolean);
    
    return new Response(JSON.stringify({
      success: testResults.supabase_connection && allTablesAccessible,
      connection_status: testResults.supabase_connection ? 'Connected' : 'Failed',
      tables_status: testResults.tables_accessible,
      errors: testResults.errors,
      environment: {
        supabase_url: supabaseUrl?.substring(0, 30) + '...',
        has_service_key: !!supabaseServiceKey
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Database test function error:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false,
      connection_status: 'Failed'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});