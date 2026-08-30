import React, { useEffect, useState } from 'react';
import { 
  LayoutDashboard, 
  UploadCloud, 
  Layers, 
  AlertTriangle, 
  CheckSquare, 
  FileText, 
  ShieldCheck, 
  Activity, 
  Database, 
  Cpu, 
  Server,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock
} from 'lucide-react';
import { checkBackendHealth, type HealthStatus } from './services/api';

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'upload' | 'reconciliation' | 'exceptions' | 'review' | 'audit'>('dashboard');
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const fetchHealth = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await checkBackendHealth();
      setHealth(data);
      setLastChecked(new Date());
    } catch (err: any) {
      setError(err?.message || 'Failed to connect to backend service');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'upload', label: 'Upload Data', icon: UploadCloud },
    { id: 'reconciliation', label: 'Reconciliation', icon: Layers },
    { id: 'exceptions', label: 'Exceptions', icon: AlertTriangle },
    { id: 'review', label: 'Review Queue', icon: CheckSquare },
    { id: 'audit', label: 'Audit Logs', icon: FileText },
  ];

  return (
    <div className="flex h-screen bg-slate-900 text-slate-100 font-sans antialiased overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-950 border-r border-slate-800 flex flex-col justify-between shrink-0">
        <div>
          {/* Brand */}
          <div className="p-6 border-b border-slate-800 flex items-center space-x-3">
            <div className="h-9 w-9 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-600/30">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-white">SettleIQ</h1>
              <p className="text-xs text-slate-400 font-medium">Reconciliation MVP</p>
            </div>
          </div>

          {/* Navigation Menu */}
          <nav className="p-4 space-y-1.5">
            <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
              Navigation
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as any)}
                  className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive 
                      ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30' 
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                  }`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? 'text-indigo-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* User / Environment Profile */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/50">
          <div className="flex items-center space-x-3">
            <div className="h-8 w-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-semibold text-indigo-300">
              FO
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-medium text-slate-200 truncate">Finance Operator</p>
              <p className="text-xs text-slate-400 truncate">Phase 0: Initialized</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-slate-900 overflow-y-auto">
        {/* Header */}
        <header className="h-16 bg-slate-950/80 backdrop-blur-md border-b border-slate-800 px-8 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center space-x-3">
            <h2 className="text-base font-semibold text-white capitalize">
              {navItems.find(n => n.id === activeTab)?.label || 'Overview'}
            </h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Phase 0 Baseline
            </span>
          </div>

          {/* Backend Connectivity Badge */}
          <div className="flex items-center space-x-4">
            <button
              onClick={fetchHealth}
              disabled={loading}
              className="flex items-center space-x-2 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-md border border-slate-700 transition"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh Status</span>
            </button>

            <div className="flex items-center space-x-2 bg-slate-950 px-3 py-1.5 rounded-md border border-slate-800">
              <div className={`h-2 w-2 rounded-full ${health?.status === 'healthy' ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
              <span className="text-xs font-medium text-slate-300">
                {loading ? 'Checking...' : health?.status === 'healthy' ? 'FastAPI Connected' : 'Disconnected'}
              </span>
            </div>
          </div>
        </header>

        {/* Main Body */}
        <div className="p-8 max-w-6xl w-full mx-auto space-y-6">
          {/* Phase 0 Verification Banner */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 shadow-sm">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <Activity className="h-5 w-5 text-indigo-400" />
                  <h3 className="text-lg font-semibold text-white">System Communication Status</h3>
                </div>
                <p className="text-sm text-slate-400">
                  Verification of end-to-end communication between React Vite frontend and FastAPI backend.
                </p>
              </div>
              {lastChecked && (
                <div className="flex items-center space-x-1.5 text-xs text-slate-400">
                  <Clock className="h-3.5 w-3.5" />
                  <span>Last verified: {lastChecked.toLocaleTimeString()}</span>
                </div>
              )}
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Health Result */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-4">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">API Health Status</p>
                <div className="mt-2 flex items-center space-x-2">
                  {health?.status === 'healthy' ? (
                    <>
                      <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                      <span className="text-base font-semibold text-emerald-400">Healthy (200 OK)</span>
                    </>
                  ) : error ? (
                    <>
                      <XCircle className="h-5 w-5 text-red-400" />
                      <span className="text-sm font-semibold text-red-400 truncate">{error}</span>
                    </>
                  ) : (
                    <span className="text-sm text-slate-400">Pinging endpoint...</span>
                  )}
                </div>
              </div>

              {/* Service & Version */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-4">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Service Details</p>
                <div className="mt-2 flex items-center space-x-2">
                  <Server className="h-5 w-5 text-indigo-400" />
                  <span className="text-base font-semibold text-slate-200">
                    {health ? `${health.service} v${health.version}` : 'Connecting...'}
                  </span>
                </div>
              </div>

              {/* Environment */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-lg p-4">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Environment</p>
                <div className="mt-2 flex items-center space-x-2">
                  <Cpu className="h-5 w-5 text-purple-400" />
                  <span className="text-base font-semibold text-purple-300 capitalize">
                    {health?.environment || 'Development'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Architecture & Decision Principles Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Core Architectural Pillars */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 space-y-4">
              <div className="flex items-center space-x-2 text-indigo-400">
                <Database className="h-5 w-5" />
                <h4 className="font-semibold text-white">Locked Architectural Foundation</h4>
              </div>
              <ul className="space-y-2.5 text-sm text-slate-300">
                <li className="flex items-start space-x-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 mt-2 shrink-0" />
                  <span><strong>Architecture:</strong> Modular Monolith (FastAPI + React + SQLite).</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 mt-2 shrink-0" />
                  <span><strong>Reconciliation:</strong> Deterministic matching engine (No LLM in matching).</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 mt-2 shrink-0" />
                  <span><strong>AI Governance:</strong> Bounded autonomy with strict deterministic guardrails.</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 mt-2 shrink-0" />
                  <span><strong>Auditability:</strong> Immutable audit logs for all system & human actions.</span>
                </li>
              </ul>
            </div>

            {/* Canonical Exception Types */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-6 space-y-4">
              <div className="flex items-center space-x-2 text-indigo-400">
                <AlertTriangle className="h-5 w-5" />
                <h4 className="font-semibold text-white">Canonical MVP Exception Types</h4>
              </div>
              <div className="grid grid-cols-1 gap-2 text-xs">
                <div className="p-2 bg-slate-900 rounded border border-slate-800 flex justify-between items-center">
                  <span className="font-mono font-semibold text-indigo-300">AMOUNT_MISMATCH</span>
                  <span className="text-slate-400">Amount discrepancies / Fees</span>
                </div>
                <div className="p-2 bg-slate-900 rounded border border-slate-800 flex justify-between items-center">
                  <span className="font-mono font-semibold text-indigo-300">MISSING_SETTLEMENT</span>
                  <span className="text-slate-400">Payment exists without settlement</span>
                </div>
                <div className="p-2 bg-slate-900 rounded border border-slate-800 flex justify-between items-center">
                  <span className="font-mono font-semibold text-indigo-300">DUPLICATE</span>
                  <span className="text-slate-400">Multiple settlement entries</span>
                </div>
                <div className="p-2 bg-slate-900 rounded border border-slate-800 flex justify-between items-center">
                  <span className="font-mono font-semibold text-indigo-300">REFERENCE_MISMATCH</span>
                  <span className="text-slate-400">Reference identifier mismatch</span>
                </div>
                <div className="p-2 bg-slate-900 rounded border border-slate-800 flex justify-between items-center">
                  <span className="font-mono font-semibold text-indigo-300">UNKNOWN</span>
                  <span className="text-slate-400">Fallback ambiguous exception</span>
                </div>
              </div>
            </div>
          </div>

          {/* Section View Placeholder for Active Navigation */}
          {activeTab !== 'dashboard' && (
            <div className="bg-slate-950 border border-dashed border-slate-800 rounded-xl p-8 text-center space-y-3">
              <div className="inline-flex p-3 rounded-full bg-slate-900 text-indigo-400 border border-slate-800">
                {React.createElement(navItems.find(n => n.id === activeTab)?.icon || Layers, { className: 'h-6 w-6' })}
              </div>
              <h4 className="text-base font-semibold text-white">
                {navItems.find(n => n.id === activeTab)?.label} Module
              </h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                This section will be populated in subsequent implementation phases according to the project roadmap.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
