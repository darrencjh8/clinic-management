import { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { TreatmentEntry } from './components/TreatmentEntry';
import { PatientManager } from './components/PatientManager';
import { TreatmentHistory } from './components/TreatmentHistory';
import { Reporting } from './components/Reporting';
import { LoginScreen } from './components/LoginScreen';
import { useStore, StoreProvider } from './store/useStore';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ToastProvider } from './context/ToastContext';

function AppContent() {
  const [currentView, setCurrentView] = useState('treatments');
  const {
    isLoading,
    isError,
    errorType,
    accessToken,
    spreadsheetId,
    setSheetId,
    handleLoginSuccess,
    userRole
  } = useStore();
  const { t } = useTranslation();

  // Auto-retry logic for connection errors
  useEffect(() => {
    if (isError) {
      const hasRetried = sessionStorage.getItem('retry_attempted');
      if (!hasRetried) {
        sessionStorage.setItem('retry_attempted', 'true');
        window.location.reload();
      }
    } else if (accessToken && spreadsheetId && !isLoading) {
      // Successful session, clear the retry flag
      sessionStorage.removeItem('retry_attempted');
    }
  }, [isError, accessToken, spreadsheetId, isLoading]);

  const renderView = () => {
    switch (currentView) {
      case 'treatments':
        return <TreatmentEntry />;
      case 'patients':
        return <PatientManager />;
      case 'history':
        return <TreatmentHistory />;
      case 'reporting':
        return userRole === 'admin' ? <Reporting /> : <TreatmentEntry />;
      default:
        return <TreatmentEntry />;
    }
  };

  // 1. Auth Check
  if (!accessToken) {
    return (
      <LoginScreen
        onLoginSuccess={handleLoginSuccess}
        onSpreadsheetIdSubmit={setSheetId}
        userRole={userRole}
      />
    );
  }

  // 2. Sheet Check
  if (!spreadsheetId) {
    return (
      <LoginScreen
        onLoginSuccess={handleLoginSuccess}
        onSpreadsheetIdSubmit={setSheetId}
        initialToken={accessToken}
        userRole={userRole}
      />
    );
  }

  // 3. Loading
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white transition-colors">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-secondary-light border-t-primary rounded-full animate-spin"></div>
          <p className="text-secondary-dark font-medium">{t('common.loadingFromSheets')}</p>
        </div>
      </div>
    );
  }

  // 4. Error
  if (isError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white p-4 transition-colors">
        <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 text-center border-2 border-secondary-light">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-secondary-dark mb-2">
            {errorType === 'AUTH' ? t('common.authFailed') : t('common.connectionError')}
          </h2>
          <p className="text-gray-600 mb-8">
            {errorType === 'AUTH'
              ? t('common.authFailedDescription')
              : t('common.connectionErrorDescription')}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-primary text-white py-3 rounded-xl font-medium hover:bg-opacity-90 transition-colors flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            {errorType === 'AUTH' ? t('common.signInAgain') : t('common.retryConnection')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-secondary-light transition-colors overflow-hidden">
      <Layout currentView={currentView} onNavigate={setCurrentView}>
        {renderView()}
      </Layout>
    </div>
  );
}

function App() {
  return (
    <StoreProvider>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </StoreProvider>
  );
}

export default App;
