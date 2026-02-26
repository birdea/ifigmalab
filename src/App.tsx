import React from 'react';
import styles from './App.module.scss';
import FigmaAgent from './components/FigmaAgent';
import pkg from '../package.json';
const { version } = pkg;

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

const FigmaLabApp: React.FC = () => {
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
          <button className={styles.panelBtn} aria-label="Toggle left panel">
            <PanelLeftIcon />
          </button>
          <span className={styles.menuDivider} />
          <nav className={styles.nav}>
            <button className={styles.navItem}>BOOK</button>
            <button className={styles.navItem}>EDIT</button>
            <button className={styles.navItem}>VIEW</button>
            <button className={styles.navItem}>HELP</button>
          </nav>
        </div>
        <button className={styles.panelBtn} aria-label="Toggle right panel">
          <PanelRightIcon />
        </button>
      </div>

      {/* Content */}
      <div className={styles.content}>
        <FigmaAgent />
      </div>
    </div>
  );
};

export default FigmaLabApp;
