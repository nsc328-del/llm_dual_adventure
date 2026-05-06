import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center p-8" style={{ background: 'var(--theme-bg)' }}>
          <div className="pixel-border p-6 max-w-md text-center" style={{ background: 'var(--theme-bg-secondary)' }}>
            <h2 className="pixel-text text-xs mb-4" style={{ color: '#ef4444' }}>
              出错了
            </h2>
            <p className="text-sm mb-4" style={{ color: 'var(--theme-text-secondary)' }}>
              {this.state.error.message}
            </p>
            <button
              className="pixel-btn pixel-btn-primary"
              onClick={() => {
                this.setState({ error: null });
                window.location.reload();
              }}
            >
              刷新页面
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
