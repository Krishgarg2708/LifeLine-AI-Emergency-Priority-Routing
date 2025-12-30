
import React, { useState } from 'react';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import { UserProfile, Language } from './types';

const App: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [language, setLanguage] = useState<Language>('en'); // Default set to English as requested

  const handleAuthComplete = (profile: UserProfile) => {
    setUser(profile);
  };

  return (
    <div className="h-screen w-full overflow-hidden bg-slate-950">
      {!user ? (
        <Auth 
          onAuthComplete={handleAuthComplete} 
          language={language} 
          setLanguage={setLanguage} 
        />
      ) : (
        <Dashboard user={{...user, language}} />
      )}
    </div>
  );
};

export default App;
