import { Share2 } from "lucide-react";
import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t bg-background py-6 mt-8">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          Copyright © 2025 RestauCI
        </p>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <Link href="#" className="hover:text-foreground transition-colors">
            Politique de confidentialité
          </Link>
          <Link href="#" className="hover:text-foreground transition-colors">
            Conditions d&apos;utilisation
          </Link>
          <Link href="#" className="hover:text-foreground transition-colors">
            Contact
          </Link>
        </div>
        <Link
          href="#"
          className="text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Partager"
        >
          <Share2 className="h-4 w-4" />
        </Link>
      </div>
    </footer>
  );
}
