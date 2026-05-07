import { useCallback, useEffect, useRef, useState } from 'react';
import { loadFromFiles } from './lib/excelLoader.js';
import { fetchSheetsMeta, inspectAllSchemas, loadFromSheets } from './lib/sheetsLoader.js';
import { saveOverrides } from './lib/sheetsSchema.js';
import SchemaConfirmModal from './SchemaConfirmModal.jsx';
import RaffleModal from './RaffleModal.jsx';

const KB_YELLOW = '#FFB900',
  KB_DARK = '#1A1A2E';
const ACCOUNTS = [
  { id: 'admin', pw: 'admin1234', role: 'admin' },
  { id: 'tc2025', pw: 'tc!1234', role: 'user' },
];
const BC = {
  세종TC지점: '#E65C00',
  대전TC1지점: '#0077B6',
  유성TC지점: '#C0392B',
  대전TC2지점: '#2D9B4E',
  둔산TC지점: '#7B2FBE',
};
const GS = {
  플래티넘: { bg: '#E8E8FF', color: '#312E81', border: '#6366F1' },
  골드: { bg: '#FFFBEB', color: '#78350F', border: '#F59E0B' },
  실버: { bg: '#F1F5F9', color: '#334151', border: '#94A3B8' },
  브론즈: { bg: '#FEF3C7', color: '#78350F', border: '#D97706' },
  일반: { bg: '#F9FAFB', color: '#6B7280', border: '#D1D5DB' },
};
const TABS = ['실적현황', '활동현황', 'DB현황', '시상'];

const rc = (r) => (r >= 90 ? '#16A34A' : r >= 70 ? '#D97706' : '#DC2626');
const rb = (r) => (r >= 90 ? '#DCFCE7' : r >= 70 ? '#FEF3C7' : '#FEE2E2');
const rt = (r) => (r >= 90 ? '#14532D' : r >= 70 ? '#78350F' : '#7F1D1D');
const sg = (a, k) => a.reduce((s, e) => s + (e[k] || 0), 0);
const av = (a, k) => (a.length ? Math.round(sg(a, k) / a.length) : 0);
const ct = (a, f) => a.filter(f).length;

