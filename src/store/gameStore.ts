import { create } from 'zustand';
import type { GamePhase, Car, ItemType, GameMode, SplitScreenLayout, WeatherType, TimeOfDay, ReplayData, ReplayViewMode, CarCustomization, EditorTool, CustomTrack, TrackPoint, CarUpgrades, PlayerProgress, UpgradeType, AIDifficulty, HUDConfig, HUDPanelId, HUDPanelConfig, HUDPlayerConfig } from '../engine/types';
import { CAR_TEMPLATES } from '../engine/cars';
import { calcUpgradeCost, MAX_UPGRADE_LEVEL, UPGRADE_BONUS, CAR_SKINS } from '../engine/skins';
import { DEFAULT_TRACK } from '../engine/track';
import { HUD_PANEL_DEFAULTS } from '../engine/types';

export const AI_DIFFICULTY_SKILL: Record<AIDifficulty, number[]> = {
  easy: [0.25, 0.2, 0.3],
  normal: [0.55, 0.5, 0.6],
  hard: [0.75, 0.7, 0.8],
  expert: [0.92, 0.88, 0.95],
};

export const AI_DIFFICULTY_LABEL: Record<AIDifficulty, string> = {
  easy: '简单',
  normal: '普通',
  hard: '困难',
  expert: '专家',
};

export const AI_DIFFICULTY_DESC: Record<AIDifficulty, string> = {
  easy: 'AI驾驶保守，适合新手练习',
  normal: '标准AI难度，均衡挑战',
  hard: 'AI驾驶激进，需要技巧',
  expert: '顶级AI，完美驾驶线路',
};

export const AI_DIFFICULTY_COLOR: Record<AIDifficulty, string> = {
  easy: '#66ff88',
  normal: '#ffdd33',
  hard: '#ff8833',
  expert: '#ff3366',
};

export const AI_DIFFICULTY_STARS: Record<AIDifficulty, number> = {
  easy: 1,
  normal: 2,
  hard: 3,
  expert: 4,
};

