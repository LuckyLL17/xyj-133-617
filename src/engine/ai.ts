import type { Car, InputState, Track } from './types';
import { normalizeAngle, angleDiff } from '../utils/math';
import { nearestTrackIdxSameZ } from './physics';

export const updateAI = (car: Car, track: Track, dt: number): InputState => {
  const input: InputState = {
    up: false, down: false, left: false, right: false, space: false, shift: false,
  };
  if (car.finished) return input;

  const currentIdx = nearestTrackIdxSameZ(car.x, car.y, track, car.z);
  const skill = car.aiSkill;

  const lookAheadBase = 4 + skill * 10;
  const lookAhead = Math.floor(lookAheadBase + Math.random() * (1 - skill) * 4);
  const targetIdx = (currentIdx + lookAhead) % track.points.length;
  const target = track.points[targetIdx];

  const desiredAngle = Math.atan2(target.y - car.y, target.x - car.x);
  const diff = angleDiff(desiredAngle, car.angle);

  const turnJitter = (1 - skill) * 0.12;
  const effectiveDiff = diff + (Math.random() - 0.5) * turnJitter;
  const effectiveAbsDiff = Math.abs(effectiveDiff);

  input.up = true;

  const turnThreshold = 0.04 + (1 - skill) * 0.08;
  if (effectiveAbsDiff > turnThreshold) {
    if (effectiveDiff < 0) input.left = true;
    else input.right = true;
  }

  const brakeLevel1 = 0.25 + skill * 0.2;
  const brakeLevel2 = 0.5 + skill * 0.3;
  const speedLimit1 = 0.25 + skill * 0.2;
  const speedLimit2 = 0.5 + skill * 0.2;

  if (effectiveAbsDiff > brakeLevel2) {
    input.up = car.speed < car.maxSpeed * speedLimit1;
    if (skill < 0.4 && effectiveAbsDiff > 0.9 && car.speed > car.maxSpeed * 0.3) {
      input.down = true;
    }
  } else if (effectiveAbsDiff > brakeLevel1) {
    input.up = car.speed < car.maxSpeed * speedLimit2;
  }

  const driftThreshold = 0.18 + (1 - skill) * 0.25;
  const driftMinSpeed = 0.35 + (1 - skill) * 0.3;
  const minSkillForDrift = 0.35;
  if (effectiveAbsDiff > driftThreshold && car.speed > car.maxSpeed * driftMinSpeed && skill > minSkillForDrift) {
    input.shift = true;
  }

  if (skill < 0.3 && car.speed < car.maxSpeed * 0.15) {
    input.up = true;
  }

  car.aiTargetIdx = targetIdx;

  if (car.itemCooldown > 0) {
    car.itemCooldown -= dt;
  } else if (car.currentItem) {
    const itemUseChance = 0.002 + skill * 0.018;
    if (Math.random() < itemUseChance) {
      input.space = true;
      car.itemCooldown = 1500 + (1 - skill) * 2500;
    }
  }
  void normalizeAngle;

  return input;
};
