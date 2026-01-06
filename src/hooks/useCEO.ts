import { useContext } from 'react';
import { CEOContext, CEOContextType } from '@/contexts/CEOContext';

export const useCEO = (): CEOContextType => {
  const context = useContext(CEOContext);
  if (context === undefined) {
    throw new Error('useCEO must be used within a CEOProvider');
  }
  return context;
};
