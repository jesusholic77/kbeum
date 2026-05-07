// 추첨 게임 모달 — 후보 선택 → 인원 입력 → 룰렛 스핀 → 결과 저장의 4단계 흐름.

import { useMemo, useState } from 'react';
import { exportCsv, loadHistory, pickWinners, saveRecord } from './lib/raffleStore.js';
import RouletteWheel from './RouletteWheel.jsx';

const overlayStyle = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 16,
};
const cardStyle = {
  background: '#fff', borderRadius: 14, padding: 24,
  width: '100%', maxWidth: 980, maxHeight: '92vh', overflowY: 'auto',
  boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
};
const headerStyle = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  marginBottom: 16, paddingBottom: 12, borderBottom: '2px solid #f1f5f9',
};
const titleStyle = { fontSize: 22, fontWeight: 900, color: '#1A1A2E' };
const closeBtn = {
  background: '#f1f5f9', border: 0, borderRadius: 8, padding: '6px 12px',
  fontSize: 14, cursor: 'pointer', fontWeight: 700,
};
const primaryBtn = {
  background: '#1A1A2E', color: '#FFB900', border: 0, borderRadius: 8,
  padding: '10px 20px', fontWeight: 800, cursor: 'pointer', fontSize: 14,
};
const secondaryBtn = {
  background: '#e2e8f0', color: '#1A1A2E', border: 0, borderRadius: 8,
  padding: '10px 16px', fontWeight: 700, cursor: 'pointer', fontSize: 14,
};
const tabBtn = (active) => ({
  flex: 1, padding: '10px', border: 0, borderRadius: 8, fontSize: 14, cursor: 'pointer',
  fontWeight: 800, background: active ? '#1A1A2E' : '#f1f5f9', color: active ? '#FFB900' : '#475569',
});

