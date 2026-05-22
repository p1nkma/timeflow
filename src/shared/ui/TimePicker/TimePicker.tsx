import { useState, useRef, type PointerEvent } from 'react';
import { fmt } from '../../utils/time';
import { Icon, Clock01Icon } from '../Icon/Icon';
import { DrumColumn } from './DrumColumn';
import styles from './TimePicker.module.css';

// ── types ─────────────────────────────────────────────────────────────────────

type PickerMode = 'drum' | 'dial';

interface Props {
  value: number;             // minutes from midnight
  onChange: (min: number) => void;
  step?: 5 | 10 | 15 | 30;  // minute step for dial (default 5)
}

// ── ClockDial ─────────────────────────────────────────────────────────────────

const DIAL_R  = 120;
const INNER_R = 72;
const OUTER_R = 108;
const CENTER  = 140;

function angleFromCenter(cx: number, cy: number, px: number, py: number): number {
  const rad = Math.atan2(py - cy, px - cx);
  let deg = (rad * 180) / Math.PI + 90;
  if (deg < 0) deg += 360;
  return deg;
}

function buildHourPositions() {
  const result: { value: number; x: number; y: number; inner: boolean }[] = [];
  for (let i = 0; i < 12; i++) {
    const angle = (i * 30 - 90) * (Math.PI / 180);
    result.push({ value: i === 0 ? 0 : i, x: CENTER + OUTER_R * Math.cos(angle), y: CENTER + OUTER_R * Math.sin(angle), inner: false });
  }
  for (let i = 0; i < 12; i++) {
    const angle = (i * 30 - 90) * (Math.PI / 180);
    result.push({ value: i === 0 ? 12 : i + 12, x: CENTER + INNER_R * Math.cos(angle), y: CENTER + INNER_R * Math.sin(angle), inner: true });
  }
  return result;
}

function buildMinutePositions(step: number) {
  const result: { value: number; x: number; y: number }[] = [];
  for (let v = 0; v < 60; v += step) {
    const angle = (v * 6 - 90) * (Math.PI / 180);
    result.push({ value: v, x: CENTER + OUTER_R * Math.cos(angle), y: CENTER + OUTER_R * Math.sin(angle) });
  }
  return result;
}

type DialPhase = 'hour' | 'minute';

