"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Store, MapPin, Clock, Share2, Settings, Eye, 
  Check, ChevronRight, ChevronLeft, Upload, 
  Globe, Phone, Mail, Calendar, Info 
} from 'lucide-react';

// Types pour la gestion de l'état
type StepNumber = 1 | 2 | 3 | 4 | 5 | 6;

interface FormData {
  nom: string;
  description: string;
  pays: string;
  ville: string;
  commune: string;
  quartier: string;
  adresseComplete: string;
  latitude: string;
  longitude: string;
  telephone: string;
  email: string;
  whatsapp: string;
  siteWeb: string;
  facebook: string;
}

export default function RestauCIWizard() {
  const [currentStep, setCurrentStep] = useState<StepNumber>(1);
  const [formData, setFormData] = useState<FormData>({
    nom: '',
    description: '',
    pays: 'Côte d’Ivoire',
    ville: 'Abidjan',
    commune: 'Marcory',
    quartier: 'Zone 4',
    adresseComplete: 'Rue des Jardins, Immeuble 12, Marcory Zone 4, Abidjan, Côte d’Ivoire',
    latitude: '5.3065',
    longitude: '-4.0133',
    telephone: '+225 01 23 45 67 89',
    email: 'contact@monrestaurant.ci',
    whatsapp: '+225 01 23 45 67 89',
    siteWeb: 'www.monrestaurant.ci',
    facebook: 'facebook.com/monrestaurant',
  });

  // Configuration des étapes du Sidebar
  const steps = [
    { id: 1, title: 'Informations générales', desc: 'Renseignez le nom, la description et les images.', icon: Store },
    { id: 2, title: 'Adresse & contact', desc: 'Ajoutez l’adresse, les coordonnées et les moyens de contact.', icon: MapPin },
    { id: 3, title: 'Horaires d’ouverture', desc: 'Définissez les horaires d’ouverture pour chaque jour.', icon: Clock },
    { id: 4, title: 'Réseaux sociaux', desc: 'Connectez vos réseaux sociaux pour plus de visibilité.', icon: Share2 },
    { id: 5, title: 'Paramètres', desc: 'Choisissez le type de restaurant et les préférences.', icon: Settings },
    { id: 6, title: 'Aperçu', desc: 'Vérifiez toutes les informations avant de créer.', icon: Eye },
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const nextStep = () => {
    if (currentStep < 6) setCurrentStep((prev) => (prev + 1) as StepNumber);
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep((prev) => (prev - 1) as StepNumber);
  };

  // Variantes d'animation pour les transitions de pages (style Linear/Stripe)
  const fadeVariants = {
    initial: { opacity: 0, x: 15 },
    animate: { opacity: 1, x: 0, transition: { duration: 0.3, ease: 'easeOut' } },
    exit: { opacity: 0, x: -15, transition: { duration: 0.2, ease: 'easeIn' } }
  };

  return (
    <div className="min-h-screen bg-zinc-900 flex items-center justify-center p-4 md:p-8 antialiased font-sans">
      <div className="w-full max-w-[1280px] h-[850px] bg-white rounded-3xl shadow-2xl flex overflow-hidden border border-zinc-200/80">
        
        {/* ================= LE SIDEBAR DE GAUCHE ================= */}
        <aside className="w-[340px] bg-[#F8F9FA] border-r border-zinc-100 p-8 flex flex-col justify-between shrink-0">
          <div>
            {/* Logo RestauCI */}
            <div className="flex items-center gap-3 mb-10">
              <div className="w-9 h-9 bg-[#036B3A] rounded-xl flex items-center justify-center text-white shadow-sm shadow-[#036B3A]/30">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2c-4.97 0-9 4.03-9 9 0 2.12.74 4.07 1.97 5.61L4.35 19.4c-.39.39-.39 1.02 0 1.41.39.39 1.02.39 1.41 0l2.79-2.79C10.09 18.64 11.03 19 12 19c4.97 0 9-4.03 9-9s-4.03-9-9-9zm0 15c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6z"/>
                </svg>
              </div>
              <span className="text-xl font-bold text-zinc-900 tracking-tight">Restau<span className="text-[#036B3A]">CI</span></span>
            </div>

            {/* Titre du module */}
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-zinc-900 mb-1">Créer un restaurant</h1>
              <p className="text-xs text-zinc-500 leading-relaxed">Suivez les étapes pour configurer votre restaurant.</p>
            </div>

            {/* Liste des étapes (Timeline) */}
            <div className="relative flex flex-col gap-6">
              {/* Ligne verticale conductrice */}
              <div className="absolute left-[18px] top-4 bottom-4 w-[2px] bg-zinc-200 -z-0" />

              {steps.map((s) => {
                const isCompleted = currentStep > s.id;
                const isActive = currentStep === s.id;
                const Icon = s.icon;

                return (
                  <div key={s.id} className="flex gap-4 relative z-10 group cursor-pointer" onClick={() => setCurrentStep(s.id as StepNumber)}>
                    {/* Indicateur visuel d'étape */}
                    <div className="flex items-center justify-center shrink-0">
                      {isCompleted ? (
                        <div className="w-9 h-9 bg-[#036B3A] rounded-full flex items-center justify-center text-white transition-all duration-300">
                          <Check className="w-4 h-4 stroke-[3]" />
                        </div>
                      ) : (
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all duration-300 text-xs font-semibold
                          ${isActive ? 'border-[#036B3A] bg-white text-[#036B3A] shadow-sm' : 'border-zinc-200 bg-white text-zinc-400'}`}>
                          {s.id}
                        </div>
                      )}
                    </div>

                    {/* Textes explicatifs de l'étape */}
                    <div className="flex flex-col pt-0.5">
                      <span className={`text-sm font-semibold transition-colors duration-200 ${isActive || isCompleted ? 'text-zinc-900' : 'text-zinc-400'}`}>
                        {s.title}
                      </span>
                      {isActive && (
                        <p className="text-[11px] text-zinc-500 leading-normal mt-0.5 max-w-[220px]">
                          {s.desc}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </aside>

        {/* ================= ZONE DE CONTENU PRINCIPALE ================= */}
        <main className="flex-1 flex flex-col justify-between bg-white overflow-hidden relative">
          
          {/* Conteneur scrollable du formulaire */}
          <div className="flex-1 overflow-y-auto px-12 py-10">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial="initial"
                animate="animate"
                exit="exit"
                // variants={fadeVariants}
                className="max-w-[760px] mx-auto"
              >
                {/* En-tête dynamique du Step */}
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-[#E6F0EA] rounded-full flex items-center justify-center text-[#036B3A]">
                    {React.createElement(steps[currentStep - 1].icon, { className: "w-5 h-5" })}
                  </div>
                </div>
                <span className="text-xs font-medium text-zinc-400">Étape {currentStep}/6</span>
                <h2 className="text-2xl font-bold text-zinc-900 mt-1 mb-1">{steps[currentStep - 1].title}</h2>
                <p className="text-sm text-zinc-500 mb-8">
                  {currentStep === 1 && "Commençons par les informations de base de votre restaurant."}
                  {currentStep === 2 && "Ajoutez l’adresse de votre restaurant et vos coordonnées pour que vos clients puissent vous trouver facilement."}
                  {currentStep === 3 && "Définissez les horaires d’ouverture de votre restaurant pour chaque jour de la semaine."}
                </p>

                {/* ÉTAPE 1 : INFORMATIONS GÉNÉRALES */}
                {currentStep === 1 && (
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 mb-2">Nom du restaurant *</label>
                      <input 
                        type="text" name="nom" value={formData.nom} onChange={handleInputChange}
                        placeholder="Le Nom de votre restaurant" 
                        className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:border-[#036B3A] focus:ring-1 focus:ring-[#036B3A] outline-none transition-all placeholder:text-zinc-300 text-sm"
                      />
                      <p className="text-[11px] text-zinc-400 mt-1.5">Ce nom sera affiché sur votre espace et pour vos clients.</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-zinc-700 mb-2">Description *</label>
                      <textarea 
                        name="description" value={formData.description} onChange={handleInputChange} rows={4} maxLength={300}
                        placeholder="Décrivez votre restaurant, votre cuisine et ce qui vous rend unique..." 
                        className="w-full px-4 py-3 rounded-xl border border-zinc-200 focus:border-[#036B3A] focus:ring-1 focus:ring-[#036B3A] outline-none transition-all placeholder:text-zinc-300 text-sm resize-none"
                      />
                      <p className="text-[11px] text-zinc-400 mt-1.5">Décrivez brièvement votre restaurant (max. 300 caractères).</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-zinc-700 mb-2">Logo *</label>
                        <div className="border-2 border-dashed border-zinc-200 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-zinc-50 transition-colors group">
                          <Upload className="w-5 h-5 text-zinc-400 group-hover:text-[#036B3A] mb-2 transition-colors" />
                          <span className="text-xs font-medium text-zinc-600">Cliquez pour ajouter un logo</span>
                          <span className="text-[10px] text-zinc-400 mt-1">JPG, PNG, WebP (max. 2Mo)</span>
                        </div>
                        <p className="text-[11px] text-zinc-400 mt-1.5">Format carré recommandé (1:1)</p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-zinc-700 mb-2">Image de couverture *</label>
                        <div className="border-2 border-dashed border-zinc-200 rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-zinc-50 transition-colors group">
                          <Upload className="w-5 h-5 text-zinc-400 group-hover:text-[#036B3A] mb-2 transition-colors" />
                          <span className="text-xs font-medium text-zinc-600">Cliquez pour ajouter une image</span>
                          <span className="text-[10px] text-zinc-400 mt-1">JPG, PNG, WebP (max. 5Mo)</span>
                        </div>
                        <p className="text-[11px] text-zinc-400 mt-1.5">Format paysage recommandé (16:9)</p>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-zinc-700 mb-2">Galerie photos <span className="text-zinc-400 font-normal">(optionnel)</span></label>
                      <div className="border-2 border-dashed border-zinc-200 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer hover:bg-zinc-50 transition-colors group">
                        <Upload className="w-6 h-6 text-zinc-400 group-hover:text-[#036B3A] mb-2 transition-colors" />
                        <span className="text-xs font-medium text-zinc-600">Cliquez pour ajouter des images</span>
                        <span className="text-[10px] text-zinc-400 mt-1">JPG, PNG, WebP (max. 10 images)</span>
                      </div>
                      <p className="text-[11px] text-zinc-400 mt-1.5">Ajoutez des photos de votre restaurant, de vos plats et de votre ambiance.</p>
                    </div>
                  </div>
                )}

                {/* ÉTAPE 2 : ADRESSE & CONTACT */}
                {currentStep === 2 && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-zinc-700 mb-2">Pays *</label>
                        <select name="pays" value={formData.pays} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border border-zinc-200 bg-white text-sm outline-none">
                          <option>Côte d’Ivoire</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-zinc-700 mb-2">Ville *</label>
                        <select name="ville" value={formData.ville} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border border-zinc-200 bg-white text-sm outline-none">
                          <option>Abidjan</option>
                          <option>Bouaké</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-zinc-700 mb-2">Commune *</label>
                        <input type="text" name="commune" value={formData.commune} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border border-zinc-200 text-sm outline-none" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-zinc-700 mb-2">Quartier</label>
                        <input type="text" name="quartier" value={formData.quartier} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border border-zinc-200 text-sm outline-none" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-zinc-700 mb-2">Adresse complète *</label>
                      <input type="text" name="adresseComplete" value={formData.adresseComplete} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border border-zinc-200 text-sm outline-none" />
                      <p className="text-[11px] text-zinc-400 mt-1.5">Soyez précis pour aider vos clients à vous localiser facilement.</p>
                    </div>

                    {/* Placeholder d'intégration Cartographique */}
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 mb-2">Localisation sur la carte *</label>
                      <div className="w-full h-48 bg-sky-100 rounded-xl border border-zinc-200 relative overflow-hidden flex items-center justify-center">
                        {/* Simulation de carte d'Abidjan */}
                        <div className="absolute inset-0 bg-cover bg-center opacity-80 subtle-map-bg" style={{ backgroundImage: `url('https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/-4.0133,5.3065,12,0/760x200?access_token=mock')` }} />
                        <div className="absolute top-4 right-4 bg-white px-3 py-1.5 rounded-lg border border-zinc-200 shadow-sm text-xs font-semibold text-zinc-700 flex items-center gap-1.5 cursor-pointer hover:bg-zinc-50">
                          <MapPin className="w-3.5 h-3.5 text-zinc-500" /> Recentrer
                        </div>
                        <div className="absolute bottom-4 right-4 flex flex-col gap-1">
                          <button className="w-7 h-7 bg-white border border-zinc-200 rounded-md shadow-sm font-bold text-sm text-zinc-600 flex items-center justify-center hover:bg-zinc-50">+</button>
                          <button className="w-7 h-7 bg-white border border-zinc-200 rounded-md shadow-sm font-bold text-sm text-zinc-600 flex items-center justify-center hover:bg-zinc-50">-</button>
                        </div>
                        <div className="relative z-10 w-8 h-8 text-[#036B3A] drop-shadow-md animate-bounce">
                          <MapPin className="w-8 h-8 fill-[#036B3A]/20" />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-zinc-600 mb-1.5">Latitude</label>
                        <input type="text" name="latitude" value={formData.latitude} readOnly className="w-full px-4 py-2.5 rounded-xl border border-zinc-100 bg-zinc-50 text-zinc-500 text-sm outline-none cursor-not-allowed" />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-zinc-600 mb-1.5">Longitude</label>
                        <input type="text" name="longitude" value={formData.longitude} readOnly className="w-full px-4 py-2.5 rounded-xl border border-zinc-100 bg-zinc-50 text-zinc-500 text-sm outline-none cursor-not-allowed" />
                      </div>
                    </div>

                    {/* Section Contact Grid */}
                    <div className="pt-4 border-t border-zinc-100">
                      <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-4">Contact</h4>
                      <div className="grid grid-cols-3 gap-4 mb-4">
                        <div className="relative">
                          <Phone className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3.5" />
                          <input type="text" name="telephone" value={formData.telephone} onChange={handleInputChange} className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-zinc-200 text-sm outline-none" placeholder="Téléphone *" />
                        </div>
                        <div className="relative">
                          <Mail className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3.5" />
                          <input type="email" name="email" value={formData.email} onChange={handleInputChange} className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-zinc-200 text-sm outline-none" placeholder="Email *" />
                        </div>
                        <div className="relative">
                          <svg className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.713-1.454L0 24zm6.59-4.846c1.6.95 3.498 1.452 5.43 1.453 5.414 0 9.818-4.409 9.821-9.83.001-2.628-1.022-5.1-2.881-6.958C17.158 1.954 14.683.931 12.012.931c-5.42 0-9.824 4.41-9.827 9.832-.001 1.986.517 3.93 1.5 5.642l-.999 3.65 3.743-.981zm11.387-7.864c-.301-.151-1.784-.88-2.062-.98-.278-.1-.482-.151-.683.151-.202.301-.782.98-.958 1.181-.177.201-.353.226-.654.076-.301-.151-1.272-.469-2.422-1.494-.894-.797-1.498-1.783-1.674-2.084-.177-.302-.019-.465.132-.614.136-.134.301-.352.451-.528.151-.176.202-.301.302-.503.101-.201.05-.377-.026-.528-.075-.151-.683-1.644-.936-2.253-.247-.594-.499-.514-.683-.524l-.583-.01c-.202 0-.528.075-.804.377-.276.301-1.055 1.03-1.055 2.514s1.08 2.916 1.231 3.117c.151.201 2.125 3.245 5.148 4.549.719.31 1.281.496 1.719.636.722.229 1.379.196 1.898.119.579-.087 1.784-.73 2.035-1.434.252-.703.252-1.307.176-1.434-.075-.127-.277-.202-.578-.353z"/></svg>
                          <input type="text" name="whatsapp" value={formData.whatsapp} onChange={handleInputChange} className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-zinc-200 text-sm outline-none" placeholder="WhatsApp" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="relative">
                          <Globe className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3.5" />
                          <input type="text" name="siteWeb" value={formData.siteWeb} onChange={handleInputChange} className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-zinc-200 text-sm outline-none" placeholder="Site web" />
                        </div>
                        <div className="relative">
                          {/* <Facebook className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3.5" /> */}
                          <input type="text" name="facebook" value={formData.facebook} onChange={handleInputChange} className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-zinc-200 text-sm outline-none" placeholder="Facebook" />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ÉTAPE 3 : HORAIRES D'OUVERTURE */}
                {currentStep === 3 && (
                  <div className="space-y-6">
                    <div className="border border-zinc-100 rounded-xl overflow-hidden shadow-sm">
                      <table className="w-full text-left border-collapse bg-white">
                        <thead>
                          <tr className="border-b border-zinc-100 bg-zinc-50/70 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                            <th className="px-6 py-3.5 font-medium">Jour</th>
                            <th className="px-6 py-3.5 font-medium">Statut</th>
                            <th className="px-6 py-3.5 font-medium">Heure d'ouverture</th>
                            <th className="px-6 py-3.5 font-medium">Heure de fermeture</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 text-sm text-zinc-700">
                          {['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'].map((day) => (
                            <tr key={day} className="hover:bg-zinc-50/50 transition-colors">
                              <td className="px-6 py-3.5 font-medium text-zinc-900">{day}</td>
                              <td className="px-6 py-3.5">
                                {/* Bouton Switch iOS Premium */}
                                <div className="w-10 h-6 bg-[#036B3A] rounded-full p-0.5 cursor-pointer relative flex items-center justify-end">
                                  <div className="w-5 h-5 bg-white rounded-full shadow-sm" />
                                </div>
                              </td>
                              <td className="px-6 py-3.5">
                                <div className="relative w-32">
                                  <input type="text" defaultValue={day === 'Samedi' ? '09:00' : '08:00'} className="w-full px-3 py-1.5 border border-zinc-200 rounded-lg text-sm bg-white outline-none" />
                                  <Clock className="w-3.5 h-3.5 text-zinc-400 absolute right-3 top-2.5" />
                                </div>
                              </td>
                              <td className="px-6 py-3.5">
                                <div className="relative w-32">
                                  <input type="text" defaultValue={['Vendredi', 'Samedi'].includes(day) ? '23:00' : '22:00'} className="w-full px-3 py-1.5 border border-zinc-200 rounded-lg text-sm bg-white outline-none" />
                                  <Clock className="w-3.5 h-3.5 text-zinc-400 absolute right-3 top-2.5" />
                                </div>
                              </td>
                            </tr>
                          ))}
                          {/* Exemple de jour fermé (Dimanche) */}
                          <tr className="bg-zinc-50/30 text-zinc-400">
                            <td className="px-6 py-3.5 font-medium">Dimanche</td>
                            <td className="px-6 py-3.5">
                              <div className="w-10 h-6 bg-zinc-200 rounded-full p-0.5 cursor-pointer relative flex items-center justify-start">
                                <div className="w-5 h-5 bg-white rounded-full shadow-sm" />
                              </div>
                            </td>
                            <td className="px-6 py-3.5">
                              <input type="text" disabled value="Fermé" className="w-32 px-3 py-1.5 border border-zinc-100 rounded-lg text-sm bg-zinc-50 text-zinc-400 outline-none cursor-not-allowed" />
                            </td>
                            <td className="px-6 py-3.5">
                              <input type="text" disabled value="Fermé" className="w-32 px-3 py-1.5 border border-zinc-100 rounded-lg text-sm bg-zinc-50 text-zinc-400 outline-none cursor-not-allowed" />
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* Section Horaires spéciaux */}
                    <div className="pt-4">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-sm font-semibold text-zinc-900">Horaires spéciaux <span className="text-zinc-400 font-normal">(optionnel)</span></h4>
                        <button className="text-xs font-semibold text-[#036B3A] border border-[#036B3A]/20 bg-[#E6F0EA]/50 px-3 py-1.5 rounded-lg hover:bg-[#E6F0EA] transition-colors flex items-center gap-1">
                          + Ajouter une exception
                        </button>
                      </div>
                      <p className="text-xs text-zinc-400 -mt-2 mb-4">Ajoutez des horaires spécifiques pour les jours fériés ou des événements particuliers.</p>
                      
                      <div className="space-y-3">
                        {/* Noël */}
                        <div className="flex items-center gap-4 bg-white border border-zinc-200 rounded-xl p-4 shadow-sm">
                          <Calendar className="w-4 h-4 text-zinc-400 shrink-0" />
                          <div className="flex-1 grid grid-cols-4 gap-3 items-center">
                            <div>
                              <span className="block text-xs font-bold text-zinc-800">25 Décembre 2025</span>
                              <span className="text-[11px] text-zinc-400">Noël</span>
                            </div>
                            <div>
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">Ouvert</span>
                            </div>
                            <div className="relative">
                              <input type="text" defaultValue="11:00" className="w-full px-3 py-1.5 border border-zinc-200 rounded-lg text-xs outline-none" />
                              <Clock className="w-3.5 h-3.5 text-zinc-400 absolute right-2.5 top-2" />
                            </div>
                            <div className="relative">
                              <input type="text" defaultValue="16:00" className="w-full px-3 py-1.5 border border-zinc-200 rounded-lg text-xs outline-none" />
                              <Clock className="w-3.5 h-3.5 text-zinc-400 absolute right-2.5 top-2" />
                            </div>
                          </div>
                          <button className="text-zinc-400 hover:text-red-500 p-1 transition-colors">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-4v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </div>

                        {/* Jour de l'An */}
                        <div className="flex items-center gap-4 bg-white border border-zinc-200 rounded-xl p-4 shadow-sm">
                          <Calendar className="w-4 h-4 text-zinc-400 shrink-0" />
                          <div className="flex-1 grid grid-cols-4 gap-3 items-center">
                            <div>
                              <span className="block text-xs font-bold text-zinc-800">1er Janvier 2026</span>
                              <span className="text-[11px] text-zinc-400">Jour de l'An</span>
                            </div>
                            <div>
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-red-50 text-red-600 border border-red-100">Fermé</span>
                            </div>
                            <input type="text" disabled value="Fermé" className="w-full px-3 py-1.5 border border-zinc-100 bg-zinc-50 text-zinc-400 rounded-lg text-xs outline-none" />
                            <input type="text" disabled value="Fermé" className="w-full px-3 py-1.5 border border-zinc-100 bg-zinc-50 text-zinc-400 rounded-lg text-xs outline-none" />
                          </div>
                          <button className="text-zinc-400 hover:text-red-500 p-1 transition-colors">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-4v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Alerte Astuce */}
                    <div className="bg-[#E6F0EA]/40 border border-[#036B3A]/10 rounded-xl p-4 flex gap-3 items-start mt-6">
                      <Info className="w-4 h-4 text-[#036B3A] shrink-0 mt-0.5" />
                      <div>
                        <h5 className="text-xs font-bold text-zinc-900 mb-0.5">Astuce</h5>
                        <p className="text-xs text-zinc-600 leading-normal">Vous pourrez toujours modifier ces horaires depuis les paramètres de votre restaurant.</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* ÉTAPES SIMULÉES 4, 5, 6 */}
                {currentStep > 3 && (
                  <div className="h-64 border border-dashed border-zinc-200 rounded-xl flex flex-col items-center justify-center p-8 text-center bg-zinc-50/50">
                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm mb-3">
                      {React.createElement(steps[currentStep - 1].icon, { className: "w-5 h-5 text-[#036B3A]" })}
                    </div>
                    <h3 className="text-sm font-semibold text-zinc-900 mb-1">{steps[currentStep - 1].title}</h3>
                    <p className="text-xs text-zinc-400 max-w-[320px]">L'interface de cette étape est prête à accueillir les modules avancés liés aux fonctionnalités SaaS.</p>
                  </div>
                )}

              </motion.div>
            </AnimatePresence>
          </div>

          {/* ================= LE BARRE DE NAVIGATION EN BAS (FOOTER) ================= */}
          <footer className="h-20 border-t border-zinc-100 px-12 flex items-center justify-between shrink-0 bg-white z-20">
            <div>
              {currentStep > 1 && (
                <button 
                  onClick={prevStep}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-zinc-600 hover:bg-zinc-50 border border-zinc-200 transition-all flex items-center gap-1.5 shadow-sm"
                >
                  <ChevronLeft className="w-4 h-4" /> Précédent
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button className="px-5 py-2.5 rounded-xl text-sm font-semibold text-zinc-500 hover:text-zinc-800 transition-colors">
                Annuler
              </button>
              <button 
                onClick={nextStep}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-[#036B3A] hover:bg-[#02562E] text-white transition-all flex items-center gap-1.5 shadow-md shadow-[#036B3A]/20"
              >
                {currentStep === 6 ? 'Terminer' : 'Suivant'} <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </footer>

        </main>
      </div>
    </div>
  );
}