import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Function to make authenticated Snowflake REST API calls  
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

    console.log('Creating Snowflake session...');
    const sessionData = await createSnowflakeSession(snowflakeAccount, snowflakeUser, snowflakePassword, snowflakeWarehouse);
    
    // Execute query to list databases using REST API
    const result = await executeSnowflakeQuery(sessionData, snowflakeAccount, 'SHOW DATABASES IN ACCOUNT', snowflakeWarehouse);

    console.log('Snowflake query result:', result);
    
    // Extract database information from the result
    const rows = result.data || [];
    console.log(`Found ${rows.length} databases`);
    
    // Filter for Spider2 databases only - matching integration pattern
    const spider2Databases = rows
      ?.filter((row: any) => row[1] && row[1].toString().startsWith('SPIDER2_')) // row[1] is typically the database name
      .map((row: any) => ({
        name: row[1],
        display_name: row[1].replace('SPIDER2_', ''),
        created_on: row[2],
        database_id: row[0] || row[1],
        owner: row[3],
        comment: row[4] || ''
      }))
      .sort((a: any, b: any) => a.display_name.localeCompare(b.display_name)) || [];
    
    console.log(`Filtered to ${spider2Databases.length} Spider2 databases`);

    return new Response(JSON.stringify({ 
      databases: spider2Databases,
      total_count: spider2Databases.length,
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