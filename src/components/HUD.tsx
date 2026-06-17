import { useRef, useCallback, useEffect, useState, ReactNode } from 'react';
import type { Car, HUDPanelId, HUDPanelConfig } from '../engine/types';
import { useGameStore } from '../store/gameStore';
import { formatTime } from '../utils/math';
import { ITEM_ICON, ITEM_COLOR } from '../engine/renderer';
import { getTrackById, buildTrackFromCustom } from '../engine/track';

interface DragState {
  isDragging: boolean;
  isResizing: boolean;
  startX: number;
  startY: number;
  startPanelX: number;
  startPanelY: number;
  startWidth: number;
  startHeight: number;
}

interface DraggablePanelProps {
  player: 1 | 2;
  panelId: HUDPanelId;
  config: HUDPanelConfig;
  isEditing: boolean;
  children: ReactNode;
  borderColor?: string;
  minWidth?: number;
  minHeight?: number;
}

function DraggablePanel({
  player,
  panelId,
  config,
  isEditing,
  children,
  borderColor = '#333366',
  minWidth = 100,
  minHeight = 60,
}: DraggablePanelProps) {
  const updateHudPanel = useGameStore((s) => s.updateHudPanel);
  const dragRef = useRef<DragState>({
    isDragging: false,
    isResizing: false,
    startX: 0,
    startY: 0,
    startPanelX: 0,
    startPanelY: 0,
    startWidth: 0,
    startHeight: 0,
  });
  const [, forceUpdate] = useState(0);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (!isEditing) return;
      e.preventDefault();
      e.stopPropagation();
      const point = 'touches' in e ? e.touches[0] : e;
      dragRef.current = {
        isDragging: true,
        isResizing: false,
        startX: point.clientX,
        startY: point.clientY,
        startPanelX: config.x,
        startPanelY: config.y,
        startWidth: config.width,
        startHeight: config.height,
      };
      forceUpdate((n) => n + 1);
    },
    [isEditing, config.x, config.y, config.width, config.height]
  );

  const handleResizeStart = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (!isEditing) return;
      e.preventDefault();
      e.stopPropagation();
      const point = 'touches' in e ? e.touches[0] : e;
      dragRef.current = {
        isDragging: false,
        isResizing: true,
        startX: point.clientX,
        startY: point.clientY,
        startPanelX: config.x,
        startPanelY: config.y,
        startWidth: config.width,
        startHeight: config.height,
      };
      forceUpdate((n) => n + 1);
    },
    [isEditing, config.x, config.y, config.width, config.height]
  );

  useEffect(() => {
    const handleMove = (e: MouseEvent | TouchEvent) => {
      const state = dragRef.current;
      if (!state.isDragging && !state.isResizing) return;

      const point = 'touches' in e ? e.touches[0] : (e as MouseEvent);
      const dx = point.clientX - state.startX;
      const dy = point.clientY - state.startY;

      if (state.isDragging) {
        const maxX = window.innerWidth - config.width - 4;
        const maxY = window.innerHeight - config.height - 4;
        const newX = Math.max(2, Math.min(maxX, state.startPanelX + dx));
        const newY = Math.max(2, Math.min(maxY, state.startPanelY + dy));
        updateHudPanel(player, panelId, { x: newX, y: newY });
      } else if (state.isResizing) {
        const newWidth = Math.max(minWidth, state.startWidth + dx);
        const newHeight = Math.max(minHeight, state.startHeight + dy);
        updateHudPanel(player, panelId, { width: newWidth, height: newHeight });
      }
    };

    const handleUp = () => {
      if (dragRef.current.isDragging || dragRef.current.isResizing) {
        dragRef.current.isDragging = false;
        dragRef.current.isResizing = false;
        forceUpdate((n) => n + 1);
      }
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    window.addEventListener('touchmove', handleMove, { passive: false });
    window.addEventListener('touchend', handleUp);

    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleUp);
    };
  }, [player, panelId, config.width, config.height, minWidth, minHeight, updateHudPanel]);

  if (!config.visible) return null;

  const activeDrag = dragRef.current.isDragging || dragRef.current.isResizing;

  return (
    <div
      style={{
        position: 'absolute',
        left: config.x,
        top: config.y,
        width: config.width,
        height: config.height,
        transform: `scale(${config.scale})`,
        transformOrigin: 'top left',
        cursor: isEditing ? (activeDrag ? 'grabbing' : 'grab') : 'default',
        zIndex: isEditing ? 30 : 20,
        transition: activeDrag ? 'none' : 'box-shadow 0.15s',
      }}
      className={isEditing ? 'select-none' : 'pointer-events-none'}
      onMouseDown={handleMouseDown}
      onTouchStart={handleMouseDown}
    >
      <div
        className="w-full h-full p-2 md:p-3 border-4 overflow-hidden"
        style={{
          background: 'rgba(10,10,30,0.85)',
          borderColor: isEditing ? (activeDrag ? '#ffdd00' : '#6666aa') : borderColor,
          boxShadow: isEditing
            ? activeDrag
              ? '0 0 20px #ffdd0066, 3px 3px 0 rgba(0,0,0,0.6)'
              : '0 0 10px #6666aa44, 3px 3px 0 rgba(0,0,0,0.6)'
            : '3px 3px 0 rgba(0,0,0,0.6)',
        }}
      >
        {children}
      </div>
      {isEditing && (
        <>
          <div
            className="absolute -top-2 -left-2 w-4 h-4 border-2"
            style={{ background: '#ffdd00', borderColor: '#aa8800' }}
          />
          <div
            style={{
              position: 'absolute',
              right: -6,
              bottom: -6,
              width: 18,
              height: 18,
              background: '#ffdd00',
              border: '3px solid #aa8800',
              cursor: 'nwse-resize',
              zIndex: 35,
            }}
            onMouseDown={handleResizeStart}
            onTouchStart={handleResizeStart}
          />
          <div
            className="absolute -top-1 left-3 px-2 py-0.5 text-[8px] tracking-wider whitespace-nowrap"
            style={{
              background: '#ffdd00',
              color: '#332200',
              border: '2px solid #aa8800',
            }}
          >
            {panelId}
          </div>
        </>
      )}
    </div>
  );
}