const KBMark = ({ size = 32 }) => (
  <svg width={size} height={size} viewBox="0 0 40 40">
    <rect width="40" height="40" rx="8" fill={KB_YELLOW} />
    <text
      x="20"
      y="27"
      textAnchor="middle"
      fontSize="18"
      fontWeight="900"
      fill={KB_DARK}
      fontFamily="Arial Black,Arial"
    >
      KB
    </text>
  </svg>
);
const Avatar = ({ name, color, size = 50 }) => (
  <div
    style={{
      width: size,
      height: size,
      borderRadius: '50%',
      background: `${color}18`,
      border: `2.5px solid ${color}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: size * 0.38,
      fontWeight: 900,
      color,
      flexShrink: 0,
    }}
  >
    {name?.[0]}
  </div>
);
const Bar = ({ rate, color }) => (
  <div style={{ background: '#E5E7EB', borderRadius: 4, height: 7, overflow: 'hidden' }}>
    <div
      style={{
        width: `${Math.min(rate, 100)}%`,
        background: color,
        height: 7,
        borderRadius: 4,
      }}
    />
  </div>
);
const MS = ({ label, value, color }) => (
  <div
    style={{
      background: '#F8FAFC',
      borderRadius: 8,
      padding: '8px 10px',
      textAlign: 'center',
      border: '1px solid #E5E7EB',
    }}
  >
    <div style={{ fontSize: 10, color: '#94A3B8', fontWeight: 700, marginBottom: 3 }}>{label}</div>
    <div style={{ fontSize: 15, fontWeight: 900, color: color || KB_DARK }}>{value}</div>
  </div>
);
const ST = ({ icon, title }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
    <div style={{ width: 4, height: 18, background: KB_YELLOW, borderRadius: 2 }} />
    <span style={{ fontWeight: 900, fontSize: 14, color: KB_DARK }}>
      {icon} {title}
    </span>
  </div>
);
const DBT = ({ title, color, rows }) => (
  <div
    style={{
      background: '#F8FAFC',
      borderRadius: 10,
      border: `1.5px solid ${color}33`,
      overflow: 'hidden',
      marginBottom: 10,
    }}
  >
    <div style={{ background: color, padding: '7px 14px' }}>
      <span style={{ color: '#fff', fontSize: 12, fontWeight: 900 }}>{title}</span>
    </div>
    <div
      style={{
        padding: '10px 12px',
        display: 'grid',
        gridTemplateColumns: `repeat(${rows[0].length},1fr)`,
        gap: 6,
      }}
    >
      {rows[0].map((h, i) => (
        <div
          key={i}
          style={{ fontSize: 10, color: '#94A3B8', fontWeight: 700, textAlign: 'center' }}
        >
          {h}
        </div>
      ))}
      {rows[1].map((v, i) => (
        <div
          key={i}
          style={{
            fontSize: 13,
            fontWeight: 900,
            color: KB_DARK,
            textAlign: 'center',
            marginTop: 2,
          }}
        >
          {v}
        </div>
      ))}
    </div>
  </div>
);
const AB = ({ label, ok, detail }) => (
  <div
    style={{
      borderRadius: 8,
      padding: '9px 8px',
      border: `1.5px solid ${ok ? '#86EFAC' : '#E5E7EB'}`,
      background: ok ? '#F0FDF4' : '#FAFAFA',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 3,
      textAlign: 'center',
    }}
  >
    <div style={{ fontSize: 16 }}>{ok ? '🏆' : '—'}</div>
    <div style={{ fontSize: 10, fontWeight: 900, color: ok ? '#15803D' : '#94A3B8', lineHeight: 1.3 }}>
      {label}
    </div>
    {ok && detail && <div style={{ fontSize: 10, color: '#16A34A', fontWeight: 700 }}>{detail}</div>}
  </div>
);
const WB = ({ week, amount }) => (
  <div
    style={{
      borderRadius: 8,
      padding: '8px 6px',
      border: `1.5px solid ${amount ? '#FCD34D' : '#E5E7EB'}`,
      background: amount ? '#FFFBEB' : '#FAFAFA',
      textAlign: 'center',
    }}
  >
    <div style={{ fontSize: 10, fontWeight: 900, color: '#92400E' }}>{week}주차</div>
    <div
      style={{
        fontSize: 11,
        fontWeight: 900,
        color: amount ? KB_DARK : '#CBD5E1',
        marginTop: 3,
      }}
    >
      {amount ? Math.round(amount / 10000) + '만' : '미해당'}
    </div>
  </div>
);

const Dot = ({ ok }) => (
  <span
    style={{
      display: 'inline-block',
      width: 11,
      height: 11,
      borderRadius: '50%',
      background: ok ? '#16A34A' : '#EF4444',
    }}
  />
);
const SC = ({ n, t }) => {
  const c = n === t ? '#16A34A' : n === 0 ? '#EF4444' : '#D97706';
  return (
    <span style={{ fontWeight: 900, fontSize: 12, color: c }}>
      {n}/{t}
    </span>
  );
};

const TeamView = ({ data, onSel }) => {
  const g = {};
  data.forEach((e) => {
    if (!g[e.지점]) g[e.지점] = {};
    if (!g[e.지점][e.팀]) g[e.지점][e.팀] = [];
    g[e.지점][e.팀].push(e);
  });
  const COLS = [
    {
      h: '이름',
      w: 80,
      r: (e) => (
        <div style={{ cursor: 'pointer' }} onClick={() => onSel(e)}>
          <div style={{ fontWeight: 900, fontSize: 12, color: KB_DARK }}>{e.이름}</div>
          <div style={{ fontSize: 10, color: '#94A3B8' }}>{e.직책}</div>
        </div>
      ),
      f: () => <span style={{ fontWeight: 900, fontSize: 12 }}>팀합계</span>,
    },
    {
      h: '차월',
      w: 42,
      r: (e) => <span style={{ fontSize: 12, color: '#64748b' }}>{e.차월}개월</span>,
      f: () => null,
    },
    {
      h: '수정P',
      w: 64,
      r: (e) => (
        <span style={{ fontWeight: 900, fontSize: 12 }}>{(e.수정P || 0).toLocaleString()}</span>
      ),
      f: (m) => <span style={{ fontWeight: 900 }}>{sg(m, '수정P').toLocaleString()}</span>,
    },
    {
      h: '인달성율',
      w: 56,
      r: (e) => (
        <span style={{ fontWeight: 900, fontSize: 13, color: rc(e.인달성율) }}>{e.인달성율}%</span>
      ),
      f: (m) => (
        <span style={{ fontWeight: 900, color: rc(av(m, '인달성율')) }}>{av(m, '인달성율')}%</span>
      ),
    },
    {
      h: '출근율',
      w: 48,
      r: (e) => <span style={{ fontWeight: 900, fontSize: 12, color: rc(e.출근율) }}>{e.출근율}%</span>,
      f: (m) => (
        <span style={{ fontWeight: 900, color: rc(av(m, '출근율')) }}>{av(m, '출근율')}%</span>
      ),
    },
    {
      h: 'TC활동',
      w: 48,
      r: (e) => <Dot ok={e.활동달성 === '달성'} />,
      f: (m) => <SC n={ct(m, (e) => e.활동달성 === '달성')} t={m.length} />,
    },
    {
      h: '스컨',
      w: 56,
      r: (e) => (
        <span
          style={{
            fontSize: 11,
            fontWeight: 900,
            color: (GS[e.스컨등급] || {}).color || '#94A3B8',
          }}
        >
          {e.스컨등급}
        </span>
      ),
      f: (m) => <SC n={ct(m, (e) => e.스컨달성 === '달성')} t={m.length} />,
    },
    {
      h: '희망똑똑',
      w: 52,
      r: (e) => <Dot ok={e.희망똑똑 === 'Y'} />,
      f: (m) => <SC n={ct(m, (e) => e.희망똑똑 === 'Y')} t={m.length} />,
    },
    {
      h: '가동시상',
      w: 50,
      r: (e) =>
        e.가동시상 ? <span style={{ color: '#F59E0B' }}>★</span> : <span style={{ color: '#D1D5DB' }}>—</span>,
      f: (m) => <SC n={ct(m, (e) => e.가동시상)} t={m.length} />,
    },
    {
      h: '스탠다드',
      w: 52,
      r: (e) =>
        e.스탠다드 ? <span style={{ color: '#F59E0B' }}>★</span> : <span style={{ color: '#D1D5DB' }}>—</span>,
      f: (m) => <SC n={ct(m, (e) => e.스탠다드)} t={m.length} />,
    },
    {
      h: '인청약',
      w: 48,
      r: (e) =>
        e.인청약 > 0 ? (
          <span style={{ fontWeight: 900, color: '#0077B6' }}>{e.인청약}건</span>
        ) : (
          <span style={{ color: '#D1D5DB' }}>—</span>
        ),
      f: (m) => <span style={{ fontWeight: 900, color: '#0077B6' }}>{sg(m, '인청약')}건</span>,
    },
  ];
  return (
    <div style={{ padding: '0 20px 32px' }}>
      {Object.entries(g).map(([branch, teams]) => {
        const bcolor = BC[branch] || KB_DARK;
        const all = Object.values(teams).flat();
        return (
          <div key={branch} style={{ marginBottom: 28 }}>
            <div
              style={{
                background: bcolor,
                borderRadius: '12px 12px 0 0',
                padding: '12px 18px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 8,
              }}
            >
              <span style={{ color: '#fff', fontWeight: 900, fontSize: 16 }}>{branch}</span>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                {[
                  { l: '총원', v: `${all.length}명` },
                  { l: 'TC활동달성', v: `${ct(all, (e) => e.활동달성 === '달성')}/${all.length}` },
                  { l: '스탠다드', v: `${ct(all, (e) => e.스탠다드)}/${all.length}` },
                  { l: '평균 인달성율', v: `${av(all, '인달성율')}%` },
                ].map(({ l, v }) => (
                  <div key={l} style={{ textAlign: 'center' }}>
                    <div
                      style={{
                        fontSize: 10,
                        color: 'rgba(255,255,255,.65)',
                        fontWeight: 700,
                      }}
                    >
                      {l}
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 900, color: '#fff' }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>
            {Object.entries(teams).map(([teamName, members]) => (
              <div key={teamName} style={{ marginBottom: 4 }}>
                <div
                  style={{
                    background: `${bcolor}10`,
                    borderLeft: `4px solid ${bcolor}`,
                    padding: '8px 14px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 6,
                    borderTop: '1px solid #E5E7EB',
                  }}
                >
                  <span style={{ fontWeight: 900, fontSize: 13, color: bcolor }}>
                    ● {teamName} ({members.length}명)
                  </span>
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    {[
                      { l: 'TC활동', v: `${ct(members, (e) => e.활동달성 === '달성')}/${members.length}` },
                      { l: '스탠다드', v: `${ct(members, (e) => e.스탠다드)}/${members.length}`, hi: true },
                      { l: '희망똑똑', v: `${ct(members, (e) => e.희망똑똑 === 'Y')}/${members.length}` },
                    ].map(({ l, v, hi }) => (
                      <div key={l} style={{ fontSize: 12, color: hi ? '#92400E' : '#475569' }}>
                        <span style={{ fontWeight: 700 }}>{l} </span>
                        <span
                          style={{
                            fontWeight: 900,
                            color: hi ? KB_YELLOW : KB_DARK,
                            background: hi ? 'rgba(255,185,0,.15)' : undefined,
                            padding: hi ? '1px 6px' : undefined,
                            borderRadius: hi ? 4 : undefined,
                          }}
                        >
                          {v}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <div
                  style={{
                    overflowX: 'auto',
                    border: '1px solid #E5E7EB',
                    borderTop: 'none',
                    borderRadius: '0 0 8px 8px',
                  }}
                >
                  <table style={{ borderCollapse: 'collapse', minWidth: 720, width: '100%' }}>
                    <thead>
                      <tr style={{ background: KB_DARK }}>
                        {COLS.map((c) => (
                          <th
                            key={c.h}
                            style={{
                              minWidth: c.w,
                              padding: '7px 8px',
                              color: 'rgba(255,255,255,.9)',
                              fontSize: 11,
                              fontWeight: 900,
                              textAlign: 'center',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {c.h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {members.map((emp, i) => (
                        <tr
                          key={emp.id}
                          style={{
                            borderBottom: '1px solid #F1F5F9',
                            background: i % 2 === 0 ? '#fff' : '#FAFCFF',
                          }}
                        >
                          {COLS.map((c) => (
                            <td
                              key={c.h}
                              style={{ padding: '8px', textAlign: 'center', verticalAlign: 'middle' }}
                            >
                              {c.r(emp)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{ background: '#FFFBEB', borderTop: `2px solid ${KB_YELLOW}` }}>
                        {COLS.map((c) => (
                          <td
                            key={c.h}
                            style={{ padding: '7px 8px', textAlign: 'center', verticalAlign: 'middle' }}
                          >
                            {c.f ? c.f(members) : null}
                          </td>
                        ))}
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState(null);
  const [id, setId] = useState('');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [data, setData] = useState([]);
  const [loadState, setLoadState] = useState({ status: 'idle', msg: '' });
  const [branch, setBranch] = useState('전체');
  const [team, setTeam] = useState('전체');
  const [search, setSearch] = useState('');
  const [view, setView] = useState('card');
  const [sel, setSel] = useState(null);
  const [tab, setTab] = useState(0);
  const [toast, setToast] = useState('');
  const [today] = useState(new Date().toLocaleDateString('ko-KR'));
  const [loadedAt, setLoadedAt] = useState(null);
  const [meta, setMeta] = useState(null); // { source, loadedAt } 또는 null
  const [schemaInspection, setSchemaInspection] = useState(null); // 충돌 시 모달용
  const [raffleOpen, setRaffleOpen] = useState(false);
  const fileRef = useRef();

  const reload = useCallback(async () => {
    setLoadState({ status: 'loading', msg: 'Google Sheets에서 데이터 읽는 중…' });
    try {
      const inspection = await inspectAllSchemas();
      if (inspection.issues.length > 0) {
        setSchemaInspection(inspection);
        setLoadState({
          status: 'idle',
          msg: '시트 구조가 변경된 것 같습니다. 매핑 확인이 필요합니다.',
        });
        return;
      }
      const [employees, m] = await Promise.all([loadFromSheets(inspection.schema), fetchSheetsMeta()]);
      setData(employees);
      setMeta(m);
      setLoadedAt(new Date());
      setLoadState({ status: 'ok', msg: `${employees.length}명 로드 완료` });
    } catch (e) {
      setLoadState({
        status: 'error',
        msg: `자동 로드 실패: ${e.message}. 좌측 상단 [엑셀 업로드]로 직접 올려주세요.`,
      });
    }
  }, []);

  const handleSchemaConfirm = useCallback(
    async (overrides) => {
      saveOverrides(overrides);
      setSchemaInspection(null);
      await reload();
    },
    [reload]
  );

  const handleSchemaCancel = useCallback(() => {
    setSchemaInspection(null);
    setLoadState({
      status: 'error',
      msg: '시트 매핑을 확인하지 않아 자동 로드를 중단했습니다. 새로고침으로 재시도하거나 수동 업로드를 사용하세요.',
    });
  }, []);

  // 첫 진입 시 자동 로드
  useEffect(() => {
    if (!user) return;
    if (data.length > 0) return;
    reload();
  }, [user, data.length, reload]);

  const branches = ['전체', ...new Set(data.map((e) => e.지점))];
  const allTeams = [...new Set(data.filter((e) => branch === '전체' || e.지점 === branch).map((e) => e.팀))];
  const teams = ['전체', ...allTeams];
  const filtered = data.filter(
    (e) =>
      (branch === '전체' || e.지점 === branch) &&
      (team === '전체' || e.팀 === team) &&
      (!search || e.이름.includes(search) || String(e.코드).includes(search))
  );

  const login = () => {
    const acc = ACCOUNTS.find((a) => a.id === id && a.pw === pw);
    if (acc) {
      setUser(acc);
      setErr('');
    } else setErr('아이디 또는 비밀번호를 확인해 주세요.');
  };

  const upload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    // 파일명으로 자동 분류
    const map = { roster: null, perf: null, awards: null };
    for (const f of files) {
      const n = f.name;
      if (/명단/.test(n)) map.roster = f;
      else if (/실적|개인별/.test(n)) map.perf = f;
      else if (/시상/.test(n)) map.awards = f;
    }
    setLoadState({ status: 'loading', msg: `엑셀 ${files.length}개 파싱 중…` });
    try {
      const employees = await loadFromFiles(map.roster, map.perf, map.awards);
      setData(employees);
      setMeta(null); // 업로드된 파일은 Google Drive 메타와 무관
      setLoadedAt(new Date());
      setLoadState({ status: 'ok', msg: `${employees.length}명 로드 완료 (수동 업로드)` });
      setToast(`✅ ${files.length}개 파일 로드 완료 (${employees.length}명)`);
      setTimeout(() => setToast(''), 4000);
    } catch (err) {
      setLoadState({ status: 'error', msg: `업로드 실패: ${err.message}` });
    }
    e.target.value = '';
  };

  const openModal = (emp) => {
    setSel(emp);
    setTab(0);
  };

  if (!user)
    return (
      <div
        style={{
          minHeight: '100vh',
          background: KB_DARK,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20,
        }}
      >
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 5, background: KB_YELLOW }} />
        <div
          style={{
            background: '#fff',
            borderRadius: 16,
            padding: '40px 36px',
            width: '100%',
            maxWidth: 380,
            boxShadow: '0 24px 64px rgba(0,0,0,.5)',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              marginBottom: 28,
              gap: 10,
            }}
          >
            <KBMark size={52} />
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontWeight: 900, fontSize: 18, color: KB_DARK }}>KB손해보험</div>
              <div style={{ fontSize: 13, color: '#64748b', marginTop: 2 }}>
                충청TC 사업단 현황 대시보드
              </div>
            </div>
            <div style={{ width: 40, height: 3, background: KB_YELLOW, borderRadius: 2 }} />
          </div>
          {[
            { l: '아이디', v: id, s: setId, t: 'text' },
            { l: '비밀번호', v: pw, s: setPw, t: 'password' },
          ].map(({ l, v, s, t }) => (
            <div key={l} style={{ marginBottom: 14 }}>
              <label
                style={{
                  fontSize: 12,
                  fontWeight: 800,
                  color: '#374151',
                  display: 'block',
                  marginBottom: 6,
                }}
              >
                {l}
              </label>
              <input
                type={t}
                value={v}
                onChange={(e) => s(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && login()}
                placeholder={`${l}을 입력하세요`}
                style={{
                  width: '100%',
                  padding: '11px 14px',
                  border: '1.5px solid #E5E7EB',
                  borderRadius: 8,
                  fontSize: 14,
                  boxSizing: 'border-box',
                  outline: 'none',
                  fontFamily: 'inherit',
                  color: KB_DARK,
                }}
              />
            </div>
          ))}
          {err && <p style={{ color: '#DC2626', fontSize: 12, textAlign: 'center', marginBottom: 10 }}>{err}</p>}
          <button
            onClick={login}
            style={{
              width: '100%',
              padding: 13,
              background: KB_YELLOW,
              color: KB_DARK,
              border: 'none',
              borderRadius: 8,
              fontSize: 15,
              fontWeight: 900,
              cursor: 'pointer',
              fontFamily: 'inherit',
              marginBottom: 16,
            }}
          >
            로그인
          </button>
          <div
            style={{
              background: '#F8FAFC',
              borderRadius: 8,
              padding: '11px 14px',
              fontSize: 12,
              color: '#64748b',
              lineHeight: 1.9,
            }}
          >
            <strong style={{ color: KB_DARK }}>테스트 계정</strong>
            <br />
            관리자: <code style={{ background: '#E5E7EB', padding: '1px 5px', borderRadius: 3 }}>admin</code>{' '}
            / <code style={{ background: '#E5E7EB', padding: '1px 5px', borderRadius: 3 }}>admin1234</code>
            <br />
            일반:&nbsp;&nbsp;{' '}
            <code style={{ background: '#E5E7EB', padding: '1px 5px', borderRadius: 3 }}>tc2025</code> /{' '}
            <code style={{ background: '#E5E7EB', padding: '1px 5px', borderRadius: 3 }}>tc!1234</code>
          </div>
        </div>
      </div>
    );

  return (
    <div style={{ minHeight: '100vh', background: '#F4F6FA', fontFamily: "'Noto Sans KR',sans-serif" }}>
      {schemaInspection && (
        <SchemaConfirmModal
          inspection={schemaInspection}
          onConfirm={handleSchemaConfirm}
          onCancel={handleSchemaCancel}
        />
      )}
      {raffleOpen && (
        <RaffleModal
          employees={data}
          onClose={() => setRaffleOpen(false)}
        />
      )}
      <div style={{ height: 5, background: KB_YELLOW }} />
      <div
        style={{
          background: KB_DARK,
          padding: '13px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <KBMark size={36} />
          <div>
            <div style={{ color: '#fff', fontWeight: 900, fontSize: 16 }}>KB손해보험 충청TC 사업단</div>
            <div style={{ color: 'rgba(255,255,255,.5)', fontSize: 11, marginTop: 1 }}>
              개인별 현황 대시보드 · {today} 기준 · {data.length}명
              {loadedAt && (
                <>
                  {' · 갱신 '}
                  <span style={{ color: KB_YELLOW, fontWeight: 700 }}>
                    {loadedAt.toLocaleTimeString('ko-KR', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </span>
                </>
              )}
              {meta && meta.files && (() => {
                const mtimes = Object.values(meta.files)
                  .map((f) => f && f.mtime)
                  .filter(Boolean);
                if (!mtimes.length) return null;
                const latest = new Date(mtimes.sort().pop());
                return (
                  <>
                    {' · 원본 '}
                    <span title={meta.dir}>
                      {latest.toLocaleString('ko-KR', {
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={reload}
            disabled={loadState.status === 'loading'}
            style={{
              background: 'rgba(255,255,255,.12)',
              color: '#fff',
              border: '1px solid rgba(255,255,255,.25)',
              borderRadius: 7,
              padding: '7px 14px',
              fontSize: 13,
              cursor: loadState.status === 'loading' ? 'wait' : 'pointer',
              fontWeight: 800,
              fontFamily: 'inherit',
              opacity: loadState.status === 'loading' ? 0.6 : 1,
            }}
          >
            {loadState.status === 'loading' ? '⏳ 로딩…' : '🔄 새로고침'}
          </button>
          {user.role === 'admin' && (
            <>
              <button
                onClick={() => setRaffleOpen(true)}
                disabled={data.length === 0}
                style={{
                  background: data.length === 0 ? 'rgba(255,255,255,.12)' : '#DC2626',
                  color: data.length === 0 ? 'rgba(255,255,255,.5)' : '#fff',
                  border: 'none',
                  borderRadius: 7,
                  padding: '7px 14px',
                  fontSize: 13,
                  cursor: data.length === 0 ? 'not-allowed' : 'pointer',
                  fontWeight: 900,
                  fontFamily: 'inherit',
                }}
              >
                🎁 오늘의 추첨
              </button>
              <button
                onClick={() => fileRef.current.click()}
                style={{
                  background: KB_YELLOW,
                  color: KB_DARK,
                  border: 'none',
                  borderRadius: 7,
                  padding: '7px 14px',
                  fontSize: 13,
                  cursor: 'pointer',
                  fontWeight: 900,
                  fontFamily: 'inherit',
                }}
              >
                📂 엑셀 업로드
              </button>
              <input
                ref={fileRef}
                type="file"
                multiple
                accept=".xlsx,.xls"
                onChange={upload}
                style={{ display: 'none' }}
              />
            </>
          )}
          <span style={{ color: 'rgba(255,255,255,.7)', fontSize: 13 }}>👤 {user.id}</span>
          <button
            onClick={() => setUser(null)}
            style={{
              background: 'transparent',
              color: 'rgba(255,255,255,.7)',
              border: '1px solid rgba(255,255,255,.25)',
              borderRadius: 7,
              padding: '6px 12px',
              fontSize: 12,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            로그아웃
          </button>
        </div>
      </div>
      {toast && (
        <div
          style={{
            background: '#16A34A',
            color: '#fff',
            textAlign: 'center',
            padding: '9px 16px',
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          {toast}
        </div>
      )}

      {loadState.status === 'loading' && (
        <div
          style={{
            background: '#FFFBEB',
            borderBottom: `2px solid ${KB_YELLOW}`,
            padding: '12px 20px',
            fontSize: 13,
            color: '#78350F',
            fontWeight: 700,
            textAlign: 'center',
          }}
        >
          ⏳ {loadState.msg}
        </div>
      )}
      {loadState.status === 'error' && (
        <div
          style={{
            background: '#FEF2F2',
            borderBottom: '2px solid #FCA5A5',
            padding: '12px 20px',
            fontSize: 13,
            color: '#7F1D1D',
            fontWeight: 700,
            textAlign: 'center',
          }}
        >
          ⚠ {loadState.msg}
        </div>
      )}

      {/* KPI */}
      <div
        style={{
          padding: '14px 20px 0',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit,minmax(110px,1fr))',
          gap: 10,
        }}
      >
        {[
          { l: '전체 인원', v: `${data.length}명`, a: KB_YELLOW },
          { l: '지점 수', v: `${new Set(data.map((e) => e.지점)).size}개`, a: '#0077B6' },
          {
            l: '팀 수',
            v: `${new Set(data.filter((e) => e.팀 !== '기타팀').map((e) => e.팀)).size}개`,
            a: '#2D9B4E',
          },
          { l: '세일즈매니저', v: `${ct(data, (e) => e.직책 === '세일즈매니저')}명`, a: '#7C3AED' },
          {
            l: '평균 인달성율',
            v: data.length ? `${av(data, '인달성율')}%` : '—',
            a: '#F59E0B',
          },
          {
            l: 'TC활동 달성',
            v: data.length ? `${ct(data, (e) => e.활동달성 === '달성')}/${data.length}` : '—',
            a: '#16A34A',
          },
          {
            l: '희망똑똑',
            v: data.length ? `${ct(data, (e) => e.희망똑똑 === 'Y')}/${data.length}` : '—',
            a: '#DC2626',
          },
        ].map(({ l, v, a }) => (
          <div
            key={l}
            style={{
              background: '#fff',
              borderRadius: 10,
              padding: '12px 14px',
              borderTop: `3px solid ${a}`,
              boxShadow: '0 1px 6px rgba(0,0,0,.07)',
            }}
          >
            <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 700 }}>{l}</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: KB_DARK, marginTop: 4 }}>{v}</div>
          </div>
        ))}
      </div>

      {/* 필터 + 검색 */}
      <div
        style={{
          padding: '10px 20px',
          display: 'flex',
          gap: 6,
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <div
          style={{
            background: '#fff',
            borderRadius: 8,
            padding: 3,
            display: 'flex',
            gap: 2,
            border: '1px solid #E5E7EB',
            marginRight: 6,
          }}
        >
          {[
            { k: 'card', l: '🗂 카드뷰' },
            { k: 'team', l: '📋 팀별현황' },
          ].map(({ k, l }) => (
            <button
              key={k}
              onClick={() => setView(k)}
              style={{
                padding: '5px 12px',
                borderRadius: 6,
                border: 'none',
                fontSize: 12,
                fontWeight: 900,
                cursor: 'pointer',
                fontFamily: 'inherit',
                background: view === k ? KB_DARK : 'transparent',
                color: view === k ? '#fff' : '#374151',
              }}
            >
              {l}
            </button>
          ))}
        </div>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 이름/코드 검색"
          style={{
            padding: '6px 12px',
            border: '1.5px solid #E5E7EB',
            borderRadius: 8,
            fontSize: 12,
            fontFamily: 'inherit',
            outline: 'none',
            width: 140,
          }}
        />
        <span style={{ fontSize: 12, fontWeight: 800, color: '#64748b' }}>지점</span>
        {branches.map((b) => (
          <button
            key={b}
            onClick={() => {
              setBranch(b);
              setTeam('전체');
            }}
            style={{
              padding: '5px 10px',
              borderRadius: 5,
              border: branch === b ? `2px solid ${KB_YELLOW}` : '1.5px solid #E5E7EB',
              fontSize: 11,
              fontWeight: 800,
              cursor: 'pointer',
              fontFamily: 'inherit',
              background: branch === b ? KB_YELLOW : '#fff',
              color: branch === b ? KB_DARK : '#374151',
            }}
          >
            {b}
          </button>
        ))}
        <span style={{ fontSize: 12, fontWeight: 800, color: '#64748b' }}>팀</span>
        {teams.map((t) => (
          <button
            key={t}
            onClick={() => setTeam(t)}
            style={{
              padding: '5px 10px',
              borderRadius: 5,
              border: team === t ? `2px solid ${KB_DARK}` : '1.5px solid #E5E7EB',
              fontSize: 11,
              fontWeight: 800,
              cursor: 'pointer',
              fontFamily: 'inherit',
              background: team === t ? KB_DARK : '#fff',
              color: team === t ? '#fff' : '#374151',
            }}
          >
            {t}
          </button>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: 12, color: '#64748b' }}>
          <strong style={{ color: KB_DARK }}>{filtered.length}</strong>명
        </span>
      </div>

      {view === 'team' && <TeamView data={filtered} onSel={(e) => openModal(e)} />}

      {view === 'card' && (
        <div
          style={{
            padding: '0 20px 32px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))',
            gap: 12,
          }}
        >
          {filtered.map((emp) => {
            const c = BC[emp.지점] || KB_DARK;
            return (
              <div
                key={emp.id}
                onClick={() => openModal(emp)}
                style={{
                  background: '#fff',
                  borderRadius: 12,
                  overflow: 'hidden',
                  boxShadow: '0 2px 10px rgba(0,0,0,.07)',
                  cursor: 'pointer',
                  transition: 'transform .18s',
                  borderTop: `4px solid ${c}`,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-3px)';
                  e.currentTarget.style.boxShadow = '0 10px 24px rgba(0,0,0,.13)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,.07)';
                }}
              >
                <div
                  style={{
                    padding: '8px 12px',
                    background: '#FAFAFA',
                    borderBottom: '1px solid #F1F5F9',
                    display: 'flex',
                    justifyContent: 'space-between',
                  }}
                >
                  <span style={{ fontSize: 11, fontWeight: 900, color: c }}>{emp.지점}</span>
                  <span style={{ fontSize: 11, color: '#94A3B8' }}>
                    {emp.팀} · {emp.직책}
                  </span>
                </div>
                <div style={{ padding: 12 }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10 }}>
                    <Avatar name={emp.이름} color={c} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 900, fontSize: 16, color: KB_DARK }}>{emp.이름}</div>
                      <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 1 }}>
                        {emp.코드} · {emp.차월}개월
                      </div>
                    </div>
                    <div
                      style={{
                        background: rb(emp.인달성율),
                        color: rt(emp.인달성율),
                        borderRadius: 5,
                        padding: '3px 8px',
                        fontSize: 11,
                        fontWeight: 900,
                      }}
                    >
                      {emp.인달성율}%
                    </div>
                  </div>
                  <div
                    style={{
                      background: '#FFFBEB',
                      borderRadius: 7,
                      border: `1px solid ${KB_YELLOW}44`,
                      padding: '6px 10px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginBottom: 8,
                    }}
                  >
                    <span style={{ fontSize: 11, fontWeight: 800, color: '#92400E' }}>수정P</span>
                    <span style={{ fontSize: 18, fontWeight: 900, color: KB_DARK }}>
                      {(emp.수정P || 0).toLocaleString()}
                    </span>
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: 10,
                        color: '#94A3B8',
                        marginBottom: 3,
                      }}
                    >
                      <span>
                        인보험 {emp.인실적}/{emp.인목표}
                      </span>
                      <span>청약 {emp.인청약}건</span>
                    </div>
                    <Bar rate={emp.인달성율} color={rc(emp.인달성율)} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 4 }}>
                    {[
                      { l: '출근율', v: `${emp.출근율}%` },
                      { l: '희망똑똑', v: emp.희망똑똑, tag: true, ok: emp.희망똑똑 === 'Y' },
                      {
                        l: 'TC활동',
                        v: emp.활동달성 === '달성' ? '달성' : '미달성',
                        tag: true,
                        ok: emp.활동달성 === '달성',
                      },
                      {
                        l: '스컨',
                        v: emp.스컨달성 === '달성' ? '달성' : '미달성',
                        tag: true,
                        ok: emp.스컨달성 === '달성',
                      },
                    ].map(({ l, v, tag, ok }) => (
                      <div
                        key={l}
                        style={{
                          background: '#F8FAFC',
                          borderRadius: 6,
                          padding: '5px 3px',
                          textAlign: 'center',
                        }}
                      >
                        <div style={{ fontSize: 9, color: '#94A3B8', fontWeight: 700 }}>{l}</div>
                        <div
                          style={{
                            fontSize: 10,
                            fontWeight: 900,
                            marginTop: 1,
                            color: tag ? (ok ? '#16A34A' : '#DC2626') : KB_DARK,
                          }}
                        >
                          {v}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && loadState.status !== 'loading' && (
            <div
              style={{
                gridColumn: '1/-1',
                background: '#fff',
                borderRadius: 12,
                padding: 40,
                textAlign: 'center',
                color: '#94A3B8',
                fontSize: 14,
              }}
            >
              표시할 데이터가 없습니다. 좌측 상단 [엑셀 업로드]로 파일을 올려주세요.
            </div>
          )}
        </div>
      )}

      {sel &&
        (() => {
          const c = BC[sel.지점] || KB_DARK;
          const gs = GS[sel.스컨등급] || GS['일반'];
          return (
            <div
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,.55)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 999,
                padding: 16,
              }}
              onClick={() => setSel(null)}
            >
              <div
                style={{
                  background: '#fff',
                  borderRadius: 16,
                  width: '100%',
                  maxWidth: 580,
                  maxHeight: '92vh',
                  overflowY: 'auto',
                  boxShadow: '0 24px 64px rgba(0,0,0,.4)',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div
                  style={{
                    background: KB_DARK,
                    padding: '18px 20px',
                    borderRadius: '16px 16px 0 0',
                    borderTop: `5px solid ${KB_YELLOW}`,
                  }}
                >
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <Avatar name={sel.이름} color={KB_YELLOW} size={60} />
                    <div style={{ flex: 1 }}>
                      <div style={{ color: '#fff', fontWeight: 900, fontSize: 20 }}>{sel.이름}</div>
                      <div style={{ color: 'rgba(255,255,255,.7)', fontSize: 12, marginTop: 2 }}>
                        {sel.지점} · {sel.팀} · {sel.직책}
                      </div>
                      <div style={{ color: 'rgba(255,255,255,.5)', fontSize: 11, marginTop: 1 }}>
                        {sel.코드} · {sel.차월}개월차
                      </div>
                    </div>
                    <button
                      onClick={() => setSel(null)}
                      style={{
                        background: 'rgba(255,255,255,.12)',
                        border: 'none',
                        color: 'rgba(255,255,255,.8)',
                        borderRadius: 7,
                        width: 30,
                        height: 30,
                        fontSize: 18,
                        cursor: 'pointer',
                      }}
                    >
                      ×
                    </button>
                  </div>
                  <div style={{ display: 'flex', gap: 4, marginTop: 14, flexWrap: 'wrap' }}>
                    {TABS.map((t, i) => (
                      <button
                        key={t}
                        onClick={() => setTab(i)}
                        style={{
                          padding: '6px 14px',
                          borderRadius: '7px 7px 0 0',
                          border: 'none',
                          fontSize: 13,
                          fontWeight: 900,
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                          background: tab === i ? KB_YELLOW : 'rgba(255,255,255,.12)',
                          color: tab === i ? KB_DARK : 'rgba(255,255,255,.7)',
                        }}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{ padding: 20 }}>
                  {tab === 0 && (
                    <>
                      <ST icon="📊" title="실적 현황" />
                      <div
                        style={{
                          background: '#FFFBEB',
                          border: `2px solid ${KB_YELLOW}`,
                          borderRadius: 12,
                          padding: '12px 16px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: 12,
                        }}
                      >
                        <span style={{ fontSize: 13, fontWeight: 900, color: '#92400E' }}>수정P</span>
                        <span style={{ fontSize: 32, fontWeight: 900, color: KB_DARK }}>
                          {(sel.수정P || 0).toLocaleString()}
                        </span>
                      </div>
                      <div style={{ background: '#F8FAFC', borderRadius: 12, padding: 14, marginBottom: 10 }}>
                        <div style={{ fontSize: 11, fontWeight: 900, color: '#64748b', marginBottom: 8 }}>
                          인보험
                        </div>
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(4,1fr)',
                            gap: 8,
                            marginBottom: 8,
                          }}
                        >
                          {[
                            { l: '목표', v: sel.인목표 },
                            { l: '실적', v: sel.인실적 },
                            { l: '달성율', v: `${sel.인달성율}%`, c: rc(sel.인달성율) },
                            { l: '청약', v: `${sel.인청약}건` },
                          ].map(({ l, v, c }) => (
                            <MS key={l} label={l} value={v} color={c} />
                          ))}
                        </div>
                        <Bar rate={sel.인달성율} color={rc(sel.인달성율)} />
                      </div>
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          gap: 8,
                          marginBottom: 10,
                        }}
                      >
                        {[
                          { l: '재물', v: sel.재물, icon: '🏠' },
                          { l: '자동차', v: sel.자동차, icon: '🚗' },
                          { l: '장기보유고객', v: `${sel.장기}명`, icon: '👥' },
                          { l: '당월가망고객', v: `${sel.가망}명`, icon: '🎯' },
                        ].map(({ l, v, icon }) => (
                          <div
                            key={l}
                            style={{
                              background: '#F8FAFC',
                              borderRadius: 10,
                              padding: '10px 12px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 8,
                              border: '1px solid #E5E7EB',
                            }}
                          >
                            <span style={{ fontSize: 18 }}>{icon}</span>
                            <div>
                              <div style={{ fontSize: 10, color: '#94A3B8', fontWeight: 700 }}>{l}</div>
                              <div style={{ fontSize: 17, fontWeight: 900, color: KB_DARK }}>{v}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div
                        style={{
                          background: '#F8FAFC',
                          borderRadius: 10,
                          padding: '10px 14px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          border: '1px solid #E5E7EB',
                        }}
                      >
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 900, color: KB_DARK }}>TC표준활동</div>
                          <div style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>
                            활동일수 <strong>{sel.활동일}일</strong>
                          </div>
                        </div>
                        <span
                          style={{
                            background: sel.활동달성 === '달성' ? '#DCFCE7' : '#FEE2E2',
                            color: sel.활동달성 === '달성' ? '#14532D' : '#7F1D1D',
                            borderRadius: 5,
                            padding: '5px 12px',
                            fontSize: 13,
                            fontWeight: 900,
                          }}
                        >
                          {sel.활동달성}
                        </span>
                      </div>
                    </>
                  )}
                  {tab === 1 && (
                    <>
                      <ST icon="📋" title="활동 현황" />
                      <div
                        style={{
                          background: '#F8FAFC',
                          borderRadius: 12,
                          padding: 14,
                          border: '1px solid #E5E7EB',
                          marginBottom: 10,
                        }}
                      >
                        <div style={{ fontSize: 11, fontWeight: 900, color: '#64748b', marginBottom: 8 }}>
                          출근
                        </div>
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr',
                            gap: 8,
                            marginBottom: 8,
                          }}
                        >
                          <MS label="출근일수" value={`${sel.출근일}일`} />
                          <MS label="출근율" value={`${sel.출근율}%`} color={rc(sel.출근율)} />
                        </div>
                        <Bar rate={sel.출근율} color={rc(sel.출근율)} />
                      </div>
                      <div
                        style={{
                          background: gs.bg,
                          borderRadius: 12,
                          padding: 14,
                          border: `1.5px solid ${gs.border}`,
                          marginBottom: 10,
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: 10,
                          }}
                        >
                          <div style={{ fontSize: 12, fontWeight: 900, color: gs.color }}>
                            스마트컨설턴트
                          </div>
                          <span
                            style={{
                              background: gs.border,
                              color: '#fff',
                              borderRadius: 5,
                              padding: '3px 10px',
                              fontSize: 12,
                              fontWeight: 900,
                            }}
                          >
                            {sel.스컨등급}
                          </span>
                        </div>
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(3,1fr)',
                            gap: 8,
                          }}
                        >
                          <MS label="수정P" value={(sel.스컨수정P || 0).toLocaleString()} color={gs.color} />
                          <MS label="포인트" value={(sel.스컨포인트 || 0).toLocaleString()} color={gs.color} />
                          <MS
                            label="달성"
                            value={sel.스컨달성}
                            color={sel.스컨달성 === '달성' ? '#16A34A' : '#DC2626'}
                          />
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        <div
                          style={{
                            background: '#F8FAFC',
                            borderRadius: 12,
                            padding: 14,
                            border: '1px solid #E5E7EB',
                            textAlign: 'center',
                          }}
                        >
                          <div style={{ fontSize: 11, fontWeight: 900, color: '#64748b', marginBottom: 6 }}>
                            보장분석
                          </div>
                          <div style={{ fontSize: 28, fontWeight: 900, color: KB_DARK }}>
                            {sel.보장분석}
                            <span style={{ fontSize: 13, color: '#94A3B8' }}> 건</span>
                          </div>
                        </div>
                        <div
                          style={{
                            background: sel.희망똑똑 === 'Y' ? '#F0FDF4' : '#FEF2F2',
                            borderRadius: 12,
                            padding: 14,
                            border: `1.5px solid ${sel.희망똑똑 === 'Y' ? '#86EFAC' : '#FCA5A5'}`,
                            textAlign: 'center',
                          }}
                        >
                          <div style={{ fontSize: 11, fontWeight: 900, color: '#64748b', marginBottom: 6 }}>
                            희망똑똑
                          </div>
                          <div
                            style={{
                              fontSize: 28,
                              fontWeight: 900,
                              color: sel.희망똑똑 === 'Y' ? '#16A34A' : '#DC2626',
                            }}
                          >
                            {sel.희망똑똑 === 'Y' ? '✓' : '✗'}
                          </div>
                          <div
                            style={{
                              fontSize: 11,
                              fontWeight: 800,
                              color: sel.희망똑똑 === 'Y' ? '#16A34A' : '#DC2626',
                            }}
                          >
                            {sel.희망똑똑 === 'Y' ? '터치완료' : '미터치'}
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                  {tab === 2 && (
                    <>
                      <ST icon="🗄️" title="DB 활용 현황" />
                      <DBT
                        title="관심고객 DB"
                        color="#0077B6"
                        rows={[
                          ['배정', '활용', '활용율', '등록', '등록율', '체결', '체결율'],
                          [
                            sel.관심배정,
                            sel.관심활용,
                            `${sel.관심활용율}%`,
                            sel.관심등록,
                            `${sel.관심등록율}%`,
                            sel.관심체결,
                            `${sel.관심체결율}%`,
                          ],
                        ]}
                      />
                      <DBT
                        title="우량 DB"
                        color="#2D9B4E"
                        rows={[
                          ['배정', '활용', '활용율', '등록', '등록율', '방문', '체결', '체결율'],
                          [
                            sel.우량배정,
                            sel.우량활용,
                            `${sel.우량활용율}%`,
                            sel.우량등록,
                            `${sel.우량등록율}%`,
                            sel.우량방문,
                            sel.우량체결,
                            `${sel.우량체결율}%`,
                          ],
                        ]}
                      />
                      <DBT
                        title="캠페인 DB"
                        color="#7B2FBE"
                        rows={[
                          ['배정', '활용', '등록건수', '등록율'],
                          [sel.캠배정, sel.캠활용, sel.캠등록, `${sel.캠등록율}%`],
                        ]}
                      />
                      <div
                        style={{
                          background: '#F8FAFC',
                          borderRadius: 10,
                          padding: 12,
                          border: '1px solid #E5E7EB',
                        }}
                      >
                        <div style={{ fontSize: 11, fontWeight: 900, color: '#64748b', marginBottom: 8 }}>
                          전체 요약
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
                          <MS label="총 배정" value={`${sel.관심배정 + sel.우량배정 + sel.캠배정}건`} />
                          <MS label="총 활용" value={`${sel.관심활용 + sel.우량활용 + sel.캠활용}건`} />
                          <MS label="총 체결" value={`${sel.관심체결 + sel.우량체결}건`} />
                        </div>
                      </div>
                    </>
                  )}
                  {tab === 3 && (
                    <>
                      <ST icon="🏆" title="매출 시상" />
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ fontSize: 11, fontWeight: 900, color: '#64748b', marginBottom: 6 }}>
                          개인매출시상 (주차별)
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6 }}>
                          <WB week={1} amount={sel.주1} />
                          <WB week={2} amount={sel.주2} />
                          <WB week={3} amount={sel.주3} />
                          <WB week={4} amount={sel.주4} />
                        </div>
                      </div>
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ fontSize: 11, fontWeight: 900, color: '#64748b', marginBottom: 6 }}>
                          활동시상
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
                          <AB label="가동시상" ok={sel.가동시상} />
                          <AB label="스컨시상" ok={sel.스컨시상} />
                          <AB label="스탠다드시상" ok={sel.스탠다드} />
                        </div>
                      </div>
                      <div style={{ marginBottom: 16 }}>
                        <div style={{ fontSize: 11, fontWeight: 900, color: '#64748b', marginBottom: 6 }}>
                          팀시상·지점대항
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
                          <AB label="BEST팀" ok={sel.BEST팀} />
                          <AB label="최우수가동" ok={sel.최우수가동} />
                          <AB label="최우수스컨" ok={sel.최우수스컨} />
                          <AB label="아침맞이" ok={sel.아침맞이} />
                        </div>
                      </div>
                      <div style={{ width: '100%', height: 1, background: '#F1F5F9', marginBottom: 14 }} />
                      <ST icon="🌟" title="조직 시상" />
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(4,1fr)',
                          gap: 8,
                          marginBottom: 16,
                        }}
                      >
                        <AB label="개인위촉" ok={sel.개인위촉 > 0} detail={sel.개인위촉 > 0 ? `${sel.개인위촉}건` : null} />
                        <AB label="정착우수유치자" ok={sel.정착우수} />
                        <AB label="Early위촉" ok={sel.Early위촉} />
                        <AB label="위촉팀순위" ok={!!sel.위촉팀순위} detail={sel.위촉팀순위 ? `${sel.위촉팀순위}위` : null} />
                      </div>
                      <div style={{ width: '100%', height: 1, background: '#F1F5F9', marginBottom: 14 }} />
                      <ST icon="💎" title="DB 시상" />
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
                        <AB label="신인TC DB활성화" ok={sel.신인TC_DB} />
                        <AB label="생애최초첫DB체결" ok={sel.생애최초} />
                        <AB
                          label="DB Queen"
                          ok={sel.DB_Queen}
                          detail={sel.DB_Queen순위 ? `${sel.DB_Queen순위}위` : null}
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })()}

      <div
        style={{
          borderTop: '1px solid #E5E7EB',
          padding: '10px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#fff',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <KBMark size={18} />
          <span style={{ fontSize: 11, color: '#94A3B8' }}>
            KB손해보험 충청TC 사업단 · 충청TC사업단(D000906) · 총 {data.length}명
          </span>
        </div>
        <span style={{ fontSize: 11, color: '#CBD5E1' }}>{today}</span>
      </div>
    </div>
  );
}
