import React, { useState, useEffect, useRef } from 'react';
import { useAtomValue } from 'jotai';
import styles from './App.module.scss';
import FigmaAgent from './components/FigmaAgent';
import { generateStatusAtom, generatedHtmlAtom } from './components/FigmaAgent/atoms';
import { sharedStore } from './shared/store';
import pkg from '../package.json';
const { version } = pkg;

type TabId = 'MCP' | 'VIEW' | 'HELP';

const TAB_ITEMS: TabId[] = ['MCP', 'VIEW', 'HELP'];

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

const ViewPage: React.FC<{ html: string }> = ({ html }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const resize = () => {
      try {
        const doc = iframe.contentDocument;
        if (doc?.body) iframe.style.height = `${doc.body.scrollHeight}px`;
      } catch { /* cross-origin 무시 */ }
    };
    iframe.addEventListener('load', resize);
    return () => iframe.removeEventListener('load', resize);
  }, [html]);

  if (!html) {
    return (
      <div className={styles.placeholder}>
        <span>VIEW</span>
      </div>
    );
  }

  return (
    <div className={styles.viewPage}>
      <iframe
        ref={iframeRef}
        className={styles.viewFrame}
        srcDoc={html}
        sandbox="allow-scripts allow-same-origin"
        referrerPolicy="no-referrer"
        title="Generated Preview"
      />
    </div>
  );
};

const FigmaLabApp: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>('MCP');
  const [leftOpen, setLeftOpen] = useState(false);
  const [rightOpen, setRightOpen] = useState(false);
  const [viewHtml, setViewHtml] = useState('');
  const [toast, setToast] = useState(false);

  const generateStatus = useAtomValue(generateStatusAtom, { store: sharedStore });
  const generatedHtml = useAtomValue(generatedHtmlAtom, { store: sharedStore });
  const prevStatus = useRef(generateStatus);

  useEffect(() => {
    if (prevStatus.current !== 'success' && generateStatus === 'success' && generatedHtml) {
      setViewHtml(generatedHtml);
      setToast(true);
    }
    prevStatus.current = generateStatus;
  }, [generateStatus, generatedHtml]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(false), 5000);
    return () => clearTimeout(timer);
  }, [toast]);

  const handleGoToView = () => {
    setActiveTab('VIEW');
    setToast(false);
  };

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
          {activeTab === 'MCP' && <FigmaAgent store={sharedStore} />}
          {activeTab === 'VIEW' && <ViewPage html={viewHtml} />}
          {activeTab === 'HELP' && (
            <div className={styles.placeholder}><span>HELP</span></div>
          )}
        </div>

        {/* Right Sidebar */}
        <div className={`${styles.sidebar} ${styles.sidebarRight} ${rightOpen ? styles.sidebarOpen : ''}`}>
          <div className={styles.sidebarContent}>Right Panel</div>
        </div>
      </div>

      {/* Toast Popup */}
      {toast && (
        <div className={styles.toast}>
          <span className={styles.toastIcon}>✓</span>
          <span className={styles.toastMessage}>결과가 VIEW 페이지에 반영되었습니다</span>
          <button className={styles.toastAction} onClick={handleGoToView}>VIEW로 이동</button>
          <button className={styles.toastClose} onClick={() => setToast(false)} aria-label="닫기">×</button>
        </div>
      )}
    </div>
  );
};

export default FigmaLabApp;
