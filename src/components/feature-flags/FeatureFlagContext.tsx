'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from 'react';

interface FeatureFlagContextType {
  flags: Record<string, boolean>;
  isEnabled: (key: string) => boolean;
  refreshFlags: () => Promise<void>;
}

const FeatureFlagContext = createContext<FeatureFlagContextType>({
  flags: {},
  isEnabled: () => true, // Default true se flag non trovato (fail-safe)
  refreshFlags: async () => {},
});

interface FeatureFlagContextProviderProps {
  children: ReactNode;
  initialFlags: Record<string, boolean>;
}

/**
 * Client Component che fornisce il Context per i feature flags.
 * Gestisce lo stato dei flag e fornisce la funzione isEnabled.
 */
export function FeatureFlagContextProvider({
  children,
  initialFlags,
}: FeatureFlagContextProviderProps) {
  const [flags, setFlags] = useState<Record<string, boolean>>(initialFlags);

  /**
   * Verifica se un feature flag è abilitato.
   * Default a true se il flag non esiste (fail-safe).
   */
  const isEnabled = useCallback(
    (key: string): boolean => {
      return flags[key] ?? true;
    },
    [flags]
  );

  /**
   * Ricarica i feature flags dal server.
   * Utile dopo aggiornamenti o per sincronizzazione.
   */
  const refreshFlags = useCallback(async () => {
    try {
      const response = await fetch('/api/feature-flags');
      if (response.ok) {
        const data = await response.json();
        setFlags(data.flags);
      }
    } catch (error) {
      console.error('Failed to refresh feature flags:', error);
    }
  }, []);

  return (
    <FeatureFlagContext.Provider value={{ flags, isEnabled, refreshFlags }}>
      {children}
    </FeatureFlagContext.Provider>
  );
}

/**
 * Hook per accedere al contesto dei feature flags.
 * Da usare nei componenti figli del FeatureFlagProvider.
 */
export function useFeatureFlagContext() {
  const context = useContext(FeatureFlagContext);
  if (context === undefined) {
    throw new Error(
      'useFeatureFlagContext must be used within a FeatureFlagProvider'
    );
  }
  return context;
}
