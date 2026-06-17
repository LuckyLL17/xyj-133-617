import { useEffect, useRef } from 'react';
import { useGameStore, TOTAL_LAPS } from '../store/gameStore';
import { Renderer } from '../engine/renderer';
import type {
  Car, TireMark, Particle, ItemBoxInstance, BananaInstance, MissileInstance, Camera, InputState,
  GameMode, SplitScreenLayout, EnvConfig, ReplayData, WeatherType, TimeOfDay, Obstacle, WackyState,
  MineInstance, LightningInstance,
} from '../engine/types';
import { InputManager } from '../engine/input';
import { MAIN_TRACK, getStartPositions, getItemBoxPositions, buildTrackFromCustom, getTrackById } from '../engine/track';
import type { Track } from '../engine/types';
import { CAR_TEMPLATES, getCarTemplate } from '../engine/cars';
import {
  updateCarPhysics, nearestTrackIdx, nearestTrackIdxSameZ, checkCarCollision, resolveCarCollision, isInBoostZone,
  updateWackyGravity, GRAVITY_FLIP_INTERVAL, GRAVITY_WARNING_TIME,
} from '../engine/physics';
import { updateAI } from '../engine/ai';
import {
  createItemBoxes, updateItemBoxes, tryCollectItemBox, activateItem,
  updateBananas, updateMissiles, updateParticles, updateMines, updateLightnings,
  updateCarItemEffects, spawnBoostFlame, spawnAccelTrail, spawnCollisionSparks,
  spawnMissileExplosion, spawnNitroBurst, spawnFinishLineEffect, spawnDriftMarks,
} from '../engine/items';
import { createObstacles, updateObstacles, updateObstacleCollisions } from '../engine/obstacles';
import { lerp, clamp } from '../utils/math';
import { ReplayRecorder, ReplayPlayer } from '../engine/replay';

