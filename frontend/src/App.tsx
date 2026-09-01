import React, { useState, useEffect } from 'react';
import type { NavTab } from './components/layout/Sidebar';
import type { HealthStatus, DashboardStats } from './types';
import { checkBackendHealth, getDashboardMetrics } from './services/api';

import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { DashboardView } from './components/dashboard/DashboardView';
import { UploadView } from './components/upload/UploadView';
import { ReconciliationView } from './components/reconciliation/ReconciliationView';
import { ExceptionsView } from './components/exceptions/ExceptionsView';
import { ReviewQueueView } from './components/review/ReviewQueueView';
import { AuditLogsView } from './components/audit/AuditLogsView';
import { ExceptionDetailModal } from './components/exceptions/ExceptionDetailModal';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [selectedExceptionId, setSelectedExceptionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
    const interval = setInterval(fetchStats, 30000); // 30s polling for background status
    return () => clearInterval(interval);
  }, []);

  const titles: Record<NavTab, { title: string; subtitle: string }> = {
    dashboard: {
      title: 'Operational Dashboard',
      subtitle: 'Real-time financial reconciliation metrics and exception resolution analytics'
    },
    upload: {
      title: 'Upload Data Batches',
      subtitle: 'Ingest raw Payments, Settlements, and Fees CSV files'
    },
    reconciliation: {
      title: 'Reconciliation Results',
      subtitle: 'Deterministic matching breakdown and AI guardrail batch actions'
    },
    exceptions: {
      title: 'Exceptions Management',
      subtitle: 'Search and inspect identified financial discrepancies across canonical categories'
    },
    review: {
      title: 'Human Review Queue',
      subtitle: 'Operator review queue for uncertain cases routed by deterministic guardrails'
    },
    audit: {
      title: 'Audit & Compliance Logs',
      subtitle: 'Immutable record of every reconciliation run, guardrail decision, and human review action'
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
          title={titles[activeTab].title}
          subtitle={titles[activeTab].subtitle}
          health={health}
          loading={loading}
          onRefresh={fetchStats}
        />

        <main className="flex-1 overflow-y-auto p-8 bg-slate-950">
          <div className="max-w-7xl mx-auto">
            {activeTab === 'dashboard' && (
              <DashboardView
                stats={dashboardStats}
                loading={loading}
                onNavigate={setActiveTab}
                onSelectException={setSelectedExceptionId}
              />
            )}

            {activeTab === 'upload' && (
              <UploadView
                onReconciliationCompleted={() => {
                  fetchStats();
                  setActiveTab('reconciliation');
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
          </div>
        </main>
      </div>

      {/* Interactive Exception Detail Modal */}
      <ExceptionDetailModal
        exceptionId={selectedExceptionId}
        onClose={() => setSelectedExceptionId(null)}
        onRefreshParent={fetchStats}
      />
    </div>
  );
};

export default App;
