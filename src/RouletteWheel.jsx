// 후보자 목록을 SVG 슬라이스로 그리고, 회전 transform으로 당첨자에 멈추는 룰렛.

import { useEffect, useMemo, useRef, useState } from 'react';

const SIZE = 480;
const CENTER = SIZE / 2;
const RADIUS = SIZE / 2 - 10;

// 슬라이스 색상 — KB 톤 기반 + 보색으로 분간 가능하게
const PALETTE = [
  '#FFB900', '#1A1A2E', '#0070BB', '#16A34A',
  '#DC2626', '#9333EA', '#0891B2', '#EA580C',
  '#65A30D', '#DB2777', '#475569', '#CA8A04',
];

function polar(cx, cy, r, angleDeg) {
  const a = ((angleDeg - 90) * Math.PI) / 180;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
}

function arcPath(startDeg, endDeg) {
  const [x1, y1] = polar(CENTER, CENTER, RADIUS, startDeg);
  const [x2, y2] = polar(CENTER, CENTER, RADIUS, endDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${CENTER} ${CENTER} L ${x1} ${y1} A ${RADIUS} ${RADIUS} 0 ${large} 1 ${x2} ${y2} Z`;
}

export default function RouletteWheel({ candidates, winners, onComplete }) {
  // candidates: 회전 휠에 표시되는 모든 후보 (순서 고정)
  // winners: 미리 뽑은 당첨자 배열 (순차적으로 멈추는 위치 결정)
  // onComplete: 모든 당첨자 reveal 완료 시 호출
  const sliceAngle = 360 / Math.max(candidates.length, 1);
  const [rotation, setRotation] = useState(0);
  const [revealed, setRevealed] = useState([]); // 지금까지 reveal된 당첨자 인덱스 배열
  const [phase, setPhase] = useState('idle'); // idle | spinning | between | done
  const cursor = useRef(0); // 다음에 reveal할 winner index
  const timerRef = useRef(null);

  const codeToIndex = useMemo(() => {
    const m = new Map();
    candidates.forEach((c, i) => m.set(c.코드, i));
    return m;
  }, [candidates]);

  useEffect(() => {
    cursor.current = 0;
    setRevealed([]);
    setPhase('spinning');
    spinNext(0);
    return () => clearTimeout(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const spinNext = (currentRotation) => {
    if (cursor.current >= winners.length) {
      setPhase('done');
      onComplete && onComplete();
      return;
    }
    const winner = winners[cursor.current];
    const idx = codeToIndex.get(winner.코드);
    if (idx == null) {
      // 후보에 없는 당첨자 (이론상 없음) — 그냥 다음으로
      cursor.current++;
      spinNext(currentRotation);
      return;
    }

    // 슬라이스 i의 중앙 각도 = (i + 0.5) * sliceAngle (12시 방향이 0도, 시계방향)
    // 포인터는 0도에 고정 → 휠을 -중앙각만큼 돌리면 그 슬라이스가 포인터에 옴
    const targetAngleAt = -(idx + 0.5) * sliceAngle;
    // 매번 4~6 바퀴 추가 회전 (드라마틱)
    const fullSpins = 360 * (4 + Math.floor(Math.random() * 3));
    // currentRotation에서 targetAngleAt(mod 360)로 자연스럽게 가도록
    const currentMod = ((currentRotation % 360) + 360) % 360;
    const targetMod = ((targetAngleAt % 360) + 360) % 360;
    let delta = targetMod - currentMod;
    if (delta >= 0) delta -= 360; // 항상 음의 방향(시계 반대)으로 회전
    const newRotation = currentRotation - fullSpins + delta;
    setRotation(newRotation);

    timerRef.current = setTimeout(() => {
      setRevealed((prev) => [...prev, idx]);
      cursor.current++;
      if (cursor.current < winners.length) {
        setPhase('between');
        timerRef.current = setTimeout(() => {
          setPhase('spinning');
          spinNext(newRotation);
        }, 900);
      } else {
        setPhase('done');
        onComplete && onComplete();
      }
    }, 4200); // CSS transition 시간과 일치
  };

  return (
    <div style={{ position: 'relative', width: SIZE, height: SIZE, margin: '0 auto' }}>
      {/* 포인터 (12시 방향, 휠 위에 떠있음) */}
      <div
        style={{
          position: 'absolute',
          top: -2,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 0,
          height: 0,
          borderLeft: '14px solid transparent',
          borderRight: '14px solid transparent',
          borderTop: '24px solid #DC2626',
          filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.4))',
          zIndex: 5,
        }}
      />
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        width={SIZE}
        height={SIZE}
        style={{
          transform: `rotate(${rotation}deg)`,
          transition: phase === 'spinning' ? 'transform 4.2s cubic-bezier(0.17, 0.67, 0.21, 1)' : 'none',
        }}
      >
        {candidates.map((c, i) => {
          const startDeg = i * sliceAngle;
          const endDeg = (i + 1) * sliceAngle;
          const midDeg = startDeg + sliceAngle / 2;
          const [tx, ty] = polar(CENTER, CENTER, RADIUS * 0.65, midDeg);
          const isWinner = revealed.includes(i);
          return (
            <g key={c.코드}>
              <path
                d={arcPath(startDeg, endDeg)}
                fill={isWinner ? '#FBBF24' : PALETTE[i % PALETTE.length]}
                stroke="#fff"
                strokeWidth={1}
                opacity={isWinner ? 1 : 0.92}
              />
              <text
                x={tx}
                y={ty}
                fill={isWinner ? '#1A1A2E' : '#fff'}
                fontSize={candidates.length > 30 ? 9 : candidates.length > 16 ? 11 : 13}
                fontWeight={isWinner ? 900 : 700}
                textAnchor="middle"
                dominantBaseline="middle"
                transform={`rotate(${midDeg} ${tx} ${ty})`}
                style={{ pointerEvents: 'none', userSelect: 'none' }}
              >
                {c.이름}
              </text>
            </g>
          );
        })}
        <circle cx={CENTER} cy={CENTER} r={28} fill="#1A1A2E" stroke="#FFB900" strokeWidth={3} />
        <text
          x={CENTER}
          y={CENTER}
          fill="#FFB900"
          fontSize={12}
          fontWeight={900}
          textAnchor="middle"
          dominantBaseline="middle"
          style={{ userSelect: 'none' }}
        >
          KB
        </text>
      </svg>
      {/* 진행 상태 표시 */}
      <div
        style={{
          textAlign: 'center',
          marginTop: 12,
          fontSize: 14,
          color: '#475569',
          fontWeight: 600,
        }}
      >
        {phase === 'spinning' && `${revealed.length + 1} / ${winners.length} 추첨 중…`}
        {phase === 'between' && `🎉 ${winners[revealed.length - 1]?.이름} 당첨!`}
        {phase === 'done' && `✅ 추첨 완료 (${winners.length}명)`}
      </div>
    </div>
  );
}
