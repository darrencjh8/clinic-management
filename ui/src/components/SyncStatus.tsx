import React from 'react';
import { Cloud, CloudOff, ExternalLink, RefreshCw } from 'lucide-react';
import { useStore } from '../store/useStore';
import { useTranslation } from 'react-i18next';

export const SyncStatus: React.FC = () => {
    const {
        spreadsheetId,
        accessToken,
        isError,
        isSyncing,
        syncData,
        userRole
    } = useStore();
    const { t } = useTranslation();

    if (!accessToken || !spreadsheetId) return null;

    const openSheet = () => {
        window.open(`https://docs.google.com/spreadsheets/d/${spreadsheetId}`, '_blank');
    };

    const handleSync = () => {
        syncData();
    };

    return (
        <div className="bg-white border-b border-secondary-light px-6 py-2 flex items-center justify-between text-sm transition-colors relative z-40 shadow-sm">
            <div className="flex items-center gap-4">
                <div className={`flex items-center gap-2 ${isError ? 'text-red-500' : 'text-emerald-600'}`}>
                    {isError ? <CloudOff className="w-4 h-4" /> : <Cloud className="w-4 h-4" />}
                    <span className="font-medium">
                        {isError ? t('sync.connectionError') : isSyncing ? t('sync.syncing') : (userRole === 'admin' ? t('sync.syncedWithSheets') : t('sync.synced'))}
                    </span>
                </div>
            </div>

            <div className="flex items-center gap-3">
                <button
                    onClick={handleSync}
                    disabled={isSyncing}
                    className="flex items-center gap-1.5 text-gray-500 hover:text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Sync Now"
                >
                    <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span className="hidden sm:inline">{isSyncing ? t('sync.syncing') : t('sync.sync')}</span>
                </button>
                {userRole === 'admin' && (
                    <button
                        onClick={openSheet}
                        className="flex items-center gap-1.5 text-gray-500 hover:text-primary transition-colors"
                        title="Open in Google Sheets"
                    >
                        <ExternalLink className="w-4 h-4" />
                        <span className="hidden sm:inline">{t('sync.openSheet')}</span>
                    </button>
                )}
            </div>
        </div>
    );
};
