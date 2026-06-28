import Link from "next/link";

export default function NotFound() {
    return (
        <div className="min-h-screen bg-[#f0fdf4] flex items-center justify-center p-6 relative overflow-hidden font-sans">
            {/* --- Éléments décoratifs en arrière-plan --- */}

            {/* Fouet */}
            <div className="absolute top-1/4 left-[10%] text-green-600 opacity-[0.08] transform -rotate-12 w-24 h-24 hidden md:block">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 21v-7" /><path d="M8 14c0-5 3-9 4-10 1 1 4 5 4 10" /><path d="M12 14c-2.5-4-1-8 -1-8s1.5 4 -1 8" /><path d="M12 14c2.5-4 1-8 1-8s-1.5 4 1 8" /><rect x="10" y="21" width="4" height="2" rx="1" />
                </svg>
            </div>

            {/* Cuillère */}
            <div className="absolute top-1/3 right-[15%] text-green-600 opacity-[0.08] transform rotate-45 w-20 h-20 hidden md:block">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 7c0-3.3 2.7-6 6-6s6 2.7 6 6c0 2.2-1.2 4.1-3 5.1V21a1 1 0 0 1-2 0V12.1C6.2 11.1 5 9.2 5 7Z" /><path d="M8 7h6" />
                </svg>
            </div>

            {/* Petites feuilles */}
            <div className="absolute bottom-1/4 left-[20%] text-green-600 opacity-[0.08] transform -rotate-45 w-12 h-12">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" /><path d="M2 21c0-3 1.85-5.36 5.08-6 C9.5 14.52 12 13 13 12" />
                </svg>
            </div>

            <div className="absolute top-1/2 right-[10%] text-green-600 opacity-[0.08] transform rotate-12 w-10 h-10">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" /><path d="M2 21c0-3 1.85-5.36 5.08-6 C9.5 14.52 12 13 13 12" />
                </svg>
            </div>

            {/* Ligne pointillée décorative (bas) */}
            <div className="absolute bottom-10 right-1/4 text-green-500 opacity-20 w-40 h-20 hidden md:block">
                <svg viewBox="0 0 100 50" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M0 40 C 30 40, 40 10, 70 10 C 85 10, 95 20, 95 35 C 95 45, 85 45, 85 35" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3" />
                </svg>
            </div>


            {/* --- Conteneur Principal --- */}
            <div className="bg-white rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.05)] w-full max-w-4xl p-10 md:p-20 text-center relative z-10 border border-gray-50/50">

                {/* Lignes d'éclat au dessus du chapeau */}
                <div className="absolute top-12 left-1/2 -translate-x-1/2 w-48 h-12 pointer-events-none hidden md:flex justify-between items-center opacity-80">
                    <svg width="15" height="20" viewBox="0 0 15 20" fill="none" className="transform -rotate-45 -translate-y-4"><line x1="2" y1="18" x2="13" y2="2" stroke="#16a34a" strokeWidth="3" strokeLinecap="round" /></svg>
                    <svg width="15" height="20" viewBox="0 0 15 20" fill="none" className="transform -translate-y-8"><line x1="7.5" y1="18" x2="7.5" y2="2" stroke="#16a34a" strokeWidth="3" strokeLinecap="round" /></svg>
                    <svg width="15" height="20" viewBox="0 0 15 20" fill="none" className="transform rotate-45 -translate-y-4"><line x1="2" y1="2" x2="13" y2="18" stroke="#16a34a" strokeWidth="3" strokeLinecap="round" /></svg>
                </div>

                {/* Le grand "404" avec le chapeau */}
                <div className="flex items-center justify-center gap-2 md:gap-6 mb-10 mt-6 md:mt-10">
                    <span className="text-[120px] md:text-[200px] font-black text-[#1a202c] leading-none tracking-tighter drop-shadow-sm">4</span>

                    {/* Chapeau de chef SVG (remplace l'image 3D) */}
                    <div className="relative w-32 h-32 md:w-56 md:h-56 transform translate-y-2 md:translate-y-4 drop-shadow-xl hover:scale-105 transition-transform duration-500">
                        <svg width="100%" height="100%" viewBox="-2.4 -2.4 28.80 28.80" fill="none" xmlns="http://www.w3.org/2000/svg" transform="rotate(45)matrix(1, 0, 0, 1, 0, 0)"><g id="SVGRepo_bgCarrier" strokeWidth="0"></g><g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round" stroke="#CCCCCC" strokeWidth="0.768"> <path d="M19 18H19.75H19ZM5 14.584H5.75C5.75 14.2859 5.57345 14.016 5.30028 13.8967L5 14.584ZM19 14.584L18.6997 13.8967C18.4265 14.016 18.25 14.2859 18.25 14.584H19ZM15.75 7C15.75 7.41421 16.0858 7.75 16.5 7.75C16.9142 7.75 17.25 7.41421 17.25 7H15.75ZM6.75 7C6.75 7.41421 7.08579 7.75 7.5 7.75C7.91421 7.75 8.25 7.41421 8.25 7H6.75ZM7 4.25C3.82436 4.25 1.25 6.82436 1.25 10H2.75C2.75 7.65279 4.65279 5.75 7 5.75V4.25ZM17 5.75C19.3472 5.75 21.25 7.65279 21.25 10H22.75C22.75 6.82436 20.1756 4.25 17 4.25V5.75ZM15 21.25H9V22.75H15V21.25ZM9 21.25C8.03599 21.25 7.38843 21.2484 6.90539 21.1835C6.44393 21.1214 6.24643 21.0142 6.11612 20.8839L5.05546 21.9445C5.51093 22.4 6.07773 22.5857 6.70552 22.6701C7.31174 22.7516 8.07839 22.75 9 22.75V21.25ZM4.25 18C4.25 18.9216 4.24841 19.6883 4.32991 20.2945C4.41432 20.9223 4.59999 21.4891 5.05546 21.9445L6.11612 20.8839C5.9858 20.7536 5.87858 20.5561 5.81654 20.0946C5.75159 19.6116 5.75 18.964 5.75 18H4.25ZM18.25 18C18.25 18.964 18.2484 19.6116 18.1835 20.0946C18.1214 20.5561 18.0142 20.7536 17.8839 20.8839L18.9445 21.9445C19.4 21.4891 19.5857 20.9223 19.6701 20.2945C19.7516 19.6883 19.75 18.9216 19.75 18H18.25ZM15 22.75C15.9216 22.75 16.6883 22.7516 17.2945 22.6701C17.9223 22.5857 18.4891 22.4 18.9445 21.9445L17.8839 20.8839C17.7536 21.0142 17.5561 21.1214 17.0946 21.1835C16.6116 21.2484 15.964 21.25 15 21.25V22.75ZM7 5.75C7.2137 5.75 7.42326 5.76571 7.6277 5.79593L7.84703 4.31205C7.57021 4.27114 7.28734 4.25 7 4.25V5.75ZM12 1.25C9.68949 1.25 7.72942 2.7421 7.02709 4.81312L8.44763 5.29486C8.94981 3.81402 10.3516 2.75 12 2.75V1.25ZM7.02709 4.81312C6.84722 5.34352 6.75 5.91118 6.75 6.5H8.25C8.25 6.07715 8.3197 5.67212 8.44763 5.29486L7.02709 4.81312ZM17 4.25C16.7127 4.25 16.4298 4.27114 16.153 4.31205L16.3723 5.79593C16.5767 5.76571 16.7863 5.75 17 5.75V4.25ZM12 2.75C13.6484 2.75 15.0502 3.81402 15.5524 5.29486L16.9729 4.81312C16.2706 2.7421 14.3105 1.25 12 1.25V2.75ZM15.5524 5.29486C15.6803 5.67212 15.75 6.07715 15.75 6.5H17.25C17.25 5.91118 17.1528 5.34352 16.9729 4.81312L15.5524 5.29486ZM5.75 18V14.584H4.25V18H5.75ZM5.30028 13.8967C3.79769 13.2402 2.75 11.7416 2.75 10H1.25C1.25 12.359 2.6705 14.3846 4.69972 15.2712L5.30028 13.8967ZM18.25 14.584L18.25 18H19.75L19.75 14.584H18.25ZM21.25 10C21.25 11.7416 20.2023 13.2402 18.6997 13.8967L19.3003 15.2712C21.3295 14.3846 22.75 12.359 22.75 10H21.25ZM15.75 6.5V7H17.25V6.5H15.75ZM6.75 6.5V7H8.25V6.5H6.75Z" fill="#0f8a5f"></path> <path d="M5 18H19" stroke="#0f8a5f" strokeWidth="0.00024000000000000003" strokeLinecap="round" strokeLinejoin="round"></path> </g><g id="SVGRepo_iconCarrier"> <path d="M19 18H19.75H19ZM5 14.584H5.75C5.75 14.2859 5.57345 14.016 5.30028 13.8967L5 14.584ZM19 14.584L18.6997 13.8967C18.4265 14.016 18.25 14.2859 18.25 14.584H19ZM15.75 7C15.75 7.41421 16.0858 7.75 16.5 7.75C16.9142 7.75 17.25 7.41421 17.25 7H15.75ZM6.75 7C6.75 7.41421 7.08579 7.75 7.5 7.75C7.91421 7.75 8.25 7.41421 8.25 7H6.75ZM7 4.25C3.82436 4.25 1.25 6.82436 1.25 10H2.75C2.75 7.65279 4.65279 5.75 7 5.75V4.25ZM17 5.75C19.3472 5.75 21.25 7.65279 21.25 10H22.75C22.75 6.82436 20.1756 4.25 17 4.25V5.75ZM15 21.25H9V22.75H15V21.25ZM9 21.25C8.03599 21.25 7.38843 21.2484 6.90539 21.1835C6.44393 21.1214 6.24643 21.0142 6.11612 20.8839L5.05546 21.9445C5.51093 22.4 6.07773 22.5857 6.70552 22.6701C7.31174 22.7516 8.07839 22.75 9 22.75V21.25ZM4.25 18C4.25 18.9216 4.24841 19.6883 4.32991 20.2945C4.41432 20.9223 4.59999 21.4891 5.05546 21.9445L6.11612 20.8839C5.9858 20.7536 5.87858 20.5561 5.81654 20.0946C5.75159 19.6116 5.75 18.964 5.75 18H4.25ZM18.25 18C18.25 18.964 18.2484 19.6116 18.1835 20.0946C18.1214 20.5561 18.0142 20.7536 17.8839 20.8839L18.9445 21.9445C19.4 21.4891 19.5857 20.9223 19.6701 20.2945C19.7516 19.6883 19.75 18.9216 19.75 18H18.25ZM15 22.75C15.9216 22.75 16.6883 22.7516 17.2945 22.6701C17.9223 22.5857 18.4891 22.4 18.9445 21.9445L17.8839 20.8839C17.7536 21.0142 17.5561 21.1214 17.0946 21.1835C16.6116 21.2484 15.964 21.25 15 21.25V22.75ZM7 5.75C7.2137 5.75 7.42326 5.76571 7.6277 5.79593L7.84703 4.31205C7.57021 4.27114 7.28734 4.25 7 4.25V5.75ZM12 1.25C9.68949 1.25 7.72942 2.7421 7.02709 4.81312L8.44763 5.29486C8.94981 3.81402 10.3516 2.75 12 2.75V1.25ZM7.02709 4.81312C6.84722 5.34352 6.75 5.91118 6.75 6.5H8.25C8.25 6.07715 8.3197 5.67212 8.44763 5.29486L7.02709 4.81312ZM17 4.25C16.7127 4.25 16.4298 4.27114 16.153 4.31205L16.3723 5.79593C16.5767 5.76571 16.7863 5.75 17 5.75V4.25ZM12 2.75C13.6484 2.75 15.0502 3.81402 15.5524 5.29486L16.9729 4.81312C16.2706 2.7421 14.3105 1.25 12 1.25V2.75ZM15.5524 5.29486C15.6803 5.67212 15.75 6.07715 15.75 6.5H17.25C17.25 5.91118 17.1528 5.34352 16.9729 4.81312L15.5524 5.29486ZM5.75 18V14.584H4.25V18H5.75ZM5.30028 13.8967C3.79769 13.2402 2.75 11.7416 2.75 10H1.25C1.25 12.359 2.6705 14.3846 4.69972 15.2712L5.30028 13.8967ZM18.25 14.584L18.25 18H19.75L19.75 14.584H18.25ZM21.25 10C21.25 11.7416 20.2023 13.2402 18.6997 13.8967L19.3003 15.2712C21.3295 14.3846 22.75 12.359 22.75 10H21.25ZM15.75 6.5V7H17.25V6.5H15.75ZM6.75 6.5V7H8.25V6.5H6.75Z" fill="#0f8a5f"></path> <path d="M5 18H19" stroke="#0f8a5f" strokeWidth="1.128" strokeLinecap="round" strokeLinejoin="round"></path> </g></svg>
                    </div>

                    <span className="text-[120px] md:text-[200px] font-black text-[#1a202c] leading-none tracking-tighter drop-shadow-sm">4</span>
                </div>

                {/* Textes */}
                <h1 className="text-3xl md:text-[42px] font-bold text-[#1f2937] mb-6 tracking-tight">
                    Oups ! Page <span className="text-[#16a34a]">introuvable</span>
                    <svg className="mx-auto mt-2 w-32 h-3 text-[#16a34a] md:w-48" viewBox="0 0 100 10" fill="none" preserveAspectRatio="none">
                        <path d="M0 5 Q 50 0 100 5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                    </svg>
                </h1>

                <p className="text-[#4b5563] mb-10 max-w-md mx-auto text-base md:text-lg font-medium leading-relaxed">
                    La page que vous recherchez n'existe pas<br className="hidden md:block" /> ou a peut-être été déplacée.
                </p>

                {/* Bouton d'action */}
                <div className="relative inline-block group">
                    {/* Lignes d'éclat autour du bouton */}
                    <div className="absolute -top-6 -right-6 text-green-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300 w-8 h-8 hidden md:block">
                        <svg viewBox="0 0 24 24" fill="none"><path d="M12 2v4M19.07 4.93l-2.83 2.83M22 12h-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
                    </div>

                    <Link
                        href="/"
                        className="inline-flex items-center gap-3 bg-[#059669] hover:bg-[#047857] text-white font-semibold text-lg px-8 py-4 rounded-full transition-all duration-300 shadow-[0_8px_20px_-6px_rgba(5,150,105,0.5)] hover:shadow-[0_12px_25px_-6px_rgba(5,150,105,0.6)] hover:-translate-y-1"
                    >
                        {/* Icône toque simple (bouton) */}
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M6 13.87A4 4 0 0 1 7.41 6a5.11 5.11 0 0 1 1.05-1.54 5 5 0 0 1 7.08 0A5.11 5.11 0 0 1 16.59 6 4 4 0 0 1 18 13.87V21H6Z" />
                            <line x1="6" y1="17" x2="18" y2="17" />
                        </svg>
                        Retour à l'accueil
                        {/* Icône flèche */}
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M5 12h14M12 5l7 7-7 7" />
                        </svg>
                    </Link>
                </div>
            </div>
        </div>
    );
}