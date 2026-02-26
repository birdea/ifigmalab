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
        Figma 디자인을 AI로 분석하여 독립 실행 가능한 HTML을 자동 생성합니다.
      </p>
    </div>

    <div className={styles.helpSections}>

      <section className={styles.helpSection}>
        <h2 className={styles.helpSectionTitle}>개요</h2>
        <p className={styles.helpSectionBody}>
          iFigmaLab은 Figma Desktop App의 MCP(Model Context Protocol) 서버에서 디자인 컨텍스트를 가져온 뒤,
          Google Gemini에게 전달하여 순수 HTML / CSS / JS로 구성된 완전 독립형 파일을 생성합니다.
          외부 CDN이나 프레임워크 없이 Figma 디자인을 코드로 재현하는 것을 목표로 합니다.
          Figma MCP 없이도 Design Context를 직접 붙여넣어 동일하게 사용할 수 있습니다.
        </p>
      </section>

      <section className={styles.helpSection}>
        <h2 className={styles.helpSectionTitle}>탭 구성</h2>
        <div className={styles.helpTabList}>
          <div className={styles.helpTabItem}>
            <span className={styles.helpTabBadge}>AGENT</span>
            <div>
              <strong>AI 설정</strong>
              <p>Google Gemini API Key와 사용할 모델을 선택합니다. API Key는 세션 동안 유지되며 Submit 전에 반드시 입력해야 합니다.</p>
            </div>
          </div>
          <div className={styles.helpTabItem}>
            <span className={styles.helpTabBadge}>MCP</span>
            <div>
              <strong>Figma 연동 및 생성 요청</strong>
              <p>Figma MCP 서버 연결 상태를 확인하고, Node ID 또는 Figma URL로 Design Context와 Screenshot을 가져옵니다. Design Context와 Prompt 입력 후 Submit하면 AI 생성이 시작됩니다.</p>
            </div>
          </div>
          <div className={styles.helpTabItem}>
            <span className={styles.helpTabBadge}>VIEW</span>
            <div>
              <strong>결과 미리보기</strong>
              <p>생성된 HTML을 iframe으로 즉시 확인합니다. 생성 완료 시 팝업 알림이 표시되며, 소스 코드 보기와 파일 다운로드를 지원합니다.</p>
            </div>
          </div>
          <div className={styles.helpTabItem}>
            <span className={styles.helpTabBadge}>LOG</span>
            <div>
              <strong>Debug Log</strong>
              <p>Submit 과정의 상세 로그를 실시간으로 확인합니다. 요청 크기, 토큰 수, 응답 구조, HTML 추출 결과 등이 기록됩니다.</p>
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
          <li><strong>AGENT 탭</strong>에서 Google Gemini API Key를 입력하고 모델을 선택합니다.</li>
          <li>Figma Desktop App과 Proxy Server를 실행한 뒤, <strong>MCP 탭</strong>에서 연결 상태(Connected)를 확인합니다.</li>
          <li>Figma Node ID 또는 URL을 입력하고 <strong>Fetch from Figma</strong>로 Design Context를, <strong>Screenshot</strong>으로 디자인 이미지를 가져옵니다.</li>
          <li>필요 시 Design Context를 <strong>Optimize</strong>하여 토큰을 절감하고, 추가 지시사항을 Prompt에 입력합니다.</li>
          <li><strong>Submit ▶</strong>을 클릭하면 AI 생성이 시작됩니다. 완료 후 <strong>VIEW 탭</strong>에서 결과를 확인합니다.</li>
          <li>문제가 발생하면 <strong>LOG 탭</strong>에서 상세 로그를 확인합니다.</li>
        </ol>
      </section>

      <section className={styles.helpSection}>
        <h2 className={styles.helpSectionTitle}>아키텍처</h2>
        <pre className={styles.helpArch}>{`Figma Desktop App
  └─ Figma MCP Server (:3845)    ← Figma MCP Server URL로 변경 가능
       └─ Proxy Server (:3006)   ← Fetch / Screenshot 중계
            └─ iFigmaLab (브라우저)
                 └─ Google Gemini API   ← Submit 시 브라우저에서 직접 호출`}</pre>
        <p className={styles.helpSectionBody}>
          Submit(AI 생성)은 Proxy Server 없이 브라우저에서 Gemini API를 직접 호출합니다.
          Proxy Server는 Figma MCP 데이터 Fetch 및 Screenshot 기능에만 사용됩니다.
          Design Context를 직접 붙여넣으면 Proxy Server 없이도 Submit이 가능합니다.
        </p>
      </section>

      <section className={styles.helpSection}>
        <h2 className={styles.helpSectionTitle}>요구사항</h2>
        <ul className={styles.helpList}>
          <li>Google Gemini API Key — <a className={styles.helpLink} href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer">aistudio.google.com</a>에서 무료 발급</li>
          <li><strong>Figma MCP 사용 시:</strong> Figma Desktop App 실행 + Proxy Server (localhost:3006) 별도 실행 필요</li>
          <li><strong>Figma MCP 미사용 시:</strong> Design Context를 직접 붙여넣기하면 Proxy Server 없이 동작</li>
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
