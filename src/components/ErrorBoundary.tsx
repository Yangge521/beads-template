import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { useTranslation } from '../context/LanguageContext';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message?: string;
}

// 错误 UI 内部组件：可使用 useTranslation hook
function ErrorFallback({ message, onReset }: { message?: string; onReset: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="page error-boundary">
      <div className="empty-state">
        <p className="empty-state__icon" aria-hidden="true">😵</p>
        <p className="empty-state__title">{t('errorBoundary.title')}</p>
        <p className="empty-state__desc">
          {message || t('errorBoundary.unknown')}
        </p>
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
    return { hasError: true, message: error.message };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info);
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
        <ErrorFallback message={this.state.message} onReset={this.handleReset} />
      );
    }
    return this.props.children;
  }
}
