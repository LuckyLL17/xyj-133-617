import type {
  Car, Track, TireMark, Particle, ItemBoxInstance,
  BananaInstance, MissileInstance, Camera, ItemType,
  WeatherType, TimeOfDay, EnvConfig, Obstacle, WackyState,
  MineInstance, LightningInstance,
} from './types';
import { obstacleHitFlash } from './obstacles';
import { lerp } from '../utils/math';

const GRASS_COLOR = '#1a4a2a';
const GRASS_DARK = '#144022';
const ROAD_COLOR = '#3a3a4a';
const ROAD_DARK = '#2e2e3e';
const ROAD_LIGHT = '#4a4a5a';
const CURB_RED = '#cc3344';
const CURB_WHITE = '#eeeeee';
const BOOST_COLOR = '#ffcc00';
const BOOST_GLOW = '#ffee55';

interface WeatherParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  type: 'rain' | 'snow';
  life: number;
  maxLife: number;
}

const TIME_LIGHTING: Record<TimeOfDay, {
  skyTint: string;
  colorMul: [number, number, number];
  ambientAlpha: number;
  contrast: number;
  headlightAlpha: number;
  vignetteMul: number;
  scanlineMul: number;
}> = {
  day: {
    skyTint: 'rgba(135,206,235,0.0)',
    colorMul: [1, 1, 1],
    ambientAlpha: 0,
    contrast: 1,
    headlightAlpha: 0,
    vignetteMul: 1,
    scanlineMul: 1,
  },
  dawn: {
    skyTint: 'rgba(255,180,120,0.15)',
    colorMul: [1.1, 0.95, 0.85],
    ambientAlpha: 0.08,
    contrast: 0.95,
    headlightAlpha: 0.15,
    vignetteMul: 1.1,
    scanlineMul: 1,
  },
  sunset: {
    skyTint: 'rgba(255,120,60,0.2)',
    colorMul: [1.15, 0.85, 0.7],
    ambientAlpha: 0.12,
    contrast: 0.9,
    headlightAlpha: 0.3,
    vignetteMul: 1.2,
    scanlineMul: 1.1,
  },
  night: {
    skyTint: 'rgba(20,20,60,0.45)',
    colorMul: [0.6, 0.65, 0.85],
    ambientAlpha: 0.35,
    contrast: 0.8,
    headlightAlpha: 1,
    vignetteMul: 1.6,
    scanlineMul: 1.5,
  },
};

