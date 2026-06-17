import type {
  Car, ItemBoxInstance, BananaInstance, MissileInstance, ItemType, Particle, Track,
  MineInstance, LightningInstance,
} from './types';
import { pickRandom, dist, angleDiff, randRange } from '../utils/math';
import { nearestTrackDist, nearestTrackDistSameZ } from './physics';

const ITEM_TYPES: ItemType[] = ['boost', 'shield', 'banana', 'missile', 'mine', 'shrink', 'giant', 'lightning', 'ghost', 'magnet', 'hyperboost'];

export const randomItem = (): ItemType => pickRandom(ITEM_TYPES);

export const tryCollectItemBox = (
  car: Car,
  boxes: ItemBoxInstance[],
  track: Track,
): boolean => {
  if (car.currentItem) return false;
  const carZ = Math.round(car.z);
  for (const box of boxes) {
    if (box.collected) continue;
    const boxNearest = nearestTrackDist(box.x, box.y, track);
    const boxZ = Math.round(track.points[boxNearest.nearestIdx].z ?? 0);
    if (boxZ !== carZ) continue;
    if (boxNearest.dist >= track.width) continue;
    const collectRadius = car.hasMagnet ? 120 : 55;
    if (dist(car.x, car.y, box.x, box.y) < collectRadius) {
      box.collected = true;
      box.respawnTimer = 5000;
      car.currentItem = randomItem();
      return true;
    }
  }
  return false;
};

export const updateItemBoxes = (boxes: ItemBoxInstance[], dt: number) => {
  for (const box of boxes) {
    if (box.collected) {
      box.respawnTimer -= dt;
      if (box.respawnTimer <= 0) {
        box.collected = false;
      }
    }
  }
};

export const activateItem = (
  car: Car,
  allCars: Car[],
  bananas: BananaInstance[],
  missiles: MissileInstance[],
  particles: Particle[],
  mines: MineInstance[] = [],
  lightnings: LightningInstance[] = []
): ItemType | null => {
  const item = car.currentItem;
  if (!item) return null;
  car.currentItem = null;

  let backAngle: number;
  let target: Car | null;

  switch (item) {
    case 'boost':
      car.boostTime = 3000;
      for (let i = 0; i < 8; i++) {
        particles.push({
          x: car.x, y: car.y,
          vx: randRange(-1, 1), vy: randRange(-1, 1),
          life: 400, maxLife: 400, color: '#ffdd00', size: 3,
        });
      }
      break;
    case 'hyperboost':
      car.hyperBoostTime = 5000;
      car.boostTime = 5000;
      for (let i = 0; i < 16; i++) {
        particles.push({
          x: car.x, y: car.y,
          vx: randRange(-3, 3), vy: randRange(-3, 3),
          life: 600, maxLife: 600,
          color: i % 2 === 0 ? '#ff00ff' : '#00ffff', size: 4,
        });
      }
      break;
    case 'shield':
      car.hasShield = true;
      car.shieldTime = 8000;
      for (let i = 0; i < 10; i++) {
        const angle = (i / 10) * Math.PI * 2;
        particles.push({
          x: car.x + Math.cos(angle) * 20,
          y: car.y + Math.sin(angle) * 20,
          vx: Math.cos(angle) * 2,
          vy: Math.sin(angle) * 2,
          life: 400, maxLife: 400, color: '#33ccff', size: 3,
        });
      }
      break;
    case 'banana':
      backAngle = car.angle + Math.PI;
      bananas.push({
        x: car.x + Math.cos(backAngle) * 25,
        y: car.y + Math.sin(backAngle) * 25,
        angle: car.angle,
        active: true,
        ownerId: car.id,
      });
      break;
    case 'mine':
      backAngle = car.angle + Math.PI;
      mines.push({
        x: car.x + Math.cos(backAngle) * 30,
        y: car.y + Math.sin(backAngle) * 30,
        angle: car.angle,
        active: true,
        ownerId: car.id,
        armed: false,
        armTimer: 1500,
      });
      for (let i = 0; i < 6; i++) {
        particles.push({
          x: car.x + Math.cos(backAngle) * 30,
          y: car.y + Math.sin(backAngle) * 30,
          vx: randRange(-1, 1), vy: randRange(-1, 1),
          life: 300, maxLife: 300, color: '#ff4444', size: 3,
        });
      }
      break;
    case 'missile':
      target = findCarAhead(car, allCars);
      if (target) {
        missiles.push({
          x: car.x, y: car.y,
          angle: car.angle,
          speed: 8,
          targetId: target.id,
          active: true,
          ownerId: car.id,
          life: 4000,
        });
      }
      break;
    case 'shrink':
      car.scale = 0.5;
      car.scaleTime = 8000;
      for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI * 2;
        particles.push({
          x: car.x, y: car.y,
          vx: Math.cos(angle) * 3,
          vy: Math.sin(angle) * 3,
          life: 400, maxLife: 400, color: '#88ff88', size: 3,
        });
      }
      break;
    case 'giant':
      car.scale = 1.8;
      car.scaleTime = 8000;
      for (let i = 0; i < 16; i++) {
        const angle = (i / 16) * Math.PI * 2;
        particles.push({
          x: car.x, y: car.y,
          vx: Math.cos(angle) * 4,
          vy: Math.sin(angle) * 4,
          life: 500, maxLife: 500, color: '#ff8844', size: 4,
        });
      }
      break;
    case 'lightning':
      target = findLeaderCar(car, allCars);
      if (target && target.id !== car.id) {
        lightnings.push({
          targetId: target.id,
          active: true,
          ownerId: car.id,
          life: 1500,
          strikeProgress: 0,
        });
        for (let i = 0; i < 20; i++) {
          particles.push({
            x: car.x + randRange(-20, 20),
            y: car.y - 50 - randRange(0, 100),
            vx: randRange(-1, 1), vy: randRange(-2, 0),
            life: 600, maxLife: 600,
            color: i % 2 === 0 ? '#ffff00' : '#ffffff', size: 3,
          });
        }
      }
      break;
    case 'ghost':
      car.isGhost = true;
      car.ghostTime = 6000;
      for (let i = 0; i < 12; i++) {
        particles.push({
          x: car.x, y: car.y,
          vx: randRange(-2, 2), vy: randRange(-2, 2),
          life: 500, maxLife: 500, color: '#aa88ff', size: 3,
        });
      }
      break;
    case 'magnet':
      car.hasMagnet = true;
      car.magnetTime = 10000;
      for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI * 2;
        particles.push({
          x: car.x + Math.cos(angle) * 15,
          y: car.y + Math.sin(angle) * 15,
          vx: Math.cos(angle) * 1.5,
          vy: Math.sin(angle) * 1.5,
          life: 400, maxLife: 400, color: '#ff4488', size: 3,
        });
      }
      break;
  }
  return item;
};

