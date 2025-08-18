import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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
    console.log('Starting database listing from Snowflake Spider2');
    
    // Create Snowflake client using the proven npm package approach
    const client = createSnowflakeClient();
    
    // List all Spider2 databases using proven approach
    const databases = await client.listDatabases();
    
    // Clean up connection
    await client.destroy();
    
    // Format for frontend consumption
    const formattedDatabases = databases.map(db => ({
      name: db.name,
      display_name: db.display_name,
      created_on: new Date().toISOString(),
      database_id: db.name.toLowerCase(),
      owner: 'SPIDER2',
      comment: `Spider2 database: ${db.display_name}`
    }));

    console.log(`Found ${formattedDatabases.length} Spider2 databases`);

    return new Response(JSON.stringify({
      success: true,
      databases: formattedDatabases,
      count: formattedDatabases.length,
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