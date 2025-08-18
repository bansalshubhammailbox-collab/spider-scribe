import { useState } from 'react';
import { Dashboard } from '@/components/Dashboard';
import { DatabaseTest } from '@/components/DatabaseTest';

const Index = () => {
  const [selectedDatabase, setSelectedDatabase] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);
  const [showTest, setShowTest] = useState(false);

  if (showTest) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto space-y-4">
          <button 
            onClick={() => setShowTest(false)}
            className="mb-4 px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
          >
            ← Back to Dashboard
          </button>
          <DatabaseTest />
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <Dashboard 
        onSelectDatabase={(db) => setSelectedDatabase(db)}
        onViewSession={(session) => setSelectedSession(session)}
      />
      <button 
        onClick={() => setShowTest(true)}
        className="fixed bottom-4 right-4 px-4 py-2 bg-destructive text-destructive-foreground rounded hover:bg-destructive/90 shadow-lg"
      >
        Database Test
      </button>
    </div>
  );
};

export default Index;