const findCarAhead = (car: Car, allCars: Car[]): Car | null => {
  let best: Car | null = null;
  let bestScore = Infinity;
  for (const other of allCars) {
    if (other.id === car.id || other.finished) continue;
    const dx = other.x - car.x;
    const dy = other.y - car.y;
    const forward = Math.cos(car.angle) * dx + Math.sin(car.angle) * dy;
    if (forward > 0 && forward < 400) {
      const perp = Math.abs(-Math.sin(car.angle) * dx + Math.cos(car.angle) * dy);
      const score = forward + perp * 0.5;
      if (score < bestScore) {
        bestScore = score;
        best = other;
      }
    }
  }
  return best;
};

const findLeaderCar = (car: Car, allCars: Car[]): Car | null => {
  let best: Car | null = null;
  let bestProgress = -1;
  for (const other of allCars) {
    if (other.finished) continue;
    const progress = other.lap * 10000 + other.checkpoint;
    if (progress > bestProgress) {
      bestProgress = progress;
      best = other;
    }
  }
  return best;
};

export const updateBananas = (
  bananas: BananaInstance[],
  cars: Car[],
  particles: Particle[],
  track: Track,
  dt: number
) => {
  for (const b of bananas) {
    if (!b.active) continue;
    const bNearest = nearestTrackDist(b.x, b.y, track);
    const bZ = Math.round(track.points[bNearest.nearestIdx].z ?? 0);
    for (const car of cars) {
      if (car.id === b.ownerId) continue;
      if (car.isGhost) continue;
      if (Math.round(car.z) !== bZ) continue;
      const hitRadius = 22 * car.scale;
      if (dist(car.x, car.y, b.x, b.y) < hitRadius) {
        if (car.hasShield) {
          car.hasShield = false;
          car.shieldTime = 0;
          for (let i = 0; i < 6; i++) {
            particles.push({
              x: car.x, y: car.y, z: car.z,
              vx: randRange(-2, 2), vy: randRange(-2, 2),
              life: 300, maxLife: 300, color: '#33ccff', size: 3,
            });
          }
        } else {
          car.spinTime = 800;
          car.speed *= 0.4;
          for (let i = 0; i < 10; i++) {
            particles.push({
              x: car.x, y: car.y, z: car.z,
              vx: randRange(-3, 3), vy: randRange(-3, 3),
              life: 500, maxLife: 500, color: '#ffee33', size: 3,
            });
          }
        }
        b.active = false;
        break;
      }
    }
  }
  void dt;
};

