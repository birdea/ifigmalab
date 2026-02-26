import React from 'react';
import { Provider } from 'jotai';
import ControlLayer from './ControlLayer';
import ContentLayer from './ContentLayer';
import styles from './FigmaAgent.module.scss';

const FigmaAgentInner: React.FC = () => {
  return (
    <div className={styles.root}>
      <ControlLayer />
      <ContentLayer />
    </div>
  );
};

const FigmaAgent: React.FC = () => (
  <Provider>
    <FigmaAgentInner />
  </Provider>
);

export default FigmaAgent;
