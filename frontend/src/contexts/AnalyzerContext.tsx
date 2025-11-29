import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { usePolling } from '../hooks/usePolling';
import apiService from '../services/api';

export interface AnalyzerState {
  localState: any;
  statistics: any;
  history: any;
  isLoading: boolean;
  lastUpdated: string;
}

interface AnalyzerContextType {
  state: AnalyzerState;
  refreshData: () => void;
  // Methods to update state (for direct updates if needed)
  updateLocalState: (state: any) => void;
  updateStatistics: (stats: any) => void;
  updateHistory: (history: any) => void;
}

const AnalyzerContext = createContext<AnalyzerContextType | undefined>(undefined);

interface AnalyzerProviderProps {
  children: ReactNode;
}

export function AnalyzerProvider({ children }: AnalyzerProviderProps) {
  const [state, setState] = useState<AnalyzerState>({
    localState: null,
    statistics: null,
    history: null,
    isLoading: true,
    lastUpdated: ''
  });

  // Poll for local analyzer state (always active)
  const { data: analyzerStateData } = usePolling(
    () => apiService.getAnalyzerGlobalState(),
    3000, // Poll every 3 seconds
    true // Always poll for local analyzer state
  );

  // Poll for analyzer history (always active)
  const { data: historyData } = usePolling(
    () => apiService.getAnalyzerHistory(),
    10000, // Poll every 10 seconds
    true // Always poll for history
  );

  // Update state when data changes
  useEffect(() => {
    if (analyzerStateData) {
      setState(prev => ({
        ...prev,
        localState: analyzerStateData.currentStatus,
        statistics: analyzerStateData.statistics,
        isLoading: false,
        lastUpdated: analyzerStateData.timestamp
      }));
    }
  }, [analyzerStateData]);

  useEffect(() => {
    if (historyData) {
      setState(prev => ({
        ...prev,
        history: historyData,
        lastUpdated: new Date().toISOString()
      }));
    }
  }, [historyData]);

  // Direct update methods
  const updateLocalState = (newState: any) => {
    setState(prev => ({
      ...prev,
      localState: newState,
      lastUpdated: new Date().toISOString()
    }));
  };

  const updateStatistics = (stats: any) => {
    setState(prev => ({
      ...prev,
      statistics: stats,
      lastUpdated: new Date().toISOString()
    }));
  };

  const updateHistory = (history: any) => {
    setState(prev => ({
      ...prev,
      history,
      lastUpdated: new Date().toISOString()
    }));
  };

  const refreshData = () => {
    setState(prev => ({ ...prev, isLoading: true }));
  };

  const contextValue: AnalyzerContextType = {
    state,
    refreshData,
    updateLocalState,
    updateStatistics,
    updateHistory
  };

  return (
    <AnalyzerContext.Provider value={contextValue}>
      {children}
    </AnalyzerContext.Provider>
  );
}

export function useAnalyzer(): AnalyzerContextType {
  const context = useContext(AnalyzerContext);
  if (context === undefined) {
    throw new Error('useAnalyzer must be used within an AnalyzerProvider');
  }
  return context;
}

// Export types for use in other components
export type { AnalyzerState, AnalyzerContextType };