export default function RaffleModal({ employees, onClose }) {
  const [tab, setTab] = useState('new'); // 'new' | 'history'
  const [phase, setPhase] = useState('select'); // select | count | spin | done
  const [picked, setPicked] = useState(new Set()); // candidate codes
  const [winnerCount, setWinnerCount] = useState(1);
  const [winners, setWinners] = useState([]);
  const [prize, setPrize] = useState('');
  const [spinKey, setSpinKey] = useState(0); // 다시 뽑기용 remount 키

  // 후보 선택 화면 필터
  const [search, setSearch] = useState('');
  const [branchFilter, setBranchFilter] = useState('전체');
  const [teamFilter, setTeamFilter] = useState('전체');

  const branches = useMemo(
    () => ['전체', ...Array.from(new Set(employees.map((e) => e.지점).filter(Boolean)))],
    [employees]
  );
  const teams = useMemo(() => {
    const filtered = branchFilter === '전체' ? employees : employees.filter((e) => e.지점 === branchFilter);
    return ['전체', ...Array.from(new Set(filtered.map((e) => e.팀).filter(Boolean)))];
  }, [employees, branchFilter]);

  const visible = useMemo(() => {
    return employees.filter(
      (e) =>
        (branchFilter === '전체' || e.지점 === branchFilter) &&
        (teamFilter === '전체' || e.팀 === teamFilter) &&
        (!search || e.이름.includes(search) || String(e.코드).includes(search))
    );
  }, [employees, branchFilter, teamFilter, search]);

  const togglePick = (code) => {
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code); else next.add(code);
      return next;
    });
  };
  const pickAllVisible = () => {
    setPicked((prev) => {
      const next = new Set(prev);
      visible.forEach((e) => next.add(e.코드));
      return next;
    });
  };
  const clearAll = () => setPicked(new Set());

  const candidates = employees.filter((e) => picked.has(e.코드));

  const startSpin = () => {
    if (candidates.length === 0) return;
    const n = Math.min(Math.max(1, Number(winnerCount) || 1), candidates.length);
    setWinners(pickWinners(candidates, n));
    setSpinKey((k) => k + 1);
    setPhase('spin');
  };
  const respin = () => {
    const n = winners.length;
    setWinners(pickWinners(candidates, n));
    setSpinKey((k) => k + 1);
    setPhase('spin');
  };
  const confirmSave = () => {
    saveRecord({
      candidates: candidates.map((e) => ({ 코드: e.코드, 이름: e.이름, 팀: e.팀, 지점: e.지점 })),
      winners: winners.map((w) => ({ 코드: w.코드, 이름: w.이름, 팀: w.팀, 지점: w.지점 })),
      winnerCount: winners.length,
      prize: prize.trim(),
    });
    onClose();
  };

  const downloadCsv = () => {
    const csv = exportCsv();
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `추첨기록_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={overlayStyle} role="dialog" aria-modal="true">
      <div style={cardStyle}>
        <div style={headerStyle}>
          <div style={titleStyle}>🎁 오늘의 추첨</div>
          <button style={closeBtn} onClick={onClose}>닫기</button>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <button style={tabBtn(tab === 'new')} onClick={() => setTab('new')}>새 추첨</button>
          <button style={tabBtn(tab === 'history')} onClick={() => setTab('history')}>추첨 기록</button>
        </div>

        {tab === 'new' && phase === 'select' && (
          <SelectStep
            visible={visible}
            picked={picked}
            togglePick={togglePick}
            pickAllVisible={pickAllVisible}
            clearAll={clearAll}
            candidates={candidates}
            search={search} setSearch={setSearch}
            branches={branches} branchFilter={branchFilter} setBranchFilter={setBranchFilter}
            teams={teams} teamFilter={teamFilter} setTeamFilter={setTeamFilter}
            onNext={() => setPhase('count')}
          />
        )}
        {tab === 'new' && phase === 'count' && (
          <CountStep
            candidates={candidates}
            winnerCount={winnerCount}
            setWinnerCount={setWinnerCount}
            onBack={() => setPhase('select')}
            onStart={startSpin}
          />
        )}
        {tab === 'new' && phase === 'spin' && (
          <SpinStep
            key={spinKey}
            candidates={candidates}
            winners={winners}
            onComplete={() => setPhase('done')}
          />
        )}
        {tab === 'new' && phase === 'done' && (
          <DoneStep
            winners={winners}
            prize={prize}
            setPrize={setPrize}
            onRespin={respin}
            onSave={confirmSave}
            onBack={() => setPhase('count')}
          />
        )}
        {tab === 'history' && <HistoryTab onDownload={downloadCsv} />}
      </div>
    </div>
  );
}

function SelectStep({
  visible, picked, togglePick, pickAllVisible, clearAll, candidates,
  search, setSearch, branches, branchFilter, setBranchFilter,
  teams, teamFilter, setTeamFilter, onNext,
}) {
  return (
    <>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <input
          placeholder="이름·사번 검색"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: 160, padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 14 }}
        />
        <select value={branchFilter} onChange={(e) => { setBranchFilter(e.target.value); setTeamFilter('전체'); }}
          style={{ padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 14 }}>
          {branches.map((b) => <option key={b}>{b}</option>)}
        </select>
        <select value={teamFilter} onChange={(e) => setTeamFilter(e.target.value)}
          style={{ padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 14 }}>
          {teams.map((t) => <option key={t}>{t}</option>)}
        </select>
        <button style={secondaryBtn} onClick={pickAllVisible}>화면 전체 추가</button>
        <button style={secondaryBtn} onClick={clearAll}>전체 해제</button>
      </div>
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 8,
        maxHeight: 360, overflowY: 'auto', padding: 4, border: '1px solid #f1f5f9', borderRadius: 8,
      }}>
        {visible.map((e) => {
          const on = picked.has(e.코드);
          return (
            <button
              key={e.코드}
              onClick={() => togglePick(e.코드)}
              style={{
                background: on ? '#FFF8E1' : '#fff',
                border: on ? '2px solid #FFB900' : '1px solid #e2e8f0',
                borderRadius: 8, padding: '10px 12px', textAlign: 'left',
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              <div style={{ fontWeight: 800, fontSize: 14, color: '#1A1A2E' }}>
                {on ? '✓ ' : ''}{e.이름}
              </div>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                {e.지점} · {e.팀}
              </div>
            </button>
          );
        })}
        {visible.length === 0 && (
          <div style={{ gridColumn: '1 / -1', padding: 24, textAlign: 'center', color: '#94a3b8' }}>
            검색 조건에 맞는 직원이 없습니다.
          </div>
        )}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
        <div style={{ fontSize: 14, color: '#475569', fontWeight: 600 }}>
          후보 <span style={{ color: '#DC2626', fontWeight: 900, fontSize: 16 }}>{candidates.length}</span> 명
        </div>
        <button style={primaryBtn} onClick={onNext} disabled={candidates.length === 0}>
          다음 → 당첨 인원 입력
        </button>
      </div>
    </>
  );
}

function CountStep({ candidates, winnerCount, setWinnerCount, onBack, onStart }) {
  const max = candidates.length;
  return (
    <div style={{ textAlign: 'center', padding: '24px 0' }}>
      <div style={{ fontSize: 14, color: '#64748b', marginBottom: 12 }}>
        후보 <strong style={{ color: '#1A1A2E' }}>{max}</strong>명 중 당첨자 인원을 선택해주세요.
      </div>
      <input
        type="number"
        min={1}
        max={max}
        value={winnerCount}
        onChange={(e) => setWinnerCount(e.target.value)}
        style={{
          width: 160, padding: '14px', fontSize: 28, textAlign: 'center', fontWeight: 900,
          border: '2px solid #1A1A2E', borderRadius: 12, color: '#1A1A2E',
        }}
      />
      <div style={{ marginTop: 6, fontSize: 12, color: '#94a3b8' }}>1 ~ {max} 사이</div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 24 }}>
        <button style={secondaryBtn} onClick={onBack}>← 후보 다시 선택</button>
        <button style={primaryBtn} onClick={onStart}>🎰 추첨 시작!</button>
      </div>
    </div>
  );
}

function SpinStep({ candidates, winners, onComplete }) {
  return (
    <div>
      <RouletteWheel candidates={candidates} winners={winners} onComplete={onComplete} />
    </div>
  );
}

function DoneStep({ winners, prize, setPrize, onRespin, onSave, onBack }) {
  return (
    <div>
      <div style={{ textAlign: 'center', padding: '12px 0 20px' }}>
        <div style={{ fontSize: 28, fontWeight: 900, color: '#DC2626', marginBottom: 8 }}>🎉 축하합니다 🎉</div>
        <div style={{ fontSize: 14, color: '#64748b' }}>당첨자 {winners.length}명</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10, marginBottom: 20 }}>
        {winners.map((w, i) => (
          <div key={w.코드} style={{
            background: 'linear-gradient(135deg, #FFB900, #FFA500)',
            color: '#1A1A2E', padding: 16, borderRadius: 12,
            boxShadow: '0 6px 16px rgba(255, 185, 0, 0.4)',
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, opacity: 0.7 }}>{i + 1}번 당첨</div>
            <div style={{ fontSize: 22, fontWeight: 900, marginTop: 4 }}>{w.이름}</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>{w.지점} · {w.팀}</div>
          </div>
        ))}
      </div>
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#475569', marginBottom: 6 }}>
          🎁 선물 메모 (선택사항)
        </label>
        <input
          value={prize}
          onChange={(e) => setPrize(e.target.value)}
          placeholder="예: 스타벅스 1만원권"
          style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 14, fontFamily: 'inherit' }}
        />
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <button style={secondaryBtn} onClick={onBack}>← 인원 다시 선택</button>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={secondaryBtn} onClick={onRespin}>🔄 다시 뽑기</button>
          <button style={primaryBtn} onClick={onSave}>저장하고 닫기</button>
        </div>
      </div>
    </div>
  );
}

function HistoryTab({ onDownload }) {
  const [history, setHistory] = useState(() => loadHistory());
  const refresh = () => setHistory(loadHistory());

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ fontSize: 14, color: '#64748b', fontWeight: 600 }}>총 {history.length}건</div>
        <button style={secondaryBtn} onClick={onDownload}>📥 CSV 다운로드</button>
      </div>
      {history.length === 0 ? (
        <div style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>아직 추첨 기록이 없습니다.</div>
      ) : (
        <div style={{ maxHeight: 480, overflowY: 'auto' }}>
          {history.map((r) => (
            <div key={r.id} style={{
              border: '1px solid #e2e8f0', borderRadius: 10, padding: 14, marginBottom: 10,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <div style={{ fontSize: 13, color: '#64748b' }}>
                  {new Date(r.date).toLocaleString('ko-KR')}
                </div>
                <div style={{ fontSize: 12, color: '#94a3b8' }}>
                  후보 {r.candidates?.length ?? 0}명 · 당첨 {r.winners?.length ?? 0}명
                </div>
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#1A1A2E', marginBottom: 4 }}>
                🏆 {(r.winners || []).map((w) => `${w.이름}(${w.팀})`).join(', ')}
              </div>
              {r.prize && (
                <div style={{ fontSize: 12, color: '#475569' }}>🎁 {r.prize}</div>
              )}
            </div>
          ))}
        </div>
      )}
      <div style={{ marginTop: 12, textAlign: 'right' }}>
        <button style={secondaryBtn} onClick={refresh}>새로고침</button>
      </div>
    </div>
  );
}
