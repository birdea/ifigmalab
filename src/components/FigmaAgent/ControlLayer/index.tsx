import React from 'react';
import { useAtom } from 'jotai';
import { controlFoldedAtom } from '../atoms';
import AgentSetupPanel from './AgentSetupPanel';
import FigmaMcpPanel from './FigmaMcpPanel';
import InputPanel from './InputPanel';
import styles from '../FigmaAgent.module.scss';

const ControlLayer: React.FC = () => {
  const [folded, setFolded] = useAtom(controlFoldedAtom);

  return (
    <div className={styles.controlLayer}>
      <div className={styles.controlHeader}>
        <span className={styles.controlTitle}>Control</span>
        <button
          className={styles.foldBtn}
          onClick={() => setFolded(v => !v)}
          type="button"
          aria-label={folded ? '펼치기' : '접기'}
        >
          {folded ? '▼ Expand Control' : '▲ Fold Control'}
        </button>
      </div>

      <div className={`${styles.controlBody} ${folded ? styles.controlBodyFolded : ''}`}>
        <AgentSetupPanel />
        <FigmaMcpPanel />
        <InputPanel />
      </div>
    </div>
  );
};

export default ControlLayer;
