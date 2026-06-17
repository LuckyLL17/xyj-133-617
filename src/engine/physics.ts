import type { Car, InputState, Track, EnvConfig, WeatherType, TimeOfDay, WackyState } from './types';
import { clamp, pointToSegmentDist } from '../utils/math';

export const GRAVITY_FLIP_INTERVAL = 6000;
export const GRAVITY_WARNING_TIME = 1500;
export const GRAVITY_FLIP_ANIM_DURATION = 400;

export interface EnvPhysicsModifiers {
  frictionMul: number;
  gripMul: number;
  accelMul: number;
  maxSpeedMul: number;
  offTrackPenalty: number;
  driftResistanceMul: number;
}

export const getEnvModifiers = (env: EnvConfig): EnvPhysicsModifiers => {
  const weatherMods: Record<WeatherType, Partial<EnvPhysicsModifiers>> = {
    clear: {
      frictionMul: 1,
      gripMul: 1,
      accelMul: 1,
      maxSpeedMul: 1,
      offTrackPenalty: 0.94,
      driftResistanceMul: 1,
    },
    rain: {
      frictionMul: 0.992,
      gripMul: 0.7,
      accelMul: 0.9,
      maxSpeedMul: 0.92,
      offTrackPenalty: 0.9,
      driftResistanceMul: 0.65,
    },
    snow: {
      frictionMul: 0.985,
      gripMul: 0.5,
      accelMul: 0.8,
      maxSpeedMul: 0.85,
      offTrackPenalty: 0.88,
      driftResistanceMul: 0.4,
    },
    fog: {
      frictionMul: 1,
      gripMul: 0.9,
      accelMul: 0.98,
      maxSpeedMul: 0.97,
      offTrackPenalty: 0.93,
      driftResistanceMul: 0.85,
    },
  };

  const timeMods: Record<TimeOfDay, Partial<EnvPhysicsModifiers>> = {
    day: { gripMul: 1, accelMul: 1, maxSpeedMul: 1 },
    dawn: { gripMul: 0.96, accelMul: 0.99, maxSpeedMul: 0.99 },
    sunset: { gripMul: 0.94, accelMul: 0.98, maxSpeedMul: 0.98 },
    night: { gripMul: 0.88, accelMul: 0.95, maxSpeedMul: 0.94 },
  };

  const w = weatherMods[env.weather];
  const t = timeMods[env.timeOfDay];

  return {
    frictionMul: (w.frictionMul ?? 1),
    gripMul: (w.gripMul ?? 1) * (t.gripMul ?? 1),
    accelMul: (w.accelMul ?? 1) * (t.accelMul ?? 1),
    maxSpeedMul: (w.maxSpeedMul ?? 1) * (t.maxSpeedMul ?? 1),
    offTrackPenalty: w.offTrackPenalty ?? 0.94,
    driftResistanceMul: w.driftResistanceMul ?? 1,
  };
};

