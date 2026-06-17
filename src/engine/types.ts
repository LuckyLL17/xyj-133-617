export type GamePhase = 'menu' | 'customize' | 'countdown' | 'racing' | 'finished' | 'replay' | 'editor' | 'shop';

export type UpgradeType = 'speed' | 'acceleration' | 'handling' | 'friction';

export interface CarUpgrades {
  speed: number;
  acceleration: number;
  handling: number;
  friction: number;
}

export interface CarSkin {
  id: string;
  name: string;
  price: number;
  bodyColor: string;
  stripeColor: string;
  stripePattern: StripePattern;
  stripeEnabled: boolean;
  wheelColor: string;
  description: string;
  limited?: boolean;
}

export interface PlayerProgress {
  coins: number;
  totalCoinsEarned: number;
  racesWon: number;
  racesPlayed: number;
  upgrades: Record<number, CarUpgrades>;
  ownedSkins: string[];
  selectedSkinP1: string | null;
  selectedSkinP2: string | null;
  obstaclesEnabled: boolean;
  wackyMode: boolean;
  aiDifficulty?: AIDifficulty;
}

export type EditorTool = 'select' | 'add' | 'delete' | 'checkpoint' | 'boost' | 'item' | 'move';

export interface EditorState {
  tool: EditorTool;
  selectedPointIndex: number | null;
  hoveredPointIndex: number | null;
  isDragging: boolean;
  dragOffsetX: number;
  dragOffsetY: number;
  zoom: number;
  panX: number;
  panY: number;
  isPanning: boolean;
  panStartX: number;
  panStartY: number;
}

export interface CustomTrack {
  name: string;
  points: TrackPoint[];
  width: number;
  checkpoints: number[];
  boostZones: number[];
  itemBoxes: number[];
  closed: boolean;
}

export const DEFAULT_TRACK_WIDTH = 120;
export const EDITOR_CANVAS_WIDTH = 2000;
export const EDITOR_CANVAS_HEIGHT = 1600;

export type ItemType = 'boost' | 'shield' | 'banana' | 'missile' | 'mine' | 'shrink' | 'giant' | 'lightning' | 'ghost' | 'magnet' | 'hyperboost';

export type GameMode = 'grandprix' | 'timeattack' | 'drift';

export type SplitScreenLayout = 'horizontal' | 'vertical';

export type WeatherType = 'clear' | 'rain' | 'snow' | 'fog';

export type TimeOfDay = 'day' | 'sunset' | 'night' | 'dawn';

export type ReplayViewMode = 'follow_p1' | 'follow_p2' | 'follow_leader' | 'free' | 'topdown';

export interface GameConfig {
  mode: GameMode;
  playerCount: 1 | 2;
  splitLayout: SplitScreenLayout;
  selectedCarIdP1: number;
  selectedCarIdP2: number;
}

export interface Car {
  id: number;
  name: string;
  color: string;
  colorDark: string;
  x: number;
  y: number;
  z: number;
  angle: number;
  speed: number;
  maxSpeed: number;
  acceleration: number;
  handling: number;
  friction: number;
  isPlayer: boolean;
  playerIndex: 0 | 1 | -1;
  lap: number;
  checkpoint: number;
  bestLapTime: number;
  currentLapStartTime: number;
  totalTime: number;
  finished: boolean;
  finishTime: number;
  hasShield: boolean;
  shieldTime: number;
  boostTime: number;
  spinTime: number;
  currentItem: ItemType | null;
  drifting: boolean;
  driftAngle: number;
  tireMarkTimer: number;
  driftScore: number;
  driftCombo: number;
  currentDriftPoints: number;
  maxDriftCombo: number;
  driftComboTimer: number;
  gravityFlipped: boolean;
  gravityFlipAnim: number;
  aiTargetIdx: number;
  aiSkill: number;
  itemCooldown: number;
  customization: CarCustomization | null;
  scale: number;
  scaleTime: number;
  isGhost: boolean;
  ghostTime: number;
  hasMagnet: boolean;
  magnetTime: number;
  hyperBoostTime: number;
}

export interface SplitViewport {
  x: number;
  y: number;
  width: number;
  height: number;
  camera: Camera;
}

export type StripePattern = 'none' | 'single' | 'double' | 'checker' | 'flame';

export interface CarCustomization {
  bodyColor: string;
  stripeColor: string;
  stripePattern: StripePattern;
  stripeEnabled: boolean;
  numberColor: string;
  number: string;
  numberEnabled: boolean;
  wheelColor: string;
}

export interface CarTemplate {
  id: number;
  name: string;
  color: string;
  colorDark: string;
  maxSpeed: number;
  acceleration: number;
  handling: number;
  friction: number;
}

export interface TrackPoint {
  x: number;
  y: number;
  z?: number;
}

export type AIDifficulty = 'easy' | 'normal' | 'hard' | 'expert';

export type TrackDifficulty = 'easy' | 'medium' | 'hard' | 'expert';
export type TrackTheme = 'forest' | 'desert' | 'city' | 'snow' | 'volcano' | 'beach';

