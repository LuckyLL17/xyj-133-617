import type { Track, TrackPoint, CustomTrack, TrackDifficulty, TrackTheme } from './types';

const catmullRom = (p0: TrackPoint, p1: TrackPoint, p2: TrackPoint, p3: TrackPoint, t: number): TrackPoint => {
  const t2 = t * t;
  const t3 = t2 * t;
  const z0 = p0.z ?? 0;
  const z1 = p1.z ?? 0;
  const z2 = p2.z ?? 0;
  const z3 = p3.z ?? 0;
  return {
    x: 0.5 * ((2 * p1.x) + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
    y: 0.5 * ((2 * p1.y) + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3),
    z: 0.5 * ((2 * z1) + (-z0 + z2) * t + (2 * z0 - 5 * z1 + 4 * z2 - z3) * t2 + (-z0 + 3 * z1 - 3 * z2 + z3) * t3),
  };
};

export const interpolateTrackPoints = (
  controlPoints: TrackPoint[],
  segmentsPerSpan: number,
  closed: boolean
): TrackPoint[] => {
  if (controlPoints.length < 2) return [...controlPoints];

  const result: TrackPoint[] = [];
  const n = controlPoints.length;
  const getPoint = (i: number): TrackPoint => {
    if (closed) {
      return controlPoints[((i % n) + n) % n];
    }
    if (i < 0) return controlPoints[0];
    if (i >= n) return controlPoints[n - 1];
    return controlPoints[i];
  };

  const limit = closed ? n : n - 1;
  for (let i = 0; i < limit; i++) {
    const p0 = getPoint(i - 1);
    const p1 = getPoint(i);
    const p2 = getPoint(i + 1);
    const p3 = getPoint(i + 2);
    for (let j = 0; j < segmentsPerSpan; j++) {
      const t = j / segmentsPerSpan;
      result.push(catmullRom(p0, p1, p2, p3, t));
    }
  }
  if (closed) {
    result.push(catmullRom(getPoint(limit - 1), getPoint(limit), getPoint(0), getPoint(1), 0));
  } else {
    result.push({ ...controlPoints[n - 1] });
  }
  return result;
};

const buildTrackFromControlPoints = (
  id: string,
  name: string,
  controlPoints: TrackPoint[],
  width: number,
  difficulty: TrackDifficulty,
  theme: TrackTheme,
  description: string,
  accentColor: string,
  laps: number,
  boostControlIndices: number[] = [],
  itemControlIndices: number[] = [],
  checkpointControlIndices: number[] = [0],
  segments: number = 10,
): Track => {
  const points = interpolateTrackPoints(controlPoints, segments, true);
  const controlCount = controlPoints.length;
  const totalInterpolated = controlCount * segments;

  const mapIdx = (editorIdx: number): number =>
    ((editorIdx * segments) % totalInterpolated + totalInterpolated) % totalInterpolated;

  const checkpoints = checkpointControlIndices.map(mapIdx).sort((a, b) => a - b);
  if (!checkpoints.includes(0)) checkpoints.unshift(0);

  const expandRange = (indices: number[], range: number): number[] => {
    const result: Set<number> = new Set();
    indices.forEach((idx) => {
      const mapped = mapIdx(idx);
      for (let r = -range; r <= range; r++) {
        const val = ((mapped + r) % totalInterpolated + totalInterpolated) % totalInterpolated;
        result.add(val);
      }
    });
    return Array.from(result).sort((a, b) => a - b);
  };

  const boostZones = expandRange(boostControlIndices, 2);
  const itemBoxes = itemControlIndices.map(mapIdx);

  return {
    id, name, points, width, checkpoints, boostZones, itemBoxes,
    difficulty, theme, description, accentColor, laps,
  };
};

const TRACK_FOREST_OVAL = buildTrackFromControlPoints(
  'forest-oval',
  '森林椭圆',
  [
    { x: 1000, y: 400 },
    { x: 1400, y: 450 },
    { x: 1600, y: 700 },
    { x: 1500, y: 1000 },
    { x: 1100, y: 1100 },
    { x: 700, y: 1050 },
    { x: 500, y: 800 },
    { x: 550, y: 550 },
  ],
  140,
  'easy',
  'forest',
  '宽阔平缓的入门赛道，适合新手练习',
  '#44aa44',
  3,
  [2, 6],
  [0, 3, 5],
  [0, 2, 4, 6],
);

const TRACK_BEACH_DRIFT = buildTrackFromControlPoints(
  'beach-drift',
  '海滩漂移',
  [
    { x: 1000, y: 500 },
    { x: 1350, y: 420 },
    { x: 1650, y: 600 },
    { x: 1550, y: 900 },
    { x: 1250, y: 1100 },
    { x: 850, y: 1050 },
    { x: 550, y: 850 },
    { x: 500, y: 600 },
    { x: 750, y: 450 },
  ],
  130,
  'medium',
  'beach',
  '阳光海滩，中等难度的S弯组合',
  '#ffcc66',
  3,
  [1, 4, 7],
  [0, 2, 5, 7],
  [0, 2, 4, 6],
);

const TRACK_DESERT_LOOP = buildTrackFromControlPoints(
  'desert-loop',
  '沙漠环路',
  [
    { x: 900, y: 350 },
    { x: 1400, y: 380 },
    { x: 1700, y: 600 },
    { x: 1600, y: 900 },
    { x: 1300, y: 1100 },
    { x: 900, y: 1150 },
    { x: 550, y: 1000 },
    { x: 400, y: 700 },
    { x: 550, y: 450 },
  ],
  120,
  'medium',
  'desert',
  '黄沙漫天，考验过弯技巧的环形赛道',
  '#cc8833',
  3,
  [2, 5, 7],
  [1, 3, 6, 8],
  [0, 2, 4, 6, 8],
);

const TRACK_CITY_STREETS = buildTrackFromControlPoints(
  'city-streets',
  '城市街道',
  [
    { x: 700, y: 300 },
    { x: 1400, y: 320 },
    { x: 1700, y: 550 },
    { x: 1600, y: 800 },
    { x: 1300, y: 950 },
    { x: 1000, y: 1200 },
    { x: 600, y: 1100 },
    { x: 400, y: 850 },
    { x: 500, y: 550 },
    { x: 900, y: 600 },
    { x: 1100, y: 500 },
  ],
  110,
  'hard',
  'city',
  '狭窄街道，多段急弯，考验反应速度',
  '#4488ff',
  3,
  [1, 4, 7, 10],
  [0, 3, 5, 8, 10],
  [0, 3, 5, 7, 10],
);

const TRACK_SNOW_MOUNTAIN = buildTrackFromControlPoints(
  'snow-mountain',
  '雪山之巅',
  [
    { x: 1000, y: 250 },
    { x: 1500, y: 400 },
    { x: 1750, y: 700 },
    { x: 1500, y: 1000 },
    { x: 1100, y: 1150 },
    { x: 700, y: 1050 },
    { x: 450, y: 750 },
    { x: 600, y: 450 },
    { x: 900, y: 500 },
    { x: 1200, y: 600 },
    { x: 1300, y: 850 },
    { x: 900, y: 900 },
  ],
  110,
  'hard',
  'snow',
  '银装素裹，连续S弯考验漂移技巧',
  '#aaddff',
  3,
  [1, 4, 7, 10],
  [0, 2, 5, 8, 11],
  [0, 3, 5, 7, 9, 11],
);

const TRACK_VOLCANO_PEAK = buildTrackFromControlPoints(
  'volcano-peak',
  '火山之脊',
  [
    { x: 1000, y: 200 },
    { x: 1550, y: 350 },
    { x: 1800, y: 650 },
    { x: 1600, y: 950 },
    { x: 1200, y: 1100 },
    { x: 750, y: 1050 },
    { x: 450, y: 800 },
    { x: 350, y: 500 },
    { x: 650, y: 300 },
    { x: 1000, y: 500 },
    { x: 1350, y: 650 },
    { x: 1450, y: 900 },
    { x: 1050, y: 1000 },
    { x: 700, y: 800 },
    { x: 800, y: 500 },
  ],
  100,
  'expert',
  'volcano',
  '熔岩赛道，极窄极弯，只有高手才能征服',
  '#ff4422',
  3,
  [2, 5, 8, 11, 14],
  [0, 3, 6, 9, 12],
  [0, 3, 5, 7, 10, 12, 14],
);

const TRACK_OVERPASS_LOOP = buildTrackFromControlPoints(
  'overpass-loop',
  '立交回旋',
  [
    { x: 1000, y: 900, z: 0 },
    { x: 1300, y: 850, z: 0 },
    { x: 1500, y: 700, z: 0 },
    { x: 1500, y: 500, z: 0 },
    { x: 1350, y: 350, z: 0 },
    { x: 1150, y: 300, z: 0 },
    { x: 1000, y: 300, z: 0 },
    { x: 800, y: 320, z: 0 },
    { x: 650, y: 400, z: 0 },
    { x: 550, y: 550, z: 0 },
    { x: 550, y: 750, z: 0 },
    { x: 700, y: 900, z: 0 },
    { x: 900, y: 950, z: 0 },

    { x: 1000, y: 700, z: 0 },
    { x: 1200, y: 650, z: 0.3 },
    { x: 1350, y: 550, z: 0.6 },
    { x: 1400, y: 400, z: 0.9 },
    { x: 1350, y: 250, z: 1.2 },
    { x: 1200, y: 150, z: 1.5 },
    { x: 1000, y: 120, z: 1.8 },
    { x: 800, y: 150, z: 2 },
    { x: 650, y: 250, z: 2 },
    { x: 550, y: 400, z: 2 },
    { x: 550, y: 600, z: 2 },
    { x: 650, y: 750, z: 2 },
    { x: 800, y: 850, z: 1.7 },
    { x: 1000, y: 900, z: 1.4 },
    { x: 1200, y: 850, z: 1.1 },
    { x: 1350, y: 750, z: 0.8 },
    { x: 1400, y: 600, z: 0.5 },
    { x: 1350, y: 450, z: 0.2 },
    { x: 1200, y: 350, z: 0 },
    { x: 1000, y: 300, z: 0 },
  ],
  110,
  'hard',
  'city',
  '8字形立体交叉赛道，中心高架穿越，小心别开错层',
  '#cc66ff',
  3,
  [2, 6, 10, 14, 18, 22, 26, 30],
  [0, 4, 8, 12, 16, 20, 24, 28],
  [0, 5, 10, 15, 20, 25, 30],
);

export const PRESET_TRACKS: Track[] = [
  TRACK_FOREST_OVAL,
  TRACK_BEACH_DRIFT,
  TRACK_DESERT_LOOP,
  TRACK_CITY_STREETS,
  TRACK_SNOW_MOUNTAIN,
  TRACK_VOLCANO_PEAK,
  TRACK_OVERPASS_LOOP,
];

export const DEFAULT_TRACK = TRACK_FOREST_OVAL;

export const MAIN_TRACK = TRACK_FOREST_OVAL;

export const getTrackById = (id: string): Track => {
  return PRESET_TRACKS.find((t) => t.id === id) ?? DEFAULT_TRACK;
};

export const DIFFICULTY_LABEL: Record<TrackDifficulty, string> = {
  easy: '简单',
  medium: '中等',
  hard: '困难',
  expert: '专家',
};

export const DIFFICULTY_COLOR: Record<TrackDifficulty, string> = {
  easy: '#44ff88',
  medium: '#ffdd44',
  hard: '#ff8844',
  expert: '#ff4466',
};

export const DIFFICULTY_STARS: Record<TrackDifficulty, number> = {
  easy: 1,
  medium: 2,
  hard: 3,
  expert: 4,
};

export const THEME_LABEL: Record<TrackTheme, string> = {
  forest: '森林',
  desert: '沙漠',
  city: '城市',
  snow: '雪山',
  volcano: '火山',
  beach: '海滩',
};

const mapEditorIndexToInterpolated = (
  editorIdx: number,
  segmentsPerSpan: number,
  controlCount: number,
  closed: boolean
): number => {
  if (closed) {
    return (editorIdx * segmentsPerSpan) % (controlCount * segmentsPerSpan);
  }
  return Math.min(editorIdx * segmentsPerSpan, controlCount * segmentsPerSpan);
};

export const buildTrackFromCustom = (custom: CustomTrack): Track => {
  const SEGMENTS = 12;
  const controlPts = custom.points.length >= 3 ? custom.points : [
    { x: 800, y: 600 }, { x: 1000, y: 500 }, { x: 1200, y: 600 }, { x: 1200, y: 800 }, { x: 1000, y: 900 }, { x: 800, y: 800 },
  ];
  const points = interpolateTrackPoints(controlPts, SEGMENTS, custom.closed);
  const controlCount = controlPts.length;

  const hasStartCheckpoint = custom.checkpoints.includes(0);
  const checkpoints = custom.checkpoints.length > 0
    ? custom.checkpoints.map((i) => mapEditorIndexToInterpolated(i, SEGMENTS, controlCount, custom.closed))
    : [0];
  if (!hasStartCheckpoint && !checkpoints.includes(0)) {
    checkpoints.unshift(0);
  }
  checkpoints.sort((a, b) => a - b);

  const expandRange = (indices: number[], range: number): number[] => {
    const result: Set<number> = new Set();
    indices.forEach((idx) => {
      const mapped = mapEditorIndexToInterpolated(idx, SEGMENTS, controlCount, custom.closed);
      for (let r = -range; r <= range; r++) {
        let val = mapped + r;
        if (custom.closed) {
          val = ((val % points.length) + points.length) % points.length;
        } else {
          val = Math.max(0, Math.min(points.length - 1, val));
        }
        result.add(val);
      }
    });
    return Array.from(result).sort((a, b) => a - b);
  };

  return {
    id: 'custom',
    name: custom.name || '自定义赛道',
    width: custom.width,
    points,
    checkpoints,
    boostZones: expandRange(custom.boostZones, 2),
    itemBoxes: custom.itemBoxes.map((i) => mapEditorIndexToInterpolated(i, SEGMENTS, controlCount, custom.closed)),
    difficulty: 'medium',
    theme: 'forest',
    description: '由玩家自由创作的赛道',
    accentColor: '#ff88cc',
    laps: 3,
  };
};

export const getStartPositions = (track: Track, count: number) => {
  const startIdx = 0;
  const nextIdx = 1;
  const p1 = track.points[startIdx];
  const p2 = track.points[nextIdx];
  const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
  const perpX = -Math.sin(angle);
  const perpY = Math.cos(angle);

  const positions: { x: number; y: number; angle: number }[] = [];
  const half = Math.ceil(count / 2);
  for (let i = 0; i < count; i++) {
    const row = i % half;
    const col = Math.floor(i / half);
    const offsetX = -col * 60 - 30;
    const offsetY = (row - (half - 1) / 2) * 45;
    positions.push({
      x: p1.x + Math.cos(angle) * offsetX + perpX * offsetY,
      y: p1.y + Math.sin(angle) * offsetX + perpY * offsetY,
      angle,
    });
  }
  return positions;
};

export const getItemBoxPositions = (track: Track): { x: number; y: number }[] => {
  return track.itemBoxes.map((idx) => track.points[idx]);
};