export const updateCarPhysics = (
  car: Car,
  input: InputState,
  dt: number,
  track: Track,
  env: EnvConfig = { weather: 'clear', timeOfDay: 'day' },
  wacky: WackyState | null = null,
) => {
  if (car.finished) return;

  const mod = getEnvModifiers(env);

  let effectiveInput = input;
  if (wacky && wacky.enabled && car.gravityFlipped) {
    effectiveInput = {
      up: input.down,
      down: input.up,
      left: input.right,
      right: input.left,
      space: input.space,
      shift: input.shift,
    };
  }

  if (car.gravityFlipAnim > 0) {
    car.gravityFlipAnim = Math.max(0, car.gravityFlipAnim - dt);
  }

  if (car.spinTime > 0) {
    car.spinTime -= dt;
    car.angle += 0.15;
    car.speed *= 0.95;
  } else {
    let maxSpeed = car.maxSpeed * mod.maxSpeedMul;
    let accel = car.acceleration * mod.accelMul;
    const effectiveFriction = car.friction * mod.frictionMul;
    const handling = car.handling * mod.gripMul;

    if (car.hyperBoostTime > 0) {
      car.hyperBoostTime -= dt;
      car.boostTime = Math.max(car.boostTime, car.hyperBoostTime);
      maxSpeed *= 2.0;
      accel *= 2.5;
    } else if (car.boostTime > 0) {
      car.boostTime -= dt;
      maxSpeed *= 1.5;
      accel *= 1.8;
    }
    if (car.shieldTime > 0) {
      car.shieldTime -= dt;
      if (car.shieldTime <= 0) car.hasShield = false;
    }
    if (car.scaleTime > 0) {
      car.scaleTime -= dt;
      if (car.scaleTime <= 0) {
        car.scale = 1;
      }
    }

    if (effectiveInput.up) {
      car.speed = clamp(car.speed + accel, -maxSpeed * 0.3, maxSpeed);
    }
    if (effectiveInput.down) {
      car.speed = clamp(car.speed - accel * 0.6, -maxSpeed * 0.4, maxSpeed);
    }

    car.speed *= effectiveFriction;

    const absSpeed = Math.abs(car.speed);
    const turnFactor = clamp(absSpeed / (maxSpeed * 0.5), 0.2, 1);
    let steerSpeed = handling * turnFactor * Math.sign(car.speed || 1);

    const driftMinSpeed = maxSpeed * 0.45;
    const isDrifting = effectiveInput.shift && absSpeed > driftMinSpeed && (effectiveInput.left || effectiveInput.right);
    car.drifting = isDrifting;

    const driftBoost = 1.4 + 0.6 * (1 - mod.driftResistanceMul);
    if (isDrifting) {
      steerSpeed *= driftBoost;
      const driftStep = 0.02 / Math.max(0.4, mod.driftResistanceMul);
      car.driftAngle = clamp(car.driftAngle + (effectiveInput.left ? -driftStep : driftStep), -0.6, 0.6);
    } else {
      const driftReturn = 0.85 + 0.1 * mod.driftResistanceMul;
      car.driftAngle *= driftReturn;
    }

    if (effectiveInput.left) car.angle -= steerSpeed;
    if (effectiveInput.right) car.angle += steerSpeed;
  }

  const moveAngle = car.angle + car.driftAngle;
  const newX = car.x + Math.cos(moveAngle) * car.speed;
  const newY = car.y + Math.sin(moveAngle) * car.speed;

  const zSyncBefore = nearestTrackDistSameZ(newX, newY, track, car.z);
  const nearestPt = track.points[zSyncBefore.nearestIdx];
  const nextPt = track.points[(zSyncBefore.nearestIdx + 1) % track.points.length];
  const trackZ1 = nearestPt.z ?? 0;
  const trackZ2 = nextPt.z ?? 0;

  const isRamp = Math.abs(trackZ1 - trackZ2) > 0.01;
  const maxZChange = isRamp ? 0.5 : 0.2;

  let targetZ: number;
  if (isRamp) {
    const { t: segT } = pointToSegmentDist(newX, newY, nearestPt.x, nearestPt.y, nextPt.x, nextPt.y);
    targetZ = trackZ1 + (trackZ2 - trackZ1) * Math.max(0, Math.min(1, segT));
  } else {
    targetZ = trackZ1;
  }

  const prevZ = car.z;
  if (Math.abs(targetZ - car.z) < maxZChange) {
    car.z = targetZ;
  } else {
    car.z += Math.sign(targetZ - car.z) * maxZChange;
  }
  car.z = Math.max(0, car.z);

  if (Math.abs(car.z - prevZ) > 0.01) {
    const verify = nearestTrackDistSameZ(newX, newY, track, car.z);
    const verifyPt = track.points[verify.nearestIdx];
    const verifyNextPt = track.points[(verify.nearestIdx + 1) % track.points.length];
    const verifyZ1 = verifyPt.z ?? 0;
    const verifyZ2 = verifyNextPt.z ?? 0;
    const verifyIsRamp = Math.abs(verifyZ1 - verifyZ2) > 0.01;

    if (!verifyIsRamp && Math.abs(verifyZ1 - car.z) > 0.5) {
      car.z = prevZ;
    }
  }

  const mod2 = getEnvModifiers(env);
  const nearestAfter = nearestTrackDistSameZ(newX, newY, track, car.z);
  const halfWidth = track.width / 2;

  if (nearestAfter.dist < halfWidth - 2) {
    car.x = newX;
    car.y = newY;
    if (isInBoostZone(newX, newY, track) && car.spinTime <= 0) {
      car.speed = clamp(car.speed + 0.08, 0, car.maxSpeed * 1.5);
    }
  } else {
    car.speed *= mod2.offTrackPenalty;

    const p1 = track.points[nearestAfter.nearestIdx];
    const p2 = track.points[(nearestAfter.nearestIdx + 1) % track.points.length];
    const dx = p2.x - p1.x, dy = p2.y - p1.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;

    const toCarX = newX - p1.x, toCarY = newY - p1.y;
    const dot = toCarX * nx + toCarY * ny;
    const pushDir = dot >= 0 ? 1 : -1;

    const safeDist = halfWidth - 6;
    const targetX = p1.x + nx * safeDist * pushDir;
    const targetY = p1.y + ny * safeDist * pushDir;

    car.x = car.x + (targetX - car.x) * 0.5;
    car.y = car.y + (targetY - car.y) * 0.5;
  }

  if (car.drifting) {
    car.tireMarkTimer += dt;
  }
};

