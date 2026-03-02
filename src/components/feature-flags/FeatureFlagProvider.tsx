import { FeatureFlagContextProvider } from './FeatureFlagContext';

// Feature flags di default (tutti abilitati)
const DEFAULT_FLAGS: Record<string, boolean> = {
  FRONTEND_ENABLED: true,
  SHOP_ENABLED: true,
  GIFT_CARDS_ENABLED: true,
  GIFT_CARDS_POS_ENABLED: true,
  MENU_ENABLED: true,
  STORY_ENABLED: true,
  PLAYLIST_ENABLED: true,
  LOCATION_ENABLED: true,
};

/**
 * Server Component che carica i feature flags dal database
 * e li passa al Client Component wrapper.
 * 
 * NOTA: Durante la build, i feature flags potrebbero non essere disponibili.
 * In tal caso, vengono usati i valori di default (tutti abilitati).
 */
export async function FeatureFlagProvider({ 
  children 
}: { 
  children: React.ReactNode 
}) {
  let flagsMap = { ...DEFAULT_FLAGS };
  
  try {
    // Import dinamico per evitare errori durante la build
    const { prisma } = await import('@/lib/prisma');
    
    // Verifica che prisma esista
    if (prisma && prisma.featureFlag) {
      const flags = await prisma.featureFlag.findMany();
      
      // Merge con i valori dal database
      flags.forEach((flag: { key: string; enabled: boolean }) => {
        flagsMap[flag.key] = flag.enabled;
      });
    }
  } catch (error) {
    // Durante la build o in caso di errore, usa i valori di default
    console.warn('FeatureFlagProvider: using default flags (database unavailable)');
  }

  return (
    <FeatureFlagContextProvider initialFlags={flagsMap}>
      {children}
    </FeatureFlagContextProvider>
  );
}
