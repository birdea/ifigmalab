import React, { useState } from 'react';
import styles from './App.module.scss';
import FigmaAgent from './components/FigmaAgent';
import pkg from '../package.json';
const { version } = pkg;

type TabId = 'BOOK' | 'EDIT' | 'VIEW' | 'HELP';

const TAB_ITEMS: TabId[] = ['BOOK', 'EDIT', 'VIEW', 'HELP'];

const PanelLeftIcon: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="1.5" y="1.5" width="15" height="15" rx="2.5" stroke="currentColor" strokeWidth="1.5"/>
    <line x1="6.5" y1="1.5" x2="6.5" y2="16.5" stroke="currentColor" strokeWidth="1.5"/>
  </svg>
);

const PanelRightIcon: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="1.5" y="1.5" width="15" height="15" rx="2.5" stroke="currentColor" strokeWidth="1.5"/>
    <line x1="11.5" y1="1.5" x2="11.5" y2="16.5" stroke="currentColor" strokeWidth="1.5"/>
  </svg>
);

const TabContent: React.FC<{ activeTab: TabId }> = ({ activeTab }) => {
  if (activeTab === 'BOOK') return <FigmaAgent />;
  return (
    <div className={styles.placeholder}>
      <span>{activeTab}</span>
    </div>
  );
};

const FigmaLabApp: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>('BOOK');
  const [leftOpen, setLeftOpen] = useState(false);
  const [rightOpen, setRightOpen] = useState(false);

  return (
    <div className={styles.root}>
      {/* Title Bar */}
      <div className={styles.titleBar}>
        <span className={styles.appTitle}>iFigmaLab</span>
        <span className={styles.brandInfo}>
          <span className={styles.brandName}>&#123;BD&#125; creative</span>
          <span className={styles.version}>v{version}</span>
        </span>
      </div>

      {/* Menu Bar */}
      <div className={styles.menuBar}>
        <div className={styles.menuLeft}>
          <button
            className={`${styles.panelBtn} ${leftOpen ? styles.panelBtnActive : ''}`}
            aria-label="Toggle left panel"
            onClick={() => setLeftOpen(v => !v)}
          >
            <PanelLeftIcon />
          </button>
          <span className={styles.menuDivider} />
          <nav className={styles.nav}>
            {TAB_ITEMS.map(tab => (
              <button
                key={tab}
                className={`${styles.navItem} ${activeTab === tab ? styles.navItemActive : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>
        <button
          className={`${styles.panelBtn} ${rightOpen ? styles.panelBtnActive : ''}`}
          aria-label="Toggle right panel"
          onClick={() => setRightOpen(v => !v)}
        >
          <PanelRightIcon />
        </button>
      </div>

      {/* Body */}
      <div className={styles.body}>
        {/* Left Sidebar */}
        <div className={`${styles.sidebar} ${styles.sidebarLeft} ${leftOpen ? styles.sidebarOpen : ''}`}>
          <div className={styles.sidebarContent}>Left Panel</div>
        </div>

        {/* Main Content */}
        <div className={styles.content}>
          <TabContent activeTab={activeTab} />
        </div>

        {/* Right Sidebar */}
        <div className={`${styles.sidebar} ${styles.sidebarRight} ${rightOpen ? styles.sidebarOpen : ''}`}>
          <div className={styles.sidebarContent}>Right Panel</div>
        </div>
      </div>
    </div>
  );
};

export default FigmaLabApp;
