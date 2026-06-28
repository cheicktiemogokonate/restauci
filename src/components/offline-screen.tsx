"use client";

interface OfflineScreenProps {
  wasOffline: boolean;
}

export function OfflineScreen({ wasOffline }: OfflineScreenProps) {
  return (
    <div
      role="dialog"
      aria-live="assertive"
      className="fixed inset-0 z-9999 flex items-center justify-center bg-white/95 backdrop-blur-sm"
    >
      <div className="max-w-md w-full mx-4 p-8 rounded-2xl shadow-lg text-center">
        <div className="flex items-center justify-center mb-4">
          <svg
            width="64"
            height="64"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden
          >
            <path
              d="M1 1L23 23"
              stroke="#ef4444"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M2.5 10.5C6 7 11 5 16 6.5"
              stroke="#ef4444"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="12" cy="17" r="1.5" fill="#ef4444" />
          </svg>
        </div>

        <h2 className="text-2xl font-semibold mb-2">Vous êtes hors ligne</h2>

        <p className="text-sm text-slate-600 mb-6">
          Vérifiez votre connexion internet et réessayez. La page se rechargera
          automatiquement dès que vous serez reconnecté.
        </p>

        <div className="flex items-center justify-center space-x-3 mb-6">
          <span className="h-2 w-2 rounded-full bg-slate-400 animate-pulse" />
          <span className="h-2 w-2 rounded-full bg-slate-400 animate-pulse delay-75" />
          <span className="h-2 w-2 rounded-full bg-slate-400 animate-pulse delay-150" />
        </div>

        <div>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-2 px-6 py-3 bg-[#2d7d46] hover:bg-[#2d7d46]/90 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            Réessayer
          </button>
        </div>

        {wasOffline && (
          <div className="mt-4 text-sm text-green-700">Connexion rétablie</div>
        )}
      </div>
    </div>
  );
}
