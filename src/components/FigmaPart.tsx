import React, { useState } from 'react';
import styles from './FigmaPart.module.scss';

// Image assets from Figma localhost server
const imgOvalSurface = 'http://localhost:3845/assets/2c9b873761b36a004e4766cbca93044819e88395.svg'; // checkbox unchecked (circle)
const imgShape = 'http://localhost:3845/assets/b089be81f14564220ec1a26af5cfa48ad3466428.svg';       // AI generating icon

const FigmaPart: React.FC = () => {
  const [checked, setChecked] = useState(false);

  return (
    <div className={styles.wrapper}>
      <div className={styles.container}>
        {/* checkbox */}
        <div style={{ padding: '1.091px', flexShrink: 0 }}>
          <div style={{ position: 'relative', width: 21.818, height: 21.818 }}>
            <img
              alt="checkbox"
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block', cursor: 'pointer' }}
              src={imgOvalSurface}
              onClick={() => setChecked(v => !v)}
            />
            {checked && (
              <div style={{
                position: 'absolute', inset: 0, borderRadius: '50%',
                background: '#4c6ef5', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ color: 'white', fontSize: 13, lineHeight: 1 }}>✓</span>
              </div>
            )}
          </div>
        </div>

        {/* note content */}
        <div style={{ flex: '1 0 0', minWidth: 0, padding: '22px 16px', overflow: 'hidden', position: 'relative' }}>
          {/* state hover layer */}
          <div style={{ position: 'absolute', inset: 0, background: '#7f7f7f', opacity: 0, borderRadius: 10 }} />

          <div className={styles.body}>
            {/* textBlock */}
            <div className={styles.textBlock}>
              {/* title row */}
              <div style={{ display: 'flex', alignItems: 'center', paddingRight: 40, width: '100%' }}>
                <div style={{
                  fontFamily: "'Pretendard', sans-serif", fontWeight: 700,
                  fontSize: 16, lineHeight: 1.45, letterSpacing: -0.08,
                  color: '#1a1a1a',
                  flex: '1 0 0', minWidth: 0,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  생성 중 노트
                </div>
              </div>

              {/* body text */}
              <div style={{
                fontFamily: "'Pretendard', sans-serif", fontWeight: 400,
                fontSize: 15, lineHeight: 1.4,
                color: '#1a1a1a',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'pre-wrap',
                width: '100%',
              }}>
                Lorem ipsum dolor sit amet consectetur.
              </div>
            </div>

            {/* metaBlock */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {/* metaItem: state */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                <div style={{ position: 'relative', flexShrink: 0, width: 14, height: 14 }}>
                  <img
                    alt=""
                    style={{ position: 'absolute', inset: '5.3% 3.72%', width: '92.56%', height: '89.4%', display: 'block' }}
                    src={imgShape}
                  />
                </div>
                <span style={{
                  fontFamily: "'Pretendard', sans-serif", fontWeight: 400, fontSize: 14,
                  lineHeight: 1.55, letterSpacing: -0.028,
                  color: '#4c6ef5',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  생성 중
                </span>
              </div>

              {/* dot separator */}
              <span style={{
                fontFamily: "'Pretendard', sans-serif", fontWeight: 400, fontSize: 14,
                lineHeight: 1.55, color: '#7f7f7f', textAlign: 'center',
                overflow: 'hidden', textOverflow: 'ellipsis', flexShrink: 0, margin: '0 1px',
              }}>
                ・
              </span>

              {/* metaItem: date */}
              <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                <span style={{
                  fontFamily: "'Pretendard', sans-serif", fontWeight: 400, fontSize: 14,
                  lineHeight: 1.55, letterSpacing: -0.028, color: '#7f7f7f',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  4. 17.(화) 오후 01:40
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FigmaPart;
