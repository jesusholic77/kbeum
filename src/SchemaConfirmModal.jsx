// Google Sheets 탭 이름이 기대값과 다를 때 사용자에게 매핑 확인을 받는 모달.

import { useState } from 'react';

const overlayStyle = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.5)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 9999,
  padding: 16,
};

const cardStyle = {
  background: '#fff',
  borderRadius: 12,
  padding: 24,
  maxWidth: 720,
  width: '100%',
  maxHeight: '90vh',
  overflowY: 'auto',
  boxShadow: '0 12px 48px rgba(0,0,0,0.2)',
};

const titleStyle = { fontSize: 20, fontWeight: 700, marginBottom: 6 };
const subtitleStyle = { fontSize: 13, color: '#666', marginBottom: 16, lineHeight: 1.5 };
const labelStyle = { fontSize: 13, color: '#333', fontWeight: 500 };
const expectedStyle = { fontSize: 13, color: '#a00', fontFamily: 'monospace', marginRight: 8 };
const selectStyle = {
  padding: '6px 8px',
  fontSize: 13,
  border: '1px solid #ccc',
  borderRadius: 6,
  background: '#fff',
  minWidth: 180,
};
const issueRowStyle = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 12,
  alignItems: 'center',
  padding: '10px 0',
  borderBottom: '1px solid #eee',
};
const fileGroupTitleStyle = {
  fontSize: 14,
  fontWeight: 600,
  color: '#0070bb',
  marginTop: 16,
  marginBottom: 4,
};
const buttonRowStyle = {
  display: 'flex',
  gap: 8,
  justifyContent: 'flex-end',
  marginTop: 20,
};
const primaryBtn = {
  padding: '8px 16px',
  background: '#0070bb',
  color: '#fff',
  border: 0,
  borderRadius: 6,
  fontWeight: 600,
  cursor: 'pointer',
};
const secondaryBtn = {
  padding: '8px 16px',
  background: '#eee',
  color: '#333',
  border: 0,
  borderRadius: 6,
  cursor: 'pointer',
};

export default function SchemaConfirmModal({ inspection, onConfirm, onCancel }) {
  // picks[fileKey][canonical] = 사용자가 선택한 실제 탭 이름 (또는 빈 문자열로 건너뛰기)
  const [picks, setPicks] = useState(() => {
    const init = {};
    for (const issue of inspection.issues) {
      if (!init[issue.fileKey]) init[issue.fileKey] = {};
      // 같은 길이의 첫 후보를 자동 추천 (없으면 비움)
      const auto = guessTab(issue.expected, issue.actualTabs);
      init[issue.fileKey][issue.canonical] = auto || '';
    }
    return init;
  });

  // 파일별로 이슈 그룹화
  const grouped = {};
  for (const issue of inspection.issues) {
    if (!grouped[issue.fileKey]) grouped[issue.fileKey] = { label: issue.label, items: [] };
    grouped[issue.fileKey].items.push(issue);
  }

  const updatePick = (fileKey, canonical, value) => {
    setPicks((prev) => ({
      ...prev,
      [fileKey]: { ...(prev[fileKey] || {}), [canonical]: value },
    }));
  };

  const handleConfirm = () => {
    const overrides = {};
    for (const fileKey of Object.keys(picks)) {
      for (const canonical of Object.keys(picks[fileKey])) {
        const v = picks[fileKey][canonical];
        if (v) {
          if (!overrides[fileKey]) overrides[fileKey] = {};
          overrides[fileKey][canonical] = v;
        }
      }
    }
    onConfirm(overrides);
  };

  return (
    <div style={overlayStyle} role="dialog" aria-modal="true">
      <div style={cardStyle}>
        <div style={titleStyle}>시트 구조 변경 감지</div>
        <div style={subtitleStyle}>
          Google Sheets에서 일부 탭을 찾지 못했습니다. 각 항목에 매핑할 실제 탭을 선택해주세요.
          저장하면 같은 구조에서는 다음부터 묻지 않습니다.
        </div>
        {Object.entries(grouped).map(([fileKey, group]) => (
          <div key={fileKey}>
            <div style={fileGroupTitleStyle}>{group.label}</div>
            {group.items.map((issue) => (
              <div key={`${fileKey}::${issue.canonical}`} style={issueRowStyle}>
                <div>
                  <span style={labelStyle}>찾는 탭 (canonical):</span>
                  <div style={expectedStyle}>{issue.expected}</div>
                </div>
                <select
                  style={selectStyle}
                  value={picks[fileKey]?.[issue.canonical] ?? ''}
                  onChange={(e) => updatePick(fileKey, issue.canonical, e.target.value)}
                >
                  <option value="">(이 탭 건너뛰기)</option>
                  {issue.actualTabs.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        ))}
        <div style={buttonRowStyle}>
          <button style={secondaryBtn} onClick={onCancel}>
            취소
          </button>
          <button style={primaryBtn} onClick={handleConfirm}>
            저장 후 다시 로드
          </button>
        </div>
      </div>
    </div>
  );
}

// 휴리스틱: 정확 일치 → 대소문자 무시 → 정규화 후 일치 → 부분 포함 → 첫 후보
function guessTab(expected, actualTabs) {
  if (!actualTabs || !actualTabs.length) return '';
  if (actualTabs.includes(expected)) return expected;
  const lower = expected.toLowerCase();
  const ci = actualTabs.find((t) => t.toLowerCase() === lower);
  if (ci) return ci;
  const norm = (s) => s.toLowerCase().replace(/[\s()_\-.]+/g, '');
  const nExp = norm(expected);
  const same = actualTabs.find((t) => norm(t) === nExp);
  if (same) return same;
  const partial = actualTabs.find((t) => norm(t).includes(nExp) || nExp.includes(norm(t)));
  if (partial) return partial;
  return '';
}
