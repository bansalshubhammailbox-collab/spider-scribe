import snowflake from 'snowflake-sdk';

// CRITICAL: This must run server-side only (in Supabase Edge Functions)
// Browser environment cannot make direct Snowflake connections

export interface SnowflakeConfig {
  account: string;    // Format: "RSRSBDK-YDB67606" 
  username: string;   // "BANSALSHUBHAM"
  password: string;
  warehouse: string;  // "COMPUTE_WH_PARTICIPANT"
}

export const createSnowflakeConnection = (config: SnowflakeConfig) => {
  return snowflake.createConnection({
    account: config.account,
    username: config.username,
    password: config.password,
    warehouse: config.warehouse,
  });
};

export const listDatabases = async (connection: any): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    connection.execute({
      sqlText: 'SHOW DATABASES IN ACCOUNT',
      complete: (err: any, stmt: any, rows: any[]) => {
        if (err) {
          console.error('Snowflake error:', err);
          reject(err);
        } else {
          // Filter for Spider2 databases only
          const spider2Databases = rows?.filter(row => 
            row[1] && row[1].toString().startsWith('SPIDER2_')
          ) || [];
          resolve(spider2Databases.map(row => ({
            name: row[1],
            display_name: row[1].replace('SPIDER2_', ''),
            created_on: row[2],
            database_id: row[0],
            owner: row[3],
            comment: row[4] || ''
          })));
        }
      }
    });
  });
};

export const extractSchema = async (
  connection: any, 
  database: string, 
  sampleRows: number = 3
): Promise<any> => {
  return new Promise((resolve, reject) => {
    const databaseName = database.startsWith('SPIDER2_') ? database : `SPIDER2_${database}`;
    
    // First, use the database
    connection.execute({
      sqlText: `USE DATABASE ${databaseName}`,
      complete: (err: any) => {
        if (err) {
          reject(err);
          return;
        }
        
        // Then show schemas
        connection.execute({
          sqlText: 'SHOW SCHEMAS',
          complete: (err: any, stmt: any, schemas: any[]) => {
            if (err) {
              reject(err);
              return;
            }
            
            const schemaData: any = { database: databaseName, schemas: {} };
            
            // Process each schema
            const processSchema = async (schemaRow: any) => {
              const schemaName = schemaRow[1];
              if (schemaName === 'INFORMATION_SCHEMA') return;
              
              schemaData.schemas[schemaName] = { tables: {} };
              
              // Get tables in schema
              connection.execute({
                sqlText: `SHOW TABLES IN SCHEMA ${schemaName}`,
                complete: async (err: any, stmt: any, tables: any[]) => {
                  if (err) return;
                  
                  for (const tableRow of tables || []) {
                    const tableName = tableRow[1];
                    
                    // Get table structure
                    connection.execute({
                      sqlText: `DESCRIBE TABLE ${schemaName}.${tableName}`,
                      complete: (err: any, stmt: any, columns: any[]) => {
                        if (err) return;
                        
                        const tableData = {
                          columns: columns?.map(col => ({
                            name: col[0],
                            type: col[1],
                            nullable: col[2] === 'Y',
                            default: col[3],
                            primary_key: col[4] === 'Y'
                          })) || [],
                          sample_data: []
                        };
                        
                        // Get sample data if requested
                        if (sampleRows > 0) {
                          connection.execute({
                            sqlText: `SELECT * FROM ${schemaName}.${tableName} LIMIT ${sampleRows}`,
                            complete: (err: any, stmt: any, sampleData: any[]) => {
                              if (!err && sampleData) {
                                tableData.sample_data = sampleData;
                              }
                              schemaData.schemas[schemaName].tables[tableName] = tableData;
                            }
                          });
                        } else {
                          schemaData.schemas[schemaName].tables[tableName] = tableData;
                        }
                      }
                    });
                  }
                }
              });
            };
            
            // Process all schemas
            Promise.all(schemas?.map(processSchema) || [])
              .then(() => resolve(schemaData))
              .catch(reject);
          }
        });
      }
    });
  });
};

export default snowflake;