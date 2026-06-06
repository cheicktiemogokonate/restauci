export default function DeliveryMap() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Map placeholder */}
      <div className="relative h-64 bg-[#e8ede4] overflow-hidden">
        {/* Decorative map background */}
        <svg viewBox="0 0 400 256" className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
          {/* Streets */}
          <rect width="400" height="256" fill="#eef2ea" />
          {/* Major roads */}
          <line x1="0" y1="64" x2="400" y2="64" stroke="#fff" strokeWidth="8" />
          <line x1="0" y1="128" x2="400" y2="128" stroke="#fff" strokeWidth="6" />
          <line x1="0" y1="192" x2="400" y2="192" stroke="#fff" strokeWidth="8" />
          <line x1="80" y1="0" x2="80" y2="256" stroke="#fff" strokeWidth="6" />
          <line x1="160" y1="0" x2="160" y2="256" stroke="#fff" strokeWidth="8" />
          <line x1="240" y1="0" x2="240" y2="256" stroke="#fff" strokeWidth="6" />
          <line x1="320" y1="0" x2="320" y2="256" stroke="#fff" strokeWidth="8" />
          {/* Minor streets */}
          <line x1="0" y1="32" x2="400" y2="32" stroke="#fff" strokeWidth="3" />
          <line x1="0" y1="96" x2="400" y2="96" stroke="#fff" strokeWidth="3" />
          <line x1="0" y1="160" x2="400" y2="160" stroke="#fff" strokeWidth="3" />
          <line x1="0" y1="224" x2="400" y2="224" stroke="#fff" strokeWidth="3" />
          <line x1="40" y1="0" x2="40" y2="256" stroke="#fff" strokeWidth="3" />
          <line x1="120" y1="0" x2="120" y2="256" stroke="#fff" strokeWidth="3" />
          <line x1="200" y1="0" x2="200" y2="256" stroke="#fff" strokeWidth="3" />
          <line x1="280" y1="0" x2="280" y2="256" stroke="#fff" strokeWidth="3" />
          <line x1="360" y1="0" x2="360" y2="256" stroke="#fff" strokeWidth="3" />
          {/* Park block */}
          <rect x="84" y="68" width="72" height="56" fill="#d4e6c3" rx="2" />
          <rect x="244" y="132" width="72" height="56" fill="#d4e6c3" rx="2" />
          {/* Route line */}
          <polyline
            points="60,200 60,130 200,130 200,64 340,64"
            stroke="#22c55e"
            strokeWidth="3"
            strokeDasharray="8 4"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Start marker (restaurant) */}
          <circle cx="60" cy="200" r="10" fill="#16a34a" />
          <text x="60" y="204" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold">R</text>
          {/* Delivery person */}
          <circle cx="200" cy="130" r="10" fill="#15803d" />
          <text x="200" y="134" textAnchor="middle" fill="white" fontSize="8">🛵</text>
          {/* End marker (home) */}
          <circle cx="340" cy="64" r="10" fill="#16a34a" />
          <text x="340" y="68" textAnchor="middle" fill="white" fontSize="10">🏠</text>
          {/* Street labels */}
          <text x="200" y="122" textAnchor="middle" fill="#9ca3af" fontSize="8">Bush St.</text>
          <text x="330" y="56" textAnchor="middle" fill="#9ca3af" fontSize="8">Fillbert St.</text>
        </svg>

        {/* Expand button */}
        <button className="absolute top-3 right-3 w-8 h-8 bg-white rounded-lg shadow-sm flex items-center justify-center hover:bg-gray-50 transition-colors">
          <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
          </svg>
        </button>

        {/* Location pin */}
        <button className="absolute bottom-3 right-3 w-8 h-8 bg-white rounded-lg shadow-sm flex items-center justify-center hover:bg-gray-50 transition-colors">
          <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
          </svg>
        </button>

        {/* +/- zoom */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col gap-1">
          <button className="w-7 h-7 bg-white rounded-lg shadow-sm flex items-center justify-center hover:bg-gray-50 transition-colors text-gray-600 font-bold text-lg leading-none">+</button>
          <button className="w-7 h-7 bg-white rounded-lg shadow-sm flex items-center justify-center hover:bg-gray-50 transition-colors text-gray-600 font-bold text-lg leading-none">−</button>
        </div>

        {/* City label */}
        <div className="absolute bottom-5 right-12 text-sm font-bold text-gray-700">San Francisco</div>
      </div>

      {/* Route info */}
      <div className="px-5 py-4">
        <div className="flex items-center justify-between mb-3 text-sm">
          <div>
            <p className="font-bold text-gray-900">Bella Italia</p>
            <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
              </svg>
              456 Olive St.
            </p>
          </div>
          <div className="text-center text-xs text-gray-400">
            <p>4.5 miles &nbsp; ~ 30 min</p>
          </div>
          <div className="text-right">
            <p className="font-bold text-gray-900">Frank Miller</p>
            <p className="text-xs text-gray-400 flex items-center gap-1 justify-end mt-0.5">
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
              </svg>
              789 Oak Lane
            </p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="relative flex items-center gap-2 mb-3">
          {/* Restaurant icon */}
          <div className="w-7 h-7 rounded-full bg-green-600 flex items-center justify-center flex-shrink-0">
            <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z" />
            </svg>
          </div>

          {/* Track */}
          <div className="flex-1 h-2 bg-gray-100 rounded-full relative overflow-hidden">
            <div className="absolute inset-y-0 left-0 w-3/5 bg-green-500 rounded-full" />
          </div>

          {/* Moto icon (in transit) */}
          <div className="absolute left-[calc(60%-14px)] top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-green-700 border-2 border-white shadow-md flex items-center justify-center">
            <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
            </svg>
          </div>

          {/* Home icon */}
          <div className="w-7 h-7 rounded-full bg-green-100 border-2 border-green-400 flex items-center justify-center flex-shrink-0">
            <svg className="w-3.5 h-3.5 text-green-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
            </svg>
          </div>
        </div>

        {/* Times */}
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div>
            <p className="text-gray-400">Heure de livraison</p>
            <p className="font-semibold text-gray-700 mt-0.5">11:00 AM, 20 Oct, 2025</p>
          </div>
          <div className="text-right">
            <p className="text-gray-400">Arrivée estimée</p>
            <p className="font-semibold text-gray-700 mt-0.5">11:30 AM, 20 Oct, 2025</p>
          </div>
        </div>
      </div>
    </div>
  );
}