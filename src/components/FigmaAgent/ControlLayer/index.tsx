import React from 'react';
import AgentSetupPanel from './AgentSetupPanel';
import FigmaMcpPanel from './FigmaMcpPanel';
import InputPanel from './InputPanel';
import styles from '../FigmaAgent.module.scss';

const ControlLayer: React.FC = () => {
  return (
    <div className={styles.controlLayer}>
      <AgentSetupPanel />
      <FigmaMcpPanel />
      <InputPanel />
    </div>
  );
};

export default ControlLayer;
