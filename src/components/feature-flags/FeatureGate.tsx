'use client';

import { ReactNode } from 'react';
import { useFeatureFlag, useAllFeatureFlags } from '@/hooks/useFeatureFlag';

interface FeatureGateProps {
  /** La chiave del feature flag da verificare */
  flag: string;
  /** Il contenuto da renderizzare se il flag è abilitato */
  children: ReactNode;
  /** Il contenuto alternativo da renderizzare se il flag è disabilitato (default: null) */
  fallback?: ReactNode;
}

/**
 * Componente per conditional rendering basato su feature flags.
 * Renderizza i children solo se il flag specificato è abilitato.
 * 
 * @example
 * ```tsx
 * // Nascondi completamente se disabilitato
 * <FeatureGate flag="GIFT_CARD_CREATION">
 *   <GiftCardSection />
 * </FeatureGate>
 * 
 * // Mostra fallback se disabilitato
 * <FeatureGate 
 *   flag="SHOP_ENABLED" 
 *   fallback={<p>Il negozio è temporaneamente chiuso</p>}
 * >
 *   <Shop />
 * </FeatureGate>
 * 
 * // Disabilita un bottone invece di nasconderlo
 * <FeatureGate 
 *   flag="REPORT_EXPORT" 
 *   fallback={<Button disabled>Esporta (non disponibile)</Button>}
 * >
 *   <ExportButton />
 * </FeatureGate>
 * ```
 */
export function FeatureGate({ 
  flag, 
  children, 
  fallback = null 
}: FeatureGateProps) {
  const isEnabled = useFeatureFlag(flag);
  
  return isEnabled ? children : fallback;
}

interface FeatureGateAllProps {
  /** Array di chiavi di feature flag - tutti devono essere abilitati */
  flags: string[];
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Componente che verifica che TUTTI i flag specificati siano abilitati.
 * Utile per funzionalità che richiedono multiple dipendenze.
 * 
 * @example
 * ```tsx
 * // Mostra solo se sia gift card che reporting sono abilitati
 * <FeatureGateAll flags={['GIFT_CARD_CREATION', 'REPORT_GIFT_CARDS']}>
 *   <GiftCardReport />
 * </FeatureGateAll>
 * ```
 */
export function FeatureGateAll({ 
  flags, 
  children, 
  fallback = null 
}: FeatureGateAllProps) {
  const { flags: allFlags } = useAllFeatureFlags();
  
  const allEnabled = flags.every((flag) => allFlags[flag] ?? true);
  
  return allEnabled ? children : fallback;
}

interface FeatureGateAnyProps {
  /** Array di chiavi di feature flag - almeno uno deve essere abilitato */
  flags: string[];
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Componente che verifica che ALMENO UNO dei flag specificati sia abilitato.
 * Utile per funzionalità alternative.
 * 
 * @example
 * ```tsx
 * // Mostra se almeno uno dei report è abilitato
 * <FeatureGateAny flags={['REPORT_MONTHLY', 'REPORT_METRICS', 'REPORT_COMPLETE']}>
 *   <ReportsMenu />
 * </FeatureGateAny>
 * ```
 */
export function FeatureGateAny({ 
  flags, 
  children, 
  fallback = null 
}: FeatureGateAnyProps) {
  const { flags: allFlags } = useAllFeatureFlags();
  
  const anyEnabled = flags.some((flag) => allFlags[flag] ?? true);
  
  return anyEnabled ? children : fallback;
}
