import { useState } from 'react';
import { Dashboard } from '@/components/Dashboard';

const Index = () => {
  const [selectedDatabase, setSelectedDatabase] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);

  return (
    <Dashboard 
      onSelectDatabase={(db) => setSelectedDatabase(db)}
      onViewSession={(session) => setSelectedSession(session)}
    />
  );
};

export default Index;