export interface Track {
  id: string;
  name: string;
  points: TrackPoint[];
  width: number;
  checkpoints: number[];
  boostZones: number[];
  itemBoxes: number[];
  difficulty: TrackDifficulty;
  theme: TrackTheme;
  description: string;
  accentColor: string;
  laps: number;
}

export interface TireMark {
  x: number;
  y: number;
  z?: number;
  angle: number;
  alpha: number;
}

export type ParticleShape = 'square' | 'circle' | 'spark' | 'smoke' | 'ring' | 'star';

export interface Particle {
  x: number;
  y: number;
  z?: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  shape?: ParticleShape;
  rotation?: number;
  rotationSpeed?: number;
  gravity?: number;
  shrink?: boolean;
  glow?: boolean;
  colorEnd?: string;
}

export interface ItemBoxInstance {
  idx: number;
  x: number;
  y: number;
  collected: boolean;
  respawnTimer: number;
}

export interface BananaInstance {
  x: number;
  y: number;
  angle: number;
  active: boolean;
  ownerId: number;
}

export interface MissileInstance {
  x: number;
  y: number;
  angle: number;
  speed: number;
  targetId: number;
  active: boolean;
  ownerId: number;
  life: number;
}

export interface MineInstance {
  x: number;
  y: number;
  angle: number;
  active: boolean;
  ownerId: number;
  armed: boolean;
  armTimer: number;
}

export interface LightningInstance {
  targetId: number;
  active: boolean;
  ownerId: number;
  life: number;
  strikeProgress: number;
}

export interface InputState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  space: boolean;
  shift: boolean;
}

export interface Camera {
  x: number;
  y: number;
  zoom: number;
  shake: number;
}

export interface EnvConfig {
  weather: WeatherType;
  timeOfDay: TimeOfDay;
}

export interface WackyState {
  enabled: boolean;
  gravityDir: 1 | -1;
  flipTimer: number;
  warningTimer: number;
  flipping: boolean;
  flipAnimProgress: number;
}

export interface CarSnapshot {
  id: number;
  x: number;
  y: number;
  angle: number;
  speed: number;
  lap: number;
  checkpoint: number;
  finished: boolean;
  hasShield: boolean;
  boostTime: number;
  spinTime: number;
  drifting: boolean;
  driftAngle: number;
  driftScore: number;
  driftCombo: number;
  currentDriftPoints: number;
  maxDriftCombo: number;
  currentItem: ItemType | null;
  gravityFlipped: boolean;
  gravityFlipAnim: number;
  scale: number;
  isGhost: boolean;
  hasMagnet: boolean;
  hyperBoostTime: number;
}

export type ObstacleType = 'static' | 'sway' | 'patrol';

export interface Obstacle {
  id: number;
  type: ObstacleType;
  x: number;
  y: number;
  angle: number;
  width: number;
  height: number;
  speed: number;
  baseX: number;
  baseY: number;
  baseAngle: number;
  swayRange: number;
  swayPhase: number;
  swaySpeed: number;
  patrolStartIdx: number;
  patrolEndIdx: number;
  patrolDir: number;
  trackProgress: number;
  active: boolean;
  hitFlash: number;
}

export interface ReplayFrame {
  frameIndex: number;
  raceTime: number;
  cars: CarSnapshot[];
  particles: Particle[];
  tireMarks: TireMark[];
  bananas: BananaInstance[];
  missiles: MissileInstance[];
  mines: MineInstance[];
  lightnings: LightningInstance[];
  obstacles: Obstacle[];
}

export interface ReplayData {
  frames: ReplayFrame[];
  totalRaceTime: number;
  initialCars: Car[];
  gameMode: GameMode;
  playerCount: 1 | 2;
  totalLaps: number;
  rankings: number[];
  env: EnvConfig;
}

export type HUDPanelId = 'lapInfo' | 'speedInfo' | 'positionInfo' | 'itemInfo' | 'statusEffects' | 'wackyInfo';

export interface HUDPanelConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  visible: boolean;
  scale: number;
}

export interface HUDPlayerConfig {
  panels: Record<HUDPanelId, HUDPanelConfig>;
}

export interface HUDConfig {
  editMode: boolean;
  p1: HUDPlayerConfig;
  p2: HUDPlayerConfig;
}

export const HUD_PANEL_LABELS: Record<HUDPanelId, string> = {
  lapInfo: '圈数/时间',
  speedInfo: '速度/漂移',
  positionInfo: '排名',
  itemInfo: '道具',
  statusEffects: '状态效果',
  wackyInfo: '搞怪模式',
};

export const HUD_PANEL_DEFAULTS: Record<HUDPanelId, { width: number; height: number }> = {
  lapInfo: { width: 160, height: 150 },
  speedInfo: { width: 180, height: 110 },
  positionInfo: { width: 140, height: 90 },
  itemInfo: { width: 200, height: 90 },
  statusEffects: { width: 180, height: 200 },
  wackyInfo: { width: 200, height: 60 },
};
