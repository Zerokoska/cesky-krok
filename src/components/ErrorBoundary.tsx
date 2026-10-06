import { Component, type ErrorInfo, type ReactNode } from 'react';

/** Keeps one broken block from blanking the whole page. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="error-box">
          Цей блок не вдалося показати: {this.state.error.message}
          <div>
            <button type="button" className="btn small" style={{ marginTop: 8 }} onClick={() => this.setState({ error: null })}>
              Спробувати ще раз
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
