import type {
  Car, CarSnapshot, Particle, TireMark, BananaInstance, MissileInstance,
  ReplayFrame, ReplayData, ReplayViewMode, GameMode, EnvConfig, Camera, Obstacle,
  MineInstance, LightningInstance,
} from './types';
import { MAIN_TRACK } from './track';
import { lerp, clamp } from '../utils/math';

const RECORD_INTERVAL = 33;
const MAX_FRAMES = 60000;

export class ReplayRecorder {
  private frames: ReplayFrame[] = [];
  private lastRecordTime = 0;
  private frameCounter = 0;
  private startTime = 0;
  private gameMode: GameMode = 'grandprix';
  private playerCount: 1 | 2 = 1;
  private totalLaps = 3;
  private rankings: number[] = [];
  private initialCars: Car[] = [];
  private env: EnvConfig = { weather: 'clear', timeOfDay: 'day' };

  start(initialCars: Car[], gameMode: GameMode, playerCount: 1 | 2, totalLaps: number, env: EnvConfig) {
    this.frames = [];
    this.frameCounter = 0;
    this.lastRecordTime = 0;
    this.startTime = performance.now();
    this.gameMode = gameMode;
    this.playerCount = playerCount;
    this.totalLaps = totalLaps;
    this.rankings = [];
    this.initialCars = JSON.parse(JSON.stringify(initialCars));
    this.env = env;
  }

  record(
    cars: Car[],
    particles: Particle[],
    tireMarks: TireMark[],
    bananas: BananaInstance[],
    missiles: MissileInstance[],
    mines: MineInstance[],
    lightnings: LightningInstance[],
    obstacles: Obstacle[],
    raceTime: number,
    ts: number,
  ) {
    if (ts - this.lastRecordTime < RECORD_INTERVAL) return;
    if (this.frames.length >= MAX_FRAMES) return;

    this.lastRecordTime = ts;
    this.frameCounter++;

    const carSnapshots: CarSnapshot[] = cars.map((c) => ({
      id: c.id,
      x: c.x,
      y: c.y,
      angle: c.angle,
      speed: c.speed,
      lap: c.lap,
      checkpoint: c.checkpoint,
      finished: c.finished,
      hasShield: c.hasShield,
      boostTime: c.boostTime,
      spinTime: c.spinTime,
      drifting: c.drifting,
      driftAngle: c.driftAngle,
      driftScore: c.driftScore,
      driftCombo: c.driftCombo,
      currentDriftPoints: c.currentDriftPoints,
      maxDriftCombo: c.maxDriftCombo,
      currentItem: c.currentItem,
      gravityFlipped: c.gravityFlipped,
      gravityFlipAnim: c.gravityFlipAnim,
      scale: c.scale,
      isGhost: c.isGhost,
      hasMagnet: c.hasMagnet,
      hyperBoostTime: c.hyperBoostTime,
    }));

    const recentParticles = particles
      .filter((p) => p.life > p.maxLife * 0.3)
      .slice(-100)
      .map((p) => ({ ...p }));

    const recentTireMarks = tireMarks
      .filter((t) => t.alpha > 0.1)
      .slice(-200)
      .map((t) => ({ ...t }));

    const frame: ReplayFrame = {
      frameIndex: this.frameCounter,
      raceTime,
      cars: carSnapshots,
      particles: recentParticles,
      tireMarks: recentTireMarks,
      bananas: bananas.map((b) => ({ ...b })),
      missiles: missiles.map((m) => ({ ...m })),
      mines: mines.map((m) => ({ ...m })),
      lightnings: lightnings.map((l) => ({ ...l })),
      obstacles: obstacles.map((o) => ({ ...o })),
    };

    this.frames.push(frame);
  }

  finish(rankings: number[]) {
    this.rankings = [...rankings];
  }

  getData(): ReplayData | null {
    if (this.frames.length < 2) return null;
    const lastFrame = this.frames[this.frames.length - 1];
    return {
      frames: this.frames,
      totalRaceTime: lastFrame.raceTime,
      initialCars: this.initialCars,
      gameMode: this.gameMode,
      playerCount: this.playerCount,
      totalLaps: this.totalLaps,
      rankings: this.rankings,
      env: this.env,
    };
  }
}

