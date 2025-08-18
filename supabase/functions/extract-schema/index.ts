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

    // Import Snowflake SDK
    const snowflake = await import('https://cdn.skypack.dev/snowflake-sdk@2.2.0');
    
    // Create connection
    const connection = snowflake.createConnection({
      account: snowflakeAccount,
      username: snowflakeUser,
      password: snowflakePassword,
      warehouse: snowflakeWarehouse,
    });

    // Connect
    await new Promise((resolve, reject) => {
      connection.connect((err: any, conn: any) => {
        if (err) {
          console.error('Failed to connect to Snowflake:', err);
          reject(err);
        } else {
          resolve(conn);
        }
      });
    });

    const startTime = performance.now();
    
    // Use database with SPIDER2_ prefix
    const fullDatabaseName = database.startsWith('SPIDER2_') ? database : `SPIDER2_${database}`;
    
    // Extract schema structure
    const schemaData = await new Promise((resolve, reject) => {
      connection.execute({
        sqlText: `USE DATABASE ${fullDatabaseName}`,
        complete: async (err: any) => {
          if (err) {
            console.error('Error using database:', err);
            reject(err);
            return;
          }

          try {
            // Get schemas
            const schemas = await new Promise((resolve, reject) => {
              connection.execute({
                sqlText: 'SHOW SCHEMAS',
                complete: (err: any, stmt: any, rows: any) => {
                  if (err) reject(err);
                  else resolve(rows.map((row: any) => row.name));
                }
              });
            });

            const schemaStructure: any = {};

            // For each schema, get tables and columns
            for (const schemaName of schemas as string[]) {
              if (schemaName === 'INFORMATION_SCHEMA') continue; // Skip system schema
              
              console.log(`Processing schema: ${schemaName}`);
              schemaStructure[schemaName] = { tables: {} };

              // Get tables in schema
              const tables = await new Promise((resolve, reject) => {
                connection.execute({
                  sqlText: `SHOW TABLES IN SCHEMA ${schemaName}`,
                  complete: (err: any, stmt: any, rows: any) => {
                    if (err) reject(err);
                    else resolve(rows.map((row: any) => row.name));
                  }
                });
              });

              // For each table, get columns and sample data
              for (const tableName of tables as string[]) {
                console.log(`Processing table: ${schemaName}.${tableName}`);
                
                // Get column descriptions
                const columns = await new Promise((resolve, reject) => {
                  connection.execute({
                    sqlText: `DESCRIBE TABLE ${schemaName}.${tableName}`,
                    complete: (err: any, stmt: any, rows: any) => {
                      if (err) reject(err);
                      else resolve(rows.map((row: any) => ({
                        name: row.name,
                        type: row.type,
                        kind: row.kind,
                        null: row.null === 'Y',
                        default: row.default,
                        primary_key: row.primary_key === 'Y',
                        unique_key: row.unique_key === 'Y',
                        check: row.check === 'Y',
                        expression: row.expression,
                        comment: row.comment
                      })));
                    }
                  });
                });

                // Get sample data if requested
                let sampleData: any[][] = [];
                if (sampleRows > 0) {
                  try {
                    sampleData = await new Promise((resolve, reject) => {
                      connection.execute({
                        sqlText: `SELECT * FROM ${schemaName}.${tableName} LIMIT ${sampleRows}`,
                        complete: (err: any, stmt: any, rows: any) => {
                          if (err) {
                            console.warn(`Could not sample data from ${schemaName}.${tableName}:`, err.message);
                            resolve([]);
                          } else {
                            resolve(rows || []);
                          }
                        }
                      });
                    });
                  } catch (error) {
                    console.warn(`Error sampling data from ${schemaName}.${tableName}:`, error);
                  }
                }

                schemaStructure[schemaName].tables[tableName] = {
                  columns,
                  sample_data: sampleData
                };
              }
            }

            resolve({
              database: fullDatabaseName,
              display_name: database,
              sample_rows: sampleRows,
              extraction_timestamp: new Date().toISOString(),
              schemas: schemaStructure
            });

          } catch (error) {
            reject(error);
          }
        }
      });
    });

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

    // Close connection
    connection.destroy();

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