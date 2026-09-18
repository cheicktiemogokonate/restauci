"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Glow } from "@/components/ui/glow"
import { cn } from "@/shared/ui/cn"

interface CTAProps {
  title: string
  subtitle?: string
  action: {
    text: string
    href: string
    variant?: "default" | "glow"
  }
  secondaryAction?: {
    text: string
    href: string
  }
  footerText?: React.ReactNode
  className?: string
}

export function CTASection({
  title,
  subtitle,
  action,
  secondaryAction,
  footerText,
  className,
}: CTAProps) {
  return (
    <section className={cn("group relative overflow-hidden py-24 sm:py-32", className)}>
      <div className="relative z-10 mx-auto flex max-w-container flex-col items-center gap-6 text-center sm:gap-8 px-4 sm:px-6">
        <h2 className="text-3xl font-extrabold sm:text-5xl animate-appear tracking-tight text-foreground max-w-3xl leading-tight">
          {title}
        </h2>

        {subtitle && (
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl animate-appear delay-100 leading-relaxed">
            {subtitle}
          </p>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-appear delay-100">
          <Button
            variant={action.variant || "glow"}
            size="lg"
            asChild
          >
            <a href={action.href} className="!text-white text-white font-bold">
              {action.text}
            </a>
          </Button>

          {secondaryAction && (
            <Button
              variant="outline"
              size="lg"
              className="bg-white/80 hover:bg-white text-foreground border-border"
              asChild
            >
              <a href={secondaryAction.href}>{secondaryAction.text}</a>
            </Button>
          )}
        </div>

        {footerText && (
          <div className="animate-appear delay-300 text-xs sm:text-sm text-muted-foreground">
            {footerText}
          </div>
        )}
      </div>

      <div className="absolute left-0 top-0 h-full w-full translate-y-[1rem] opacity-80 transition-all duration-500 ease-in-out group-hover:translate-y-[-2rem] group-hover:opacity-100 pointer-events-none">
        <Glow variant="bottom" className="animate-appear-zoom delay-300" />
      </div>
    </section>
  )
}
