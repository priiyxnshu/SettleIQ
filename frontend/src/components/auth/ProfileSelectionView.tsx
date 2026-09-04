import React from 'react';
import {
  UploadCloud,
  Layers,
  ArrowRight,
  UserCheck
} from 'lucide-react';
import { useUser, DEMO_USERS } from '../../context/UserContext';
import logoImg from '../../assets/logo.png';

export const ProfileSelectionView: React.FC = () => {
  const { selectProfile } = useUser();

  const analyst = DEMO_USERS.analyst;
  const manager = DEMO_USERS.manager;

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col justify-between p-6 md:p-12 relative overflow-hidden font-sans antialiased selection:bg-blue-600 selection:text-white">
      {/* Background Subtle Gradient Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-100/50 dark:bg-blue-950/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-amber-100/50 dark:bg-amber-950/20 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header / Branding */}
      <div className="max-w-6xl w-full mx-auto flex items-center justify-between z-10">
        <div className="flex items-center space-x-3">
          <img src={logoImg} alt="SettleIQ Logo" className="h-9 w-auto object-contain" />
          <span className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-[#E6E6E6] leading-tight">
            Settle<span className="bg-gradient-to-r from-[#007ADE] to-[#01A8D9] bg-clip-text text-transparent font-black">IQ</span>
          </span>
        </div>
        <div className="hidden sm:flex items-center space-x-2 text-xs text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-semibold">Demo Authentication Mode</span>
        </div>
      </div>

      {/* Center Content: Title & Profile Cards */}
      <div className="max-w-4xl w-full mx-auto my-auto py-12 z-10 space-y-10">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full text-xs font-bold bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800/60 mb-1">
            <UserCheck className="h-3.5 w-3.5" />
            <span>Maker-Checker Financial Operations</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
            Select Your Demo Profile
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xl mx-auto leading-relaxed font-medium">
            SettleIQ enforces strict separation of duties between operational data ingestion (Maker) and reconciliation investigation & approvals (Checker).
          </p>
        </div>

        {/* 2 Interactive Profile Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
          {/* Card 1: Priyanshu Gupta (Operations Analyst / Maker) */}
          <div 
            onClick={() => selectProfile('analyst')}
            className="group relative bg-white dark:bg-slate-900 hover:border-amber-400/80 dark:hover:border-amber-500/80 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 transition-all duration-200 cursor-pointer flex flex-col justify-between shadow-sm hover:shadow-xl hover:shadow-amber-500/5 hover:-translate-y-1"
          >
            <div className="space-y-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-4">
                  <div className="h-14 w-14 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/80 flex items-center justify-center text-lg font-black text-amber-700 dark:text-amber-300 shadow-inner group-hover:scale-105 transition">
                    {analyst.initials}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 group-hover:text-amber-700 dark:group-hover:text-amber-400 transition">
                      {analyst.name}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{analyst.roleTitle}</p>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/80">
                  {analyst.roleCategory}
                </span>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                {analyst.description}. Ingests raw payments, processor settlements, and fee schedules, validates data schemas, and triggers automated matching.
              </p>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500 block">
                  Accessible Sections
                </span>
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1 rounded-lg text-xs font-semibold bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center space-x-1.5">
                    <Layers className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                    <span>Dashboard</span>
                  </span>
                  <span className="px-3 py-1 rounded-lg text-xs font-semibold bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center space-x-1.5">
                    <UploadCloud className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                    <span>Upload Data</span>
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-8">
              <button
                type="button"
                className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-2xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition shadow-md shadow-amber-500/20"
              >
                <span>Enter as Operations Analyst</span>
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition" />
              </button>
            </div>
          </div>

          {/* Card 2: Yash Jain (Reconciliation Manager / Checker) */}
          <div 
            onClick={() => selectProfile('manager')}
            className="group relative bg-white dark:bg-slate-900 hover:border-blue-400/80 dark:hover:border-blue-500/80 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 transition-all duration-200 cursor-pointer flex flex-col justify-between shadow-sm hover:shadow-xl hover:shadow-blue-500/5 hover:-translate-y-1"
          >
            <div className="space-y-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-4">
                  <div className="h-14 w-14 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/80 flex items-center justify-center text-lg font-black text-blue-700 dark:text-blue-300 shadow-inner group-hover:scale-105 transition">
                    {manager.initials}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 group-hover:text-blue-700 dark:group-hover:text-blue-400 transition">
                      {manager.name}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{manager.roleTitle}</p>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/80">
                  {manager.roleCategory}
                </span>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                {manager.description}. Reviews match breakdowns, inspects AI evidence, verifies guardrail outcomes, and executes approval or rejection decisions.
              </p>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500 block">
                  Accessible Sections
                </span>
                <div className="flex flex-wrap gap-1.5">
                  <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                    Dashboard
                  </span>
                  <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                    Reconciliation
                  </span>
                  <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                    Exceptions
                  </span>
                  <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                    Review Queue
                  </span>
                  <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                    Audit Logs
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-8">
              <button
                type="button"
                className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-2xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white transition shadow-md shadow-blue-600/20"
              >
                <span>Enter as Reconciliation Manager</span>
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="max-w-6xl w-full mx-auto text-center text-xs text-slate-400 dark:text-slate-500 font-medium z-10">
        SettleIQ • Deterministic Parity & Explainable Financial AI
      </div>
    </div>
  );
};
