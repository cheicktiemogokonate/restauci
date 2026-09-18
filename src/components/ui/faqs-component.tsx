"use client"

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import Link from "next/link"

export interface FaqItem {
  id: string
  question: string
  answer: string
}

interface FaqsProps {
  title?: string
  subtitle?: string
  items?: FaqItem[]
  supportText?: string
  supportLinkText?: string
  supportHref?: string
}

const defaultFaqItems: FaqItem[] = [
  {
    id: "item-1",
    question: "How long does shipping take?",
    answer:
      "Standard shipping takes 3-5 business days, depending on your location. Express shipping options are available at checkout for 1-2 business day delivery.",
  },
  {
    id: "item-2",
    question: "What payment methods do you accept?",
    answer:
      "We accept all major credit cards (Visa, Mastercard, American Express), PayPal, Apple Pay, and Google Pay. For enterprise customers, we also offer invoicing options.",
  },
  {
    id: "item-3",
    question: "Can I change or cancel my order?",
    answer:
      "You can modify or cancel your order within 1 hour of placing it. After this window, please contact our customer support team who will assist you with any changes.",
  },
  {
    id: "item-4",
    question: "Do you ship internationally?",
    answer:
      "Yes, we ship to over 50 countries worldwide. International shipping typically takes 7-14 business days. Additional customs fees may apply depending on your country's import regulations.",
  },
  {
    id: "item-5",
    question: "What is your return policy?",
    answer:
      "We offer a 30-day return policy for most items. Products must be in original condition with tags attached. Some specialty items may have different return terms, which will be noted on the product page.",
  },
]

export default function FAQs({
  title = "Frequently Asked Questions",
  subtitle = "Discover quick and comprehensive answers to common questions about our platform, services, and features.",
  items = defaultFaqItems,
  supportText = "Can't find what you're looking for? Contact our",
  supportLinkText = "customer support team",
  supportHref = "#",
}: FaqsProps) {
  return (
    <section className="py-16 md:py-24">
      <div className="mx-auto max-w-5xl px-4 md:px-6">
        <div>
          <h2 className="text-foreground text-3xl sm:text-4xl font-extrabold tracking-tight">
            {title}
          </h2>
          <p className="text-muted-foreground mt-3 text-balance text-base sm:text-lg">
            {subtitle}
          </p>
        </div>

        <div className="mt-10">
          <Accordion
            type="single"
            collapsible
            className="bg-card rounded-2xl w-full border border-border px-6 sm:px-8 py-3 shadow-sm"
          >
            {items.map((item) => (
              <AccordionItem
                key={item.id}
                value={item.id}
                className="border-b border-border/80 last:border-b-0 py-1"
              >
                <AccordionTrigger className="cursor-pointer text-sm sm:text-base font-bold text-left hover:no-underline text-foreground py-4">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent>
                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed pb-4">
                    {item.answer}
                  </p>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          <p className="text-muted-foreground mt-6 text-xs sm:text-sm text-center">
            {supportText}{" "}
            <Link
              href={supportHref}
              className="text-primary font-bold hover:underline"
            >
              {supportLinkText}
            </Link>
          </p>
        </div>
      </div>
    </section>
  )
}