export class ReplayPlayer {
  private data: ReplayData;
  private currentFrameIdx = 0;
  private playbackSpeed = 1;
  private playing = true;
  private lastTickTime = 0;
  private accumulator = 0;
  private viewMode: ReplayViewMode = 'follow_p1';
  private freeCamera: Camera = { x: 1000, y: 800, zoom: 0.8, shake: 0 };
  private currentCars: Car[] = [];
  private currentParticles: Particle[] = [];
  private currentTireMarks: TireMark[] = [];
  private currentBananas: BananaInstance[] = [];
  private currentMissiles: MissileInstance[] = [];
  private currentMines: MineInstance[] = [];
  private currentLightnings: LightningInstance[] = [];
  private currentObstacles: Obstacle[] = [];
  private currentRaceTime = 0;
  private onFrameChange?: (idx: number) => void;

  constructor(data: ReplayData) {
    this.data = data;
    this.currentCars = data.initialCars.map((c) => ({ ...c }));
    this.freeCamera = { x: MAIN_TRACK.points[0].x, y: MAIN_TRACK.points[0].y, zoom: 0.7, shake: 0 };
  }

  setOnFrameChange(cb: (idx: number) => void) {
    this.onFrameChange = cb;
  }

  getEnv() {
    return this.data.env;
  }

  getGameMode() {
    return this.data.gameMode;
  }

  getPlayerCount() {
    return this.data.playerCount;
  }

  getTotalLaps() {
    return this.data.totalLaps;
  }

  getRankings() {
    return this.data.rankings;
  }

  getTotalFrames() {
    return this.data.frames.length;
  }

  getCurrentFrameIndex() {
    return this.currentFrameIdx;
  }

  getCurrentRaceTime() {
    return this.currentRaceTime;
  }

  getCars() {
    return this.currentCars;
  }

  getParticles() {
    return this.currentParticles;
  }

  getTireMarks() {
    return this.currentTireMarks;
  }

  getBananas() {
    return this.currentBananas;
  }

  getMissiles() {
    return this.currentMissiles;
  }

  getMines() {
    return this.currentMines;
  }

  getLightnings() {
    return this.currentLightnings;
  }

  getObstacles() {
    return this.currentObstacles;
  }

  isPlaying() {
    return this.playing;
  }

  togglePlay() {
    this.playing = !this.playing;
  }

  play() {
    this.playing = true;
  }

  pause() {
    this.playing = false;
  }

  getSpeed() {
    return this.playbackSpeed;
  }

  setSpeed(speed: number) {
    this.playbackSpeed = clamp(speed, 0.125, 8);
  }

  getViewMode() {
    return this.viewMode;
  }

  setViewMode(mode: ReplayViewMode) {
    this.viewMode = mode;
  }

  cycleViewMode() {
    const modes: ReplayViewMode[] = ['follow_p1', 'follow_leader', 'topdown', 'free'];
    const hasP2 = this.data.initialCars.some((c) => c.isPlayer && c.playerIndex === 1);
    const allModes = hasP2 ? ['follow_p1', 'follow_p2', 'follow_leader', 'topdown', 'free'] : modes;
    const curIdx = allModes.indexOf(this.viewMode);
    this.viewMode = (allModes[(curIdx + 1) % allModes.length]) as ReplayViewMode;
  }

  seek(frameIdx: number) {
    this.currentFrameIdx = clamp(frameIdx, 0, this.data.frames.length - 1);
    this.applyFrame(this.currentFrameIdx);
    this.onFrameChange?.(this.currentFrameIdx);
  }

  seekToStart() {
    this.seek(0);
  }

  seekToEnd() {
    this.seek(this.data.frames.length - 1);
  }

  stepForward(frames = 1) {
    this.pause();
    this.seek(this.currentFrameIdx + frames);
  }

  stepBackward(frames = 1) {
    this.pause();
    this.seek(this.currentFrameIdx - frames);
  }

  getFreeCamera() {
    return this.freeCamera;
  }

  panFreeCamera(dx: number, dy: number) {
    this.freeCamera.x += dx;
    this.freeCamera.y += dy;
  }

  zoomFreeCamera(factor: number) {
    this.freeCamera.zoom = clamp(this.freeCamera.zoom * factor, 0.2, 2);
  }

