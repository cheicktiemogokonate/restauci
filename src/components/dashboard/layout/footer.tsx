import Link from "next/link";

export default function Footer() {
  return (
    <footer className="w-full border-t bg-background/50 px-4 py-6 text-[13px] text-muted-foreground sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <span>Copyright © 2026 Toutci</span>
        <nav aria-label="Informations légales" className="flex flex-wrap gap-5">
          <Link href="/confidentialite" className="hover:text-foreground">
            Confidentialité
          </Link>
          <Link href="/conditions-generales" className="hover:text-foreground">
            Conditions d&apos;utilisation
          </Link>
          <Link href="/mentions-legales" className="hover:text-foreground">
            Mentions légales
          </Link>
        </nav>
      </div>
    </footer>
  );
}
