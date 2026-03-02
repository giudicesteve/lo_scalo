'use client';

import { useFeatureFlagContext } from '@/components/feature-flags/FeatureFlagContext';

/**
 * Hook dedicato per verificare se un feature flag è abilitato.
 * 
 * @param key - La chiave del feature flag da verificare
 * @returns boolean - true se il flag è abilitato, false altrimenti
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const isGiftCardEnabled = useFeatureFlag('GIFT_CARD_CREATION');
 *   
 *   if (!isGiftCardEnabled) return null;
 *   
 *   return <GiftCardForm />;
 * }
 * ```
 */
export function useFeatureFlag(key: string): boolean {
  const { isEnabled } = useFeatureFlagContext();
  return isEnabled(key);
}

/**
 * Hook per ottenere tutti i feature flags.
 * Utile per debugging o per componenti che necessitano di accesso multiplo.
 * 
 * @example
 * ```tsx
 * function DebugFlags() {
 *   const { flags, refreshFlags } = useAllFeatureFlags();
 *   
 *   return (
 *     <div>
 *       <pre>{JSON.stringify(flags, null, 2)}</pre>
 *       <button onClick={refreshFlags}>Refresh</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useAllFeatureFlags() {
  const { flags, refreshFlags } = useFeatureFlagContext();
  return { flags, refreshFlags };
}
