const LANGUAGES = ['EN', 'FR', 'ZH', 'KO']

function AppShell({ activePage, onPageChange, language, onLanguageChange, children }) {
  return (
    <main className="mx-auto min-h-screen w-full max-w-md bg-[#FFFFFF] pb-24 font-['Inter'] text-[#151C27]">
      <header className="sticky top-0 z-20 border-b border-[#F3F4F6] bg-white px-5 py-4">
        <div className="grid grid-cols-3 items-center">
          <button
            type="button"
            className="justify-self-start text-2xl font-semibold leading-none text-[#22C55E]"
            aria-label="Menu"
          >
            ≡
          </button>
          <h1 className="text-center text-[38px] font-bold leading-10 tracking-[-0.02em] text-[#151C27]">
            ToiletParis
          </h1>
          <div className="flex justify-self-end gap-1 rounded-full bg-[#F0F3FF] p-1">
            {LANGUAGES.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => onLanguageChange(option)}
                className={`rounded-full px-2 py-1 text-[10px] font-semibold ${
                  language === option ? 'bg-[#22C55E] text-white' : 'text-[#3D4A3D]'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      </header>

      {children}

      <p className="px-5 pt-5 text-xs leading-4 text-[#3D4A3D]">
        No account, no signup. Anonymous and free nearby toilet codes.
      </p>

      <nav className="fixed bottom-0 left-1/2 z-[1000] w-full max-w-md -translate-x-1/2 border-t border-gray-200 bg-white">
        <div className="mx-auto grid h-16 w-full grid-cols-2">
        <button
          type="button"
          onClick={() => onPageChange('code')}
            className={`group inline-flex flex-col items-center justify-center gap-1 py-2 text-[11px] font-medium ${
            activePage === 'code' ? 'text-emerald-600' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
            <svg
              className="size-5"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="16 18 22 12 16 6" />
              <polyline points="8 6 2 12 8 18" />
            </svg>
          Code
        </button>
        <button
          type="button"
          onClick={() => onPageChange('dashboard')}
            className={`group inline-flex flex-col items-center justify-center gap-1 py-2 text-[11px] font-medium ${
            activePage === 'dashboard' ? 'text-emerald-600' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
            <svg
              className="size-5"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <rect x="3" y="3" width="8" height="8" rx="1.5" />
              <rect x="13" y="3" width="8" height="8" rx="1.5" />
              <rect x="3" y="13" width="8" height="8" rx="1.5" />
              <rect x="13" y="13" width="8" height="8" rx="1.5" />
            </svg>
          Dashboard
        </button>
        </div>
      </nav>
    </main>
  )
}

export default AppShell
