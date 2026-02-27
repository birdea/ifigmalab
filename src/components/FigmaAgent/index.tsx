import React from 'react';
import ControlLayer from './ControlLayer';
import styles from './FigmaAgent.module.scss';

const FigmaAgent: React.FC = () => {
  return (
    <div className={styles.root}>
      <ControlLayer />
    </div>
  );
};

export default FigmaAgent;
