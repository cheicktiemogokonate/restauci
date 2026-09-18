export type PartnerActivityType = "restaurant" | "residence";

export interface PlanFeature {
  text: string;
  included: boolean;
  highlight?: boolean;
}

export interface PartnerPlan {
  code: "decouverte" | "croissance" | "partenaire_fier";
  name: string;
  tagline: string;
  annualPriceFcfa: number;
  commissionRatePercent: number;
  exposureMultiplier: number;
  isPopular?: boolean;
  ctaLabel: string;
  limits: {
    restaurant: {
      categories: number | "Illimité";
      dishes: number | "Illimité";
    };
    residence: {
      residences: number | "Illimité";
    };
  };
  features: {
    restaurant: string[];
    residence: string[];
  };
}

export const PARTNER_PLANS: PartnerPlan[] = [
  {
    code: "decouverte",
    name: "Découverte",
    tagline: "Pour démarrer sans aucun frais d’abonnement et tester la plateforme.",
    annualPriceFcfa: 0,
    commissionRatePercent: 15,
    exposureMultiplier: 1,
    ctaLabel: "Démarrer gratuitement",
    limits: {
      restaurant: {
        categories: 5,
        dishes: 20,
      },
      residence: {
        residences: 1,
      },
    },
    features: {
      restaurant: [
        "Fiche restaurant visible dès validation administrative",
        "Jusqu'à 5 catégories et 20 plats publiables",
        "Gestion des commandes en temps réel (sur place & à emporter)",
        "Flotte de livreurs partenaires Toutci intégrée",
        "Tableau de bord des ventes et historique des encaissements",
      ],
      residence: [
        "1 résidence publiée simultanément",
        "Gestion du calendrier des disponibilités et nuitées",
        "Réservations en ligne et encaissements sécurisés",
        "Paiements via Paystack (Mobile Money & Cartes bancaires)",
        "Fiche établissement sur l'application Toutci",
      ],
    },
  },
  {
    code: "croissance",
    name: "Croissance",
    tagline: "Pour les établissements en expansion souhaitant réduire leurs frais de commission.",
    annualPriceFcfa: 25000,
    commissionRatePercent: 12,
    exposureMultiplier: 3,
    ctaLabel: "Choisir Croissance",
    limits: {
      restaurant: {
        categories: 10,
        dishes: 50,
      },
      residence: {
        residences: 5,
      },
    },
    features: {
      restaurant: [
        "Tous les avantages Découverte inclus",
        "Jusqu'à 10 catégories et 50 plats publiables",
        "Commission réduite à 12 % sur chaque commande",
        "Visibilité boostée : x3 d’exposition dans les résultats",
        "Participation aux sélections 'Mis en avant' de votre zone",
        "Statistiques avancées et analyse des heures de pointe",
      ],
      residence: [
        "Tous les avantages Découverte inclus",
        "Jusqu'à 5 résidences publiées simultanément",
        "Commission réduite à 12 % sur chaque réservation",
        "Visibilité boostée par destination (poids x3)",
        "Apparition prioritaire dans les résultats de recherche",
        "Gestion multi-logements depuis un compte unique",
      ],
    },
  },
  {
    code: "partenaire_fier",
    name: "Partenaire Fier",
    tagline: "L’offre d’élite pour une visibilité maximale et le meilleur taux de marge du marché.",
    annualPriceFcfa: 50000,
    commissionRatePercent: 10,
    exposureMultiplier: 6,
    isPopular: true,
    ctaLabel: "Devenir Partenaire Fier",
    limits: {
      restaurant: {
        categories: "Illimité",
        dishes: "Illimité",
      },
      residence: {
        residences: "Illimité",
      },
    },
    features: {
      restaurant: [
        "Catégories et plats publiables illimités",
        "Commission minimale préférentielle de 10 % seulement",
        "Priorité d’exposition la plus élevée (poids x6)",
        "Mise en avant exclusive sur la page d'accueil de l’application",
        "Positionnement prioritaire dans votre zone géographique",
        "Badge officiel 'Partenaire Fier' pour rassurer vos clients",
        "Support technique et relation partenaire prioritaire 7j/7",
      ],
      residence: [
        "Nombre de résidences et hébergements illimité",
        "Commission minimale préférentielle de 10 % seulement",
        "Priorité d’exposition maximale (poids x6)",
        "Mise en avant en tête d'affiche sur l’accueil et par ville",
        "Badge officiel 'Partenaire Fier' gage d'excellence",
        "Export comptable détaillé et assistance VIP dédiée",
      ],
    },
  },
];

