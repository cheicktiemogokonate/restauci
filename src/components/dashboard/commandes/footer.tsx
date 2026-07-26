import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t bg-background py-6 mt-8">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          Copyright © 2026 Toutci
        </p>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <Link href="/confidentialite" className="hover:text-foreground transition-colors">
            Politique de confidentialité
          </Link>
          <Link href="/conditions-generales" className="hover:text-foreground transition-colors">
            Conditions d&apos;utilisation
          </Link>
          <Link href="/mentions-legales" className="hover:text-foreground transition-colors">
            Mentions légales
          </Link>
        </div>
      </div>
    </footer>
  );
}
