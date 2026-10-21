import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    // Keep diagnostics in the browser console; never send app state to a server.
    console.error('Prottush OS UI error:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return <main className="error-boundary"><section role="alert"><p className="eyebrow">RECOVERY</p><h1>That window ran into a problem.</h1><p>The desktop could not finish rendering this view. You can reload the page to start a fresh UI session. Local appearance preferences remain in this browser.</p><button type="button" onClick={() => window.location.reload()}>Reload Prottush OS</button></section></main>;
    }
    return this.props.children;
  }
}

// Mount the desktop shell into the single application root.
createRoot(document.getElementById('root')).render(
  <React.StrictMode><AppErrorBoundary><App /></AppErrorBoundary></React.StrictMode>
);
