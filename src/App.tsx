import React, { useState, useEffect, useRef } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import helpContent from './content/help.md';
import { useAtomValue, Provider } from 'jotai';
import styles from './App.module.scss';
import FigmaAgent from './components/FigmaAgent';
import AgentSetupPanel from './components/FigmaAgent/ControlLayer/AgentSetupPanel';
import { generateStatusAtom, generatedHtmlAtom } from './components/FigmaAgent/atoms';
import { sharedStore } from './shared/store';
import pkg from '../package.json';
const { version } = pkg;

type TabId = 'AGENT' | 'MCP' | 'VIEW' | 'HELP';

const TAB_ITEMS: TabId[] = ['AGENT', 'MCP', 'VIEW', 'HELP'];

const PanelLeftIcon: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="1.5" y="1.5" width="15" height="15" rx="2.5" stroke="currentColor" strokeWidth="1.5" />
    <line x1="6.5" y1="1.5" x2="6.5" y2="16.5" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);

const PanelRightIcon: React.FC = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="1.5" y="1.5" width="15" height="15" rx="2.5" stroke="currentColor" strokeWidth="1.5" />
    <line x1="11.5" y1="1.5" x2="11.5" y2="16.5" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);


/**
 * 도움말 화면을 렌더링하는 Component.
 * Markdown 형태의 도움말 콘텐츠를 파싱하여 출력합니다.
 */
const HelpPage: React.FC = () => (
  <div className={styles.helpPage}>
    <div className={styles.helpMarkdown}>
      <Markdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>
          ),
        }}
      >
        {helpContent}
      </Markdown>
    </div>
  </div>
);

/**
 * AI가 생성한 HTML 코드를 렌더링하여 미리보여주는 View Component.
 * iframe 내부에 HTML 구조를 삽입하여 독립적인 렌더링 환경을 제공합니다.
 * @param {string} html - 생성된 원본 HTML 문자열
 */
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
        sandbox="allow-scripts"
        referrerPolicy="no-referrer"
        title="Generated Preview"
      />
    </div>
  );
};

/**
 * 어플리케이션의 메인 레이아웃 및 탭 구성을 관리하는 최상단 Component.
 * 왼쪽/오른쪽 패널의 Resizing 기능 및 Toast 알림 기능을 포함합니다.
 */
const FigmaLabApp: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>('MCP');
  const [leftOpen, setLeftOpen] = useState(false);
  const [rightOpen, setRightOpen] = useState(false);
  const [leftWidth, setLeftWidth] = useState(240);
  const [rightWidth, setRightWidth] = useState(240);
  const [isResizingLeft, setIsResizingLeft] = useState(false);
  const [isResizingRight, setIsResizingRight] = useState(false);
  const [viewHtml, setViewHtml] = useState('');
  const [toast, setToast] = useState(false);

  const leftDragStart = useRef<{ x: number; width: number } | null>(null);
  const rightDragStart = useRef<{ x: number; width: number } | null>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (leftDragStart.current) {
        const delta = e.clientX - leftDragStart.current.x;
        setLeftWidth(Math.min(480, Math.max(160, leftDragStart.current.width + delta)));
      }
      if (rightDragStart.current) {
        const delta = rightDragStart.current.x - e.clientX;
        setRightWidth(Math.min(480, Math.max(160, rightDragStart.current.width + delta)));
      }
    };
    const handleMouseUp = () => {
      if (leftDragStart.current) {
        leftDragStart.current = null;
        setIsResizingLeft(false);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
      if (rightDragStart.current) {
        rightDragStart.current = null;
        setIsResizingRight(false);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  // 왼쪽 패널 크기 조절 시작(Drag Start)
  const handleLeftResizerMouseDown = (e: React.MouseEvent) => {
    leftDragStart.current = { x: e.clientX, width: leftWidth };
    setIsResizingLeft(true);
    document.body.style.cursor = 'ew-resize';
    document.body.style.userSelect = 'none';
    e.preventDefault();
  };

  // 오른쪽 패널 크기 조절 시작(Drag Start)
  const handleRightResizerMouseDown = (e: React.MouseEvent) => {
    rightDragStart.current = { x: e.clientX, width: rightWidth };
    setIsResizingRight(true);
    document.body.style.cursor = 'ew-resize';
    document.body.style.userSelect = 'none';
    e.preventDefault();
  };

  const generateStatus = useAtomValue(generateStatusAtom, { store: sharedStore });
  const generatedHtml = useAtomValue(generatedHtmlAtom, { store: sharedStore });
  const prevStatus = useRef(generateStatus);

  // 생성 상태(generation status) 변경 감지 시 Toast 출력 및 VIEW 탭 갱신
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
        <div
          className={`${styles.sidebar} ${styles.sidebarLeft} ${leftOpen ? styles.sidebarOpen : ''} ${isResizingLeft ? styles.sidebarResizing : ''}`}
          style={leftOpen ? { width: leftWidth } : undefined}
        >
          <div className={styles.sidebarContent}>Left Panel</div>
        </div>

        {/* Left Resizer */}
        {leftOpen && (
          <div
            className={`${styles.resizer} ${isResizingLeft ? styles.resizerDragging : ''}`}
            onMouseDown={handleLeftResizerMouseDown}
          />
        )}

        {/* Main Content */}
        <div className={styles.content}>
          <Provider store={sharedStore}>
            <div style={{ display: activeTab === 'AGENT' ? 'block' : 'none', height: '100%', width: '100%' }}>
              <AgentSetupPanel />
            </div>
            <div style={{ display: activeTab === 'MCP' ? 'block' : 'none', height: '100%', width: '100%' }}>
              <FigmaAgent />
            </div>
            <div style={{ display: activeTab === 'VIEW' ? 'block' : 'none', height: '100%', width: '100%' }}>
              <ViewPage html={viewHtml} />
            </div>
            <div style={{ display: activeTab === 'HELP' ? 'block' : 'none', height: '100%', width: '100%' }}>
              <HelpPage />
            </div>
          </Provider>
        </div>

        {/* Right Resizer */}
        {rightOpen && (
          <div
            className={`${styles.resizer} ${isResizingRight ? styles.resizerDragging : ''}`}
            onMouseDown={handleRightResizerMouseDown}
          />
        )}

        {/* Right Sidebar */}
        <div
          className={`${styles.sidebar} ${styles.sidebarRight} ${rightOpen ? styles.sidebarOpen : ''} ${isResizingRight ? styles.sidebarResizing : ''}`}
          style={rightOpen ? { width: rightWidth } : undefined}
        >
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
