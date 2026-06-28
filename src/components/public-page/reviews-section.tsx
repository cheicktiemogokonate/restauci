import { Restaurant } from "@/types";
import { CheckCircle, Smile, Star, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import React, { useState } from "react";
import { Review } from "../types";

const INITIAL_REVIEWS: Review[] = [
  {
    id: "1",
    author: "Aissatou K.",
    rating: 5,
    date: "Il y a 2 jours",
    text: "Excellent service et plats délicieux ! L'ambiance est magnifique, je recommande vivement ce restaurant.",
    avatarColor: "bg-indigo-100 text-indigo-700",
  },
  {
    id: "2",
    author: "Koffi M.",
    rating: 5,
    date: "Il y a 1 semaine",
    text: "La meilleure expérience culinaire ivoirienne que j'ai eue à Abidjan. Tout était parfait !",
    avatarColor: "bg-emerald-100 text-emerald-700",
  },
  {
    id: "3",
    author: "Nadia B.",
    rating: 5,
    date: "Il y a 2 semaines",
    text: "Prix raisonnables, portions généreuses et un personnel très accueillant.",
    avatarColor: "bg-amber-100 text-amber-700",
  },
  {
    id: "4",
    author: "Jean-Pierre D.",
    rating: 4,
    date: "Il y a 3 semaines",
    text: "Le garba revisité et le poulet kedjenou sont excellents. Cadre très agréable pour les familles.",
    avatarColor: "bg-rose-100 text-rose-700",
  },
  {
    id: "5",
    author: "Mariam T.",
    rating: 5,
    date: "Il y a 1 mois",
    text: "Mon restaurant préféré à Cocody. Le service est rapide et les jus locaux (gingembre surtout) sont fantastiques !",
    avatarColor: "bg-sky-100 text-sky-700",
  },
];

interface ReviewsSectionProps {
  restaurant: Restaurant;
}

export default function ReviewsSection({ restaurant }: ReviewsSectionProps) {
  const [reviews, setReviews] = useState<Review[]>(INITIAL_REVIEWS);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newAuthor, setNewAuthor] = useState("");
  const [newRating, setNewRating] = useState(5);
  const [newText, setNewText] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  // Use real DB stats; supplement with local reviews added during this session
  const dbTotalReviews = restaurant.nombreAvis ?? 0;
  const dbAverage = restaurant.noteMoyenne ?? 0;
  const localNewReviews = reviews.length - INITIAL_REVIEWS.length;
  const totalReviews = dbTotalReviews + localNewReviews;
  const averageRating =
    totalReviews > 0
      ? (
          (dbAverage * dbTotalReviews +
            reviews
              .slice(INITIAL_REVIEWS.length)
              .reduce((sum, r) => sum + r.rating, 0)) /
          totalReviews
        ).toFixed(1)
      : dbAverage.toFixed(1);

  const handleAddReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAuthor || !newText) {
      alert("Veuillez remplir votre nom et écrire un commentaire.");
      return;
    }

    const brandNew: Review = {
      id: Date.now().toString(),
      author: newAuthor,
      rating: newRating,
      date: "À l'instant",
      text: newText,
      avatarColor: "bg-teal-100 text-teal-800",
    };

    setReviews([brandNew, ...reviews]);
    setIsSuccess(true);
    setTimeout(() => {
      setIsSuccess(false);
      setNewAuthor("");
      setNewRating(5);
      setNewText("");
    }, 2000);
  };

  return (
    <section className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="space-y-12">
        {/* Section Title details */}
        <div className="text-center md:text-left space-y-3">
          <span className="text-xs uppercase font-extrabold text-[#0b663b] tracking-widest flex items-center justify-center md:justify-start gap-1.5">
            <span className="w-6 h-0.5 bg-[#0b663b] inline-block" />
            Avis de nos clients
          </span>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <h2 className="text-3xl font-extrabold font-serif tracking-tight text-gray-950">
              Ce que nos visiteurs en disent
            </h2>
            <div className="flex items-center justify-center gap-2 text-xs font-semibold text-gray-500 bg-white border border-gray-100 rounded-full px-4 py-2 shadow-xs w-fit mx-auto md:mx-0">
              <Star className="h-4 w-4 text-[#e2b34a] fill-[#e2b34a]" />
              <span>
                Note générale :{" "}
                <strong className="text-gray-950">{averageRating} / 5</strong> (
                {totalReviews} avis)
              </span>
            </div>
          </div>
        </div>

        {/* 3 Review Cards (matches exact look inside mockup) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {reviews.slice(0, 3).map((review) => (
            <div
              key={review.id}
              className="bg-white rounded-3xl border border-gray-100/90 p-6 shadow-xs flex flex-col justify-between hover:shadow-md transition gap-5"
            >
              {/* Star header & Date */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`h-3.5 w-3.5 ${
                          i < review.rating
                            ? "text-[#e2b34a] fill-[#e2b34a]"
                            : "text-gray-200"
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">
                    {review.date}
                  </span>
                </div>

                {/* Comment Text */}
                <p className="text-xs sm:text-sm text-gray-600 font-light leading-relaxed">
                  "{review.text}"
                </p>
              </div>

              {/* Author Footer */}
              <div className="flex items-center gap-3 pt-3 border-t border-gray-50">
                <div
                  className={`h-9 w-9 rounded-full ${review.avatarColor || "bg-gray-100"} flex items-center justify-center text-xs font-bold font-mono`}
                >
                  {review.author
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-gray-950">
                    {review.author}
                  </h4>
                  <span className="text-[10px] text-emerald-600 font-semibold uppercase tracking-widest">
                    Client vérifié
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* View all Reviews CTA Button */}
        <div className="text-center pt-2">
          <button
            onClick={() => setIsModalOpen(true)}
            className="rounded-full border border-gray-200 px-6 py-3 text-xs font-bold text-gray-700 bg-white hover:bg-gray-50 active:scale-[0.98] transition cursor-pointer"
          >
            Voir tous les avis ({totalReviews})
          </button>
        </div>
      </div>

      {/* Reviews Interactive Modal Detail Overlay */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-3xl h-[80vh] overflow-hidden rounded-3xl bg-white shadow-2xl flex flex-col z-10"
            >
              {/* Header */}
              <div className="bg-[#0b663b] px-6 py-5 text-white flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold tracking-tight">
                    Avis de l'écosystème RestauCI
                  </h3>
                  <p className="text-sm text-emerald-100/95 font-light mt-0.5">
                    Moyenne : {averageRating} / 5 • de {totalReviews} Gourmets
                    Ivoiriens
                  </p>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-full bg-black/10 p-2 text-white/90 hover:bg-black/20 hover:text-white transition cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Master Split Grid */}
              <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-12">
                {/* Left Part: Reviews Scrolling List (7 cols) */}
                <div className="md:col-span-7 overflow-y-auto px-6 py-6 space-y-4 bg-gray-50">
                  <p className="text-[10px] font-extrabold uppercase text-gray-400 tracking-wider mb-2">
                    Derniers témoignages soumis
                  </p>

                  {reviews.map((r) => (
                    <div
                      key={r.id}
                      className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className={`h-7 w-7 rounded-full ${r.avatarColor || "bg-gray-100"} flex items-center justify-center text-[10px] font-extrabold`}
                          >
                            {r.author
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </div>
                          <div>
                            <h5 className="text-xs font-bold text-gray-950">
                              {r.author}
                            </h5>
                            <span className="text-[9px] text-gray-400 font-medium">
                              {r.date}
                            </span>
                          </div>
                        </div>

                        {/* Stars */}
                        <div className="flex items-center gap-0.5 bg-gray-50 px-2 py-1 rounded-lg">
                          <Star className="h-3 w-3 text-[#e2b34a] fill-[#e2b34a]" />
                          <span className="text-[10px] font-bold text-gray-800">
                            {r.rating}.0
                          </span>
                        </div>
                      </div>

                      <p className="text-xs text-gray-600 font-light leading-relaxed">
                        "{r.text}"
                      </p>
                    </div>
                  ))}
                </div>

                {/* Right Part: Add Review Interactive form (5 cols) */}
                <div className="md:col-span-5 px-6 py-6 border-t md:border-t-0 md:border-l border-gray-100 flex flex-col justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-gray-950 mb-1 flex items-center gap-1.5">
                      <Smile className="h-4 w-4 text-[#0b663b]" />
                      Partagez votre avis
                    </h4>
                    <p className="text-xs text-gray-500 font-light leading-relaxed mb-4">
                      Votre retour d'expérience aide nos équipes à perpétuer la
                      tradition culinaire minute d'excellence.
                    </p>

                    {isSuccess ? (
                      <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 text-center mt-6 text-emerald-800 flex flex-col items-center gap-2">
                        <CheckCircle className="h-8 w-8 text-[#0b663b]" />
                        <h5 className="text-xs font-bold">
                          Avis ajouté avec succès !
                        </h5>
                        <p className="text-[10px] font-light text-emerald-600">
                          Merci pour votre précieuse contribution culinaire.
                        </p>
                      </div>
                    ) : (
                      <form onSubmit={handleAddReview} className="space-y-4">
                        {/* Author */}
                        <div>
                          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                            Votre Nom
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="Ex: Christian Banny"
                            value={newAuthor}
                            onChange={(e) => setNewAuthor(e.target.value)}
                            className="w-full text-xs rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2 focus:border-[#0b663b] focus:bg-white focus:outline-none transition"
                          />
                        </div>

                        {/* Rating Star Selector */}
                        <div>
                          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                            Votre note
                          </label>
                          <div className="flex items-center gap-1.5">
                            {[1, 2, 3, 4, 5].map((stars) => (
                              <button
                                key={stars}
                                type="button"
                                onClick={() => setNewRating(stars)}
                                className="focus:outline-none cursor-pointer p-0.5 rounded-md hover:scale-110 transition"
                              >
                                <Star
                                  className={`h-6 w-6 ${
                                    stars <= newRating
                                      ? "text-[#e2b34a] fill-[#e2b34a]"
                                      : "text-gray-200 hover:text-amber-200"
                                  }`}
                                />
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Review text */}
                        <div>
                          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                            Votre commentaire
                          </label>
                          <textarea
                            required
                            rows={3}
                            placeholder="Avez-vous aimé notre attiéké braisé, notre accueil ?"
                            value={newText}
                            onChange={(e) => setNewText(e.target.value)}
                            className="w-full text-xs rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2 focus:border-[#0b663b] focus:bg-white focus:outline-none transition resize-none"
                          />
                        </div>

                        <button
                          type="submit"
                          className="w-full bg-[#0b663b] text-white rounded-xl py-2.5 text-xs font-bold hover:bg-[#074728] shadow-md transition cursor-pointer select-none"
                        >
                          Publier mon avis
                        </button>
                      </form>
                    )}
                  </div>

                  <div className="text-[10px] text-gray-400 text-center font-semibold pt-4 border-t border-gray-50">
                    RestauCI • Certifié Conforme aux Conditions Générales
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
}