const WEATHER_VISUAL: Record<WeatherType, {
  roadWetAlpha: number;
  grassDarken: number;
  fogAlpha: number;
  particlesPerFrame: number;
  windX: number;
}> = {
  clear: {
    roadWetAlpha: 0,
    grassDarken: 0,
    fogAlpha: 0,
    particlesPerFrame: 0,
    windX: 0,
  },
  rain: {
    roadWetAlpha: 0.3,
    grassDarken: 0.15,
    fogAlpha: 0.08,
    particlesPerFrame: 3,
    windX: 0.3,
  },
  snow: {
    roadWetAlpha: 0.5,
    grassDarken: -0.4,
    fogAlpha: 0.12,
    particlesPerFrame: 2,
    windX: 0.1,
  },
  fog: {
    roadWetAlpha: 0.05,
    grassDarken: 0.05,
    fogAlpha: 0.35,
    particlesPerFrame: 0,
    windX: 0,
  },
};

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private w: number;
  private h: number;
  private viewportW: number;
  private viewportH: number;
  private weatherParticles: WeatherParticle[] = [];
  private env: EnvConfig = { weather: 'clear', timeOfDay: 'day' };

  constructor(ctx: CanvasRenderingContext2D, w: number, h: number) {
    this.ctx = ctx;
    this.w = w;
    this.h = h;
    this.viewportW = w;
    this.viewportH = h;
  }

  setEnv(env: EnvConfig) {
    this.env = { ...env };
  }

  resize(w: number, h: number) {
    this.w = w;
    this.h = h;
    this.viewportW = w;
    this.viewportH = h;
  }

  setViewport(vp: { x: number; y: number; width: number; height: number }) {
    this.viewportW = vp.width;
    this.viewportH = vp.height;
    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.rect(vp.x, vp.y, vp.width, vp.height);
    this.ctx.clip();
    this.ctx.translate(vp.x, vp.y);
  }

  restoreViewport() {
    this.ctx.restore();
    this.viewportW = this.w;
    this.viewportH = this.h;
  }

  private hexToRgb(hex: string): [number, number, number] {
    const h = hex.replace('#', '');
    return [
      parseInt(h.substring(0, 2), 16),
      parseInt(h.substring(2, 4), 16),
      parseInt(h.substring(4, 6), 16),
    ];
  }

  private rgbToHex(r: number, g: number, b: number): string {
    const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
    return `rgb(${clamp(r)},${clamp(g)},${clamp(b)})`;
  }

  private applyColorMul(hex: string, mul: [number, number, number]): string {
    const [r, g, b] = this.hexToRgb(hex);
    return this.rgbToHex(r * mul[0], g * mul[1], b * mul[2]);
  }

  private darkenColor(hex: string, amount: number = 0.35): string {
    const [r, g, b] = this.hexToRgb(hex);
    const d = (v: number) => Math.max(0, Math.round(v * (1 - amount)));
    return `#${d(r).toString(16).padStart(2, '0')}${d(g).toString(16).padStart(2, '0')}${d(b).toString(16).padStart(2, '0')}`;
  }

  updateWeather(dt: number, camera: Camera) {
    const wv = WEATHER_VISUAL[this.env.weather];
    const tl = TIME_LIGHTING[this.env.timeOfDay];
    if (wv.particlesPerFrame > 0) {
      for (let i = 0; i < wv.particlesPerFrame; i++) {
        const viewRangeX = this.viewportW / camera.zoom + 200;
        const viewRangeY = this.viewportH / camera.zoom + 200;
        const type: 'rain' | 'snow' = this.env.weather === 'snow' ? 'snow' : 'rain';
        this.weatherParticles.push({
          x: camera.x + (Math.random() - 0.5) * viewRangeX,
          y: camera.y + (Math.random() - 0.5) * viewRangeY - viewRangeY * 0.5,
          vx: wv.windX * (type === 'rain' ? 8 : 2),
          vy: type === 'rain' ? 18 + Math.random() * 10 : 1 + Math.random() * 1.5,
          size: type === 'rain' ? 8 + Math.random() * 6 : 2 + Math.random() * 3,
          type,
          life: 0,
          maxLife: type === 'rain' ? 600 : 2000,
        });
      }
    }
    void tl;
    for (let i = this.weatherParticles.length - 1; i >= 0; i--) {
      const p = this.weatherParticles[i];
      p.life += dt;
      p.x += p.vx * dt / 16;
      p.y += p.vy * dt / 16;
      if (p.life > p.maxLife) this.weatherParticles.splice(i, 1);
    }
    if (this.weatherParticles.length > 800) {
      this.weatherParticles.splice(0, this.weatherParticles.length - 800);
    }
  }

  clear() {
    const ctx = this.ctx;
    const timeLight = TIME_LIGHTING[this.env.timeOfDay];
    const weatherVis = WEATHER_VISUAL[this.env.weather];
    const [r, g, b] = this.hexToRgb(GRASS_COLOR);
    const darken = weatherVis.grassDarken * 255;
    const baseColor = this.rgbToHex(
      (r + darken) * timeLight.colorMul[0],
      (g + darken) * timeLight.colorMul[1],
      (b + darken) * timeLight.colorMul[2],
    );
    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, this.w, this.h);
  }

  clearViewport() {
    const ctx = this.ctx;
    const timeLight = TIME_LIGHTING[this.env.timeOfDay];
    const weatherVis = WEATHER_VISUAL[this.env.weather];
    const [r, g, b] = this.hexToRgb(GRASS_COLOR);
    const darken = weatherVis.grassDarken * 255;
    const baseColor = this.rgbToHex(
      (r + darken) * timeLight.colorMul[0],
      (g + darken) * timeLight.colorMul[1],
      (b + darken) * timeLight.colorMul[2],
    );
    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, this.viewportW, this.viewportH);
  }

  drawSplitDivider(layout: 'horizontal' | 'vertical') {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = '#000000';
    if (layout === 'horizontal') {
      ctx.fillRect(0, this.h / 2 - 2, this.w, 4);
    } else {
      ctx.fillRect(this.w / 2 - 2, 0, 4, this.h);
    }
    ctx.restore();
  }

  drawPlayerIndicator(x: number, y: number, playerIdx: 0 | 1) {
    const ctx = this.ctx;
    ctx.save();
    const color = playerIdx === 0 ? '#00ff88' : '#ff3366';
    const label = `P${playerIdx + 1}`;
    
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(x, y, 60, 24);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, 60, 24);
    ctx.fillStyle = color;
    ctx.font = 'bold 12px "Press Start 2P", "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x + 30, y + 12);
    ctx.restore();
  }

  beginCamera(cam: Camera) {
    const ctx = this.ctx;
    ctx.save();
    const shakeX = cam.shake > 0 ? (Math.random() - 0.5) * cam.shake : 0;
    const shakeY = cam.shake > 0 ? (Math.random() - 0.5) * cam.shake : 0;
    ctx.translate(this.viewportW / 2 + shakeX, this.viewportH / 2 + shakeY);
    ctx.scale(cam.zoom, cam.zoom);
    ctx.translate(-cam.x, -cam.y);
  }

  endCamera() {
    this.ctx.restore();
  }

  drawGrassTexture(track: Track) {
    const ctx = this.ctx;
    const spacing = 64;
    const minX = -500, maxX = 2500, minY = -500, maxY = 2100;
    for (let x = minX; x < maxX; x += spacing) {
      for (let y = minY; y < maxY; y += spacing) {
        const c = (Math.floor(x / spacing) + Math.floor(y / spacing)) % 2 === 0
          ? GRASS_COLOR : GRASS_DARK;
        ctx.fillStyle = c;
        ctx.fillRect(x, y, spacing, spacing);
      }
    }
    for (let i = 0; i < 80; i++) {
      const seed = i * 9301 + 49297;
      const tx = minX + ((seed * 233) % (maxX - minX));
      const ty = minY + ((seed * 337) % (maxY - minY));
      const pts = track.points;
      let tooClose = false;
      for (let j = 0; j < pts.length; j += 5) {
        const dx = pts[j].x - tx, dy = pts[j].y - ty;
        if (dx * dx + dy * dy < (track.width / 2 + 80) ** 2) { tooClose = true; break; }
      }
      if (tooClose) continue;
      this.drawPixelTree(tx, ty);
    }
  }

  private drawPixelTree(x: number, y: number) {
    const ctx = this.ctx;
    ctx.fillStyle = '#4a2810';
    ctx.fillRect(x - 2, y, 4, 10);
    ctx.fillStyle = '#0a5a20';
    ctx.fillRect(x - 8, y - 14, 16, 14);
    ctx.fillStyle = '#0a7028';
    ctx.fillRect(x - 6, y - 18, 12, 6);
    ctx.fillStyle = '#1a8038';
    ctx.fillRect(x - 4, y - 12, 3, 4);
  }

  drawTrack(track: Track, time: number, targetZ: number | null = null) {
    const ctx = this.ctx;
    const pts = track.points;
    const hw = track.width / 2;

    const getZ = (i: number): number => pts[i % pts.length].z ?? 0;
    const matchZ = (z: number): boolean => targetZ === null || Math.round(z) === targetZ;
    const zOffsetY = (z: number): number => z * 24;

    const fillSegments: number[][] = [];
    let currentSegment: number[] | null = null;

    for (let i = 0; i <= pts.length; i++) {
      const z = getZ(i);
      if (matchZ(z)) {
        if (!currentSegment) currentSegment = [];
        currentSegment.push(i % pts.length);
      } else if (currentSegment) {
        fillSegments.push(currentSegment);
        currentSegment = null;
      }
    }
    if (currentSegment && currentSegment.length > 0) {
      fillSegments.push(currentSegment);
    }

    for (const seg of fillSegments) {
      if (seg.length < 2) continue;
      ctx.beginPath();
      for (const idx of seg) {
        const p = pts[idx];
        const next = pts[(idx + 1) % pts.length];
        const z1 = p.z ?? 0;
        const z2 = next.z ?? 0;
        const avgZ = (z1 + z2) / 2;
        const zOff = zOffsetY(avgZ);
        const dx = next.x - p.x;
        const dy = next.y - p.y;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        const nx = -dy / len * hw;
        const ny = dx / len * hw;
        if (idx === seg[0]) ctx.moveTo(p.x + nx, p.y + ny - zOff);
        else ctx.lineTo(p.x + nx, p.y + ny - zOff);
      }
      for (let s = seg.length - 1; s >= 0; s--) {
        const idx = seg[s];
        const p = pts[idx];
        const next = pts[(idx + 1) % pts.length];
        const z1 = p.z ?? 0;
        const z2 = next.z ?? 0;
        const avgZ = (z1 + z2) / 2;
        const zOff = zOffsetY(avgZ);
        const dx = next.x - p.x;
        const dy = next.y - p.y;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        const nx = -dy / len * hw;
        const ny = dx / len * hw;
        ctx.lineTo(p.x - nx, p.y - ny - zOff);
      }
      ctx.closePath();
      ctx.fillStyle = ROAD_COLOR;
      ctx.fill();
    }

    for (let i = 0; i < pts.length; i++) {
      const z = getZ(i);
      if (!matchZ(z)) continue;

      const p1 = pts[i];
      const p2 = pts[(i + 1) % pts.length];
      const z1 = p1.z ?? 0;
      const z2 = p2.z ?? 0;
      const avgZ = (z1 + z2) / 2;
      const zOff = zOffsetY(avgZ);
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const nx = -dy / len * hw;
      const ny = dx / len * hw;
      const isBoost = track.boostZones.includes(i);
      const isCurb = i % 3 < 2;

      const segColor = i % 2 === 0 ? ROAD_COLOR : ROAD_DARK;
      ctx.fillStyle = segColor;
      ctx.beginPath();
      ctx.moveTo(p1.x + nx * 0.92, p1.y + ny * 0.92 - zOff);
      ctx.lineTo(p2.x + nx * 0.92, p2.y + ny * 0.92 - zOff);
      ctx.lineTo(p2.x - nx * 0.92, p2.y - ny * 0.92 - zOff);
      ctx.lineTo(p1.x - nx * 0.92, p1.y - ny * 0.92 - zOff);
      ctx.closePath();
      ctx.fill();

      if (isBoost) {
        const flicker = 0.7 + 0.3 * Math.sin(time * 0.01 + i);
        ctx.fillStyle = BOOST_COLOR;
        ctx.globalAlpha = flicker;
        ctx.beginPath();
        ctx.moveTo(p1.x + nx * 0.9, p1.y + ny * 0.9 - zOff);
        ctx.lineTo(p2.x + nx * 0.9, p2.y + ny * 0.9 - zOff);
        ctx.lineTo(p2.x - nx * 0.9, p2.y - ny * 0.9 - zOff);
        ctx.lineTo(p1.x - nx * 0.9, p1.y - ny * 0.9 - zOff);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.fillStyle = BOOST_GLOW;
        ctx.fillRect((p1.x + p2.x) / 2 - 4, (p1.y + p2.y) / 2 - 4 - zOff, 8, 8);
      }

      if (isCurb) {
        const curbColor = i % 6 < 3 ? CURB_RED : CURB_WHITE;
        ctx.strokeStyle = curbColor;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(p1.x + nx, p1.y + ny - zOff);
        ctx.lineTo(p2.x + nx, p2.y + ny - zOff);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(p1.x - nx, p1.y - ny - zOff);
        ctx.lineTo(p2.x - nx, p2.y - ny - zOff);
        ctx.stroke();
      }
    }

    for (const seg of fillSegments) {
      if (seg.length < 2) continue;
      ctx.strokeStyle = ROAD_LIGHT;
      ctx.lineWidth = 2;
      ctx.setLineDash([16, 16]);
      ctx.lineDashOffset = -time * 0.01;
      ctx.beginPath();
      for (let s = 0; s < seg.length; s++) {
        const idx = seg[s];
        const p = pts[idx];
        const zOff = zOffsetY(p.z ?? 0);
        if (s === 0) ctx.moveTo(p.x, p.y - zOff);
        else ctx.lineTo(p.x, p.y - zOff);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }

    if (targetZ === null || targetZ === 0) {
      const start = pts[0];
      const next = pts[1];
      const sdx = next.x - start.x;
      const sdy = next.y - start.y;
      const slen = Math.sqrt(sdx * sdx + sdy * sdy) || 1;
      const snx = -sdy / slen * hw;
      const sny = sdx / slen * hw;
      const checkerCount = 10;
      for (let c = 0; c < checkerCount; c++) {
        const t = c / checkerCount;
        const t2 = (c + 1) / checkerCount;
        ctx.fillStyle = c % 2 === 0 ? '#ffffff' : '#111111';
        ctx.beginPath();
        ctx.moveTo(start.x + lerp(snx, -snx, t), start.y + lerp(sny, -sny, t));
        ctx.lineTo(start.x + lerp(snx, -snx, t2), start.y + lerp(sny, -sny, t2));
        ctx.lineTo(start.x - sdx * 0.05 + lerp(snx, -snx, t2), start.y - sdy * 0.05 + lerp(sny, -sny, t2));
        ctx.lineTo(start.x - sdx * 0.05 + lerp(snx, -snx, t), start.y - sdy * 0.05 + lerp(sny, -sny, t));
        ctx.closePath();
        ctx.fill();
      }
    }
  }

  drawBridgeShadows(track: Track) {
    const ctx = this.ctx;
    const pts = track.points;
    const hw = track.width / 2;
    const zOffsetY = (z: number): number => z * 24;

    for (let i = 0; i < pts.length; i++) {
      const z = pts[i].z ?? 0;
      if (z <= 0) continue;

      const p1 = pts[i];
      const p2 = pts[(i + 1) % pts.length];
      const z1 = p1.z ?? 0;
      const z2 = p2.z ?? 0;
      const avgZ = (z1 + z2) / 2;
      const zOff = zOffsetY(avgZ);
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const nx = -dy / len * hw;
      const ny = dx / len * hw;

      const shadowOffset = 8 + z * 8;
      const shadowAlpha = Math.min(0.4, 0.15 + z * 0.1);

      ctx.fillStyle = `rgba(0, 0, 0, ${shadowAlpha})`;
      ctx.beginPath();
      ctx.moveTo(p1.x + nx + shadowOffset, p1.y + ny + shadowOffset - zOff);
      ctx.lineTo(p2.x + nx + shadowOffset, p2.y + ny + shadowOffset - zOff);
      ctx.lineTo(p2.x - nx + shadowOffset, p2.y - ny + shadowOffset - zOff);
      ctx.lineTo(p1.x - nx + shadowOffset, p1.y - ny + shadowOffset - zOff);
      ctx.closePath();
      ctx.fill();
    }
  }

  drawBridgeStructures(track: Track) {
    const ctx = this.ctx;
    const pts = track.points;
    const hw = track.width / 2;
    const zOffsetY = (z: number): number => z * 24;

    for (let i = 0; i < pts.length; i += 3) {
      const z = pts[i].z ?? 0;
      if (z <= 0) continue;

      const p1 = pts[i];
      const p2 = pts[(i + 1) % pts.length];
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const nx = -dy / len * hw;
      const ny = dx / len * hw;

      const height = z * 24;
      const zOff = zOffsetY(z);
      const pillarX1 = p1.x + nx * 0.7;
      const pillarY1 = p1.y + ny * 0.7;
      const pillarX2 = p1.x - nx * 0.7;
      const pillarY2 = p1.y - ny * 0.7;

      const grad1 = ctx.createLinearGradient(pillarX1, pillarY1, pillarX1 + 8, pillarY1 + 8);
      grad1.addColorStop(0, '#888899');
      grad1.addColorStop(1, '#555566');
      ctx.fillStyle = grad1;
      ctx.fillRect(pillarX1 - 5, pillarY1 - height - zOff, 10, height);

      const grad2 = ctx.createLinearGradient(pillarX2, pillarY2, pillarX2 + 8, pillarY2 + 8);
      grad2.addColorStop(0, '#888899');
      grad2.addColorStop(1, '#555566');
      ctx.fillStyle = grad2;
      ctx.fillRect(pillarX2 - 5, pillarY2 - height - zOff, 10, height);

      ctx.fillStyle = '#666677';
      ctx.fillRect(pillarX1 - 7, pillarY1 - 5 - zOff, 14, 6);
      ctx.fillRect(pillarX2 - 7, pillarY2 - 5 - zOff, 14, 6);
    }

    for (let i = 0; i < pts.length; i++) {
      const z = pts[i].z ?? 0;
      if (z <= 0) continue;

      const p1 = pts[i];
      const p2 = pts[(i + 1) % pts.length];
      const z1 = p1.z ?? 0;
      const z2 = p2.z ?? 0;
      const avgZ = (z1 + z2) / 2;
      const zOff = zOffsetY(avgZ);
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const nx = -dy / len * hw;
      const ny = dx / len * hw;

      const railColor = z > 1 ? '#aaccff' : '#88aacc';

      ctx.strokeStyle = railColor;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(p1.x + nx * 0.95, p1.y + ny * 0.95 - zOff - 4);
      ctx.lineTo(p2.x + nx * 0.95, p2.y + ny * 0.95 - zOff - 4);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(p1.x - nx * 0.95, p1.y - ny * 0.95 - zOff - 4);
      ctx.lineTo(p2.x - nx * 0.95, p2.y - ny * 0.95 - zOff - 4);
      ctx.stroke();

      ctx.fillStyle = railColor;
      for (let t = 0; t <= 1; t += 0.25) {
        const px = p1.x + dx * t;
        const py = p1.y + dy * t;
        ctx.fillRect(px + nx * 0.95 - 1, py + ny * 0.95 - zOff - 4, 2, 6);
        ctx.fillRect(px - nx * 0.95 - 1, py - ny * 0.95 - zOff - 4, 2, 6);
      }
    }
  }

  getMaxZ(track: Track): number {
    let maxZ = 0;
    for (const p of track.points) {
      if ((p.z ?? 0) > maxZ) maxZ = p.z ?? 0;
    }
    return Math.round(maxZ);
  }

  drawTireMarks(marks: TireMark[]) {
    const ctx = this.ctx;
    const zOffsetY = (z: number): number => z * 24;
    for (const m of marks) {
      const zOff = zOffsetY(m.z ?? 0);
      ctx.save();
      ctx.translate(m.x, m.y - zOff);
      ctx.rotate(m.angle);
      ctx.fillStyle = `rgba(20,20,20,${m.alpha})`;
      ctx.fillRect(-6, -2, 12, 4);
      ctx.restore();
    }
  }

  drawItemBoxes(boxes: ItemBoxInstance[], time: number, targetZ: number = 0) {
    const ctx = this.ctx;
    const zOff = targetZ * 24;
    for (const b of boxes) {
      if (b.collected) continue;
      const bob = Math.sin(time * 0.005 + b.idx) * 3;
      ctx.save();
      ctx.translate(b.x, b.y + bob - zOff);
      ctx.rotate(Math.sin(time * 0.003 + b.idx) * 0.15);
      const grad = ctx.createLinearGradient(-14, -14, 14, 14);
      grad.addColorStop(0, '#ff88ff');
      grad.addColorStop(0.5, '#88ffff');
      grad.addColorStop(1, '#ffff88');
      ctx.fillStyle = grad;
      ctx.fillRect(-14, -14, 28, 28);
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.strokeRect(-14, -14, 28, 28);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 18px "Press Start 2P", "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('?', 0, 1);
      ctx.restore();
    }
  }

  drawBananas(bananas: BananaInstance[], targetZ: number = 0) {
    const ctx = this.ctx;
    const zOff = targetZ * 24;
    for (const b of bananas) {
      if (!b.active) continue;
      ctx.save();
      ctx.translate(b.x, b.y - zOff);
      ctx.rotate(b.angle);
      ctx.fillStyle = '#ffdd22';
      ctx.beginPath();
      ctx.ellipse(0, 0, 14, 6, 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ccaa11';
      ctx.fillRect(-10, -1, 20, 2);
      ctx.fillStyle = '#664400';
      ctx.fillRect(12, -3, 3, 6);
      ctx.restore();
    }
  }

  drawMissiles(missiles: MissileInstance[], targetZ: number = 0) {
    const ctx = this.ctx;
    const zOff = targetZ * 24;
    for (const m of missiles) {
      if (!m.active) continue;
      ctx.save();
      ctx.translate(m.x, m.y - zOff);
      ctx.rotate(m.angle);
      ctx.fillStyle = '#cc2233';
      ctx.fillRect(-10, -5, 18, 10);
      ctx.fillStyle = '#881122';
      ctx.beginPath();
      ctx.moveTo(8, -5);
      ctx.lineTo(14, 0);
      ctx.lineTo(8, 5);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#eeeeee';
      ctx.fillRect(-4, -2, 4, 4);
      ctx.fillStyle = '#222222';
      ctx.fillRect(-10, -7, 4, 4);
      ctx.fillRect(-10, 3, 4, 4);
      ctx.restore();
    }
  }

  drawMines(mines: MineInstance[], time: number, targetZ: number = 0) {
    const ctx = this.ctx;
    const zOff = targetZ * 24;
    for (const m of mines) {
      if (!m.active) continue;
      ctx.save();
      ctx.translate(m.x, m.y - zOff);
      ctx.rotate(m.angle);

      const blink = m.armed ? 1 : 0.5 + 0.5 * Math.sin(time * 0.01);
      ctx.globalAlpha = m.armed ? 1 : 0.7;

      ctx.fillStyle = '#333344';
      ctx.beginPath();
      ctx.arc(0, 0, 14, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#222233';
      ctx.beginPath();
      ctx.arc(0, 0, 12, 0, Math.PI * 2);
      ctx.fill();

      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        ctx.fillStyle = '#111122';
        ctx.fillRect(
          Math.cos(a) * 12 - 2,
          Math.sin(a) * 12 - 2,
          4, 4
        );
      }

      const flash = m.armed ? (0.3 + 0.7 * blink) : 0.3;
      ctx.fillStyle = `rgba(255,${Math.floor(80 * flash)},${Math.floor(80 * flash)},${flash})`;
      ctx.beginPath();
      ctx.arc(0, -6, 3, 0, Math.PI * 2);
      ctx.fill();

      if (m.armed) {
        ctx.fillStyle = '#ff4444';
        ctx.font = 'bold 10px "Press Start 2P", "Courier New", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('!', 0, 1);
      }

      ctx.globalAlpha = 1;
      ctx.restore();
    }
  }

  drawLightnings(lightnings: LightningInstance[], cars: Car[], time: number) {
    const ctx = this.ctx;
    for (const l of lightnings) {
      if (!l.active) continue;
      const target = cars.find((c) => c.id === l.targetId);
      if (!target) continue;

      ctx.save();

      const startY = target.y - 200;
      const endY = target.y;
      const startX = target.x + (Math.random() - 0.5) * 20;

      ctx.strokeStyle = l.strikeProgress > 0.3 ? '#ffffff' : '#ffff00';
      ctx.lineWidth = 3 + Math.random() * 2;
      ctx.globalAlpha = Math.max(0, 1 - l.strikeProgress);

      ctx.beginPath();
      ctx.moveTo(startX, startY);

      let currentX = startX;
      let currentY = startY;
      const segments = 8;
      for (let i = 1; i <= segments; i++) {
        currentY = startY + ((endY - startY) * (i / segments));
        currentX += (Math.random() - 0.5) * 20;
        ctx.lineTo(currentX, currentY);
      }
      ctx.lineTo(target.x, target.y);
      ctx.stroke();

      ctx.strokeStyle = '#ffff00';
      ctx.lineWidth = 1;
      ctx.stroke();

      if (l.strikeProgress > 0.3) {
        const glow = ctx.createRadialGradient(target.x, target.y, 0, target.x, target.y, 60);
        glow.addColorStop(0, 'rgba(255,255,0,0.6)');
        glow.addColorStop(1, 'rgba(255,255,0,0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(target.x, target.y, 60, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = 1;
      ctx.restore();
    }
  }

  drawObstacles(obstacles: Obstacle[], time: number) {
    const ctx = this.ctx;
    for (const obs of obstacles) {
      if (!obs.active) continue;
      ctx.save();
      ctx.translate(obs.x, obs.y);
      ctx.rotate(obs.angle);

      const w = obs.width;
      const h = obs.height;
      const hf = obstacleHitFlash(obs);

      let baseColor: string, darkColor: string, accentColor: string;
      switch (obs.type) {
        case 'static':
          baseColor = '#666677';
          darkColor = '#444455';
          accentColor = '#888899';
          break;
        case 'sway':
          baseColor = '#cc5533';
          darkColor = '#883322';
          accentColor = '#ff7744';
          break;
        case 'patrol':
          baseColor = '#3355cc';
          darkColor = '#223388';
          accentColor = '#5577ff';
          break;
      }

      if (hf > 0.01) {
        const flash = Math.floor(hf * 255).toString(16).padStart(2, '0');
        baseColor = `#${flash}${flash}ff`;
      }

      ctx.fillStyle = baseColor;
      ctx.fillRect(-w / 2, -h / 2, w, h);

      ctx.fillStyle = darkColor;
      ctx.fillRect(-w / 2, -h / 2, w, 3);
      ctx.fillRect(-w / 2, h / 2 - 3, w, 3);
      ctx.fillRect(-w / 2, -h / 2, 3, h);
      ctx.fillRect(w / 2 - 3, -h / 2, 3, h);

      ctx.fillStyle = accentColor;
      ctx.fillRect(-w / 2 + 4, -h / 2 + 4, w - 8, 3);

      if (obs.type === 'patrol') {
        const blink = 0.5 + 0.5 * Math.sin(time * 0.008 + obs.id * 1.3);
        ctx.fillStyle = `rgba(255,${Math.floor(80 + 100 * blink)},80,${0.6 + 0.4 * blink})`;
        ctx.fillRect(-w / 2 + 6, -h / 2 + 6, 4, 4);
        ctx.fillRect(w / 2 - 10, -h / 2 + 6, 4, 4);
        ctx.fillRect(-w / 2 + 6, h / 2 - 10, 4, 4);
        ctx.fillRect(w / 2 - 10, h / 2 - 10, 4, 4);
      } else if (obs.type === 'sway') {
        ctx.fillStyle = '#ffcc00';
        ctx.fillRect(-w / 2 + 5, -3, w - 10, 6);
      } else {
        const stripes = Math.floor(w / 6);
        for (let s = 0; s < stripes; s++) {
          ctx.fillStyle = s % 2 === 0 ? '#ffdd00' : '#111111';
          ctx.fillRect(-w / 2 + 3 + s * 6, -4, 5, 8);
        }
      }

      ctx.restore();
    }
  }

  drawCar(car: Car, time: number) {
    const ctx = this.ctx;
    const timeLight = TIME_LIGHTING[this.env.timeOfDay];

    const cust = car.customization;
    const bodyColor = cust ? cust.bodyColor : car.color;
    const bodyDark = cust ? this.darkenColor(cust.bodyColor, 0.3) : car.colorDark;
    const wheelColor = cust ? cust.wheelColor : '#111111';

    const zOffset = car.z * 24;
    const drawX = car.x;
    const drawY = car.y - zOffset;

    if (timeLight.headlightAlpha > 0.05 && !car.finished) {
      ctx.save();
      ctx.translate(drawX, drawY);
      ctx.rotate(car.angle);
      if (car.gravityFlipped) ctx.scale(1, -1);
      const hlAlpha = timeLight.headlightAlpha * 0.6;
      const grad = ctx.createRadialGradient(20, 0, 8, 20, 0, 180);
      grad.addColorStop(0, `rgba(255,240,180,${hlAlpha})`);
      grad.addColorStop(0.4, `rgba(255,230,150,${hlAlpha * 0.5})`);
      grad.addColorStop(1, 'rgba(255,220,120,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(12, -18);
      ctx.lineTo(220, -70);
      ctx.lineTo(220, 70);
      ctx.lineTo(12, 18);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    ctx.save();
    ctx.translate(drawX, drawY);

    ctx.scale(car.scale, car.scale);

    if (car.isGhost) {
      ctx.globalAlpha = 0.5 + 0.2 * Math.sin(time * 0.01);
    }

    if (car.gravityFlipAnim > 0) {
      const flipProgress = 1 - (car.gravityFlipAnim / 400);
      const scaleY = Math.abs(Math.cos(flipProgress * Math.PI));
      ctx.rotate(car.angle);
      ctx.scale(1, Math.max(0.05, scaleY));
    } else {
      ctx.rotate(car.angle);
      if (car.gravityFlipped) ctx.scale(1, -1);
    }

    if (car.hasMagnet) {
      const pulse = 0.5 + 0.5 * Math.sin(time * 0.008);
      ctx.strokeStyle = `rgba(255,68,136,${pulse})`;
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(0, 0, 40, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    if (car.hasShield) {
      const pulse = 0.7 + 0.3 * Math.sin(time * 0.01);
      ctx.strokeStyle = `rgba(80,220,255,${pulse})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, 22, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (car.hyperBoostTime > 0) {
      const f = 0.6 + 0.4 * Math.sin(time * 0.05);
      const grad = ctx.createLinearGradient(-30, 0, -10, 0);
      grad.addColorStop(0, 'rgba(255,0,255,0)');
      grad.addColorStop(0.5, `rgba(0,255,255,${f})`);
      grad.addColorStop(1, 'rgba(255,255,0,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(-14, -8);
      ctx.lineTo(-35 - f * 10, 0);
      ctx.lineTo(-14, 8);
      ctx.closePath();
      ctx.fill();
    } else if (car.boostTime > 0) {
      const f = 0.5 + 0.5 * Math.sin(time * 0.04);
      ctx.fillStyle = `rgba(255,200,0,${f})`;
      ctx.beginPath();
      ctx.moveTo(-14, -5);
      ctx.lineTo(-22 - f * 6, 0);
      ctx.lineTo(-14, 5);
      ctx.closePath();
      ctx.fill();
    }

    const wheelOffset = car.drifting ? 0.12 * Math.sign(car.driftAngle || 1) : 0;
    ctx.fillStyle = wheelColor;
    ctx.fillRect(-12, -13, 8, 5);
    ctx.fillRect(-12, 8, 8, 5);
    ctx.save();
    ctx.translate(10, -13);
    ctx.rotate(wheelOffset);
    ctx.fillRect(-4, 0, 8, 5);
    ctx.restore();
    ctx.save();
    ctx.translate(10, 8);
    ctx.rotate(wheelOffset);
    ctx.fillRect(-4, -5, 8, 5);
    ctx.restore();

    ctx.fillStyle = bodyColor;
    ctx.fillRect(-14, -10, 26, 20);
    ctx.fillStyle = bodyDark;
    ctx.fillRect(-14, -10, 26, 3);
    ctx.fillRect(-14, 7, 26, 3);
    ctx.fillStyle = bodyDark;
    ctx.fillRect(-14, -10, 5, 20);

    if (cust && cust.stripeEnabled && cust.stripePattern !== 'none') {
      ctx.fillStyle = cust.stripeColor;
      if (cust.stripePattern === 'single') {
        ctx.fillRect(-14, -1, 26, 2);
      } else if (cust.stripePattern === 'double') {
        ctx.fillRect(-14, -5, 26, 2);
        ctx.fillRect(-14, 3, 26, 2);
      } else if (cust.stripePattern === 'checker') {
        for (let row = 0; row < 3; row++) {
          for (let col = 0; col < 13; col++) {
            if ((row + col) % 2 === 0) {
              ctx.fillRect(-13 + col * 2, -6 + row * 2, 2, 2);
            }
          }
        }
      } else if (cust.stripePattern === 'flame') {
        const sc = cust.stripeColor;
        ctx.fillStyle = sc;
        ctx.beginPath();
        ctx.moveTo(-14, -1);
        ctx.lineTo(-10, -2);
        ctx.lineTo(-8, -8);
        ctx.lineTo(-4, -2);
        ctx.lineTo(0, -6);
        ctx.lineTo(4, -1);
        ctx.lineTo(8, -5);
        ctx.lineTo(12, 0);
        ctx.lineTo(12, 2);
        ctx.lineTo(-14, 2);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = this.darkenColor(sc, 0.25);
        ctx.beginPath();
        ctx.moveTo(-14, 0);
        ctx.lineTo(-10, -1);
        ctx.lineTo(-8, -5);
        ctx.lineTo(-4, -1);
        ctx.lineTo(0, -3.5);
        ctx.lineTo(4, 0);
        ctx.lineTo(8, -2);
        ctx.lineTo(12, 0.5);
        ctx.lineTo(12, 1);
        ctx.lineTo(-14, 1);
        ctx.closePath();
        ctx.fill();
      }
    }

    ctx.fillStyle = '#223344';
    ctx.fillRect(-2, -7, 10, 14);
    ctx.fillStyle = '#44aadd';
    ctx.fillRect(0, -5, 6, 10);

    ctx.fillStyle = '#ffcc33';
    ctx.fillRect(10, -6, 3, 3);
    ctx.fillRect(10, 3, 3, 3);

    ctx.fillStyle = '#ff4444';
    ctx.fillRect(-14, -6, 3, 3);
    ctx.fillRect(-14, 3, 3, 3);

    if (cust && cust.numberEnabled && cust.number) {
      ctx.fillStyle = cust.numberColor;
      ctx.font = 'bold 8px "Press Start 2P", "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(cust.number.slice(0, 2), -6, 0);
    } else {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-6, -2, 2, 4);
    }

    ctx.globalAlpha = 1;
    ctx.restore();

    if (car.isPlayer && !car.finished) {
      ctx.save();
      const arrowY = car.gravityFlipped ? 32 : -32;
      ctx.translate(car.x, car.y + arrowY);
      const t = Math.sin(time * 0.01) * 2;
      ctx.fillStyle = car.gravityFlipped ? '#ff00ff' : '#ffdd00';
      ctx.beginPath();
      if (car.gravityFlipped) {
        ctx.moveTo(-8, 8 - t);
        ctx.lineTo(0, 0);
        ctx.lineTo(8, 8 - t);
      } else {
        ctx.moveTo(-8, -8 + t);
        ctx.lineTo(0, 0);
        ctx.lineTo(8, -8 + t);
      }
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();
    }

    if (car.gravityFlipped) {
      ctx.save();
      ctx.translate(car.x, car.y + 24);
      ctx.fillStyle = '#ff00ff';
      ctx.font = 'bold 7px "Press Start 2P", "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.globalAlpha = 0.7 + 0.3 * Math.sin(time * 0.008);
      ctx.fillText('CEILING', 0, 0);
      ctx.globalAlpha = 1;
      ctx.restore();
    }
  }

  private interpolateColor(color1: string, color2: string, t: number): string {
    const hex = (c: string) => parseInt(c.slice(1), 16);
    const r1 = (hex(color1) >> 16) & 255;
    const g1 = (hex(color1) >> 8) & 255;
    const b1 = hex(color1) & 255;
    const r2 = (hex(color2) >> 16) & 255;
    const g2 = (hex(color2) >> 8) & 255;
    const b2 = hex(color2) & 255;
    const r = Math.round(r1 + (r2 - r1) * t);
    const g = Math.round(g1 + (g2 - g1) * t);
    const b = Math.round(b1 + (b2 - b1) * t);
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
  }

  drawParticles(particles: Particle[], targetZ: number = 0) {
    const ctx = this.ctx;
    const zOff = targetZ * 24;
    for (const p of particles) {
      const a = Math.max(0, Math.min(1, p.life / p.maxLife));
      let color = p.color;
      if (p.colorEnd) {
        color = this.interpolateColor(p.colorEnd, p.color, a);
      }
      ctx.globalAlpha = a;
      const drawX = p.x;
      const drawY = p.y - zOff;
      const size = Math.max(1, p.size);

      if (p.glow) {
        ctx.shadowColor = color;
        ctx.shadowBlur = size * 2;
      }

      ctx.fillStyle = color;
      const shape = p.shape || 'square';

      switch (shape) {
        case 'circle': {
          ctx.beginPath();
          ctx.arc(drawX, drawY, size / 2, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
        case 'spark': {
          ctx.save();
          ctx.translate(drawX, drawY);
          ctx.rotate(p.rotation || 0);
          ctx.beginPath();
          ctx.moveTo(0, -size / 2);
          ctx.lineTo(size / 4, 0);
          ctx.lineTo(0, size / 2);
          ctx.lineTo(-size / 4, 0);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
          break;
        }
        case 'smoke': {
          const gradient = ctx.createRadialGradient(drawX, drawY, 0, drawX, drawY, size / 2);
          gradient.addColorStop(0, color);
          gradient.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(drawX, drawY, size / 2, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
        case 'ring': {
          ctx.strokeStyle = color;
          ctx.lineWidth = Math.max(1, size / 3);
          ctx.beginPath();
          ctx.arc(drawX, drawY, size, 0, Math.PI * 2);
          ctx.stroke();
          break;
        }
        case 'star': {
          ctx.save();
          ctx.translate(drawX, drawY);
          ctx.rotate(p.rotation || 0);
          const spikes = 5;
          const outerRadius = size / 2;
          const innerRadius = size / 4;
          ctx.beginPath();
          for (let i = 0; i < spikes * 2; i++) {
            const radius = i % 2 === 0 ? outerRadius : innerRadius;
            const angle = (i * Math.PI) / spikes - Math.PI / 2;
            const sx = Math.cos(angle) * radius;
            const sy = Math.sin(angle) * radius;
            if (i === 0) ctx.moveTo(sx, sy);
            else ctx.lineTo(sx, sy);
          }
          ctx.closePath();
          ctx.fill();
          ctx.restore();
          break;
        }
        default: {
          ctx.fillRect(drawX - size / 2, drawY - size / 2, size, size);
          break;
        }
      }

      if (p.glow) {
        ctx.shadowBlur = 0;
      }
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#ffffff';
  }

  drawVignette() {
    const ctx = this.ctx;
    const w = this.viewportW;
    const h = this.viewportH;
    const timeLight = TIME_LIGHTING[this.env.timeOfDay];
    const baseAlpha = 0.55 * timeLight.vignetteMul;
    const grad = ctx.createRadialGradient(
      w / 2, h / 2, Math.min(w, h) * 0.3,
      w / 2, h / 2, Math.max(w, h) * 0.8
    );
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, `rgba(0,0,0,${baseAlpha})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }

  drawScanlines(time: number) {
    const ctx = this.ctx;
    const w = this.viewportW;
    const h = this.viewportH;
    const timeLight = TIME_LIGHTING[this.env.timeOfDay];
    const mul = timeLight.scanlineMul;
    ctx.save();
    ctx.globalAlpha = 0.08 * mul;
    ctx.fillStyle = '#000000';
    for (let y = 0; y < h; y += 4) {
      ctx.fillRect(0, y, w, 2);
    }
    ctx.globalAlpha = 0.04 * mul;
    const barY = (time * 0.2) % h;
    ctx.fillRect(0, barY, w, 60);
    ctx.restore();
  }

  drawWeatherParticles() {
    const ctx = this.ctx;
    for (const p of this.weatherParticles) {
      if (p.type === 'rain') {
        ctx.strokeStyle = 'rgba(180,200,255,0.5)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + p.vx * 0.3, p.y + p.size);
        ctx.stroke();
      } else {
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        const s = p.size;
        ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s);
      }
    }
  }

  drawFog() {
    const ctx = this.ctx;
    const w = this.viewportW;
    const h = this.viewportH;
    const weatherVis = WEATHER_VISUAL[this.env.weather];
    const timeLight = TIME_LIGHTING[this.env.timeOfDay];
    const fogAlpha = Math.max(weatherVis.fogAlpha, timeLight.ambientAlpha);
    if (fogAlpha <= 0) return;

    let fogColor = 'rgba(200,200,210,';
    if (this.env.timeOfDay === 'night') fogColor = 'rgba(30,30,60,';
    else if (this.env.timeOfDay === 'sunset') fogColor = 'rgba(255,180,150,';
    else if (this.env.timeOfDay === 'dawn') fogColor = 'rgba(255,220,200,';

    const grad = ctx.createRadialGradient(
      w / 2, h / 2, Math.min(w, h) * 0.1,
      w / 2, h / 2, Math.max(w, h) * 0.8
    );
    grad.addColorStop(0, fogColor + '0)');
    grad.addColorStop(0.5, fogColor + (fogAlpha * 0.5) + ')');
    grad.addColorStop(1, fogColor + fogAlpha + ')');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }

  drawTimeTint() {
    const ctx = this.ctx;
    const w = this.viewportW;
    const h = this.viewportH;
    const timeLight = TIME_LIGHTING[this.env.timeOfDay];
    if (timeLight.skyTint && timeLight.ambientAlpha > 0) {
      ctx.fillStyle = timeLight.skyTint;
      ctx.fillRect(0, 0, w, h);
    }

    if (timeLight.ambientAlpha > 0) {
      ctx.fillStyle = `rgba(0,0,0,${timeLight.ambientAlpha})`;
      ctx.fillRect(0, 0, w, h);
    }
  }

  drawRoadWet(track: Track) {
    const ctx = this.ctx;
    const weatherVis = WEATHER_VISUAL[this.env.weather];
    if (weatherVis.roadWetAlpha <= 0) return;
    const pts = track.points;
    const hw = track.width / 2 * 0.9;
    const alpha = weatherVis.roadWetAlpha;
    const color = this.env.weather === 'snow'
      ? `rgba(240,240,255,${alpha})`
      : `rgba(150,180,220,${alpha})`;
    ctx.fillStyle = color;
    ctx.beginPath();
    for (let i = 0; i <= pts.length; i++) {
      const p = pts[i % pts.length];
      const dx = pts[(i + 1) % pts.length].x - pts[i % pts.length].x;
      const dy = pts[(i + 1) % pts.length].y - pts[i % pts.length].y;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const nx = -dy / len * hw;
      const ny = dx / len * hw;
      if (i === 0) ctx.moveTo(p.x + nx, p.y + ny);
      else ctx.lineTo(p.x + nx, p.y + ny);
    }
    for (let i = pts.length; i >= 0; i--) {
      const p = pts[i % pts.length];
      const dx = pts[(i + 1) % pts.length].x - pts[i % pts.length].x;
      const dy = pts[(i + 1) % pts.length].y - pts[i % pts.length].y;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const nx = -dy / len * hw;
      const ny = dx / len * hw;
      ctx.lineTo(p.x - nx, p.y - ny);
    }
    ctx.closePath();
    ctx.fill();
  }

  drawCountdown(num: number, time: number) {
    const ctx = this.ctx;
    const w = this.viewportW;
    const h = this.viewportH;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, w, h);
    const scale = 1 + 0.15 * Math.sin(time * 0.03);
    ctx.translate(w / 2, h / 2);
    ctx.scale(scale, scale);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (num > 0) {
      ctx.font = 'bold 120px "Press Start 2P", "Courier New", monospace';
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#ff3366';
      ctx.lineWidth = 8;
      ctx.strokeText(String(num), 0, 0);
      ctx.fillText(String(num), 0, 0);
    } else {
      ctx.font = 'bold 80px "Press Start 2P", "Courier New", monospace';
      ctx.fillStyle = '#00ff88';
      ctx.strokeStyle = '#008844';
      ctx.lineWidth = 8;
      ctx.strokeText('GO!', 0, 0);
      ctx.fillText('GO!', 0, 0);
    }
    ctx.restore();
  }

  drawWackyGravityIndicator(wacky: WackyState, time: number) {
    const ctx = this.ctx;
    const w = this.viewportW;
    const h = this.viewportH;

    ctx.save();

    const isFlipped = wacky.gravityDir === -1;
    const isWarning = !wacky.flipping && wacky.flipTimer <= 1500 && wacky.flipTimer > 0;
    const isFlipping = wacky.flipping;

    const indicatorX = w / 2;
    const indicatorY = 40;

    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(indicatorX - 60, indicatorY - 16, 120, 32);
    ctx.strokeStyle = isFlipped ? '#ff00ff' : '#00ff88';
    ctx.lineWidth = 2;
    ctx.strokeRect(indicatorX - 60, indicatorY - 16, 120, 32);

    ctx.fillStyle = isFlipped ? '#ff00ff' : '#00ff88';
    ctx.font = 'bold 10px "Press Start 2P", "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const arrow = isFlipped ? '▲' : '▼';
    const label = isFlipped ? 'CEILING' : 'FLOOR';
    ctx.fillText(`${arrow} ${label}`, indicatorX, indicatorY);

    if (isWarning) {
      const blink = Math.sin(time * 0.02) > 0;
      if (blink) {
        ctx.fillStyle = '#ff8800';
        ctx.font = 'bold 14px "Press Start 2P", "Courier New", monospace';
        ctx.fillText('⚠ FLIP!', indicatorX, indicatorY + 28);
      }

      ctx.fillStyle = 'rgba(255,136,0,0.15)';
      ctx.fillRect(0, 0, w, h);
    }

    if (isFlipping) {
      const flash = Math.sin(time * 0.03);
      ctx.fillStyle = `rgba(255,0,255,${0.1 + 0.1 * flash})`;
      ctx.fillRect(0, 0, w, h);
    }

    ctx.restore();
  }
}

export const ITEM_ICON: Record<ItemType, string> = {
  boost: '⚡',
  shield: '🛡',
  banana: '🍌',
  missile: '🚀',
  mine: '💣',
  shrink: '🔽',
  giant: '🔼',
  lightning: '⚡',
  ghost: '👻',
  magnet: '🧲',
  hyperboost: '🌟',
};

export const ITEM_COLOR: Record<ItemType, string> = {
  boost: '#ffdd00',
  shield: '#33ccff',
  banana: '#ffaa22',
  missile: '#ff4466',
  mine: '#ff4444',
  shrink: '#88ff88',
  giant: '#ff8844',
  lightning: '#ffff00',
  ghost: '#aa88ff',
  magnet: '#ff4488',
  hyperboost: '#ff00ff',
};