export const updateMines = (
  mines: MineInstance[],
  cars: Car[],
  particles: Particle[],
  track: Track,
  dt: number
) => {
  for (const m of mines) {
    if (!m.active) continue;

    if (!m.armed) {
      m.armTimer -= dt;
      if (m.armTimer <= 0) {
        m.armed = true;
      }
      continue;
    }

    const mNearest = nearestTrackDist(m.x, m.y, track);
    const mZ = Math.round(track.points[mNearest.nearestIdx].z ?? 0);

    for (const car of cars) {
      if (car.id === m.ownerId) continue;
      if (car.isGhost) continue;
      if (Math.round(car.z) !== mZ) continue;
      const hitRadius = 28 * car.scale;
      if (dist(car.x, car.y, m.x, m.y) < hitRadius) {
        if (car.hasShield) {
          car.hasShield = false;
          car.shieldTime = 0;
          for (let i = 0; i < 10; i++) {
            particles.push({
              x: car.x, y: car.y, z: car.z,
              vx: randRange(-3, 3), vy: randRange(-3, 3),
              life: 400, maxLife: 400, color: '#33ccff', size: 3,
            });
          }
        } else {
          car.spinTime = 1500;
          car.speed *= 0.2;
          const angle = Math.atan2(car.y - m.y, car.x - m.x);
          car.x += Math.cos(angle) * 20;
          car.y += Math.sin(angle) * 20;
          for (let i = 0; i < 24; i++) {
            const pAngle = (i / 24) * Math.PI * 2;
            particles.push({
              x: m.x, y: m.y, z: car.z,
              vx: Math.cos(pAngle) * randRange(2, 6),
              vy: Math.sin(pAngle) * randRange(2, 6),
              life: 600, maxLife: 600,
              color: i % 3 === 0 ? '#ff4400' : i % 3 === 1 ? '#ffaa00' : '#ffff00',
              size: 5,
            });
          }
        }
        m.active = false;
        break;
      }
    }
  }
};

export const updateLightnings = (
  lightnings: LightningInstance[],
  cars: Car[],
  particles: Particle[],
  dt: number
) => {
  for (const l of lightnings) {
    if (!l.active) continue;
    l.life -= dt;
    l.strikeProgress = Math.min(1, l.strikeProgress + dt / 300);

    if (l.strikeProgress >= 0.3 && l.strikeProgress < 0.3 + dt / 300) {
      const target = cars.find((c) => c.id === l.targetId);
      if (target && !target.finished) {
        if (target.hasShield) {
          target.hasShield = false;
          target.shieldTime = 0;
          for (let i = 0; i < 12; i++) {
            particles.push({
              x: target.x, y: target.y,
              vx: randRange(-3, 3), vy: randRange(-3, 3),
              life: 400, maxLife: 400, color: '#33ccff', size: 3,
            });
          }
        } else {
          target.spinTime = 1200;
          target.speed *= 0.25;
          for (let i = 0; i < 30; i++) {
            particles.push({
              x: target.x + randRange(-30, 30),
              y: target.y + randRange(-30, 30),
              vx: randRange(-4, 4), vy: randRange(-4, 4),
              life: 500, maxLife: 500,
              color: i % 2 === 0 ? '#ffff00' : '#ffffff', size: 4,
            });
          }
        }
      }
    }

    if (l.life <= 0) {
      l.active = false;
    }
  }
};

