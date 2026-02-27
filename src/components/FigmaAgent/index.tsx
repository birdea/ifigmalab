import React from 'react';
import ControlLayer from './ControlLayer';
import styles from './FigmaAgent.module.scss';

const FigmaAgentInner: React.FC = () => {
  return (
    <div className={styles.root}>
      <ControlLayer />
    </div>
  );
};

const FigmaAgent: React.FC = () => (
  <FigmaAgentInner />
);

export default FigmaAgent;
