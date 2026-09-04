import React, { useState, useEffect } from 'react';
import type { NavTab, DashboardStats } from './types';
import { getDashboardMetrics } from './services/api';
import { UserProvider, useUser } from './context/UserContext';

import { ProfileSelectionView } from './components/auth/ProfileSelectionView';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { DashboardView } from './components/dashboard/DashboardView';
import { UploadView } from './components/upload/UploadView';
import { ReconciliationView } from './components/reconciliation/ReconciliationView';
import { ExceptionsView } from './components/exceptions/ExceptionsView';
import { ReviewQueueView } from './components/review/ReviewQueueView';
import { AuditLogsView } from './components/audit/AuditLogsView';
import { ExceptionDetailModal } from './components/exceptions/ExceptionDetailModal';

const AppContent: React.FC = () => {
  const { currentUser, hasPermission } = useUser();
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [selectedExceptionId, setSelectedExceptionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [exceptionsRefreshKey] = useState(0);

  // If active tab is not permitted for the selected user, automatically reset to dashboard
  useEffect(() => {
    if (currentUser && !hasPermission(activeTab)) {
      setActiveTab('dashboard');
    }
  }, [currentUser, activeTab, hasPermission]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const data = await getDashboardMetrics();
      setDashboardStats(data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchStats();
    }
  }, [currentUser, activeTab]);

  // If no profile is selected, render the Profile Selection Screen
  if (!currentUser) {
    return <ProfileSelectionView />;
  }

  const titles: Record<NavTab, { title: string; subtitle: string }> = {
    dashboard: {
      title: 'Dashboard',
      subtitle: 'Overview of your reconciliation and exceptions'
    },
    upload: {
      title: 'Upload Data',
      subtitle: 'Upload payments, settlements, and fees'
    },
    reconciliation: {
      title: 'Reconciliation',
      subtitle: ''
    },
    exceptions: {
      title: 'Exceptions',
      subtitle: ''
    },
    review: {
      title: 'Review Queue',
      subtitle: ''
    },
    audit: {
      title: 'Audit Logs',
      subtitle: 'Immutable record of reconciliation and review actions'
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex font-sans antialiased selection:bg-blue-600 selection:text-white">
      {/* Persistent Navigation Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        reviewQueueCount={dashboardStats?.human_review_count || 0}
        exceptionsCount={dashboardStats?.exceptions_count || 0}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#f8fafc] dark:bg-slate-950">
        <Header
          title={titles[activeTab]?.title || 'Dashboard'}
          subtitle={titles[activeTab]?.subtitle}
        />

        <main className="flex-1 overflow-y-auto p-8 bg-[#f8fafc] dark:bg-slate-950">
          <div className="max-w-7xl mx-auto">

            {activeTab === 'dashboard' && (
              <DashboardView
                stats={dashboardStats}
                loading={loading}
                onNavigate={setActiveTab}
              />
            )}

            {activeTab === 'upload' && hasPermission('upload') && (
              <UploadView
                onReconciliationCompleted={() => {
                  fetchStats();
                  if (hasPermission('reconciliation')) {
                    setActiveTab('reconciliation');
                  } else {
                    setActiveTab('dashboard');
                  }
                }}
              />
            )}

            {activeTab === 'reconciliation' && hasPermission('reconciliation') && (
              <ReconciliationView
                stats={dashboardStats}
                onNavigate={setActiveTab}
                onRefresh={fetchStats}
              />
            )}

            {activeTab === 'exceptions' && hasPermission('exceptions') && (
              <ExceptionsView
                onSelectException={setSelectedExceptionId}
                runId={dashboardStats?.latest_run_id || undefined}
                refreshKey={exceptionsRefreshKey}
                isInvestigated={Boolean(
                  dashboardStats && (dashboardStats.auto_resolved_count + dashboardStats.human_review_count + (dashboardStats.human_approved_count || 0)) > 0
                )}
              />
            )}

            {activeTab === 'review' && hasPermission('review') && (
              <ReviewQueueView
                onRefreshParent={fetchStats}
                onSelectException={setSelectedExceptionId}
                runId={dashboardStats?.latest_run_id || undefined}
              />
            )}

            {activeTab === 'audit' && hasPermission('audit') && (
              <AuditLogsView />
            )}
          </div>
        </main>
      </div>

      {/* Interactive Exception Detail Modal */}
      {selectedExceptionId && hasPermission('exceptions') && (
        <ExceptionDetailModal
          exceptionId={selectedExceptionId}
          onClose={() => setSelectedExceptionId(null)}
          onRefreshParent={fetchStats}
        />
      )}
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <UserProvider>
      <AppContent />
    </UserProvider>
  );
};

export default App;
