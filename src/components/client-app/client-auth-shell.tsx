"use client";

import { AppLogo } from "@/components/ui/app-logo";
import { ArrowLeft, MapPin } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

interface ClientAuthShellProps {
  children: ReactNode;
  eyebrow: string;
  title: string;
  description: string;
}

export function ClientAuthShell({ children, eyebrow, title, description }: ClientAuthShellProps) {
  const reduceMotion = useReducedMotion();

  return (
    <main className="min-h-screen bg-background lg:grid lg:grid-cols-[minmax(0,0.92fr)_minmax(32rem,1.08fr)]">
      <section className="relative min-h-72 overflow-hidden bg-primary sm:min-h-80 lg:min-h-screen">
        <Image src="/assets/images/gallery_patio_1781800255866.jpg" alt="Ambiance de restaurant" fill priority sizes="(min-width: 1024px) 46vw, 100vw" className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-br from-primary/95 via-primary/72 to-black/45" />
        <div className="relative mx-auto flex h-full max-w-xl flex-col justify-between p-5 text-primary-foreground sm:p-8 lg:max-w-none lg:p-10 xl:p-14">
          <div className="flex items-center justify-between">
            <AppLogo
              href="/client"
              alt="Toutci"
              iconSizeClassName="size-9"
              textSizeClassName="w-24"
              textVisibilityClassName="block"
              iconImageClassName="brightness-0 invert"
              textImageClassName="brightness-0 invert"
            />
            <Link
              href="/client"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary-foreground/85 transition-colors hover:text-primary-foreground"
            >
              <ArrowLeft className="size-3.5" />
              Découvrir
            </Link>
          </div>
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.42, delay: reduceMotion ? 0 : 0.1 }}
            className="max-w-md"
          >
            <p className="flex items-center gap-1.5 text-xs font-bold tracking-[0.16em] text-primary-foreground/75 uppercase">
              <MapPin className="size-3.5" />
              Partout en Côte d’Ivoire
            </p>
            <h1 className="mt-3 text-3xl leading-[1.05] font-bold tracking-tight sm:text-4xl">
              {title}
            </h1>
            <p className="mt-3 max-w-sm text-sm leading-6 text-primary-foreground/80">
              {description}
            </p>
          </motion.div>
        </div>
      </section>
      <section className="flex min-h-[calc(100vh-18rem)] items-center px-5 py-12 sm:px-8 lg:min-h-screen lg:px-12 xl:px-20">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: reduceMotion ? 0 : 0.08 }}
          className="mx-auto w-full max-w-sm"
        >
          <p className="text-xs font-bold tracking-[0.14em] text-primary uppercase">{eyebrow}</p>
          {children}
        </motion.div>
      </section>
    </main>
  );
}