  getCameraForViewport(viewportIdx: number): Camera {
    void viewportIdx;
    const cars = this.currentCars;
    const playerCars = cars.filter((c) => c.isPlayer);

    switch (this.viewMode) {
      case 'follow_p1': {
        const p1 = playerCars.find((c) => c.playerIndex === 0) || cars[0];
        return this.makeFollowCamera(p1);
      }
      case 'follow_p2': {
        const p2 = playerCars.find((c) => c.playerIndex === 1) || cars[1] || cars[0];
        return this.makeFollowCamera(p2);
      }
      case 'follow_leader': {
        const sorted = [...cars].sort((a, b) => {
          if (a.finished && b.finished) return a.finishTime - b.finishTime;
          if (a.finished) return -1;
          if (b.finished) return 1;
          const lapDiff = b.lap - a.lap;
          if (lapDiff !== 0) return lapDiff;
          return b.checkpoint - a.checkpoint;
        });
        return this.makeFollowCamera(sorted[0] || cars[0]);
      }
      case 'topdown': {
        return { x: 1000, y: 800, zoom: 0.55, shake: 0 };
      }
      case 'free':
      default:
        return { ...this.freeCamera };
    }
  }

  private makeFollowCamera(car: Car): Camera {
    const absSpeed = Math.abs(car.speed);
    const targetZoom = 1 - clamp(absSpeed / (car.maxSpeed * 2), 0, 0.12);
    const speedFactor = absSpeed / car.maxSpeed;
    const lookAhead = 80 * speedFactor;
    const tx = car.x + Math.cos(car.angle) * lookAhead;
    const ty = car.y + Math.sin(car.angle) * lookAhead;
    return { x: tx, y: ty, zoom: targetZoom, shake: 0 };
  }

  private applyFrame(idx: number) {
    const clamped = clamp(idx, 0, this.data.frames.length - 1);
    const frame = this.data.frames[clamped];
    if (!frame) return;

    this.currentRaceTime = frame.raceTime;

    for (const snap of frame.cars) {
      const car = this.currentCars[snap.id];
      if (car) {
        car.x = snap.x;
        car.y = snap.y;
        car.angle = snap.angle;
        car.speed = snap.speed;
        car.lap = snap.lap;
        car.checkpoint = snap.checkpoint;
        car.finished = snap.finished;
        car.hasShield = snap.hasShield;
        car.boostTime = snap.boostTime;
        car.spinTime = snap.spinTime;
        car.drifting = snap.drifting;
        car.driftAngle = snap.driftAngle;
        car.driftScore = snap.driftScore;
        car.driftCombo = snap.driftCombo;
        car.currentDriftPoints = snap.currentDriftPoints;
        car.maxDriftCombo = snap.maxDriftCombo;
        car.currentItem = snap.currentItem;
        car.gravityFlipped = snap.gravityFlipped;
        car.gravityFlipAnim = snap.gravityFlipAnim;
        car.scale = snap.scale;
        car.isGhost = snap.isGhost;
        car.hasMagnet = snap.hasMagnet;
        car.hyperBoostTime = snap.hyperBoostTime;
      }
    }

    this.currentParticles = frame.particles.map((p) => ({ ...p }));
    this.currentTireMarks = frame.tireMarks.map((t) => ({ ...t }));
    this.currentBananas = frame.bananas.map((b) => ({ ...b }));
    this.currentMissiles = frame.missiles.map((m) => ({ ...m }));
    this.currentMines = (frame.mines || []).map((m) => ({ ...m }));
    this.currentLightnings = (frame.lightnings || []).map((l) => ({ ...l }));
    this.currentObstacles = (frame.obstacles || []).map((o) => ({ ...o }));
  }

