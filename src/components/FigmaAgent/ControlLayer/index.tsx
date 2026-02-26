import React from 'react';
import FigmaMcpPanel from './FigmaMcpPanel';
import InputPanel from './InputPanel';
import styles from '../FigmaAgent.module.scss';

const ControlLayer: React.FC = () => {
  return (
    <div className={styles.controlLayer}>
      <FigmaMcpPanel />
      <InputPanel />
    </div>
  );
};

export default ControlLayer;
