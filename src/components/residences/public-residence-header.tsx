import Link from "next/link";
import { AppLogo } from "@/components/ui/app-logo";
import { Button } from "@/components/ui/button";

export function PublicResidenceHeader() {
  return (
    <header className="border-b bg-white">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <AppLogo
          href="/"
          alt="Toutci"
          iconSizeClassName="size-9"
          textSizeClassName="w-24"
          textVisibilityClassName="block"
        />
        <nav aria-label="Navigation Résidences" className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href="/residences">Résidences</Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link href="/reservations">Mes séjours</Link>
          </Button>
          <Button asChild size="sm" className="hidden sm:inline-flex">
            <Link href="/register">Proposer un logement</Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}