interface GameState {
  phase: GamePhase;
  selectedCarIdP1: number;
  selectedCarIdP2: number;
  gameMode: GameMode;
  playerCount: 1 | 2;
  splitLayout: SplitScreenLayout;
  countdown: number;
  cars: Car[];
  totalLaps: number;
  winnerId: number | null;
  rankings: number[];
  raceTime: number;
  weather: WeatherType;
  timeOfDay: TimeOfDay;
  replayData: ReplayData | null;
  replayPlaying: boolean;
  replaySpeed: number;
  replayViewMode: ReplayViewMode;
  replayFrameIndex: number;
  customizationP1: CarCustomization;
  customizationP2: CarCustomization;
  customizeTarget: 1 | 2;
  editorTool: EditorTool;
  editorSelectedPoint: number | null;
  customTrack: CustomTrack;
  useCustomTrack: boolean;
  savedTracks: CustomTrack[];
  selectedTrackId: string;
  coins: number;
  totalCoinsEarned: number;
  racesWon: number;
  racesPlayed: number;
  upgrades: Record<number, CarUpgrades>;
  ownedSkins: string[];
  selectedSkinP1: string | null;
  selectedSkinP2: string | null;
  lastEarnedCoins: number;
  obstaclesEnabled: boolean;
  wackyMode: boolean;
  aiDifficulty: AIDifficulty;
  setPhase: (p: GamePhase) => void;
  setAIDifficulty: (d: AIDifficulty) => void;
  selectCarP1: (id: number) => void;
  selectCarP2: (id: number) => void;
  setGameMode: (mode: GameMode) => void;
  setPlayerCount: (count: 1 | 2) => void;
  setSplitLayout: (layout: SplitScreenLayout) => void;
  setCountdown: (n: number) => void;
  updateCars: (cars: Car[]) => void;
  updateRaceTime: (t: number) => void;
  finishRace: (winnerId: number, rankings: number[]) => void;
  resetForCountdown: () => void;
  backToMenu: () => void;
  setWeather: (w: WeatherType) => void;
  setTimeOfDay: (t: TimeOfDay) => void;
  startReplay: (data: ReplayData) => void;
  exitReplay: () => void;
  setReplayPlaying: (p: boolean) => void;
  setReplaySpeed: (s: number) => void;
  setReplayViewMode: (m: ReplayViewMode) => void;
  setReplayFrameIndex: (i: number) => void;
  openCustomizer: (target: 1 | 2) => void;
  closeCustomizer: () => void;
  setCustomizeTarget: (target: 1 | 2) => void;
  updateCustomizationP1: (patch: Partial<CarCustomization>) => void;
  updateCustomizationP2: (patch: Partial<CarCustomization>) => void;
  resetCustomization: (target: 1 | 2) => void;
  applyTemplateToCustomization: (target: 1 | 2, templateId: number) => void;
  setEditorTool: (tool: EditorTool) => void;
  setEditorSelectedPoint: (idx: number | null) => void;
  openEditor: () => void;
  closeEditor: () => void;
  addTrackPoint: (point: TrackPoint, insertIndex?: number) => void;
  updateTrackPoint: (index: number, point: Partial<TrackPoint>) => void;
  deleteTrackPoint: (index: number) => void;
  toggleCheckpoint: (index: number) => void;
  toggleBoostZone: (index: number) => void;
  toggleItemBox: (index: number) => void;
  setTrackWidth: (width: number) => void;
  setTrackClosed: (closed: boolean) => void;
  setTrackName: (name: string) => void;
  saveCurrentTrack: () => void;
  loadTrack: (track: CustomTrack) => void;
  deleteSavedTrack: (index: number) => void;
  resetCustomTrack: () => void;
  toggleUseCustomTrack: () => void;
  smoothTrackPoints: () => void;
  openShop: () => void;
  closeShop: () => void;
  addCoins: (amount: number) => void;
  spendCoins: (amount: number) => boolean;
  upgradeCarStat: (carTemplateId: number, stat: UpgradeType) => boolean;
  buySkin: (skinId: string) => boolean;
  selectSkin: (player: 1 | 2, skinId: string | null) => void;
  recordRaceResult: (rank: number, rewardCoins: number) => void;
  getUpgradedCarStats: (carTemplateId: number) => { maxSpeed: number; acceleration: number; handling: number; friction: number };
  applySkinToCustomization: (player: 1 | 2, skinId: string | null) => void;
  toggleObstacles: () => void;
  setObstaclesEnabled: (enabled: boolean) => void;
  toggleWackyMode: () => void;
  setWackyMode: (enabled: boolean) => void;
  selectTrack: (trackId: string) => void;
  hudConfig: HUDConfig;
  setHudEditMode: (enabled: boolean) => void;
  updateHudPanel: (player: 1 | 2, panelId: HUDPanelId, patch: Partial<HUDPanelConfig>) => void;
  toggleHudPanelVisible: (player: 1 | 2, panelId: HUDPanelId) => void;
  resetHudConfig: (player?: 1 | 2) => void;
  setHudPanelScale: (player: 1 | 2, panelId: HUDPanelId, scale: number) => void;
}

export const TOTAL_LAPS = 3;

const createDefaultCustomization = (template: typeof CAR_TEMPLATES[0]): CarCustomization => ({
  bodyColor: template.color,
  stripeColor: '#ffffff',
  stripePattern: 'single',
  stripeEnabled: false,
  numberColor: '#ffffff',
  number: '01',
  numberEnabled: true,
  wheelColor: '#111111',
});

const createDefaultCustomTrack = (): CustomTrack => ({
  name: 'My Track',
  points: [
    { x: 800, y: 600 },
    { x: 1000, y: 500 },
    { x: 1200, y: 600 },
    { x: 1200, y: 800 },
    { x: 1000, y: 900 },
    { x: 800, y: 800 },
  ],
  width: 120,
  checkpoints: [0],
  boostZones: [],
  itemBoxes: [2, 4],
  closed: true,
});