export const updateMissiles = (
  missiles: MissileInstance[],
  cars: Car[],
  particles: Particle[],
  dt: number
) => {
  for (const m of missiles) {
    if (!m.active) continue;
    m.life -= dt;
    if (m.life <= 0) { m.active = false; continue; }

    const target = cars.find((c) => c.id === m.targetId && !c.finished);
    if (target) {
      const desired = Math.atan2(target.y - m.y, target.x - m.x);
      const diff = angleDiff(desired, m.angle);
      m.angle += Math.max(-0.1, Math.min(0.1, diff));
    }

    m.x += Math.cos(m.angle) * m.speed;
    m.y += Math.sin(m.angle) * m.speed;

    particles.push({
      x: m.x - Math.cos(m.angle) * 6,
      y: m.y - Math.sin(m.angle) * 6,
      vx: randRange(-0.3, 0.3), vy: randRange(-0.3, 0.3),
      life: 200, maxLife: 200, color: '#ff6600', size: 2,
    });

    for (const car of cars) {
      if (car.id === m.ownerId) continue;
      if (car.isGhost) continue;
      const hitRadius = 22 * car.scale;
      if (dist(car.x, car.y, m.x, m.y) < hitRadius) {
        spawnMissileExplosion(m.x, m.y, car.z, particles);
        if (car.hasShield) {
          car.hasShield = false;
          car.shieldTime = 0;
          for (let i = 0; i < 8; i++) {
            particles.push({
              x: car.x, y: car.y,
              vx: randRange(-2, 2), vy: randRange(-2, 2),
              life: 400, maxLife: 400, color: '#33ccff', size: 3,
            });
          }
        } else {
          car.spinTime = 1200;
          car.speed *= 0.3;
        }
        m.active = false;
        break;
      }
    }
  }
};

export const updateParticles = (particles: Particle[], dt: number) => {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= dt;
    if (p.life <= 0) {
      particles.splice(i, 1);
      continue;
    }
    p.x += p.vx;
    p.y += p.vy;
    if (p.gravity) {
      p.vy += p.gravity;
    }
    p.vx *= 0.96;
    p.vy *= 0.96;
    if (p.rotationSpeed) {
      p.rotation = (p.rotation || 0) + p.rotationSpeed;
    }
    if (p.shrink) {
      const t = p.life / p.maxLife;
      p.size = p.size * Math.max(0.1, t);
    }
  }
};

export const updateCarItemEffects = (car: Car, particles: Particle[], dt: number) => {
  if (car.scaleTime > 0) {
    car.scaleTime -= dt;
    if (car.scaleTime <= 0) {
      car.scale = 1;
      for (let i = 0; i < 8; i++) {
        particles.push({
          x: car.x, y: car.y,
          vx: randRange(-2, 2), vy: randRange(-2, 2),
          life: 300, maxLife: 300, color: '#ffffff', size: 3,
        });
      }
    }
  }

  if (car.ghostTime > 0) {
    car.ghostTime -= dt;
    if (car.ghostTime <= 0) {
      car.isGhost = false;
    }
  }

  if (car.magnetTime > 0) {
    car.magnetTime -= dt;
    if (car.magnetTime <= 0) {
      car.hasMagnet = false;
    }
  }

  if (car.hyperBoostTime > 0) {
    car.hyperBoostTime -= dt;
  }
};

export const createItemBoxes = (track: Track): ItemBoxInstance[] => {
  return track.itemBoxes.map((idx, i) => ({
    idx: i,
    x: track.points[idx].x,
    y: track.points[idx].y,
    collected: false,
    respawnTimer: 0,
  }));
};

export const spawnBoostFlame = (car: Car, particles: Particle[], intensity: number = 1) => {
  const back = car.angle + Math.PI;
  const count = Math.floor(3 * intensity);
  for (let i = 0; i < count; i++) {
    const spread = (Math.random() - 0.5) * 0.4;
    const angle = back + spread;
    const speed = 2 + Math.random() * 2 * intensity;
    particles.push({
      x: car.x + Math.cos(back) * 14 + (Math.random() - 0.5) * 6,
      y: car.y + Math.sin(back) * 14 + (Math.random() - 0.5) * 6,
      z: car.z,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 250 + Math.random() * 200,
      maxLife: 450,
      color: Math.random() < 0.5 ? '#ff8800' : '#ffcc00',
      colorEnd: '#ff2200',
      size: 3 + Math.random() * 3,
      shape: 'smoke',
      shrink: true,
      glow: true,
    });
  }
};

