import type { Car, InputState, Track } from './types';
import { normalizeAngle, angleDiff, pointToSegmentDist } from '../utils/math';
import { nearestTrackDistSameZ } from './physics';

export const updateAI = (car: Car, track: Track, dt: number): InputState => {
  const input: InputState = {
    up: false, down: false, left: false, right: false, space: false, shift: false,
  };
  if (car.finished) return input;

  const nearestInfo = nearestTrackDistSameZ(car.x, car.y, track, car.z);
  const currentIdx = nearestInfo.nearestIdx;
  const distToCenter = nearestInfo.dist;
  const skill = car.aiSkill;

  const lookAheadBase = 4 + skill * 10;
  const lookAhead = Math.floor(lookAheadBase + Math.random() * (1 - skill) * 4);
  const targetIdx = (currentIdx + lookAhead) % track.points.length;
  const target = track.points[targetIdx];

  let desiredAngle = Math.atan2(target.y - car.y, target.x - car.x);
  let diff = angleDiff(desiredAngle, car.angle);

  // 边缘避让：计算车辆相对于赛道中心的偏移方向
  const halfWidth = track.width / 2;
  const edgeSafeZone = halfWidth * 0.5; // 赛道中心 50% 区域为安全区

  if (distToCenter > edgeSafeZone) {
    // 获取最近赛道段的方向
    const p1 = track.points[currentIdx];
    const p2 = track.points[(currentIdx + 1) % track.points.length];
    const { t: segT } = pointToSegmentDist(car.x, car.y, p1.x, p1.y, p2.x, p2.y);
    const closestX = p1.x + segT * (p2.x - p1.x);
    const closestY = p1.y + segT * (p2.y - p1.y);

    // 赛道切线方向
    const segDx = p2.x - p1.x;
    const segDy = p2.y - p1.y;
    const segLen = Math.sqrt(segDx * segDx + segDy * segDy) || 1;
    const tx = segDx / segLen;
    const ty = segDy / segLen;
    const nx = -ty; // 法线方向
    const ny = tx;

    // 判断车辆在赛道的哪一侧
    const toCarX = car.x - closestX;
    const toCarY = car.y - closestY;
    const sideDot = toCarX * nx + toCarY * ny;
    const side = sideDot >= 0 ? 1 : -1;

    // 计算边缘避让的强度（越靠近边缘，避让越强）
    const overshoot = distToCenter - edgeSafeZone;
    const maxOvershoot = halfWidth - edgeSafeZone;
    const avoidStrength = Math.min(overshoot / maxOvershoot, 1) * (0.3 + skill * 0.3);

    // 避让角度：指向赛道中心的方向（法线反方向）
    const avoidAngle = Math.atan2(-ny * side, -nx * side);
    const avoidDiff = angleDiff(avoidAngle, car.angle);

    // 混合路径跟踪和边缘避让
    const blendFactor = avoidStrength;
    diff = diff * (1 - blendFactor) + avoidDiff * blendFactor;
  }

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
