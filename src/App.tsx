import React, { useState } from 'react';
import { MobileAppPreview } from './components/MobileAppPreview';
import {
  FlutterCodeExplorer,
  type CodeStudioTab,
} from './components/FlutterCodeExplorer';

type MobileWorkspacePane = 'preview' | 'code';

export default function App() {
  const [studioTab, setStudioTab] = useState<CodeStudioTab>('structure');
  const [mobilePane, setMobilePane] = useState<MobileWorkspacePane>('preview');

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Clean 3-Zone Top Bar */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-8 px-4 py-3 sm:px-6">
          <a
            href="#top"
            className="whitespace-nowrap shrink-0 font-display text-lg font-bold tracking-tight text-slate-900"
          >
            NoteGenie AI
          </a>

          <nav
            aria-label="Workspace views"
            className="hidden items-center gap-6 text-sm font-medium text-slate-600 md:flex"
          >
            <button
              type="button"
              onClick={() => setStudioTab('structure')}
              className={`whitespace-nowrap shrink-0 transition-colors hover:text-slate-900 ${
                studioTab === 'structure' ? 'text-[#6B4EFF]' : ''
              }`}
            >
              Architecture
            </button>
            <button
              type="button"
              onClick={() => setStudioTab('pubspec')}
              className={`whitespace-nowrap shrink-0 transition-colors hover:text-slate-900 ${
                studioTab === 'pubspec' ? 'text-[#6B4EFF]' : ''
              }`}
            >
              Dependencies
            </button>
            <button
              type="button"
              onClick={() => setStudioTab('dart')}
              className={`whitespace-nowrap shrink-0 transition-colors hover:text-slate-900 ${
                studioTab === 'dart' ? 'text-[#6B4EFF]' : ''
              }`}
            >
              UI Source
            </button>
            <button
              type="button"
              onClick={() => setStudioTab('roadmap')}
              className={`whitespace-nowrap shrink-0 transition-colors hover:text-slate-900 ${
                studioTab === 'roadmap' ? 'text-[#6B4EFF]' : ''
              }`}
            >
              Roadmap
            </button>
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            {/* Mobile-only pane switcher */}
            <div className="inline-flex rounded-lg bg-slate-100 p-0.5 lg:hidden">
              <button
                type="button"
                onClick={() => setMobilePane('preview')}
                className={`whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium ${
                  mobilePane === 'preview'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600'
                }`}
              >
                App Preview
              </button>
              <button
                type="button"
                onClick={() => setMobilePane('code')}
                className={`whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium ${
                  mobilePane === 'code'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600'
                }`}
              >
                Flutter Code
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                setMobilePane('code');
                setStudioTab('roadmap');
              }}
              className="hidden whitespace-nowrap shrink-0 rounded-lg bg-[#6B4EFF] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#5B3EE8] lg:inline-flex"
            >
              Phase 4 Complete
            </button>
          </div>
        </div>
      </header>

      {/* Main Split Studio */}
      <div className="mx-auto flex max-w-[1400px] flex-col gap-6 px-4 py-6 sm:px-6 lg:flex-row lg:items-stretch">
        {/* Left: Live Interactive NoteGenie AI Phase 2 Mobile Preview */}
        <div
          className={`${
            mobilePane === 'preview' ? 'flex' : 'hidden'
          } shrink-0 flex-col items-center lg:flex lg:w-[400px] lg:items-start`}
        >
          <div className="mb-2.5 flex w-full max-w-[400px] items-baseline justify-between gap-3 px-1">
            <h1 className="whitespace-nowrap font-display text-sm font-semibold text-slate-900">
              Phase 4 Mobile UI
            </h1>
            <span className="whitespace-nowrap text-xs text-slate-500">Local AI &amp; Batch Export</span>
          </div>
          <MobileAppPreview />
        </div>

        {/* Right: Flutter Phase 2 Code, Folder Structure & Dependencies */}
        <div
          className={`${
            mobilePane === 'code' ? 'flex' : 'hidden'
          } min-w-0 flex-1 flex-col lg:flex`}
        >
          <div className="mb-2.5 flex items-baseline justify-between px-1">
            <span className="font-display text-sm font-semibold text-slate-900">
              Flutter Source Workspace
            </span>
            <span className="text-xs text-slate-500">
              Awaiting approval for Phase 5 (OCR &amp; Bengali STT)
            </span>
          </div>
          <FlutterCodeExplorer activeTab={studioTab} onTabChange={setStudioTab} />
        </div>
      </div>
    </div>
  );
}
