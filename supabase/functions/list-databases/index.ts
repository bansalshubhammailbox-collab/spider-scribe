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
    console.log('Starting database listing from Snowflake Spider2');
    
    // Get Snowflake credentials from Supabase secrets
    const snowflakeUser = Deno.env.get('SNOWFLAKE_USER');
    const snowflakePassword = Deno.env.get('SNOWFLAKE_PASSWORD');
    const snowflakeAccount = Deno.env.get('SNOWFLAKE_ACCOUNT');
    const snowflakeWarehouse = Deno.env.get('SNOWFLAKE_WAREHOUSE');

    if (!snowflakeUser || !snowflakePassword || !snowflakeAccount || !snowflakeWarehouse) {
      console.error('Missing Snowflake credentials');
      return new Response(JSON.stringify({ 
        error: 'Snowflake credentials not configured',
        details: 'Please configure SNOWFLAKE_USER, SNOWFLAKE_PASSWORD, SNOWFLAKE_ACCOUNT, and SNOWFLAKE_WAREHOUSE secrets'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Connecting to Snowflake with account:', snowflakeAccount);
    
    // Import Snowflake SDK
    const snowflake = await import('https://cdn.skypack.dev/snowflake-sdk@2.2.0');
    
    // Create Snowflake connection
    const connection = snowflake.createConnection({
      account: snowflakeAccount,
      username: snowflakeUser,
      password: snowflakePassword,
      warehouse: snowflakeWarehouse,
    });

    // Connect to Snowflake
    await new Promise((resolve, reject) => {
      connection.connect((err: any, conn: any) => {
        if (err) {
          console.error('Failed to connect to Snowflake:', err);
          reject(err);
        } else {
          console.log('Successfully connected to Snowflake');
          resolve(conn);
        }
      });
    });

    // Execute query to list databases
    const databases = await new Promise((resolve, reject) => {
      connection.execute({
        sqlText: 'SHOW DATABASES IN ACCOUNT',
        complete: (err: any, stmt: any, rows: any) => {
          if (err) {
            console.error('Error executing SHOW DATABASES:', err);
            reject(err);
          } else {
            console.log(`Found ${rows.length} databases`);
            
            // Filter for SPIDER2_ databases and format results
            const spider2Databases = rows
              .map((row: any) => ({
                name: row.name,
                display_name: row.name.replace('SPIDER2_', ''),
                created_on: row.created_on,
                is_default: row.is_default === 'Y',
                is_current: row.is_current === 'Y',
                database_id: row.database_id,
                owner: row.owner,
                comment: row.comment,
                retention_time: row.retention_time
              }))
              .filter((db: any) => db.name.startsWith('SPIDER2_'))
              .sort((a: any, b: any) => a.display_name.localeCompare(b.display_name));
            
            console.log(`Filtered to ${spider2Databases.length} Spider2 databases`);
            resolve(spider2Databases);
          }
        }
      });
    });

    // Close connection
    connection.destroy();

    return new Response(JSON.stringify({ 
      databases,
      total_count: databases.length,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in list-databases function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      details: 'Failed to list Spider2 databases from Snowflake'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});