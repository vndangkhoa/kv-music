import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// Catches render crashes (e.g. storage blocked in in-app browsers like
// Messenger's WebView) and shows a recovery screen instead of a blank page.
class AppErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: unknown) {
    console.error('kv-music app crashed:', error)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          height: '100vh',
          width: '100vw',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          background: '#111111',
          color: '#fff',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          textAlign: 'center',
          padding: '24px',
        }}>
          <div style={{ fontSize: '40px', fontWeight: 700 }}>🎵</div>
          <p style={{ fontSize: '16px', opacity: 0.9 }}>Có lỗi xảy ra khi tải trang.</p>
          <a
            href="/"
            style={{
              padding: '10px 22px',
              borderRadius: '999px',
              background: 'linear-gradient(90deg,#ff5500,#ff8f1f)',
              color: '#fff',
              fontWeight: 700,
              textDecoration: 'none',
              fontSize: '14px',
            }}
          >
            Tải lại trang chủ
          </a>
        </div>
      )
    }
    return this.props.children
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </React.StrictMode>,
)
