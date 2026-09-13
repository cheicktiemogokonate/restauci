"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, CheckCircle2, Database, ShieldCheck } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import BackgroundDecoration from "./BackgroundDecoration";

const points = [
  {
    title: "Visible après validation",
    description:
      "La fiche, le menu, les médias et les horaires publiés par l’établissement deviennent accessibles une fois les contrôles requis terminés.",
  },
  {
    title: "Commandes enregistrées avant confirmation",
    description:
      "Une confirmation affichée dans Toutci correspond à une commande réellement persistée et consultable dans son historique.",
  },
  {
    title: "Statuts traçables",
    description:
      "Les changements d’état proviennent des parcours métier et restent vérifiables depuis les espaces concernés.",
  },
  {
    title: "Fonctions disponibles uniquement lorsqu’elles sont complètes",
    description:
      "Les parcours encore en construction restent masqués jusqu’à disposer de leur persistance, de leurs contrôles et de leurs états d’erreur.",
  },
] as const;

const guarantees = [
  {
    icon: CheckCircle2,
    title: "Actions confirmées",
    description: "Aucun succès local ne remplace une écriture métier.",
  },
  {
    icon: Database,
    title: "Origine explicite",
    description: "Les données d’essai sont réservées aux environnements identifiés.",
  },
  {
    icon: ShieldCheck,
    title: "Accès maîtrisé",
    description: "Les capacités incomplètes ne sont pas proposées dans le produit.",
  },
] as const;

export default function AboutPlatform() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <section id="about" className="relative overflow-hidden bg-white py-24">
      <div
        className="pointer-events-none absolute top-[30%] left-[-10%] -z-10 size-125 animate-pulse duration-5000"
        style={{
          background:
            "radial-gradient(circle, rgba(34,197,94,0.06) 0%, transparent 70%)",
        }}
      />

      <BackgroundDecoration
        src="/backgrounds/pizza-outline.svg"
        className="absolute top-10 -right-35 opacity-25"
        size={360}
      />
      <BackgroundDecoration
        src="/backgrounds/herbs-outline.svg"
        className="absolute bottom-20 -left-25 opacity-30"
        size={330}
      />

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-14 lg:grid-cols-12">
          <div className="space-y-8 lg:col-span-6">
            <motion.div
              initial={shouldReduceMotion ? undefined : { opacity: 0, y: 24 }}
              whileInView={
                shouldReduceMotion ? undefined : { opacity: 1, y: 0 }
              }
              viewport={{ once: true, margin: "-80px" }}
              transition={shouldReduceMotion ? undefined : { duration: 0.5 }}
            >
              <span className="mb-3 block text-xs font-bold tracking-widest text-brand-green uppercase">
                L&apos;écosystème Toutci
              </span>
              <h2 className="font-display text-3xl leading-[1.1] font-extrabold tracking-tight text-brand-dark sm:text-4xl">
                Votre activité, sans faux-semblants.
              </h2>
              <p className="mt-6 max-w-2xl text-sm leading-relaxed text-brand-dark/80 sm:text-base">
                Toutci relie la visibilité publique, les commandes et le suivi
                opérationnel à des données effectivement enregistrées.
              </p>
            </motion.div>

            <div className="space-y-5">
              {points.map((point, index) => (
                <motion.div
                  key={point.title}
                  className="flex items-start gap-4"
                  initial={
                    shouldReduceMotion ? undefined : { opacity: 0, x: -20 }
                  }
                  whileInView={
                    shouldReduceMotion ? undefined : { opacity: 1, x: 0 }
                  }
                  viewport={{ once: true }}
                  transition={
                    shouldReduceMotion
                      ? undefined
                      : { duration: 0.4, delay: index * 0.08 }
                  }
                >
                  <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-green/10 text-brand-green">
                    <Check className="size-4" aria-hidden="true" />
                  </span>
                  <div>
                    <h3 className="font-display text-sm font-bold text-brand-dark">
                      {point.title}
                    </h3>
                    <p className="mt-1 text-xs leading-relaxed text-brand-dark/70 sm:text-sm">
                      {point.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          <motion.div
            className="lg:col-span-6"
            initial={shouldReduceMotion ? undefined : { opacity: 0, y: 28 }}
            whileInView={
              shouldReduceMotion ? undefined : { opacity: 1, y: 0 }
            }
            viewport={{ once: true, margin: "-60px" }}
            transition={shouldReduceMotion ? undefined : { duration: 0.5 }}
          >
            <Card className="overflow-hidden border-emerald-900/10 bg-emerald-950 text-white shadow-2xl">
              <CardHeader className="border-b border-white/10">
                <Badge className="w-fit border border-emerald-300/20 bg-emerald-300/10 text-emerald-100 hover:bg-emerald-300/10">
                  Garanties produit
                </Badge>
                <CardTitle className="mt-3 text-2xl text-white">
                  Ce que l’interface signifie
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 p-5 sm:p-6">
                {guarantees.map(({ icon: Icon, title, description }) => (
                  <div
                    key={title}
                    className="flex items-start gap-4 rounded-xl border border-white/10 bg-white/5 p-4"
                  >
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-300/10 text-emerald-200">
                      <Icon className="size-5" aria-hidden="true" />
                    </span>
                    <div>
                      <h3 className="text-sm font-semibold text-white">
                        {title}
                      </h3>
                      <p className="mt-1 text-sm leading-6 text-emerald-50/70">
                        {description}
                      </p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
