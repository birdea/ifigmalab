import React, { useState } from 'react';
import styles from './FigmaFull.module.scss';

// Image assets from Figma localhost server
const imgShape = 'http://localhost:3845/assets/a8bb6c0efd74d44f062a71386b06b8ce91143ec7.svg';       // profile icon
const imgShape1 = 'http://localhost:3845/assets/77a533a39961104e40d391b8e97c2b2db346d9ae.svg';      // collapse icon
const imgShape2 = 'http://localhost:3845/assets/b13c37d0321e83e3f58ac20b57fa4bc2cd2d9e24.svg';      // expand icon
const imgShape3 = 'http://localhost:3845/assets/2e1fb3cd994fb89b8c9b5532cd378b57c6ec2c3e.svg';      // search icon
const imgShape4 = 'http://localhost:3845/assets/417a7f260df8b6571523f6af57bcc3a387d4f2d0.svg';      // note icon
const imgOvalSurface = 'http://localhost:3845/assets/2c9b873761b36a004e4766cbca93044819e88395.svg'; // checkbox unchecked
const imgOvalSurface1 = 'http://localhost:3845/assets/320fe05bc72376e14a8a77cd54c548e7e54af310.svg';// checkbox empty
const imgShape5 = 'http://localhost:3845/assets/1448569958951a4a5327182496e615753872b824.svg';      // recording icon
const imgEllipse5119 = 'http://localhost:3845/assets/5f079b5da6a866b692e7347fefe9e3410a2f57db.svg'; // recording dot
const imgShape6 = 'http://localhost:3845/assets/a36ad502b289cfcd4af6a9876409ae843be8ba9c.svg';      // pending icon
const imgShape7 = 'http://localhost:3845/assets/b089be81f14564220ec1a26af5cfa48ad3466428.svg';      // generating icon (AI)
const imgShape8 = 'http://localhost:3845/assets/b35049cdcd25d6e91038a6db82d2ca52fb134635.svg';      // error icon
const imgShape9 = 'http://localhost:3845/assets/adfead4a2791e7bd7178b6583e8525dc6b008815.svg';      // lecture tag icon
const imgShape10 = 'http://localhost:3845/assets/7ef0b967e06c319e0e58a99bda43762d05c42184.svg';     // folder icon
const imgShape11 = 'http://localhost:3845/assets/e95f43364243cea53140a9ef998c2c3e91731757.svg';     // lecture2 tag icon
const imgContainerIcon = 'http://localhost:3845/assets/dbf2594298c22c26c4bb04743604a86f9887f7b1.svg';// container icon
const imgDot = 'http://localhost:3845/assets/cc5785d650311738b7857a34cdb8b5f316ffd58c.svg';
const imgDot1 = 'http://localhost:3845/assets/7e088731824927f55ae39da1e35ddf8da056853b.svg';
const imgDot2 = 'http://localhost:3845/assets/6b639f88356675581b814be356f3fcb847c95d1c.svg';
const imgDot3 = 'http://localhost:3845/assets/9f478972cdfebbd93f3a64034e7cb8319c4202eb.svg';

// Calendar data
const CALENDAR_DAYS = ['일', '월', '화', '수', '목', '금', '토'];
const calendarDates = [
  [27, 28, 29, 30, 1, 2, 3],
  [4, 5, 6, 7, 8, 9, 10],
  [11, 12, 13, 14, 15, 16, 17],
  [18, 19, 20, 21, 22, 23, 24],
  [25, 26, 27, 28, 29, 30, 31],
];
const dotMap: Record<number, string[]> = {
  4: [imgDot],
  11: [imgDot, imgDot1, imgDot2],
  14: [imgDot3],
  15: [imgDot, imgDot1, imgDot2, imgDot3],
};

interface NoteItem {
  id: string;
  title: string;
  body?: string;
  state: 'recording' | 'pending' | 'generating' | 'error' | 'done';
  stateLabel: string;
  stateColor: string;
  date: string;
  tag?: { label: string; color: string; icon?: string };
  folder?: string;
  duration?: string;
  checked: boolean;
}

