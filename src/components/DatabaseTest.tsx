import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const DatabaseTest = () => {
  const [testResults, setTestResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const runDatabaseTest = async () => {
    setLoading(true);
    try {
      // Test 1: Call the test function
      const { data: functionResult, error: functionError } = await supabase.functions.invoke('test-database-access');
      
      if (functionError) {
        throw new Error(`Function error: ${functionError.message}`);
      }

      // Test 2: Direct table access
      const directTests: Record<string, any> = {};
      
      const tables: Array<'test_sessions' | 'test_results' | 'annotation_files' | 'schema_files'> = [
        'test_sessions', 'test_results', 'annotation_files', 'schema_files'
      ];

      for (const table of tables) {
        try {
          const { data, error, count } = await supabase
            .from(table)
            .select('*', { count: 'exact', head: true });
            
          directTests[table] = {
            success: !error,
            error: error?.message,
            count: count
          };
        } catch (err: any) {
          directTests[table] = {
            success: false,
            error: err.message,
            count: 0
          };
        }
      }

      setTestResults({
        functionTest: functionResult,
        directTests: directTests,
        timestamp: new Date().toISOString()
      });

      toast({
        title: 'Database Test Complete',
        description: 'Check results below',
      });

    } catch (error) {
      console.error('Database test error:', error);
      toast({
        title: 'Test Failed',
        description: error.message,
        variant: 'destructive',
      });
      
      setTestResults({
        error: error.message,
        timestamp: new Date().toISOString()
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Database Connectivity Test</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={runDatabaseTest} 
          disabled={loading}
          className="w-full"
        >
          {loading ? 'Testing...' : 'Run Database Test'}
        </Button>

        {testResults && (
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Test completed at: {new Date(testResults.timestamp).toLocaleString()}
            </div>

            {testResults.error && (
              <Card className="border-destructive">
                <CardHeader>
                  <CardTitle className="text-destructive">Error</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{testResults.error}</p>
                </CardContent>
              </Card>
            )}

            {testResults.functionTest && (
              <Card>
                <CardHeader>
                  <CardTitle>Edge Function Test</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant={testResults.functionTest.success ? 'default' : 'destructive'}>
                      {testResults.functionTest.success ? 'PASS' : 'FAIL'}
                    </Badge>
                    <span>Connection Status: {testResults.functionTest.connection_status}</span>
                  </div>
                  
                  <div className="space-y-1">
                    <h4 className="font-medium">Table Access:</h4>
                    {Object.entries(testResults.functionTest.tables_status || {}).map(([table, accessible]) => (
                      <div key={table} className="flex items-center gap-2">
                        <Badge variant={accessible ? 'default' : 'destructive'} className="text-xs">
                          {accessible ? 'OK' : 'FAIL'}
                        </Badge>
                        <span className="text-sm">{table}</span>
                      </div>
                    ))}
                  </div>
                  
                  {testResults.functionTest.errors?.length > 0 && (
                    <div className="space-y-1">
                      <h4 className="font-medium text-destructive">Errors:</h4>
                      {testResults.functionTest.errors.map((error, i) => (
                        <p key={i} className="text-xs text-destructive">{error}</p>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {testResults.directTests && (
              <Card>
                <CardHeader>
                  <CardTitle>Direct Client Access Test</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {Object.entries(testResults.directTests).map(([table, result]: [string, any]) => (
                    <div key={table} className="flex items-center justify-between">
                      <span className="text-sm">{table}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant={result.success ? 'default' : 'destructive'} className="text-xs">
                          {result.success ? 'OK' : 'FAIL'}
                        </Badge>
                        {result.success && <span className="text-xs">Count: {result.count}</span>}
                        {result.error && <span className="text-xs text-destructive">{result.error}</span>}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};