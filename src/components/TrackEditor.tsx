import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useGameStore } from '../store/gameStore';
import { interpolateTrackPoints } from '../engine/track';
import type { EditorTool } from '../engine/types';
import {
  Move, Plus, Trash2, Flag, Zap, Gift, Save, RefreshCw, Check, X,
  Download, Upload, Minus, Plus as PlusIcon, Grid3X3, ChevronDown, ChevronUp,
  RotateCcw, Play, Home,
} from 'lucide-react';

const POINT_RADIUS = 10;
const HOVER_RADIUS = 14;
const GRID_SIZE = 50;
const SEGMENTS = 12;

export default function TrackEditor() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const customTrack = useGameStore((s) => s.customTrack);
  const editorTool = useGameStore((s) => s.editorTool);
  const editorSelectedPoint = useGameStore((s) => s.editorSelectedPoint);
  const savedTracks = useGameStore((s) => s.savedTracks);
  const useCustomTrack = useGameStore((s) => s.useCustomTrack);
  const setEditorTool = useGameStore((s) => s.setEditorTool);
  const setEditorSelectedPoint = useGameStore((s) => s.setEditorSelectedPoint);
  const addTrackPoint = useGameStore((s) => s.addTrackPoint);
  const updateTrackPoint = useGameStore((s) => s.updateTrackPoint);
  const deleteTrackPoint = useGameStore((s) => s.deleteTrackPoint);
  const toggleCheckpoint = useGameStore((s) => s.toggleCheckpoint);
  const toggleBoostZone = useGameStore((s) => s.toggleBoostZone);
  const toggleItemBox = useGameStore((s) => s.toggleItemBox);
  const setTrackWidth = useGameStore((s) => s.setTrackWidth);
  const setTrackClosed = useGameStore((s) => s.setTrackClosed);
  const setTrackName = useGameStore((s) => s.setTrackName);
  const saveCurrentTrack = useGameStore((s) => s.saveCurrentTrack);
  const loadTrack = useGameStore((s) => s.loadTrack);
  const deleteSavedTrack = useGameStore((s) => s.deleteSavedTrack);
  const resetCustomTrack = useGameStore((s) => s.resetCustomTrack);
  const toggleUseCustomTrack = useGameStore((s) => s.toggleUseCustomTrack);
  const smoothTrackPoints = useGameStore((s) => s.smoothTrackPoints);
  const closeEditor = useGameStore((s) => s.closeEditor);
  const backToMenu = useGameStore((s) => s.backToMenu);
  const resetForCountdown = useGameStore((s) => s.resetForCountdown);

  const viewRef = useRef({
    zoom: 0.7,
    panX: 0,
    panY: 0,
    isPanning: false,
    panStartX: 0,
    panStartY: 0,
    panOrigX: 0,
    panOrigY: 0,
    isDragging: false,
    dragIndex: -1,
    dragOffsetX: 0,
    dragOffsetY: 0,
    hoveredIndex: -1,
  });

  const [showSaved, setShowSaved] = useState(false);
  const [, forceUpdate] = useState(0);

  const { points, width, checkpoints, boostZones, itemBoxes, closed } = customTrack;
  const smoothedPoints = useMemo(
    () => (points.length >= 2 ? interpolateTrackPoints(points, SEGMENTS, closed) : []),
    [points, closed]
  );

  const worldToScreen = useCallback((wx: number, wy: number, canvasW: number, canvasH: number) => {
    const v = viewRef.current;
    return {
      x: (wx - canvasW / 2) * v.zoom + canvasW / 2 + v.panX,
      y: (wy - canvasH / 2) * v.zoom + canvasH / 2 + v.panY,
    };
  }, []);

  const screenToWorld = useCallback((sx: number, sy: number, canvasW: number, canvasH: number) => {
    const v = viewRef.current;
    return {
      x: (sx - canvasW / 2 - v.panX) / v.zoom + canvasW / 2,
      y: (sy - canvasH / 2 - v.panY) / v.zoom + canvasH / 2,
    };
  }, []);

  const findNearestPoint = useCallback((wx: number, wy: number): number => {
    const threshold = HOVER_RADIUS / viewRef.current.zoom;
    let best = -1;
    let bestDist = threshold * threshold;
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      const dx = p.x - wx;
      const dy = p.y - wy;
      const d = dx * dx + dy * dy;
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    }
    return best;
  }, [points]);

  const findNearestSegment = useCallback((wx: number, wy: number): { index: number; dist: number } => {
    let bestIdx = -1;
    let bestDist = Infinity;
    const n = points.length;
    const limit = closed ? n : n - 1;
    for (let i = 0; i < limit; i++) {
      const a = points[i];
      const b = points[(i + 1) % n];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const len2 = dx * dx + dy * dy;
      if (len2 < 1) continue;
      let t = ((wx - a.x) * dx + (wy - a.y) * dy) / len2;
      t = Math.max(0, Math.min(1, t));
      const px = a.x + dx * t;
      const py = a.y + dy * t;
      const dist = (px - wx) * (px - wx) + (py - wy) * (py - wy);
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = t < 0.5 ? i : i + 1;
      }
    }
    return { index: bestIdx, dist: Math.sqrt(bestDist) };
  }, [points, closed]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;

    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, w, h);

    const v = viewRef.current;

    ctx.strokeStyle = '#151530';
    ctx.lineWidth = 1;
    const startX = ((-v.panX) % (GRID_SIZE * v.zoom) + GRID_SIZE * v.zoom) % (GRID_SIZE * v.zoom);
    const startY = ((-v.panY) % (GRID_SIZE * v.zoom) + GRID_SIZE * v.zoom) % (GRID_SIZE * v.zoom);
    for (let x = startX; x < w; x += GRID_SIZE * v.zoom) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = startY; y < h; y += GRID_SIZE * v.zoom) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    const origin = worldToScreen(0, 0, w, h);
    ctx.strokeStyle = '#222244';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, origin.y);
    ctx.lineTo(w, origin.y);
    ctx.moveTo(origin.x, 0);
    ctx.lineTo(origin.x, h);
    ctx.stroke();

    if (smoothedPoints.length >= 2) {
      const drawRoadEdge = (offset: number, fillStyle: string) => {
        ctx.fillStyle = fillStyle;
        ctx.beginPath();
        const n = smoothedPoints.length;
        for (let i = 0; i <= n; i++) {
          const idx = i % n;
          const prev = smoothedPoints[(idx - 1 + n) % n];
          const curr = smoothedPoints[idx];
          const next = smoothedPoints[(idx + 1) % n];
          const tx = (next.x - prev.x);
          const ty = (next.y - prev.y);
          const tlen = Math.sqrt(tx * tx + ty * ty) || 1;
          const nx = -ty / tlen;
          const ny = tx / tlen;
          const sp = worldToScreen(curr.x + nx * offset, curr.y + ny * offset, w, h);
          if (i === 0) ctx.moveTo(sp.x, sp.y);
          else ctx.lineTo(sp.x, sp.y);
        }
        if (closed) ctx.closePath();
        ctx.fill();
      };

      drawRoadEdge(width / 2 + 8, '#224422');
      drawRoadEdge(width / 2, '#333344');
      drawRoadEdge(width / 2 - 4, '#2a2a3a');

      if (boostZones.length > 0) {
        const boostSet = new Set<number>();
        boostZones.forEach((zi) => {
          const startMapped = zi * SEGMENTS;
          for (let r = -SEGMENTS; r <= SEGMENTS * 2; r++) {
            let val = startMapped + r;
            if (closed) val = ((val % smoothedPoints.length) + smoothedPoints.length) % smoothedPoints.length;
            else val = Math.max(0, Math.min(smoothedPoints.length - 1, val));
            boostSet.add(val);
          }
        });
        ctx.fillStyle = 'rgba(255, 221, 0, 0.35)';
        boostSet.forEach((idx) => {
          const p = smoothedPoints[idx];
          const prev = smoothedPoints[(idx - 1 + smoothedPoints.length) % smoothedPoints.length];
          const next = smoothedPoints[(idx + 1) % smoothedPoints.length];
          const tx = (next.x - prev.x);
          const ty = (next.y - prev.y);
          const tlen = Math.sqrt(tx * tx + ty * ty) || 1;
          const nx = -ty / tlen;
          const ny = tx / tlen;
          const sp1 = worldToScreen(p.x + nx * (width / 2 - 6), p.y + ny * (width / 2 - 6), w, h);
          const sp2 = worldToScreen(p.x - nx * (width / 2 - 6), p.y - ny * (width / 2 - 6), w, h);
          ctx.beginPath();
          ctx.arc(sp1.x, sp1.y, 5 * v.zoom, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(sp2.x, sp2.y, 5 * v.zoom, 0, Math.PI * 2);
          ctx.fill();
        });
      }

      if (checkpoints.length > 0) {
        checkpoints.forEach((ci) => {
          const idx = ci * SEGMENTS;
          const pi = idx % smoothedPoints.length;
          const p = smoothedPoints[pi];
          const prev = smoothedPoints[(pi - 1 + smoothedPoints.length) % smoothedPoints.length];
          const next = smoothedPoints[(pi + 1) % smoothedPoints.length];
          const tx = (next.x - prev.x);
          const ty = (next.y - prev.y);
          const tlen = Math.sqrt(tx * tx + ty * ty) || 1;
          const nx = -ty / tlen;
          const ny = tx / tlen;
          const sp1 = worldToScreen(p.x + nx * (width / 2 + 12), p.y + ny * (width / 2 + 12), w, h);
          const sp2 = worldToScreen(p.x - nx * (width / 2 + 12), p.y - ny * (width / 2 + 12), w, h);
          ctx.strokeStyle = ci === 0 ? '#ff3366' : '#ffffff';
          ctx.lineWidth = 4;
          ctx.setLineDash([8, 6]);
          ctx.beginPath();
          ctx.moveTo(sp1.x, sp1.y);
          ctx.lineTo(sp2.x, sp2.y);
          ctx.stroke();
          ctx.setLineDash([]);
          const labelPos = worldToScreen(p.x + nx * (width / 2 + 30), p.y + ny * (width / 2 + 30), w, h);
          ctx.font = `bold ${Math.max(10, 12 * v.zoom)}px "Press Start 2P", monospace`;
          ctx.fillStyle = ci === 0 ? '#ff3366' : '#ffffff';
          ctx.textAlign = 'center';
          ctx.fillText(ci === 0 ? 'START' : `CP${checkpoints.indexOf(ci)}`, labelPos.x, labelPos.y);
        });
      }

      if (itemBoxes.length > 0) {
        itemBoxes.forEach((ibi) => {
          const idx = ibi * SEGMENTS;
          const pi = idx % smoothedPoints.length;
          const p = smoothedPoints[pi];
          const sp = worldToScreen(p.x, p.y, w, h);
          const size = 16 * v.zoom;
          ctx.fillStyle = '#ffaa22';
          ctx.fillRect(sp.x - size / 2, sp.y - size / 2, size, size);
          ctx.strokeStyle = '#884400';
          ctx.lineWidth = 2;
          ctx.strokeRect(sp.x - size / 2, sp.y - size / 2, size, size);
          ctx.fillStyle = '#ffffff';
          ctx.font = `bold ${Math.max(8, 10 * v.zoom)}px "Press Start 2P", monospace`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('?', sp.x, sp.y);
        });
      }

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 8]);
      ctx.beginPath();
      for (let i = 0; i <= smoothedPoints.length; i++) {
        const idx = i % smoothedPoints.length;
        const p = smoothedPoints[idx];
        const sp = worldToScreen(p.x, p.y, w, h);
        if (i === 0) ctx.moveTo(sp.x, sp.y);
        else ctx.lineTo(sp.x, sp.y);
      }
      if (closed) ctx.closePath();
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.strokeStyle = '#6666aa';
    ctx.lineWidth = 2;
    ctx.setLineDash([3, 4]);
    if (points.length >= 2) {
      ctx.beginPath();
      for (let i = 0; i <= points.length; i++) {
        const idx = closed ? i % points.length : i;
        if (idx >= points.length) break;
        const p = points[idx];
        const sp = worldToScreen(p.x, p.y, w, h);
        if (i === 0) ctx.moveTo(sp.x, sp.y);
        else ctx.lineTo(sp.x, sp.y);
      }
      if (closed && points.length >= 3) ctx.closePath();
      ctx.stroke();
    }
    ctx.setLineDash([]);

    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      const sp = worldToScreen(p.x, p.y, w, h);
      const isCP = checkpoints.includes(i);
      const isBoost = boostZones.includes(i);
      const isItem = itemBoxes.includes(i);
      const isSelected = editorSelectedPoint === i;
      const isHovered = viewRef.current.hoveredIndex === i;

      let baseColor = '#8888cc';
      if (isCP) baseColor = i === 0 ? '#ff3366' : '#ffffff';
      if (isBoost) baseColor = '#ffdd00';
      if (isItem) baseColor = '#ffaa22';

      const outerR = POINT_RADIUS * v.zoom + (isHovered || isSelected ? 4 : 0);
      const innerR = POINT_RADIUS * v.zoom;

      if (isSelected) {
        ctx.fillStyle = 'rgba(0, 255, 136, 0.3)';
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, outerR + 6, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, outerR, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = baseColor;
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, innerR, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = isSelected ? '#00ff88' : '#ffffff';
      ctx.lineWidth = isSelected ? 3 : 2;
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, innerR, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#000000';
      ctx.font = `bold ${Math.max(8, 9 * v.zoom)}px "Press Start 2P", monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(i), sp.x, sp.y);

      if (isBoost) {
        ctx.fillStyle = '#ffdd00';
        ctx.font = `${Math.max(8, 10 * v.zoom)}px monospace`;
        ctx.fillText('⚡', sp.x + innerR + 6, sp.y - innerR);
      }
      if (isItem) {
        ctx.fillStyle = '#ffaa22';
        ctx.font = `${Math.max(8, 10 * v.zoom)}px monospace`;
        ctx.fillText('🎁', sp.x - innerR - 6, sp.y - innerR);
      }
    }
  }, [points, width, checkpoints, boostZones, itemBoxes, closed, smoothedPoints, editorSelectedPoint, worldToScreen]);

  useEffect(() => {
    let raf = 0;
    const render = () => {
      draw();
      raf = requestAnimationFrame(render);
    };
    raf = requestAnimationFrame(render);
    return () => cancelAnimationFrame(raf);
  }, [draw]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    const { x: wx, y: wy } = screenToWorld(sx, sy, w, h);

    const v = viewRef.current;

    if (e.button === 1 || e.shiftKey || e.altKey) {
      v.isPanning = true;
      v.panStartX = sx;
      v.panStartY = sy;
      v.panOrigX = v.panX;
      v.panOrigY = v.panY;
      return;
    }

    const nearIdx = findNearestPoint(wx, wy);

    if (editorTool === 'move') {
      v.isPanning = true;
      v.panStartX = sx;
      v.panStartY = sy;
      v.panOrigX = v.panX;
      v.panOrigY = v.panY;
      return;
    }

    if (editorTool === 'select') {
      if (nearIdx >= 0) {
        v.isDragging = true;
        v.dragIndex = nearIdx;
        const p = points[nearIdx];
        v.dragOffsetX = p.x - wx;
        v.dragOffsetY = p.y - wy;
        setEditorSelectedPoint(nearIdx);
      } else {
        setEditorSelectedPoint(null);
      }
      return;
    }

    if (editorTool === 'add') {
      if (nearIdx >= 0) {
        return;
      }
      const seg = findNearestSegment(wx, wy);
      if (seg.index >= 0 && seg.dist < width * 0.8) {
        addTrackPoint({ x: wx, y: wy }, seg.index);
        setEditorSelectedPoint(seg.index);
      } else {
        addTrackPoint({ x: wx, y: wy });
        setEditorSelectedPoint(points.length);
      }
      return;
    }

    if (editorTool === 'delete') {
      if (nearIdx >= 0 && points.length > 3) {
        deleteTrackPoint(nearIdx);
        if (editorSelectedPoint === nearIdx) setEditorSelectedPoint(null);
      }
      return;
    }

    if (editorTool === 'checkpoint') {
      if (nearIdx >= 0) {
        toggleCheckpoint(nearIdx);
      }
      return;
    }

    if (editorTool === 'boost') {
      if (nearIdx >= 0) {
        toggleBoostZone(nearIdx);
      }
      return;
    }

    if (editorTool === 'item') {
      if (nearIdx >= 0) {
        toggleItemBox(nearIdx);
      }
      return;
    }
  }, [editorTool, screenToWorld, findNearestPoint, findNearestSegment, addTrackPoint, deleteTrackPoint, toggleCheckpoint, toggleBoostZone, toggleItemBox, setEditorSelectedPoint, points.length, width, editorSelectedPoint]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    const { x: wx, y: wy } = screenToWorld(sx, sy, w, h);

    const v = viewRef.current;

    if (v.isPanning) {
      v.panX = v.panOrigX + (sx - v.panStartX);
      v.panY = v.panOrigY + (sy - v.panStartY);
      return;
    }

    if (v.isDragging && v.dragIndex >= 0) {
      const snapX = Math.round((wx + v.dragOffsetX) / 10) * 10;
      const snapY = Math.round((wy + v.dragOffsetY) / 10) * 10;
      updateTrackPoint(v.dragIndex, { x: snapX, y: snapY });
      return;
    }

    v.hoveredIndex = findNearestPoint(wx, wy);
    forceUpdate((n) => n + 1);
  }, [screenToWorld, findNearestPoint, updateTrackPoint]);

  const handleMouseUp = useCallback(() => {
    const v = viewRef.current;
    v.isPanning = false;
    v.isDragging = false;
    v.dragIndex = -1;
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const v = viewRef.current;
    const factor = e.deltaY < 0 ? 1.15 : 0.87;
    v.zoom = Math.max(0.2, Math.min(3, v.zoom * factor));
  }, []);

  const tools: { id: EditorTool; label: string; icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>; color: string; desc: string }[] = [
    { id: 'select', label: '选择/拖动', icon: Move, color: '#00ff88', desc: '点击选中 · 拖动移动点' },
    { id: 'add', label: '添加点', icon: Plus, color: '#33ccff', desc: '点击空白添加 · 点击边线插入' },
    { id: 'delete', label: '删除点', icon: Trash2, color: '#ff3366', desc: '点击控制点删除(最少保留3个)' },
    { id: 'checkpoint', label: '检查点', icon: Flag, color: '#ffffff', desc: '点击设置/取消检查点 · 第0个为起点' },
    { id: 'boost', label: '加速带', icon: Zap, color: '#ffdd00', desc: '点击设置/取消加速带区域' },
    { id: 'item', label: '道具箱', icon: Gift, color: '#ffaa22', desc: '点击设置/取消道具箱位置' },
  ];

  const handleExport = () => {
    const data = JSON.stringify(customTrack, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${customTrack.name || 'track'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result as string);
          if (data.points && Array.isArray(data.points)) {
            loadTrack(data);
          }
        } catch {
          alert('文件格式错误');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const handleTestTrack = () => {
    if (useCustomTrack === false) {
      toggleUseCustomTrack();
    }
    closeEditor();
    setTimeout(() => resetForCountdown(), 50);
  };

  return (
    <div className="w-full h-full flex bg-[#0a0a1a] overflow-hidden">
      <div className="w-64 md:w-72 flex-shrink-0 flex flex-col border-r-4 border-[#333366] bg-[#0d0d22] overflow-y-auto">
        <div className="p-4 border-b-4 border-[#333366]">
          <div className="flex items-center gap-2 mb-3">
            <button
              onClick={() => { backToMenu(); }}
              className="p-2 bg-[#1a1a3a] border-3 border-[#333366] text-white hover:bg-[#2a2a5a] hover:border-[#ff3366] active:translate-y-0.5 transition-all"
              style={{ boxShadow: '2px 2px 0 #000' }}
              title="返回主菜单"
            >
              <Home className="w-4 h-4" />
            </button>
            <h2
              className="text-lg md:text-xl tracking-wider flex-1"
              style={{ color: '#00ff88', textShadow: '2px 2px 0 #005533' }}
            >
              赛道编辑器
            </h2>
          </div>
          <input
            value={customTrack.name}
            onChange={(e) => setTrackName(e.target.value)}
            className="w-full px-3 py-2 text-xs bg-[#1a1a3a] border-3 border-[#333366] text-[#ccccdd] focus:outline-none focus:border-[#00ff88]"
            style={{ fontFamily: '"Press Start 2P", monospace', boxShadow: '2px 2px 0 #000' }}
            placeholder="赛道名称"
          />
        </div>

        <div className="p-4 border-b-4 border-[#333366]">
          <div className="text-[10px] tracking-widest mb-3" style={{ color: '#33ccff' }}>工具 TOOLS</div>
          <div className="grid grid-cols-2 gap-2">
            {tools.map((t) => {
              const Icon = t.icon;
              const active = editorTool === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setEditorTool(t.id)}
                  className={`p-2 md:p-3 border-3 transition-all ${active ? '-translate-y-0.5' : ''}`}
                  style={{
                    background: active ? '#1a1a3a' : '#12122a',
                    borderColor: active ? t.color : '#333366',
                    boxShadow: active ? `0 0 12px ${t.color}55, 2px 2px 0 #000` : '2px 2px 0 #000',
                  }}
                  title={t.desc}
                >
                  <div className="flex flex-col items-center gap-1">
                    <Icon className="w-5 h-5 md:w-6 md:h-6" style={{ color: active ? t.color : '#8888aa' }} />
                    <div
                      className="text-[8px] md:text-[9px] tracking-wider whitespace-nowrap"
                      style={{ color: active ? t.color : '#aaaaaa' }}
                    >
                      {t.label}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          <div className="mt-3 p-2 bg-[#12122a] border-2 border-[#333366] text-[8px] md:text-[9px] leading-relaxed" style={{ color: '#8888aa' }}>
            💡 {tools.find((t) => t.id === editorTool)?.desc}
            <div className="mt-1 pt-1 border-t border-[#2a2a4a]">
              中键/Shift+拖动:平移视图 · 滚轮:缩放
            </div>
          </div>
        </div>

        <div className="p-4 border-b-4 border-[#333366]">
          <div className="text-[10px] tracking-widest mb-3" style={{ color: '#ffdd00' }}>赛道属性 PROPERTIES</div>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-[9px]" style={{ color: '#aaaaee' }}>赛道宽度</span>
                <span className="text-[9px]" style={{ color: '#ffdd00' }}>{width}px</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setTrackWidth(width - 10)}
                  className="p-1.5 bg-[#1a1a3a] border-2 border-[#333366] text-white hover:bg-[#2a2a5a]"
                  style={{ boxShadow: '2px 2px 0 #000' }}
                >
                  <Minus className="w-3 h-3" />
                </button>
                <input
                  type="range"
                  min={60}
                  max={200}
                  value={width}
                  onChange={(e) => setTrackWidth(Number(e.target.value))}
                  className="flex-1 accent-[#ffdd00]"
                />
                <button
                  onClick={() => setTrackWidth(width + 10)}
                  className="p-1.5 bg-[#1a1a3a] border-2 border-[#333366] text-white hover:bg-[#2a2a5a]"
                  style={{ boxShadow: '2px 2px 0 #000' }}
                >
                  <PlusIcon className="w-3 h-3" />
                </button>
              </div>
            </div>

            <button
              onClick={() => setTrackClosed(!closed)}
              className="w-full p-2 border-3 transition-all flex items-center justify-between"
              style={{
                background: closed ? '#1a1a3a' : '#12122a',
                borderColor: closed ? '#00ff88' : '#333366',
                boxShadow: closed ? '0 0 10px #00ff8833, 2px 2px 0 #000' : '2px 2px 0 #000',
              }}
            >
              <span className="text-[9px] tracking-wider" style={{ color: closed ? '#00ff88' : '#aaaaaa' }}>
                闭合赛道
              </span>
              {closed ? <Check className="w-4 h-4" style={{ color: '#00ff88' }} /> : <X className="w-4 h-4" style={{ color: '#888888' }} />}
            </button>

            <button
              onClick={() => setTrackClosed(!closed)}
              className="w-full p-2 border-3 transition-all flex items-center justify-between"
              style={{
                background: useCustomTrack ? '#1a1a3a' : '#12122a',
                borderColor: useCustomTrack ? '#33ccff' : '#333366',
                boxShadow: useCustomTrack ? '0 0 10px #33ccff33, 2px 2px 0 #000' : '2px 2px 0 #000',
              }}
            >
              <span className="text-[9px] tracking-wider" style={{ color: useCustomTrack ? '#33ccff' : '#aaaaaa' }}>
                使用此赛道
              </span>
              {useCustomTrack ? <Check className="w-4 h-4" style={{ color: '#33ccff' }} /> : <X className="w-4 h-4" style={{ color: '#888888' }} />}
            </button>
          </div>
        </div>

        <div className="p-4 border-b-4 border-[#333366]">
          <div className="text-[10px] tracking-widest mb-3" style={{ color: '#ff88cc' }}>快速操作 ACTIONS</div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={smoothTrackPoints}
              className="p-2 bg-[#1a1a3a] border-3 border-[#333366] text-[#ccccdd] hover:bg-[#2a2a5a] hover:border-[#ff88cc] active:translate-y-0.5 transition-all text-[8px] flex items-center justify-center gap-1"
              style={{ boxShadow: '2px 2px 0 #000' }}
            >
              <RotateCcw className="w-3.5 h-3.5" /> 平滑
            </button>
            <button
              onClick={resetCustomTrack}
              className="p-2 bg-[#1a1a3a] border-3 border-[#333366] text-[#ccccdd] hover:bg-[#2a2a5a] hover:border-[#ff3366] active:translate-y-0.5 transition-all text-[8px] flex items-center justify-center gap-1"
              style={{ boxShadow: '2px 2px 0 #000' }}
            >
              <RefreshCw className="w-3.5 h-3.5" /> 重置
            </button>
            <button
              onClick={handleExport}
              className="p-2 bg-[#1a1a3a] border-3 border-[#333366] text-[#ccccdd] hover:bg-[#2a2a5a] hover:border-[#aaff88] active:translate-y-0.5 transition-all text-[8px] flex items-center justify-center gap-1"
              style={{ boxShadow: '2px 2px 0 #000' }}
            >
              <Download className="w-3.5 h-3.5" /> 导出
            </button>
            <button
              onClick={handleImport}
              className="p-2 bg-[#1a1a3a] border-3 border-[#333366] text-[#ccccdd] hover:bg-[#2a2a5a] hover:border-[#33ccff] active:translate-y-0.5 transition-all text-[8px] flex items-center justify-center gap-1"
              style={{ boxShadow: '2px 2px 0 #000' }}
            >
              <Upload className="w-3.5 h-3.5" /> 导入
            </button>
          </div>

          <button
            onClick={saveCurrentTrack}
            className="w-full mt-3 p-2.5 bg-[#1a1a3a] border-3 border-[#aaff88] text-[#aaff88] hover:bg-[#2a2a5a] active:translate-y-0.5 transition-all text-[9px] flex items-center justify-center gap-2"
            style={{ boxShadow: '0 0 12px #aaff8822, 2px 2px 0 #000' }}
          >
            <Save className="w-4 h-4" /> 保存到列表
          </button>

          <button
            onClick={() => setShowSaved(!showSaved)}
            className="w-full mt-2 p-2 bg-[#12122a] border-3 border-[#333366] text-[#aaaaee] hover:bg-[#1a1a3a] transition-all text-[9px] flex items-center justify-between"
            style={{ boxShadow: '2px 2px 0 #000' }}
          >
            <span className="flex items-center gap-2">
              <Grid3X3 className="w-4 h-4" />
              已保存 ({savedTracks.length})
            </span>
            {showSaved ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showSaved && (
            <div className="mt-2 max-h-48 overflow-y-auto space-y-1 border-2 border-[#333366] bg-[#0a0a1a] p-2">
              {savedTracks.length === 0 ? (
                <div className="text-[9px] text-center py-3" style={{ color: '#666688' }}>暂无保存</div>
              ) : (
                savedTracks.map((t, i) => (
                  <div
                    key={i}
                    className="p-2 bg-[#12122a] border-2 border-[#333366] hover:border-[#00ff88] transition-all"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[9px] truncate" style={{ color: '#ccccdd' }}>{t.name}</span>
                      <span className="text-[8px]" style={{ color: '#8888aa' }}>{t.points.length}pts</span>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => loadTrack(t)}
                        className="flex-1 py-1 bg-[#1a1a3a] border-2 border-[#00ff88] text-[#00ff88] text-[8px] hover:bg-[#00ff8822]"
                      >
                        加载
                      </button>
                      <button
                        onClick={() => deleteSavedTrack(i)}
                        className="py-1 px-2 bg-[#1a1a3a] border-2 border-[#ff3366] text-[#ff3366] text-[8px] hover:bg-[#ff336622]"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <div className="p-4 border-b-4 border-[#333366]">
          <div className="text-[10px] tracking-widest mb-3" style={{ color: '#aaddff' }}>统计 INFO</div>
          <div className="space-y-1.5 text-[9px]">
            <div className="flex justify-between" style={{ color: '#ccccdd' }}>
              <span style={{ color: '#8888aa' }}>控制点</span>
              <span style={{ color: '#33ccff' }}>{points.length}</span>
            </div>
            <div className="flex justify-between" style={{ color: '#ccccdd' }}>
              <span style={{ color: '#8888aa' }}>检查点</span>
              <span style={{ color: '#ff3366' }}>{checkpoints.length}</span>
            </div>
            <div className="flex justify-between" style={{ color: '#ccccdd' }}>
              <span style={{ color: '#8888aa' }}>加速带</span>
              <span style={{ color: '#ffdd00' }}>{boostZones.length}</span>
            </div>
            <div className="flex justify-between" style={{ color: '#ccccdd' }}>
              <span style={{ color: '#8888aa' }}>道具箱</span>
              <span style={{ color: '#ffaa22' }}>{itemBoxes.length}</span>
            </div>
            <div className="flex justify-between" style={{ color: '#ccccdd' }}>
              <span style={{ color: '#8888aa' }}>缩放</span>
              <span style={{ color: '#aaffcc' }}>{(viewRef.current.zoom * 100).toFixed(0)}%</span>
            </div>
          </div>
        </div>

        <div className="mt-auto p-4 space-y-2">
          <button
            onClick={toggleUseCustomTrack}
            className={`w-full p-3 border-4 transition-all flex items-center justify-center gap-2 ${useCustomTrack ? '' : 'hover:-translate-y-0.5 active:translate-y-0.5'}`}
            style={{
              background: useCustomTrack ? '#00ff8822' : '#1a1a3a',
              borderColor: useCustomTrack ? '#00ff88' : '#333366',
              color: useCustomTrack ? '#00ff88' : '#aaaaaa',
              boxShadow: useCustomTrack ? '0 0 20px #00ff8844, 3px 3px 0 #000' : '3px 3px 0 #000',
            }}
          >
            {useCustomTrack ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />}
            <span className="text-[10px] tracking-wider">
              {useCustomTrack ? '已启用自定义赛道' : '启用自定义赛道'}
            </span>
          </button>

          <button
            onClick={handleTestTrack}
            className="w-full p-3 border-4 transition-all flex items-center justify-center gap-2 hover:-translate-y-0.5 active:translate-y-0.5"
            style={{
              background: '#ffdd00',
              borderColor: '#ccaa00',
              color: '#332200',
              boxShadow: '3px 3px 0 #000',
            }}
          >
            <Play className="w-5 h-5 fill-current" />
            <span className="text-[10px] tracking-wider">测试赛道</span>
          </button>
        </div>
      </div>

      <div ref={containerRef} className="flex-1 relative">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
          style={{ imageRendering: 'pixelated', cursor: editorTool === 'move' ? 'grab' : editorTool === 'add' ? 'crosshair' : editorTool === 'delete' ? 'not-allowed' : 'pointer' }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
        />

        <div className="absolute top-4 right-4 flex flex-col gap-2 items-end">
          <div className="flex items-center gap-2 p-2 bg-[#12122acc] border-3 border-[#333366] backdrop-blur-sm" style={{ boxShadow: '3px 3px 0 #000' }}>
            <button
              onClick={() => { viewRef.current.zoom = Math.max(0.2, viewRef.current.zoom * 0.85); }}
              className="p-1.5 bg-[#1a1a3a] border-2 border-[#333366] text-white hover:bg-[#2a2a5a]"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="text-[10px] w-12 text-center" style={{ color: '#aaddff' }}>
              {(viewRef.current.zoom * 100).toFixed(0)}%
            </span>
            <button
              onClick={() => { viewRef.current.zoom = Math.min(3, viewRef.current.zoom * 1.18); }}
              className="p-1.5 bg-[#1a1a3a] border-2 border-[#333366] text-white hover:bg-[#2a2a5a]"
            >
              <PlusIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => { viewRef.current.zoom = 0.7; viewRef.current.panX = 0; viewRef.current.panY = 0; }}
              className="p-1.5 bg-[#1a1a3a] border-2 border-[#333366] text-white hover:bg-[#2a2a5a]"
              title="重置视图"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {editorSelectedPoint !== null && (
            <div className="p-3 bg-[#12122acc] border-3 border-[#00ff88] backdrop-blur-sm min-w-[200px]" style={{ boxShadow: '0 0 16px #00ff8833, 3px 3px 0 #000' }}>
              <div className="text-[10px] tracking-wider mb-2" style={{ color: '#00ff88' }}>
                选中点 #{editorSelectedPoint}
              </div>
              <div className="space-y-1.5 text-[9px]">
                <div className="flex justify-between">
                  <span style={{ color: '#8888aa' }}>X</span>
                  <span style={{ color: '#ccccdd' }}>{Math.round(points[editorSelectedPoint]?.x || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span style={{ color: '#8888aa' }}>Y</span>
                  <span style={{ color: '#ccccdd' }}>{Math.round(points[editorSelectedPoint]?.y || 0)}</span>
                </div>
                <div className="flex gap-1.5 mt-2 pt-2 border-t border-[#2a2a4a]">
                  <button
                    onClick={() => toggleCheckpoint(editorSelectedPoint)}
                    className={`flex-1 py-1.5 border-2 text-[8px] ${checkpoints.includes(editorSelectedPoint) ? 'bg-[#ff336622] border-[#ff3366] text-[#ff3366]' : 'bg-[#1a1a3a] border-[#333366] text-[#aaaaaa]'}`}
                  >
                    {checkpoints.includes(editorSelectedPoint) ? '★CP' : 'CP'}
                  </button>
                  <button
                    onClick={() => toggleBoostZone(editorSelectedPoint)}
                    className={`flex-1 py-1.5 border-2 text-[8px] ${boostZones.includes(editorSelectedPoint) ? 'bg-[#ffdd0022] border-[#ffdd00] text-[#ffdd00]' : 'bg-[#1a1a3a] border-[#333366] text-[#aaaaaa]'}`}
                  >
                    ⚡
                  </button>
                  <button
                    onClick={() => toggleItemBox(editorSelectedPoint)}
                    className={`flex-1 py-1.5 border-2 text-[8px] ${itemBoxes.includes(editorSelectedPoint) ? 'bg-[#ffaa2222] border-[#ffaa22] text-[#ffaa22]' : 'bg-[#1a1a3a] border-[#333366] text-[#aaaaaa]'}`}
                  >
                    🎁
                  </button>
                  {points.length > 3 && (
                    <button
                      onClick={() => { deleteTrackPoint(editorSelectedPoint); }}
                      className="py-1.5 px-2 border-2 bg-[#1a1a3a] border-[#ff3366] text-[#ff3366] hover:bg-[#ff336622] text-[8px]"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 p-2 bg-[#12122acc] border-3 border-[#333366] backdrop-blur-sm" style={{ boxShadow: '3px 3px 0 #000' }}>
          <div className="flex items-center gap-1 px-2 text-[9px]" style={{ color: '#8888aa' }}>
            <Flag className="w-3.5 h-3.5" style={{ color: '#ff3366' }} />
            <span>起点</span>
          </div>
          <div className="w-px h-4 bg-[#333366]" />
          <div className="flex items-center gap-1 px-2 text-[9px]" style={{ color: '#8888aa' }}>
            <Flag className="w-3.5 h-3.5" style={{ color: '#ffffff' }} />
            <span>检查点</span>
          </div>
          <div className="w-px h-4 bg-[#333366]" />
          <div className="flex items-center gap-1 px-2 text-[9px]" style={{ color: '#8888aa' }}>
            <Zap className="w-3.5 h-3.5" style={{ color: '#ffdd00' }} />
            <span>加速带</span>
          </div>
          <div className="w-px h-4 bg-[#333366]" />
          <div className="flex items-center gap-1 px-2 text-[9px]" style={{ color: '#8888aa' }}>
            <Gift className="w-3.5 h-3.5" style={{ color: '#ffaa22' }} />
            <span>道具箱</span>
          </div>
        </div>
      </div>
    </div>
  );
}