const NOTES: NoteItem[] = [
  {
    id: '1', title: '새로운 노트', state: 'recording', stateLabel: '녹음 중',
    stateColor: '#c3c3c3', date: '4. 17.(화) 오후 01:40', checked: false,
  },
  {
    id: '2', title: '생성 전 노트', state: 'pending', stateLabel: '생성 전',
    stateColor: '#c3c3c3', date: '4. 17.(화) 오후 01:40', checked: false,
  },
  {
    id: '3', title: '생성 중 노트', body: 'Lorem ipsum dolor sit amet consectetur.',
    state: 'generating', stateLabel: '생성 중',
    stateColor: '#4c6ef5', date: '4. 17.(화) 오후 01:40', checked: false,
  },
  {
    id: '4', title: '생성 중 오류 발생 노트', state: 'error', stateLabel: '확인 필요',
    stateColor: '#e14638', date: '4. 17.(화) 오후 01:40', checked: false,
  },
  {
    id: '5', title: '2026년 봄학기 강의록',
    body: '머신러닝 기본 원리 및 데이터셋을 활용한 모델 훈련',
    state: 'done', stateLabel: '강의 노트', stateColor: '#f3a403',
    date: '6. 26.(수) 오후 02:00', duration: '45분', folder: '폴더 1', checked: false,
  },
  {
    id: '6', title: '데이터 분석 기초 강의록',
    body: '데이터 시각화 기법 및 파이썬 실습',
    state: 'done', stateLabel: '강의 노트', stateColor: '#f3a403',
    date: '6. 26.(수) 오후 02:00', duration: '45분', folder: '폴더 1', checked: false,
  },
];

function NoteStateIcon({ state }: { state: NoteItem['state'] }) {
  if (state === 'recording') {
    return (
      <div style={{ position: 'relative', flexShrink: 0, width: 20, height: 20 }}>
        <img alt="" style={{ position: 'absolute', inset: '8.75% 8.74%', width: '82.52%', height: '82.5%', display: 'block' }} src={imgShape5} />
        <img alt="" style={{ position: 'absolute', inset: '33.33%', display: 'block' }} src={imgEllipse5119} />
      </div>
    );
  }
  if (state === 'pending') {
    return (
      <div style={{ position: 'relative', flexShrink: 0, width: 14, height: 14 }}>
        <img alt="" style={{ position: 'absolute', inset: '5.3% 3.72%', width: '92.56%', height: '89.4%', display: 'block' }} src={imgShape6} />
      </div>
    );
  }
  if (state === 'generating') {
    return (
      <div style={{ position: 'relative', flexShrink: 0, width: 14, height: 14 }}>
        <img alt="" style={{ position: 'absolute', inset: '5.3% 3.72%', width: '92.56%', height: '89.4%', display: 'block' }} src={imgShape7} />
      </div>
    );
  }
  if (state === 'error') {
    return (
      <div style={{ position: 'relative', flexShrink: 0, width: 14, height: 14 }}>
        <img alt="" style={{ position: 'absolute', inset: '5.3% 3.72%', width: '92.56%', height: '89.4%', display: 'block' }} src={imgShape8} />
      </div>
    );
  }
  return null;
}

