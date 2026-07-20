export type QualityTier = 'high' | 'lite';

const KEY = 'liber-game-quality';

function detectTier(): QualityTier {
  if (typeof window === 'undefined') return 'high';
  try {
    const coarse =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(pointer: coarse)').matches;
    const dpr = window.devicePixelRatio || 1;
    const touch = navigator.maxTouchPoints > 0 || coarse;
    // Mobile parity: prefer lite on touch / low DPR devices.
    if (touch && dpr < 2.5) return 'lite';
    if (coarse) return 'lite';
  } catch {
    /* ignore */
  }
  return 'high';
}

/** Explicit override (`high` | `lite`) or null to clear. */
export function setQualityOverride(tier: QualityTier | null) {
  try {
    if (tier == null) localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, tier);
  } catch {
    /* ignore */
  }
}

export function getQualityOverride(): QualityTier | null {
  try {
    const v = localStorage.getItem(KEY);
    if (v === 'high' || v === 'lite') return v;
  } catch {
    /* ignore */
  }
  return null;
}

export function getQuality(): QualityTier {
  return getQualityOverride() ?? detectTier();
}

/** Call after renderer is known — Canvas cannot do Light2D well. */
export function refineQualityForRenderer(isWebGL: boolean): QualityTier {
  const q = getQuality();
  if (!isWebGL) return 'lite';
  return q;
}