const createDefaultUpgrades = (): Record<number, CarUpgrades> => {
  const upgrades: Record<number, CarUpgrades> = {};
  CAR_TEMPLATES.forEach((tpl) => {
    upgrades[tpl.id] = { speed: 0, acceleration: 0, handling: 0, friction: 0 };
  });
  return upgrades;
};

const createDefaultHudPlayerConfig = (): HUDPlayerConfig => ({
  panels: {
    lapInfo: {
      x: 12,
      y: 12,
      width: HUD_PANEL_DEFAULTS.lapInfo.width,
      height: HUD_PANEL_DEFAULTS.lapInfo.height,
      visible: true,
      scale: 1,
    },
    speedInfo: {
      x: window.innerWidth - HUD_PANEL_DEFAULTS.speedInfo.width - 12,
      y: 12,
      width: HUD_PANEL_DEFAULTS.speedInfo.width,
      height: HUD_PANEL_DEFAULTS.speedInfo.height,
      visible: true,
      scale: 1,
    },
    positionInfo: {
      x: 12,
      y: window.innerHeight - HUD_PANEL_DEFAULTS.positionInfo.height - 12,
      width: HUD_PANEL_DEFAULTS.positionInfo.width,
      height: HUD_PANEL_DEFAULTS.positionInfo.height,
      visible: true,
      scale: 1,
    },
    itemInfo: {
      x: window.innerWidth - HUD_PANEL_DEFAULTS.itemInfo.width - 12,
      y: window.innerHeight - HUD_PANEL_DEFAULTS.itemInfo.height - 12,
      width: HUD_PANEL_DEFAULTS.itemInfo.width,
      height: HUD_PANEL_DEFAULTS.itemInfo.height,
      visible: true,
      scale: 1,
    },
    statusEffects: {
      x: 12,
      y: window.innerHeight / 2 - HUD_PANEL_DEFAULTS.statusEffects.height / 2,
      width: HUD_PANEL_DEFAULTS.statusEffects.width,
      height: HUD_PANEL_DEFAULTS.statusEffects.height,
      visible: true,
      scale: 1,
    },
    wackyInfo: {
      x: window.innerWidth / 2 - HUD_PANEL_DEFAULTS.wackyInfo.width / 2,
      y: window.innerHeight - HUD_PANEL_DEFAULTS.wackyInfo.height - 12,
      width: HUD_PANEL_DEFAULTS.wackyInfo.width,
      height: HUD_PANEL_DEFAULTS.wackyInfo.height,
      visible: true,
      scale: 1,
    },
  },
});

const createDefaultHudConfig = (): HUDConfig => ({
  editMode: false,
  p1: createDefaultHudPlayerConfig(),
  p2: createDefaultHudPlayerConfig(),
});

const loadProgress = (): Partial<PlayerProgress> & { hudConfig?: HUDConfig } => {
  try {
    const saved = localStorage.getItem('pixel_kart_progress');
    if (saved) return JSON.parse(saved);
  } catch {
    // ignore
  }
  return {};
};

const loadHudConfig = (): HUDConfig => {
  try {
    const saved = localStorage.getItem('pixel_kart_hud_config');
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...createDefaultHudConfig(), ...parsed, editMode: false };
    }
  } catch {
    // ignore
  }
  return createDefaultHudConfig();
};

const saveProgress = (state: GameState) => {
  try {
    const progress: PlayerProgress & { hudConfig?: HUDConfig } = {
      coins: state.coins,
      totalCoinsEarned: state.totalCoinsEarned,
      racesWon: state.racesWon,
      racesPlayed: state.racesPlayed,
      upgrades: state.upgrades,
      ownedSkins: state.ownedSkins,
      selectedSkinP1: state.selectedSkinP1,
      selectedSkinP2: state.selectedSkinP2,
      obstaclesEnabled: state.obstaclesEnabled,
      wackyMode: state.wackyMode,
      aiDifficulty: state.aiDifficulty,
    };
    localStorage.setItem('pixel_kart_progress', JSON.stringify(progress));
  } catch {
    // ignore
  }
};