export const PARTNER_ACTIVITIES = [
  {
    id: "restaurant" as const,
    title: "Restaurants",
    subtitle: "Digitalisez votre salle, vos commandes à emporter et vos livraisons.",
    status: "Disponible maintenant",
    statusBadge: "Activité validée",
    description:
      "Prenez le contrôle total de vos ventes alimentaires. Toutci équipe votre restaurant d’une interface fluide pour publier votre carte, gérer le flux de commandes en direct et déléguer la livraison à nos coursiers partenaires fiables.",
    highlights: [
      {
        title: "Carte digitale dynamique",
        desc: "Mettez à jour vos plats, options, formules et ruptures de stock en quelques secondes sans réimprimer de menu.",
      },
      {
        title: "Commandes 3-en-1",
        desc: "Gérez depuis un seul écran les commandes à table (sur place), les retraits à emporter et les livraisons à domicile.",
      },
      {
        title: "Flotte de livraison intégrée",
        desc: "Nos livreurs certifiés Toutci prennent en charge l’acheminement de vos plats avec suivi GPS en direct.",
      },
      {
        title: "Temps de préparation maîtrisé",
        desc: "Ajustez vos délais de cuisine pour fluidifier les coups de feu et fidéliser vos clients affamés.",
      },
    ],
    stats: [
      { label: "Marge préservée", value: "Dès 10 %", sub: "Commission la plus basse" },
      { label: "Temps moyen prépa", value: "20-25 min", sub: "Optimisation de salle" },
      { label: "Modes de vente", value: "3 canaux", sub: "Sur place, emporté, livraison" },
    ],
  },
  {
    id: "residence" as const,
    title: "Résidences",
    subtitle: "Remplissez vos logements avec des réservations sécurisées et vérifiées.",
    status: "Disponible maintenant",
    statusBadge: "Activité validée",
    description:
      "Valorisez vos résidences, appartements meublés et villas auprès d’une clientèle locale et de passage. Gérez les disponibilités en temps réel et recevez vos loyers directement par Mobile Money et virement sans risque d'impayé.",
    highlights: [
      {
        title: "Fiches hébergement immersives",
        desc: "Photos haute définition, liste d'équipements détaillée (Wi-Fi, piscine, climatisation), adresse précise et règles de séjour.",
      },
      {
        title: "Calendrier de réservation synchronisé",
        desc: "Bloquez les dates, définissez le nombre minimum de nuitées et visualisez les arrivées et départs en un coup d'œil.",
      },
      {
        title: "Encaissements 100 % garantis",
        desc: "Paiements centralisés via Paystack (Wave, Orange Money, MTN, CB). Vous touchez vos fonds en toute sérénité.",
      },
      {
        title: "Clients identifiés",
        desc: "Tous les utilisateurs réservant sur Toutci disposent d'un compte vérifié pour préserver la sécurité de vos biens.",
      },
    ],
    stats: [
      { label: "Taux de confirmation", value: "Instantané", sub: "Réservations en direct" },
      { label: "Paiements sécurisés", value: "Mobile Money", sub: "Wave, Orange, MTN, Cartes" },
      { label: "Portée", value: "Nationale", sub: "Abidjan & grandes villes" },
    ],
  },
];

export const UPCOMING_ACTIVITIES = [
  {
    title: "Événements & Billetterie",
    subtitle: "Concerts, salons, soirées et festivals",
    description:
      "Vente de billets électroniques avec scan QR code à l'entrée et suivi des jauges en direct.",
    badge: "En développement",
  },
];

export const ONBOARDING_STEPS = [
  {
    step: "01",
    title: "Inscription en ligne",
    desc: "Créez votre compte partenaire avec vos identifiants professionnels en moins de 2 minutes.",
  },
  {
    step: "02",
    title: "Choix de l'activité",
    desc: "Sélectionnez votre domaine (Restaurant ou Résidence) pour configurer votre interface sur mesure.",
  },
  {
    step: "03",
    title: "Paramétrage & Catalogue",
    desc: "Renseignez votre localisation, horaires, et ajoutez vos premiers plats ou logements.",
  },
  {
    step: "04",
    title: "Vérification KYC",
    desc: "Notre équipe valide vos pièces d'identité et justificatifs sous 24 à 48 heures pour garantir la conformité.",
  },
  {
    step: "05",
    title: "Mise en ligne & Ventes",
    desc: "Votre établissement apparaît instantanément sur l'application Toutci. Vous commencez à encaisser !",
  },
];

export const PARTNER_FAQS = [
  {
    question: "Quels sont les documents requis pour valider mon compte partenaire ?",
    answer:
      "Pour garantir un réseau d'établissements de confiance et de haute qualité, Toutci applique une vérification d'identité (KYC). Vous devez fournir une pièce d'identité en cours de validité (CNI ou Passeport du gérant), un justificatif d'établissement (registre de commerce, bail ou facture de localisation) ainsi que les coordonnées de reversement (RIB ou compte Mobile Money enregistré).",
  },
  {
    question: "Comment et quand suis-je payé pour mes commandes et réservations ?",
    answer:
      "Toutes les transactions passées sur l'application Toutci sont sécurisées via notre partenaire agréé Paystack. Pour les restaurants, les fonds sont reversés de manière récurrente (hebdomadaire ou selon vos préférences de trésorerie). Pour les résidences, les fonds sont sécurisés dès la réservation et débloqués selon les conditions de check-in.",
  },
  {
    question: "Puis-je changer d'offre d'abonnement en cours d'année ?",
    answer:
      "Oui, absolument. Vous pouvez débuter avec l'offre Découverte gratuite à 0 FCFA/an et passer à tout moment aux plans Croissance ou Partenaire Fier pour bénéficier immédiatement de la baisse de commission (12 % ou 10 %) et du boost de visibilité prioritaire sur l'application.",
  },
  {
    question: "Comment sont organisées les livraisons pour les restaurants ?",
    answer:
      "Toutci met à votre disposition un réseau de livreurs partenaires géolocalisés. Dès qu'une commande est acceptée et marquée 'en préparation', un livreur proche est assigné et arrive dès que le plat est prêt pour un acheminement rapide et soigné au client.",
  },
  {
    question: "Puis-je gérer à la fois un restaurant et une résidence meublée ?",
    answer:
      "Pour garantir une ergonomie simple et spécialisée lors du lancement, chaque compte partenaire est associé à une activité principale. Si vous possédez les deux types d'établissements, vous pouvez créer deux profils avec des adresses e-mail distinctes et les gérer de façon totalement indépendante.",
  },
  {
    question: "Quel matériel informatique est nécessaire ?",
    answer:
      "Aucun matériel coûteux n'est requis ! L'espace partenaire Toutci est accessible depuis n'importe quel navigateur web sur smartphone, tablette ou ordinateur portable connecté à Internet.",
  },
];
