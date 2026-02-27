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
        <span>미리보기 (VIEW)</span>
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
  const [viewHtml, setViewHtml] = useState('');
  const [toast, setToast] = useState(false);
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

      <div className={styles.menuBar}>
        <div className={styles.menuLeft}>
          <nav className={styles.nav} role="tablist" aria-label="메인 탭 메뉴">
            {TAB_ITEMS.map(tab => (
              <button
                key={tab}
                role="tab"
                aria-selected={activeTab === tab}
                aria-controls={`panel-${tab}`}
                id={`tab-${tab}`}
                className={`${styles.navItem} ${activeTab === tab ? styles.navItemActive : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Body */}
      <div className={styles.body}>
        {/* Main Content */}
        <div className={styles.content}>
          <Provider store={sharedStore}>
            <div id="panel-AGENT" role="tabpanel" aria-labelledby="tab-AGENT" style={{ visibility: activeTab === 'AGENT' ? 'visible' : 'hidden', position: activeTab === 'AGENT' ? 'relative' : 'absolute', height: '100%', width: '100%', zIndex: activeTab === 'AGENT' ? 1 : -1, opacity: activeTab === 'AGENT' ? 1 : 0 }}>
              <AgentSetupPanel />
            </div>
            <div id="panel-MCP" role="tabpanel" aria-labelledby="tab-MCP" style={{ visibility: activeTab === 'MCP' ? 'visible' : 'hidden', position: activeTab === 'MCP' ? 'relative' : 'absolute', height: '100%', width: '100%', zIndex: activeTab === 'MCP' ? 1 : -1, opacity: activeTab === 'MCP' ? 1 : 0 }}>
              <FigmaAgent />
            </div>
            <div id="panel-VIEW" role="tabpanel" aria-labelledby="tab-VIEW" style={{ visibility: activeTab === 'VIEW' ? 'visible' : 'hidden', position: activeTab === 'VIEW' ? 'relative' : 'absolute', height: '100%', width: '100%', zIndex: activeTab === 'VIEW' ? 1 : -1, opacity: activeTab === 'VIEW' ? 1 : 0 }}>
              <ViewPage html={viewHtml} />
            </div>
            <div id="panel-HELP" role="tabpanel" aria-labelledby="tab-HELP" style={{ visibility: activeTab === 'HELP' ? 'visible' : 'hidden', position: activeTab === 'HELP' ? 'relative' : 'absolute', height: '100%', width: '100%', zIndex: activeTab === 'HELP' ? 1 : -1, opacity: activeTab === 'HELP' ? 1 : 0 }}>
              <HelpPage />
            </div>
          </Provider>
        </div>
      </div>

      {/* Toast Popup */}
      {toast && (
        <div className={styles.toast} role="status" aria-live="polite">
          <span className={styles.toastIcon}>✓</span>
          <span className={styles.toastMessage}>결과가 VIEW 페이지에 반영되었습니다</span>
          <button className={styles.toastAction} onClick={handleGoToView}>미리보기(VIEW)로 이동</button>
          <button className={styles.toastClose} onClick={() => setToast(false)} aria-label="닫기">×</button>
        </div>
      )}
    </div>
  );
};

export default FigmaLabApp;