export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const phase = useGameStore((s) => s.phase);
  const countdown = useGameStore((s) => s.countdown);
  const setCountdown = useGameStore((s) => s.setCountdown);
  const setPhase = useGameStore((s) => s.setPhase);
  const gameMode = useGameStore((s) => s.gameMode);
  const playerCount = useGameStore((s) => s.playerCount);
  const splitLayout = useGameStore((s) => s.splitLayout);
  const selectedCarIdP1 = useGameStore((s) => s.selectedCarIdP1);
  const selectedCarIdP2 = useGameStore((s) => s.selectedCarIdP2);
  const customizationP1 = useGameStore((s) => s.customizationP1);
  const customizationP2 = useGameStore((s) => s.customizationP2);
  const finishRace = useGameStore((s) => s.finishRace);
  const updateRaceTime = useGameStore((s) => s.updateRaceTime);
  const weather = useGameStore((s) => s.weather);
  const timeOfDay = useGameStore((s) => s.timeOfDay);
  const replayData = useGameStore((s) => s.replayData);
  const startReplay = useGameStore((s) => s.startReplay);
  const setReplayFrameIndex = useGameStore((s) => s.setReplayFrameIndex);
  const useCustomTrack = useGameStore((s) => s.useCustomTrack);
  const customTrack = useGameStore((s) => s.customTrack);
  const selectedTrackId = useGameStore((s) => s.selectedTrackId);
  const obstaclesEnabled = useGameStore((s) => s.obstaclesEnabled);
  const wackyMode = useGameStore((s) => s.wackyMode);
  const activeTrack: Track = useCustomTrack
    ? buildTrackFromCustom(customTrack)
    : (selectedTrackId ? getTrackById(selectedTrackId) : MAIN_TRACK);

  const stateRef = useRef<{
    cars: Car[];
    tireMarks: TireMark[];
    particles: Particle[];
    itemBoxes: ItemBoxInstance[];
    bananas: BananaInstance[];
    missiles: MissileInstance[];
    mines: MineInstance[];
    lightnings: LightningInstance[];
    obstacles: Obstacle[];
    cameras: Camera[];
    renderer: Renderer | null;
    input: InputManager | null;
    lastTime: number;
    raceStartTime: number;
    countdownTimer: number;
    countdownValue: number;
    initialized: boolean;
    raceFinished: boolean;
    rankings: number[];
    lastFrameTs: number;
    globalTime: number;
    gameMode: GameMode;
    playerCount: 1 | 2;
    splitLayout: SplitScreenLayout;
    recorder: ReplayRecorder;
    replayPlayer: ReplayPlayer | null;
    replayData: ReplayData | null;
    env: EnvConfig;
    phase: string;
    obstaclesEnabled: boolean;
    wacky: WackyState;
  } | null>(null);

  if (!stateRef.current) {
    stateRef.current = {
      cars: [],
      tireMarks: [],
      particles: [],
      itemBoxes: [],
      bananas: [],
      missiles: [],
      mines: [],
      lightnings: [],
      obstacles: [],
      cameras: [
        { x: 1000, y: 800, zoom: 1, shake: 0 },
        { x: 1000, y: 800, zoom: 1, shake: 0 },
      ],
      renderer: null,
      input: null,
      lastTime: 0,
      raceStartTime: 0,
      countdownTimer: 0,
      countdownValue: 3,
      initialized: false,
      raceFinished: false,
      rankings: [],
      lastFrameTs: 0,
      globalTime: 0,
      gameMode: 'grandprix',
      playerCount: 1,
      splitLayout: 'horizontal',
      recorder: new ReplayRecorder(),
      replayPlayer: null,
      replayData: null,
      env: { weather: 'clear', timeOfDay: 'day' },
      phase: 'menu',
      obstaclesEnabled: true,
      wacky: { enabled: false, gravityDir: 1, flipTimer: GRAVITY_FLIP_INTERVAL, warningTimer: GRAVITY_WARNING_TIME, flipping: false, flipAnimProgress: 0 },
    };
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;

    const st = stateRef.current!;
    st.gameMode = gameMode;
    st.playerCount = playerCount;
    st.splitLayout = splitLayout;
    st.env = { weather: weather as WeatherType, timeOfDay: timeOfDay as TimeOfDay };
    st.phase = phase;
    st.obstaclesEnabled = obstaclesEnabled;
    st.wacky = { ...st.wacky, enabled: wackyMode };

    if (phase === 'replay' && replayData && (!st.replayPlayer || st.replayData !== replayData)) {
      st.replayPlayer = new ReplayPlayer(replayData);
      st.replayData = replayData;
      st.replayPlayer.setOnFrameChange((idx) => setReplayFrameIndex(idx));
      st.env = replayData.env;
    }
    if (phase !== 'replay') {
      st.replayPlayer = null;
    }

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = false;
      if (st.renderer) st.renderer.resize(w, h);
      else st.renderer = new Renderer(ctx, w, h);
      st.renderer.setEnv(st.env);
    };
    resize();
    window.addEventListener('resize', resize);

    const input = new InputManager();
    st.input = input;

    const initializeCars = () => {
      let carIds: number[] = [];
      let isPlayerFlags: boolean[] = [];
      let playerIndices: (0 | 1 | -1)[] = [];

      if (st.gameMode === 'timeattack' || st.gameMode === 'drift') {
        if (st.playerCount === 2) {
          carIds = [selectedCarIdP1, selectedCarIdP2];
          isPlayerFlags = [true, true];
          playerIndices = [0, 1];
        } else {
          carIds = [selectedCarIdP1];
          isPlayerFlags = [true];
          playerIndices = [0];
        }
      } else if (st.playerCount === 2) {
        carIds = [selectedCarIdP1, selectedCarIdP2];
        isPlayerFlags = [true, true];
        playerIndices = [0, 1];
      } else {
        const aiIds = CAR_TEMPLATES.map((c) => c.id).filter((id) => id !== selectedCarIdP1).slice(0, 3);
        carIds = [selectedCarIdP1, ...aiIds];
        isPlayerFlags = carIds.map((_, i) => i === 0);
        playerIndices = carIds.map((_, i) => (i === 0 ? 0 : -1) as (0 | 1 | -1));
      }

      const starts = getStartPositions(activeTrack, carIds.length);
      const aiSkills = [0, 0.82, 0.68, 0.76];

      const getCustomizationForCar = (tplId: number, isPlayer: boolean, playerIdx: 0 | 1 | -1) => {
        if (isPlayer) {
          return playerIdx === 0
            ? { ...customizationP1 }
            : { ...customizationP2 };
        }
        const tpl = getCarTemplate(tplId);
        return {
          bodyColor: tpl.color,
          stripeColor: '#ffffff',
          stripePattern: 'none' as const,
          stripeEnabled: false,
          numberColor: '#ffffff',
          number: `0${tplId + 1}`,
          numberEnabled: true,
          wheelColor: '#111111',
        };
      };

      st.cars = carIds.map((tplId, i) => {
        const tpl = getCarTemplate(tplId);
        const pos = starts[i];
        const isPlayer = isPlayerFlags[i];
        let stats = {
          maxSpeed: tpl.maxSpeed,
          acceleration: tpl.acceleration,
          handling: tpl.handling,
          friction: tpl.friction,
        };
        if (isPlayer) {
          stats = useGameStore.getState().getUpgradedCarStats(tplId);
        }
        return {
          id: i,
          name: tpl.name,
          color: tpl.color,
          colorDark: tpl.colorDark,
          x: pos.x,
          y: pos.y,
          z: 0,
          angle: pos.angle,
          speed: 0,
          maxSpeed: stats.maxSpeed,
          acceleration: stats.acceleration,
          handling: stats.handling,
          friction: stats.friction,
          isPlayer: isPlayerFlags[i],
          playerIndex: playerIndices[i],
          lap: 0,
          checkpoint: -1,
          bestLapTime: Infinity,
          currentLapStartTime: 0,
          totalTime: 0,
          finished: false,
          finishTime: 0,
          hasShield: false,
          shieldTime: 0,
          boostTime: 0,
          spinTime: 0,
          currentItem: null,
          drifting: false,
          driftAngle: 0,
          tireMarkTimer: 0,
          driftScore: 0,
          driftCombo: 0,
          currentDriftPoints: 0,
          maxDriftCombo: 0,
          driftComboTimer: 0,
          gravityFlipped: false,
          gravityFlipAnim: 0,
          aiTargetIdx: 0,
          aiSkill: isPlayerFlags[i] ? 0 : aiSkills[i] ?? 0.7,
          itemCooldown: 0,
          customization: getCustomizationForCar(tplId, isPlayerFlags[i], playerIndices[i]),
          scale: 1,
          scaleTime: 0,
          isGhost: false,
          ghostTime: 0,
          hasMagnet: false,
          magnetTime: 0,
          hyperBoostTime: 0,
        };
      });

      st.tireMarks = [];
      st.particles = [];
      st.bananas = [];
      st.missiles = [];
      st.mines = [];
      st.lightnings = [];
      st.obstacles = st.obstaclesEnabled ? createObstacles(activeTrack) : [];
      st.raceFinished = false;
      st.rankings = [];
      st.wacky = {
        enabled: wackyMode,
        gravityDir: 1,
        flipTimer: GRAVITY_FLIP_INTERVAL,
        warningTimer: GRAVITY_WARNING_TIME,
        flipping: false,
        flipAnimProgress: 0,
      };
      st.cameras.forEach((c) => { c.shake = 0; });

      if (st.gameMode !== 'timeattack' && st.gameMode !== 'drift') {
        st.itemBoxes = createItemBoxes(activeTrack);
        getItemBoxPositions(activeTrack).forEach((p, i) => {
          if (st.itemBoxes[i]) {
            st.itemBoxes[i].x = p.x;
            st.itemBoxes[i].y = p.y;
          }
        });
      } else {
        st.itemBoxes = [];
      }
    };

    const setupRecording = () => {
      st.recorder = new ReplayRecorder();
      st.recorder.start(
        st.cars.map((c) => ({ ...c })),
        st.gameMode,
        st.playerCount,
        activeTrack.laps,
        st.env,
      );
    };

    initializeCars();
    if (phase === 'countdown' || phase === 'racing' || phase === 'finished') {
      setupRecording();
    }
    st.countdownValue = 3;
    st.countdownTimer = 0;
    st.initialized = true;
    setCountdown(3);

    input.onSpacePress = (playerIdx: 0 | 1) => {
      if (useGameStore.getState().phase !== 'racing') return;
      const player = st.cars.find((c) => c.isPlayer && c.playerIndex === playerIdx);
      if (!player || player.finished) return;
      if (st.gameMode === 'timeattack' || st.gameMode === 'drift') return;
      const used = activateItem(player, st.cars, st.bananas, st.missiles, st.particles, st.mines, st.lightnings);
      if (used === 'boost') {
        st.cameras[playerIdx].shake = 8;
        spawnNitroBurst(player, st.particles, false);
      }
      if (used === 'hyperboost') {
        st.cameras[playerIdx].shake = 12;
        spawnNitroBurst(player, st.particles, true);
      }
    };

    const getInputForCar = (car: Car): InputState => {
      if (!car.isPlayer) {
        return updateAI(car, activeTrack, 16);
      }
      if (car.playerIndex === 0) {
        return st.input!.stateP1;
      }
      return st.input!.stateP2;
    };

    const updateCameraForCar = (car: Car, camera: Camera) => {
      const targetZoom = 1 - clamp(Math.abs(car.speed) / (car.maxSpeed * 2), 0, 0.12);
      camera.zoom = lerp(camera.zoom, targetZoom, 0.05);
      const speedFactor = Math.abs(car.speed) / car.maxSpeed;
      const lookAhead = 80 * speedFactor;
      const tx = car.x + Math.cos(car.angle) * lookAhead;
      const ty = car.y + Math.sin(car.angle) * lookAhead;
      camera.x = lerp(camera.x, tx, 0.1);
      camera.y = lerp(camera.y, ty, 0.1);
      camera.shake = Math.max(0, camera.shake - 0.5);
    };

    const renderScene = (camera: Camera, ts: number, envOverride?: EnvConfig) => {
      const renderer = st.renderer!;
      if (envOverride) renderer.setEnv(envOverride);
      else renderer.setEnv(st.env);

      renderer.updateWeather(16, camera);
      renderer.beginCamera(camera);
      renderer.drawGrassTexture(activeTrack);

      const maxZ = renderer.getMaxZ(activeTrack);

      renderer.drawBridgeShadows(activeTrack);

      renderer.drawTrack(activeTrack, ts, 0);
      renderer.drawRoadWet(activeTrack);

      const tireMarksByZ: Record<number, typeof st.tireMarks> = {};
      for (const m of st.tireMarks) {
        const z = m.z ?? 0;
        if (!tireMarksByZ[z]) tireMarksByZ[z] = [];
        tireMarksByZ[z].push(m);
      }
      if (tireMarksByZ[0]) renderer.drawTireMarks(tireMarksByZ[0]);

      if (st.gameMode !== 'timeattack' && st.gameMode !== 'drift') {
        const filterItemsByZ = <T extends { x: number; y: number }>(items: T[], z: number): T[] => {
          return items.filter((item) => {
            let bestIdx = 0, bestDist = Infinity;
            for (let i = 0; i < activeTrack.points.length; i++) {
              const p = activeTrack.points[i];
              const dx = p.x - item.x, dy = p.y - item.y;
              const d = dx * dx + dy * dy;
              if (d < bestDist) { bestDist = d; bestIdx = i; }
            }
            return Math.round(activeTrack.points[bestIdx].z ?? 0) === z;
          });
        };

        const itemsZ0 = filterItemsByZ(st.itemBoxes, 0);
        const bananasZ0 = filterItemsByZ(st.bananas, 0);
        const missilesZ0 = filterItemsByZ(st.missiles, 0);
        const minesZ0 = filterItemsByZ(st.mines, 0);

        renderer.drawItemBoxes(itemsZ0, ts, 0);
        renderer.drawBananas(bananasZ0, 0);
        renderer.drawMissiles(missilesZ0, 0);
        renderer.drawMines(minesZ0, ts, 0);
        renderer.drawLightnings(st.lightnings, st.cars, ts);
      }

      if (st.obstaclesEnabled) {
        renderer.drawObstacles(st.obstacles, ts);
      }

      const carsByZ: Record<number, typeof st.cars> = {};
      for (const c of st.cars) {
        const z = Math.round(c.z);
        if (!carsByZ[z]) carsByZ[z] = [];
        carsByZ[z].push(c);
      }

      const carsZ0 = carsByZ[0] ?? [];
      const sortedZ0 = [...carsZ0].sort((a, b) => a.y - b.y);
      for (const car of sortedZ0) {
        renderer.drawCar(car, ts);
      }

      const particlesByZ: Record<number, typeof st.particles> = {};
      for (const p of st.particles) {
        const z = p.z ?? 0;
        if (!particlesByZ[z]) particlesByZ[z] = [];
        particlesByZ[z].push(p);
      }
      if (particlesByZ[0]) renderer.drawParticles(particlesByZ[0], 0);

      renderer.drawBridgeStructures(activeTrack);

      for (let z = 1; z <= maxZ; z++) {
        renderer.drawTrack(activeTrack, ts, z);

        if (tireMarksByZ[z]) renderer.drawTireMarks(tireMarksByZ[z]);

        if (st.gameMode !== 'timeattack' && st.gameMode !== 'drift') {
          const filterItemsByZ = <T extends { x: number; y: number }>(items: T[], targetZ: number): T[] => {
            return items.filter((item) => {
              let bestIdx = 0, bestDist = Infinity;
              for (let i = 0; i < activeTrack.points.length; i++) {
                const p = activeTrack.points[i];
                const dx = p.x - item.x, dy = p.y - item.y;
                const d = dx * dx + dy * dy;
                if (d < bestDist) { bestDist = d; bestIdx = i; }
              }
              return Math.round(activeTrack.points[bestIdx].z ?? 0) === targetZ;
            });
          };

          const itemsZ = filterItemsByZ(st.itemBoxes, z);
          const bananasZ = filterItemsByZ(st.bananas, z);
          const missilesZ = filterItemsByZ(st.missiles, z);
          const minesZ = filterItemsByZ(st.mines, z);

          renderer.drawItemBoxes(itemsZ, ts, z);
          renderer.drawBananas(bananasZ, z);
          renderer.drawMissiles(missilesZ, z);
          renderer.drawMines(minesZ, ts, z);
        }

        const carsZ = carsByZ[z] ?? [];
        const sortedZ = [...carsZ].sort((a, b) => a.y - b.y);
        for (const car of sortedZ) {
          renderer.drawCar(car, ts);
        }

        if (particlesByZ[z]) renderer.drawParticles(particlesByZ[z], z);
      }

      renderer.drawWeatherParticles();
      renderer.endCamera();
      renderer.drawFog();
      renderer.drawTimeTint();
      renderer.drawVignette();
      renderer.drawScanlines(ts);
      if (st.wacky.enabled) {
        renderer.drawWackyGravityIndicator(st.wacky, ts);
      }
    };

    const getViewports = (): { x: number; y: number; width: number; height: number }[] => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      if (st.playerCount === 1 && st.phase !== 'replay') {
        return [{ x: 0, y: 0, width: w, height: h }];
      }
      if (st.phase === 'replay') {
        return [{ x: 0, y: 0, width: w, height: h }];
      }
      if (st.splitLayout === 'horizontal') {
        return [
          { x: 0, y: 0, width: w, height: h / 2 },
          { x: 0, y: h / 2, width: w, height: h / 2 },
        ];
      }
      return [
        { x: 0, y: 0, width: w / 2, height: h },
        { x: w / 2, y: 0, width: w / 2, height: h },
      ];
    };

    let rafId = 0;
    const loop = (ts: number) => {
      const dt = Math.min(40, ts - (st.lastFrameTs || ts));
      st.lastFrameTs = ts;
      st.globalTime = ts;
      if (!st.renderer) {
        rafId = requestAnimationFrame(loop);
        return;
      }

      const currentPhase = useGameStore.getState().phase;
      st.phase = currentPhase;

      if (currentPhase === 'replay' && st.replayPlayer) {
        const rp = st.replayPlayer;
        const store = useGameStore.getState();
        if (store.replayPlaying !== rp.isPlaying()) {
          if (store.replayPlaying) rp.play();
          else rp.pause();
        }
        if (Math.abs(store.replaySpeed - rp.getSpeed()) > 0.001) {
          rp.setSpeed(store.replaySpeed);
        }
        if (store.replayViewMode !== rp.getViewMode()) {
          rp.setViewMode(store.replayViewMode);
        }
        if (store.replayFrameIndex !== rp.getCurrentFrameIndex() && !rp.isPlaying()) {
          rp.seek(store.replayFrameIndex);
        }

        rp.tick(ts);
        st.cars = rp.getCars();
        st.particles = rp.getParticles();
        st.tireMarks = rp.getTireMarks();
        st.bananas = rp.getBananas();
        st.missiles = rp.getMissiles();
        st.mines = rp.getMines();
        st.lightnings = rp.getLightnings();
        st.obstacles = rp.getObstacles();
        st.gameMode = rp.getGameMode();
        st.playerCount = rp.getPlayerCount();
        const rt = rp.getCurrentRaceTime();
        if (useGameStore.getState().raceTime !== rt) {
          updateRaceTime(rt);
        }
      }

      if (currentPhase === 'countdown') {
        st.countdownTimer += dt;
        if (st.countdownTimer >= 1000) {
          st.countdownTimer = 0;
          st.countdownValue -= 1;
          if (st.countdownValue <= 0) {
            setPhase('racing');
            st.raceStartTime = ts;
            st.cars.forEach((c) => { c.currentLapStartTime = ts; });
          }
          setCountdown(st.countdownValue);
          st.cameras.forEach((c) => { c.shake = 6; });
        }
      }

      if (currentPhase === 'racing') {
        const elapsed = ts - st.raceStartTime;
        updateRaceTime(elapsed);

        for (let i = 0; i < st.cars.length; i++) {
          const car = st.cars[i];
          const inp: InputState = getInputForCar(car);

          if (!car.isPlayer && inp.space && st.gameMode !== 'timeattack' && st.gameMode !== 'drift') {
            const used = activateItem(car, st.cars, st.bananas, st.missiles, st.particles, st.mines, st.lightnings);
            if (used === 'boost') spawnNitroBurst(car, st.particles, false);
            if (used === 'hyperboost') spawnNitroBurst(car, st.particles, true);
          }

          if (car.itemCooldown > 0) car.itemCooldown -= dt;

          updateCarPhysics(car, inp, dt, activeTrack, st.env, st.wacky.enabled ? st.wacky : null);

          if (car.boostTime > 0) {
            spawnBoostFlame(car, st.particles, car.hyperBoostTime > 0 ? 1.8 : 1);
          }
          if (inp.up && car.speed > 0.5) {
            spawnAccelTrail(car, st.particles);
          }
          spawnDriftMarks(car, st.particles);

          if (car.drifting && car.tireMarkTimer > 40) {
            car.tireMarkTimer = 0;
            const back = car.angle + Math.PI;
            for (const side of [-1, 1]) {
              const px = car.x + Math.cos(back) * 12 + Math.cos(back + Math.PI / 2) * side * 7;
              const py = car.y + Math.sin(back) * 12 + Math.sin(back + Math.PI / 2) * side * 7;
              const markAlpha = car.boostTime > 0 ? 0.7 : 0.5;
              st.tireMarks.push({ x: px, y: py, z: car.z, angle: car.angle, alpha: markAlpha });
            }
            if (Math.random() < 0.4) {
              st.particles.push({
                x: car.x + (Math.random() - 0.5) * 10,
                y: car.y + (Math.random() - 0.5) * 10,
                z: car.z,
                vx: (Math.random() - 0.5) * 0.8,
                vy: (Math.random() - 0.5) * 0.8,
                life: 500, maxLife: 500,
                color: st.env.weather === 'rain' ? '#88aacc' : '#aaaaaa', size: 3,
              });
            }
          }

          const absSpeed = Math.abs(car.speed);
          const driftAngleAbs = Math.abs(car.driftAngle);
          if (car.drifting && absSpeed > car.maxSpeed * 0.3) {
            const basePoints = (absSpeed / car.maxSpeed) * 2.5;
            const angleBonus = driftAngleAbs * 8;
            car.currentDriftPoints += (basePoints + angleBonus) * (dt / 16);
            car.driftComboTimer = 1500;
          } else if (!car.drifting && car.currentDriftPoints > 0) {
            if (car.driftComboTimer > 0) {
              car.driftCombo += 1;
              if (car.driftCombo > car.maxDriftCombo) {
                car.maxDriftCombo = car.driftCombo;
              }
            } else {
              car.driftCombo = 1;
              car.maxDriftCombo = Math.max(car.maxDriftCombo, 1);
            }
            const comboMultiplier = 1 + (car.driftCombo - 1) * 0.25;
            const earnedPoints = Math.floor(car.currentDriftPoints * comboMultiplier);
            car.driftScore += earnedPoints;
            car.currentDriftPoints = 0;
            car.driftComboTimer = 1500;
          }
          if (car.driftComboTimer > 0) {
            car.driftComboTimer -= dt;
            if (car.driftComboTimer <= 0 && !car.drifting) {
              car.driftCombo = 0;
            }
          }

          if (isInBoostZone(car.x, car.y, activeTrack)) {
            if (Math.random() < 0.3) {
              st.particles.push({
                x: car.x + (Math.random() - 0.5) * 16,
                y: car.y + (Math.random() - 0.5) * 16,
                z: car.z,
                vx: -Math.cos(car.angle) * 0.6 + (Math.random() - 0.5) * 0.4,
                vy: -Math.sin(car.angle) * 0.6 + (Math.random() - 0.5) * 0.4,
                life: 300, maxLife: 300,
                color: '#ffee66', size: 3,
              });
            }
          }

          if (car.boostTime > 0 && Math.random() < 0.6) {
            const back = car.angle + Math.PI;
            st.particles.push({
              x: car.x + Math.cos(back) * 14 + (Math.random() - 0.5) * 4,
              y: car.y + Math.sin(back) * 14 + (Math.random() - 0.5) * 4,
              z: car.z,
              vx: Math.cos(back) * 1.2 + (Math.random() - 0.5) * 0.5,
              vy: Math.sin(back) * 1.2 + (Math.random() - 0.5) * 0.5,
              life: 350, maxLife: 350,
              color: Math.random() < 0.5 ? '#ffaa00' : '#ff6600',
              size: 3,
            });
          }

          if (car.spinTime > 100 && Math.random() < 0.5) {
            st.particles.push({
              x: car.x + (Math.random() - 0.5) * 20,
              y: car.y + (Math.random() - 0.5) * 20,
              z: car.z,
              vx: (Math.random() - 0.5) * 2,
              vy: (Math.random() - 0.5) * 2,
              life: 400, maxLife: 400,
              color: '#ff8800', size: 3,
            });
          }
        }

        for (let i = 0; i < st.cars.length; i++) {
          for (let j = i + 1; j < st.cars.length; j++) {
            if (checkCarCollision(st.cars[i], st.cars[j])) {
              const c1 = st.cars[i];
              const c2 = st.cars[j];
              const hitX = (c1.x + c2.x) / 2;
              const hitY = (c1.y + c2.y) / 2;
              const hitZ = Math.max(c1.z, c2.z);
              const relSpeed = Math.abs(c1.speed - c2.speed);
              spawnCollisionSparks(hitX, hitY, hitZ, st.particles, 0.6 + relSpeed * 0.15);
              resolveCarCollision(c1, c2);
              if (c1.isPlayer && c1.playerIndex >= 0) {
                st.cameras[c1.playerIndex].shake = Math.max(st.cameras[c1.playerIndex].shake, 4 + relSpeed * 0.5);
              }
              if (c2.isPlayer && c2.playerIndex >= 0) {
                st.cameras[c2.playerIndex].shake = Math.max(st.cameras[c2.playerIndex].shake, 4 + relSpeed * 0.5);
              }
            }
          }
        }

        if (st.wacky.enabled) {
          const prevWacky = st.wacky;
          st.wacky = updateWackyGravity(st.wacky, dt, st.cars);
          if (st.wacky.flipping && !prevWacky.flipping) {
            st.cameras.forEach((c) => { c.shake = 12; });
            for (const car of st.cars) {
              st.particles.push({
                x: car.x + (Math.random() - 0.5) * 20,
                y: car.y + (Math.random() - 0.5) * 20,
                z: car.z,
                vx: (Math.random() - 0.5) * 3,
                vy: (Math.random() - 0.5) * 3,
                life: 600, maxLife: 600,
                color: '#ff00ff', size: 4,
              });
            }
          }
        }

        const checkpoints = activeTrack.checkpoints;
        for (const car of st.cars) {
          if (car.finished) continue;
          const idx = nearestTrackIdxSameZ(car.x, car.y, activeTrack, car.z);
          const nextSeqIdx = (car.checkpoint + 1) % checkpoints.length;
          const nextTrackIdx = checkpoints[nextSeqIdx];
          const nextZ = Math.round(activeTrack.points[nextTrackIdx].z ?? 0);
          const carZRounded = Math.round(car.z);
          const nearCheckpoint = (idx === nextTrackIdx || Math.abs(idx - nextTrackIdx) <= 2) && nextZ === carZRounded;
          if (nearCheckpoint) {
            const prevSeqIdx = car.checkpoint;
            car.checkpoint = nextSeqIdx;
            if (nextSeqIdx === 0 && prevSeqIdx === checkpoints.length - 1) {
              const lapTime = ts - car.currentLapStartTime;
              if (lapTime > 5000 && lapTime < car.bestLapTime) {
                car.bestLapTime = lapTime;
              }
              car.lap += 1;
              car.currentLapStartTime = ts;
              spawnFinishLineEffect(car, st.particles);
              if (car.isPlayer) {
                st.cameras[car.playerIndex].shake = Math.max(st.cameras[car.playerIndex].shake, 8);
              }
              if (car.lap >= activeTrack.laps) {
                car.finished = true;
                car.finishTime = ts - st.raceStartTime;
                if (!st.rankings.includes(car.id)) {
                  st.rankings.push(car.id);
                }
                if (car.isPlayer) {
                  st.cameras[car.playerIndex].shake = 16;
                }
                const allFinished = st.rankings.length >= st.cars.length;
                const anyPlayerFinished = st.cars.some((c) => c.isPlayer && c.finished);
                if (!st.raceFinished && (allFinished || anyPlayerFinished)) {
                  st.raceFinished = true;
                  st.recorder.finish(st.rankings);
                  const recData = st.recorder.getData();
                  setTimeout(() => {
                    const finalRank = [...st.rankings];
                    for (const c of st.cars) {
                      if (!finalRank.includes(c.id)) finalRank.push(c.id);
                    }
                    const winner = finalRank[0];
                    if (recData) {
                      (window as unknown as { __lastReplay?: ReplayData }).__lastReplay = recData;
                    }
                    finishRace(winner, finalRank);
                  }, 1500);
                }
              }
            }
          }
        }

        if (st.gameMode !== 'timeattack' && st.gameMode !== 'drift') {
          for (const car of st.cars) {
            if (!car.finished) tryCollectItemBox(car, st.itemBoxes, activeTrack);
            updateCarItemEffects(car, st.particles, dt);
          }
          updateItemBoxes(st.itemBoxes, dt);
          updateBananas(st.bananas, st.cars, st.particles, activeTrack, dt);
          updateMissiles(st.missiles, st.cars, st.particles, dt);
          updateMines(st.mines, st.cars, st.particles, activeTrack, dt);
          updateLightnings(st.lightnings, st.cars, st.particles, dt);
        }
        if (st.obstaclesEnabled) {
          updateObstacles(st.obstacles, activeTrack, dt, ts);
          updateObstacleCollisions(st.obstacles, st.cars, st.particles, st.cameras);
        }
        updateParticles(st.particles, dt);

        for (let i = st.tireMarks.length - 1; i >= 0; i--) {
          st.tireMarks[i].alpha -= 0.0015 * dt / 16;
          if (st.tireMarks[i].alpha <= 0) st.tireMarks.splice(i, 1);
        }

        const elapsedRec = ts - st.raceStartTime;
        st.recorder.record(
          st.cars, st.particles, st.tireMarks,
          st.bananas, st.missiles, st.mines, st.lightnings, st.obstacles, elapsedRec, ts,
        );
      }

      if (currentPhase !== 'replay') {
        for (const car of st.cars) {
          if (car.isPlayer && car.playerIndex >= 0) {
            updateCameraForCar(car, st.cameras[car.playerIndex]);
          }
        }
      }

      const renderer = st.renderer;
      renderer.clear();

      const viewports = getViewports();
      const playerCars = st.cars.filter((c) => c.isPlayer);

      for (let vIdx = 0; vIdx < viewports.length; vIdx++) {
        const vp = viewports[vIdx];
        let camera: Camera;
        let playerCar: Car | undefined;

        if (currentPhase === 'replay' && st.replayPlayer) {
          camera = st.replayPlayer.getCameraForViewport(vIdx);
          playerCar = playerCars[vIdx];
        } else {
          const camIdx = playerCars[vIdx]?.playerIndex ?? 0;
          camera = st.cameras[camIdx];
          playerCar = playerCars[vIdx];
        }

        renderer.setViewport(vp);
        renderer.clearViewport();
        renderScene(camera, ts, currentPhase === 'replay' && st.replayPlayer ? st.replayPlayer.getEnv() : undefined);

        if (currentPhase === 'countdown') {
          renderer.drawCountdown(st.countdownValue, ts);
        }

        if (viewports.length > 1 && playerCar && currentPhase !== 'replay') {
          const indX = 10;
          const indY = 10;
          renderer.drawPlayerIndicator(indX, indY, playerCar.playerIndex as 0 | 1);
        }

        renderer.restoreViewport();
      }

      if (viewports.length > 1 && currentPhase !== 'replay') {
        renderer.drawSplitDivider(st.splitLayout);
      }

      if (phase !== 'finished' && phase !== 'replay') {
        useGameStore.setState({ cars: [...st.cars] });
      } else if (phase === 'replay') {
        useGameStore.setState({ cars: [...st.cars] });
      }

      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
      input.destroy();
    };
  }, [selectedCarIdP1, selectedCarIdP2, gameMode, playerCount, splitLayout, weather, timeOfDay, replayData, wackyMode]);

  useEffect(() => {
    if (phase === 'countdown' && stateRef.current?.initialized) {
      const st = stateRef.current;
      st.gameMode = gameMode;
      st.playerCount = playerCount;
      st.splitLayout = splitLayout;
      st.env = { weather: weather as WeatherType, timeOfDay: timeOfDay as TimeOfDay };

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = window.innerWidth;
      const h = window.innerHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = false;
      if (st.renderer) st.renderer.resize(w, h);
      else st.renderer = new Renderer(ctx, w, h);
      st.renderer.setEnv(st.env);

      let carIds: number[] = [];
      let isPlayerFlags: boolean[] = [];
      let playerIndices: (0 | 1 | -1)[] = [];

      if (st.gameMode === 'timeattack' || st.gameMode === 'drift') {
        if (st.playerCount === 2) {
          carIds = [selectedCarIdP1, selectedCarIdP2];
          isPlayerFlags = [true, true];
          playerIndices = [0, 1];
        } else {
          carIds = [selectedCarIdP1];
          isPlayerFlags = [true];
          playerIndices = [0];
        }
      } else if (st.playerCount === 2) {
        carIds = [selectedCarIdP1, selectedCarIdP2];
        isPlayerFlags = [true, true];
        playerIndices = [0, 1];
      } else {
        const aiIds = CAR_TEMPLATES.map((c) => c.id).filter((id) => id !== selectedCarIdP1).slice(0, 3);
        carIds = [selectedCarIdP1, ...aiIds];
        isPlayerFlags = carIds.map((_, i) => i === 0);
        playerIndices = carIds.map((_, i) => (i === 0 ? 0 : -1) as (0 | 1 | -1));
      }

      const starts = getStartPositions(activeTrack, carIds.length);
      const aiSkills = [0, 0.82, 0.68, 0.76];

      const getCustomizationForCar2 = (tplId: number, isPlayer: boolean, playerIdx: 0 | 1 | -1) => {
        if (isPlayer) {
          return playerIdx === 0
            ? { ...customizationP1 }
            : { ...customizationP2 };
        }
        const tpl = getCarTemplate(tplId);
        return {
          bodyColor: tpl.color,
          stripeColor: '#ffffff',
          stripePattern: 'none' as const,
          stripeEnabled: false,
          numberColor: '#ffffff',
          number: `0${tplId + 1}`,
          numberEnabled: true,
          wheelColor: '#111111',
        };
      };

      st.cars = carIds.map((tplId, i) => {
        const tpl = getCarTemplate(tplId);
        const pos = starts[i];
        return {
          id: i,
          name: tpl.name,
          color: tpl.color,
          colorDark: tpl.colorDark,
          x: pos.x,
          y: pos.y,
          z: 0,
          angle: pos.angle,
          speed: 0,
          maxSpeed: tpl.maxSpeed,
          acceleration: tpl.acceleration,
          handling: tpl.handling,
          friction: tpl.friction,
          isPlayer: isPlayerFlags[i],
          playerIndex: playerIndices[i],
          lap: 0,
          checkpoint: -1,
          bestLapTime: Infinity,
          currentLapStartTime: 0,
          totalTime: 0,
          finished: false,
          finishTime: 0,
          hasShield: false,
          shieldTime: 0,
          boostTime: 0,
          spinTime: 0,
          currentItem: null,
          drifting: false,
          driftAngle: 0,
          tireMarkTimer: 0,
          driftScore: 0,
          driftCombo: 0,
          currentDriftPoints: 0,
          maxDriftCombo: 0,
          driftComboTimer: 0,
          gravityFlipped: false,
          gravityFlipAnim: 0,
          aiTargetIdx: 0,
          aiSkill: isPlayerFlags[i] ? 0 : aiSkills[i] ?? 0.7,
          itemCooldown: 0,
          customization: getCustomizationForCar2(tplId, isPlayerFlags[i], playerIndices[i]),
          scale: 1,
          scaleTime: 0,
          isGhost: false,
          ghostTime: 0,
          hasMagnet: false,
          magnetTime: 0,
          hyperBoostTime: 0,
        };
      });

      st.tireMarks = [];
      st.particles = [];
      st.bananas = [];
      st.missiles = [];
      st.mines = [];
      st.lightnings = [];
      st.obstacles = st.obstaclesEnabled ? createObstacles(activeTrack) : [];
      st.raceFinished = false;
      st.rankings = [];
      st.wacky = {
        enabled: wackyMode,
        gravityDir: 1,
        flipTimer: GRAVITY_FLIP_INTERVAL,
        warningTimer: GRAVITY_WARNING_TIME,
        flipping: false,
        flipAnimProgress: 0,
      };
      st.cameras.forEach((c) => { c.shake = 0; });

      if (st.gameMode !== 'timeattack' && st.gameMode !== 'drift') {
        st.itemBoxes = createItemBoxes(activeTrack);
        getItemBoxPositions(activeTrack).forEach((p, i) => {
          if (st.itemBoxes[i]) {
            st.itemBoxes[i].x = p.x;
            st.itemBoxes[i].y = p.y;
          }
        });
      } else {
        st.itemBoxes = [];
      }

      st.recorder = new ReplayRecorder();
      st.recorder.start(
        st.cars.map((c) => ({ ...c })),
        st.gameMode,
        st.playerCount,
        activeTrack.laps,
        st.env,
      );

      st.countdownValue = 3;
      st.countdownTimer = 0;
      setCountdown(3);
    }
  }, [phase === 'countdown' ? 'countdown-start' : '', gameMode, playerCount, splitLayout, selectedCarIdP1, selectedCarIdP2, weather, timeOfDay, wackyMode]);

  void countdown;
  void startReplay;

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 block"
      style={{ imageRendering: 'pixelated' }}
    />
  );
}
