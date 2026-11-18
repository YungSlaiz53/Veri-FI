import { VeriFiProvider, useVeriFi } from './lib/store';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastContainer } from './components/ToastContainer';
import { LandingPage } from './components/LandingPage';
import { AppShell } from './components/AppShell';

function VeriFiRoot() {
  const { authMode } = useVeriFi();
  return (
    <>
      {authMode === 'unauthenticated' ? <LandingPage /> : <AppShell />}
      <ToastContainer />
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <VeriFiProvider>
        <VeriFiRoot />
      </VeriFiProvider>
    </ErrorBoundary>
  );
}