function NoteListItem({ note, onToggle }: { note: NoteItem; onToggle: (id: string) => void }) {
  const isDisabled = note.state === 'recording' || note.state === 'pending';
  const titleColor = isDisabled ? '#c3c3c3' : '#1a1a1a';

  return (
    <div
      className={styles.noteListItem}
      style={{ borderBottom: '1px solid #f5f5f5', display: 'flex', alignItems: 'center', paddingLeft: 16, paddingRight: 0 }}
    >
      <div style={{ padding: '1.091px', flexShrink: 0 }}>
        <div style={{ position: 'relative', width: 21.818, height: 21.818 }}>
          <img
            alt=""
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block', cursor: 'pointer' }}
            src={note.checked ? imgOvalSurface : imgOvalSurface1}
            onClick={() => onToggle(note.id)}
          />
        </div>
      </div>
      <div style={{ flex: '1 0 0', minWidth: 0, padding: '22px 16px', overflow: 'hidden' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{
              fontFamily: "'Pretendard', sans-serif", fontWeight: 700, fontSize: 16,
              lineHeight: 1.45, letterSpacing: -0.08, color: titleColor,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              paddingRight: note.state === 'done' ? 40 : 0,
            }}>
              {note.title}
            </div>
            {note.body && (
              <div style={{
                fontFamily: "'Pretendard', sans-serif", fontWeight: 400, fontSize: 15,
                lineHeight: 1.4, color: '#1a1a1a',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'pre-wrap',
              }}>
                {note.body}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
              <NoteStateIcon state={note.state} />
              <span style={{
                fontFamily: "'Pretendard', sans-serif", fontWeight: 400, fontSize: 14,
                lineHeight: 1.55, letterSpacing: -0.028,
                color: note.stateColor,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {note.stateLabel}
              </span>
            </div>
            <span style={{
              fontFamily: "'Pretendard', sans-serif", fontWeight: 400, fontSize: 14,
              lineHeight: 1.55, color: '#7f7f7f', flexShrink: 0, margin: '0 1px',
            }}>
              ・
            </span>
            <span style={{
              fontFamily: "'Pretendard', sans-serif", fontWeight: 400, fontSize: 14,
              lineHeight: 1.55, letterSpacing: -0.028, color: '#7f7f7f',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 0,
            }}>
              {note.date}
            </span>
            {note.duration && (
              <>
                <span style={{ color: '#7f7f7f', fontSize: 14, margin: '0 1px' }}>・</span>
                <div style={{ position: 'relative', flexShrink: 0, width: 14, height: 14 }}>
                  <img alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }} src={imgContainerIcon} />
                </div>
                <span style={{ fontFamily: "'Pretendard', sans-serif", fontSize: 14, color: '#7f7f7f', flexShrink: 0, letterSpacing: -0.028 }}>
                  {note.duration}
                </span>
                <span style={{ color: '#7f7f7f', fontSize: 14, margin: '0 1px' }}>・</span>
                <div style={{ position: 'relative', flexShrink: 0, width: 14, height: 14 }}>
                  <img alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }} src={imgShape10} />
                </div>
                <span style={{ fontFamily: "'Pretendard', sans-serif", fontSize: 14, color: '#7f7f7f', flexShrink: 0, letterSpacing: -0.028 }}>
                  {note.folder}
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function CalendarPanel() {
  return (
    <div className={styles.calendarPanel}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <button className={styles.calNavBtn}>‹</button>
        <span style={{ fontFamily: "'Pretendard', sans-serif", fontWeight: 600, fontSize: 15, color: '#1a1a1a' }}>
          2025년 5월
        </span>
        <button className={styles.calNavBtn}>›</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px 0' }}>
        {CALENDAR_DAYS.map((day, i) => (
          <div key={day} style={{
            textAlign: 'center', fontSize: 12, fontWeight: 500,
            color: i === 0 ? '#e14638' : i === 6 ? '#4c6ef5' : '#7f7f7f',
            padding: '4px 0',
          }}>
            {day}
          </div>
        ))}
        {calendarDates.flat().map((d, i) => {
          const isToday = d === 14 && i > 7;
          const isSel = d === 15 && i > 7;
          const isGray = (i < 7 && d > 20) || (i >= 28 && d < 15);
          const dow = i % 7;
          const dots = dotMap[d] && !isGray ? dotMap[d] : [];
          return (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2px 0' }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                backgroundColor: isToday ? '#1a1a1a' : isSel ? '#f5f5f5' : 'transparent',
                border: isSel ? '1px solid #e0e0e0' : 'none',
                fontSize: 13,
                color: isGray ? '#c3c3c3' : isToday ? '#fff' : dow === 0 ? '#e14638' : dow === 6 ? '#4c6ef5' : '#1a1a1a',
                fontFamily: "'Pretendard', sans-serif",
                cursor: 'pointer',
              }}>
                {d}
              </div>
              <div style={{ display: 'flex', gap: 2, marginTop: 2, height: 5 }}>
                {dots.slice(0, 3).map((dot, di) => (
                  <img key={di} src={dot} alt="" style={{ width: 5, height: 5 }} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const FigmaFull: React.FC = () => {
  const [notes, setNotes] = useState<NoteItem[]>(NOTES);
  const checkedCount = notes.filter(n => n.checked).length;
  const allChecked = checkedCount === notes.length;

  const toggleNote = (id: string) => {
    setNotes(prev => prev.map(n => n.id === id ? { ...n, checked: !n.checked } : n));
  };

  const toggleAll = () => {
    setNotes(prev => prev.map(n => ({ ...n, checked: !allChecked })));
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', width: '100%', height: '100%', minHeight: 600 }}>
      {/* screen */}
      <div style={{ background: 'white', display: 'flex', flex: '1 0 0', height: '100%', alignItems: 'flex-start', minWidth: 700, overflow: 'hidden', position: 'relative' }}>

        {/* Side Navigation */}
        <div style={{
          background: '#f5f5f5', display: 'flex', flexDirection: 'column', gap: 12,
          height: '100%', alignItems: 'center', maxWidth: 340, padding: '10px 0 20px',
          flexShrink: 0, width: 72,
        }}>
          {/* expand button */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 48, height: 48 }}>
            <div className={styles.iconBtn} style={{ width: 38, height: 38, borderRadius: 12 }}>
              <div style={{ position: 'relative', width: 20, height: 20 }}>
                <img alt="" style={{ position: 'absolute', display: 'block', width: '100%', height: '100%' }} src={imgShape2} />
              </div>
            </div>
          </div>
          {/* nav icons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center', flex: 1, minWidth: 0, padding: '0 10px', width: '100%' }}>
            {/* search */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center', width: 48 }}>
              <div className={styles.iconBtn} style={{ width: 40, height: 40, borderRadius: 14 }}>
                <div style={{ position: 'relative', width: 22, height: 22 }}>
                  <img alt="" style={{ position: 'absolute', inset: '6.25% 8.33%', display: 'block', width: '83.34%', height: '87.5%' }} src={imgShape3} />
                </div>
              </div>
              <span style={{ fontFamily: "'Pretendard', sans-serif", fontWeight: 500, fontSize: 9, color: '#1a1a1a', lineHeight: 1.45, letterSpacing: 0.018 }}>검색</span>
            </div>
            {/* note (active) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center', width: 48 }}>
              <div className={styles.iconBtnActive} style={{ width: 40, height: 40, borderRadius: 12, position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', inset: 0, background: '#3e3e3e', opacity: 0.07 }} />
                <div style={{ position: 'relative', width: 22, height: 22 }}>
                  <img alt="" style={{ position: 'absolute', inset: '6.25% 10.42%', display: 'block', width: '79.16%', height: '87.5%' }} src={imgShape4} />
                </div>
              </div>
              <span style={{ fontFamily: "'Pretendard', sans-serif", fontWeight: 600, fontSize: 9, color: '#1a1a1a', lineHeight: 1.45, letterSpacing: 0.018 }}>노트</span>
            </div>
          </div>
          {/* user profile at bottom */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'center', width: 48, padding: '14px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', overflow: 'hidden', width: 32, height: 32, borderRadius: 12, position: 'relative' }}>
              <div style={{ position: 'absolute', inset: 0, background: '#7f7f7f', opacity: 0 }} />
              <div style={{ position: 'relative', width: 20, height: 20 }}>
                <img alt="" style={{ position: 'absolute', inset: '8.76%', display: 'block', width: '82.48%', height: '82.48%' }} src={imgShape} />
              </div>
            </div>
            <span style={{ fontFamily: "'Pretendard', sans-serif", fontWeight: 500, fontSize: 9, color: '#3e3e3e', lineHeight: 1.45, letterSpacing: 0.018 }}>내 정보</span>
          </div>
        </div>

        {/* Contents Area */}
        <div style={{ display: 'flex', flex: '1 0 0', height: '100%', alignItems: 'flex-start', minWidth: 0, position: 'relative' }}>

          {/* Note list panel */}
          <div style={{
            borderRight: '1px solid #ebebeb', display: 'flex', flex: '1 0 0', flexDirection: 'column',
            height: '100%', minWidth: 396, overflow: 'hidden',
          }}>
            {/* Header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              overflow: 'hidden', padding: '36px 16px 24px 32px', flexShrink: 0,
            }}>
              <div style={{ fontFamily: "'Pretendard', sans-serif", fontWeight: 700, fontSize: 22, lineHeight: 1.45, letterSpacing: -0.11, color: '#1a1a1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                노트 목록 편집
              </div>
              <button className={styles.capsuleBtn} style={{ border: '1px solid #1a1a1a' }}>
                <span style={{ fontFamily: "'Pretendard', sans-serif", fontWeight: 500, fontSize: 13, color: '#1a1a1a', lineHeight: 1.4 }}>취소</span>
              </button>
            </div>

            {/* Body */}
            <div style={{ display: 'flex', flex: '1 0 0', flexDirection: 'column', minWidth: 0, minHeight: 0, overflow: 'hidden' }}>
              {/* Select header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '20px 16px 6px', flexShrink: 0 }}>
                <div style={{ display: 'flex', flex: '1 0 0', gap: 16, alignItems: 'center', paddingLeft: 16, minWidth: 0 }}>
                  <div style={{ padding: 1.091, flexShrink: 0, cursor: 'pointer' }} onClick={toggleAll}>
                    <div style={{ position: 'relative', width: 21.818, height: 21.818 }}>
                      <img alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }} src={allChecked ? imgOvalSurface : imgOvalSurface1} />
                    </div>
                  </div>
                  <span style={{ fontFamily: "'Pretendard', sans-serif", fontWeight: 500, fontSize: 17, lineHeight: 1.45, letterSpacing: -0.085, color: '#1a1a1a', whiteSpace: 'nowrap' }}>
                    전체 선택
                  </span>
                  <div style={{ display: 'flex', flex: '1 0 0', gap: 16, alignItems: 'center', justifyContent: 'flex-end', minWidth: 0 }}>
                    <div style={{ display: 'flex', flex: '1 0 0', alignItems: 'center', justifyContent: 'flex-end', minWidth: 0 }}>
                      <span style={{ fontFamily: "'Pretendard', sans-serif", fontWeight: 400, fontSize: 13, lineHeight: 1.4, color: '#555', textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {checkedCount}개 선택됨
                      </span>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 16px', alignItems: 'center', justifyContent: 'flex-end', maxWidth: 203, minWidth: 110 }}>
                      <button className={styles.capsuleBtn} style={{ background: '#ebebeb', border: 'none' }}>
                        <span style={{ fontFamily: "'Pretendard', sans-serif", fontWeight: 500, fontSize: 13, color: '#7f7f7f', lineHeight: 1.4 }}>폴더 이동</span>
                      </button>
                      <button className={styles.capsuleBtn} style={{ border: '1px solid #c3c3c3' }}>
                        <span style={{ fontFamily: "'Pretendard', sans-serif", fontWeight: 500, fontSize: 13, color: '#c3c3c3', lineHeight: 1.4 }}>휴지통으로 이동</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Note list */}
              <div style={{ flex: '1 0 0', overflowY: 'auto', minHeight: 0, padding: '0 16px' }}>
                {notes.map(note => (
                  <NoteListItem key={note.id} note={note} onToggle={toggleNote} />
                ))}
              </div>
            </div>
          </div>

          {/* Calendar panel */}
          <CalendarPanel />
        </div>
      </div>
    </div>
  );
};

export default FigmaFull;