function ClockDial({ hours, minutes, step, onHoursChange, onMinutesChange }: {
  hours: number; minutes: number; step: number;
  onHoursChange: (h: number) => void;
  onMinutesChange: (m: number) => void;
}) {
  const [phase, setPhase] = useState<DialPhase>('hour');
  const svgRef   = useRef<SVGSVGElement>(null);
  const dragging = useRef(false);

  const hourPos   = buildHourPositions();
  const minutePos = buildMinutePositions(step);

  function getSVGCoords(e: PointerEvent<SVGSVGElement>) {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect  = svg.getBoundingClientRect();
    const scale = (CENTER * 2) / rect.width;
    return { x: (e.clientX - rect.left) * scale, y: (e.clientY - rect.top) * scale };
  }

  function pickHour(x: number, y: number) {
    const angle  = angleFromCenter(CENTER, CENTER, x, y);
    const dist   = Math.hypot(x - CENTER, y - CENTER);
    const inner  = dist < (INNER_R + OUTER_R) / 2;
    const rawIdx = Math.round(angle / 30) % 12;
    onHoursChange(inner ? (rawIdx === 0 ? 12 : rawIdx + 12) : (rawIdx === 0 ? 0 : rawIdx));
  }

  function pickMinute(x: number, y: number) {
    const angle = angleFromCenter(CENTER, CENTER, x, y);
    onMinutesChange(Math.round(angle / (6 * step)) * step % 60);
  }

  function onDown(e: PointerEvent<SVGSVGElement>) {
    dragging.current = true;
    svgRef.current?.setPointerCapture(e.pointerId);
    const { x, y } = getSVGCoords(e);
    phase === 'hour' ? pickHour(x, y) : pickMinute(x, y);
  }

  function onMove(e: PointerEvent<SVGSVGElement>) {
    if (!dragging.current) return;
    const { x, y } = getSVGCoords(e);
    phase === 'hour' ? pickHour(x, y) : pickMinute(x, y);
  }

  function onUp(e: PointerEvent<SVGSVGElement>) {
    if (!dragging.current) return;
    dragging.current = false;
    svgRef.current?.releasePointerCapture(e.pointerId);
    if (phase === 'hour') setPhase('minute');
  }

  const activeAngle = phase === 'hour'
    ? ((hours % 12) * 30 - 90) * (Math.PI / 180)
    : (minutes * 6 - 90) * (Math.PI / 180);

  const needleR = phase === 'hour'
    ? ((hours >= 1 && hours <= 11) || hours === 0 ? OUTER_R : INNER_R)
    : OUTER_R;

  const needleX  = CENTER + needleR * Math.cos(activeAngle);
  const needleY  = CENTER + needleR * Math.sin(activeAngle);
  const points   = phase === 'hour' ? hourPos : minutePos;
  const activeVal = phase === 'hour' ? hours : minutes;

  return (
    <div className={styles.dialWrap}>
      <div className={styles.dialTabs}>
        <button className={`${styles.dialTab} ${phase === 'hour' ? styles.dialTabActive : ''}`} onClick={() => setPhase('hour')}>
          {String(hours).padStart(2, '0')}
        </button>
        <span className={styles.dialColon}>:</span>
        <button className={`${styles.dialTab} ${phase === 'minute' ? styles.dialTabActive : ''}`} onClick={() => setPhase('minute')}>
          {String(minutes).padStart(2, '0')}
        </button>
      </div>

      <svg ref={svgRef} viewBox={`0 0 ${CENTER * 2} ${CENTER * 2}`}
        className={styles.dialSvg} style={{ touchAction: 'none' }}
        onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp}
      >
        <circle cx={CENTER} cy={CENTER} r={DIAL_R} className={styles.dialBg} />
        <line x1={CENTER} y1={CENTER} x2={needleX} y2={needleY} className={styles.dialNeedle} />
        <circle cx={CENTER} cy={CENTER} r={4} className={styles.dialCentreDot} />
        <circle cx={needleX} cy={needleY} r={18} className={styles.dialThumb} />
        {points.map(p => (
          <text key={p.value} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="central"
            className={`${styles.dialNum} ${'inner' in p && (p as { inner: boolean }).inner ? styles.dialNumInner : ''} ${p.value === activeVal ? styles.dialNumActive : ''}`}
          >
            {String(p.value).padStart(2, '0')}
          </text>
        ))}
      </svg>
    </div>
  );
}

// ── Main TimePicker ───────────────────────────────────────────────────────────

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const buildMinutes = (step: number) => Array.from({ length: Math.ceil(60 / step) }, (_, i) => i * step);

export function TimePicker({ value, onChange, step = 5 }: Props) {
  const [mode, setMode] = useState<PickerMode>('drum');

  const hours       = Math.floor(value / 60);
  const minutes     = value % 60;
  const minuteItems = buildMinutes(step);

  function setHours(h: number) { onChange(h * 60 + minutes); }
  function setMinutes(m: number) { onChange(hours * 60 + m); }

  function handleModeSwitch() {
    const snapped = Math.round(minutes / step) * step % 60;
    if (snapped !== minutes) onChange(hours * 60 + snapped);
    setMode(m => m === 'drum' ? 'dial' : 'drum');
  }

  return (
    <div className={styles.root}>
      {mode === 'drum' && (
        <div className={styles.display}>
          <span className={styles.displayTime}>{fmt(value)}</span>
        </div>
      )}

      {mode === 'drum' ? (
        <div className={styles.drumWrap}>
          <DrumColumn
            items={HOURS}
            selected={hours}
            onSelect={setHours}
            formatItem={v => String(v).padStart(2, '0')}
          />
          <span className={styles.drumColon}>:</span>
          <DrumColumn
            items={minuteItems}
            selected={minutes}
            onSelect={setMinutes}
            formatItem={v => String(v).padStart(2, '0')}
          />
        </div>
      ) : (
        <ClockDial
          hours={hours} minutes={minutes} step={step}
          onHoursChange={setHours} onMinutesChange={setMinutes}
        />
      )}

      <div className={styles.modeRow}>
        <button
          className={styles.modeToggle}
          onClick={handleModeSwitch}
          aria-label={mode === 'drum' ? 'Переключить на циферблат' : 'Переключить на барабан'}
        >
          {mode === 'drum' ? (
            <Icon icon={Clock01Icon} size={18} />
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="4" y1="7" x2="20" y2="7" opacity="0.4"/>
              <line x1="4" y1="12" x2="20" y2="12"/>
              <line x1="4" y1="17" x2="20" y2="17" opacity="0.4"/>
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
