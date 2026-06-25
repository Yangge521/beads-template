import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message?: string;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, message: undefined });
    // 回到首页
    history.pushState(null, '', location.pathname);
    location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="page error-boundary">
          <div className="empty-state">
            <p className="empty-state__icon">😵</p>
            <p className="empty-state__title">页面出错了</p>
            <p className="empty-state__desc">
              {this.state.message || '发生了未知错误'}
            </p>
            <button type="button" className="empty-state__action" onClick={this.handleReset}>
              返回首页
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
