/**
 * Profile Selection Landing View
 *
 * Renders the introductory portal and Maker-Checker role selection interface for SettleIQ.
 * Allows users to choose between 'Operations Analyst' (Maker) and 'Reconciliation Manager'
 * (Checker) profiles with contextual role descriptions, single-viewport responsive layout,
 * and branded financial background styling.
 */

import React from 'react';
import { useUser, DEMO_USERS } from '../../context/UserContext';
import logoImg from '../../assets/logo.png';

/**
 * Interactive landing page presenting Maker/Checker profile options to initiate a session.
 */
export const ProfileSelectionView: React.FC = () => {
  const { selectProfile } = useUser();

  const analyst = DEMO_USERS.analyst;
  const manager = DEMO_USERS.manager;

  return (
    <div className="h-screen max-h-screen w-full bg-[#f8fafc] dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col justify-between items-center px-4 sm:px-8 py-3 sm:py-5 md:py-6 relative overflow-hidden font-sans antialiased selection:bg-blue-600 selection:text-white select-none box-border">
      {/* Google Font for the sketch/handwritten accent in the bottom-left */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@500;600;700&display=swap');
        .font-sketch {
          font-family: 'Caveat', cursive, sans-serif;
        }
      `}</style>

      {/* =========================================================================
          BACKGROUND DECORATIVE LAYER (Matches Reference Artwork)
          ========================================================================= */}
      
      {/* 1. Ambient Soft Sky Gradient Wash (Top-Left) */}
      <div className="absolute -top-32 -left-32 w-[650px] h-[650px] bg-gradient-to-br from-blue-200/40 via-sky-100/25 to-transparent dark:from-blue-900/15 dark:via-sky-950/10 rounded-full blur-3xl pointer-events-none" />

      {/* 2. Soft Ambient Warm Glow (Center-Left) */}
      <div className="absolute top-1/3 -left-48 w-[500px] h-[500px] bg-gradient-to-tr from-amber-100/30 via-orange-50/20 to-transparent dark:from-amber-950/10 rounded-full blur-3xl pointer-events-none" />

      {/* 3. Soft Ambient Blue Glow (Right) */}
      <div className="absolute top-1/4 -right-48 w-[600px] h-[600px] bg-gradient-to-bl from-blue-100/35 via-indigo-50/20 to-transparent dark:from-blue-950/15 rounded-full blur-3xl pointer-events-none" />

      {/* 4. Full-Screen Vector Graphics Layer (Rising Trendline, Bars, Flowing Wave) */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none select-none z-0"
        viewBox="0 0 1440 900"
        preserveAspectRatio="none"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="waveGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.04" />
            <stop offset="50%" stopColor="#60A5FA" stopOpacity="0.06" />
            <stop offset="100%" stopColor="#93C5FD" stopOpacity="0.09" />
          </linearGradient>

          <linearGradient id="trendGradient" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#93C5FD" stopOpacity="0.15" />
            <stop offset="40%" stopColor="#60A5FA" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#2563EB" stopOpacity="0.75" />
          </linearGradient>
        </defs>

        {/* Faint rising bar-chart columns in upper-right */}
        <g opacity="0.035" className="fill-blue-600 dark:fill-blue-400">
          <rect x="1200" y="320" width="18" height="180" rx="9" />
          <rect x="1245" y="270" width="18" height="230" rx="9" />
          <rect x="1290" y="210" width="18" height="290" rx="9" />
          <rect x="1335" y="160" width="18" height="340" rx="9" />
          <rect x="1380" y="110" width="18" height="390" rx="9" />
        </g>

        {/* Dynamic rising financial trendline with vertex dots (Reference Right Side) */}
        <path
          d="M 640 590 C 800 580, 920 540, 1060 480 C 1170 435, 1260 460, 1340 370 C 1390 315, 1420 300, 1440 280"
          stroke="url(#trendGradient)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        {/* Vertex dots along trendline */}
        <circle cx="1060" cy="480" r="4.5" fill="#3B82F6" opacity="0.75" />
        <circle cx="1060" cy="480" r="8" stroke="#3B82F6" strokeWidth="1" opacity="0.25" />
        <circle cx="1340" cy="370" r="4.5" fill="#2563EB" opacity="0.85" />
        <circle cx="1340" cy="370" r="8" stroke="#2563EB" strokeWidth="1" opacity="0.3" />

        {/* Flowing bottom landscape curve (Reference Bottom Area) */}
        <path
          d="M -100 780 C 250 850, 500 720, 850 780 C 1150 830, 1300 750, 1540 730 L 1540 950 L -100 950 Z"
          fill="url(#waveGradient)"
        />
        <path
          d="M -50 750 C 320 810, 620 740, 920 790 C 1220 840, 1380 770, 1500 740"
          stroke="#94A3B8"
          strokeWidth="1.2"
          strokeOpacity="0.18"
          fill="none"
        />
      </svg>

      {/* =========================================================================
          TOP SECTION: BRANDING & MOTTO
          ========================================================================= */}
      <header className="flex flex-col items-center justify-center pt-1 sm:pt-2 z-10 text-center shrink-0">
        {/* SettleIQ Logo + Wordmark */}
        <div className="flex items-center justify-center space-x-2.5 sm:space-x-3">
          <img
            src={logoImg}
            alt="SettleIQ Logo"
            className="h-8 sm:h-9 md:h-10 w-auto object-contain drop-shadow-sm"
          />
          <span className="text-2xl sm:text-3xl md:text-[34px] font-black tracking-tight text-slate-900 dark:text-slate-100 leading-none">
            Settle<span className="text-[#007ADE]">IQ</span>
          </span>
        </div>

        {/* Subtitle / Value Proposition */}
        <p className="text-xs sm:text-sm font-semibold text-slate-400 dark:text-slate-500 tracking-wide mt-1.5">
          Reconcile. Investigate. Resolve.
        </p>
      </header>

      {/* =========================================================================
          CENTER SECTION: MAIN HEADING & DUAL PROFILE SELECTION
          ========================================================================= */}
      <main className="w-full max-w-4xl mx-auto flex flex-col items-center justify-center my-auto py-2 sm:py-4 z-10 shrink-0">
        {/* Main Heading */}
        <div className="text-center mb-6 sm:mb-8 md:mb-10">
          <h1 className="text-2xl sm:text-3xl md:text-[38px] font-black text-slate-900 dark:text-slate-100 tracking-tight leading-tight">
            Select Your Profile
          </h1>
          {/* Centered Decorative Gradient Bar (Reference Exact Accent) */}
          <div className="w-10 sm:w-12 h-1 bg-gradient-to-r from-blue-600 via-blue-500 to-sky-400 rounded-full mx-auto mt-2 sm:mt-2.5 shadow-sm" />
        </div>

        {/* Profile Circles Container (Two Polished Neumorphic Circles) */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-8 sm:gap-12 md:gap-18 w-full px-4">
          
          {/* PROFILE 1: Priyanshu Gupta (Operations Analyst / Maker) */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => selectProfile('analyst')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                selectProfile('analyst');
              }
            }}
            className="group flex flex-col items-center cursor-pointer focus:outline-none"
            aria-label={`Select profile for ${analyst.name}, ${analyst.roleTitle}`}
          >
            {/* Circle Presentation with Warm Amber Aura & Tactile Elevation */}
            <div
              className="w-32 h-32 sm:w-36 sm:h-36 md:w-42 md:h-42 rounded-full relative flex items-center justify-center transition-all duration-300 ease-out 
                         bg-gradient-to-b from-white via-orange-50/40 to-amber-50/70 dark:from-slate-900 dark:via-amber-950/30 dark:to-orange-950/40
                         border-2 border-amber-300/80 dark:border-amber-500/60
                         shadow-[0_12px_32px_-6px_rgba(245,158,11,0.22),inset_0_2px_7px_rgba(255,255,255,0.95),inset_0_-3px_10px_rgba(245,158,11,0.12)]
                         group-hover:scale-105 group-hover:-translate-y-2 
                         group-hover:shadow-[0_22px_44px_-6px_rgba(245,158,11,0.38),0_0_0_2.5px_rgba(251,191,36,0.9),inset_0_2px_10px_rgba(255,255,255,1)]"
            >
              {/* Silhouette Avatar (Warm Copper/Amber #C25E00) */}
              <svg
                viewBox="0 0 64 64"
                fill="currentColor"
                className="w-13 h-13 sm:w-15 sm:h-15 md:w-17 md:h-17 text-[#c25e00] dark:text-amber-500 transition-transform duration-300 group-hover:scale-105 drop-shadow-sm"
                aria-hidden="true"
              >
                {/* Silhouette Head */}
                <circle cx="32" cy="21" r="9.5" />
                {/* Silhouette Shoulders/Torso */}
                <path d="M17.5 48.5C17.5 40 24 33.5 32 33.5C40 33.5 46.5 40 46.5 48.5C46.5 49.5 45.8 50 44.8 50H19.2C18.2 50 17.5 49.5 17.5 48.5Z" />
              </svg>
            </div>

            {/* Profile Name & Designation */}
            <div className="text-center mt-3.5 sm:mt-4">
              <h2 className="text-lg sm:text-xl md:text-[22px] font-black text-slate-900 dark:text-slate-100 tracking-tight transition-colors group-hover:text-amber-700 dark:group-hover:text-amber-400 leading-snug">
                {analyst.name}
              </h2>
              <p className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400 mt-0.5 tracking-normal">
                {analyst.roleTitle}
              </p>
            </div>
          </div>

          {/* PROFILE 2: Yash Jain (Reconciliation Manager / Checker) */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => selectProfile('manager')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                selectProfile('manager');
              }
            }}
            className="group flex flex-col items-center cursor-pointer focus:outline-none"
            aria-label={`Select profile for ${manager.name}, ${manager.roleTitle}`}
          >
            {/* Circle Presentation with Royal Blue Aura & Tactile Elevation */}
            <div
              className="w-32 h-32 sm:w-36 sm:h-36 md:w-42 md:h-42 rounded-full relative flex items-center justify-center transition-all duration-300 ease-out 
                         bg-gradient-to-b from-white via-blue-50/40 to-sky-50/70 dark:from-slate-900 dark:via-blue-950/30 dark:to-sky-950/40
                         border-2 border-blue-300/80 dark:border-blue-500/60
                         shadow-[0_12px_32px_-6px_rgba(37,99,235,0.24),inset_0_2px_7px_rgba(255,255,255,0.95),inset_0_-3px_10px_rgba(37,99,235,0.12)]
                         group-hover:scale-105 group-hover:-translate-y-2 
                         group-hover:shadow-[0_22px_44px_-6px_rgba(37,99,235,0.40),0_0_0_2.5px_rgba(96,165,250,0.9),inset_0_2px_10px_rgba(255,255,255,1)]"
            >
              {/* Silhouette Avatar (Vibrant Royal Blue #1D4ED8) */}
              <svg
                viewBox="0 0 64 64"
                fill="currentColor"
                className="w-13 h-13 sm:w-15 sm:h-15 md:w-17 md:h-17 text-[#1d4ed8] dark:text-blue-500 transition-transform duration-300 group-hover:scale-105 drop-shadow-sm"
                aria-hidden="true"
              >
                {/* Silhouette Head */}
                <circle cx="32" cy="21" r="9.5" />
                {/* Silhouette Shoulders/Torso */}
                <path d="M17.5 48.5C17.5 40 24 33.5 32 33.5C40 33.5 46.5 40 46.5 48.5C46.5 49.5 45.8 50 44.8 50H19.2C18.2 50 17.5 49.5 17.5 48.5Z" />
              </svg>
            </div>

            {/* Profile Name & Designation */}
            <div className="text-center mt-3.5 sm:mt-4">
              <h2 className="text-lg sm:text-xl md:text-[22px] font-black text-slate-900 dark:text-slate-100 tracking-tight transition-colors group-hover:text-blue-600 dark:group-hover:text-blue-400 leading-snug">
                {manager.name}
              </h2>
              <p className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400 mt-0.5 tracking-normal">
                {manager.roleTitle}
              </p>
            </div>
          </div>

        </div>
      </main>

      {/* =========================================================================
          BOTTOM SECTION: ARTISTIC ACCENTS (Handwritten script & tracked caps)
          ========================================================================= */}
      <footer className="w-full relative z-10 flex items-end justify-between px-2 sm:px-6 pb-1 shrink-0">
        {/* Bottom-Left: Angled Sketch / Handwritten Watermark Text (Reference Exact Match) */}
        <div className="pointer-events-none select-none -rotate-[13deg] opacity-75 transform -translate-y-1">
          <div className="font-sketch text-slate-400 dark:text-slate-500 text-xl sm:text-2xl md:text-3xl font-semibold leading-[0.95] tracking-wide">
            <p>From</p>
            <p>reconciliation</p>
            <p className="relative inline-block mt-0.5">
              to clarity
              {/* Hand-drawn sketch underline */}
              <svg
                className="absolute -bottom-1.5 left-0 w-full h-2.5 text-slate-400 dark:text-slate-500"
                viewBox="0 0 100 12"
                fill="none"
                preserveAspectRatio="none"
              >
                <path
                  d="M 2 8 C 25 3, 65 10, 98 6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </p>
          </div>
        </div>

        {/* Bottom-Right: Clean Minimalist Tracked Caps (Reference Exact Match) */}
        <div className="pointer-events-none select-none text-right opacity-65 pb-1">
          <p className="text-[9px] sm:text-[10px] font-bold tracking-[0.22em] text-slate-400 dark:text-slate-500 uppercase leading-relaxed">
            ACCURATE DATA
          </p>
          <p className="text-[9px] sm:text-[10px] font-bold tracking-[0.22em] text-slate-400 dark:text-slate-500 uppercase leading-relaxed">
            STRONGER DECISIONS
          </p>
          {/* Subtle horizontal accent divider */}
          <div className="w-8 h-[1.5px] bg-slate-300 dark:bg-slate-700 ml-auto mt-1.5 rounded-full" />
        </div>
      </footer>
    </div>
  );
};
