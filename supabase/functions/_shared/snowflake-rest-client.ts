interface SnowflakeConfig {
  account: string;
  user: string;
  password: string;
  warehouse?: string;
}

interface SnowflakeAuthResponse {
  success: boolean;
  data: {
    token: string;
    masterToken: string;
    validityInSecondsST: number;
    validityInSecondsMT: number;
  };
}

interface SnowflakeQueryResponse {
  success: boolean;
  data: {
    rowset: any[][];
    rowtype: Array<{
      name: string;
      type: string;
      length?: number;
      precision?: number;
      scale?: number;
      nullable: boolean;
    }>;
    total: number;
    returned: number;
  };
}

export class SnowflakeRestClient {
  private config: SnowflakeConfig;
  private sessionToken: string | null = null;
  private baseUrl: string;

  constructor(config: SnowflakeConfig) {
    this.config = config;
    this.baseUrl = `https://${config.account}.snowflakecomputing.com`;
  }

  async authenticate(): Promise<boolean> {
    try {
      console.log(`Authenticating with Snowflake account: ${this.config.account}`);
      
      const response = await fetch(`${this.baseUrl}/session/v1/login-request`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          data: {
            ACCOUNT_NAME: this.config.account,
            LOGIN_NAME: this.config.user,
            PASSWORD: this.config.password,
            CLIENT_APP_ID: "JavaScript",
            CLIENT_APP_VERSION: "1.6.0",
            CLIENT_ENVIRONMENT: {
              APPLICATION: "Deno",
              OS: "Linux",
              OS_VERSION: "Unknown"
            }
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Snowflake auth failed: ${response.status} - ${errorText}`);
        return false;
      }

      const authResponse: SnowflakeAuthResponse = await response.json();
      
      if (!authResponse.success) {
        console.error('Snowflake authentication failed:', authResponse);
        return false;
      }

      this.sessionToken = authResponse.data.token;
      console.log('Snowflake authentication successful');
      return true;
    } catch (error) {
      console.error('Snowflake authentication error:', error);
      return false;
    }
  }

  async executeQuery(sql: string, warehouse?: string): Promise<any[][]> {
    if (!this.sessionToken) {
      const authenticated = await this.authenticate();
      if (!authenticated) {
        throw new Error('Failed to authenticate with Snowflake');
      }
    }

    try {
      console.log(`Executing Snowflake query: ${sql.substring(0, 100)}...`);
      
      const requestBody: any = {
        sqlText: sql,
        asyncExec: false,
        sequenceId: 1,
        querySubmissionTime: Date.now()
      };

      if (warehouse || this.config.warehouse) {
        requestBody.warehouse = warehouse || this.config.warehouse;
      }

      const response = await fetch(`${this.baseUrl}/queries/v1/query-request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Snowflake Token="${this.sessionToken}"`,
          'X-Snowflake-Authorization-Token-Type': 'KEYPAIR_JWT'
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Snowflake query failed: ${response.status} - ${errorText}`);
        
        // Try re-authentication if unauthorized
        if (response.status === 401 || response.status === 403) {
          this.sessionToken = null;
          const authenticated = await this.authenticate();
          if (authenticated) {
            return this.executeQuery(sql, warehouse);
          }
        }
        
        throw new Error(`Snowflake query failed: ${response.status} - ${errorText}`);
      }

      const result: SnowflakeQueryResponse = await response.json();
      
      if (!result.success) {
        console.error('Snowflake query execution failed:', result);
        throw new Error('Query execution failed');
      }

      console.log(`Query executed successfully, returned ${result.data.returned} rows`);
      return result.data.rowset || [];
    } catch (error) {
      console.error('Snowflake query execution error:', error);
      throw error;
    }
  }

  async listDatabases(): Promise<Array<{ name: string; display_name: string }>> {
    const rows = await this.executeQuery('SHOW DATABASES IN ACCOUNT');
    
    return rows
      .filter(row => row && row[1] && row[1].toString().includes('SPIDER2_'))
      .map(row => ({
        name: row[1].toString(),
        display_name: row[1].toString().replace('SPIDER2_', '')
      }));
  }

  async getSchemas(database: string): Promise<string[]> {
    const rows = await this.executeQuery(`USE DATABASE ${database}; SHOW SCHEMAS;`);
    return rows.map(row => row[1].toString());
  }

  async getTables(database: string, schema: string): Promise<string[]> {
    const rows = await this.executeQuery(`USE DATABASE ${database}; SHOW TABLES IN SCHEMA ${schema};`);
    return rows.map(row => row[1].toString());
  }

  async getTableColumns(database: string, schema: string, table: string): Promise<Array<{
    name: string;
    type: string;
    nullable: boolean;
    default?: string;
  }>> {
    const rows = await this.executeQuery(`USE DATABASE ${database}; DESCRIBE TABLE ${schema}.${table};`);
    
    return rows.map(row => ({
      name: row[0].toString(),
      type: row[1].toString(),
      nullable: row[2] === 'Y',
      default: row[3] ? row[3].toString() : undefined
    }));
  }

  async getSampleData(database: string, schema: string, table: string, limit: number = 3): Promise<any[][]> {
    if (limit === 0) return [];
    
    const rows = await this.executeQuery(
      `USE DATABASE ${database}; SELECT * FROM ${schema}.${table} LIMIT ${limit};`
    );
    return rows;
  }
}

export function createSnowflakeClient(): SnowflakeRestClient {
  const account = Deno.env.get('SNOWFLAKE_ACCOUNT');
  const user = Deno.env.get('SNOWFLAKE_USER');
  const password = Deno.env.get('SNOWFLAKE_PASSWORD');
  const warehouse = Deno.env.get('SNOWFLAKE_WAREHOUSE');

  if (!account || !user || !password) {
    throw new Error('Missing required Snowflake environment variables');
  }

  return new SnowflakeRestClient({
    account,
    user,
    password,
    warehouse: warehouse || 'COMPUTE_WH_PARTICIPANT',
  });
}