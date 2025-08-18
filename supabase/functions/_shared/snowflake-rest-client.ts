import { Connection, createConnection } from "npm:snowflake-sdk@1.9.0";

interface SnowflakeConfig {
  account: string;
  user: string;
  password: string;
  warehouse?: string;
  role?: string;
}

export class SnowflakeRestClient {
  private config: SnowflakeConfig;
  private connection: Connection | null = null;

  constructor(config: SnowflakeConfig) {
    this.config = config;
  }

  private async getConnection(): Promise<Connection> {
    if (this.connection) {
      return this.connection;
    }

    console.log(`Connecting to Snowflake account: ${this.config.account}, user: ${this.config.user}`);
    
    return new Promise((resolve, reject) => {
      this.connection = createConnection({
        account: this.config.account,
        username: this.config.user,
        password: this.config.password,
        warehouse: this.config.warehouse || 'COMPUTE_WH_PARTICIPANT',
        role: this.config.role || 'PARTICIPANT'
      });

      this.connection.connect((err, conn) => {
        if (err) {
          console.error('Snowflake connection failed:', err);
          reject(new Error(`Failed to connect to Snowflake: ${err.message}`));
        } else {
          console.log('Snowflake connection successful');
          resolve(conn);
        }
      });
    });
  }

  async executeQuery(sql: string): Promise<any[][]> {
    const conn = await this.getConnection();
    
    console.log(`Executing Snowflake query: ${sql}`);
    
    return new Promise((resolve, reject) => {
      conn.execute({
        sqlText: sql,
        complete: (err, stmt, rows) => {
          if (err) {
            console.error('Snowflake query failed:', err);
            reject(new Error(`Query failed: ${err.message}`));
          } else {
            console.log(`Query executed successfully, returned ${rows?.length || 0} rows`);
            resolve(rows || []);
          }
        }
      });
    });
  }

  async listDatabases(): Promise<Array<{ name: string; display_name: string }>> {
    const rows = await this.executeQuery('SHOW DATABASES');
    
    return rows
      .filter(row => row && row[1] && row[1].toString().includes('SPIDER2_'))
      .map(row => ({
        name: row[1].toString(),
        display_name: row[1].toString().replace('SPIDER2_', '')
      }));
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

  async destroy(): Promise<void> {
    if (this.connection) {
      return new Promise((resolve) => {
        this.connection!.destroy((err) => {
          if (err) {
            console.warn('Error destroying Snowflake connection:', err);
          } else {
            console.log('Snowflake connection destroyed');
          }
          this.connection = null;
          resolve();
        });
      });
    }
  }
}

export function createSnowflakeClient(): SnowflakeRestClient {
  const account = Deno.env.get('SNOWFLAKE_ACCOUNT');
  const user = Deno.env.get('SNOWFLAKE_USER');
  const password = Deno.env.get('SNOWFLAKE_PASSWORD');
  const warehouse = Deno.env.get('SNOWFLAKE_WAREHOUSE');

  if (!account || !user || !password) {
    throw new Error('Missing required Snowflake environment variables: SNOWFLAKE_ACCOUNT, SNOWFLAKE_USER, SNOWFLAKE_PASSWORD');
  }

  console.log(`Creating Snowflake client for account: ${account}, user: ${user}, warehouse: ${warehouse || 'COMPUTE_WH_PARTICIPANT'}`);

  return new SnowflakeRestClient({
    account,
    user,
    password,
    warehouse: warehouse || 'COMPUTE_WH_PARTICIPANT',
    role: 'PARTICIPANT'
  });
}