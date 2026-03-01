import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAtom } from 'jotai';
import { debugLogAtom } from '../atoms';
import styles from '../FigmaAgent.module.scss';

/**
 * Displays the debug log textarea with auto-scroll and a clear button.
 * Renders nothing when the log is empty.
 */
const DebugLogPanel: React.FC = () => {
  const { t } = useTranslation();
  const [debugLog, setDebugLog] = useAtom(debugLogAtom);
  const logRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [debugLog]);

  if (!debugLog) return null;

  return (
    <div className={styles.debugLogWrap}>
      <div className={styles.debugLogHeader}>
        <span className={styles.debugLogTitle} id="debug-log-title">{t('input.debug_log')}</span>
        <button
          className={styles.debugLogClear}
          onClick={() => setDebugLog('')}
          type="button"
          aria-label={t('input.clear_log_label')}
        >
          {t('input.clear_log')}
        </button>
      </div>

      <textarea
        ref={logRef}
        className={styles.debugLogArea}
        readOnly
        value={debugLog}
        rows={8}
        aria-labelledby="debug-log-title"
        aria-live="polite"
      />
    </div>
  );
};

export default DebugLogPanel;
