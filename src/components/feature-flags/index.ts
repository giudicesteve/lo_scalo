// Provider
export { FeatureFlagProvider } from './FeatureFlagProvider';

// Context e hook
export { 
  FeatureFlagContextProvider, 
  useFeatureFlagContext 
} from './FeatureFlagContext';

// Componenti di gating
export { 
  FeatureGate, 
  FeatureGateAll, 
  FeatureGateAny 
} from './FeatureGate';

// Re-export dell'hook per convenienza
export { useFeatureFlag, useAllFeatureFlags } from '@/hooks/useFeatureFlag';

// Costanti per i feature flag disponibili nel sistema
// Usare queste costanti invece di stringhe magiche per evitare errori di typo
export const FEATURE_FLAGS = {
  // Master switch - Frontend pubblico
  FRONTEND_ENABLED: 'FRONTEND_ENABLED',
  
  // Sezioni principali frontend
  SHOP_ENABLED: 'SHOP_ENABLED',
  GIFT_CARDS_ENABLED: 'GIFT_CARDS_ENABLED',
  GIFT_CARDS_POS_ENABLED: 'GIFT_CARDS_POS_ENABLED',
  MENU_ENABLED: 'MENU_ENABLED',
  STORY_ENABLED: 'STORY_ENABLED',
  PLAYLIST_ENABLED: 'PLAYLIST_ENABLED',
  LOCATION_ENABLED: 'LOCATION_ENABLED',
  
  // Feature admin esistenti (mantenute per retrocompatibilità)
  GIFT_CARD_CREATION: 'GIFT_CARD_CREATION',
  GIFT_CARD_ONLINE: 'GIFT_CARD_ONLINE',
  GIFT_CARD_POS: 'GIFT_CARD_POS',
  SHOP_PRODUCTS_CRUD: 'SHOP_PRODUCTS_CRUD',
  REPORT_MONTHLY: 'REPORT_MONTHLY',
  REPORT_METRICS: 'REPORT_METRICS',
  REPORT_GIFT_CARDS: 'REPORT_GIFT_CARDS',
  REPORT_EXPIRED_GIFT_CARDS: 'REPORT_EXPIRED_GIFT_CARDS',
  REPORT_COMPLETE: 'REPORT_COMPLETE',
  ACCOUNTING_DAILY: 'ACCOUNTING_DAILY',
  STRIPE_DASHBOARD: 'STRIPE_DASHBOARD',
  SETTINGS_GIFT_CARD_EXPIRY: 'SETTINGS_GIFT_CARD_EXPIRY',
  SETTINGS_LEGAL_POLICIES: 'SETTINGS_LEGAL_POLICIES',
  SETTINGS_USER_MANAGEMENT: 'SETTINGS_USER_MANAGEMENT',
} as const;

// Tipo per i feature flag
type FeatureFlagKeys = keyof typeof FEATURE_FLAGS;
export type FeatureFlagKey = (typeof FEATURE_FLAGS)[FeatureFlagKeys];
