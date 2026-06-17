import { useGameStore } from '../store/gameStore';
import { CAR_TEMPLATES } from '../engine/cars';
import type { StripePattern, CarCustomization } from '../engine/types';
import { ArrowLeft, Check, Palette, Hash, Sparkles, RotateCcw, Paintbrush, CircleDot, X } from 'lucide-react';

const PRESET_BODY_COLORS = [
  '#ff3366', '#ffdd00', '#33ccff', '#00ff88',
  '#ff8844', '#aa66ff', '#ff66cc', '#44ddaa',
  '#ff4444', '#222222', '#eeeeee', '#665544',
  '#8822ff', '#0088ff', '#ffaa00', '#22aa66',
];

const PRESET_STRIPE_COLORS = [
  '#ffffff', '#000000', '#ffdd00', '#ff3366',
  '#00ff88', '#33ccff', '#ff8844', '#aa66ff',
  '#ff66cc', '#ffaaaa', '#88ffff', '#ffff88',
];

const PRESET_NUMBER_COLORS = [
  '#ffffff', '#000000', '#ff3366', '#ffdd00',
  '#00ff88', '#33ccff', '#ff8844', '#aa66ff',
];

const PRESET_WHEEL_COLORS = [
  '#111111', '#222222', '#333333', '#555555',
  '#aaaaaa', '#dddddd', '#ffffff', '#442200',
  '#cc3344', '#0088ff', '#ffdd00', '#00ff88',
];

const STRIPE_PATTERNS: { id: StripePattern; label: string; icon: JSX.Element }[] = [
  { id: 'none', label: '无条纹', icon: <div className="w-10 h-3" style={{ background: 'transparent' }} /> },
  { id: 'single', label: '单条纹', icon: <div className="w-10 h-3 flex items-center justify-center"><div className="w-10 h-1.5" /></div> },
  { id: 'double', label: '双条纹', icon: <div className="w-10 h-3 flex flex-col items-center justify-center gap-1"><div className="w-10 h-1" /><div className="w-10 h-1" /></div> },
  { id: 'checker', label: '棋盘格', icon: <div className="w-10 h-3 grid grid-cols-6 grid-rows-2"><div /><div /><div /><div /><div /><div /><div /><div /><div /><div /><div /><div /></div> },
  { id: 'flame', label: '火焰纹', icon: <div className="w-10 h-3 flex items-end justify-around"><div className="w-1 h-1.5" /><div className="w-1 h-3" /><div className="w-1 h-2" /><div className="w-1 h-2.5" /></div> },
];

