import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  PenTool, Eraser, Move, Trash2, Save, Loader,
  Square, Circle, Minus, ArrowUpRight, Activity, Undo2, Redo2,
} from 'lucide-react';

// ─── Constants ────────────────────────────────────────────────────────────────
const COLORS    = ['#1e293b','#ef4444','#3b82f6','#10b981','#f59e0b','#8b5cf6','#ec4899','#ffffff'];
const GRID_SIZE = 50;
const BG_COLOR  = '#f8fafc';
const GRID_COLOR = '#d1d5db';

const TOOLS = [
  { id: 'pen',       icon: PenTool,      label: 'Pen' },
  { id: 'path',      icon: Activity,     label: 'Path' },
  { id: 'line',      icon: Minus,        label: 'Line' },
  { id: 'arrow',     icon: ArrowUpRight, label: 'Arrow' },
  { id: 'rectangle', icon: Square,       label: 'Rect (Shift=square)' },
  { id: 'circle',    icon: Circle,       label: 'Circle' },
  { id: 'eraser',    icon: Eraser,       label: 'Eraser' },
  { id: 'pan',       icon: Move,         label: 'Pan' },
];

// ─── Pure canvas helpers ──────────────────────────────────────────────────────
function paintStroke(ctx, stroke) {
  if (!stroke || !Array.isArray(stroke.points) || stroke.points.length < 2) return;
  const pts  = stroke.points;
  const p0   = pts[0];
  const pEnd = pts[pts.length - 1];

  ctx.save();
  ctx.lineCap    = 'round';
  ctx.lineJoin   = 'round';
  ctx.lineWidth  = stroke.width || 3;
  ctx.strokeStyle = stroke.color || '#1e293b';

  ctx.beginPath();
  switch (stroke.tool) {
    case 'rectangle':
      ctx.rect(p0.x, p0.y, pEnd.x - p0.x, pEnd.y - p0.y);
      break;
    case 'circle': {
      const rx = Math.abs(pEnd.x - p0.x) / 2;
      const ry = Math.abs(pEnd.y - p0.y) / 2;
      if (rx > 0 && ry > 0)
        ctx.ellipse((p0.x + pEnd.x)/2, (p0.y + pEnd.y)/2, rx, ry, 0, 0, Math.PI * 2);
      break;
    }
    case 'line':
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(pEnd.x, pEnd.y);
      break;
    case 'arrow': {
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(pEnd.x, pEnd.y);
      const ang = Math.atan2(pEnd.y - p0.y, pEnd.x - p0.x);
      const hl  = Math.max(15, (stroke.width || 3) * 3);
      ctx.moveTo(pEnd.x, pEnd.y);
      ctx.lineTo(pEnd.x - hl * Math.cos(ang - Math.PI/6), pEnd.y - hl * Math.sin(ang - Math.PI/6));
      ctx.moveTo(pEnd.x, pEnd.y);
      ctx.lineTo(pEnd.x - hl * Math.cos(ang + Math.PI/6), pEnd.y - hl * Math.sin(ang + Math.PI/6));
      break;
    }
    default: // pen, path, eraser (freehand)
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  }
  ctx.stroke();
  ctx.restore();
}

