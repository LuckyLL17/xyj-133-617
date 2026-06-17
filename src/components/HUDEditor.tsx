import { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { HUD_PANEL_LABELS, HUDPanelId } from '../engine/types';

const PANEL_IDS: HUDPanelId[] = ['lapInfo', 'speedInfo', 'positionInfo', 'itemInfo', 'statusEffects', 'wackyInfo'];

export default function HUDEditor() {
  const [isOpen, setIsOpen] = useState(false);
  const hudConfig = useGameStore((s) => s.hudConfig);
  const playerCount = useGameStore((s) => s.playerCount);
  const setHudEditMode = useGameStore((s) => s.setHudEditMode);
  const toggleHudPanelVisible = useGameStore((s) => s.toggleHudPanelVisible);
  const resetHudConfig = useGameStore((s) => s.resetHudConfig);
  const setHudPanelScale = useGameStore((s) => s.setHudPanelScale);
  const phase = useGameStore((s) => s.phase);

  const inGame = phase === 'countdown' || phase === 'racing';
  const isEditing = hudConfig.editMode;

  if (!inGame && !isOpen) return null;

  const renderPlayerPanelControls = (player: 1 | 2) => {
    const playerKey = player === 1 ? 'p1' : 'p2';
    const panels = hudConfig[playerKey].panels;
    const playerColor = player === 1 ? '#00ff88' : '#ff3366';

    return (
      <div key={player} className="mb-4">
        <div
          className="text-[11px] tracking-wider mb-2 pb-1 border-b-2"
          style={{ color: playerColor, borderColor: `${playerColor}44` }}
        >
          玩家 {player}
        </div>
        <div className="space-y-2">
          {PANEL_IDS.map((panelId) => (
            <div key={panelId} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-1">
                <button
                  className="w-5 h-5 border-2 flex items-center justify-center text-[9px]"
                  style={{
                    background: panels[panelId].visible ? `${playerColor}33` : '#1a1a3a',
                    borderColor: panels[panelId].visible ? playerColor : '#333355',
                    color: panels[panelId].visible ? playerColor : '#555',
                  }}
                  onClick={() => toggleHudPanelVisible(player, panelId)}
                >
                  {panels[panelId].visible ? '✓' : ''}
                </button>
                <span
                  className="text-[10px] tracking-wide"
                  style={{ color: panels[panelId].visible ? '#ccccdd' : '#555' }}
                >
                  {HUD_PANEL_LABELS[panelId]}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  className="w-5 h-5 border-2 text-[10px]"
                  style={{
                    background: '#1a1a3a',
                    borderColor: '#333355',
                    color: '#8888aa',
                  }}
                  onClick={() => setHudPanelScale(player, panelId, panels[panelId].scale - 0.1)}
                  disabled={panels[panelId].scale <= 0.5}
                >
                  -
                </button>
                <span
                  className="text-[9px] w-8 text-center"
                  style={{ color: '#8888aa' }}
                >
                  {Math.round(panels[panelId].scale * 100)}%
                </span>
                <button
                  className="w-5 h-5 border-2 text-[10px]"
                  style={{
                    background: '#1a1a3a',
                    borderColor: '#333355',
                    color: '#8888aa',
                  }}
                  onClick={() => setHudPanelScale(player, panelId, panels[panelId].scale + 0.1)}
                  disabled={panels[panelId].scale >= 2}
                >
                  +
                </button>
              </div>
            </div>
          ))}
        </div>
        <button
          className="mt-3 w-full py-1 border-2 text-[9px] tracking-wider"
          style={{
            background: 'rgba(255,51,102,0.1)',
            borderColor: '#333355',
            color: '#ff6688',
          }}
          onClick={() => resetHudConfig(player)}
        >
          重置玩家 {player} 布局
        </button>
      </div>
    );
  };

  return (
    <>
      {inGame && (
        <button
          className="absolute top-2 left-1/2 -translate-x-1/2 z-40 px-3 py-1 border-4 text-[10px] tracking-wider"
          style={{
            background: isEditing ? 'rgba(255,221,0,0.25)' : 'rgba(10,10,30,0.85)',
            borderColor: isEditing ? '#ffdd00' : '#333366',
            color: isEditing ? '#ffdd00' : '#8888aa',
            boxShadow: '2px 2px 0 rgba(0,0,0,0.6)',
          }}
          onClick={() => setIsOpen(!isOpen)}
        >
          ⚙ HUD 设置
        </button>
      )}

      {isEditing && (
        <div
          className="absolute top-2 right-2 z-50 px-3 py-2 border-4 text-[10px] tracking-wider flex items-center gap-2"
          style={{
            background: 'rgba(255,221,0,0.15)',
            borderColor: '#ffdd00',
            color: '#ffdd00',
            boxShadow: '0 0 15px #ffdd0033',
          }}
        >
          <span className="animate-pulse">●</span>
          编辑模式 - 拖动面板调整位置，拖动右下角调整大小
        </div>
      )}

      {isOpen && (
        <div
          className="absolute top-12 left-1/2 -translate-x-1/2 z-50 w-72 p-3 md:p-4 border-4"
          style={{
            background: 'rgba(10,10,30,0.95)',
            borderColor: '#333366',
            boxShadow: '4px 4px 0 rgba(0,0,0,0.8)',
          }}
        >
          <div className="flex justify-between items-center mb-3">
            <div
              className="text-[12px] tracking-wider"
              style={{ color: '#88ccff' }}
            >
              HUD 自定义设置
            </div>
            <button
              className="w-6 h-6 border-2 text-[12px]"
              style={{
                background: '#1a1a3a',
                borderColor: '#333355',
                color: '#8888aa',
              }}
              onClick={() => {
                setIsOpen(false);
                setHudEditMode(false);
              }}
            >
              ✕
            </button>
          </div>

          <button
            className="w-full mb-4 py-2 border-4 text-[10px] tracking-wider"
            style={{
              background: isEditing ? 'rgba(0,255,136,0.2)' : 'rgba(10,10,30,0.85)',
              borderColor: isEditing ? '#00ff88' : '#333366',
              color: isEditing ? '#00ff88' : '#8888aa',
            }}
            onClick={() => setHudEditMode(!isEditing)}
          >
            {isEditing ? '✓ 退出编辑模式' : '✎ 进入编辑模式'}
          </button>

          {renderPlayerPanelControls(1)}
          {playerCount === 2 && renderPlayerPanelControls(2)}

          <button
            className="w-full mt-2 py-2 border-4 text-[10px] tracking-wider"
            style={{
              background: 'rgba(255,51,102,0.1)',
              borderColor: '#333366',
              color: '#ff6688',
            }}
            onClick={() => resetHudConfig()}
          >
            ⟲ 重置全部 HUD 布局
          </button>

          <div
            className="mt-3 pt-2 border-t-2 text-[8px] tracking-wider leading-relaxed"
            style={{ borderColor: '#222244', color: '#555577' }}
          >
            提示：进入编辑模式后，可拖动面板移动位置，<br />
            拖动面板右下角调整大小。配置会自动保存。
          </div>
        </div>
      )}
    </>
  );
}
