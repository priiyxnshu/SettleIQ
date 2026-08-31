import React from 'react';
import {
  ShieldCheck,
  UploadCloud,
  Layers,
  ArrowRight,
  UserCheck
} from 'lucide-react';
import { useUser, DEMO_USERS } from '../../context/UserContext';

export const ProfileSelectionView: React.FC = () => {
  const { selectProfile } = useUser();

  const analyst = DEMO_USERS.analyst;
  const manager = DEMO_USERS.manager;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-6 md:p-12 relative overflow-hidden font-sans antialiased selection:bg-indigo-500 selection:text-white">
      {/* Background Subtle Gradient Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header / Branding */}
      <div className="max-w-6xl w-full mx-auto flex items-center justify-between z-10">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-white shadow-xl shadow-indigo-600/30">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white leading-tight">SettleIQ</h1>
            <p className="text-xs text-slate-400 font-medium">Reconciliation MVP</p>
          </div>
        </div>
        <div className="hidden sm:flex items-center space-x-2 text-xs text-slate-400 bg-slate-900/60 px-3 py-1.5 rounded-lg border border-slate-800">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Demo Authentication Mode</span>
        </div>
      </div>

      {/* Center Content: Title & Profile Cards */}
      <div className="max-w-4xl w-full mx-auto my-auto py-12 z-10 space-y-10">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 mb-1">
            <UserCheck className="h-3.5 w-3.5" />
            <span>Maker-Checker Financial Operations</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
            Select Your Demo Profile
          </h2>
          <p className="text-sm text-slate-400 max-w-xl mx-auto leading-relaxed">
            SettleIQ enforces strict separation of duties between operational data ingestion (Maker) and reconciliation investigation & approvals (Checker).
          </p>
        </div>

        {/* 2 Interactive Profile Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
          {/* Card 1: Priyanshu Gupta (Operations Analyst / Maker) */}
          <div 
            onClick={() => selectProfile('analyst')}
            className="group relative bg-slate-900/70 hover:bg-slate-900 border border-slate-800 hover:border-amber-500/50 rounded-2xl p-7 transition-all duration-200 cursor-pointer flex flex-col justify-between shadow-lg hover:shadow-amber-500/5 hover:-translate-y-1"
          >
            <div className="space-y-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3.5">
                  <div className="h-12 w-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-base font-bold text-amber-300 shadow-inner group-hover:scale-105 transition">
                    {analyst.initials}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white group-hover:text-amber-300 transition">
                      {analyst.name}
                    </h3>
                    <p className="text-xs text-slate-400 font-medium">{analyst.roleTitle}</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                  {analyst.roleCategory}
                </span>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                {analyst.description}. Ingests raw payments, processor settlements, and fee schedules, validates data schemas, and triggers automated matching.
              </p>

              <div className="pt-2 border-t border-slate-800/80 space-y-2">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">
                  Accessible Sections
                </span>
                <div className="flex flex-wrap gap-1.5">
                  <span className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-slate-950 text-slate-300 border border-slate-800 flex items-center space-x-1">
                    <Layers className="h-3 w-3 text-amber-400" />
                    <span>Dashboard</span>
                  </span>
                  <span className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-slate-950 text-slate-300 border border-slate-800 flex items-center space-x-1">
                    <UploadCloud className="h-3 w-3 text-amber-400" />
                    <span>Upload Data</span>
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-6">
              <button
                type="button"
                className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition shadow-md shadow-amber-500/20"
              >
                <span>Enter as Operations Analyst</span>
                <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition" />
              </button>
            </div>
          </div>

          {/* Card 2: Yash Jain (Reconciliation Manager / Checker) */}
          <div 
            onClick={() => selectProfile('manager')}
            className="group relative bg-slate-900/70 hover:bg-slate-900 border border-slate-800 hover:border-indigo-500/50 rounded-2xl p-7 transition-all duration-200 cursor-pointer flex flex-col justify-between shadow-lg hover:shadow-indigo-500/5 hover:-translate-y-1"
          >
            <div className="space-y-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3.5">
                  <div className="h-12 w-12 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-base font-bold text-indigo-300 shadow-inner group-hover:scale-105 transition">
                    {manager.initials}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white group-hover:text-indigo-300 transition">
                      {manager.name}
                    </h3>
                    <p className="text-xs text-slate-400 font-medium">{manager.roleTitle}</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
                  {manager.roleCategory}
                </span>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                {manager.description}. Reviews match breakdowns, inspects AI evidence, verifies guardrail outcomes, and executes approval or rejection decisions.
              </p>

              <div className="pt-2 border-t border-slate-800/80 space-y-2">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">
                  Accessible Sections
                </span>
                <div className="flex flex-wrap gap-1.5">
                  <span className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-slate-950 text-slate-300 border border-slate-800">
                    Dashboard
                  </span>
                  <span className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-slate-950 text-slate-300 border border-slate-800">
                    Reconciliation
                  </span>
                  <span className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-slate-950 text-slate-300 border border-slate-800">
                    Exceptions
                  </span>
                  <span className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-slate-950 text-slate-300 border border-slate-800">
                    Review Queue
                  </span>
                  <span className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-slate-950 text-slate-300 border border-slate-800">
                    Audit Logs
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-6">
              <button
                type="button"
                className="w-full flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition shadow-md shadow-indigo-600/20"
              >
                <span>Enter as Reconciliation Manager</span>
                <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="max-w-6xl w-full mx-auto text-center text-xs text-slate-500 z-10">
        SettleIQ • Deterministic Parity & Explainable Financial AI
      </div>
    </div>
  );
};
