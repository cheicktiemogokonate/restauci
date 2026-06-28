import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Calendar, Users, Clock, Smile, Phone, Mail, CheckCircle, ChefHat } from 'lucide-react';
import { Reservation } from '../types';
import { Restaurant } from '@/types';

interface ReserveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReserveSuccess: (info: Reservation) => void;
  restaurant: Restaurant;
}

export default function ReserveModal({ isOpen, onClose, onReserveSuccess, restaurant }: ReserveModalProps) {
  const [formData, setFormData] = useState<Reservation>({
    name: '',
    email: '',
    phone: '',
    guests: 2,
    date: new Date().toISOString().split('T')[0],
    time: '20:00',
    specialRequests: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDone, setIsDone] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone) {
      alert('Veuillez remplir au moins votre nom et votre numéro de téléphone.');
      return;
    }
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setIsDone(true);
      onReserveSuccess(formData);
    }, 1500);
  };

  const handleReset = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      guests: 2,
      date: new Date().toISOString().split('T')[0],
      time: '20:00',
      specialRequests: '',
    });
    setIsDone(false);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', duration: 0.5 }}
            className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl"
          >
            {/* Header banner */}
            <div className="bg-[#0b663b] px-6 py-6 text-white relative">
              <button
                onClick={onClose}
                className="absolute top-4 right-4 rounded-full bg-black/10 p-2 text-white/90 hover:bg-black/20 hover:text-white transition"
              >
                <X className="h-5 w-5" />
              </button>
              <div className="flex items-center gap-3">
                <ChefHat className="h-8 w-8 text-[#e2b34a]" />
                <div>
                  <h3 className="text-xl font-bold tracking-tight">Réserver une table</h3>
                  <p className="text-sm text-emerald-100/90 font-light mt-0.5">
                    {restaurant.nom}{restaurant.ville ? ` • ${restaurant.ville}` : ''}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6">
              {!isDone ? (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    {/* Date */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-[#0b663b]" /> Date
                      </label>
                      <input
                        type="date"
                        required
                        value={formData.date}
                        min={new Date().toISOString().split('T')[0]}
                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                        className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3.5 py-2.5 text-sm focus:border-[#0b663b] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0b663b]/15 transition"
                      />
                    </div>

                    {/* Heure */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-[#0b663b]" /> Heure
                      </label>
                      <select
                        value={formData.time}
                        onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                        className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3.5 py-2.5 text-sm focus:border-[#0b663b] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0b663b]/15 transition"
                      >
                        <option value="12:00">12:00</option>
                        <option value="12:30">12:30</option>
                        <option value="13:00">13:00</option>
                        <option value="13:30">13:30</option>
                        <option value="14:00">14:00</option>
                        <option value="19:00">19:00</option>
                        <option value="19:30">19:30</option>
                        <option value="20:00">20:00</option>
                        <option value="20:30">20:30</option>
                        <option value="21:00">21:00</option>
                        <option value="21:30">21:30</option>
                      </select>
                    </div>
                  </div>

                  {/* Nombre d'invités */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5 text-[#0b663b]" /> Nombre de couverts
                    </label>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5, 6, 8].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => setFormData({ ...formData, guests: num })}
                          className={`flex-1 py-2 text-sm font-semibold rounded-xl border transition ${
                            formData.guests === num
                              ? 'bg-[#0b663b] text-white border-[#0b663b] shadow-md shadow-[#0b663b]/10'
                              : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                  </div>

                  <hr className="border-gray-100 my-4" />

                  {/* Coordonnées */}
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                        <Smile className="h-3.5 w-3.5 text-[#0b663b]" /> Nom complet
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: Cheick Diallo"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3.5 py-2.5 text-sm focus:border-[#0b663b] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0b663b]/15 transition"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                          <Phone className="h-3.5 w-3.5 text-[#0b663b]" /> Téléphone
                        </label>
                        <input
                          type="tel"
                          required
                          placeholder="Ex: +225 07 89..."
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3.5 py-2.5 text-sm focus:border-[#0b663b] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0b663b]/15 transition"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                          <Mail className="h-3.5 w-3.5 text-[#0b663b]" /> Email
                        </label>
                        <input
                          type="email"
                          placeholder="Ex: client@email.com"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3.5 py-2.5 text-sm focus:border-[#0b663b] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0b663b]/15 transition"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                        Demandes particulières (Optionnel)
                      </label>
                      <textarea
                        rows={2}
                        placeholder="Allergies, table en terrasse, anniversaire..."
                        value={formData.specialRequests}
                        onChange={(e) => setFormData({ ...formData, specialRequests: e.target.value })}
                        className="w-full rounded-xl border border-gray-200 bg-gray-50/50 px-3.5 py-2 text-sm focus:border-[#0b663b] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0b663b]/15 transition resize-none"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full relative overflow-hidden rounded-xl bg-gradient-to-r from-[#0b663b] to-[#074728] py-3.5 text-sm font-semibold text-white shadow-lg shadow-emerald-900/10 hover:shadow-xl hover:shadow-emerald-900/15 focus:outline-none active:scale-[0.98] transition cursor-pointer"
                  >
                    {isSubmitting ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        <span>Vérification des disponibilités...</span>
                      </div>
                    ) : (
                      'Confirmer ma réservation'
                    )}
                  </button>
                </form>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', damping: 10, stiffness: 100 }}
                  >
                    <CheckCircle className="h-16 w-16 text-[#0b663b]" />
                  </motion.div>
                  <h4 className="text-xl font-bold text-gray-950 mt-4">Réservation Confirmée !</h4>
                  <p className="text-sm text-gray-500 max-w-sm mt-2">
                    Félicitations, <span className="font-semibold text-gray-900">{formData.name}</span>. Votre table pour <span className="font-semibold text-gray-900">{formData.guests} personnes</span> est réservée pour le <span className="font-semibold text-gray-900">{formData.date}</span> à <span className="font-semibold text-gray-900">{formData.time}</span>.
                  </p>
                  <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 mt-6 text-left w-full max-w-xs text-xs space-y-1.5 text-emerald-800">
                    <p>• Un SMS de confirmation a été envoyé au {formData.phone}.</p>
                    <p>• La table sera réservée pour un maximum de 15 minutes de retard.</p>
                  </div>
                  <button
                    onClick={handleReset}
                    className="mt-6 rounded-lg bg-gray-900 px-6 py-2.5 text-xs font-semibold text-white hover:bg-gray-800 transition"
                  >
                    Fermer la fenêtre
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
