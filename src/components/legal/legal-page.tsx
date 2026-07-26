import Link from "next/link";

export function LegalPage({
  title,
  updatedAt,
  children,
}: {
  title: string;
  updatedAt: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-white">
      <header className="border-b bg-muted/25">
        <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
          <Link href="/" className="text-sm font-semibold text-primary">
            Toutci — une app pour tout
          </Link>
          <h1 className="mt-5 text-3xl font-bold tracking-tight">{title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Dernière mise à jour : {updatedAt}
          </p>
        </div>
      </header>
      <article className="prose prose-slate mx-auto max-w-3xl px-4 py-10 sm:px-6 [&_h2]:mt-9 [&_h2]:text-xl [&_h2]:font-bold [&_p]:leading-7 [&_li]:leading-7">
        {children}
      </article>
      <footer className="border-t">
        <nav
          aria-label="Informations légales"
          className="mx-auto flex max-w-3xl flex-wrap gap-x-5 gap-y-2 px-4 py-6 text-sm sm:px-6"
        >
          <Link href="/conditions-generales">Conditions générales</Link>
          <Link href="/confidentialite">Confidentialité</Link>
          <Link href="/cookies">Cookies</Link>
          <Link href="/mentions-legales">Mentions légales</Link>
        </nav>
      </footer>
    </main>
  );
}
