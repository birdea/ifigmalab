import React, { Component, ErrorInfo, ReactNode } from 'react';
import styles from './ErrorBoundary.module.scss';
import { reportError } from '../utils/errorReporter';

interface Props {
    children?: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);
        reportError('ErrorBoundary', error);
    }

    public render() {
        if (this.state.hasError) {
            return this.props.fallback || (
                <div className={styles.container}>
                    <h2>Something went wrong. / 오류가 발생했습니다.</h2>
                    <details className={styles.details}>
                        {this.state.error?.toString()}
                    </details>
                    <button
                        onClick={() => window.location.reload()}
                        className={styles.reloadBtn}
                    >
                        Reload Page / 새로 고침
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
