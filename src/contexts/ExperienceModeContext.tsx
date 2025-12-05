import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

export type ExperienceMode = 'beginner' | 'expert';

interface ExperienceModeContextType {
  mode: ExperienceMode;
  setMode: (mode: ExperienceMode) => void;
  isBeginner: boolean;
  isExpert: boolean;
}

const ExperienceModeContext = createContext<ExperienceModeContextType | undefined>(undefined);

export const ExperienceModeProvider = ({ children }: { children: ReactNode }) => {
  const { user, profile } = useAuth();
  const [mode, setModeState] = useState<ExperienceMode>('beginner');

  useEffect(() => {
    // Load mode from profile or localStorage
    const profileMode = (profile as any)?.experience_mode;
    if (profileMode) {
      setModeState(profileMode as ExperienceMode);
    } else {
      const savedMode = localStorage.getItem('shelvey-experience-mode') as ExperienceMode;
      if (savedMode) {
        setModeState(savedMode);
      }
    }
  }, [profile]);

  const setMode = async (newMode: ExperienceMode) => {
    setModeState(newMode);
    localStorage.setItem('shelvey-experience-mode', newMode);
    
    // Persist to database if logged in
    if (user) {
      await supabase
        .from('profiles')
        .update({ experience_mode: newMode })
        .eq('id', user.id);
    }
  };

  return (
    <ExperienceModeContext.Provider value={{
      mode,
      setMode,
      isBeginner: mode === 'beginner',
      isExpert: mode === 'expert',
    }}>
      {children}
    </ExperienceModeContext.Provider>
  );
};

export const useExperienceMode = () => {
  const context = useContext(ExperienceModeContext);
  if (!context) {
    throw new Error('useExperienceMode must be used within ExperienceModeProvider');
  }
  return context;
};
