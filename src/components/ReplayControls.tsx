import { useEffect, useRef } from 'react';
import { useGameStore } from '../store/gameStore';
import { formatTime } from '../utils/math';
import type { ReplayViewMode } from '../engine/types';
import {
  Play, Pause, SkipBack, SkipForward, FastForward, Rewind,
  Home, Eye, Users, Trophy, Map, Move, Gauge,
} from 'lucide-react';

const SPEED_OPTIONS = [0.125, 0.25, 0.5, 1, 2, 4, 8];

const VIEW_OPTIONS: { mode: ReplayViewMode; label: string; icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }> }[] = [
  { mode: 'follow_p1', label: '跟随 P1', icon: Users },
  { mode: 'follow_p2', label: '跟随 P2', icon: Users },
  { mode: 'follow_leader', label: '跟随领跑', icon: Trophy },
  { mode: 'topdown', label: '俯视视角', icon: Map },
  { mode: 'free', label: '自由视角', icon: Move },
];

function formatSpeedLabel(s: number): string {
  if (s >= 1) return `${s}x`;
  return `1/${Math.round(1 / s)}x`;
}

export default function ReplayControls() {
  const replayData = useGameStore((s) => s.replayData);
  const replayPlaying = useGameStore((s) => s.replayPlaying);
  const replaySpeed = useGameStore((s) => s.replaySpeed);
  const replayViewMode = useGameStore((s) => s.replayViewMode);
  const replayFrameIndex = useGameStore((s) => s.replayFrameIndex);
  const raceTime = useGameStore((s) => s.raceTime);
  const cars = useGameStore((s) => s.cars);

  const setReplayPlaying = useGameStore((s) => s.setReplayPlaying);
  const setReplaySpeed = useGameStore((s) => s.setReplaySpeed);
  const setReplayViewMode = useGameStore((s) => s.setReplayViewMode);
  const setReplayFrameIndex = useGameStore((s) => s.setReplayFrameIndex);
  const exitReplay = useGameStore((s) => s.exitReplay);
  const totalLaps = useGameStore((s) => s.totalLaps);
  void totalLaps;

  const sliderRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        setReplayPlaying(!replayPlaying);
      } else if (e.code === 'ArrowLeft') {
        setReplayFrameIndex(Math.max(0, replayFrameIndex - 30));
      } else if (e.code === 'ArrowRight') {
        setReplayFrameIndex(Math.min(totalFrames - 1, replayFrameIndex + 30));
      } else if (e.code === 'KeyV') {
        const hasP2 = replayData?.initialCars.some((c) => c.isPlayer && c.playerIndex === 1);
        const modes: ReplayViewMode[] = hasP2
          ? ['follow_p1', 'follow_p2', 'follow_leader', 'topdown', 'free']
          : ['follow_p1', 'follow_leader', 'topdown', 'free'];
        const cur = modes.indexOf(replayViewMode);
        setReplayViewMode(modes[(cur + 1) % modes.length]);
      } else if (e.code === 'Escape') {
        exitReplay();
      } else if (e.code === 'BracketLeft') {
        const idx = SPEED_OPTIONS.indexOf(replaySpeed);
        if (idx > 0) setReplaySpeed(SPEED_OPTIONS[idx - 1]);
      } else if (e.code === 'BracketRight') {
        const idx = SPEED_OPTIONS.indexOf(replaySpeed);
        if (idx < SPEED_OPTIONS.length - 1) setReplaySpeed(SPEED_OPTIONS[idx + 1]);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [replayPlaying, replayFrameIndex, replayViewMode, replaySpeed, replayData, setReplayPlaying, setReplayFrameIndex, setReplayViewMode, setReplaySpeed, exitReplay]);

  if (!replayData) return null;
  const totalFrames = replayData.frames.length;
  const progress = totalFrames > 1 ? replayFrameIndex / (totalFrames - 1) : 0;

  const env = replayData.env;
  const weatherLabel = env.weather === 'clear' ? '晴天' : env.weather === 'rain' ? '雨天' : env.weather === 'snow' ? '雪天' : '雾天';
  const timeLabel = env.timeOfDay === 'day' ? '白天' : env.timeOfDay === 'dawn' ? '黎明' : env.timeOfDay === 'sunset' ? '黄昏' : '夜晚';

  const sorted = [...cars].sort((a, b) => {
    if (a.finished && b.finished) return a.finishTime - b.finishTime;
    if (a.finished) return -1;
    if (b.finished) return 1;
    const lapDiff = b.lap - a.lap;
    if (lapDiff !== 0) return lapDiff;
    return b.checkpoint - a.checkpoint;
  });
  const leader = sorted[0];

  const availableViewOptions = VIEW_OPTIONS.filter((o) => {
    if (o.mode === 'follow_p2') {
      return replayData.initialCars.some((c) => c.isPlayer && c.playerIndex === 1);
    }
    return true;
  });

  return (
    <div className="absolute inset-0 z-30 pointer-events-none">
      <div
        className="absolute top-2 left-2 md:top-4 md:left-4 p-2 md:p-3 border-4 pointer-events-auto"
        style={{ background: 'rgba(10,10,30,0.9)', borderColor: '#33ccff', boxShadow: '3px 3px 0 #000' }}
      >
        <div className="text-[10px] md:text-xs tracking-wider mb-1" style={{ color: '#33ccff' }}>
          ⏮ REPLAY MODE ⏭
        </div>
        <div className="text-[9px] md:text-[10px]" style={{ color: '#aaaaee' }}>
          <span style={{ color: '#aaddff' }}>🌤 {weatherLabel}</span>
          <span className="mx-1.5">·</span>
          <span style={{ color: '#ffcc88' }}>{env.timeOfDay === 'day' ? '☀' : env.timeOfDay === 'dawn' ? '🌅' : env.timeOfDay === 'sunset' ? '🌇' : '🌙'} {timeLabel}</span>
        </div>
        {leader && (
          <div className="text-[9px] md:text-[10px] mt-1" style={{ color: '#ffdd00' }}>
            🏆 领跑: L{leader.lap + 1} CKP {leader.checkpoint + 1}
          </div>
        )}
      </div>

      <div
        className="absolute top-2 right-2 md:top-4 md:right-4 p-2 md:p-3 border-4 pointer-events-auto"
        style={{ background: 'rgba(10,10,30,0.9)', borderColor: '#ffdd00', boxShadow: '3px 3px 0 #000' }}
      >
        <div className="text-[10px] md:text-xs tracking-wider mb-1 text-right" style={{ color: '#ffdd00' }}>
          ⏱ RACE TIME
        </div>
        <div className="text-right" style={{ color: '#ffffff', fontSize: '1.4em', textShadow: '2px 2px 0 #000' }}>
          {formatTime(raceTime)}
        </div>
        <div className="text-[8px] md:text-[9px] text-right mt-1" style={{ color: '#8888aa' }}>
          帧 {replayFrameIndex} / {totalFrames}
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-2 md:p-4 pointer-events-auto">
        <div
          className="p-2 md:p-4 border-4 mx-auto max-w-5xl"
          style={{ background: 'rgba(10,10,30,0.95)', borderColor: '#5555aa', boxShadow: '4px 4px 0 #000' }}
        >
          <div className="mb-2 md:mb-3 flex items-center gap-2 md:gap-3">
            <div className="text-[9px] md:text-[10px] tracking-wider shrink-0" style={{ color: '#8888aa' }}>
              PROGRESS
            </div>
            <div className="flex-1 relative">
              <div
                className="h-2 md:h-3 border-2 overflow-hidden cursor-pointer"
                style={{ borderColor: '#2a2a5a', background: '#1a1a3a' }}
                onClick={(e) => {
                  const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
                  const pct = (e.clientX - rect.left) / rect.width;
                  setReplayFrameIndex(Math.round(pct * (totalFrames - 1)));
                }}
              >
                <div
                  className="h-full transition-all"
                  style={{ width: `${progress * 100}%`, background: 'linear-gradient(90deg,#33ccff,#00ff88,#ffdd00)' }}
                />
              </div>
              <input
                ref={sliderRef}
                type="range"
                min={0}
                max={Math.max(0, totalFrames - 1)}
                value={replayFrameIndex}
                onChange={(e) => setReplayFrameIndex(parseInt(e.target.value, 10))}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            </div>
            <div className="text-[9px] md:text-[10px] shrink-0 w-20 md:w-24 text-right" style={{ color: '#ffdd00' }}>
              {formatTime(raceTime)}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 md:gap-2 justify-between">
            <div className="flex gap-1 md:gap-2 items-center flex-wrap">
              <button
                onClick={() => setReplayFrameIndex(0)}
                className="p-1.5 md:p-2 border-2 hover:border-[#ff3366] hover:bg-[#2a1a3a] transition-all"
                style={{ background: '#1a1a3a', borderColor: '#333366', color: '#ccccdd' }}
                title="回到开始"
              >
                <SkipBack className="w-4 h-4 md:w-5 md:h-5" />
              </button>
              <button
                onClick={() => {
                  const idx = SPEED_OPTIONS.indexOf(replaySpeed);
                  if (idx > 0) setReplaySpeed(SPEED_OPTIONS[idx - 1]);
                }}
                className="p-1.5 md:p-2 border-2 hover:border-[#33ccff] hover:bg-[#1a2a4a] transition-all"
                style={{ background: '#1a1a3a', borderColor: '#333366', color: '#ccccdd' }}
                title="减速"
              >
                <Rewind className="w-4 h-4 md:w-5 md:h-5" />
              </button>
              <button
                onClick={() => setReplayPlaying(!replayPlaying)}
                className="p-2 md:p-3 border-4 hover:scale-105 transition-all"
                style={{
                  background: replayPlaying ? '#ff3366' : '#00ff88',
                  borderColor: replayPlaying ? '#aa1144' : '#00aa55',
                  color: replayPlaying ? '#ffffff' : '#003322',
                  boxShadow: '2px 2px 0 #000',
                }}
                title="播放/暂停 [Space]"
              >
                {replayPlaying ? (
                  <Pause className="w-5 h-5 md:w-6 md:h-6 fill-current" />
                ) : (
                  <Play className="w-5 h-5 md:w-6 md:h-6 fill-current" />
                )}
              </button>
              <button
                onClick={() => {
                  const idx = SPEED_OPTIONS.indexOf(replaySpeed);
                  if (idx < SPEED_OPTIONS.length - 1) setReplaySpeed(SPEED_OPTIONS[idx + 1]);
                }}
                className="p-1.5 md:p-2 border-2 hover:border-[#00ff88] hover:bg-[#1a3a2a] transition-all"
                style={{ background: '#1a1a3a', borderColor: '#333366', color: '#ccccdd' }}
                title="加速"
              >
                <FastForward className="w-4 h-4 md:w-5 md:h-5" />
              </button>
              <button
                onClick={() => setReplayFrameIndex(totalFrames - 1)}
                className="p-1.5 md:p-2 border-2 hover:border-[#00ff88] hover:bg-[#1a3a2a] transition-all"
                style={{ background: '#1a1a3a', borderColor: '#333366', color: '#ccccdd' }}
                title="跳到结尾"
              >
                <SkipForward className="w-4 h-4 md:w-5 md:h-5" />
              </button>

              <div className="flex gap-1 ml-1 md:ml-2 flex-wrap">
                {SPEED_OPTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => setReplaySpeed(s)}
                    className="px-1.5 md:px-2 py-1 border-2 text-[8px] md:text-[10px] transition-all"
                    style={{
                      background: replaySpeed === s ? '#33ccff' : '#1a1a3a',
                      borderColor: replaySpeed === s ? '#1188bb' : '#333366',
                      color: replaySpeed === s ? '#002244' : '#ccccdd',
                    }}
                  >
                    {formatSpeedLabel(s)}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-1 md:gap-2 items-center flex-wrap">
              <div className="text-[9px] md:text-[10px] tracking-wider mr-1" style={{ color: '#8888aa' }}>
                <Eye className="w-3 h-3 inline mr-1" />
                VIEW
              </div>
              {availableViewOptions.map((o) => {
                const Icon = o.icon;
                const active = replayViewMode === o.mode;
                return (
                  <button
                    key={o.mode}
                    onClick={() => setReplayViewMode(o.mode)}
                    className="px-1.5 md:px-2 py-1 border-2 text-[8px] md:text-[10px] flex items-center gap-1 transition-all"
                    style={{
                      background: active ? '#ffdd00' : '#1a1a3a',
                      borderColor: active ? '#bbaa00' : '#333366',
                      color: active ? '#332200' : '#ccccdd',
                    }}
                    title={o.label}
                  >
                    <Icon className="w-3 h-3 md:w-3.5 md:h-3.5" />
                    <span className="hidden md:inline">{o.label}</span>
                  </button>
                );
              })}

              <div className="w-px h-5 md:h-6 bg-[#333366] mx-1" />

              <div
                className="flex items-center gap-1 px-1.5 md:px-2 py-1 border-2"
                style={{ background: '#1a1a3a', borderColor: '#aa66ff', color: '#cc99ff' }}
              >
                <Gauge className="w-3 h-3 md:w-3.5 md:h-3.5" />
                <span className="text-[8px] md:text-[10px]">{formatSpeedLabel(replaySpeed)}</span>
              </div>

              <button
                onClick={exitReplay}
                className="px-2 md:px-3 py-1 md:py-1.5 border-4 flex items-center gap-1 text-[9px] md:text-[10px] hover:scale-105 transition-all"
                style={{
                  background: '#553366',
                  borderColor: '#7755aa',
                  color: '#ccccdd',
                  boxShadow: '2px 2px 0 #000',
                }}
                title="退出回放 [Esc]"
              >
                <Home className="w-3.5 h-3.5 md:w-4 md:h-4" />
                <span className="hidden md:inline">EXIT</span>
              </button>
            </div>
          </div>

          <div className="mt-2 md:mt-3 pt-2 md:pt-3 border-t-2 border-[#333366] grid grid-cols-2 md:grid-cols-4 gap-1 md:gap-2 text-[8px] md:text-[9px]" style={{ color: '#8888aa' }}>
            <div><span style={{ color: '#aaffcc' }}>[Space]</span> 播放/暂停</div>
            <div><span style={{ color: '#aaffcc' }}>[←/→]</span> 后退/前进</div>
            <div><span style={{ color: '#aaffcc' }}>[ [ / ] ]</span> 减/加速</div>
            <div><span style={{ color: '#aaffcc' }}>[V]</span> 切换视角</div>
          </div>
        </div>
      </div>

      {replayViewMode === 'free' && (
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-3 py-1.5 border-2 text-[9px] md:text-[10px] pointer-events-none"
          style={{ background: 'rgba(10,10,30,0.8)', borderColor: '#aa66ff', color: '#cc99ff' }}
        >
          🖱 自由视角：拖动画面移动 · 滚轮缩放
        </div>
      )}
    </div>
  );
}
