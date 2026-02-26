import React, { useState } from 'react';
import styles from './App.module.scss';
import FigmaFull from './components/FigmaFull';
import FigmaPart from './components/FigmaPart';
import FigmaAgent from './components/FigmaAgent';

interface ListItem {
  id: string;
  label: string;
  component: React.ComponentType;
}

const LIST_ITEMS: ListItem[] = [
  { id: 'figma-full', label: 'Figma(Full)', component: FigmaFull },
  { id: 'figma-part', label: 'Figma(Part)', component: FigmaPart },
  { id: 'figma-agent', label: 'Figma(Agent)', component: FigmaAgent },
];

const FigmaLabApp: React.FC = () => {
  const [activeId, setActiveId] = useState<string>(LIST_ITEMS[0].id);

  const activeItem = LIST_ITEMS.find(item => item.id === activeId);
  const ActiveComponent = activeItem?.component ?? null;

  return (
    <div className={styles.root}>
      {/* listview layer - vertical scrollable, 5xN button grid */}
      <div className={styles.listview}>
        <div className={styles.grid}>
          {LIST_ITEMS.map(item => (
            <button
              key={item.id}
              className={`${styles.gridBtn} ${item.id === activeId ? styles.gridBtnActive : ''}`}
              onClick={() => setActiveId(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* content layer */}
      <div className={styles.content}>
        {ActiveComponent && <ActiveComponent />}
      </div>
    </div>
  );
};

export default FigmaLabApp;