interface PlayerHUDProps {
  playerCar: Car;
  allCars: Car[];
  totalLaps: number;
  raceTime: number;
  gameMode: string;
  splitLayout: 'horizontal' | 'vertical';
  viewportIdx: number;
  playerCount: number;
  wackyMode: boolean;
}

const PlayerHUD = ({
  playerCar,
  allCars,
  totalLaps,
  raceTime,
  gameMode,
  viewportIdx,
  playerCount,
  wackyMode,
}: PlayerHUDProps) => {
  const isTimeAttack = gameMode === 'timeattack';
  const isDrift = gameMode === 'drift';
  const isSplit = playerCount === 2;
  const playerColor = playerCar.playerIndex === 0 ? '#00ff88' : '#ff3366';
  const player: 1 | 2 = playerCar.playerIndex === 0 ? 1 : 2;

  const hudConfig = useGameStore((s) => s.hudConfig);
  const isEditing = hudConfig.editMode;
  const playerKey = player === 1 ? 'p1' : 'p2';
  const panels = hudConfig[playerKey].panels;

  const sorted = [...allCars].sort((a, b) => {
    if (a.finished && b.finished) return a.finishTime - b.finishTime;
    if (a.finished) return -1;
    if (b.finished) return 1;
    const lapDiff = b.lap - a.lap;
    if (lapDiff !== 0) return lapDiff;
    return b.checkpoint - a.checkpoint;
  });
  const rank = sorted.findIndex((c) => c.id === playerCar.id) + 1;

  const speedPct = Math.min(100, (Math.abs(playerCar.speed) / playerCar.maxSpeed) * 100);
  const speedKmh = Math.round(Math.abs(playerCar.speed) * 32);

  const itemKey = playerCar.playerIndex === 0 ? 'SPACE' : 'ENTER';

  const containerStyle = isSplit
    ? {
        position: 'absolute' as const,
        top: splitLayout === 'horizontal' ? (viewportIdx === 0 ? '0' : '50%') : '0',
        bottom: splitLayout === 'horizontal' ? (viewportIdx === 0 ? '50%' : '0') : '0',
        left: splitLayout === 'vertical' ? (viewportIdx === 0 ? '0' : '50%') : '0',
        right: splitLayout === 'vertical' ? (viewportIdx === 0 ? '50%' : '0') : '0',
        overflow: 'hidden' as const,
      }
    : { position: 'absolute' as const, inset: '0' as const, overflow: 'hidden' as const };

  return (
    <div style={containerStyle} className="z-20 text-[9px] md:text-[10px]">
      <DraggablePanel
        player={player}
        panelId="lapInfo"
        config={panels.lapInfo}
        isEditing={isEditing}
        borderColor={playerColor}
        minWidth={120}
        minHeight={100}
      >
        <div style={{ color: playerColor, fontSize: '0.8em' }} className="mb-1 tracking-wider">
          P{playerCar.playerIndex + 1}
        </div>
        {isDrift ? (
          <>
            <div style={{ color: '#8888aa' }} className="mb-1 tracking-wider">DRIFT SCORE</div>
            <div style={{ color: '#ff88cc', fontSize: '1.4em', textShadow: '1px 1px 0 #552244' }}>
              {Math.floor(playerCar.driftScore)}
            </div>
            {playerCar.maxDriftCombo > 0 && (
              <>
                <div style={{ color: '#8888aa' }} className="mt-2 mb-1 tracking-wider">MAX COMBO</div>
                <div style={{ color: '#ffdd00', fontSize: '1em', letterSpacing: 1 }}>
                  x{playerCar.maxDriftCombo}
                </div>
              </>
            )}
          </>
        ) : (
          <>
            <div style={{ color: '#8888aa' }} className="mb-1 tracking-wider">LAP</div>
            <div style={{ color: '#00ff88', fontSize: '1.2em', textShadow: '1px 1px 0 #005533' }}>
              {Math.min(playerCar.lap + 1, totalLaps)} <span style={{ color: '#666', fontSize: '0.6em' }}>/ {totalLaps}</span>
            </div>
            <div style={{ color: '#8888aa' }} className="mt-2 mb-1 tracking-wider">TIME</div>
            <div style={{ color: '#ffdd00', fontSize: '1em', letterSpacing: 1 }}>
              {formatTime(raceTime)}
            </div>
            {playerCar.bestLapTime < Infinity && (
              <>
                <div style={{ color: '#8888aa' }} className="mt-2 mb-1 tracking-wider">BEST</div>
                <div style={{ color: '#33ccff', letterSpacing: 1, fontSize: isTimeAttack ? '1.2em' : '1em' }}>
                  {formatTime(playerCar.bestLapTime)}
                </div>
              </>
            )}
          </>
        )}
      </DraggablePanel>

      <DraggablePanel
        player={player}
        panelId="speedInfo"
        config={panels.speedInfo}
        isEditing={isEditing}
        borderColor="#333366"
        minWidth={120}
        minHeight={70}
      >
        <div style={{ color: '#8888aa' }} className="mb-2 tracking-wider">{isDrift ? 'DRIFT' : 'SPEED'}</div>
        {isDrift ? (
          <>
            {playerCar.driftCombo > 0 && (
              <div
                className="text-center mb-2"
                style={{
                  color: playerCar.driftCombo >= 5 ? '#ff3366' : playerCar.driftCombo >= 3 ? '#ffdd00' : '#ff88cc',
                  fontSize: '1.5em',
                  textShadow: '2px 2px 0 #000',
                  animation: playerCar.drifting ? 'pulse-glow 0.5s ease-in-out infinite' : 'none',
                }}
              >
                COMBO x{playerCar.driftCombo}
              </div>
            )}
            <div
              className="h-3 md:h-4 mb-1 border-2 overflow-hidden relative"
              style={{ borderColor: '#2a2a5a', background: '#1a1a3a' }}
            >
              <div
                className="h-full transition-all duration-75"
                style={{
                  width: `${Math.min(100, (playerCar.currentDriftPoints / 500) * 100)}%`,
                  background: `linear-gradient(90deg, #ff88cc, #ff3366, #ffdd00)`,
                }}
              />
            </div>
            <div className="text-right" style={{ color: '#ff88cc', fontSize: '1em', textShadow: '1px 1px 0 #000' }}>
              +{Math.floor(playerCar.currentDriftPoints)}
            </div>
          </>
        ) : (
          <>
            <div
              className="h-3 md:h-4 mb-1 border-2 overflow-hidden relative"
              style={{ borderColor: '#2a2a5a', background: '#1a1a3a' }}
            >
              <div
                className="h-full transition-all duration-75"
                style={{
                  width: `${speedPct}%`,
                  background: `linear-gradient(90deg, #00ff88, #ffdd00, #ff3366)`,
                }}
              />
            </div>
            <div className="text-right" style={{ color: '#ffffff', fontSize: '1.2em', textShadow: '1px 1px 0 #000' }}>
              {speedKmh}<span style={{ color: '#888', fontSize: '0.5em' }}> KM/H</span>
            </div>
          </>
        )}
      </DraggablePanel>

      {!isTimeAttack && !isDrift && (
        <>
          <DraggablePanel
            player={player}
            panelId="positionInfo"
            config={panels.positionInfo}
            isEditing={isEditing}
            borderColor="#333366"
            minWidth={100}
            minHeight={60}
          >
            <div style={{ color: '#8888aa' }} className="mb-2 tracking-wider">POSITION</div>
            <div
              style={{
                color: rank === 1 ? '#ffdd00' : rank === 2 ? '#cccccc' : rank === 3 ? '#cc8844' : '#ffffff',
                fontSize: '2em',
                textShadow: '2px 2px 0 #000',
              }}
            >
              {rank}<span style={{ fontSize: '0.4em', color: '#666' }}> / {allCars.length}</span>
            </div>
          </DraggablePanel>

          <DraggablePanel
            player={player}
            panelId="itemInfo"
            config={panels.itemInfo}
            isEditing={isEditing}
            borderColor="#333366"
            minWidth={140}
            minHeight={60}
          >
            <div className="flex items-center gap-2 md:gap-3 h-full">
              <div style={{ color: '#8888aa' }} className="tracking-wider text-[8px] md:text-[10px] whitespace-nowrap">ITEM</div>
              <div
                className="w-10 h-10 md:w-16 md:h-16 flex items-center justify-center text-2xl md:text-4xl border-4 flex-shrink-0"
                style={{
                  background: playerCar.currentItem ? `${ITEM_COLOR[playerCar.currentItem]}33` : '#1a1a3a',
                  borderColor: playerCar.currentItem ? ITEM_COLOR[playerCar.currentItem] : '#2a2a5a',
                  boxShadow: playerCar.currentItem ? `0 0 15px ${ITEM_COLOR[playerCar.currentItem]}66` : 'none',
                }}
              >
                {playerCar.currentItem ? ITEM_ICON[playerCar.currentItem] : (
                  <span style={{ color: '#444466', fontSize: '0.5em' }}>—</span>
                )}
              </div>
              <div className="text-[8px] md:text-[9px] whitespace-nowrap" style={{ color: '#8888aa' }}>
                [{itemKey}]
              </div>
            </div>
          </DraggablePanel>
        </>
      )}

      {(playerCar.boostTime > 0 || playerCar.hasShield || playerCar.scale !== 1 || playerCar.isGhost || playerCar.hasMagnet || playerCar.hyperBoostTime > 0 || isEditing) && (
        <DraggablePanel
          player={player}
          panelId="statusEffects"
          config={panels.statusEffects}
          isEditing={isEditing}
          borderColor="#333366"
          minWidth={120}
          minHeight={100}
        >
          <div style={{ color: '#8888aa' }} className="mb-2 tracking-wider text-[8px] md:text-[9px]">STATUS</div>
          <div className="flex flex-col gap-1 md:gap-2">
            {playerCar.hyperBoostTime > 0 && (
              <div
                className="px-2 py-1 md:px-3 md:py-2 border-4 text-[8px] md:text-[10px]"
                style={{ background: 'rgba(255,0,255,0.2)', borderColor: '#ff00ff', color: '#ff00ff', boxShadow: '0 0 15px #ff00ff66' }}
              >
                🌟 超级加速 {Math.ceil(playerCar.hyperBoostTime / 1000)}s
              </div>
            )}
            {playerCar.boostTime > 0 && playerCar.hyperBoostTime <= 0 && (
              <div
                className="px-2 py-1 md:px-3 md:py-2 border-4 text-[8px] md:text-[10px]"
                style={{ background: 'rgba(255,200,0,0.2)', borderColor: '#ffdd00', color: '#ffdd00', boxShadow: '0 0 15px #ffdd0066' }}
              >
                ⚡ 加速 {Math.ceil(playerCar.boostTime / 1000)}s
              </div>
            )}
            {playerCar.hasShield && (
              <div
                className="px-2 py-1 md:px-3 md:py-2 border-4 text-[8px] md:text-[10px]"
                style={{ background: 'rgba(80,200,255,0.2)', borderColor: '#33ccff', color: '#33ccff', boxShadow: '0 0 15px #33ccff66' }}
              >
                🛡 护盾 {Math.ceil(playerCar.shieldTime / 1000)}s
              </div>
            )}
            {playerCar.scale < 1 && (
              <div
                className="px-2 py-1 md:px-3 md:py-2 border-4 text-[8px] md:text-[10px]"
                style={{ background: 'rgba(136,255,136,0.2)', borderColor: '#88ff88', color: '#88ff88', boxShadow: '0 0 15px #88ff8866' }}
              >
                🔽 缩小 {Math.ceil(playerCar.scaleTime / 1000)}s
              </div>
            )}
            {playerCar.scale > 1 && (
              <div
                className="px-2 py-1 md:px-3 md:py-2 border-4 text-[8px] md:text-[10px]"
                style={{ background: 'rgba(255,136,68,0.2)', borderColor: '#ff8844', color: '#ff8844', boxShadow: '0 0 15px #ff884466' }}
              >
                🔼 巨型 {Math.ceil(playerCar.scaleTime / 1000)}s
              </div>
            )}
            {playerCar.isGhost && (
              <div
                className="px-2 py-1 md:px-3 md:py-2 border-4 text-[8px] md:text-[10px]"
                style={{ background: 'rgba(170,136,255,0.2)', borderColor: '#aa88ff', color: '#aa88ff', boxShadow: '0 0 15px #aa88ff66' }}
              >
                👻 幽灵 {Math.ceil(playerCar.ghostTime / 1000)}s
              </div>
            )}
            {playerCar.hasMagnet && (
              <div
                className="px-2 py-1 md:px-3 md:py-2 border-4 text-[8px] md:text-[10px]"
                style={{ background: 'rgba(255,68,136,0.2)', borderColor: '#ff4488', color: '#ff4488', boxShadow: '0 0 15px #ff448866' }}
              >
                🧲 磁铁 {Math.ceil(playerCar.magnetTime / 1000)}s
              </div>
            )}
            {isEditing &&
              playerCar.boostTime <= 0 &&
              !playerCar.hasShield &&
              playerCar.scale === 1 &&
              !playerCar.isGhost &&
              !playerCar.hasMagnet &&
              playerCar.hyperBoostTime <= 0 && (
                <div
                  className="px-2 py-1 md:px-3 md:py-2 border-4 text-[8px] md:text-[10px] text-center"
                  style={{ background: 'rgba(100,100,100,0.1)', borderColor: '#444466', color: '#555577' }}
                >
                  (无激活状态)
                </div>
              )}
          </div>
        </DraggablePanel>
      )}

      {(wackyMode || isEditing) && (
        <DraggablePanel
          player={player}
          panelId="wackyInfo"
          config={panels.wackyInfo}
          isEditing={isEditing}
          borderColor={playerCar.gravityFlipped ? '#ff00ff' : '#00ff88'}
          minWidth={140}
          minHeight={40}
        >
          {wackyMode ? (
            <div className="w-full h-full px-3 py-1 md:px-4 md:py-2 flex items-center gap-2">
              <span style={{ color: playerCar.gravityFlipped ? '#ff00ff' : '#00ff88', fontSize: '1.2em' }}>
                {playerCar.gravityFlipped ? '▲' : '▼'}
              </span>
              <span
                className="text-[8px] md:text-[10px] tracking-wider"
                style={{ color: playerCar.gravityFlipped ? '#ff00ff' : '#00ff88' }}
              >
                {playerCar.gravityFlipped ? 'CEILING' : 'FLOOR'}
              </span>
              {playerCar.gravityFlipped && (
                <span
                  className="text-[7px] md:text-[8px]"
                  style={{ color: '#ff8888' }}
                >
                  操控反转!
                </span>
              )}
            </div>
          ) : (
            <div
              className="w-full h-full flex items-center justify-center text-[8px] md:text-[9px]"
              style={{ color: '#555577' }}
            >
              (搞怪模式未启用)
            </div>
          )}
        </DraggablePanel>
      )}
    </div>
  );
};

