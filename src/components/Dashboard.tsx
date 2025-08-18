import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Database, Play, History, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Database {
  name: string;
  display_name: string;
  created_on: string;
  database_id: string;
  owner: string;
  comment: string;
}

interface TestSession {
  id: string;
  session_name: string;
  database: string;
  created_at: string;
  total_questions: number;
  success_rates: {
    baseline: number;
    schema_only: number;
    full_context: number;
  };
}

interface DashboardProps {
  onSelectDatabase: (database: Database) => void;
  onViewSession: (session: TestSession) => void;
}

export const Dashboard = ({ onSelectDatabase, onViewSession }: DashboardProps) => {
  const [databases, setDatabases] = useState<Database[]>([]);
  const [sessions, setSessions] = useState<TestSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load databases from Snowflake
      const { data: dbResponse, error: dbError } = await supabase.functions.invoke('list-databases');
      
      if (dbError) throw dbError;
      
      if (dbResponse?.databases) {
        setDatabases(dbResponse.databases);
      }

      // Load recent test sessions
      const { data: sessionData, error: sessionError } = await supabase
        .from('test_sessions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (sessionError) throw sessionError;
      
      if (sessionData) {
        const typedSessions = sessionData.map(session => ({
          ...session,
          success_rates: session.success_rates as { baseline: number; schema_only: number; full_context: number; }
        }));
        setSessions(typedSessions);
      }

    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast({
        title: 'Error Loading Data',
        description: 'Failed to load databases and sessions. Please check your connection.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredDatabases = databases.filter(db =>
    db.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    db.comment?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const calculateAverageImprovement = (session: TestSession) => {
    const rates = session.success_rates;
    const schemaImprovement = rates.schema_only - rates.baseline;
    const fullImprovement = rates.full_context - rates.baseline;
    return Math.round(((schemaImprovement + fullImprovement) / 2) * 100);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto p-6">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-lg text-muted-foreground">Loading Spider2 databases...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-foreground">Spider Test Annotation Platform</h1>
          <p className="text-xl text-muted-foreground">
            Evaluate how custom database annotations improve AI-generated SQL quality
          </p>
          <div className="flex justify-center space-x-4">
            <Badge variant="secondary" className="text-sm">
              <Database className="w-4 h-4 mr-1" />
              {databases.length} Spider2 Databases
            </Badge>
            <Badge variant="secondary" className="text-sm">
              <History className="w-4 h-4 mr-1" />
              {sessions.length} Test Sessions
            </Badge>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Databases</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{databases.length}</div>
              <p className="text-xs text-muted-foreground">
                Spider2 production databases
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
              <Play className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{sessions.length}</div>
              <p className="text-xs text-muted-foreground">
                Test experiments completed
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Improvement</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {sessions.length > 0 
                  ? Math.round(sessions.reduce((acc, s) => acc + calculateAverageImprovement(s), 0) / sessions.length)
                  : 0}%
              </div>
              <p className="text-xs text-muted-foreground">
                With custom annotations
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Database Browser */}
        <Card>
          <CardHeader>
            <CardTitle>Database Browser</CardTitle>
            <CardDescription>
              Select a Spider2 database to start schema extraction and annotation generation
            </CardDescription>
            <div className="flex items-center space-x-2">
              <Search className="w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search databases..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredDatabases.map((database) => (
                <Card 
                  key={database.name} 
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => onSelectDatabase(database)}
                >
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">{database.display_name}</CardTitle>
                    <CardDescription className="text-sm">
                      Owner: {database.owner}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {database.comment && (
                      <p className="text-sm text-muted-foreground mb-3">
                        {database.comment}
                      </p>
                    )}
                    <div className="flex justify-between items-center">
                      <Badge variant="outline" className="text-xs">
                        {database.database_id}
                      </Badge>
                      <Button size="sm" variant="ghost">
                        Select
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            {filteredDatabases.length === 0 && (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No databases found matching "{searchTerm}"</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Sessions */}
        {sessions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Recent Test Sessions</CardTitle>
              <CardDescription>
                View and analyze your latest annotation effectiveness experiments
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {sessions.map((session) => (
                  <div 
                    key={session.id}
                    className="flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:bg-muted/50"
                    onClick={() => onViewSession(session)}
                  >
                    <div className="space-y-1">
                      <h4 className="font-medium">{session.session_name}</h4>
                      <p className="text-sm text-muted-foreground">
                        Database: {session.database} | {session.total_questions} questions
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(session.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <Badge variant="outline">
                        Baseline: {Math.round(session.success_rates.baseline * 100)}%
                      </Badge>
                      <Badge variant="outline">
                        Schema: {Math.round(session.success_rates.schema_only * 100)}%
                      </Badge>
                      <Badge variant="default">
                        Full: {Math.round(session.success_rates.full_context * 100)}%
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};