const saveHudConfig = (config: HUDConfig) => {
  try {
    const toSave = { ...config, editMode: false };
    localStorage.setItem('pixel_kart_hud_config', JSON.stringify(toSave));
  } catch {
    // ignore
  }
};

export const useGameStore = create<GameState>((set, get) => {
  const savedProgress = loadProgress();
  const savedHudConfig = loadHudConfig();

  return {
  phase: 'menu',
  selectedCarIdP1: 0,
  selectedCarIdP2: 1,
  gameMode: 'grandprix',
  playerCount: 1,
  splitLayout: 'horizontal',
  countdown: 3,
  cars: [],
  totalLaps: TOTAL_LAPS,
  winnerId: null,
  rankings: [],
  raceTime: 0,
  weather: 'clear',
  timeOfDay: 'day',
  replayData: null,
  replayPlaying: true,
  replaySpeed: 1,
  replayViewMode: 'follow_p1',
  replayFrameIndex: 0,
  customizationP1: createDefaultCustomization(CAR_TEMPLATES[0]),
  customizationP2: createDefaultCustomization(CAR_TEMPLATES[1]),
  customizeTarget: 1,
  editorTool: 'select',
  editorSelectedPoint: null,
  customTrack: createDefaultCustomTrack(),
  useCustomTrack: false,
  savedTracks: [],
  selectedTrackId: DEFAULT_TRACK.id,
  coins: savedProgress.coins ?? 0,
  totalCoinsEarned: savedProgress.totalCoinsEarned ?? 0,
  racesWon: savedProgress.racesWon ?? 0,
  racesPlayed: savedProgress.racesPlayed ?? 0,
  upgrades: savedProgress.upgrades ?? createDefaultUpgrades(),
  ownedSkins: savedProgress.ownedSkins ?? [],
  selectedSkinP1: savedProgress.selectedSkinP1 ?? null,
  selectedSkinP2: savedProgress.selectedSkinP2 ?? null,
  lastEarnedCoins: 0,
  obstaclesEnabled: savedProgress.obstaclesEnabled ?? true,
  wackyMode: savedProgress.wackyMode ?? false,
  aiDifficulty: (savedProgress.aiDifficulty as AIDifficulty) ?? 'normal',
  hudConfig: savedHudConfig,

  setPhase: (p) => set({ phase: p }),
  setAIDifficulty: (d) => {
    const newState = { aiDifficulty: d };
    saveProgress({ ...get(), ...newState });
    set(newState);
  },
  selectCarP1: (id) => set({ selectedCarIdP1: id, customizationP1: createDefaultCustomization(CAR_TEMPLATES[id]) }),
  selectCarP2: (id) => set({ selectedCarIdP2: id, customizationP2: createDefaultCustomization(CAR_TEMPLATES[id]) }),
  setGameMode: (mode) => set({ gameMode: mode }),
  setPlayerCount: (count) => set({ playerCount: count }),
  setSplitLayout: (layout) => set({ splitLayout: layout }),
  setCountdown: (n) => set({ countdown: n }),
  updateCars: (cars) => set({ cars }),
  updateRaceTime: (t) => set({ raceTime: t }),
  setWeather: (w) => set({ weather: w }),
  setTimeOfDay: (t) => set({ timeOfDay: t }),

  finishRace: (winnerId, rankings) => set({
    phase: 'finished',
    winnerId,
    rankings,
  }),

  startReplay: (data) => set({
    phase: 'replay',
    replayData: data,
    replayPlaying: true,
    replaySpeed: 1,
    replayViewMode: 'follow_p1',
    replayFrameIndex: 0,
  }),
  exitReplay: () => set({
    phase: 'menu',
    replayData: null,
    replayPlaying: true,
    replaySpeed: 1,
    replayFrameIndex: 0,
  }),
  setReplayPlaying: (p) => set({ replayPlaying: p }),
  setReplaySpeed: (s) => set({ replaySpeed: s }),
  setReplayViewMode: (m) => set({ replayViewMode: m }),
  setReplayFrameIndex: (i) => set({ replayFrameIndex: i }),

  resetForCountdown: () => {
    const { selectedCarIdP1, selectedCarIdP2, gameMode, playerCount, customizationP1, customizationP2, aiDifficulty } = get();
    const aiSkills = AI_DIFFICULTY_SKILL[aiDifficulty];
    
    let carIds: number[] = [];
    let isPlayerFlags: boolean[] = [];
    let playerIndices: (0 | 1 | -1)[] = [];
    let customizations: (CarCustomization | null)[] = [];
    
    if (gameMode === 'timeattack' || gameMode === 'drift') {
      if (playerCount === 2) {
        carIds = [selectedCarIdP1, selectedCarIdP2];
        isPlayerFlags = [true, true];
        playerIndices = [0, 1];
        customizations = [{ ...customizationP1 }, { ...customizationP2 }];
      } else {
        carIds = [selectedCarIdP1];
        isPlayerFlags = [true];
        playerIndices = [0];
        customizations = [{ ...customizationP1 }];
      }
    } else if (playerCount === 2) {
      carIds = [selectedCarIdP1, selectedCarIdP2];
      isPlayerFlags = [true, true];
      playerIndices = [0, 1];
      customizations = [{ ...customizationP1 }, { ...customizationP2 }];
    } else {
      const aiIds = CAR_TEMPLATES.map((c) => c.id).filter((id) => id !== selectedCarIdP1).slice(0, 3);
      carIds = [selectedCarIdP1, ...aiIds];
      isPlayerFlags = carIds.map((_, i) => i === 0);
      playerIndices = carIds.map((_, i) => (i === 0 ? 0 : -1)) as (0 | 1 | -1)[];
      customizations = carIds.map((tplId, i) => {
        if (i === 0) return { ...customizationP1 };
        const tpl = CAR_TEMPLATES[tplId];
        return createDefaultCustomization(tpl);
      });
    }

    set({
      phase: 'countdown',
      countdown: 3,
      winnerId: null,
      rankings: [],
      raceTime: 0,
      replayData: null,
      replayFrameIndex: 0,
      cars: carIds.map((tplId, i) => ({
        id: i,
        name: '',
        color: '#000',
        colorDark: '#000',
        x: 0, y: 0, z: 0, angle: 0, speed: 0,
        maxSpeed: 0, acceleration: 0, handling: 0, friction: 0,
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
        currentItem: null as ItemType | null,
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
        aiSkill: isPlayerFlags[i] ? 0 : aiSkills[i - 1] ?? aiSkills[0],
        itemCooldown: 0,
        customization: customizations[i],
        scale: 1,
        scaleTime: 0,
        isGhost: false,
        ghostTime: 0,
        hasMagnet: false,
        magnetTime: 0,
        hyperBoostTime: 0,
      })),
    });
  },

  backToMenu: () => set({
    phase: 'menu',
    cars: [],
    winnerId: null,
    rankings: [],
    raceTime: 0,
    replayData: null,
    replayFrameIndex: 0,
  }),

  openCustomizer: (target) => set({
    phase: 'customize',
    customizeTarget: target,
  }),

  closeCustomizer: () => set({
    phase: 'menu',
  }),

  setCustomizeTarget: (target) => set({
    customizeTarget: target,
  }),

  updateCustomizationP1: (patch) => set((state) => ({
    customizationP1: { ...state.customizationP1, ...patch },
  })),

  updateCustomizationP2: (patch) => set((state) => ({
    customizationP2: { ...state.customizationP2, ...patch },
  })),

  resetCustomization: (target) => {
    const { selectedCarIdP1, selectedCarIdP2 } = get();
    const tplId = target === 1 ? selectedCarIdP1 : selectedCarIdP2;
    const tpl = CAR_TEMPLATES[tplId];
    const def = createDefaultCustomization(tpl);
    if (target === 1) {
      set({ customizationP1: def });
    } else {
      set({ customizationP2: def });
    }
  },

  applyTemplateToCustomization: (target, templateId) => {
    const tpl = CAR_TEMPLATES[templateId % CAR_TEMPLATES.length];
    const { selectedCarIdP1, selectedCarIdP2 } = get();
    const currentTplId = target === 1 ? selectedCarIdP1 : selectedCarIdP2;
    const currentTpl = CAR_TEMPLATES[currentTplId];
    if (target === 1) {
      set((state) => ({
        customizationP1: {
          ...state.customizationP1,
          bodyColor: tpl.color,
          stripeColor: tpl.colorDark,
        },
      }));
    } else {
      set((state) => ({
        customizationP2: {
          ...state.customizationP2,
          bodyColor: tpl.color,
          stripeColor: tpl.colorDark,
        },
      }));
    }
    void currentTpl;
  },

  setEditorTool: (tool) => set({ editorTool: tool, editorSelectedPoint: tool === 'select' ? get().editorSelectedPoint : null }),
  setEditorSelectedPoint: (idx) => set({ editorSelectedPoint: idx }),

  openEditor: () => set({
    phase: 'editor',
    editorTool: 'select',
    editorSelectedPoint: null,
  }),

  closeEditor: () => set({
    phase: 'menu',
    editorTool: 'select',
    editorSelectedPoint: null,
  }),

  addTrackPoint: (point, insertIndex) => set((state) => {
    const newPoints = [...state.customTrack.points];
    if (insertIndex !== undefined && insertIndex >= 0 && insertIndex <= newPoints.length) {
      newPoints.splice(insertIndex, 0, point);
    } else {
      newPoints.push(point);
    }
    return {
      customTrack: { ...state.customTrack, points: newPoints },
    };
  }),

  updateTrackPoint: (index, point) => set((state) => {
    const newPoints = [...state.customTrack.points];
    if (index >= 0 && index < newPoints.length) {
      newPoints[index] = { ...newPoints[index], ...point };
    }
    return {
      customTrack: { ...state.customTrack, points: newPoints },
    };
  }),

  deleteTrackPoint: (index) => set((state) => {
    const newPoints = state.customTrack.points.filter((_, i) => i !== index);
    const adjustIdx = (arr: number[]) =>
      arr.map((i) => (i > index ? i - 1 : i)).filter((i) => i !== index);
    return {
      customTrack: {
        ...state.customTrack,
        points: newPoints,
        checkpoints: adjustIdx(state.customTrack.checkpoints),
        boostZones: adjustIdx(state.customTrack.boostZones),
        itemBoxes: adjustIdx(state.customTrack.itemBoxes),
      },
      editorSelectedPoint: state.editorSelectedPoint === index ? null : state.editorSelectedPoint,
    };
  }),

  toggleCheckpoint: (index) => set((state) => {
    const exists = state.customTrack.checkpoints.includes(index);
    return {
      customTrack: {
        ...state.customTrack,
        checkpoints: exists
          ? state.customTrack.checkpoints.filter((i) => i !== index)
          : [...state.customTrack.checkpoints, index].sort((a, b) => a - b),
      },
    };
  }),

  toggleBoostZone: (index) => set((state) => {
    const exists = state.customTrack.boostZones.includes(index);
    return {
      customTrack: {
        ...state.customTrack,
        boostZones: exists
          ? state.customTrack.boostZones.filter((i) => i !== index)
          : [...state.customTrack.boostZones, index].sort((a, b) => a - b),
      },
    };
  }),

  toggleItemBox: (index) => set((state) => {
    const exists = state.customTrack.itemBoxes.includes(index);
    return {
      customTrack: {
        ...state.customTrack,
        itemBoxes: exists
          ? state.customTrack.itemBoxes.filter((i) => i !== index)
          : [...state.customTrack.itemBoxes, index].sort((a, b) => a - b),
      },
    };
  }),

  setTrackWidth: (width) => set((state) => ({
    customTrack: { ...state.customTrack, width: Math.max(60, Math.min(200, width)) },
  })),

  setTrackClosed: (closed) => set((state) => ({
    customTrack: { ...state.customTrack, closed },
  })),

  setTrackName: (name) => set((state) => ({
    customTrack: { ...state.customTrack, name },
  })),

  saveCurrentTrack: () => set((state) => ({
    savedTracks: [...state.savedTracks, { ...state.customTrack, points: [...state.customTrack.points] }],
  })),

  loadTrack: (track) => set({
    customTrack: { ...track, points: [...track.points] },
    useCustomTrack: true,
  }),

  deleteSavedTrack: (index) => set((state) => ({
    savedTracks: state.savedTracks.filter((_, i) => i !== index),
  })),

  resetCustomTrack: () => set({
    customTrack: createDefaultCustomTrack(),
    editorSelectedPoint: null,
  }),

  toggleUseCustomTrack: () => set((state) => ({
    useCustomTrack: !state.useCustomTrack,
  })),

  smoothTrackPoints: () => set((state) => {
    const pts = state.customTrack.points;
    if (pts.length < 3) return {};
    const smoothed = pts.map((p, i) => {
      const prev = pts[(i - 1 + pts.length) % pts.length];
      const next = pts[(i + 1) % pts.length];
      return {
        x: (prev.x + p.x * 2 + next.x) / 4,
        y: (prev.y + p.y * 2 + next.y) / 4,
      };
    });
    return {
      customTrack: { ...state.customTrack, points: smoothed },
    };
  }),

  openShop: () => set({ phase: 'shop' }),
  closeShop: () => set({ phase: 'menu' }),

  addCoins: (amount) => set((state) => {
    const newState = {
      coins: state.coins + amount,
      totalCoinsEarned: state.totalCoinsEarned + amount,
    };
    saveProgress({ ...state, ...newState });
    return newState;
  }),

  spendCoins: (amount) => {
    const state = get();
    if (state.coins < amount) return false;
    const newState = { coins: state.coins - amount };
    set(newState);
    saveProgress({ ...state, ...newState });
    return true;
  },

  upgradeCarStat: (carTemplateId, stat) => {
    const state = get();
    const currentLevel = state.upgrades[carTemplateId]?.[stat] ?? 0;
    if (currentLevel >= MAX_UPGRADE_LEVEL) return false;
    const cost = calcUpgradeCost(currentLevel);
    if (state.coins < cost) return false;
    const newUpgrades = {
      ...state.upgrades,
      [carTemplateId]: {
        ...state.upgrades[carTemplateId],
        [stat]: currentLevel + 1,
      },
    };
    const newState = {
      coins: state.coins - cost,
      upgrades: newUpgrades,
    };
    set(newState);
    saveProgress({ ...state, ...newState });
    return true;
  },

  buySkin: (skinId) => {
    const state = get();
    if (state.ownedSkins.includes(skinId)) return false;
    const skin = CAR_SKINS.find((s) => s.id === skinId);
    if (!skin) return false;
    if (state.coins < skin.price) return false;
    const newState = {
      coins: state.coins - skin.price,
      ownedSkins: [...state.ownedSkins, skinId],
    };
    set(newState);
    saveProgress({ ...state, ...newState });
    return true;
  },

  selectSkin: (player, skinId) => {
    const state = get();
    const key = player === 1 ? 'selectedSkinP1' : 'selectedSkinP2';
    const newState = { [key]: skinId } as Partial<GameState>;
    set(newState);
    saveProgress({ ...state, ...newState });
    if (skinId) {
      get().applySkinToCustomization(player, skinId);
    }
  },

  recordRaceResult: (rank, rewardCoins) => set((state) => {
    const won = rank === 1;
    const newState = {
      coins: state.coins + rewardCoins,
      totalCoinsEarned: state.totalCoinsEarned + rewardCoins,
      racesPlayed: state.racesPlayed + 1,
      racesWon: state.racesWon + (won ? 1 : 0),
      lastEarnedCoins: rewardCoins,
    };
    saveProgress({ ...state, ...newState });
    return newState;
  }),

  getUpgradedCarStats: (carTemplateId) => {
    const state = get();
    const tpl = CAR_TEMPLATES[carTemplateId % CAR_TEMPLATES.length];
    const up = state.upgrades[carTemplateId] ?? { speed: 0, acceleration: 0, handling: 0, friction: 0 };
    return {
      maxSpeed: tpl.maxSpeed + up.speed * UPGRADE_BONUS.speed,
      acceleration: tpl.acceleration + up.acceleration * UPGRADE_BONUS.acceleration,
      handling: tpl.handling + up.handling * UPGRADE_BONUS.handling,
      friction: Math.min(0.995, tpl.friction + up.friction * UPGRADE_BONUS.friction),
    };
  },

  applySkinToCustomization: (player, skinId) => {
    if (!skinId) return;
    const skin = CAR_SKINS.find((s) => s.id === skinId);
    if (!skin) return;
    const patch: Partial<CarCustomization> = {
      bodyColor: skin.bodyColor,
      stripeColor: skin.stripeColor,
      stripePattern: skin.stripePattern,
      stripeEnabled: skin.stripeEnabled,
      wheelColor: skin.wheelColor,
    };
    if (player === 1) {
      set((state) => ({ customizationP1: { ...state.customizationP1, ...patch } }));
    } else {
      set((state) => ({ customizationP2: { ...state.customizationP2, ...patch } }));
    }
  },

  toggleObstacles: () => set((state) => {
    const newState = { obstaclesEnabled: !state.obstaclesEnabled };
    saveProgress({ ...state, ...newState });
    return newState;
  }),

  setObstaclesEnabled: (enabled) => set((state) => {
    const newState = { obstaclesEnabled: enabled };
    saveProgress({ ...state, ...newState });
    return newState;
  }),

  toggleWackyMode: () => set((state) => {
    const newState = { wackyMode: !state.wackyMode };
    saveProgress({ ...state, ...newState });
    return newState;
  }),

  setWackyMode: (enabled) => set((state) => {
    const newState = { wackyMode: enabled };
    saveProgress({ ...state, ...newState });
    return newState;
  }),

  selectTrack: (trackId) => set({ selectedTrackId: trackId }),

  setHudEditMode: (enabled) => set((state) => {
    const newConfig = { ...state.hudConfig, editMode: enabled };
    if (!enabled) {
      saveHudConfig(newConfig);
    }
    return { hudConfig: newConfig };
  }),

  updateHudPanel: (player, panelId, patch) => set((state) => {
    const playerKey = player === 1 ? 'p1' : 'p2';
    const currentPanels = state.hudConfig[playerKey].panels;
    const newPanels = {
      ...currentPanels,
      [panelId]: { ...currentPanels[panelId], ...patch },
    };
    const newConfig = {
      ...state.hudConfig,
      [playerKey]: { panels: newPanels },
    };
    return { hudConfig: newConfig };
  }),

  toggleHudPanelVisible: (player, panelId) => set((state) => {
    const playerKey = player === 1 ? 'p1' : 'p2';
    const currentPanels = state.hudConfig[playerKey].panels;
    const newPanels = {
      ...currentPanels,
      [panelId]: { ...currentPanels[panelId], visible: !currentPanels[panelId].visible },
    };
    const newConfig = {
      ...state.hudConfig,
      [playerKey]: { panels: newPanels },
    };
    saveHudConfig(newConfig);
    return { hudConfig: newConfig };
  }),

  resetHudConfig: (player) => set((state) => {
    const newConfig = { ...state.hudConfig };
    if (player === 1 || player === undefined) {
      newConfig.p1 = createDefaultHudPlayerConfig();
    }
    if (player === 2 || player === undefined) {
      newConfig.p2 = createDefaultHudPlayerConfig();
    }
    saveHudConfig(newConfig);
    return { hudConfig: newConfig };
  }),

  setHudPanelScale: (player, panelId, scale) => set((state) => {
    const playerKey = player === 1 ? 'p1' : 'p2';
    const currentPanels = state.hudConfig[playerKey].panels;
    const newPanels = {
      ...currentPanels,
      [panelId]: { ...currentPanels[panelId], scale: Math.max(0.5, Math.min(2, scale)) },
    };
    const newConfig = {
      ...state.hudConfig,
      [playerKey]: { panels: newPanels },
    };
    return { hudConfig: newConfig };
  }),
  };
});
