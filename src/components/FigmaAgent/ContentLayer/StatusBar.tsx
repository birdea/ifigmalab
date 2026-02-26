import React from 'react';
import { useAtomValue } from 'jotai';
import { generateStatusAtom, generateErrorAtom } from '../atoms';
import styles from '../FigmaAgent.module.scss';

const StatusBar: React.FC = () => {
  const status = useAtomValue(generateStatusAtom);
  const error = useAtomValue(generateErrorAtom);

  if (status === 'idle') return null;

  return (
    <div className={`${styles.statusBar} ${styles[`statusBar_${status}`]}`}>
      {status === 'loading' && <span>● 생성 중...</span>}
      {status === 'success' && <span>✓ 완료</span>}
      {status === 'error' && <span>✗ Error: {error}</span>}
    </div>
  );
};

export default StatusBar;
