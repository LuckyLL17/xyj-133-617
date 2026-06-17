import { useGameStore, AI_DIFFICULTY_LABEL, AI_DIFFICULTY_COLOR, AI_DIFFICULTY_STARS, AI_DIFFICULTY_DESC } from '../store/gameStore';
import { CAR_TEMPLATES } from '../engine/cars';
import type { GameMode, WeatherType, TimeOfDay, CarCustomization, StripePattern, AIDifficulty } from '../engine/types';
import { PRESET_TRACKS, DIFFICULTY_LABEL, DIFFICULTY_COLOR, DIFFICULTY_STARS, THEME_LABEL } from '../engine/track';
import { ChevronLeft, ChevronRight, Play, Gamepad2, Users, Timer, Trophy, Monitor, Sun, CloudSnow, CloudRain, Moon, Sunset, Sunrise, CloudFog, Sparkles, Palette, Pencil, Check, Coins, ShoppingBag, AlertTriangle, Zap, Star, MapPin, Layers, Bot } from 'lucide-react';

export default function MainMenu() {
  const selectedCarIdP1 = useGameStore((s) => s.selectedCarIdP1);
  const selectedCarIdP2 = useGameStore((s) => s.selectedCarIdP2);
  const gameMode = useGameStore((s) => s.gameMode);
  const playerCount = useGameStore((s) => s.playerCount);
  const splitLayout = useGameStore((s) => s.splitLayout);
  const weather = useGameStore((s) => s.weather);
  const timeOfDay = useGameStore((s) => s.timeOfDay);
  const selectCarP1 = useGameStore((s) => s.selectCarP1);
  const selectCarP2 = useGameStore((s) => s.selectCarP2);
  const setGameMode = useGameStore((s) => s.setGameMode);
  const setPlayerCount = useGameStore((s) => s.setPlayerCount);
  const setSplitLayout = useGameStore((s) => s.setSplitLayout);
  const setWeather = useGameStore((s) => s.setWeather);
  const setTimeOfDay = useGameStore((s) => s.setTimeOfDay);
  const resetForCountdown = useGameStore((s) => s.resetForCountdown);
  const openCustomizer = useGameStore((s) => s.openCustomizer);
  const customizationP1 = useGameStore((s) => s.customizationP1);
  const customizationP2 = useGameStore((s) => s.customizationP2);
  const openEditor = useGameStore((s) => s.openEditor);
  const useCustomTrack = useGameStore((s) => s.useCustomTrack);
  const toggleUseCustomTrack = useGameStore((s) => s.toggleUseCustomTrack);
  const customTrack = useGameStore((s) => s.customTrack);
  const selectedTrackId = useGameStore((s) => s.selectedTrackId);
  const selectTrack = useGameStore((s) => s.selectTrack);
  const coins = useGameStore((s) => s.coins);
  const racesPlayed = useGameStore((s) => s.racesPlayed);
  const racesWon = useGameStore((s) => s.racesWon);
  const openShop = useGameStore((s) => s.openShop);
  const upgrades = useGameStore((s) => s.upgrades);
  const getUpgradedCarStats = useGameStore((s) => s.getUpgradedCarStats);
  const obstaclesEnabled = useGameStore((s) => s.obstaclesEnabled);
  const toggleObstacles = useGameStore((s) => s.toggleObstacles);
  const wackyMode = useGameStore((s) => s.wackyMode);
  const toggleWackyMode = useGameStore((s) => s.toggleWackyMode);
  const aiDifficulty = useGameStore((s) => s.aiDifficulty);
  const setAIDifficulty = useGameStore((s) => s.setAIDifficulty);

  const weatherOptions: { id: WeatherType; label: string; desc: string; icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>; color: string; effect: string }[] = [
    { id: 'clear', label: '晴天', desc: '晴朗干燥', icon: Sun, color: '#ffdd00', effect: '标准手感' },
    { id: 'rain', label: '雨天', desc: '路面湿滑', icon: CloudRain, color: '#33ccff', effect: '抓地力-30% · 易漂移' },
    { id: 'snow', label: '雪天', desc: '积雪覆盖', icon: CloudSnow, color: '#aaddff', effect: '抓地力-50% · 极易漂移' },
    { id: 'fog', label: '雾天', desc: '雾气弥漫', icon: CloudFog, color: '#bbbbcc', effect: '视野受限 · 抓地力-10%' },
  ];

  const timeOptions: { id: TimeOfDay; label: string; desc: string; icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>; color: string; effect: string }[] = [
    { id: 'day', label: '白天', desc: '阳光充足', icon: Sun, color: '#ffee88', effect: '标准光照' },
    { id: 'dawn', label: '黎明', desc: '晨光熹微', icon: Sunrise, color: '#ffbb88', effect: '抓地力-4%' },
    { id: 'sunset', label: '黄昏', desc: '夕阳西下', icon: Sunset, color: '#ff8844', effect: '抓地力-6%' },
    { id: 'night', label: '夜晚', desc: '车灯照亮', icon: Moon, color: '#8888cc', effect: '抓地力-12% · 车头灯开启' },
  ];

  const bar = (val: number, max: number, color = '#00ff88') => {
    const pct = Math.min(100, (val / max) * 100);
    return (
      <div className="flex items-center gap-2">
        <div className="flex-1 h-3 bg-[#1a1a3a] border-2 border-[#2a2a5a] relative overflow-hidden">
          <div
            className="h-full transition-all duration-300"
            style={{ width: `${pct}%`, background: color }}
          />
        </div>
      </div>
    );
  };

  const CarSelector = ({ selectedId, onSelect, label, color, playerIdx, customization }: {
    selectedId: number;
    onSelect: (id: number) => void;
    label: string;
    color: string;
    playerIdx: 1 | 2;
    customization: CarCustomization;
  }) => {
    const car = CAR_TEMPLATES[selectedId];
    const upgradedStats = getUpgradedCarStats(selectedId);
    const carUpgrades = upgrades[selectedId] ?? { speed: 0, acceleration: 0, handling: 0, friction: 0 };
    const prev = () => onSelect((selectedId - 1 + CAR_TEMPLATES.length) % CAR_TEMPLATES.length);
    const next = () => onSelect((selectedId + 1) % CAR_TEMPLATES.length);

    const darkenColor = (hex: string, amount: number = 0.35): string => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      const dr = Math.max(0, Math.floor(r * (1 - amount)));
      const dg = Math.max(0, Math.floor(g * (1 - amount)));
      const db = Math.max(0, Math.floor(b * (1 - amount)));
      return `#${dr.toString(16).padStart(2, '0')}${dg.toString(16).padStart(2, '0')}${db.toString(16).padStart(2, '0')}`;
    };

    const bodyDark = darkenColor(customization.bodyColor, 0.3);
    const displayColor = customization.bodyColor;

    const renderStripe = (pattern: StripePattern, stripeColor: string) => {
      if (pattern === 'none' || !customization.stripeEnabled) return null;
      if (pattern === 'single') {
        return <rect x="4" y="13" width="32" height="2" fill={stripeColor} />;
      }
      if (pattern === 'double') {
        return (
          <g>
            <rect x="4" y="10" width="32" height="2" fill={stripeColor} />
            <rect x="4" y="17" width="32" height="2" fill={stripeColor} />
          </g>
        );
      }
      if (pattern === 'checker') {
        const cells = [];
        for (let row = 0; row < 4; row++) {
          for (let col = 0; col < 16; col++) {
            if ((row + col) % 2 === 0) {
              cells.push(
                <rect key={`${row}-${col}`} x={5 + col * 2} y={9 + row} width="2" height="1" fill={stripeColor} />
              );
            }
          }
        }
        return <g>{cells}</g>;
      }
      if (pattern === 'flame') {
        return (
          <g>
            <path
              d="M 4 13 L 8 12 L 10 8 L 14 12 L 18 9 L 22 13 L 26 10 L 30 14 L 36 12 L 36 16 L 4 16 Z"
              fill={stripeColor}
            />
            <path
              d="M 4 14 L 8 13 L 10 11 L 14 13 L 18 11.5 L 22 14 L 26 12 L 30 14.5 L 36 13 L 36 15 L 4 15 Z"
              fill={darkenColor(stripeColor, 0.2)}
            />
          </g>
        );
      }
      return null;
    };

    return (
      <div className="flex-1 max-w-md">
        <div className="text-center mb-3" style={{ color }}>
          <span className="text-sm md:text-base tracking-widest">{label}</span>
        </div>
        <div className="flex items-center gap-2 md:gap-4 w-full justify-center">
          <button
            onClick={prev}
            className="p-2 md:p-3 bg-[#1a1a3a] border-4 border-[#333366] text-white hover:bg-[#2a2a5a] hover:border-[#00ff88] active:translate-y-1 transition-all"
            style={{ boxShadow: '3px 3px 0 #000000' }}
          >
            <ChevronLeft className="w-5 h-5 md:w-6 md:h-6" />
          </button>

          <div
            className="flex-1 p-3 md:p-5 text-center border-4 transition-all"
            style={{
              background: '#12122a',
              borderColor: displayColor,
              boxShadow: `0 0 20px ${displayColor}55, 4px 4px 0 #000000`,
            }}
          >
            <div
              className="text-lg md:text-2xl mb-2 tracking-widest"
              style={{ color: displayColor, textShadow: `2px 2px 0 ${bodyDark}` }}
            >
              {car.name}
            </div>
            <div className="flex justify-center mb-3">
              <div
                className="w-20 h-14 md:w-28 md:h-20 relative"
                style={{ imageRendering: 'pixelated' }}
              >
                <svg viewBox="0 0 40 28" className="w-full h-full">
                  <rect x="2" y="8" width="4" height="3" fill={customization.wheelColor} />
                  <rect x="2" y="17" width="4" height="3" fill={customization.wheelColor} />
                  <rect x="34" y="8" width="4" height="3" fill={customization.wheelColor} />
                  <rect x="34" y="17" width="4" height="3" fill={customization.wheelColor} />
                  <rect x="4" y="6" width="32" height="18" fill={customization.bodyColor} />
                  <rect x="4" y="6" width="32" height="3" fill={bodyDark} />
                  <rect x="4" y="21" width="32" height="3" fill={bodyDark} />
                  <rect x="4" y="6" width="5" height="18" fill={bodyDark} />
                  {renderStripe(customization.stripePattern, customization.stripeColor)}
                  <rect x="18" y="8" width="12" height="14" fill="#223344" />
                  <rect x="20" y="10" width="8" height="10" fill="#44aadd" />
                  <rect x="32" y="10" width="3" height="3" fill="#ffcc33" />
                  <rect x="32" y="15" width="3" height="3" fill="#ffcc33" />
                  <rect x="5" y="10" width="3" height="3" fill="#ff4444" />
                  <rect x="5" y="15" width="3" height="3" fill="#ff4444" />
                  {customization.numberEnabled && customization.number && (
                    <text
                      x="11"
                      y="17"
                      fontSize="7"
                      fill={customization.numberColor}
                      style={{ fontFamily: '"Press Start 2P", "Courier New", monospace', fontWeight: 'bold' }}
                      textAnchor="middle"
                    >
                      {customization.number.slice(0, 2)}
                    </text>
                  )}
                </svg>
              </div>
            </div>
            <button
              onClick={() => openCustomizer(playerIdx)}
              className="w-full mb-3 px-2 py-2 md:py-2.5 flex items-center justify-center gap-2 text-[9px] md:text-[10px] hover:-translate-y-0.5 active:translate-y-0.5 transition-all"
              style={{
                background: '#1a1a3a',
                color: color,
                border: `3px solid ${color}`,
                boxShadow: `2px 2px 0 #000000`,
              }}
            >
              <Palette className="w-3.5 h-3.5 md:w-4 md:h-4" />
              定制外观
            </button>
            <div className="space-y-2 text-left text-[9px] md:text-[10px]">
              <div className="flex items-center gap-2">
                <span className="w-12 text-[#aaaaee]">SPD</span>
                {bar(upgradedStats.maxSpeed, 6, color)}
                {carUpgrades.speed > 0 && (
                  <span className="text-[8px]" style={{ color: '#ffd700' }}>+{carUpgrades.speed}</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="w-12 text-[#aaaaee]">ACC</span>
                {bar(upgradedStats.acceleration, 0.25, color)}
                {carUpgrades.acceleration > 0 && (
                  <span className="text-[8px]" style={{ color: '#ffd700' }}>+{carUpgrades.acceleration}</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="w-12 text-[#aaaaee]">HND</span>
                {bar(upgradedStats.handling, 0.08, color)}
                {carUpgrades.handling > 0 && (
                  <span className="text-[8px]" style={{ color: '#ffd700' }}>+{carUpgrades.handling}</span>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={next}
            className="p-2 md:p-3 bg-[#1a1a3a] border-4 border-[#333366] text-white hover:bg-[#2a2a5a] hover:border-[#00ff88] active:translate-y-1 transition-all"
            style={{ boxShadow: '3px 3px 0 #000000' }}
          >
            <ChevronRight className="w-5 h-5 md:w-6 md:h-6" />
          </button>
        </div>
        <div className="flex gap-2 mt-3 justify-center">
          {CAR_TEMPLATES.map((c) => (
            <button
              key={c.id}
              onClick={() => onSelect(c.id)}
              className="w-5 h-5 md:w-6 md:h-6 border-4 transition-all"
              style={{
                background: selectedId === c.id ? displayColor : c.color,
                borderColor: selectedId === c.id ? '#ffffff' : '#000000',
                transform: selectedId === c.id ? 'translateY(-2px)' : 'none',
              }}
            />
          ))}
        </div>
      </div>
    );
  };

  const ModeButton = ({ mode, icon: Icon, label, desc }: {
    mode: GameMode;
    icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
    label: string;
    desc: string;
  }) => {
    const active = gameMode === mode;
    return (
      <button
        onClick={() => setGameMode(mode)}
        className={`flex-1 p-3 md:p-4 border-4 transition-all ${active ? 'translate-y-[-2px]' : ''}`}
        style={{
          background: active ? '#1a1a3a' : '#12122a',
          borderColor: active ? '#00ff88' : '#333366',
          boxShadow: active ? '0 0 20px #00ff8844, 4px 4px 0 #000000' : '4px 4px 0 #000000',
        }}
      >
        <div className="flex flex-col items-center gap-2">
          <Icon className="w-6 h-6 md:w-8 md:h-8" style={{ color: active ? '#00ff88' : '#8888aa' }} />
          <div className="text-xs md:text-sm tracking-wider" style={{ color: active ? '#00ff88' : '#ccccdd' }}>
            {label}
          </div>
          <div className="text-[8px] md:text-[10px]" style={{ color: '#8888aa' }}>
            {desc}
          </div>
        </div>
      </button>
    );
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center relative overflow-hidden overflow-y-auto py-4">
      <div className="absolute inset-0 opacity-20">
        {Array.from({ length: 50 }).map((_, i) => (
          <div
            key={i}
            className="absolute"
            style={{
              left: `${(i * 37) % 100}%`,
              top: `${(i * 53) % 100}%`,
              width: 8, height: 8,
              background: ['#ff3366', '#ffdd00', '#33ccff', '#00ff88'][i % 4],
              animation: `pulse-glow ${2 + (i % 3)}s ease-in-out infinite`,
            }}
          />
        ))}
      </div>

      <div className="absolute top-3 md:top-4 left-3 md:left-4 right-3 md:right-4 z-20 flex justify-between items-start gap-2">
        <div
          className="px-3 py-2 md:px-4 md:py-2.5 flex items-center gap-2 border-4"
          style={{
            background: '#1a1a3a',
            borderColor: '#ffd700',
            boxShadow: '0 0 15px #ffd70044, 3px 3px 0 #000000',
          }}
        >
          <Coins className="w-4 h-4 md:w-5 md:h-5" style={{ color: '#ffd700' }} />
          <span className="text-[10px] md:text-xs tracking-wider" style={{ color: '#ffd700' }}>
            {coins}
          </span>
        </div>

        <div className="flex gap-2">
          {racesPlayed > 0 && (
            <div
              className="hidden md:flex px-3 py-2 items-center gap-2 border-4"
              style={{
                background: '#1a1a3a',
                borderColor: '#33ccff',
                boxShadow: '0 0 10px #33ccff33, 3px 3px 0 #000000',
              }}
            >
              <Trophy className="w-4 h-4" style={{ color: '#33ccff' }} />
              <span className="text-[10px] tracking-wider" style={{ color: '#33ccff' }}>
                {racesWon}/{racesPlayed} 胜
              </span>
            </div>
          )}
          <button
            onClick={openShop}
            className="px-3 py-2 md:px-4 md:py-2.5 flex items-center gap-2 text-[10px] md:text-xs hover:-translate-y-0.5 active:translate-y-0.5 transition-all"
            style={{
              background: '#ffd700',
              color: '#443300',
              border: '4px solid #aa8800',
              boxShadow: '3px 3px 0 #000000',
            }}
          >
            <ShoppingBag className="w-4 h-4 md:w-5 md:h-5" />
            <span className="hidden sm:inline tracking-wider">SHOP</span>
          </button>
        </div>
      </div>

      <div className="relative z-10 text-center mb-4 md:mb-6 px-4 pt-10 md:pt-12">
        <h1
          className="text-3xl md:text-5xl lg:text-6xl mb-2 tracking-wider"
          style={{
            color: '#00ff88',
            textShadow: '4px 4px 0 #005533, 0 0 40px #00ff8855',
            lineHeight: 1.2,
          }}
        >
          PIXEL
        </h1>
        <h1
          className="text-3xl md:text-5xl lg:text-6xl tracking-widest"
          style={{
            color: '#ff3366',
            textShadow: '4px 4px 0 #550011, 0 0 40px #ff336655',
            lineHeight: 1.2,
          }}
        >
          KART
        </h1>
        <div className="mt-2 text-[10px] md:text-sm" style={{ color: '#8888aa' }}>
          像 素 赛 车 · 极 速 漂 移
        </div>
      </div>

      <div className="relative z-10 flex flex-col items-center gap-4 md:gap-5 w-full max-w-5xl px-3 md:px-4">
        <div className="w-full max-w-2xl">
          <div className="text-center mb-2 md:mb-3" style={{ color: '#33ccff' }}>
            <span className="text-[10px] md:text-xs tracking-widest">GAME MODE</span>
          </div>
          <div className="flex gap-3 md:gap-4">
            <ModeButton
              mode="grandprix"
              icon={Trophy}
              label="GRAND PRIX"
              desc="3 AI对手 · 道具对战"
            />
            <ModeButton
              mode="timeattack"
              icon={Timer}
              label="TIME ATTACK"
              desc="无对手 · 无道具 · 刷圈速"
            />
            <ModeButton
              mode="drift"
              icon={Sparkles}
              label="DRIFT SCORE"
              desc="漂移得分 · 连击加成 · 拼技巧"
            />
          </div>
        </div>

        <div className="w-full max-w-2xl">
            <div className="text-center mb-2 md:mb-3" style={{ color: '#ffdd00' }}>
              <span className="text-[10px] md:text-xs tracking-widest">PLAYERS</span>
            </div>
            <div className="flex gap-3 md:gap-4">
              <button
                onClick={() => setPlayerCount(1)}
                className={`flex-1 p-3 md:p-4 border-4 transition-all ${playerCount === 1 ? 'translate-y-[-2px]' : ''}`}
                style={{
                  background: playerCount === 1 ? '#1a1a3a' : '#12122a',
                  borderColor: playerCount === 1 ? '#ffdd00' : '#333366',
                  boxShadow: playerCount === 1 ? '0 0 20px #ffdd0044, 4px 4px 0 #000000' : '4px 4px 0 #000000',
                }}
              >
                <div className="flex flex-col items-center gap-2">
                  <Users className="w-6 h-6 md:w-8 md:h-8" style={{ color: playerCount === 1 ? '#ffdd00' : '#8888aa' }} />
                  <div className="text-xs md:text-sm tracking-wider" style={{ color: playerCount === 1 ? '#ffdd00' : '#ccccdd' }}>
                    1 PLAYER
                  </div>
                  <div className="text-[8px] md:text-[10px]" style={{ color: '#8888aa' }}>
                    {gameMode === 'timeattack' ? '单人刷圈速' : gameMode === 'drift' ? '单人拼漂移' : '单人对战AI'}
                  </div>
                </div>
              </button>
              <button
                onClick={() => setPlayerCount(2)}
                className={`flex-1 p-3 md:p-4 border-4 transition-all ${playerCount === 2 ? 'translate-y-[-2px]' : ''}`}
                style={{
                  background: playerCount === 2 ? '#1a1a3a' : '#12122a',
                  borderColor: playerCount === 2 ? '#ff3366' : '#333366',
                  boxShadow: playerCount === 2 ? '0 0 20px #ff336644, 4px 4px 0 #000000' : '4px 4px 0 #000000',
                }}
              >
                <div className="flex flex-col items-center gap-2">
                  <Users className="w-6 h-6 md:w-8 md:h-8" style={{ color: playerCount === 2 ? '#ff3366' : '#8888aa' }} />
                  <div className="text-xs md:text-sm tracking-wider" style={{ color: playerCount === 2 ? '#ff3366' : '#ccccdd' }}>
                    2 PLAYERS
                  </div>
                  <div className="text-[8px] md:text-[10px]" style={{ color: '#8888aa' }}>
                    本地双人分屏
                  </div>
                </div>
              </button>
            </div>
          </div>

        {playerCount === 2 && (
          <div className="w-full max-w-2xl">
            <div className="text-center mb-2 md:mb-3" style={{ color: '#33ccff' }}>
              <span className="text-[10px] md:text-xs tracking-widest">SPLIT SCREEN</span>
            </div>
            <div className="flex gap-3 md:gap-4">
              <button
                onClick={() => setSplitLayout('horizontal')}
                className={`flex-1 p-3 md:p-4 border-4 transition-all ${splitLayout === 'horizontal' ? 'translate-y-[-2px]' : ''}`}
                style={{
                  background: splitLayout === 'horizontal' ? '#1a1a3a' : '#12122a',
                  borderColor: splitLayout === 'horizontal' ? '#33ccff' : '#333366',
                  boxShadow: splitLayout === 'horizontal' ? '0 0 20px #33ccff44, 4px 4px 0 #000000' : '4px 4px 0 #000000',
                }}
              >
                <div className="flex flex-col items-center gap-2">
                  <Monitor className="w-6 h-6 md:w-8 md:h-8" style={{ color: splitLayout === 'horizontal' ? '#33ccff' : '#8888aa' }} />
                  <div className="text-xs md:text-sm tracking-wider" style={{ color: splitLayout === 'horizontal' ? '#33ccff' : '#ccccdd' }}>
                    上下分屏
                  </div>
                  <div className="text-[8px] md:text-[10px]" style={{ color: '#8888aa' }}>
                    HORIZONTAL
                  </div>
                </div>
              </button>
              <button
                onClick={() => setSplitLayout('vertical')}
                className={`flex-1 p-3 md:p-4 border-4 transition-all ${splitLayout === 'vertical' ? 'translate-y-[-2px]' : ''}`}
                style={{
                  background: splitLayout === 'vertical' ? '#1a1a3a' : '#12122a',
                  borderColor: splitLayout === 'vertical' ? '#33ccff' : '#333366',
                  boxShadow: splitLayout === 'vertical' ? '0 0 20px #33ccff44, 4px 4px 0 #000000' : '4px 4px 0 #000000',
                }}
              >
                <div className="flex flex-col items-center gap-2">
                  <Monitor className="w-6 h-6 md:w-8 md:h-8" style={{ color: splitLayout === 'vertical' ? '#33ccff' : '#8888aa' }} />
                  <div className="text-xs md:text-sm tracking-wider" style={{ color: splitLayout === 'vertical' ? '#33ccff' : '#ccccdd' }}>
                    左右分屏
                  </div>
                  <div className="text-[8px] md:text-[10px]" style={{ color: '#8888aa' }}>
                    VERTICAL
                  </div>
                </div>
              </button>
            </div>
          </div>
        )}

        <div className="flex gap-3 md:gap-6 w-full justify-center">
          <CarSelector
            selectedId={selectedCarIdP1}
            onSelect={selectCarP1}
            label="PLAYER 1"
            color="#00ff88"
            playerIdx={1}
            customization={customizationP1}
          />
          {playerCount === 2 && (
            <CarSelector
              selectedId={selectedCarIdP2}
              onSelect={selectCarP2}
              label="PLAYER 2"
              color="#ff3366"
              playerIdx={2}
              customization={customizationP2}
            />
          )}
        </div>

        <div className="w-full max-w-2xl">
          <div className="text-center mb-2 md:mb-3" style={{ color: '#aaffcc' }}>
            <span className="text-[10px] md:text-xs tracking-widest">WEATHER 天气</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
            {weatherOptions.map((w) => {
              const active = weather === w.id;
              const Icon = w.icon;
              return (
                <button
                  key={w.id}
                  onClick={() => setWeather(w.id)}
                  className={`p-2 md:p-3 border-4 transition-all ${active ? 'translate-y-[-2px]' : ''}`}
                  style={{
                    background: active ? '#1a1a3a' : '#12122a',
                    borderColor: active ? w.color : '#333366',
                    boxShadow: active ? `0 0 20px ${w.color}44, 4px 4px 0 #000000` : '4px 4px 0 #000000',
                  }}
                >
                  <div className="flex flex-col items-center gap-1 md:gap-2">
                    <Icon className="w-5 h-5 md:w-7 md:h-7" style={{ color: active ? w.color : '#8888aa' }} />
                    <div className="text-[10px] md:text-[11px] tracking-wider" style={{ color: active ? w.color : '#ccccdd' }}>
                      {w.label}
                    </div>
                    <div className="text-[7px] md:text-[8px]" style={{ color: '#8888aa' }}>
                      {w.effect}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="w-full max-w-2xl">
          <div className="text-center mb-2 md:mb-3" style={{ color: '#ffcc88' }}>
            <span className="text-[10px] md:text-xs tracking-widest">TIME OF DAY 时间段</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
            {timeOptions.map((t) => {
              const active = timeOfDay === t.id;
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => setTimeOfDay(t.id)}
                  className={`p-2 md:p-3 border-4 transition-all ${active ? 'translate-y-[-2px]' : ''}`}
                  style={{
                    background: active ? '#1a1a3a' : '#12122a',
                    borderColor: active ? t.color : '#333366',
                    boxShadow: active ? `0 0 20px ${t.color}44, 4px 4px 0 #000000` : '4px 4px 0 #000000',
                  }}
                >
                  <div className="flex flex-col items-center gap-1 md:gap-2">
                    <Icon className="w-5 h-5 md:w-7 md:h-7" style={{ color: active ? t.color : '#8888aa' }} />
                    <div className="text-[10px] md:text-[11px] tracking-wider" style={{ color: active ? t.color : '#ccccdd' }}>
                      {t.label}
                    </div>
                    <div className="text-[7px] md:text-[8px]" style={{ color: '#8888aa' }}>
                      {t.effect}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="w-full max-w-2xl">
          <div className="text-center mb-2 md:mb-3" style={{ color: '#ffaa33' }}>
            <span className="text-[10px] md:text-xs tracking-widest">OBSTACLES 障碍物</span>
          </div>
          <button
            onClick={toggleObstacles}
            className={`w-full p-3 md:p-4 border-4 transition-all ${obstaclesEnabled ? '-translate-y-0.5' : ''}`}
            style={{
              background: obstaclesEnabled ? '#1a1a3a' : '#12122a',
              borderColor: obstaclesEnabled ? '#ffaa33' : '#333366',
              boxShadow: obstaclesEnabled ? '0 0 20px #ffaa3344, 4px 4px 0 #000000' : '4px 4px 0 #000000',
            }}
          >
            <div className="flex items-center justify-center gap-3 md:gap-4">
              <AlertTriangle className="w-6 h-6 md:w-7 md:h-7" style={{ color: obstaclesEnabled ? '#ffaa33' : '#8888aa' }} />
              <div className="flex flex-col items-center gap-1">
                <div className="text-xs md:text-sm tracking-wider" style={{ color: obstaclesEnabled ? '#ffaa33' : '#ccccdd' }}>
                  {obstaclesEnabled ? '障碍物已开启' : '障碍物已关闭'}
                </div>
                <div className="text-[7px] md:text-[8px]" style={{ color: '#8888aa' }}>
                  {obstaclesEnabled ? '赛道上会出现移动障碍物' : '无障碍物，专注竞速'}
                </div>
              </div>
              {obstaclesEnabled && <Check className="w-5 h-5 md:w-6 md:h-6" style={{ color: '#00ff88' }} />}
            </div>
          </button>
        </div>

        <div className="w-full max-w-2xl">
          <div className="text-center mb-2 md:mb-3" style={{ color: '#ff00ff' }}>
            <span className="text-[10px] md:text-xs tracking-widest">WACKY 搞怪模式</span>
          </div>
          <button
            onClick={toggleWackyMode}
            className={`w-full p-3 md:p-4 border-4 transition-all ${wackyMode ? '-translate-y-0.5' : ''}`}
            style={{
              background: wackyMode ? '#1a1a3a' : '#12122a',
              borderColor: wackyMode ? '#ff00ff' : '#333366',
              boxShadow: wackyMode ? '0 0 20px #ff00ff44, 4px 4px 0 #000000' : '4px 4px 0 #000000',
            }}
          >
            <div className="flex items-center justify-center gap-3 md:gap-4">
              <Zap className="w-6 h-6 md:w-7 md:h-7" style={{ color: wackyMode ? '#ff00ff' : '#8888aa' }} />
              <div className="flex flex-col items-center gap-1">
                <div className="text-xs md:text-sm tracking-wider" style={{ color: wackyMode ? '#ff00ff' : '#ccccdd' }}>
                  {wackyMode ? '搞怪模式已开启' : '搞怪模式已关闭'}
                </div>
                <div className="text-[7px] md:text-[8px]" style={{ color: '#8888aa' }}>
                  {wackyMode ? '重力周期反转 · 天花板行驶 · 操控反转' : '正常物理规则'}
                </div>
              </div>
              {wackyMode && <Check className="w-5 h-5 md:w-6 md:h-6" style={{ color: '#ff00ff' }} />}
            </div>
          </button>
        </div>

        {gameMode === 'grandprix' && playerCount === 1 && (
          <div className="w-full max-w-2xl">
            <div className="text-center mb-2 md:mb-3" style={{ color: '#33ccff' }}>
              <span className="text-[10px] md:text-xs tracking-widest">AI DIFFICULTY 对手难度</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
              {(['easy', 'normal', 'hard', 'expert'] as AIDifficulty[]).map((diff) => {
                const active = aiDifficulty === diff;
                const color = AI_DIFFICULTY_COLOR[diff];
                const stars = AI_DIFFICULTY_STARS[diff];
                return (
                  <button
                    key={diff}
                    onClick={() => setAIDifficulty(diff)}
                    className={`p-2 md:p-3 border-4 transition-all ${active ? 'translate-y-[-2px]' : ''}`}
                    style={{
                      background: active ? '#1a1a3a' : '#12122a',
                      borderColor: active ? color : '#333366',
                      boxShadow: active ? `0 0 20px ${color}44, 4px 4px 0 #000000` : '4px 4px 0 #000000',
                    }}
                  >
                    <div className="flex flex-col items-center gap-1 md:gap-2">
                      <Bot className="w-5 h-5 md:w-7 md:h-7" style={{ color: active ? color : '#8888aa' }} />
                      <div className="text-[10px] md:text-[11px] tracking-wider" style={{ color: active ? color : '#ccccdd' }}>
                        {AI_DIFFICULTY_LABEL[diff]}
                      </div>
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: 4 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`w-2 h-2 md:w-2.5 md:h-2.5 ${i < stars ? 'fill-current' : ''}`}
                            style={{ color: i < stars ? color : '#333355' }}
                          />
                        ))}
                      </div>
                      <div className="text-[7px] md:text-[8px]" style={{ color: '#8888aa' }}>
                        {AI_DIFFICULTY_DESC[diff]}
                      </div>
                      {active && <Check className="w-3.5 h-3.5 md:w-4 md:h-4" style={{ color: '#00ff88' }} />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="w-full max-w-4xl">
          <div className="text-center mb-2 md:mb-3" style={{ color: '#ff88cc' }}>
            <span className="text-[10px] md:text-xs tracking-widest">TRACK 赛道选择</span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-3 mb-3">
            {PRESET_TRACKS.map((track) => {
              const isSelected = !useCustomTrack && selectedTrackId === track.id;
              const stars = DIFFICULTY_STARS[track.difficulty];
              const diffColor = DIFFICULTY_COLOR[track.difficulty];
              return (
                <button
                  key={track.id}
                  onClick={() => { selectTrack(track.id); if (useCustomTrack) toggleUseCustomTrack(); }}
                  className={`p-2 md:p-3 border-4 transition-all text-left ${isSelected ? '-translate-y-1' : 'hover:-translate-y-0.5'}`}
                  style={{
                    background: isSelected ? '#1a1a3a' : '#12122a',
                    borderColor: isSelected ? track.accentColor : '#333366',
                    boxShadow: isSelected
                      ? `0 0 20px ${track.accentColor}55, 4px 4px 0 #000000`
                      : '3px 3px 0 #000000',
                  }}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 md:w-4 md:h-4" style={{ color: track.accentColor }} />
                      <span
                        className="text-[10px] md:text-[11px] tracking-wider font-bold"
                        style={{ color: isSelected ? track.accentColor : '#ccccdd' }}
                      >
                        {track.name}
                      </span>
                    </div>
                    {isSelected && <Check className="w-3.5 h-3.5 md:w-4 md:h-4" style={{ color: '#00ff88' }} />}
                  </div>

                  <div className="h-10 md:h-12 mb-1.5 rounded overflow-hidden relative" style={{ background: '#0a0a1a', border: `2px solid ${track.accentColor}44` }}>
                    <svg viewBox="0 0 200 120" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
                      {(() => {
                        const pts = track.points;
                        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                        for (const p of pts) {
                          if (p.x < minX) minX = p.x;
                          if (p.y < minY) minY = p.y;
                          if (p.x > maxX) maxX = p.x;
                          if (p.y > maxY) maxY = p.y;
                        }
                        const scaleX = 180 / (maxX - minX || 1);
                        const scaleY = 100 / (maxY - minY || 1);
                        const scale = Math.min(scaleX, scaleY);
                        const offX = 10 + (180 - (maxX - minX) * scale) / 2;
                        const offY = 10 + (100 - (maxY - minY) * scale) / 2;
                        const step = Math.max(1, Math.floor(pts.length / 60));
                        const dPath = pts.map((p, i) => {
                          const x = offX + (p.x - minX) * scale;
                          const y = offY + (p.y - minY) * scale;
                          return i % step === 0 ? `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}` : '';
                        }).filter(Boolean).join(' ') + ' Z';
                        return (
                          <path
                            d={dPath}
                            fill="none"
                            stroke={track.accentColor}
                            strokeWidth="5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            opacity={isSelected ? 1 : 0.6}
                          />
                        );
                      })()}
                    </svg>
                  </div>

                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`w-2.5 h-2.5 md:w-3 md:h-3 ${i < stars ? 'fill-current' : ''}`}
                          style={{ color: i < stars ? diffColor : '#333355' }}
                        />
                      ))}
                    </div>
                    <span
                      className="text-[7px] md:text-[8px] px-1.5 py-0.5 rounded"
                      style={{ color: diffColor, background: `${diffColor}22`, border: `1px solid ${diffColor}55` }}
                    >
                      {DIFFICULTY_LABEL[track.difficulty]}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 mb-1">
                    <Layers className="w-2.5 h-2.5 md:w-3 md:h-3" style={{ color: '#666688' }} />
                    <span className="text-[7px] md:text-[8px]" style={{ color: '#8888aa' }}>
                      {THEME_LABEL[track.theme]} · {track.laps}圈
                    </span>
                  </div>

                  <div className="text-[7px] md:text-[8px] leading-tight" style={{ color: '#666688' }}>
                    {track.description}
                  </div>
                </button>
              );
            })}

            <button
              onClick={() => { if (!useCustomTrack) toggleUseCustomTrack(); }}
              className={`p-2 md:p-3 border-4 transition-all text-left ${useCustomTrack ? '-translate-y-1' : 'hover:-translate-y-0.5'}`}
              style={{
                background: useCustomTrack ? '#1a1a3a' : '#12122a',
                borderColor: useCustomTrack ? '#33ccff' : '#333366',
                boxShadow: useCustomTrack
                  ? '0 0 20px #33ccff55, 4px 4px 0 #000000'
                  : '3px 3px 0 #000000',
              }}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <Pencil className="w-3.5 h-3.5 md:w-4 md:h-4" style={{ color: '#33ccff' }} />
                  <span
                    className="text-[10px] md:text-[11px] tracking-wider font-bold"
                    style={{ color: useCustomTrack ? '#33ccff' : '#ccccdd' }}
                  >
                    自定义赛道
                  </span>
                </div>
                {useCustomTrack && <Check className="w-3.5 h-3.5 md:w-4 md:h-4" style={{ color: '#00ff88' }} />}
              </div>

              <div className="h-10 md:h-12 mb-1.5 rounded overflow-hidden flex items-center justify-center" style={{ background: '#0a0a1a', border: '2px solid #33ccff44' }}>
                <Pencil className="w-6 h-6 md:w-8 md:h-8" style={{ color: '#33ccff', opacity: 0.5 }} />
              </div>

              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Star
                      key={i}
                      className="w-2.5 h-2.5 md:w-3 md:h-3"
                      style={{ color: '#33ccff55' }}
                    />
                  ))}
                </div>
                <span
                  className="text-[7px] md:text-[8px] px-1.5 py-0.5 rounded"
                  style={{ color: '#33ccff', background: '#33ccff22', border: '1px solid #33ccff55' }}
                >
                  自由创作
                </span>
              </div>

              <div className="flex items-center gap-1 mb-1">
                <Layers className="w-2.5 h-2.5 md:w-3 md:h-3" style={{ color: '#666688' }} />
                <span className="text-[7px] md:text-[8px]" style={{ color: '#8888aa' }}>
                  {customTrack.name}
                </span>
              </div>

              <div className="text-[7px] md:text-[8px] leading-tight" style={{ color: '#666688' }}>
                由你自己设计的专属赛道
              </div>
            </button>
          </div>

          <button
            onClick={openEditor}
            className="w-full p-2 md:p-3 border-4 transition-all hover:-translate-y-0.5 active:translate-y-0.5"
            style={{
              background: '#1a1a3a',
              borderColor: '#ff88cc',
              boxShadow: '0 0 12px #ff88cc33, 3px 3px 0 #000000',
            }}
          >
            <div className="flex items-center justify-center gap-2 md:gap-3">
              <Pencil className="w-5 h-5 md:w-6 md:h-6" style={{ color: '#ff88cc' }} />
              <div className="flex flex-col items-center">
                <div className="text-[10px] md:text-xs tracking-wider" style={{ color: '#ff88cc' }}>
                  赛道编辑器
                </div>
                <div className="text-[7px] md:text-[8px]" style={{ color: '#8888aa' }}>
                  自由设计赛道 · 放置加速带 · 道具箱
                </div>
              </div>
            </div>
          </button>
        </div>

        <button
          onClick={resetForCountdown}
          className="mt-1 px-8 md:px-12 py-3 md:py-4 text-base md:text-xl flex items-center gap-3 hover:-translate-y-1 active:translate-y-1 transition-all"
          style={{
            background: '#00ff88',
            color: '#003322',
            border: '4px solid #00aa55',
            boxShadow: '6px 6px 0 #000000',
            animation: 'pulse-glow 2s ease-in-out infinite',
          }}
        >
          <Play className="w-6 h-6 md:w-8 md:h-8 fill-current" />
          START GAME
        </button>

        <div
          className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3 w-full max-w-2xl p-3 md:p-5 mt-1 border-4"
          style={{ background: '#12122a', borderColor: '#333366', boxShadow: '4px 4px 0 #000000' }}
        >
          <div>
            <div className="flex items-center gap-2 mb-2 text-[10px] md:text-xs" style={{ color: '#33ccff' }}>
              <Gamepad2 className="w-4 h-4 md:w-5 md:h-5" /> P1 CONTROLS
            </div>
            <div className="space-y-1 text-[9px] md:text-[10px]" style={{ color: '#ccccdd' }}>
              <div className="flex justify-between"><span>W / ↑</span><span style={{ color: '#00ff88' }}>ACCELERATE</span></div>
              <div className="flex justify-between"><span>S / ↓</span><span style={{ color: '#ff6688' }}>BRAKE</span></div>
              <div className="flex justify-between"><span>A / ←</span><span style={{ color: '#ffdd00' }}>LEFT</span></div>
              <div className="flex justify-between"><span>D / →</span><span style={{ color: '#ffdd00' }}>RIGHT</span></div>
              <div className="flex justify-between"><span>LSHIFT</span><span style={{ color: '#ff88cc' }}>DRIFT</span></div>
              <div className="flex justify-between"><span>SPACE</span><span style={{ color: '#ffaa22' }}>ITEM</span></div>
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-2 text-[10px] md:text-xs" style={{ color: '#ff3366' }}>
              <Gamepad2 className="w-4 h-4 md:w-5 md:h-5" /> {playerCount === 2 ? 'P2 CONTROLS' : 'INFO'}
            </div>
            {playerCount === 2 ? (
              <div className="space-y-1 text-[9px] md:text-[10px]" style={{ color: '#ccccdd' }}>
                <div className="flex justify-between"><span>I</span><span style={{ color: '#00ff88' }}>ACCELERATE</span></div>
                <div className="flex justify-between"><span>K</span><span style={{ color: '#ff6688' }}>BRAKE</span></div>
                <div className="flex justify-between"><span>J</span><span style={{ color: '#ffdd00' }}>LEFT</span></div>
                <div className="flex justify-between"><span>L</span><span style={{ color: '#ffdd00' }}>RIGHT</span></div>
                <div className="flex justify-between"><span>RSHIFT</span><span style={{ color: '#ff88cc' }}>DRIFT</span></div>
                <div className="flex justify-between"><span>ENTER</span><span style={{ color: '#ffaa22' }}>ITEM</span></div>
              </div>
            ) : (
              <div className="space-y-1 text-[9px] md:text-[10px]" style={{ color: '#ccccdd' }}>
                <div className="flex justify-between">
                  <span>3 LAPS</span>
                  <span style={{ color: gameMode === 'timeattack' ? '#ffdd00' : gameMode === 'drift' ? '#ff88cc' : '#33ccff' }}>
                    {gameMode === 'timeattack' ? '刷最佳圈速' : gameMode === 'drift' ? '拼漂移得分' : 'TO WIN'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>⭐ BOX</span>
                  <span style={{ color: '#aaff88' }}>
                    {gameMode === 'timeattack' || gameMode === 'drift' ? '无道具' : 'GET ITEM'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>💨 DRIFT</span>
                  <span style={{ color: '#ff88cc' }}>
                    {gameMode === 'drift' ? '攒分数连击' : '攒加速'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
