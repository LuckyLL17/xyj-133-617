import type { Car, InputState, Track } from './types';
import { normalizeAngle, angleDiff } from '../utils/math';
import { nearestTrackIdxSameZ, nearestTrackDistSameZ } from './physics';

export const updateAI = (car: Car, track: Track, dt: number): InputState => {
  const input: InputState = {
    up: false, down: false, left: false, right: false, space: false, shift: false,
  };
  if (car.finished) return input;

  const currentIdx = nearestTrackIdxSameZ(car.x, car.y, track, car.z);
  const skill = car.aiSkill;

  // 获取车辆到赛道中心的距离，用于边缘检测
  const trackDistInfo = nearestTrackDistSameZ(car.x, car.y, track, car.z);
  const halfWidth = track.width / 2;
  const distFromCenter = trackDistInfo.dist;
  // 计算车辆相对于赛道中心的位置（正负表示在哪一侧）
  const nearestPt = track.points[trackDistInfo.nearestIdx];
  const nextPt = track.points[(trackDistInfo.nearestIdx + 1) % track.points.length];
  const dx = nextPt.x - nearestPt.x, dy = nextPt.y - nearestPt.y;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const toCarX = car.x - nearestPt.x, toCarY = car.y - nearestPt.y;
  const dot = toCarX * nx + toCarY * ny;
  const isOnRightSide = dot > 0;

  // 起步阶段判断：速度低于最大速度的25%时认为是起步阶段
  const isStartPhase = Math.abs(car.speed) < car.maxSpeed * 0.25;
  // 边缘警告阈值：距离边缘小于赛道宽度的15%时触发
  const edgeWarningThreshold = halfWidth * 0.85;
  const isNearEdge = distFromCenter > edgeWarningThreshold;

  const lookAheadBase = 4 + skill * 10;
  const lookAhead = Math.floor(lookAheadBase + Math.random() * (1 - skill) * 4);
  const targetIdx = (currentIdx + lookAhead) % track.points.length;
  const target = track.points[targetIdx];

  const desiredAngle = Math.atan2(target.y - car.y, target.x - car.x);
  let diff = angleDiff(desiredAngle, car.angle);

  // 边缘修正：当靠近赛道边缘时，强制向中心方向修正
  if (isNearEdge) {
    const edgeCorrectionStrength = 0.15 + (1 - skill) * 0.1;
    const edgeDistFactor = (distFromCenter - edgeWarningThreshold) / (halfWidth - edgeWarningThreshold);
    const correction = edgeCorrectionStrength * edgeDistFactor;
    if (isOnRightSide) {
      diff -= correction; // 向左转，回到中心
    } else {
      diff += correction; // 向右转，回到中心
    }
  }

  // 起步阶段减少转向抖动
  const baseTurnJitter = (1 - skill) * 0.12;
  const startPhaseJitterMultiplier = isStartPhase ? 0.2 : 1;
  const turnJitter = baseTurnJitter * startPhaseJitterMultiplier;
  const effectiveDiff = diff + (Math.random() - 0.5) * turnJitter;
  const effectiveAbsDiff = Math.abs(effectiveDiff);

  input.up = true;

  // 起步阶段转向阈值更高，优先保持直行
  const baseTurnThreshold = 0.04 + (1 - skill) * 0.08;
  const startPhaseThresholdMultiplier = isStartPhase ? 2.5 : 1;
  const turnThreshold = baseTurnThreshold * startPhaseThresholdMultiplier;
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
  if (!isStartPhase && effectiveAbsDiff > driftThreshold && car.speed > car.maxSpeed * driftMinSpeed && skill > minSkillForDrift) {
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
