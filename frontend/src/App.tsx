import React, { useState, useEffect } from 'react';
import type { NavTab, HealthStatus, DashboardStats } from './types';
import { checkBackendHealth, getDashboardMetrics } from './services/api';
import { UserProvider, useUser } from './context/UserContext';

import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { DashboardView } from './components/dashboard/DashboardView';
import { UploadView } from './components/upload/UploadView';
import { ReconciliationView } from './components/reconciliation/ReconciliationView';
import { ExceptionsView } from './components/exceptions/ExceptionsView';
import { ReviewQueueView } from './components/review/ReviewQueueView';
import { AuditLogsView } from './components/audit/AuditLogsView';
import { ExceptionDetailModal } from './components/exceptions/ExceptionDetailModal';
import { AccessRestrictedView } from './components/common/AccessRestrictedView';

const AppContent: React.FC = () => {
  const { currentUser, hasPermission } = useUser();
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [selectedExceptionId, setSelectedExceptionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // If active tab is not permitted for the newly switched user, automatically redirect to dashboard
  useEffect(() => {
    if (!hasPermission(activeTab)) {
      setActiveTab('dashboard');
    }
  }, [currentUser, activeTab, hasPermission]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const [h, s] = await Promise.allSettled([
        checkBackendHealth(),
        getDashboardMetrics()
      ]);
      if (h.status === 'fulfilled') setHealth(h.value);
      if (s.status === 'fulfilled') setDashboardStats(s.value);
    } catch {
      // Handled silently
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const titles: Record<NavTab, { title: string; subtitle: string }> = {
    dashboard: {
      title: 'Operational Dashboard',
      subtitle: `${currentUser.roleCategory} Workspace: Real-time reconciliation metrics & operational status`
    },
    upload: {
      title: 'Upload Data Batches',
      subtitle: 'Maker Workspace: Ingest raw Payments, Settlements, and Fees CSV files'
    },
    reconciliation: {
      title: 'Reconciliation Results',
      subtitle: 'Checker Workspace: Deterministic matching breakdown and AI guardrail batch actions'
    },
    exceptions: {
      title: 'Exceptions Management',
      subtitle: 'Checker Workspace: Search and inspect identified financial discrepancies across canonical categories'
    },
    review: {
      title: 'Human Review Queue',
      subtitle: 'Checker Workspace: Operator review queue for uncertain cases routed by deterministic guardrails'
    },
    audit: {
      title: 'Audit & Compliance Logs',
      subtitle: 'Compliance Workspace: Immutable record of every reconciliation run, guardrail decision, and human review action'
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex font-sans antialiased selection:bg-indigo-500 selection:text-white">
      {/* Persistent Navigation Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        reviewQueueCount={dashboardStats?.human_review_count || 0}
        exceptionsCount={dashboardStats?.exceptions_count || 0}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header
          title={titles[activeTab]?.title || 'SettleIQ Platform'}
          subtitle={titles[activeTab]?.subtitle}
          health={health}
          loading={loading}
          onRefresh={fetchStats}
        />

        <main className="flex-1 overflow-y-auto p-8 bg-slate-950">
          <div className="max-w-7xl mx-auto">
            {/* Route Guard: If tab is not permitted, show Access Restricted */}
            {!hasPermission(activeTab) ? (
              <AccessRestrictedView
                attemptedTab={activeTab}
                onGoHome={() => setActiveTab('dashboard')}
              />
            ) : (
              <>
                {activeTab === 'dashboard' && (
                  <DashboardView
                    stats={dashboardStats}
                    loading={loading}
                    onNavigate={setActiveTab}
                    onSelectException={(id) => {
                      if (hasPermission('exceptions')) {
                        setSelectedExceptionId(id);
                      }
                    }}
                  />
                )}

                {activeTab === 'upload' && (
                  <UploadView
                    onReconciliationCompleted={() => {
                      fetchStats();
                      // Operations Analyst goes to Dashboard; Manager (if allowed) can go to Reconciliation
                      if (hasPermission('reconciliation')) {
                        setActiveTab('reconciliation');
                      } else {
                        setActiveTab('dashboard');
                      }
                    }}
                  />
                )}

                {activeTab === 'reconciliation' && (
                  <ReconciliationView
                    stats={dashboardStats}
                    onNavigate={setActiveTab}
                    onRefresh={fetchStats}
                  />
                )}

                {activeTab === 'exceptions' && (
                  <ExceptionsView
                    onSelectException={setSelectedExceptionId}
                  />
                )}

                {activeTab === 'review' && (
                  <ReviewQueueView
                    onRefreshParent={fetchStats}
                    onSelectException={setSelectedExceptionId}
                  />
                )}

                {activeTab === 'audit' && (
                  <AuditLogsView />
                )}
              </>
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
