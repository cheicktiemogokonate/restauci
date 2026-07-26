"use client";

import { PanierFlottant } from "@/components/client-app/panier-flottant";
import { Tabs, TabsList, TabsTrigger } from "@/components/motion/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useGeolocation } from "@/lib/client-app/hooks/use-geolocation";
import { useRestaurantDetail } from "@/lib/client-app/hooks/use-restaurant-detail";
import { useRestaurantMenu } from "@/lib/client-app/hooks/use-restaurant-menu";
import { usePanierStore } from "@/lib/client-app/stores/panier-store";
import { formatPrix } from "@/lib/utils/format";
import {
  ArrowLeft,
  AlertCircle,
  AtSign,
  Clock3,
  Globe2,
  Mail,
  MapPinned,
  Navigation,
  Phone,
  Plus,
  Star,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { toast } from "sonner";
import { useMemo, useState } from "react";

function externalUrl(value: string | null | undefined) {
  if (!value) return null;
  const candidate = value.startsWith("http://") || value.startsWith("https://") ? value : `https://${value}`;

  try {
    const url = new URL(candidate);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function whatsappUrl(value: string | null | undefined) {
  const number = value?.replace(/[^\d]/g, "");
  return number ? `https://wa.me/${number}` : null;
}

export default function RestaurantDetailPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const geo = useGeolocation();
  const reduceMotion = useReducedMotion();
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [tabDirection, setTabDirection] = useState(1);
  const [lastAddedId, setLastAddedId] = useState<string | null>(null);

  const { restaurant, isLoading, error: restaurantError } = useRestaurantDetail(params.slug, geo.lat, geo.lng);
  const { categories, isLoading: isMenuLoading, error: menuError } = useRestaurantMenu(params.slug);
  const ajouterItem = usePanierStore((state) => state.ajouterItem);
  const panierItems = usePanierStore((state) => state.items);

  const availableCategories = useMemo(
    () => categories.filter((category) => category.plats.some((plat) => plat.disponible)),
    [categories],
  );
  const displayedCategories = activeCategory
    ? availableCategories.filter((category) => category.id === activeCategory)
    : availableCategories;

  const handleCategoryChange = (nextValue: string) => {
    const nextCategory = nextValue === "all" ? null : nextValue;
    if (nextCategory === activeCategory) return;

    const currentIndex = activeCategory
      ? availableCategories.findIndex((category) => category.id === activeCategory) + 1
      : 0;
    const nextIndex = nextCategory
      ? availableCategories.findIndex((category) => category.id === nextCategory) + 1
      : 0;

    setTabDirection(nextIndex > currentIndex ? 1 : -1);
    setActiveCategory(nextCategory);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <Skeleton className="h-64 w-full rounded-none" />
        <div className="space-y-5 px-4 py-5">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-5 w-1/2" />
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <section className="max-w-sm text-center">
          <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive"><AlertCircle className="size-5" /></span>
          <h1 className="mt-4 text-lg font-semibold">Restaurant indisponible</h1>
          <p className="mt-1 text-sm text-muted-foreground">{restaurantError ?? "Ce restaurant n’est plus accessible pour le moment."}</p>
          <Button className="mt-5" onClick={() => router.push("/client")}>Retour aux restaurants</Button>
        </section>
      </main>
    );
  }

  const handleAdd = (plat: (typeof availableCategories)[number]["plats"][number]) => {
    ajouterItem(
      { id: restaurant.id, nom: restaurant.nom, slug: restaurant.slug },
      { platId: plat.id, nom: plat.nom, prix: plat.prix, photoUrl: plat.photoUrl },
    );
    setLastAddedId(plat.id);
    toast.success(`${plat.nom} ajouté au panier`);
  };

  return (
    <main className="min-h-screen bg-background pb-28">
      <section className="relative h-60 overflow-hidden bg-muted sm:h-72">
        <Image
          src={restaurant.banniereUrl ?? "/assets/images/restaurant_exterior_night_1781800314693.jpg"}
          alt={restaurant.banniereUrl ? `Devanture de ${restaurant.nom}` : "Devanture de restaurant"}
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/5 to-transparent" />
        <Button
          asChild
          variant="secondary"
          size="icon-lg"
          className="absolute top-4 left-4 rounded-xl bg-background/95 shadow-lg backdrop-blur-md hover:bg-background"
        >
          <Link href="/client" aria-label="Retour aux restaurants"><ArrowLeft /></Link>
        </Button>
        <div className="absolute right-4 bottom-4 left-4 flex items-end justify-between gap-3 text-primary-foreground">
          <Badge className="border-0 bg-background/95 text-primary shadow-sm hover:bg-background/95">Ouvert aux commandes</Badge>
          {restaurant.tempsAttente?.label && (
            <span className="flex items-center gap-1.5 text-xs font-semibold drop-shadow-sm">
              <Clock3 className="size-4" />
              {restaurant.tempsAttente.label}
            </span>
          )}
        </div>
      </section>

      <div className="mx-auto max-w-2xl px-4">
        <section className="border-b py-5">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{restaurant.nom}</h1>
          {restaurant.cuisines?.length ? (
            <p className="mt-1 text-sm text-muted-foreground">{restaurant.cuisines.join(" · ")}</p>
          ) : null}
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            {restaurant.noteMoyenne ? (
              <span className="flex items-center gap-1 font-semibold text-foreground">
                <Star className="size-4 fill-amber-400 text-amber-400" />
                {restaurant.noteMoyenne}
              </span>
            ) : null}
            {restaurant.geo ? (
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <MapPinned className="size-4 text-primary" />
                {restaurant.geo.distanceKm} km
              </span>
            ) : null}
          </div>
        </section>

        {restaurant.description ? (
          <section aria-labelledby="about-heading" className="border-b py-5">
            <p className="text-xs font-bold tracking-[0.14em] text-muted-foreground uppercase">Le restaurant</p>
            <h2 id="about-heading" className="mt-1 text-xl font-bold tracking-tight">À propos</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">{restaurant.description}</p>
          </section>
        ) : null}

        <section aria-labelledby="contact-heading" className="py-5">
          <p className="text-xs font-bold tracking-[0.14em] text-muted-foreground uppercase">Informations utiles</p>
          <h2 id="contact-heading" className="mt-1 text-xl font-bold tracking-tight">Contact et accès</h2>
          <Card className="mt-3 gap-0 py-0">
            <CardContent className="flex items-start gap-3 py-3.5">
              <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <MapPinned className="size-4" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold">Adresse</p>
                <p className="mt-0.5 text-sm leading-5 text-muted-foreground">{restaurant.adresse}</p>
              </div>
            </CardContent>

            {restaurant.geo ? (
              <div className="flex items-center gap-3 border-t px-4 py-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Navigation className="size-4" />
                </span>
                <p className="text-sm text-muted-foreground">
                  À <span className="font-semibold text-foreground">{restaurant.geo.distanceKm} km</span> de votre position
                  {restaurant.geo.itineraire ? ` · environ ${restaurant.geo.itineraire.dureeMinutes} min de trajet` : ""}
                </p>
              </div>
            ) : null}

            <div className="border-t">
              <Button asChild variant="ghost" className="h-auto w-full justify-start rounded-none px-4 py-3.5 text-left hover:bg-muted/60">
                <a href={`tel:${restaurant.telephone.replace(/\s/g, "")}`}>
                  <Phone className="size-4 text-primary" />
                  <span className="flex flex-col items-start gap-0.5">
                    <span className="text-sm font-semibold">Appeler le restaurant</span>
                    <span className="text-xs font-normal text-muted-foreground">{restaurant.telephone}</span>
                  </span>
                </a>
              </Button>
            </div>

            {restaurant.email ? (
              <div className="border-t">
                <Button asChild variant="ghost" className="h-auto w-full justify-start rounded-none px-4 py-3.5 text-left hover:bg-muted/60">
                  <a href={`mailto:${restaurant.email}`}>
                    <Mail className="size-4 text-primary" />
                    <span className="flex flex-col items-start gap-0.5">
                      <span className="text-sm font-semibold">Envoyer un e-mail</span>
                      <span className="text-xs font-normal text-muted-foreground">{restaurant.email}</span>
                    </span>
                  </a>
                </Button>
              </div>
            ) : null}

            {externalUrl(restaurant.siteWeb) ? (
              <div className="border-t">
                <Button asChild variant="ghost" className="h-auto w-full justify-start rounded-none px-4 py-3.5 text-left hover:bg-muted/60">
                  <a href={externalUrl(restaurant.siteWeb) ?? undefined} target="_blank" rel="noreferrer">
                    <Globe2 className="size-4 text-primary" />
                    <span className="text-sm font-semibold">Visiter le site web</span>
                  </a>
                </Button>
              </div>
            ) : null}

            {externalUrl(restaurant.instagram) ? (
              <div className="border-t">
                <Button asChild variant="ghost" className="h-auto w-full justify-start rounded-none px-4 py-3.5 text-left hover:bg-muted/60">
                  <a href={externalUrl(restaurant.instagram) ?? undefined} target="_blank" rel="noreferrer">
                    <AtSign className="size-4 text-primary" />
                    <span className="text-sm font-semibold">Voir Instagram</span>
                  </a>
                </Button>
              </div>
            ) : null}

            {whatsappUrl(restaurant.whatsapp) ? (
              <div className="border-t">
                <Button asChild variant="ghost" className="h-auto w-full justify-start rounded-none px-4 py-3.5 text-left hover:bg-muted/60">
                  <a href={whatsappUrl(restaurant.whatsapp) ?? undefined} target="_blank" rel="noreferrer">
                    <Phone className="size-4 text-primary" />
                    <span className="text-sm font-semibold">Écrire sur WhatsApp</span>
                  </a>
                </Button>
              </div>
            ) : null}
          </Card>
        </section>

        <section aria-labelledby="menu-heading" className="pb-4">
          <div className="mb-3 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold tracking-[0.14em] text-muted-foreground uppercase">À la carte</p>
              <h2 id="menu-heading" className="mt-1 text-xl font-bold tracking-tight">Le menu</h2>
            </div>
            <span className="text-xs text-muted-foreground">{availableCategories.reduce((count, category) => count + category.plats.filter((plat) => plat.disponible).length, 0)} plats</span>
          </div>

          {menuError ? (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle />
              <AlertTitle>Menu indisponible</AlertTitle>
              <AlertDescription>{menuError}</AlertDescription>
            </Alert>
          ) : null}

          {isMenuLoading ? (
            <div className="space-y-3 pb-4"><Skeleton className="h-11 w-full" /><Skeleton className="h-20 w-full" /><Skeleton className="h-20 w-full" /></div>
          ) : null}

          {!isMenuLoading && !menuError && availableCategories.length > 1 ? (
            <Tabs
              value={activeCategory ?? "all"}
              onValueChange={handleCategoryChange}
              variant="underline"
              className="mb-4 overflow-x-auto scrollbar-hide"
            >
              <TabsList className="h-11 min-w-max gap-0">
                <TabsTrigger value="all" className="h-11 px-3.5 text-sm" indicatorClassName="h-0.5 bg-primary">
                  Tout le menu
                </TabsTrigger>
                {availableCategories.map((category) => (
                  <TabsTrigger
                    key={category.id}
                    value={category.id}
                    className="h-11 px-3.5 text-sm"
                    indicatorClassName="h-0.5 bg-primary"
                  >
                    {category.nom}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          ) : null}

          {!isMenuLoading && !menuError && availableCategories.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">Aucun plat disponible pour le moment.</p>
          ) : null}

          {!isMenuLoading && !menuError ? <AnimatePresence initial={false} mode="wait">
            <motion.div
              key={activeCategory ?? "all"}
              initial={{ opacity: 0, x: reduceMotion ? 0 : tabDirection * 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: reduceMotion ? 0 : tabDirection * -24 }}
              transition={{ duration: reduceMotion ? 0 : 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="space-y-6"
            >
              {displayedCategories.map((category) => (
              <section key={category.id} aria-labelledby={`category-${category.id}`}>
                <h3 id={`category-${category.id}`} className="mb-2 text-sm font-bold text-foreground">{category.nom}</h3>
                <Card className="gap-0 py-0">
                  {category.plats.filter((plat) => plat.disponible).map((plat, index, plats) => {
                    const quantity = panierItems.find((item) => item.platId === plat.id)?.quantite ?? 0;
                    const justAdded = lastAddedId === plat.id;

                    return (
                      <motion.div
                        key={plat.id}
                        layout
                        initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2, delay: Math.min(index * 0.035, 0.18) }}
                        className={index < plats.filter((item) => item.disponible).length - 1 ? "border-b" : ""}
                      >
                        <CardContent className="flex items-center gap-3 py-3">
                          <div className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-muted">
                            {plat.photoUrl ? (
                              <Image src={plat.photoUrl} alt={plat.nom} fill sizes="64px" className="object-cover" />
                            ) : (
                              <span className="flex size-full items-center justify-center text-xl">🍽️</span>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-foreground">{plat.nom}</p>
                            {plat.description ? <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{plat.description}</p> : null}
                            <p className="mt-1.5 text-sm font-bold text-primary">{formatPrix(plat.prix)}</p>
                          </div>
                          <Button
                            type="button"
                            size="icon-lg"
                            onClick={() => handleAdd(plat)}
                            className="relative shrink-0 rounded-xl"
                            aria-label={`Ajouter ${plat.nom} au panier`}
                          >
                            <Plus className="size-4" />
                            {quantity > 0 ? (
                              <motion.span
                                key={quantity}
                                initial={reduceMotion ? false : { scale: 0.5, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full bg-foreground text-[10px] font-bold text-background ring-2 ring-background"
                              >
                                {quantity}
                              </motion.span>
                            ) : null}
                            {justAdded ? <span className="sr-only">Ajouté au panier</span> : null}
                          </Button>
                        </CardContent>
                      </motion.div>
                    );
                  })}
                </Card>
              </section>
              ))}
            </motion.div>
          </AnimatePresence> : null}
        </section>
      </div>

      <PanierFlottant />
    </main>
  );
}
