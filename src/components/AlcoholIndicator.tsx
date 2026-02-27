"use client";

/**
 * Alcohol Level Indicator Component
 * 
 * Database stores 0-10 (integer), visualized as 5 dots with half-fill support:
 * - DB 0 = 0 dots (0/10 = 0.0)
 * - DB 1 = 0.5 dots (1/10 = 0.5)
 * - DB 2 = 1 dot (2/10 = 1.0)
 * - DB 3 = 1.5 dots (3/10 = 1.5)
 * - DB 10 = 5 dots (10/10 = 5.0)
 */

interface AlcoholIndicatorProps {
  level: number | null | undefined;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

const sizeClasses = {
  sm: {
    dot: "w-2 h-2",
    halfDot: "w-2 h-2",
    gap: "gap-1",
    label: "text-xs",
  },
  md: {
    dot: "w-3 h-3",
    halfDot: "w-3 h-3",
    gap: "gap-1.5",
    label: "text-sm",
  },
  lg: {
    dot: "w-4 h-4",
    halfDot: "w-4 h-4",
    gap: "gap-2",
    label: "text-base",
  },
};

export function AlcoholIndicator({ 
  level, 
  size = "md",
  showLabel = false 
}: AlcoholIndicatorProps) {
  const safeLevel = Math.max(0, Math.min(10, level ?? 0));
  const dots = safeLevel / 2; // Convert 0-10 to 0-5 dots
  
  const classes = sizeClasses[size];

  return (
    <div className="flex items-center gap-2">
      <div className={`flex ${classes.gap}`}>
        {Array.from({ length: 5 }).map((_, i) => {
          const dotValue = i + 1; // 1, 2, 3, 4, 5
          
          if (dots >= dotValue) {
            // Full dot
            return (
              <div
                key={i}
                className={`${classes.dot} rounded-full bg-brand-primary`}
                aria-hidden="true"
              />
            );
          } else if (dots >= dotValue - 0.5) {
            // Half dot - use clip-path or gradient
            return (
              <div
                key={i}
                className={`${classes.halfDot} rounded-full relative overflow-hidden`}
                aria-hidden="true"
              >
                {/* Background (empty part) */}
                <div className="absolute inset-0 border-2 border-brand-primary rounded-full" />
                {/* Foreground (filled part - left half) */}
                <div 
                  className="absolute inset-0 bg-brand-primary"
                  style={{ clipPath: "inset(0 50% 0 0)" }}
                />
              </div>
            );
          } else {
            // Empty dot
            return (
              <div
                key={i}
                className={`${classes.dot} rounded-full border-2 border-brand-primary`}
                aria-hidden="true"
              />
            );
          }
        })}
      </div>
      {showLabel && (
        <span className={`${classes.label} text-text-secondary`}>
          {safeLevel}/10
        </span>
      )}
    </div>
  );
}

/**
 * Admin preview component - shows both the indicator and the numeric value
 */
export function AlcoholLevelPreview({ level }: { level: number | null | undefined }) {
  const safeLevel = level ?? 0;
  
  return (
    <div className="flex items-center gap-3">
      <AlcoholIndicator level={safeLevel} size="md" />
      <span className="text-sm font-medium text-brand-primary">
        {safeLevel}/10
      </span>
    </div>
  );
}
