export const easings = {
  outExpo: [0.16, 1, 0.3, 1] as const,
  inOutQuart: [0.76, 0, 0.24, 1] as const,
  outQuad: [0.25, 0.46, 0.45, 0.94] as const,
};

export const durations = {
  micro: 0.18,
  standard: 0.6,
  hero: 1.2,
  page: 0.8,
};

export const prefersReducedMotion = () => {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
};
