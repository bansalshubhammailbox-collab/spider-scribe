interface SnowflakeConfig {
  account: string;
  user: string;
  password: string;
  warehouse?: string;
}

export class SnowflakeRestClient {
  private config: SnowflakeConfig;
  private sessionToken: string | null = null;
  private masterToken: string | null = null;
  private baseUrl: string;

  constructor(config: SnowflakeConfig) {
    this.config = config;
    this.baseUrl = `https://${config.account}.snowflakecomputing.com`;
  }

  async authenticate(): Promise<boolean> {
    try {
      console.log(`🔐 Authenticating with Snowflake account: ${this.config.account}`);
      
      const response = await fetch(`${this.baseUrl}/session/v1/login-request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          data: {
            ACCOUNT_NAME: this.config.account,
            LOGIN_NAME: this.config.user,
            PASSWORD: this.config.password,
            CLIENT_APP_ID: "JavaScript",
            CLIENT_APP_VERSION: "1.6.0",
          }
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Auth failed:', response.status, errorText);
        return false;
      }

      const result = await response.json();

      if (result.success && result.data) {
        this.sessionToken = result.data.token;
        this.masterToken = result.data.masterToken;
        console.log('✅ Snowflake authentication successful');
        return true;
      }

      console.error('❌ Auth failed:', result.message);
      return false;
    } catch (error) {
      console.error('❌ Auth error:', error);
      return false;
    }
  }

  async executeQuery(sql: string): Promise<any[][]> {
    if (!this.sessionToken && !(await this.authenticate())) {
      throw new Error('Authentication failed');
    }

    try {
      console.log(`🔍 Executing query: ${sql.substring(0, 50)}...`);
      
      const response = await fetch(`${this.baseUrl}/queries/v1/query-request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Snowflake Token="${this.sessionToken}"`,
        },
        body: JSON.stringify({
          sqlText: sql,
          asyncExec: false,
          sequenceId: Math.floor(Math.random() * 1000000),
          querySubmissionTime: Date.now()
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Query failed:', response.status, errorText);

        // Try to re-authenticate on 401/403
        if (response.status === 401 || response.status === 403) {
          console.log('🔄 Re-authenticating...');
          this.sessionToken = null;
          if (await this.authenticate()) {
            return this.executeQuery(sql); // Retry once
          }
        }

        throw new Error(`Query failed: ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        console.error('❌ Query error:', result.message);
        throw new Error(`Query error: ${result.message}`);
      }

      const rowCount = result.data?.rowset?.length || 0;
      console.log(`✅ Query successful, returned ${rowCount} rows`);
      return result.data?.rowset || [];
    } catch (error) {
      console.error('❌ Execute query error:', error);
      throw error;
    }
  }

  async listDatabases(): Promise<Array<{ name: string; display_name: string }>> {
    try {
      console.log('🔍 Listing databases...');
      const rows = await this.executeQuery('SHOW DATABASES');

      const databases = rows
        .filter(row => row && row[1] && row[1].toString().includes('SPIDER2_'))
        .map(row => ({
          name: row[1].toString(),
          display_name: row[1].toString().replace('SPIDER2_', '')
        }));

      console.log(`✅ Found ${databases.length} Spider2 databases`);
      return databases;
    } catch (error) {
      console.error('❌ List databases failed:', error);
      throw error;
    }
  }

  async getSchemas(database: string): Promise<string[]> {
    // First set the database context
    await this.executeQuery(`USE DATABASE ${database}`);
    const rows = await this.executeQuery('SHOW SCHEMAS');
    return rows
      .map(row => row[1]?.toString())
      .filter(name => name && name !== 'INFORMATION_SCHEMA');
  }

  async getTables(database: string, schema: string): Promise<string[]> {
    await this.executeQuery(`USE DATABASE ${database}`);
    const rows = await this.executeQuery(`SHOW TABLES IN SCHEMA ${schema}`);
    return rows.map(row => row[1]?.toString()).filter(Boolean);
  }

  async getTableColumns(database: string, schema: string, table: string): Promise<Array<{
    name: string;
    type: string;
    nullable: boolean;
    default?: string;
  }>> {
    await this.executeQuery(`USE DATABASE ${database}`);
    const rows = await this.executeQuery(`DESCRIBE TABLE ${schema}.${table}`);
    
    return rows.map(row => ({
      name: row[0]?.toString() || '',
      type: row[1]?.toString() || '',
      nullable: row[2] === 'Y',
      default: row[3] ? row[3].toString() : undefined
    }));
  }

  async getSampleData(database: string, schema: string, table: string, limit: number = 3): Promise<any[][]> {
    if (limit === 0) return [];
    
    await this.executeQuery(`USE DATABASE ${database}`);
    const rows = await this.executeQuery(`SELECT * FROM ${schema}.${table} LIMIT ${limit}`);
    return rows;
  }
}

export function createSnowflakeClient(): SnowflakeRestClient {
  const config = {
    account: Deno.env.get('SNOWFLAKE_ACCOUNT')!,
    user: Deno.env.get('SNOWFLAKE_USER')!,
    password: Deno.env.get('SNOWFLAKE_PASSWORD')!,
    warehouse: Deno.env.get('SNOWFLAKE_WAREHOUSE'),
  };

  if (!config.account || !config.user || !config.password) {
    throw new Error('Missing Snowflake credentials: SNOWFLAKE_ACCOUNT, SNOWFLAKE_USER, SNOWFLAKE_PASSWORD');
  }

  console.log(`🚀 Creating Snowflake client for account: ${config.account}, user: ${config.user}`);
  return new SnowflakeRestClient(config);
}