export const spawnAccelTrail = (car: Car, particles: Particle[]) => {
  if (car.speed < car.maxSpeed * 0.3) return;
  const speedFactor = Math.abs(car.speed) / car.maxSpeed;
  if (Math.random() > speedFactor * 0.8) return;
  const back = car.angle + Math.PI;
  for (const side of [-1, 1]) {
    const px = car.x + Math.cos(back) * 12 + Math.cos(back + Math.PI / 2) * side * 6;
    const py = car.y + Math.sin(back) * 12 + Math.sin(back + Math.PI / 2) * side * 6;
    particles.push({
      x: px,
      y: py,
      z: car.z,
      vx: Math.cos(back) * 0.5 + (Math.random() - 0.5) * 0.3,
      vy: Math.sin(back) * 0.5 + (Math.random() - 0.5) * 0.3,
      life: 200 + Math.random() * 150,
      maxLife: 350,
      color: car.hyperBoostTime > 0 ? (Math.random() < 0.5 ? '#ff00ff' : '#00ffff') :
             car.boostTime > 0 ? (Math.random() < 0.5 ? '#ff8800' : '#ffcc00') :
             '#888888',
      size: 2 + Math.random() * 2,
      shape: 'smoke',
      shrink: true,
    });
  }
};

export const spawnCollisionSparks = (x: number, y: number, z: number, particles: Particle[], intensity: number = 1) => {
  const count = Math.floor(12 * intensity);
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 2 + Math.random() * 4 * intensity;
    particles.push({
      x, y, z,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 200 + Math.random() * 200,
      maxLife: 400,
      color: Math.random() < 0.5 ? '#ffff00' : '#ffaa00',
      size: 2 + Math.random() * 2,
      shape: 'spark',
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.3,
      glow: true,
    });
  }
  for (let i = 0; i < Math.floor(4 * intensity); i++) {
    particles.push({
      x: x + (Math.random() - 0.5) * 10,
      y: y + (Math.random() - 0.5) * 10,
      z,
      vx: (Math.random() - 0.5) * 1,
      vy: (Math.random() - 0.5) * 1,
      life: 300 + Math.random() * 200,
      maxLife: 500,
      color: '#666666',
      size: 3 + Math.random() * 3,
      shape: 'smoke',
      shrink: true,
    });
  }
};

export const spawnMissileExplosion = (x: number, y: number, z: number, particles: Particle[]) => {
  for (let i = 0; i < 30; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 3 + Math.random() * 6;
    particles.push({
      x, y, z,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 400 + Math.random() * 300,
      maxLife: 700,
      color: ['#ff4400', '#ff8800', '#ffcc00', '#ffff00'][Math.floor(Math.random() * 4)],
      size: 4 + Math.random() * 4,
      shape: 'spark',
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.4,
      glow: true,
    });
  }
  for (let i = 0; i < 15; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1 + Math.random() * 3;
    particles.push({
      x, y, z,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 500 + Math.random() * 400,
      maxLife: 900,
      color: '#444444',
      size: 6 + Math.random() * 6,
      shape: 'smoke',
      shrink: true,
      gravity: 0.05,
    });
  }
  for (let r = 0; r < 3; r++) {
    const ringRadius = 15 + r * 10;
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      particles.push({
        x: x + Math.cos(angle) * ringRadius * 0.3,
        y: y + Math.sin(angle) * ringRadius * 0.3,
        z,
        vx: Math.cos(angle) * 2,
        vy: Math.sin(angle) * 2,
        life: 200 + r * 100,
        maxLife: 500,
        color: r === 0 ? '#ffff00' : r === 1 ? '#ff8800' : '#ff4400',
        size: 3,
        shape: 'ring',
        glow: true,
      });
    }
  }
};

