import type { CarTemplate } from './types';

export const CAR_TEMPLATES: CarTemplate[] = [
  {
    id: 0,
    name: 'FLASH',
    color: '#ff3366',
    colorDark: '#aa1144',
    maxSpeed: 5.2,
    acceleration: 0.14,
    handling: 0.055,
    friction: 0.985,
  },
  {
    id: 1,
    name: 'BOLT',
    color: '#ffdd00',
    colorDark: '#bbaa00',
    maxSpeed: 4.8,
    acceleration: 0.18,
    handling: 0.06,
    friction: 0.98,
  },
  {
    id: 2,
    name: 'SKY',
    color: '#33ccff',
    colorDark: '#1188bb',
    maxSpeed: 5.0,
    acceleration: 0.15,
    handling: 0.065,
    friction: 0.982,
  },
  {
    id: 3,
    name: 'LEAF',
    color: '#00ff88',
    colorDark: '#00aa55',
    maxSpeed: 4.6,
    acceleration: 0.16,
    handling: 0.07,
    friction: 0.978,
  },
];

export const getCarTemplate = (id: number): CarTemplate => {
  return CAR_TEMPLATES[id % CAR_TEMPLATES.length];
};
