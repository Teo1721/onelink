export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <div className="w-20 h-20 rounded-3xl bg-blue-100 flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M18.364 5.636a9 9 0 010 12.728M15.536 8.464a5 5 0 010 7.072M12 12h.01M6.343 6.343a9 9 0 000 12.728M9.172 9.172a5 5 0 000 7.072" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Brak połączenia</h1>
        <p className="text-gray-500 text-sm mb-6">
          Nie możesz się teraz połączyć z internetem. Sprawdź swoje połączenie i spróbuj ponownie.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-3 rounded-xl bg-[#1D4ED8] text-white font-bold text-sm hover:bg-blue-700 transition-colors"
        >
          Spróbuj ponownie
        </button>
      </div>
    </div>
  )
}