export const spawnNitroBurst = (car: Car, particles: Particle[], isHyper: boolean = false) => {
  const colors = isHyper
    ? ['#ff00ff', '#00ffff', '#ffffff', '#ffff00']
    : ['#ffcc00', '#ff8800', '#ffffff', '#ff4400'];
  for (let i = 0; i < (isHyper ? 24 : 16); i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 2 + Math.random() * 5;
    particles.push({
      x: car.x, y: car.y, z: car.z,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 300 + Math.random() * 200,
      maxLife: 500,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: 3 + Math.random() * 3,
      shape: 'spark',
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.3,
      glow: true,
    });
  }
  for (let ring = 0; ring < (isHyper ? 3 : 2); ring++) {
    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2;
      const dist = 10 + ring * 12;
      particles.push({
        x: car.x + Math.cos(angle) * dist * 0.5,
        y: car.y + Math.sin(angle) * dist * 0.5,
        z: car.z,
        vx: Math.cos(angle) * 2.5,
        vy: Math.sin(angle) * 2.5,
        life: 150 + ring * 100,
        maxLife: 350,
        color: isHyper ? (ring % 2 === 0 ? '#ff00ff' : '#00ffff') : (ring % 2 === 0 ? '#ffcc00' : '#ff8800'),
        size: 4 - ring,
        shape: 'ring',
        glow: true,
      });
    }
  }
  const back = car.angle + Math.PI;
  for (let i = 0; i < (isHyper ? 12 : 8); i++) {
    particles.push({
      x: car.x + Math.cos(back) * 16,
      y: car.y + Math.sin(back) * 16,
      z: car.z,
      vx: Math.cos(back) * (3 + Math.random() * 3) + (Math.random() - 0.5) * 1,
      vy: Math.sin(back) * (3 + Math.random() * 3) + (Math.random() - 0.5) * 1,
      life: 400 + Math.random() * 200,
      maxLife: 600,
      color: isHyper ? (Math.random() < 0.5 ? '#ff00ff' : '#00ffff') : (Math.random() < 0.5 ? '#ff8800' : '#ffcc00'),
      size: 5 + Math.random() * 3,
      shape: 'smoke',
      shrink: true,
      glow: true,
    });
  }
};

export const spawnFinishLineEffect = (car: Car, particles: Particle[]) => {
  for (let i = 0; i < 40; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 2 + Math.random() * 5;
    const colorIdx = Math.floor(Math.random() * 7);
    const rainbowColors = ['#ff0000', '#ff8800', '#ffff00', '#00ff00', '#00ffff', '#0088ff', '#ff00ff'];
    particles.push({
      x: car.x, y: car.y, z: car.z,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 1,
      life: 600 + Math.random() * 400,
      maxLife: 1000,
      color: rainbowColors[colorIdx],
      size: 3 + Math.random() * 3,
      shape: 'star',
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.2,
      gravity: 0.08,
      glow: true,
    });
  }
  for (let ring = 0; ring < 4; ring++) {
    for (let i = 0; i < 20; i++) {
      const angle = (i / 20) * Math.PI * 2;
      const dist = 15 + ring * 15;
      particles.push({
        x: car.x + Math.cos(angle) * dist * 0.3,
        y: car.y + Math.sin(angle) * dist * 0.3,
        z: car.z,
        vx: Math.cos(angle) * 3,
        vy: Math.sin(angle) * 3,
        life: 200 + ring * 120,
        maxLife: 680,
        color: ['#ffffff', '#ffff00', '#ff8800', '#ff00ff'][ring % 4],
        size: 4,
        shape: 'ring',
        glow: true,
      });
    }
  }
  for (let i = 0; i < 12; i++) {
    particles.push({
      x: car.x + (Math.random() - 0.5) * 20,
      y: car.y - 20 - Math.random() * 30,
      z: car.z,
      vx: (Math.random() - 0.5) * 1,
      vy: -1 - Math.random() * 2,
      life: 800 + Math.random() * 400,
      maxLife: 1200,
      color: ['#ffff00', '#ff8800', '#ffffff'][Math.floor(Math.random() * 3)],
      size: 4,
      shape: 'star',
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.15,
      gravity: 0.03,
      glow: true,
    });
  }
};

export const spawnDriftMarks = (car: Car, particles: Particle[]) => {
  if (!car.drifting) return;
  if (Math.random() > 0.5) return;
  const back = car.angle + Math.PI;
  for (const side of [-1, 1]) {
    const px = car.x + Math.cos(back) * 14 + Math.cos(back + Math.PI / 2) * side * 7;
    const py = car.y + Math.sin(back) * 14 + Math.sin(back + Math.PI / 2) * side * 7;
    particles.push({
      x: px, y: py, z: car.z,
      vx: (Math.random() - 0.5) * 0.2,
      vy: (Math.random() - 0.5) * 0.2,
      life: 400, maxLife: 400,
      color: car.hyperBoostTime > 0 ? (Math.random() < 0.5 ? '#ff00ff' : '#00ffff') :
             car.boostTime > 0 ? (Math.random() < 0.5 ? '#ff6600' : '#ffaa00') :
             '#888888',
      size: 3 + Math.random() * 2,
      shape: 'smoke',
      shrink: true,
    });
  }
};
