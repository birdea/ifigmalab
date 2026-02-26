import React, { useRef, useEffect } from 'react';
import { useAtomValue } from 'jotai';
import { generatedHtmlAtom } from '../atoms';
import styles from '../FigmaAgent.module.scss';

const PreviewFrame: React.FC = () => {
  const html = useAtomValue(generatedHtmlAtom);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // iframe 내용 높이에 맞게 자동 리사이즈
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const resize = () => {
      try {
        const doc = iframe.contentDocument;
        if (doc?.body) {
          iframe.style.height = `${doc.body.scrollHeight}px`;
        }
      } catch { /* cross-origin 등 무시 */ }
    };

    iframe.addEventListener('load', resize);
    return () => iframe.removeEventListener('load', resize);
  }, [html]);

  if (!html) return null;

  return (
    <div className={styles.previewWrapper}>
      <iframe
        ref={iframeRef}
        className={styles.previewFrame}
        srcDoc={html}
        sandbox="allow-scripts allow-same-origin"
        referrerPolicy="no-referrer"
        title="AI Generated Preview"
      />
    </div>
  );
};

export default PreviewFrame;