export default function CarCustomizer() {
  const customizeTarget = useGameStore((s) => s.customizeTarget);
  const playerCount = useGameStore((s) => s.playerCount);
  const customizationP1 = useGameStore((s) => s.customizationP1);
  const customizationP2 = useGameStore((s) => s.customizationP2);
  const updateCustomizationP1 = useGameStore((s) => s.updateCustomizationP1);
  const updateCustomizationP2 = useGameStore((s) => s.updateCustomizationP2);
  const closeCustomizer = useGameStore((s) => s.closeCustomizer);
  const resetCustomization = useGameStore((s) => s.resetCustomization);
  const setCustomizeTarget = useGameStore((s) => s.setCustomizeTarget);

  const currentCust = customizeTarget === 1 ? customizationP1 : customizationP2;
  const updateCust = (patch: Partial<CarCustomization>) => {
    if (customizeTarget === 1) updateCustomizationP1(patch);
    else updateCustomizationP2(patch);
  };

  const hexToRgb = (hex: string): [number, number, number] => {
    const h = hex.replace('#', '');
    return [
      parseInt(h.substring(0, 2), 16),
      parseInt(h.substring(2, 4), 16),
      parseInt(h.substring(4, 6), 16),
    ];
  };

  const darkenColor = (hex: string, amount: number = 0.35): string => {
    const [r, g, b] = hexToRgb(hex);
    const d = (v: number) => Math.max(0, Math.round(v * (1 - amount)));
    return `#${d(r).toString(16).padStart(2, '0')}${d(g).toString(16).padStart(2, '0')}${d(b).toString(16).padStart(2, '0')}`;
  };

  const CarPreviewSVG = ({ cust, big = false }: { cust: CarCustomization; big?: boolean }) => {
    const w = big ? 280 : 40;
    const h = big ? 196 : 28;
    const s = big ? 1 : 0.14;
    const bodyDark = darkenColor(cust.bodyColor, 0.3);

    const renderStripe = (pattern: StripePattern, stripeColor: string) => {
      if (pattern === 'none' || !cust.stripeEnabled) return null;

      if (pattern === 'single') {
        return (
          <g>
            <rect x={4 * w / 40} y={13 * h / 28} width={32 * w / 40} height={2 * h / 28} fill={stripeColor} />
          </g>
        );
      }
      if (pattern === 'double') {
        return (
          <g>
            <rect x={4 * w / 40} y={10 * h / 28} width={32 * w / 40} height={2 * h / 28} fill={stripeColor} />
            <rect x={4 * w / 40} y={17 * h / 28} width={32 * w / 40} height={2 * h / 28} fill={stripeColor} />
          </g>
        );
      }
      if (pattern === 'checker') {
        const cells = [];
        const cellW = 2 * w / 40;
        const cellH = 2 * h / 28;
        for (let row = 0; row < 4; row++) {
          for (let col = 0; col < 16; col++) {
            if ((row + col) % 2 === 0) {
              cells.push(
                <rect
                  key={`${row}-${col}`}
                  x={(5 + col * 2) * w / 40}
                  y={(9 + row) * h / 28}
                  width={cellW}
                  height={cellH}
                  fill={stripeColor}
                />
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
              d={`M ${4 * w / 40} ${13 * h / 28}
                  L ${8 * w / 40} ${12 * h / 28}
                  L ${10 * w / 40} ${8 * h / 28}
                  L ${14 * w / 40} ${12 * h / 28}
                  L ${18 * w / 40} ${9 * h / 28}
                  L ${22 * w / 40} ${13 * h / 28}
                  L ${26 * w / 40} ${10 * h / 28}
                  L ${30 * w / 40} ${14 * h / 28}
                  L ${36 * w / 40} ${12 * h / 28}
                  L ${36 * w / 40} ${16 * h / 28}
                  L ${4 * w / 40} ${16 * h / 28}
                  Z`}
              fill={stripeColor}
            />
            <path
              d={`M ${4 * w / 40} ${14 * h / 28}
                  L ${8 * w / 40} ${13 * h / 28}
                  L ${10 * w / 40} ${11 * h / 28}
                  L ${14 * w / 40} ${13 * h / 28}
                  L ${18 * w / 40} ${11.5 * h / 28}
                  L ${22 * w / 40} ${14 * h / 28}
                  L ${26 * w / 40} ${12 * h / 28}
                  L ${30 * w / 40} ${14.5 * h / 28}
                  L ${36 * w / 40} ${13 * h / 28}
                  L ${36 * w / 40} ${15 * h / 28}
                  L ${4 * w / 40} ${15 * h / 28}
                  Z`}
              fill={darkenColor(stripeColor, 0.2)}
            />
          </g>
        );
      }
      return null;
    };

    return (
      <div style={{ width: w, height: h }}>
        <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-full" style={{ imageRendering: 'pixelated' }}>
          <rect x={2 * w / 40} y={8 * h / 28} width={4 * w / 40} height={3 * h / 28} fill={cust.wheelColor} />
          <rect x={2 * w / 40} y={17 * h / 28} width={4 * w / 40} height={3 * h / 28} fill={cust.wheelColor} />
          <rect x={34 * w / 40} y={8 * h / 28} width={4 * w / 40} height={3 * h / 28} fill={cust.wheelColor} />
          <rect x={34 * w / 40} y={17 * h / 28} width={4 * w / 40} height={3 * h / 28} fill={cust.wheelColor} />

          <rect x={4 * w / 40} y={6 * h / 28} width={32 * w / 40} height={18 * h / 28} fill={cust.bodyColor} />
          <rect x={4 * w / 40} y={6 * h / 28} width={32 * w / 40} height={3 * h / 28} fill={bodyDark} />
          <rect x={4 * w / 40} y={21 * h / 28} width={32 * w / 40} height={3 * h / 28} fill={bodyDark} />
          <rect x={4 * w / 40} y={6 * h / 28} width={5 * w / 40} height={18 * h / 28} fill={bodyDark} />

          {renderStripe(cust.stripePattern, cust.stripeColor)}

          <rect x={18 * w / 40} y={8 * h / 28} width={12 * w / 40} height={14 * h / 28} fill="#223344" />
          <rect x={20 * w / 40} y={10 * h / 28} width={8 * w / 40} height={10 * h / 28} fill="#44aadd" />

          <rect x={32 * w / 40} y={10 * h / 28} width={3 * w / 40} height={3 * h / 28} fill="#ffcc33" />
          <rect x={32 * w / 40} y={15 * h / 28} width={3 * w / 40} height={3 * h / 28} fill="#ffcc33" />

          <rect x={5 * w / 40} y={10 * h / 28} width={3 * w / 40} height={3 * h / 28} fill="#ff4444" />
          <rect x={5 * w / 40} y={15 * h / 28} width={3 * w / 40} height={3 * h / 28} fill="#ff4444" />

          {cust.numberEnabled && cust.number && (
            <text
              x={11 * w / 40}
              y={16.5 * h / 28}
              fontSize={s < 1 ? 8 * s : 12}
              fill={cust.numberColor}
              style={{ fontFamily: '"Press Start 2P", "Courier New", monospace', fontWeight: 'bold' }}
              textAnchor="middle"
            >
              {cust.number.slice(0, 2)}
            </text>
          )}
        </svg>
      </div>
    );
  };

  const ColorSwatches = ({
    label,
    icon: Icon,
    colors,
    value,
    onChange,
    allowReset,
  }: {
    label: string;
    icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
    colors: string[];
    value: string;
    onChange: (c: string) => void;
    allowReset?: boolean;
  }) => (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 md:w-5 md:h-5" style={{ color: value }} />
        <span className="text-[10px] md:text-xs tracking-wider" style={{ color: '#ccccdd' }}>
          {label}
        </span>
        {allowReset && (
          <button
            onClick={() => onChange('#111111')}
            className="ml-auto text-[8px] px-2 py-1 border-2 hover:border-[#ff6688] transition-all"
            style={{ background: '#1a1a3a', borderColor: '#333366', color: '#8888aa' }}
          >
            重置
          </button>
        )}
      </div>
      <div className="grid grid-cols-8 gap-1.5 md:gap-2 mb-2">
        {colors.map((c) => (
          <button
            key={c}
            onClick={() => onChange(c)}
            className="w-full aspect-square border-4 transition-all hover:scale-110"
            style={{
              background: c,
              borderColor: value === c ? '#ffffff' : '#000000',
              boxShadow: value === c ? `0 0 12px ${c}` : 'none',
              transform: value === c ? 'translateY(-2px)' : 'none',
            }}
          />
        ))}
      </div>
      <div className="flex items-center gap-2">
        <label className="text-[9px]" style={{ color: '#8888aa' }}>自定义:</label>
        <div
          className="flex items-center gap-1 flex-1 border-4 px-1 py-1"
          style={{ background: '#1a1a3a', borderColor: '#333366' }}
        >
          <div
            className="w-5 h-5 md:w-6 md:h-6 border-2"
            style={{ background: value, borderColor: '#000000' }}
          />
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="flex-1 h-5 md:h-6 bg-transparent cursor-pointer"
            style={{ border: 'none', padding: 0 }}
          />
        </div>
      </div>
    </div>
  );

  const SectionHeader = ({ icon: Icon, text, color }: {
    icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
    text: string;
    color: string;
  }) => (
    <div className="flex items-center gap-2 mb-3 pb-2 border-b-2" style={{ borderColor: '#2a2a5a' }}>
      <Icon className="w-5 h-5 md:w-6 md:h-6" style={{ color }} />
      <span className="text-[11px] md:text-sm tracking-wider" style={{ color }}>
        {text}
      </span>
    </div>
  );

  const headerColor = customizeTarget === 1 ? '#00ff88' : '#ff3366';
  const headerLabel = customizeTarget === 1 ? 'PLAYER 1 赛车定制' : 'PLAYER 2 赛车定制';

  return (
    <div className="w-full h-full flex flex-col items-center justify-center relative overflow-hidden overflow-y-auto py-3 md:py-4 px-2 md:px-4">
      <div className="absolute inset-0 opacity-15">
        {Array.from({ length: 40 }).map((_, i) => (
          <div
            key={i}
            className="absolute"
            style={{
              left: `${(i * 41) % 100}%`,
              top: `${(i * 67) % 100}%`,
              width: 6, height: 6,
              background: [headerColor, '#ffdd00', '#33ccff', '#00ff88'][i % 4],
              animation: `pulse-glow ${2 + (i % 4)}s ease-in-out infinite`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 w-full max-w-5xl flex flex-col gap-3 md:gap-4">
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={closeCustomizer}
            className="px-3 md:px-4 py-2 md:py-3 flex items-center gap-2 hover:-translate-y-0.5 active:translate-y-0.5 transition-all"
            style={{
              background: '#1a1a3a',
              color: '#ccccdd',
              border: '4px solid #333366',
              boxShadow: '4px 4px 0 #000000',
            }}
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-[10px] md:text-xs hidden sm:inline">返回菜单</span>
          </button>

          <div
            className="flex-1 text-center py-2 md:py-3 px-4 border-4"
            style={{
              background: '#12122a',
              borderColor: headerColor,
              boxShadow: `0 0 24px ${headerColor}44, 4px 4px 0 #000000`,
            }}
          >
            <h2
              className="text-base md:text-2xl tracking-widest"
              style={{ color: headerColor, textShadow: `3px 3px 0 ${darkenColor(headerColor, 0.6)}` }}
            >
              {headerLabel}
            </h2>
          </div>

          {playerCount === 2 && (
            <div className="flex gap-2">
              <button
                onClick={() => setCustomizeTarget(1)}
                className="px-3 md:px-4 py-2 md:py-3 text-[10px] md:text-xs transition-all"
                style={{
                  background: customizeTarget === 1 ? '#1a1a3a' : '#12122a',
                  color: customizeTarget === 1 ? '#00ff88' : '#8888aa',
                  border: `4px solid ${customizeTarget === 1 ? '#00ff88' : '#333366'}`,
                  boxShadow: customizeTarget === 1 ? '0 0 16px #00ff8844, 4px 4px 0 #000000' : '4px 4px 0 #000000',
                }}
              >
                P1
              </button>
              <button
                onClick={() => setCustomizeTarget(2)}
                className="px-3 md:px-4 py-2 md:py-3 text-[10px] md:text-xs transition-all"
                style={{
                  background: customizeTarget === 2 ? '#1a1a3a' : '#12122a',
                  color: customizeTarget === 2 ? '#ff3366' : '#8888aa',
                  border: `4px solid ${customizeTarget === 2 ? '#ff3366' : '#333366'}`,
                  boxShadow: customizeTarget === 2 ? '0 0 16px #ff336644, 4px 4px 0 #000000' : '4px 4px 0 #000000',
                }}
              >
                P2
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-3 md:gap-4">
          <div
            className="lg:col-span-2 p-4 md:p-6 border-4 flex flex-col"
            style={{
              background: '#12122a',
              borderColor: headerColor,
              boxShadow: `0 0 24px ${headerColor}33, 4px 4px 0 #000000`,
            }}
          >
            <div className="text-center mb-4 md:mb-5">
              <span className="text-[10px] md:text-xs tracking-widest" style={{ color: headerColor }}>
                实时预览 PREVIEW
              </span>
            </div>

            <div
              className="flex-1 flex flex-col items-center justify-center gap-4 p-4 rounded"
              style={{
                background: 'repeating-linear-gradient(45deg, #1a1a3a, #1a1a3a 16px, #161630 16px, #161630 32px)',
                border: '4px solid #2a2a5a',
              }}
            >
              <div style={{ transform: 'perspective(400px) rotateX(10deg)' }}>
                <CarPreviewSVG cust={currentCust} big={true} />
              </div>

              <div className="w-full flex flex-col gap-2 mt-2">
                <div
                  className="text-center py-2 border-4"
                  style={{
                    background: '#1a1a3a',
                    borderColor: '#333366',
                  }}
                >
                  <div className="text-[8px]" style={{ color: '#8888aa' }}>侧视图 SIDE</div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div
                    className="flex items-center justify-center aspect-video border-4 p-2"
                    style={{ background: '#1a1a3a', borderColor: '#333366' }}
                  >
                    <div style={{ transform: 'rotate(-20deg)' }}>
                      <CarPreviewSVG cust={currentCust} />
                    </div>
                  </div>
                  <div
                    className="flex items-center justify-center aspect-video border-4 p-2"
                    style={{ background: '#1a1a3a', borderColor: '#333366' }}
                  >
                    <CarPreviewSVG cust={currentCust} />
                  </div>
                  <div
                    className="flex items-center justify-center aspect-video border-4 p-2"
                    style={{ background: '#1a1a3a', borderColor: '#333366' }}
                  >
                    <div style={{ transform: 'rotate(20deg)' }}>
                      <CarPreviewSVG cust={currentCust} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <button
                onClick={() => resetCustomization(customizeTarget)}
                className="flex-1 px-3 py-2 md:py-3 flex items-center justify-center gap-2 text-[9px] md:text-[10px] hover:-translate-y-0.5 active:translate-y-0.5 transition-all"
                style={{
                  background: '#2a2a4a',
                  color: '#ff8866',
                  border: '4px solid #444477',
                  boxShadow: '3px 3px 0 #000000',
                }}
              >
                <RotateCcw className="w-4 h-4" />
                恢复默认
              </button>
              <button
                onClick={closeCustomizer}
                className="flex-1 px-3 py-2 md:py-3 flex items-center justify-center gap-2 text-[9px] md:text-[10px] hover:-translate-y-0.5 active:translate-y-0.5 transition-all"
                style={{
                  background: headerColor,
                  color: darkenColor(headerColor, 0.7),
                  border: `4px solid ${darkenColor(headerColor, 0.4)}`,
                  boxShadow: `3px 3px 0 #000000, 0 0 16px ${headerColor}66`,
                }}
              >
                <Check className="w-4 h-4" />
                完成定制
              </button>
            </div>
          </div>

          <div
            className="lg:col-span-3 p-3 md:p-5 border-4 overflow-y-auto"
            style={{
              background: '#12122a',
              borderColor: '#333366',
              boxShadow: '4px 4px 0 #000000',
              maxHeight: '78vh',
            }}
          >
            <div className="space-y-4 md:space-y-5">
              <div>
                <SectionHeader icon={Palette} text="车身颜色 BODY COLOR" color="#00ff88" />
                <ColorSwatches
                  label="选择配色"
                  icon={Paintbrush}
                  colors={PRESET_BODY_COLORS}
                  value={currentCust.bodyColor}
                  onChange={(c) => updateCust({ bodyColor: c })}
                />
              </div>

              <div>
                <SectionHeader icon={Sparkles} text="条纹装饰 STRIPES" color="#ffdd00" />

                <div className="mb-3 flex items-center gap-3">
                  <button
                    onClick={() => updateCust({ stripeEnabled: !currentCust.stripeEnabled })}
                    className="flex-1 px-3 py-2 flex items-center justify-between border-4 transition-all"
                    style={{
                      background: currentCust.stripeEnabled ? '#1a1a3a' : '#12122a',
                      borderColor: currentCust.stripeEnabled ? '#ffdd00' : '#333366',
                      boxShadow: currentCust.stripeEnabled ? '0 0 16px #ffdd0044, 3px 3px 0 #000000' : '3px 3px 0 #000000',
                    }}
                  >
                    <span className="text-[10px] md:text-xs" style={{ color: currentCust.stripeEnabled ? '#ffdd00' : '#8888aa' }}>
                      条纹开关
                    </span>
                    <div
                      className="w-10 h-5 flex items-center px-0.5 transition-all"
                      style={{
                        background: currentCust.stripeEnabled ? '#ffdd00' : '#333366',
                        border: '2px solid #000000',
                      }}
                    >
                      <div
                        className="w-3.5 h-3.5 transition-all"
                        style={{
                          background: '#000000',
                          transform: currentCust.stripeEnabled ? 'translateX(16px)' : 'translateX(0)',
                        }}
                      />
                    </div>
                  </button>
                </div>

                <div className={`transition-all ${currentCust.stripeEnabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                  <div className="mb-3">
                    <div className="text-[10px] md:text-xs mb-2 tracking-wider" style={{ color: '#ccccdd' }}>
                      图案选择
                    </div>
                    <div className="grid grid-cols-5 gap-2">
                      {STRIPE_PATTERNS.map((p) => {
                        const active = currentCust.stripePattern === p.id;
                        return (
                          <button
                            key={p.id}
                            onClick={() => updateCust({ stripePattern: p.id, stripeEnabled: true })}
                            className="p-2 md:p-3 border-4 flex flex-col items-center gap-2 transition-all hover:translate-y-[-2px]"
                            style={{
                              background: active ? '#1a1a3a' : '#12122a',
                              borderColor: active ? '#ffdd00' : '#333366',
                              boxShadow: active ? '0 0 16px #ffdd0044, 3px 3px 0 #000000' : '3px 3px 0 #000000',
                            }}
                          >
                            <div
                              className="w-full h-6 md:h-8 flex items-center justify-center rounded"
                              style={{ background: currentCust.bodyColor }}
                            >
                              <div style={{ color: currentCust.stripeColor }}>
                                {p.id === 'none' ? (
                                  <X className="w-5 h-5 md:w-6 md:h-6" />
                                ) : p.id === 'single' ? (
                                  <div className="w-12 md:w-16 h-1.5 md:h-2" style={{ background: currentCust.stripeColor }} />
                                ) : p.id === 'double' ? (
                                  <div className="flex flex-col gap-1">
                                    <div className="w-12 md:w-16 h-1" style={{ background: currentCust.stripeColor }} />
                                    <div className="w-12 md:w-16 h-1" style={{ background: currentCust.stripeColor }} />
                                  </div>
                                ) : p.id === 'checker' ? (
                                  <div className="grid grid-cols-6 grid-rows-2 w-12 md:w-16 h-4 md:h-5">
                                    {Array.from({ length: 12 }).map((_, i) => (
                                      <div
                                        key={i}
                                        style={{
                                          background: i % 2 === 0 ? currentCust.stripeColor : 'transparent',
                                        }}
                                      />
                                    ))}
                                  </div>
                                ) : (
                                  <div className="flex items-end justify-around w-12 md:w-16 h-4 md:h-5">
                                    {[10, 20, 14, 18, 16].map((v, i) => (
                                      <div
                                        key={i}
                                        style={{
                                          width: 4,
                                          height: `${v * 0.9}px`,
                                          background: currentCust.stripeColor,
                                        }}
                                      />
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                            <span className="text-[8px] md:text-[9px]" style={{ color: active ? '#ffdd00' : '#8888aa' }}>
                              {p.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <ColorSwatches
                    label="条纹颜色"
                    icon={Sparkles}
                    colors={PRESET_STRIPE_COLORS}
                    value={currentCust.stripeColor}
                    onChange={(c) => updateCust({ stripeColor: c })}
                  />
                </div>
              </div>

              <div>
                <SectionHeader icon={Hash} text="车牌号码 NUMBER" color="#33ccff" />

                <div className="mb-3 flex items-center gap-3">
                  <button
                    onClick={() => updateCust({ numberEnabled: !currentCust.numberEnabled })}
                    className="flex-1 px-3 py-2 flex items-center justify-between border-4 transition-all"
                    style={{
                      background: currentCust.numberEnabled ? '#1a1a3a' : '#12122a',
                      borderColor: currentCust.numberEnabled ? '#33ccff' : '#333366',
                      boxShadow: currentCust.numberEnabled ? '0 0 16px #33ccff44, 3px 3px 0 #000000' : '3px 3px 0 #000000',
                    }}
                  >
                    <span className="text-[10px] md:text-xs" style={{ color: currentCust.numberEnabled ? '#33ccff' : '#8888aa' }}>
                      号码显示
                    </span>
                    <div
                      className="w-10 h-5 flex items-center px-0.5 transition-all"
                      style={{
                        background: currentCust.numberEnabled ? '#33ccff' : '#333366',
                        border: '2px solid #000000',
                      }}
                    >
                      <div
                        className="w-3.5 h-3.5 transition-all"
                        style={{
                          background: '#000000',
                          transform: currentCust.numberEnabled ? 'translateX(16px)' : 'translateX(0)',
                        }}
                      />
                    </div>
                  </button>
                </div>

                <div className={`transition-all ${currentCust.numberEnabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                  <div className="mb-3">
                    <div className="text-[10px] md:text-xs mb-2 tracking-wider" style={{ color: '#ccccdd' }}>
                      输入号码（最多2位）
                    </div>
                    <div className="flex gap-2 items-center">
                      <input
                        type="text"
                        value={currentCust.number}
                        onChange={(e) => {
                          const v = e.target.value.replace(/[^0-9A-Za-z]/g, '').toUpperCase().slice(0, 2);
                          updateCust({ number: v });
                        }}
                        maxLength={2}
                        className="flex-1 px-4 py-3 text-center text-2xl md:text-3xl border-4 outline-none"
                        style={{
                          background: '#1a1a3a',
                          color: currentCust.numberColor,
                          borderColor: '#33ccff',
                          fontFamily: '"Press Start 2P", "Courier New", monospace',
                          letterSpacing: '0.3em',
                          boxShadow: '0 0 12px #33ccff33, 3px 3px 0 #000000',
                        }}
                        placeholder="00"
                      />
                    </div>
                    <div className="mt-2 grid grid-cols-6 gap-1.5 md:gap-2">
                      {['01', '07', '13', '24', '88', '99'].map((n) => (
                        <button
                          key={n}
                          onClick={() => updateCust({ number: n })}
                          className="px-2 py-2 border-4 text-[10px] md:text-xs hover:border-[#33ccff] hover:bg-[#1a1a3a] transition-all"
                          style={{
                            background: currentCust.number === n ? '#1a1a3a' : '#12122a',
                            borderColor: currentCust.number === n ? '#33ccff' : '#333366',
                            color: currentCust.numberColor,
                            fontFamily: '"Press Start 2P", "Courier New", monospace',
                            boxShadow: currentCust.number === n ? '0 0 12px #33ccff44' : 'none',
                          }}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>

                  <ColorSwatches
                    label="号码颜色"
                    icon={Hash}
                    colors={PRESET_NUMBER_COLORS}
                    value={currentCust.numberColor}
                    onChange={(c) => updateCust({ numberColor: c })}
                  />
                </div>
              </div>

              <div>
                <SectionHeader icon={CircleDot} text="车轮颜色 WHEELS" color="#ff88cc" />
                <ColorSwatches
                  label="选择配色"
                  icon={CircleDot}
                  colors={PRESET_WHEEL_COLORS}
                  value={currentCust.wheelColor}
                  onChange={(c) => updateCust({ wheelColor: c })}
                  allowReset
                />
              </div>

              <div>
                <div className="flex items-center gap-2 mb-3 pb-2 border-b-2" style={{ borderColor: '#2a2a5a' }}>
                  <Palette className="w-5 h-5 md:w-6 md:h-6" style={{ color: '#aa66ff' }} />
                  <span className="text-[11px] md:text-sm tracking-wider" style={{ color: '#aa66ff' }}>
                    快速预设色板 PRESETS
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-2 md:gap-3">
                  {CAR_TEMPLATES.map((tpl) => (
                    <button
                      key={tpl.id}
                      onClick={() => {
                        updateCust({
                          bodyColor: tpl.color,
                          stripeColor: darkenColor(tpl.color, 0.3),
                          stripeEnabled: false,
                          wheelColor: '#111111',
                        });
                      }}
                      className="p-2 md:p-3 border-4 transition-all hover:translate-y-[-2px]"
                      style={{
                        background: '#12122a',
                        borderColor: tpl.color,
                        boxShadow: `3px 3px 0 #000000`,
                      }}
                    >
                      <div
                        className="w-full aspect-[40/28] mb-2 p-1 rounded"
                        style={{ background: '#1a1a3a' }}
                      >
                        <CarPreviewSVG
                          cust={{
                            bodyColor: tpl.color,
                            stripeColor: darkenColor(tpl.color, 0.3),
                            stripePattern: 'none',
                            stripeEnabled: false,
                            numberColor: '#ffffff',
                            number: '',
                            numberEnabled: false,
                            wheelColor: '#111111',
                          }}
                        />
                      </div>
                      <div
                        className="text-center text-[8px] md:text-[9px] tracking-widest"
                        style={{ color: tpl.color, textShadow: `1px 1px 0 ${tpl.colorDark}` }}
                      >
                        {tpl.name}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
