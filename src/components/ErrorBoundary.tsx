import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { useTranslation } from '../context/LanguageContext';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message?: string;
  errorStack?: string;
  componentStack?: string;
}

// 错误 UI 内部组件：可使用 useTranslation hook
function ErrorFallback({ message, errorStack, componentStack, onReset }: {
  message?: string;
  errorStack?: string;
  componentStack?: string;
  onReset: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="page error-boundary">
      <div className="empty-state">
        <p className="empty-state__icon" aria-hidden="true">😵</p>
        <p className="empty-state__title">{t('errorBoundary.title')}</p>
        <p className="empty-state__desc">
          {message || t('errorBoundary.unknown')}
        </p>
        {errorStack && (
          <pre data-error-stack style={{ textAlign: 'left', fontSize: 12, background: '#f0f0f0', padding: 8, borderRadius: 6, overflow: 'auto', maxWidth: 600, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {errorStack}
          </pre>
        )}
        {componentStack && (
          <pre data-component-stack style={{ textAlign: 'left', fontSize: 12, background: '#f8f8f8', padding: 8, borderRadius: 6, overflow: 'auto', maxWidth: 600, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {componentStack}
          </pre>
        )}
        <button type="button" className="empty-state__action" onClick={onReset}>
          {t('errorBoundary.backHome')}
        </button>
      </div>
    </div>
  );
}

export default class ErrorBoundary extends Component<Props, State> {
  override state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message, errorStack: error.stack };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info);
    this.setState({ componentStack: info.componentStack ?? undefined });
  }

  handleReset = () => {
    this.setState({ hasError: false, message: undefined });
    // 回到首页（replaceState 避免历史栈冗余）
    history.replaceState(null, '', location.pathname);
    location.reload();
  };

  override render() {
    if (this.state.hasError) {
      return (
        <ErrorFallback
          message={this.state.message}
          errorStack={this.state.errorStack}
          componentStack={this.state.componentStack}
          onReset={this.handleReset}
        />
      );
    }
    return this.props.children;
  }
}