export default function HUD() {
  const cars = useGameStore((s) => s.cars);
  const storeTotalLaps = useGameStore((s) => s.totalLaps);
  const raceTime = useGameStore((s) => s.raceTime);
  const gameMode = useGameStore((s) => s.gameMode);
  const playerCount = useGameStore((s) => s.playerCount);
  const splitLayout = useGameStore((s) => s.splitLayout);
  const wackyMode = useGameStore((s) => s.wackyMode);
  const selectedTrackId = useGameStore((s) => s.selectedTrackId);
  const useCustomTrack = useGameStore((s) => s.useCustomTrack);
  const customTrack = useGameStore((s) => s.customTrack);

  const totalLaps = useCustomTrack
    ? (buildTrackFromCustom(customTrack).laps || storeTotalLaps)
    : (selectedTrackId ? getTrackById(selectedTrackId).laps : storeTotalLaps);

  const playerCars = cars.filter((c) => c.isPlayer);
  if (playerCars.length === 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-20">
      {playerCars.map((car, idx) => (
        <PlayerHUD
          key={car.id}
          playerCar={car}
          allCars={cars}
          totalLaps={totalLaps}
          raceTime={raceTime}
          gameMode={gameMode}
          splitLayout={splitLayout}
          viewportIdx={idx}
          playerCount={playerCount}
          wackyMode={wackyMode}
        />
      ))}
    </div>
  );
}
