const steps = [
  { date: "20 Oct. 2025", time: "14:47", label: "Commande reçue", done: true },
  { date: "20 Oct. 2025", time: "14:50", label: "En préparation", done: true },
  { date: "20 Oct. 2025", time: "15:05", label: "Prête pour la livraison", done: true },
  { date: "20 Oct. 2025", time: "15:10", label: "En livraison", done: false, active: true },
  { date: null, time: null, label: "Livrée", done: false },
];

export default function OrderTracking() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-5">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-base font-semibold text-gray-900">Suivi de la commande</h3>
        <button className="text-gray-400 hover:text-gray-600 transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM12.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0zM18.75 12a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
          </svg>
        </button>
      </div>

      <div className="relative flex flex-col gap-0">
        {steps.map((step, i) => {
          const isLast = i === steps.length - 1;
          return (
            <div key={i} className="flex items-start gap-4">
              {/* Date/time column */}
              <div className="w-28 flex-shrink-0 text-right pt-0.5">
                {step.date && (
                  <>
                    <p className="text-xs text-gray-500 leading-tight">{step.date}</p>
                    <p className="text-xs font-semibold text-gray-700">{step.time}</p>
                  </>
                )}
              </div>

              {/* Timeline column */}
              <div className="flex flex-col items-center flex-shrink-0">
                {/* Icon */}
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 z-10 ${
                    step.done
                      ? "bg-green-600"
                      : step.active
                      ? "bg-white border-2 border-green-600"
                      : "bg-white border-2 border-gray-200"
                  }`}
                >
                  {step.done ? (
                    <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  ) : step.active ? (
                    <svg className="w-3.5 h-3.5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
                    </svg>
                  ) : (
                    <svg className="w-3 h-3 text-gray-300" fill="currentColor" viewBox="0 0 8 8">
                      <circle cx="4" cy="4" r="3" />
                    </svg>
                  )}
                </div>
                {/* Vertical line */}
                {!isLast && (
                  <div
                    className={`w-0.5 flex-1 min-h-[28px] my-1 ${
                      step.done ? "bg-green-500" : "bg-gray-200"
                    }`}
                    style={{ minHeight: "28px" }}
                  />
                )}
              </div>

              {/* Label */}
              <div className="pt-0.5 pb-5">
                <p
                  className={`text-sm font-semibold leading-tight ${
                    step.done || step.active ? "text-gray-900" : "text-gray-400"
                  }`}
                >
                  {step.label}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}