export const nearestTrackDist = (x: number, y: number, track: Track): { dist: number; nearestIdx: number } => {
  let minDist = Infinity;
  let nearestIdx = 0;
  const pts = track.points;
  for (let i = 0; i < pts.length; i++) {
    const p1 = pts[i];
    const p2 = pts[(i + 1) % pts.length];
    const { dist } = pointToSegmentDist(x, y, p1.x, p1.y, p2.x, p2.y);
    if (dist < minDist) {
      minDist = dist;
      nearestIdx = i;
    }
  }
  return { dist: minDist, nearestIdx };
};

export const nearestTrackDistSameZ = (x: number, y: number, track: Track, targetZ: number): { dist: number; nearestIdx: number } => {
  let minDist = Infinity;
  let nearestIdx = 0;
  const pts = track.points;
  const zT = targetZ;

  let bestZDiff = Infinity;
  let fallbackIdx = 0;
  let fallbackDist = Infinity;

  for (let i = 0; i < pts.length; i++) {
    const p1 = pts[i];
    const p2 = pts[(i + 1) % pts.length];
    const z1 = p1.z ?? 0;
    const z2 = p2.z ?? 0;

    const segZ = (z1 + z2) / 2;
    const zDiff = Math.abs(segZ - zT);

    const { dist } = pointToSegmentDist(x, y, p1.x, p1.y, p2.x, p2.y);

    if (zDiff < bestZDiff || (zDiff === bestZDiff && dist < fallbackDist)) {
      bestZDiff = zDiff;
      fallbackIdx = i;
      fallbackDist = dist;
    }

    const isFlat = Math.abs(z1 - z2) < 0.01;
    if (isFlat) {
      if (Math.abs(z1 - zT) > 0.6) continue;
    } else {
      const zMin = Math.min(z1, z2);
      const zMax = Math.max(z1, z2);
      if (zT < zMin - 0.5 || zT > zMax + 0.5) continue;
    }

    if (dist < minDist) {
      minDist = dist;
      nearestIdx = i;
    }
  }

  if (minDist === Infinity) {
    return { dist: fallbackDist, nearestIdx: fallbackIdx };
  }
  return { dist: minDist, nearestIdx };
};

export const isInBoostZone = (x: number, y: number, track: Track): boolean => {
  const { nearestIdx } = nearestTrackDist(x, y, track);
  return track.boostZones.some((z) => {
    const diff = Math.abs(z - nearestIdx);
    return diff <= 1 || diff >= track.points.length - 1;
  });
};

export const nearestTrackIdx = (x: number, y: number, track: Track): number => {
  return nearestTrackDist(x, y, track).nearestIdx;
};

export const nearestTrackIdxSameZ = (x: number, y: number, track: Track, targetZ: number): number => {
  return nearestTrackDistSameZ(x, y, track, targetZ).nearestIdx;
};

