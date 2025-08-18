import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Create a session and execute queries with Snowflake REST API
async function createSnowflakeSession(account: string, username: string, password: string, warehouse: string) {
  const loginUrl = `https://${account}.snowflakecomputing.com/session/v1/login-request`;
  
  const loginResponse = await fetch(loginUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({
      data: {
        ACCOUNT_NAME: account,
        LOGIN_NAME: username,  
        PASSWORD: password
      }
    })
  });

  if (!loginResponse.ok) {
    const errorText = await loginResponse.text();
    throw new Error(`Snowflake login failed: ${loginResponse.status} - ${errorText}`);
  }

  const loginResult = await loginResponse.json();
  return loginResult.data;
}

async function executeSnowflakeQuery(sessionData: any, account: string, sqlText: string, warehouse?: string) {
  const queryUrl = `https://${account}.snowflakecomputing.com/queries/v1/query-request`;
  
  const body: any = {
    sqlText,
    sequenceId: Date.now()
  };
  
  if (warehouse) {
    body.warehouse = warehouse;
  }

  const response = await fetch(queryUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Snowflake Token="${sessionData.token}"`,
      'X-Snowflake-Authorization-Token-Type': 'KEYPAIR_JWT'
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Snowflake query failed: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  return result;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { database, sampleRows = 3 } = await req.json();
    
    if (!database) {
      return new Response(JSON.stringify({ 
        error: 'Database name is required' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Extracting schema for database: ${database} with ${sampleRows} sample rows`);
    
    // Get Snowflake credentials
    const snowflakeUser = Deno.env.get('SNOWFLAKE_USER');
    const snowflakePassword = Deno.env.get('SNOWFLAKE_PASSWORD');
    const snowflakeAccount = Deno.env.get('SNOWFLAKE_ACCOUNT');
    const snowflakeWarehouse = Deno.env.get('SNOWFLAKE_WAREHOUSE');

    if (!snowflakeUser || !snowflakePassword || !snowflakeAccount || !snowflakeWarehouse) {
      return new Response(JSON.stringify({ 
        error: 'Snowflake credentials not configured' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Creating Snowflake session...');
    const sessionData = await createSnowflakeSession(snowflakeAccount, snowflakeUser, snowflakePassword, snowflakeWarehouse);
    
    const startTime = performance.now();
    
    // Use database with SPIDER2_ prefix
    const fullDatabaseName = database.startsWith('SPIDER2_') ? database : `SPIDER2_${database}`;
    
    console.log(`Using database: ${fullDatabaseName}`);
    await executeSnowflakeQuery(sessionData, snowflakeAccount, `USE DATABASE ${fullDatabaseName}`, snowflakeWarehouse);
    
    // Get schemas
    console.log('Getting schemas...');
    const schemasResult = await executeSnowflakeQuery(sessionData, snowflakeAccount, 'SHOW SCHEMAS', snowflakeWarehouse);
    const schemas = schemasResult.data?.map((row: any) => row[1]).filter((name: string) => name !== 'INFORMATION_SCHEMA') || [];
    
    const schemaStructure: any = {};

    // For each schema, get tables and columns
    for (const schemaName of schemas) {
      console.log(`Processing schema: ${schemaName}`);
      schemaStructure[schemaName] = { tables: {} };

      // Get tables in schema
      const tablesResult = await executeSnowflakeQuery(sessionData, snowflakeAccount, `SHOW TABLES IN SCHEMA ${schemaName}`, snowflakeWarehouse);
      const tables = tablesResult.data?.map((row: any) => row[1]) || [];

      // For each table, get columns and sample data
      for (const tableName of tables) {
        console.log(`Processing table: ${schemaName}.${tableName}`);
        
        // Get column descriptions
        const columnsResult = await executeSnowflakeQuery(sessionData, snowflakeAccount, `DESCRIBE TABLE ${schemaName}.${tableName}`, snowflakeWarehouse);
        const columns = columnsResult.data?.map((row: any) => ({
          name: row[0],
          type: row[1],
          kind: row[2],
          null: row[3] === 'Y',
          default: row[4],
          primary_key: row[5] === 'Y',
          unique_key: row[6] === 'Y',
          check: row[7] === 'Y',
          expression: row[8],
          comment: row[9]
        })) || [];

        // Get sample data if requested
        let sampleData: any[][] = [];
        if (sampleRows > 0) {
          try {
            const sampleResult = await executeSnowflakeQuery(sessionData, snowflakeAccount, `SELECT * FROM ${schemaName}.${tableName} LIMIT ${sampleRows}`);
            sampleData = sampleResult.data || [];
          } catch (error) {
            console.warn(`Could not sample data from ${schemaName}.${tableName}:`, error);
          }
        }

        schemaStructure[schemaName].tables[tableName] = {
          columns,
          sample_data: sampleData
        };
      }
    }

    const schemaData = {
      database: fullDatabaseName,
      display_name: database,
      sample_rows: sampleRows,
      extraction_timestamp: new Date().toISOString(),
      schemas: schemaStructure
    };

    const extractionDuration = Math.round(performance.now() - startTime);
    
    // Store in Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const fileName = `${database}_schema_${sampleRows}rows.json`;
    const { error: insertError } = await supabase
      .from('schema_files')
      .insert({
        database_name: database,
        sample_rows: sampleRows,
        file_name: fileName,
        schema_data: schemaData,
        extraction_duration: extractionDuration
      });

    if (insertError) {
      console.error('Error storing schema in Supabase:', insertError);
    } else {
      console.log(`Schema stored in Supabase: ${fileName}`);
    }

    return new Response(JSON.stringify({
      ...schemaData,
      extraction_duration: extractionDuration
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in extract-schema function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      details: 'Failed to extract schema from Snowflake'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});