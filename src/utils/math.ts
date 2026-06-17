export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

export const clamp = (v: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, v));

export const deg2rad = (deg: number): number => (deg * Math.PI) / 180;
export const rad2deg = (rad: number): number => (rad * 180) / Math.PI;

export const angleDiff = (a: number, b: number): number => {
  let diff = a - b;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return diff;
};

export const dist = (x1: number, y1: number, x2: number, y2: number): number =>
  Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);

export const distSq = (x1: number, y1: number, x2: number, y2: number): number =>
  (x2 - x1) ** 2 + (y2 - y1) ** 2;

export const normalizeAngle = (a: number): number => {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
};

export const randRange = (min: number, max: number): number =>
  Math.random() * (max - min) + min;

export const randInt = (min: number, max: number): number =>
  Math.floor(randRange(min, max + 1));

export const pickRandom = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

export const pointToSegmentDist = (
  px: number, py: number,
  x1: number, y1: number,
  x2: number, y2: number
): { dist: number; t: number } => {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return { dist: dist(px, py, x1, y1), t: 0 };
  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = clamp(t, 0, 1);
  const cx = x1 + t * dx;
  const cy = y1 + t * dy;
  return { dist: dist(px, py, cx, cy), t };
};

export const formatTime = (ms: number): string => {
  const totalSec = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;
  const m = Math.floor((ms % 1000) / 10);
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(m).padStart(2, '0')}`;
};
