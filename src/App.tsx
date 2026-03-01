import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useTranslation } from 'react-i18next';

import { useAtomValue, Provider } from 'jotai';
import styles from './App.module.scss';
import FigmaAgent from './components/FigmaAgent';
import AgentSetupPanel from './components/FigmaAgent/ControlLayer/AgentSetupPanel';
import { generateStatusAtom, generatedHtmlAtom } from './components/FigmaAgent/atoms';
import { sharedStore } from './shared/store';

const version = process.env.APP_VERSION;
const HelpPage = React.lazy(() => import('./components/HelpPage'));

type TabId = 'AGENT' | 'MCP' | 'VIEW' | 'HELP';

const TAB_ITEMS: TabId[] = ['AGENT', 'MCP', 'VIEW', 'HELP'];

/**
 * AI가 생성한 HTML 코드를 렌더링하여 미리보여주는 View Component.
 * iframe 내부에 HTML 구조를 삽입하여 독립적인 렌더링 환경을 제공합니다.
 * @param {string} html - 생성된 원본 HTML 문자열
 */
const ViewPage: React.FC<{ html: string }> = ({ html }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { t } = useTranslation();
  const [allowScripts, setAllowScripts] = useState(false);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    let ro: ResizeObserver | null = null;

    const resize = () => {
      try {
        const doc = iframe.contentDocument;
        if (doc?.body) iframe.style.height = `${doc.body.scrollHeight}px`;
      } catch { /* cross-origin 무시 */ }
    };

    const handleLoad = () => {
      resize();
      try {
        const doc = iframe.contentDocument;
        if (doc?.body) {
          ro = new ResizeObserver(resize);
          ro.observe(doc.body);
        }
      } catch { /* cross-origin 무시 */ }
    };

    iframe.addEventListener('load', handleLoad);
    return () => {
      iframe.removeEventListener('load', handleLoad);
      ro?.disconnect();
    };
  }, [html, allowScripts]);

  if (!html) {
    return (
      <div className={styles.placeholder}>
        <span>{t('view.placeholder')}</span>
      </div>
    );
  }

  return (
    <div className={styles.viewPage}>
      <div className={`${styles.viewToolbar} ${allowScripts ? styles.viewToolbarWarning : ''}`}>
        <span className={styles.viewToolbarLabel}>
          {allowScripts ? t('view.script_enabled_warning') : t('view.script_disabled_label')}
        </span>
        <button
          className={`${styles.viewToolbarBtn} ${allowScripts ? styles.viewToolbarBtnDanger : ''}`}
          onClick={() => setAllowScripts(prev => !prev)}
        >
          {allowScripts ? t('view.disable_scripts') : t('view.enable_scripts')}
        </button>
      </div>
      <iframe
        ref={iframeRef}
        className={styles.viewFrame}
        srcDoc={html}
        sandbox={allowScripts ? 'allow-scripts' : ''}
        referrerPolicy="no-referrer"
        title={t('view.title')}
      />
    </div>
  );
};

/**
 * 어플리케이션의 메인 레이아웃 및 탭 구성을 관리하는 최상단 Component.
 * 왼쪽/오른쪽 패널의 Resizing 기능 및 Toast 알림 기능을 포함합니다.
 */
const FigmaLabApp: React.FC = () => {
  const { t, i18n } = useTranslation();
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

  const getTabPanelClass = (id: TabId) =>
    `${styles.tabPanel} ${activeTab === id ? '' : styles.tabPanelHidden}`;

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
          <div className={styles.nav} role="tablist" aria-label={t('nav.aria_label')}>
            {TAB_ITEMS.map(tab => (
              <button
                key={tab}
                role="tab"
                aria-selected={activeTab === tab}
                aria-controls={`panel-${tab}`}
                id={`tab-${tab}`}
                className={`${styles.navItem} ${activeTab === tab ? styles.navItemActive : ''}`}
                onClick={() => setActiveTab(tab)}
                onKeyDown={(e) => {
                  const current = TAB_ITEMS.indexOf(activeTab);
                  if (e.key === 'ArrowRight') setActiveTab(TAB_ITEMS[(current + 1) % TAB_ITEMS.length]);
                  if (e.key === 'ArrowLeft') setActiveTab(TAB_ITEMS[(current - 1 + TAB_ITEMS.length) % TAB_ITEMS.length]);
                }}
              >
                {t(`tabs.${tab.toLowerCase()}`)}
              </button>
            ))}
          </div>
        </div>
        <div className={styles.menuRight}>
          <div className={styles.localeSwitcher} role="group" aria-label="Language">
            {(['ko', 'en'] as const).map(lang => (
              <button
                key={lang}
                className={`${styles.localeBtn} ${i18n.language === lang ? styles.localeBtnActive : ''}`}
                onClick={() => i18n.changeLanguage(lang)}
                aria-pressed={i18n.language === lang}
              >
                {lang === 'ko' ? 'KR' : 'EN'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className={styles.body}>
        {/* Main Content */}
        <div className={styles.content}>
          <Provider store={sharedStore}>
            <div id="panel-AGENT" role="tabpanel" aria-labelledby="tab-AGENT" className={getTabPanelClass('AGENT')}>
              <AgentSetupPanel />
            </div>
            <div id="panel-MCP" role="tabpanel" aria-labelledby="tab-MCP" className={getTabPanelClass('MCP')}>
              <FigmaAgent />
            </div>
            <div id="panel-VIEW" role="tabpanel" aria-labelledby="tab-VIEW" className={getTabPanelClass('VIEW')}>
              <ViewPage html={viewHtml} />
            </div>
            <div id="panel-HELP" role="tabpanel" aria-labelledby="tab-HELP" className={getTabPanelClass('HELP')}>
              <Suspense fallback={<div className={styles.placeholder}><span>Loading...</span></div>}>
                <HelpPage />
              </Suspense>
            </div>
          </Provider>
        </div>
      </div>

      {/* Toast Popup */}
      {toast && (
        <div className={styles.toast} role="status" aria-live="polite">
          <span className={styles.toastIcon}>✓</span>
          <span className={styles.toastMessage}>{t('toast.success')}</span>
          <button className={styles.toastAction} onClick={handleGoToView}>{t('toast.go_to_view')}</button>
          <button className={styles.toastClose} onClick={() => setToast(false)} aria-label={t('toast.close')}>×</button>
        </div>
      )}

    </div>
  );
};

export default FigmaLabApp;
