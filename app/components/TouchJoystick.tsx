'use client';

import { useEffect, useRef, useState } from 'react';

export type Direction = 'up' | 'down' | 'left' | 'right';

const RADIUS = 50;
const DEAD_ZONE = 18;
const REPEAT_MS = 160;

export default function TouchJoystick({ onMove }: { onMove: (direction: Direction) => void }) {
  const [base, setBase] = useState<{ x: number; y: number } | null>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const pointerRef = useRef<number | null>(null);
  const dirRef = useRef<Direction | null>(null);
  const onMoveRef = useRef(onMove);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    onMoveRef.current = onMove;
  }, [onMove]);

  const stopRepeat = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  };

  useEffect(() => stopRepeat, []);

  const setDirection = (dir: Direction | null) => {
    if (dir === dirRef.current) return;
    dirRef.current = dir;
    stopRepeat();
    if (dir) {
      onMoveRef.current(dir);
      timerRef.current = setInterval(() => dirRef.current && onMoveRef.current(dirRef.current), REPEAT_MS);
    }
  };

  const update = (clientX: number, clientY: number, origin: { x: number; y: number }) => {
    const dx = clientX - origin.x;
    const dy = clientY - origin.y;
    const dist = Math.hypot(dx, dy);
    const scale = dist > RADIUS ? RADIUS / dist : 1;
    setKnob({ x: dx * scale, y: dy * scale });
    if (dist < DEAD_ZONE) setDirection(null);
    else if (Math.abs(dx) > Math.abs(dy)) setDirection(dx > 0 ? 'right' : 'left');
    else setDirection(dy > 0 ? 'down' : 'up');
  };

  const release = () => {
    pointerRef.current = null;
    setBase(null);
    setKnob({ x: 0, y: 0 });
    setDirection(null);
  };

  return (
    <div
      onPointerDown={(e) => {
        if (pointerRef.current !== null) return;
        pointerRef.current = e.pointerId;
        e.currentTarget.setPointerCapture(e.pointerId);
        const rect = e.currentTarget.getBoundingClientRect();
        setBase({ x: e.clientX - rect.left, y: e.clientY - rect.top });
        setKnob({ x: 0, y: 0 });
      }}
      onPointerMove={(e) => {
        if (pointerRef.current !== e.pointerId || !base) return;
        const rect = e.currentTarget.getBoundingClientRect();
        update(e.clientX, e.clientY, { x: rect.left + base.x, y: rect.top + base.y });
      }}
      onPointerUp={release}
      onPointerCancel={release}
      style={{
        position: 'fixed',
        left: 0,
        bottom: 0,
        width: '50vw',
        maxWidth: '260px',
        height: '45vh',
        maxHeight: '260px',
        touchAction: 'none',
        userSelect: 'none',
        zIndex: 900,
      }}
    >
      {(() => {
        const center = base ?? { x: 90, y: -90 };
        return (
          <div style={{
            position: 'absolute',
            left: center.x - RADIUS,
            top: base ? center.y - RADIUS : undefined,
            bottom: base ? undefined : 40,
            width: RADIUS * 2,
            height: RADIUS * 2,
            borderRadius: '50%',
            background: 'rgba(255, 255, 255, 0.12)',
            border: '2px solid rgba(201, 162, 39, 0.6)',
            opacity: base ? 1 : 0.5,
            pointerEvents: 'none',
          }}>
            <div style={{
              position: 'absolute',
              left: RADIUS - 22 + knob.x,
              top: RADIUS - 22 + knob.y,
              width: 44,
              height: 44,
              borderRadius: '50%',
              background: 'rgba(201, 162, 39, 0.85)',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.5)',
            }} />
          </div>
        );
      })()}
    </div>
  );
}