export const checkCarCollision = (car: Car, other: Car): boolean => {
  if (car.isGhost || other.isGhost) return false;
  const carZ = Math.round(car.z);
  const otherZ = Math.round(other.z);
  if (carZ !== otherZ) return false;
  const dx = car.x - other.x;
  const dy = car.y - other.y;
  const r1 = 18 * car.scale;
  const r2 = 18 * other.scale;
  return dx * dx + dy * dy < (r1 + r2) * (r1 + r2);
};

export const resolveCarCollision = (car: Car, other: Car) => {
  const dx = car.x - other.x;
  const dy = car.y - other.y;
  const dist = Math.sqrt(dx * dx + dy * dy) || 1;
  const r1 = 18 * car.scale;
  const r2 = 18 * other.scale;
  const overlap = (r1 + r2) - dist;
  if (overlap > 0) {
    const nx = dx / dist;
    const ny = dy / dist;

    const carIsGiant = car.scale > 1.2;
    const otherIsGiant = other.scale > 1.2;
    const carIsSmall = car.scale < 0.7;
    const otherIsSmall = other.scale < 0.7;

    if (carIsGiant && !otherIsGiant) {
      other.x -= nx * overlap * 0.8;
      other.y -= ny * overlap * 0.8;
      other.speed *= 0.6;
      other.spinTime = Math.max(other.spinTime, 400);
      const relSpeed = (car.speed - other.speed) * 0.5;
      other.speed += relSpeed * 0.8;
    } else if (otherIsGiant && !carIsGiant) {
      car.x += nx * overlap * 0.8;
      car.y += ny * overlap * 0.8;
      car.speed *= 0.6;
      car.spinTime = Math.max(car.spinTime, 400);
      const relSpeed = (other.speed - car.speed) * 0.5;
      car.speed += relSpeed * 0.8;
    } else if (carIsSmall && !otherIsSmall) {
      car.x += nx * overlap * 0.7;
      car.y += ny * overlap * 0.7;
      other.x -= nx * overlap * 0.3;
      other.y -= ny * overlap * 0.3;
      const relSpeed = (car.speed - other.speed) * 0.2;
      car.speed -= relSpeed * 0.3;
      other.speed += relSpeed * 0.3;
    } else if (otherIsSmall && !carIsSmall) {
      car.x += nx * overlap * 0.3;
      car.y += ny * overlap * 0.3;
      other.x -= nx * overlap * 0.7;
      other.y -= ny * overlap * 0.7;
      const relSpeed = (car.speed - other.speed) * 0.2;
      car.speed -= relSpeed * 0.3;
      other.speed += relSpeed * 0.3;
    } else {
      car.x += nx * overlap * 0.5;
      car.y += ny * overlap * 0.5;
      other.x -= nx * overlap * 0.5;
      other.y -= ny * overlap * 0.5;
      const relSpeed = (car.speed - other.speed) * 0.3;
      car.speed -= relSpeed * 0.5;
      other.speed += relSpeed * 0.5;
    }
  }
};

export const updateWackyGravity = (wacky: WackyState, dt: number, cars: Car[]): WackyState => {
  if (!wacky.enabled) return wacky;

  const next = { ...wacky };

  if (next.flipping) {
    next.flipAnimProgress = Math.min(1, next.flipAnimProgress + dt / GRAVITY_FLIP_ANIM_DURATION);
    if (next.flipAnimProgress >= 1) {
      next.flipping = false;
      next.flipAnimProgress = 0;
      next.gravityDir = (next.gravityDir * -1) as 1 | -1;
      next.flipTimer = GRAVITY_FLIP_INTERVAL;
      next.warningTimer = GRAVITY_WARNING_TIME;
      for (const car of cars) {
        car.gravityFlipped = next.gravityDir === -1;
        car.gravityFlipAnim = 0;
      }
    }
    return next;
  }

  next.flipTimer -= dt;
  if (next.flipTimer <= GRAVITY_WARNING_TIME && next.warningTimer > 0) {
    next.warningTimer -= dt;
  }

  if (next.flipTimer <= 0) {
    next.flipping = true;
    next.flipAnimProgress = 0;
    for (const car of cars) {
      car.gravityFlipAnim = GRAVITY_FLIP_ANIM_DURATION;
    }
  }

  return next;
};
