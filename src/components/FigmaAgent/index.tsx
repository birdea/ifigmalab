import React from 'react';
import { Provider } from 'jotai';
import type { createStore } from 'jotai';
import ControlLayer from './ControlLayer';
import styles from './FigmaAgent.module.scss';

type JotaiStore = ReturnType<typeof createStore>;

interface FigmaAgentProps {
  store?: JotaiStore;
}

const FigmaAgentInner: React.FC = () => {
  return (
    <div className={styles.root}>
      <ControlLayer />
    </div>
  );
};

const FigmaAgent: React.FC<FigmaAgentProps> = ({ store }) => (
  <Provider store={store}>
    <FigmaAgentInner />
  </Provider>
);

export default FigmaAgent;