  private interpolateFrame(fromIdx: number, toIdx: number, t: number) {
    const from = this.data.frames[fromIdx];
    const to = this.data.frames[toIdx];
    if (!from || !to) {
      this.applyFrame(toIdx);
      return;
    }

    this.currentRaceTime = lerp(from.raceTime, to.raceTime, t);

    const carCount = Math.min(from.cars.length, to.cars.length, this.currentCars.length);
    for (let i = 0; i < carCount; i++) {
      const snapFrom = from.cars[i];
      const snapTo = to.cars[i];
      const car = this.currentCars[snapTo.id];
      if (!car) continue;
      car.x = lerp(snapFrom.x, snapTo.x, t);
      car.y = lerp(snapFrom.y, snapTo.y, t);
      let da = snapTo.angle - snapFrom.angle;
      while (da > Math.PI) da -= Math.PI * 2;
      while (da < -Math.PI) da += Math.PI * 2;
      car.angle = snapFrom.angle + da * t;
      car.speed = lerp(snapFrom.speed, snapTo.speed, t);
      car.lap = snapTo.lap;
      car.checkpoint = snapTo.checkpoint;
      car.finished = snapTo.finished;
      car.hasShield = snapTo.hasShield;
      car.boostTime = lerp(snapFrom.boostTime, snapTo.boostTime, t);
      car.spinTime = lerp(snapFrom.spinTime, snapTo.spinTime, t);
      car.drifting = snapTo.drifting;
      car.driftAngle = lerp(snapFrom.driftAngle, snapTo.driftAngle, t);
      car.driftScore = snapTo.driftScore;
      car.driftCombo = snapTo.driftCombo;
      car.currentDriftPoints = lerp(snapFrom.currentDriftPoints, snapTo.currentDriftPoints, t);
      car.maxDriftCombo = snapTo.maxDriftCombo;
      car.currentItem = snapTo.currentItem;
      car.gravityFlipped = snapTo.gravityFlipped;
      car.gravityFlipAnim = snapTo.gravityFlipAnim;
      car.scale = snapTo.scale;
      car.isGhost = snapTo.isGhost;
      car.hasMagnet = snapTo.hasMagnet;
      car.hyperBoostTime = lerp(snapFrom.hyperBoostTime, snapTo.hyperBoostTime, t);
    }

    this.currentParticles = to.particles.map((p) => ({ ...p }));
    this.currentTireMarks = to.tireMarks.map((tm) => ({ ...tm }));
    this.currentBananas = to.bananas.map((b) => ({ ...b }));
    this.currentMissiles = to.missiles.map((m) => ({ ...m }));
    this.currentMines = (to.mines || []).map((m) => ({ ...m }));
    this.currentLightnings = (to.lightnings || []).map((l) => ({ ...l }));

    const fromObs = from.obstacles || [];
    const toObs = to.obstacles || [];
    this.currentObstacles = toObs.map((toO, i) => {
      const fromO = fromObs[i];
      if (!fromO) return { ...toO };
      return {
        ...toO,
        x: lerp(fromO.x, toO.x, t),
        y: lerp(fromO.y, toO.y, t),
        angle: lerp(fromO.angle, toO.angle, t),
        hitFlash: lerp(fromO.hitFlash, toO.hitFlash, t),
      };
    });
  }

  tick(ts: number) {
    if (this.lastTickTime === 0) {
      this.lastTickTime = ts;
    }
    const dt = ts - this.lastTickTime;
    this.lastTickTime = ts;

    if (!this.playing) {
      this.applyFrame(this.currentFrameIdx);
      return;
    }

    const framesPerMs = 1000 / RECORD_INTERVAL;
    const scaledDt = dt * this.playbackSpeed;
    this.accumulator += scaledDt * framesPerMs;

    while (this.accumulator >= 1) {
      this.accumulator -= 1;
      this.currentFrameIdx++;
      if (this.currentFrameIdx >= this.data.frames.length - 1) {
        this.currentFrameIdx = this.data.frames.length - 1;
        this.playing = false;
        this.accumulator = 0;
      }
      this.onFrameChange?.(this.currentFrameIdx);
    }

    if (this.currentFrameIdx < this.data.frames.length - 1) {
      const t = clamp(this.accumulator, 0, 1);
      this.interpolateFrame(this.currentFrameIdx, this.currentFrameIdx + 1, t);
    } else {
      this.applyFrame(this.currentFrameIdx);
    }
  }
}

export function formatReplaySpeed(speed: number): string {
  if (speed >= 1) return `${speed.toFixed(speed % 1 === 0 ? 0 : 1)}x`;
  return `1/${Math.round(1 / speed)}x`;
}
