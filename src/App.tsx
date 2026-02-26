import React, { useState, useEffect, useRef } from 'react';
import { useAtomValue, useAtom, Provider } from 'jotai';
import styles from './App.module.scss';
import FigmaAgent from './components/FigmaAgent';
import AgentSetupPanel from './components/FigmaAgent/ControlLayer/AgentSetupPanel';
import { generateStatusAtom, generatedHtmlAtom, debugLogAtom } from './components/FigmaAgent/atoms';
import { sharedStore } from './shared/store';
import pkg from '../package.json';
const { version } = pkg;

type TabId = 'AGENT' | 'MCP' | 'VIEW' | 'LOG' | 'HELP';

const TAB_ITEMS: TabId[] = ['AGENT', 'MCP', 'VIEW', 'LOG', 'HELP'];

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

const LogPage: React.FC = () => {
  const [debugLog, setDebugLog] = useAtom(debugLogAtom, { store: sharedStore });
  const logRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [debugLog]);

  return (
    <div className={styles.logPage}>
      <div className={styles.logHeader}>
        <span className={styles.logTitle}>Debug Log</span>
        <button className={styles.logClear} onClick={() => setDebugLog('')} type="button">
          Clear
        </button>
      </div>
      <textarea
        ref={logRef}
        className={styles.logArea}
        readOnly
        value={debugLog || '— Submit 버튼을 누르면 로그가 표시됩니다 —'}
      />
    </div>
  );
};

const HelpPage: React.FC = () => (
  <div className={styles.helpPage}>
    <div className={styles.helpHero}>
      <h1 className={styles.helpTitle}>iFigmaLab</h1>
      <p className={styles.helpSubtitle}>
        Figma 디자인을 AI로 분석하여 HTML 코드를 자동 생성하는 도구입니다.
      </p>
    </div>

    <div className={styles.helpSections}>

      <section className={styles.helpSection}>
        <h2 className={styles.helpSectionTitle}>개요</h2>
        <p className={styles.helpSectionBody}>
          iFigmaLab은 Figma MCP(Model Context Protocol)를 통해 디자인 컨텍스트를 가져오고,
          Google Gemini AI에게 프롬프팅하여 완전히 독립 실행 가능한 HTML 파일을 생성합니다.
          외부 CDN 없이 순수 HTML / CSS / JS만으로 Figma 디자인을 재현하는 것을 목표로 합니다.
        </p>
      </section>

      <section className={styles.helpSection}>
        <h2 className={styles.helpSectionTitle}>탭 구성</h2>
        <div className={styles.helpTabList}>
          <div className={styles.helpTabItem}>
            <span className={styles.helpTabBadge}>AGENT</span>
            <div>
              <strong>AI Agent Setup</strong>
              <p>사용할 AI 프로바이더(Google Gemini)와 API Key, 모델을 설정합니다. Submit 전 반드시 설정이 필요합니다.</p>
            </div>
          </div>
          <div className={styles.helpTabItem}>
            <span className={styles.helpTabBadge}>MCP</span>
            <div>
              <strong>Figma MCP 연동 + Figma Prompt</strong>
              <p>Figma Desktop App의 MCP 서버에 연결하여 디자인 컨텍스트를 가져옵니다. Design Context와 Prompt를 입력한 뒤 Submit하면 AI 생성이 시작됩니다.</p>
            </div>
          </div>
          <div className={styles.helpTabItem}>
            <span className={styles.helpTabBadge}>VIEW</span>
            <div>
              <strong>결과 미리보기</strong>
              <p>Submit 완료 후 AI가 생성한 HTML을 iframe으로 렌더링하여 보여줍니다. 생성 완료 시 자동 알림이 표시됩니다.</p>
            </div>
          </div>
          <div className={styles.helpTabItem}>
            <span className={styles.helpTabBadge}>LOG</span>
            <div>
              <strong>Debug Log</strong>
              <p>Submit 과정의 상세 로그를 확인합니다. 요청 크기, 토큰 수, 응답 구조, HTML 추출 결과 등이 기록됩니다.</p>
            </div>
          </div>
          <div className={styles.helpTabItem}>
            <span className={styles.helpTabBadge}>HELP</span>
            <div>
              <strong>도움말</strong>
              <p>iFigmaLab 사용 안내 및 프로젝트 개요입니다.</p>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.helpSection}>
        <h2 className={styles.helpSectionTitle}>사용 방법</h2>
        <ol className={styles.helpSteps}>
          <li><strong>AGENT 탭</strong>에서 Google Gemini API Key와 모델을 선택합니다.</li>
          <li><strong>MCP 탭</strong>에서 Figma MCP 연결 상태를 확인합니다. (Figma Desktop App 실행 필요)</li>
          <li>Figma Node ID 또는 URL을 입력하고 <strong>Fetch from Figma</strong>를 클릭하여 Design Context를 가져옵니다.</li>
          <li>필요 시 추가 Prompt를 입력한 뒤 <strong>Submit ▶</strong>를 클릭합니다.</li>
          <li>생성 완료 후 <strong>VIEW 탭</strong>에서 결과를 확인하고, <strong>LOG 탭</strong>에서 상세 내용을 검토합니다.</li>
        </ol>
      </section>

      <section className={styles.helpSection}>
        <h2 className={styles.helpSectionTitle}>아키텍처</h2>
        <pre className={styles.helpArch}>{`Figma Desktop App
  └─ MCP Server (localhost:3845)
       └─ Proxy Server (localhost:3006)   ← Fetch / Screenshot 기능
            └─ iFigmaLab Frontend
                 └─ Google Gemini API     ← Submit 기능 (직접 호출)`}</pre>
        <p className={styles.helpSectionBody}>
          Submit(AI 생성)은 Proxy Server 없이 브라우저에서 Gemini API를 직접 호출합니다.
          Proxy Server는 Figma MCP 데이터 Fetch 및 Screenshot 기능에만 필요합니다.
        </p>
      </section>

      <section className={styles.helpSection}>
        <h2 className={styles.helpSectionTitle}>요구사항</h2>
        <ul className={styles.helpList}>
          <li>Google Gemini API Key (<a className={styles.helpLink} href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer">aistudio.google.com</a>에서 발급)</li>
          <li>Figma MCP 기능 사용 시: Figma Desktop App 실행 + Proxy Server (localhost:3006) 실행</li>
          <li>MCP 없이 Design Context를 직접 붙여넣기하면 Proxy Server 없이도 동작합니다.</li>
        </ul>
      </section>

    </div>
  </div>
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
          {activeTab === 'AGENT' && <Provider store={sharedStore}><AgentSetupPanel /></Provider>}
          {activeTab === 'MCP' && <FigmaAgent store={sharedStore} />}
          {activeTab === 'VIEW' && <ViewPage html={viewHtml} />}
          {activeTab === 'LOG' && <LogPage />}
          {activeTab === 'HELP' && <HelpPage />}
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
