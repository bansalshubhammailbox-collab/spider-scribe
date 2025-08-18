import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createSnowflakeClient } from "../_shared/snowflake-rest-client.ts";

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
    
    // Create Snowflake client using the proven npm package approach
    const client = createSnowflakeClient();
    
    const startTime = performance.now();
    const extractedSchema: any = {
      database: `SPIDER2_${database}`,
      display_name: database,
      sample_rows: sampleRows,
      extracted_at: new Date().toISOString(),
      schemas: {}
    };

    // Get all schemas in the database
    const dbName = `SPIDER2_${database}`;
    console.log(`Getting schemas for database: ${dbName}`);
    
    const schemas = await client.getSchemas(dbName);
    console.log(`Found ${schemas.length} schemas:`, schemas);

    // Extract each schema
    for (const schemaName of schemas) {
      if (schemaName === 'INFORMATION_SCHEMA') continue; // Skip system schema
      
      console.log(`Processing schema: ${schemaName}`);
      extractedSchema.schemas[schemaName] = { tables: {} };

      try {
        // Get tables in schema
        const tables = await client.getTables(dbName, schemaName);
        console.log(`Found ${tables.length} tables in schema ${schemaName}`);

        // Extract each table
        for (const tableName of tables) {
          console.log(`Processing table: ${schemaName}.${tableName}`);
          
          try {
            // Get table columns
            const columns = await client.getTableColumns(dbName, schemaName, tableName);

            // Get sample data if requested
            let sampleData: any[][] = [];
            if (sampleRows > 0) {
              try {
                sampleData = await client.getSampleData(dbName, schemaName, tableName, sampleRows);
              } catch (sampleError) {
                console.warn(`Could not get sample data for ${schemaName}.${tableName}:`, sampleError);
              }
            }

            extractedSchema.schemas[schemaName].tables[tableName] = {
              columns: columns,
              sample_data: sampleData
            };

          } catch (tableError) {
            console.error(`Error processing table ${schemaName}.${tableName}:`, tableError);
            // Continue with other tables
          }
        }
      } catch (schemaError) {
        console.error(`Error processing schema ${schemaName}:`, schemaError);
        // Continue with other schemas
      }
    }

    const extractionDuration = Math.round(performance.now() - startTime);
    
    // Clean up connection
    await client.destroy();
    
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
        schema_data: extractedSchema,
        extraction_duration: extractionDuration
      });

    if (insertError) {
      console.error('Error storing schema in Supabase:', insertError);
    } else {
      console.log(`Schema stored in Supabase: ${fileName}`);
    }

    return new Response(JSON.stringify({
      ...extractedSchema,
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