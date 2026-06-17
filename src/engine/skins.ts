import type { CarSkin } from './types';

export const CAR_SKINS: CarSkin[] = [
  {
    id: 'gold_champion',
    name: '黄金冠军',
    price: 500,
    bodyColor: '#ffd700',
    stripeColor: '#ffffff',
    stripePattern: 'double',
    stripeEnabled: true,
    wheelColor: '#333333',
    description: '冠军专属的黄金涂装，闪耀全场',
    limited: true,
  },
  {
    id: 'neon_rainbow',
    name: '霓虹彩虹',
    price: 800,
    bodyColor: '#ff00ff',
    stripeColor: '#00ffff',
    stripePattern: 'flame',
    stripeEnabled: true,
    wheelColor: '#222222',
    description: '赛博朋克风格的霓虹彩虹涂装',
    limited: true,
  },
  {
    id: 'stealth_black',
    name: '暗夜潜行',
    price: 600,
    bodyColor: '#1a1a1a',
    stripeColor: '#ff3366',
    stripePattern: 'single',
    stripeEnabled: true,
    wheelColor: '#0a0a0a',
    description: '全黑哑光涂装，低调而致命',
    limited: true,
  },
  {
    id: 'sunset_orange',
    name: '日落橙光',
    price: 400,
    bodyColor: '#ff6633',
    stripeColor: '#ffcc00',
    stripePattern: 'checker',
    stripeEnabled: true,
    wheelColor: '#221100',
    description: '温暖的日落渐变涂装',
    limited: false,
  },
  {
    id: 'ocean_deep',
    name: '深海蓝影',
    price: 450,
    bodyColor: '#0066aa',
    stripeColor: '#00ffcc',
    stripePattern: 'double',
    stripeEnabled: true,
    wheelColor: '#002244',
    description: '深海风格的蓝色涂装',
    limited: false,
  },
  {
    id: 'forest_nature',
    name: '森林之绿',
    price: 350,
    bodyColor: '#228833',
    stripeColor: '#aaff44',
    stripePattern: 'single',
    stripeEnabled: true,
    wheelColor: '#114411',
    description: '自然森林风格涂装',
    limited: false,
  },
  {
    id: 'retro_cream',
    name: '复古奶黄',
    price: 300,
    bodyColor: '#ffeecc',
    stripeColor: '#884422',
    stripePattern: 'double',
    stripeEnabled: true,
    wheelColor: '#443322',
    description: '经典复古的奶黄色涂装',
    limited: false,
  },
  {
    id: 'candy_pink',
    name: '糖果粉',
    price: 380,
    bodyColor: '#ff88cc',
    stripeColor: '#ffffff',
    stripePattern: 'flame',
    stripeEnabled: true,
    wheelColor: '#aa4477',
    description: '甜美可爱的糖果粉涂装',
    limited: false,
  },
];

export const getCarSkin = (id: string): CarSkin | undefined => {
  return CAR_SKINS.find((s) => s.id === id);
};

export const UPGRADE_COSTS = [100, 200, 350, 550, 800];
export const MAX_UPGRADE_LEVEL = 5;
export const UPGRADE_BONUS = {
  speed: 0.1,
  acceleration: 0.08,
  handling: 0.06,
  friction: 0.02,
};

export const calcUpgradeCost = (level: number): number => {
  return UPGRADE_COSTS[Math.min(level, UPGRADE_COSTS.length - 1)];
};

export const calcRaceReward = (rank: number, gameMode: string): number => {
  const baseRewards: Record<number, number> = {
    1: 200,
    2: 120,
    3: 80,
    4: 40,
  };
  let reward = baseRewards[rank] || 20;
  if (gameMode === 'drift') reward = Math.floor(reward * 0.8);
  if (gameMode === 'timeattack') reward = Math.floor(reward * 0.6);
  return reward;
};
