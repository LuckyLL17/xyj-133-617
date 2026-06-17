import type { Track, Obstacle, Car, Particle, ObstacleType } from './types';
import { dist, randRange, clamp } from '../utils/math';

const OBSTACLE_COUNT = 12;

const getTrackPointAt = (track: Track, progress: number) => {
  const pts = track.points;
  const n = pts.length;
  const p = ((progress % n) + n) % n;
  const i = Math.floor(p);
  const t = p - i;
  const p1 = pts[i];
  const p2 = pts[(i + 1) % n];
  return {
    x: p1.x + (p2.x - p1.x) * t,
    y: p1.y + (p2.y - p1.y) * t,
    segIdx: i,
    t,
  };
};

const getTrackPerpAt = (track: Track, segIdx: number) => {
  const pts = track.points;
  const p1 = pts[segIdx];
  const p2 = pts[(segIdx + 1) % pts.length];
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  return {
    tangentX: dx / len,
    tangentY: dy / len,
    perpX: -dy / len,
    perpY: dx / len,
  };
};

const pickRandomObstacleType = (): ObstacleType => {
  const r = Math.random();
  if (r < 0.4) return 'static';
  if (r < 0.75) return 'sway';
  return 'patrol';
};

export const createObstacles = (track: Track): Obstacle[] => {
  const obstacles: Obstacle[] = [];
  const pts = track.points;
  const n = pts.length;
  const startAvoid = 10;
  const spacing = (n - startAvoid * 2) / OBSTACLE_COUNT;

  for (let i = 0; i < OBSTACLE_COUNT; i++) {
    const baseProgress = startAvoid + spacing * i + randRange(-spacing * 0.3, spacing * 0.3);
    const tp = getTrackPointAt(track, baseProgress);
    const perp = getTrackPerpAt(track, tp.segIdx);
    const type = pickRandomObstacleType();

    const hw = track.width / 2;
    const lateralOffset = randRange(-hw * 0.6, hw * 0.6);
    const baseX = tp.x + perp.perpX * lateralOffset;
    const baseY = tp.y + perp.perpY * lateralOffset;

    const angle = Math.atan2(perp.tangentY, perp.tangentX);

    let width: number, height: number, speed: number;
    switch (type) {
      case 'static':
        width = randRange(28, 40);
        height = randRange(28, 40);
        speed = 0;
        break;
      case 'sway':
        width = randRange(24, 32);
        height = randRange(24, 32);
        speed = 0;
        break;
      case 'patrol':
        width = randRange(26, 34);
        height = randRange(26, 34);
        speed = randRange(1.2, 2.2);
        break;
    }

    const patrolRange = Math.floor(spacing * 0.8);
    const patrolStart = Math.max(startAvoid, Math.floor(baseProgress - patrolRange / 2));
    const patrolEnd = Math.min(n - startAvoid, patrolStart + patrolRange);

    obstacles.push({
      id: i,
      type,
      x: baseX,
      y: baseY,
      angle,
      width,
      height,
      speed,
      baseX,
      baseY,
      baseAngle: angle,
      swayRange: hw * randRange(0.4, 0.75),
      swayPhase: Math.random() * Math.PI * 2,
      swaySpeed: randRange(0.0015, 0.003),
      patrolStartIdx: patrolStart,
      patrolEndIdx: patrolEnd,
      patrolDir: Math.random() < 0.5 ? 1 : -1,
      trackProgress: baseProgress,
      active: true,
      hitFlash: 0,
    });
  }

  return obstacles;
};

