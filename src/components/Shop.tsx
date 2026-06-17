import { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { CAR_TEMPLATES } from '../engine/cars';
import { CAR_SKINS, calcUpgradeCost, MAX_UPGRADE_LEVEL } from '../engine/skins';
import type { UpgradeType, StripePattern } from '../engine/types';
import { Home, Coins, Zap, Gauge, RotateCcw, Sparkles, Lock, Check, ShoppingCart } from 'lucide-react';

export default function Shop() {
  const closeShop = useGameStore((s) => s.closeShop);
  const coins = useGameStore((s) => s.coins);
  const upgrades = useGameStore((s) => s.upgrades);
  const ownedSkins = useGameStore((s) => s.ownedSkins);
  const selectedSkinP1 = useGameStore((s) => s.selectedSkinP1);
  const selectedSkinP2 = useGameStore((s) => s.selectedSkinP2);
  const playerCount = useGameStore((s) => s.playerCount);
  const upgradeCarStat = useGameStore((s) => s.upgradeCarStat);
  const buySkin = useGameStore((s) => s.buySkin);
  const selectSkin = useGameStore((s) => s.selectSkin);
  const selectedCarIdP1 = useGameStore((s) => s.selectedCarIdP1);

  const [tab, setTab] = useState<'upgrade' | 'skins'>('upgrade');
  const [upgradeCar, setUpgradeCar] = useState<number>(selectedCarIdP1);

  const statConfig: { id: UpgradeType; name: string; icon: typeof Zap; color: string; desc: string }[] = [
    { id: 'speed', name: '最高速度', icon: Gauge, color: '#ff3366', desc: '+0.1 速度/级' },
    { id: 'acceleration', name: '加速度', icon: Zap, color: '#ffdd00', desc: '+0.08 加速/级' },
    { id: 'handling', name: '操控性', icon: RotateCcw, color: '#33ccff', desc: '+0.06 操控/级' },
    { id: 'friction', name: '抓地力', icon: Sparkles, color: '#00ff88', desc: '+0.02 摩擦/级' },
  ];

  const darkenColor = (hex: string, amount: number = 0.35): string => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const dr = Math.max(0, Math.floor(r * (1 - amount)));
    const dg = Math.max(0, Math.floor(g * (1 - amount)));
    const db = Math.max(0, Math.floor(b * (1 - amount)));
    return `#${dr.toString(16).padStart(2, '0')}${dg.toString(16).padStart(2, '0')}${db.toString(16).padStart(2, '0')}`;
  };

  const renderStripe = (pattern: StripePattern, stripeColor: string, stripeEnabled: boolean) => {
    if (pattern === 'none' || !stripeEnabled) return null;
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
    <div className="w-full h-full flex flex-col items-center justify-start relative overflow-hidden overflow-y-auto py-4">
      <div className="absolute inset-0 opacity-20">
        {Array.from({ length: 50 }).map((_, i) => (
          <div
            key={i}
            className="absolute"
            style={{
              left: `${(i * 37) % 100}%`,
              top: `${(i * 53) % 100}%`,
              width: 8, height: 8,
              background: ['#ffd700', '#ff3366', '#33ccff', '#00ff88'][i % 4],
              animation: `pulse-glow ${2 + (i % 3)}s ease-in-out infinite`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 w-full max-w-4xl px-3 md:px-4">
        <div className="flex items-center justify-between mb-4 md:mb-6">
          <button
            onClick={closeShop}
            className="px-4 py-2 md:py-2.5 flex items-center gap-2 text-[10px] md:text-xs hover:-translate-y-0.5 active:translate-y-0.5 transition-all"
            style={{
              background: '#333355',
              color: '#ccccdd',
              border: '3px solid #555588',
              boxShadow: '3px 3px 0 #000000',
            }}
          >
            <Home className="w-4 h-4 md:w-5 md:h-5" />
            返回
          </button>

          <h1
            className="text-xl md:text-3xl tracking-widest"
            style={{
              color: '#ffd700',
              textShadow: '3px 3px 0 #665500, 0 0 30px #ffd70066',
            }}
          >
            SHOP 商店
          </h1>

          <div
            className="px-4 py-2 md:py-2.5 flex items-center gap-2 border-4"
            style={{
              background: '#1a1a3a',
              borderColor: '#ffd700',
              boxShadow: '0 0 15px #ffd70044, 3px 3px 0 #000000',
            }}
          >
            <Coins className="w-4 h-4 md:w-5 md:h-5" style={{ color: '#ffd700' }} />
            <span className="text-[10px] md:text-sm tracking-wider" style={{ color: '#ffd700' }}>
              {coins}
            </span>
          </div>
        </div>

        <div className="flex gap-2 md:gap-3 mb-4 md:mb-5 justify-center">
          <button
            onClick={() => setTab('upgrade')}
            className={`px-5 md:px-8 py-2 md:py-3 text-[10px] md:text-sm tracking-wider border-4 transition-all ${tab === 'upgrade' ? '-translate-y-0.5' : ''}`}
            style={{
              background: tab === 'upgrade' ? '#1a1a3a' : '#12122a',
              borderColor: tab === 'upgrade' ? '#33ccff' : '#333366',
              color: tab === 'upgrade' ? '#33ccff' : '#8888aa',
              boxShadow: tab === 'upgrade' ? '0 0 20px #33ccff44, 3px 3px 0 #000' : '3px 3px 0 #000',
            }}
          >
            ⚡ 属性升级
          </button>
          <button
            onClick={() => setTab('skins')}
            className={`px-5 md:px-8 py-2 md:py-3 text-[10px] md:text-sm tracking-wider border-4 transition-all ${tab === 'skins' ? '-translate-y-0.5' : ''}`}
            style={{
              background: tab === 'skins' ? '#1a1a3a' : '#12122a',
              borderColor: tab === 'skins' ? '#ff88cc' : '#333366',
              color: tab === 'skins' ? '#ff88cc' : '#8888aa',
              boxShadow: tab === 'skins' ? '0 0 20px #ff88cc44, 3px 3px 0 #000' : '3px 3px 0 #000',
            }}
          >
            🎨 赛车皮肤
          </button>
        </div>

        {tab === 'upgrade' && (
          <div className="space-y-4 md:space-y-5">
            <div className="flex gap-2 md:gap-3 justify-center flex-wrap">
              {CAR_TEMPLATES.map((tpl) => (
                <button
                  key={tpl.id}
                  onClick={() => setUpgradeCar(tpl.id)}
                  className={`px-4 py-2 md:py-2.5 text-[9px] md:text-[10px] tracking-wider border-4 transition-all ${upgradeCar === tpl.id ? '-translate-y-0.5' : ''}`}
                  style={{
                    background: upgradeCar === tpl.id ? '#1a1a3a' : '#12122a',
                    borderColor: upgradeCar === tpl.id ? tpl.color : '#333366',
                    color: upgradeCar === tpl.id ? tpl.color : '#aaaaee',
                    boxShadow: upgradeCar === tpl.id ? `0 0 15px ${tpl.color}44, 3px 3px 0 #000` : '3px 3px 0 #000',
                  }}
                >
                  {tpl.name}
                </button>
              ))}
            </div>

            {(() => {
              const tpl = CAR_TEMPLATES[upgradeCar];
              const up = upgrades[upgradeCar] ?? { speed: 0, acceleration: 0, handling: 0, friction: 0 };
              return (
                <div
                  className="p-4 md:p-6 border-4"
                  style={{
                    background: '#12122a',
                    borderColor: tpl.color,
                    boxShadow: `0 0 30px ${tpl.color}33, 5px 5px 0 #000`,
                  }}
                >
                  <div className="text-center mb-4 md:mb-5">
                    <div
                      className="text-lg md:text-2xl tracking-widest mb-2"
                      style={{ color: tpl.color, textShadow: `2px 2px 0 ${darkenColor(tpl.color)}` }}
                    >
                      {tpl.name}
                    </div>
                    <div className="flex justify-center mb-2">
                      <svg viewBox="0 0 40 28" className="w-24 h-16 md:w-32 md:h-20">
                        <rect x="2" y="8" width="4" height="3" fill="#111" />
                        <rect x="2" y="17" width="4" height="3" fill="#111" />
                        <rect x="34" y="8" width="4" height="3" fill="#111" />
                        <rect x="34" y="17" width="4" height="3" fill="#111" />
                        <rect x="4" y="6" width="32" height="18" fill={tpl.color} />
                        <rect x="4" y="6" width="32" height="3" fill={tpl.colorDark} />
                        <rect x="4" y="21" width="32" height="3" fill={tpl.colorDark} />
                        <rect x="4" y="6" width="5" height="18" fill={tpl.colorDark} />
                        <rect x="18" y="8" width="12" height="14" fill="#223344" />
                        <rect x="20" y="10" width="8" height="10" fill="#44aadd" />
                      </svg>
                    </div>
                  </div>

                  <div className="space-y-3 md:space-y-4">
                    {statConfig.map((stat) => {
                      const level = up[stat.id];
                      const cost = calcUpgradeCost(level);
                      const maxed = level >= MAX_UPGRADE_LEVEL;
                      const canAfford = coins >= cost;
                      const Icon = stat.icon;
                      return (
                        <div
                          key={stat.id}
                          className="p-3 md:p-4 border-2"
                          style={{ background: '#15152e', borderColor: '#2a2a55' }}
                        >
                          <div className="flex items-center gap-2 md:gap-3 mb-2">
                            <Icon
                              className="w-5 h-5 md:w-6 md:h-6"
                              style={{ color: stat.color }}
                            />
                            <div className="flex-1">
                              <div className="text-[10px] md:text-xs tracking-wider" style={{ color: stat.color }}>
                                {stat.name}
                              </div>
                              <div className="text-[8px] md:text-[9px]" style={{ color: '#666688' }}>
                                {stat.desc}
                              </div>
                            </div>
                            <div className="flex gap-1">
                              {Array.from({ length: MAX_UPGRADE_LEVEL }).map((_, i) => (
                                <div
                                  key={i}
                                  className="w-3 h-3 md:w-4 md:h-4 border-2"
                                  style={{
                                    background: i < level ? stat.color : '#1a1a3a',
                                    borderColor: i < level ? darkenColor(stat.color) : '#333366',
                                  }}
                                />
                              ))}
                            </div>
                          </div>
                          <button
                            onClick={() => upgradeCarStat(upgradeCar, stat.id)}
                            disabled={maxed || !canAfford}
                            className="w-full py-2 md:py-2.5 text-[9px] md:text-[10px] tracking-wider border-3 flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5 active:translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                            style={{
                              background: maxed ? '#333355' : canAfford ? stat.color : '#333355',
                              color: maxed ? '#666688' : canAfford ? '#000' : '#666688',
                              border: `3px solid ${maxed ? '#555588' : canAfford ? darkenColor(stat.color) : '#555588'}`,
                              boxShadow: maxed || !canAfford ? '2px 2px 0 #000' : '3px 3px 0 #000',
                            }}
                          >
                            {maxed ? (
                              <>
                                <Check className="w-3.5 h-3.5 md:w-4 md:h-4" />
                                已满级
                              </>
                            ) : (
                              <>
                                <ShoppingCart className="w-3.5 h-3.5 md:w-4 md:h-4" />
                                升级 · {cost} 金币
                              </>
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {tab === 'skins' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            {CAR_SKINS.map((skin) => {
              const owned = ownedSkins.includes(skin.id);
              const canAfford = coins >= skin.price;
              const selectedP1 = selectedSkinP1 === skin.id;
              const selectedP2 = selectedSkinP2 === skin.id;
              const bodyDark = darkenColor(skin.bodyColor, 0.3);

              return (
                <div
                  key={skin.id}
                  className="p-3 md:p-4 border-4 relative"
                  style={{
                    background: '#12122a',
                    borderColor: skin.limited ? '#ffd700' : '#333366',
                    boxShadow: skin.limited ? '0 0 20px #ffd70033, 3px 3px 0 #000' : '3px 3px 0 #000',
                  }}
                >
                  {skin.limited && (
                    <div
                      className="absolute top-2 right-2 px-2 py-1 text-[8px] tracking-wider"
                      style={{
                        background: '#ffd700',
                        color: '#665500',
                        border: '2px solid #aa8800',
                      }}
                    >
                      限定
                    </div>
                  )}

                  <div className="text-center mb-2 md:mb-3">
                    <div
                      className="text-[11px] md:text-sm tracking-wider mb-1"
                      style={{ color: skin.limited ? '#ffd700' : '#ccccdd' }}
                    >
                      {skin.name}
                    </div>
                    <div className="text-[8px] md:text-[9px]" style={{ color: '#666688' }}>
                      {skin.description}
                    </div>
                  </div>

                  <div className="flex justify-center mb-3">
                    <svg viewBox="0 0 40 28" className="w-24 h-16 md:w-28 md:h-20">
                      <rect x="2" y="8" width="4" height="3" fill={skin.wheelColor} />
                      <rect x="2" y="17" width="4" height="3" fill={skin.wheelColor} />
                      <rect x="34" y="8" width="4" height="3" fill={skin.wheelColor} />
                      <rect x="34" y="17" width="4" height="3" fill={skin.wheelColor} />
                      <rect x="4" y="6" width="32" height="18" fill={skin.bodyColor} />
                      <rect x="4" y="6" width="32" height="3" fill={bodyDark} />
                      <rect x="4" y="21" width="32" height="3" fill={bodyDark} />
                      <rect x="4" y="6" width="5" height="18" fill={bodyDark} />
                      {renderStripe(skin.stripePattern, skin.stripeColor, skin.stripeEnabled)}
                      <rect x="18" y="8" width="12" height="14" fill="#223344" />
                      <rect x="20" y="10" width="8" height="10" fill="#44aadd" />
                    </svg>
                  </div>

                  {!owned ? (
                    <button
                      onClick={() => buySkin(skin.id)}
                      disabled={!canAfford}
                      className="w-full py-2 text-[9px] md:text-[10px] tracking-wider flex items-center justify-center gap-2 border-3 transition-all hover:-translate-y-0.5 active:translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                      style={{
                        background: canAfford ? '#ff88cc' : '#333355',
                        color: canAfford ? '#441133' : '#666688',
                        border: `3px solid ${canAfford ? '#cc4488' : '#555588'}`,
                        boxShadow: '3px 3px 0 #000',
                      }}
                    >
                      {canAfford ? (
                        <>
                          <ShoppingCart className="w-3.5 h-3.5" />
                          购买 · {skin.price} 金币
                        </>
                      ) : (
                        <>
                          <Lock className="w-3.5 h-3.5" />
                          需要 {skin.price} 金币
                        </>
                      )}
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <div
                        className="w-full py-1.5 text-[8px] md:text-[9px] text-center tracking-wider border-3"
                        style={{
                          background: '#003322',
                          color: '#00ff88',
                          border: '3px solid #00aa55',
                        }}
                      >
                        <Check className="w-3 h-3 inline mr-1" />
                        已拥有
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => selectSkin(1, selectedP1 ? null : skin.id)}
                          className={`flex-1 py-1.5 text-[8px] md:text-[9px] tracking-wider border-3 transition-all hover:-translate-y-0.5 active:translate-y-0.5`}
                          style={{
                            background: selectedP1 ? '#00ff88' : '#1a1a3a',
                            color: selectedP1 ? '#003322' : '#00ff88',
                            border: `3px solid ${selectedP1 ? '#00aa55' : '#00ff88'}`,
                            boxShadow: '2px 2px 0 #000',
                          }}
                        >
                          P1 {selectedP1 ? '已装备' : '装备'}
                        </button>
                        {playerCount === 2 && (
                          <button
                            onClick={() => selectSkin(2, selectedP2 ? null : skin.id)}
                            className={`flex-1 py-1.5 text-[8px] md:text-[9px] tracking-wider border-3 transition-all hover:-translate-y-0.5 active:translate-y-0.5`}
                            style={{
                              background: selectedP2 ? '#ff3366' : '#1a1a3a',
                              color: selectedP2 ? '#440011' : '#ff3366',
                              border: `3px solid ${selectedP2 ? '#aa1144' : '#ff3366'}`,
                              boxShadow: '2px 2px 0 #000',
                            }}
                          >
                            P2 {selectedP2 ? '已装备' : '装备'}
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