function paintGrid(ctx, W, H, cam) {
  const step = GRID_SIZE * cam.scale;
  const offX = ((cam.x % step) + step) % step;
  const offY = ((cam.y % step) + step) % step;

  ctx.save();
  ctx.strokeStyle = GRID_COLOR;
  ctx.lineWidth   = 0.7;
  ctx.beginPath();
  for (let x = offX; x <= W; x += step) { ctx.moveTo(x, 0); ctx.lineTo(x, H); }
  for (let y = offY; y <= H; y += step) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
  ctx.stroke();
  ctx.restore();
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function WhiteboardView() {
  const containerRef = useRef(null); // the position:absolute fill div – observed for size
  const canvasRef    = useRef(null);
  const rafRef       = useRef(null);

  // All rendering data lives in refs (no stale-closure issues in RAF)
  const strokesRef    = useRef([]);
  const liveStroke    = useRef(null);  // stroke being drawn right now
  const livePathRef   = useRef(null);  // path tool WIP
  const mouseRef      = useRef({ x: 0, y: 0 });
  const camRef        = useRef({ x: 0, y: 0, scale: 1 });

  // React state (for UI only – toolbar counts, buttons, indicators)
  const [strokeCount,    setStrokeCount]    = useState(0);
  const [redoStack,      setRedoStack]      = useState([]);
  const [tool,           setTool]           = useState('pen');
  const [color,          setColor]          = useState(COLORS[0]);
  const [size,           setSize]           = useState(3);
  const [isLoading,      setIsLoading]      = useState(true);
  const [isSaving,       setIsSaving]       = useState(false);
  const [panning,        setPanning]        = useState(false);
  const [zoom,           setZoom]           = useState(100);
  const [pathActive,     setPathActive]     = useState(false);

  // Interaction flags (refs = no re-render overhead)
  const drawingRef = useRef(false);
  const panRef     = useRef(false);
  const lastPan    = useRef({ x: 0, y: 0 });

  // ── Persistence ────────────────────────────────────────────────────────────
  const saveTimer = useRef(null);
  const doSave = useCallback((data) => {
    setIsSaving(true);
    try { localStorage.setItem('whiteboard_strokes', JSON.stringify(data)); } catch (_) {}
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => setIsSaving(false), 700);
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('whiteboard_strokes');
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) { strokesRef.current = arr; setStrokeCount(arr.length); }
      }
    } catch (_) {}
    setIsLoading(false);
  }, []);

  // ── Render (reads refs only – zero stale closure issues) ──────────────────
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const W = canvas.width, H = canvas.height;
    if (W === 0 || H === 0) return;

    const ctx = canvas.getContext('2d');
    const cam = camRef.current;

    // 1. Solid background
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, W, H);

    // 2. World-space strokes (camera transform applied)
    ctx.save();
    ctx.translate(cam.x, cam.y);
    ctx.scale(cam.scale, cam.scale);

    strokesRef.current.forEach(s => {
      if (s.tool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
        paintStroke(ctx, s);
        ctx.globalCompositeOperation = 'source-over';
      } else {
        paintStroke(ctx, s);
      }
    });

    if (liveStroke.current) {
      const ls = liveStroke.current;
      if (ls.tool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
        paintStroke(ctx, ls);
        ctx.globalCompositeOperation = 'source-over';
      } else {
        paintStroke(ctx, ls);
      }
    }

    if (livePathRef.current && livePathRef.current.points.length > 0) {
      paintStroke(ctx, {
        ...livePathRef.current,
        points: [...livePathRef.current.points, mouseRef.current],
      });
    }

    ctx.restore();

    // 3. Patch eraser holes: fill transparent pixels with background (so grid remains visible)
    ctx.globalCompositeOperation = 'destination-over';
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, W, H);

    // 4. Grid drawn last in screen-space – never touched by eraser
    ctx.globalCompositeOperation = 'source-over';
    paintGrid(ctx, W, H, cam);
  }, []); // stable – only reads refs

  const scheduleRender = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(render);
  }, [render]);

  // ── Canvas sizing via ResizeObserver on the fill container ────────────────
  useEffect(() => {
    const container = containerRef.current;
    const canvas    = canvasRef.current;
    if (!container || !canvas) return;

    const resize = (w, h) => {
      if (w > 0 && h > 0) {
        canvas.width  = Math.round(w);
        canvas.height = Math.round(h);
        scheduleRender();
      }
    };

    const obs = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      resize(width, height);
    });
    obs.observe(container);

    // Seed immediately (ResizeObserver fires async)
    const r = container.getBoundingClientRect();
    resize(r.width, r.height);

    return () => obs.disconnect();
  }, [scheduleRender]);

  // ── World-coordinate conversion ───────────────────────────────────────────
  const toWorld = (cx, cy) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const r   = canvas.getBoundingClientRect();
    const cam = camRef.current;
    // Scale factor: canvas buffer vs CSS display size
    const scaleX = canvas.width  / r.width;
    const scaleY = canvas.height / r.height;
    return {
      x: ((cx - r.left) * scaleX - cam.x) / cam.scale,
      y: ((cy - r.top)  * scaleY - cam.y) / cam.scale,
    };
  };

  // ── Commit finished stroke ────────────────────────────────────────────────
  const commitStroke = useCallback(() => {
    const s = liveStroke.current;
    liveStroke.current = null;
    if (!s || s.points.length < 2) { scheduleRender(); return; }
    const next = [...strokesRef.current, s];
    strokesRef.current = next;
    setStrokeCount(next.length);
    setRedoStack([]);
    doSave(next);
    scheduleRender();
  }, [doSave, scheduleRender]);

  // ── Undo / Redo ───────────────────────────────────────────────────────────
  const undo = useCallback(() => {
    if (!strokesRef.current.length) return;
    const removed = strokesRef.current.at(-1);
    const next    = strokesRef.current.slice(0, -1);
    strokesRef.current = next;
    setStrokeCount(next.length);
    setRedoStack(rs => [...rs, removed]);
    doSave(next);
    scheduleRender();
  }, [doSave, scheduleRender]);

  const redo = useCallback(() => {
    setRedoStack(rs => {
      if (!rs.length) return rs;
      const stroke = rs.at(-1);
      const next   = [...strokesRef.current, stroke];
      strokesRef.current = next;
      setStrokeCount(next.length);
      doSave(next);
      scheduleRender();
      return rs.slice(0, -1);
    });
  }, [doSave, scheduleRender]);

  const wipeAll = () => {
    if (!window.confirm('Wipe entire whiteboard? This cannot be undone.')) return;
    strokesRef.current = [];
    liveStroke.current = null;
    livePathRef.current = null;
    setStrokeCount(0);
    setRedoStack([]);
    setPathActive(false);
    doSave([]);
    scheduleRender();
  };

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); undo(); }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); }
      if (e.key === 'Escape') {
        const ap = livePathRef.current;
        if (ap && ap.points.length > 1) {
          const next = [...strokesRef.current, ap];
          strokesRef.current = next;
          setStrokeCount(next.length);
          setRedoStack([]);
          doSave(next);
        }
        livePathRef.current = null;
        setPathActive(false);
        drawingRef.current = false;
        scheduleRender();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo, doSave, scheduleRender]);

  // ── Pointer events ────────────────────────────────────────────────────────
  const onPointerDown = (e) => {
    canvasRef.current?.setPointerCapture(e.pointerId);

    if (e.button === 1 || tool === 'pan' || e.shiftKey) {
      panRef.current   = true;
      lastPan.current  = { x: e.clientX, y: e.clientY };
      setPanning(true);
      return;
    }
    if (e.button !== 0) return;

    const pt = toWorld(e.clientX, e.clientY);

    if (tool === 'path') {
      if (livePathRef.current) {
        livePathRef.current = { ...livePathRef.current, points: [...livePathRef.current.points, pt] };
      } else {
        livePathRef.current = { tool: 'path', color, width: size, points: [pt] };
        setPathActive(true);
      }
      drawingRef.current = true;
      scheduleRender();
      return;
    }

    drawingRef.current = true;
    liveStroke.current = {
      tool,
      color,
      width: tool === 'eraser' ? Math.max(size * 5, 20) : size,
      points: [{ ...pt }, { ...pt }],
    };
    scheduleRender();
  };

  const onPointerMove = (e) => {
    if (panRef.current) {
      const dx = e.clientX - lastPan.current.x;
      const dy = e.clientY - lastPan.current.y;
      camRef.current = { ...camRef.current, x: camRef.current.x + dx, y: camRef.current.y + dy };
      lastPan.current = { x: e.clientX, y: e.clientY };
      scheduleRender();
      return;
    }

    const pt = toWorld(e.clientX, e.clientY);
    mouseRef.current = { ...pt };

    if (tool === 'path' && livePathRef.current) { scheduleRender(); return; }
    if (!drawingRef.current || !liveStroke.current) return;

    const t = liveStroke.current.tool;
    if (t === 'pen' || t === 'eraser') {
      const last = liveStroke.current.points.at(-1);
      const dist = Math.hypot(pt.x - last.x, pt.y - last.y);
      if (dist > 1 / camRef.current.scale) {
        liveStroke.current.points.push({ ...pt });
      }
    } else {
      // Shape: always update end point
      let end = { ...pt };
      if (t === 'rectangle' && e.shiftKey) {
        const p0 = liveStroke.current.points[0];
        const dx = pt.x - p0.x, dy = pt.y - p0.y;
        const s  = Math.max(Math.abs(dx), Math.abs(dy));
        end = { x: p0.x + Math.sign(dx) * s, y: p0.y + Math.sign(dy) * s };
      }
      liveStroke.current.points[1] = end;
    }
    scheduleRender();
  };

  const onPointerUp = () => {
    if (panRef.current) { panRef.current = false; setPanning(false); }
    if (drawingRef.current && tool !== 'path') {
      drawingRef.current = false;
      commitStroke();
    }
  };

  const onDblClick = () => {
    const ap = livePathRef.current;
    if (tool === 'path' && ap && ap.points.length > 1) {
      const next = [...strokesRef.current, ap];
      strokesRef.current = next;
      setStrokeCount(next.length);
      setRedoStack([]);
      doSave(next);
      livePathRef.current = null;
      setPathActive(false);
      drawingRef.current = false;
      scheduleRender();
    }
  };

  const onWheel = (e) => {
    e.preventDefault();
    const cam    = camRef.current;
    const factor = Math.exp(-e.deltaY * 0.001);
    const ns     = Math.max(0.05, Math.min(cam.scale * factor, 20));
    const canvas = canvasRef.current;
    if (!canvas) return;
    const r  = canvas.getBoundingClientRect();
    const mx = (e.clientX - r.left) * (canvas.width  / r.width);
    const my = (e.clientY - r.top)  * (canvas.height / r.height);
    camRef.current = {
      x: mx - (mx - cam.x) * (ns / cam.scale),
      y: my - (my - cam.y) * (ns / cam.scale),
      scale: ns,
    };
    setZoom(Math.round(ns * 100));
    scheduleRender();
  };

  // ── Toolbar style helper ──────────────────────────────────────────────────
  const tbBtn = (active, ac = '#3b82f6', ab = '#eff6ff') => ({
    background: active ? ab : 'transparent',
    color:      active ? ac : '#64748b',
    border: 'none', padding: 8, borderRadius: 10,
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
  });

  if (isLoading) return (
    <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', background: BG_COLOR }}>
      <Loader size={36} color="#6366f1" style={{ animation:'spin 1s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    /* This div fills whatever space App.jsx gave us (position:relative wrapper with flex:1) */
    <div ref={containerRef} style={{ position:'absolute', inset:0, overflow:'hidden', background: BG_COLOR }}>


      {/* ── Toolbar ── */}
      <div style={{
        position:'absolute', top:14, left:'50%', transform:'translateX(-50%)',
        background:'#fff', padding:'7px 12px', borderRadius:22,
        boxShadow:'0 4px 24px rgba(0,0,0,0.13)',
        display:'flex', alignItems:'center', gap:8, zIndex:30, userSelect:'none',
      }}>
        {/* Tools */}
        <div style={{ display:'flex', gap:2, borderRight:'1.5px solid #f1f5f9', paddingRight:8 }}>
          {TOOLS.map(({ id, icon: Icon, label }) => {
            const active = tool === id;
            const [ab,ac] = id==='eraser'?['#fef2f2','#ef4444']:id==='pan'?['#f0fdf4','#10b981']:['#eff6ff','#3b82f6'];
            return (
              <button key={id} title={label} style={tbBtn(active,ac,ab)}
                onClick={() => { setTool(id); livePathRef.current=null; setPathActive(false); }}>
                <Icon size={16} />
              </button>
            );
          })}
        </div>

        {/* Size */}
        <div style={{ display:'flex', alignItems:'center', gap:4, borderRight:'1.5px solid #f1f5f9', paddingRight:8 }}>
          <span style={{ fontSize:'0.7rem', fontWeight:700, color:'#94a3b8' }}>Size {size}</span>
          <input type="range" min={1} max={40} value={size}
            onChange={e => setSize(Number(e.target.value))}
            style={{ width:60, accentColor:'#6366f1' }} />
        </div>

        {/* Colors */}
        <div style={{ display:'flex', gap:4, borderRight:'1.5px solid #f1f5f9', paddingRight:8 }}>
          {COLORS.map(c => (
            <button key={c} title={c}
              onClick={() => { setColor(c); if(['eraser','pan'].includes(tool)) setTool('pen'); }}
              style={{
                width:18, height:18, borderRadius:'50%', background:c, padding:0,
                border: color===c ? `3px solid ${c==='#ffffff'?'#94a3b8':c}` : '1px solid #e2e8f0',
                outline: color===c ? `2px solid ${c==='#ffffff'?'#94a3b8':c}` : 'none',
                outlineOffset:1, cursor:'pointer', flexShrink:0,
                boxShadow: c==='#ffffff' ? 'inset 0 0 0 1px #d1d5db' : 'none',
              }} />
          ))}
        </div>

        {/* Actions */}
        <div style={{ display:'flex', alignItems:'center', gap:2 }}>
          <button title="Undo (Ctrl+Z)" onClick={undo} disabled={!strokeCount} style={tbBtn(false)}>
            <Undo2 size={16} color={strokeCount?'#64748b':'#d1d5db'} />
          </button>
          <button title="Redo (Ctrl+Y)" onClick={redo} disabled={!redoStack.length} style={tbBtn(false)}>
            <Redo2 size={16} color={redoStack.length?'#64748b':'#d1d5db'} />
          </button>
          <button onClick={wipeAll} style={{
            display:'flex', alignItems:'center', gap:4, marginLeft:4,
            background:'#fef2f2', color:'#ef4444', border:'none',
            padding:'5px 10px', borderRadius:10, cursor:'pointer', fontWeight:700, fontSize:'0.75rem',
          }}>
            <Trash2 size={13} /> Wipe All
          </button>
        </div>
      </div>

      {/* ── Status bar ── */}
      <div style={{
        position:'absolute', bottom:12, right:12, zIndex:30,
        background:'#fff', padding:'4px 10px', borderRadius:20,
        boxShadow:'0 2px 10px rgba(0,0,0,0.07)',
        display:'flex', alignItems:'center', gap:6,
        fontSize:'0.7rem', fontWeight:700,
        color: isSaving?'#f59e0b':'#10b981',
      }}>
        {isSaving
          ? <Loader size={11} style={{ animation:'spin 1s linear infinite' }} />
          : <Save size={11} />}
        {isSaving ? 'Saving…' : 'Saved'}
        <span style={{ color:'#94a3b8', marginLeft:3 }}>{zoom}%</span>
      </div>

      {/* ── Path hint ── */}
      {tool === 'path' && (
        <div style={{
          position:'absolute', bottom:12, left:'50%', transform:'translateX(-50%)', zIndex:30,
          background:'rgba(30,41,59,0.85)', color:'#fff',
          padding:'4px 12px', borderRadius:20, fontSize:'0.75rem', fontWeight:600,
          pointerEvents:'none', whiteSpace:'nowrap',
        }}>
          {pathActive ? 'Click to add points · Double-click or Esc to finish' : 'Click to start path'}
        </div>
      )}

      {/* ── Canvas fills the container completely ── */}
      <canvas
        ref={canvasRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        onDoubleClick={onDblClick}
        onWheel={onWheel}
        style={{
          position:'absolute', top:0, left:0,
          width: '100%', height: '100%',
          touchAction:'none',
          cursor: panning || tool==='pan' ? 'grab' : 'crosshair',
        }}
      />

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
