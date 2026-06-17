import type { Car, InputState, Track } from './types';
import { normalizeAngle, angleDiff, clamp } from '../utils/math';
import { nearestTrackIdxSameZ, getTrackLateralOffset } from './physics';

export const updateAI = (car: Car, track: Track, dt: number): InputState => {
  const input: InputState = {
    up: false, down: false, left: false, right: false, space: false, shift: false,
  };
  if (car.finished) return input;

  const lateralInfo = getTrackLateralOffset(car.x, car.y, track, car.z);
  const currentIdx = lateralInfo.nearestIdx;
  const lateralOffset = lateralInfo.offset;
  const skill = car.aiSkill;

  const lookAheadBase = 4 + skill * 10;
  const lookAhead = Math.floor(lookAheadBase + Math.random() * (1 - skill) * 4);
  const targetIdx = (currentIdx + lookAhead) % track.points.length;
  const target = track.points[targetIdx];

  const desiredAngle = Math.atan2(target.y - car.y, target.x - car.x);
  const diff = angleDiff(desiredAngle, car.angle);

  // 横向偏移修正：车辆偏离赛道中心时额外转向
  const halfWidth = track.width / 2;
  const lateralCorrectionStrength = 0.008 * (1 + (1 - skill) * 0.5);
  const lateralCorrection = -lateralOffset * lateralCorrectionStrength;

  // 低速时增加额外的修正力度（起步保护）
  const absSpeed = Math.abs(car.speed);
  const lowSpeedFactor = clamp(1 - absSpeed / (car.maxSpeed * 0.4), 0, 1);
  const lowSpeedBoost = 1 + lowSpeedFactor * 2.5;

  const totalDiff = diff + lateralCorrection * lowSpeedBoost;

  const turnJitter = (1 - skill) * 0.12;
  const effectiveDiff = totalDiff + (Math.random() - 0.5) * turnJitter;
  const effectiveAbsDiff = Math.abs(effectiveDiff);

  input.up = true;

  // 低速时降低转向阈值，使起步修正更灵敏
  const baseTurnThreshold = 0.04 + (1 - skill) * 0.08;
  const turnThreshold = baseTurnThreshold * (1 - lowSpeedFactor * 0.5);
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
  // 起步阶段不漂移
  if (effectiveAbsDiff > driftThreshold && car.speed > car.maxSpeed * driftMinSpeed && skill > minSkillForDrift && absSpeed > car.maxSpeed * 0.2) {
    input.shift = true;
  }

  if (skill < 0.3 && car.speed < car.maxSpeed * 0.15) {
    input.up = true;
  }

  // 严重偏离赛道时强制减速（防卡墙保护）
  if (Math.abs(lateralOffset) > halfWidth - 12 && absSpeed > car.maxSpeed * 0.3) {
    input.up = car.speed < car.maxSpeed * 0.4;
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