export const updateObstacles = (
  obstacles: Obstacle[],
  track: Track,
  dt: number,
  globalTime: number,
) => {
  for (const obs of obstacles) {
    if (!obs.active) continue;

    if (obs.hitFlash > 0) {
      obs.hitFlash = Math.max(0, obs.hitFlash - dt);
    }

    switch (obs.type) {
      case 'static':
        break;
      case 'sway': {
        const sway = Math.sin(globalTime * obs.swaySpeed + obs.swayPhase) * obs.swayRange;
        const perp = getTrackPerpAt(track, Math.floor(obs.trackProgress) % track.points.length);
        obs.x = obs.baseX + perp.perpX * sway;
        obs.y = obs.baseY + perp.perpY * sway;
        break;
      }
      case 'patrol': {
        obs.trackProgress += obs.patrolDir * obs.speed * (dt / 16) * 0.25;
        if (obs.trackProgress >= obs.patrolEndIdx) {
          obs.trackProgress = obs.patrolEndIdx;
          obs.patrolDir = -1;
        } else if (obs.trackProgress <= obs.patrolStartIdx) {
          obs.trackProgress = obs.patrolStartIdx;
          obs.patrolDir = 1;
        }
        const tp = getTrackPointAt(track, obs.trackProgress);
        const perp = getTrackPerpAt(track, tp.segIdx);
        const hw = track.width / 2;
        const lateral = Math.sin(globalTime * obs.swaySpeed + obs.swayPhase) * hw * 0.35;
        obs.x = tp.x + perp.perpX * lateral;
        obs.y = tp.y + perp.perpY * lateral;
        obs.angle = Math.atan2(perp.tangentY, perp.tangentX);
        if (obs.patrolDir < 0) obs.angle += Math.PI;
        break;
      }
    }
  }
};

const checkObstacleCollision = (car: Car, obs: Obstacle): boolean => {
  if (!obs.active) return false;
  const r = 16;
  const hw = obs.width / 2 + r;
  const hh = obs.height / 2 + r;
  const dx = car.x - obs.x;
  const dy = car.y - obs.y;
  const cos = Math.cos(-obs.angle);
  const sin = Math.sin(-obs.angle);
  const localX = dx * cos - dy * sin;
  const localY = dx * sin + dy * cos;
  return Math.abs(localX) < hw && Math.abs(localY) < hh;
};

export const resolveObstacleCollision = (
  car: Car,
  obs: Obstacle,
  particles: Particle[],
  cameras: { shake: number }[],
) => {
  if (!checkObstacleCollision(car, obs)) return false;
  if (car.spinTime > 0) return false;

  if (car.hasShield) {
    car.hasShield = false;
    car.shieldTime = 0;
    obs.hitFlash = 300;
    for (let i = 0; i < 8; i++) {
      particles.push({
        x: car.x,
        y: car.y,
        vx: randRange(-2, 2),
        vy: randRange(-2, 2),
        life: 350,
        maxLife: 350,
        color: '#33ccff',
        size: 3,
      });
    }
    if (car.isPlayer && car.playerIndex >= 0) {
      cameras[car.playerIndex].shake = Math.max(cameras[car.playerIndex].shake, 6);
    }
  } else {
    car.spinTime = 1000;
    car.speed *= 0.35;
    obs.hitFlash = 400;

    const dx = car.x - obs.x;
    const dy = car.y - obs.y;
    const d = Math.sqrt(dx * dx + dy * dy) || 1;
    const pushDist = 22;
    car.x += (dx / d) * pushDist;
    car.y += (dy / d) * pushDist;

    for (let i = 0; i < 14; i++) {
      particles.push({
        x: car.x + randRange(-10, 10),
        y: car.y + randRange(-10, 10),
        vx: randRange(-3.5, 3.5),
        vy: randRange(-3.5, 3.5),
        life: 550,
        maxLife: 550,
        color: Math.random() < 0.5 ? '#ff5522' : '#ffcc22',
        size: 4,
      });
    }
    if (car.isPlayer && car.playerIndex >= 0) {
      cameras[car.playerIndex].shake = Math.max(cameras[car.playerIndex].shake, 10);
    }
  }
  return true;
};

export const updateObstacleCollisions = (
  obstacles: Obstacle[],
  cars: Car[],
  particles: Particle[],
  cameras: { shake: number }[],
) => {
  for (const car of cars) {
    if (car.finished) continue;
    for (const obs of obstacles) {
      if (dist(car.x, car.y, obs.x, obs.y) < obs.width + 40) {
        resolveObstacleCollision(car, obs, particles, cameras);
      }
    }
  }
};

export const obstacleHitFlash = (obs: Obstacle): number => {
  if (obs.hitFlash <= 0) return 0;
  return clamp(obs.hitFlash / 400, 0, 1);
};
