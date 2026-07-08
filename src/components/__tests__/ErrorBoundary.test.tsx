import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ErrorBoundary from '../ErrorBoundary';

vi.mock('../../context/LanguageContext', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

function Bomb() {
  throw new Error('boom');
  return null;
}

// 用于“重置后恢复”测试：由测试控制是否抛错，组件自身不修改标志。
// 这样 React 19 并发渲染中被废弃的渲染通道不会消耗标志，
// 同步重试时仍会抛错，ErrorBoundary 才能正确捕获并显示回退 UI。
let shouldThrow = false;
function RecoverableBomb() {
  if (shouldThrow) throw new Error('boom');
  return <div data-testid="recovered">ok</div>;
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    // 抑制 React / ErrorBoundary 在抛错时输出的预期 console.error 噪声
    vi.spyOn(console, 'error').mockImplementation(() => {});
    shouldThrow = false;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    shouldThrow = false;
  });

  it('正常渲染 children', () => {
    render(
      <ErrorBoundary>
        <div data-testid="child">hello</div>
      </ErrorBoundary>,
    );
    expect(screen.getByTestId('child')).not.toBeNull();
    expect(screen.queryByText('errorBoundary.title')).toBeNull();
  });

  it('子组件抛错时显示错误 UI（含 errorBoundary.title）', () => {
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>,
    );
    expect(screen.getByText('errorBoundary.title')).not.toBeNull();
    // 重置按钮也属于错误 UI 的一部分
    expect(screen.getByText('errorBoundary.backHome')).not.toBeNull();
  });

  it('重置按钮点击后恢复 children', () => {
    shouldThrow = true;
    render(
      <ErrorBoundary>
        <RecoverableBomb />
      </ErrorBoundary>,
    );
    // 抛错后显示错误 UI
    expect(screen.getByText('errorBoundary.title')).not.toBeNull();

    // 关闭抛错，点击重置按钮：setState(hasError:false) 触发重渲染，
    // jsdom 中 location.reload 为 no-op，children 会重新渲染
    shouldThrow = false;
    fireEvent.click(screen.getByText('errorBoundary.backHome'));

    // 子组件恢复渲染，错误 UI 消失
    expect(screen.getByTestId('recovered')).not.toBeNull();
    expect(screen.queryByText('errorBoundary.title')).toBeNull();
  });
});
