import React from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useTranslation } from 'react-i18next';
import helpContentKo from '../content/help.md';
import helpContentEn from '../content/help.en.md';
import styles from '../App.module.scss';

/**
 * 도움말 화면을 렌더링하는 Component.
 * Markdown 형태의 도움말 콘텐츠를 파싱하여 출력합니다.
 */
const HelpPage: React.FC = () => {
  const { i18n } = useTranslation();
  const helpContent = i18n.language === 'en' ? helpContentEn : helpContentKo;
  return (
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
};

export default HelpPage;
