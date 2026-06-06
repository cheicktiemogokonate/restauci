"use client";

import React from "react";
import Image from "next/image";
import { Header } from "@/components/dashboard/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, MoreHorizontal, ChevronDown, ChevronUp, Star, ChevronLeft, ChevronRight } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Categorie, CreneauHoraire, Plat } from "@/types";

const mockDishes = [
  { id: 1, name: "Smokey Supreme Pizza", cat: "Pizza", rating: 4.5, reviews: 128, price: "12,00 €", image: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&h=300&fit=crop", badge: "Personnalisable", badgeClass: "bg-[#fff6ed] text-[#c2410c]" },
  { id: 2, name: "Saumon grillé", cat: "Poisson", rating: 4.7, reviews: 96, price: "22,00 €", image: "https://images.unsplash.com/photo-1485921325833-c519f76c4927?w=400&h=300&fit=crop", badge: "Personnalisable", badgeClass: "bg-[#fff6ed] text-[#c2410c]", discount: "-10%", discountClass: "bg-[#2d7d46] text-white" },
  { id: 3, name: "Poulet grillé", cat: "Poulet", rating: 4.8, reviews: 112, price: "18,00 €", image: "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=400&h=300&fit=crop" },
  { id: 4, name: "Salade de crevettes épicée", cat: "Salade", rating: 4.4, reviews: 74, price: "8,00 €", image: "https://images.unsplash.com/photo-1548943487-a2e4f43b4850?w=400&h=300&fit=crop" },
  { id: 5, name: "Moelleux au chocolat", cat: "Dessert", rating: 4.9, reviews: 87, price: "10,00 €", image: "https://images.unsplash.com/photo-1511018556340-d16986a1c194?w=400&h=300&fit=crop", badge: "Personnalisable", badgeClass: "bg-[#fff6ed] text-[#c2410c]" },
  { id: 6, name: "Cheeseburger classique", cat: "Burger", rating: 4.6, reviews: 103, price: "10,00 €", image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=300&fit=crop", badge: "Promo 1 acheté = 1 offert", badgeClass: "bg-[#e2f5e9] text-[#2d7d46]" },
  { id: 7, name: "Spaghetti Carbonara", cat: "Pâtes", rating: 4.7, reviews: 89, price: "15,00 €", image: "https://images.unsplash.com/photo-1612874742237-6526221588e3?w=400&h=300&fit=crop", badge: "Offre saisonnière", badgeClass: "bg-[#e2f5e9] text-[#2d7d46]" },
  { id: 8, name: "Cuisses de dinde rôties", cat: "Poulet", rating: 4.5, reviews: 67, price: "8,00 €", image: "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=400&h=300&fit=crop", badge: "Personnalisable", badgeClass: "bg-[#fff6ed] text-[#c2410c]" },
  { id: 9, name: "Gâteau agrumes", cat: "Dessert", rating: 4.8, reviews: 59, price: "8,50 €", image: "https://images.unsplash.com/photo-1551024506-0bccd828d307?w=400&h=300&fit=crop", badge: "Remise membre", badgeClass: "bg-white text-[#2d7d46] border border-[#2d7d46]" },
];

interface MenuManagerProps {
  categories: Categorie[];
  creneaux: CreneauHoraire[];
  initialPlats: Plat[];
}

export default function MenuManager({ categories, creneaux, initialPlats }: MenuManagerProps) {
  return (
    <div className="flex flex-1 flex-col min-h-full overflow-hidden bg-background">
      <Header
        title="Menu"
        breadcrumb={[
          { label: "Dashboard", href: "/restaurateur" },
          { label: "Menu" },
        ]}
      />

      <main className="flex-1 overflow-y-auto p-6 lg:p-8 flex flex-col lg:flex-row gap-8">
        {/* Left Sidebar Filters */}
        <aside className="w-full lg:w-[280px] shrink-0 space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="text-[18px] font-bold text-foreground">Filtres</h2>
            <button className="text-[13px] font-medium text-[#2d7d46] hover:underline">
              Réinitialiser
            </button>
          </div>

          {/* Catégories */}
          <div className="space-y-4">
            <div className="flex items-center justify-between cursor-pointer">
              <h3 className="font-semibold text-[15px]">Catégories</h3>
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="space-y-3">
              <label className="flex items-center justify-between cursor-pointer group">
                <div className="flex items-center gap-3">
                  <input type="checkbox" defaultChecked className="h-[18px] w-[18px] rounded-[4px] border-border/60 text-[#2d7d46] focus:ring-[#2d7d46] accent-[#2d7d46] cursor-pointer" />
                  <span className="text-[14px] font-medium text-foreground group-hover:text-foreground">Toutes</span>
                </div>
              </label>
              {[
                { icon: "🍕", label: "Pizzas", count: 12 },
                { icon: "🍝", label: "Pâtes", count: 8 },
                { icon: "🍔", label: "Burgers", count: 6 },
                { icon: "🥗", label: "Salades", count: 7 },
                { icon: "🍲", label: "Plats", count: 10 },
                { icon: "🍰", label: "Desserts", count: 6 },
                { icon: "🥤", label: "Boissons", count: 9 },
                { icon: "🍳", label: "Petit déjeuner", count: 5 },
                { icon: "🍪", label: "Autres", count: 4 },
              ].map((cat, i) => (
                <label key={i} className="flex items-center justify-between cursor-pointer group">
                  <div className="flex items-center gap-3">
                    <input type="checkbox" className="h-[18px] w-[18px] rounded-[4px] border-border/60 text-[#2d7d46] focus:ring-[#2d7d46] accent-[#2d7d46] cursor-pointer" />
                    <span className="text-[14px] text-muted-foreground group-hover:text-foreground flex items-center gap-2">
                      <span className="text-[16px]">{cat.icon}</span> {cat.label}
                    </span>
                  </div>
                  <span className="text-[13px] text-muted-foreground/60">{cat.count}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Moments de la journée */}
          <div className="space-y-4 border-t border-border/50 pt-6">
            <div className="flex items-center justify-between cursor-pointer">
              <h3 className="font-semibold text-[15px]">Moments de la journée</h3>
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="space-y-3">
              {[
                { label: "Tous", checked: true },
                { label: "Petit déjeuner", checked: false },
                { label: "Déjeuner", checked: false },
                { label: "Dîner", checked: false },
                { label: "Snack", checked: false },
              ].map((moment, i) => (
                <label key={i} className="flex items-center gap-3 cursor-pointer group">
                  <input type="checkbox" defaultChecked={moment.checked} className="h-[18px] w-[18px] rounded-[4px] border-border/60 text-[#2d7d46] focus:ring-[#2d7d46] accent-[#2d7d46] cursor-pointer" />
                  <span className={`text-[14px] ${moment.checked ? 'font-medium text-foreground' : 'text-muted-foreground'} group-hover:text-foreground`}>
                    {moment.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Fourchette de prix */}
          <div className="space-y-4 border-t border-border/50 pt-6">
            <div className="flex items-center justify-between cursor-pointer">
              <h3 className="font-semibold text-[15px]">Fourchette de prix</h3>
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="space-y-3">
              {[
                { label: "Tous", checked: true },
                { label: "0 € - 10 €", checked: false },
                { label: "10 € - 20 €", checked: false },
                { label: "20 € - 30 €", checked: false },
                { label: "30 € et +", checked: false },
              ].map((price, i) => (
                <label key={i} className="flex items-center gap-3 cursor-pointer group">
                  <input type="checkbox" defaultChecked={price.checked} className="h-[18px] w-[18px] rounded-[4px] border-border/60 text-[#2d7d46] focus:ring-[#2d7d46] accent-[#2d7d46] cursor-pointer" />
                  <span className={`text-[14px] ${price.checked ? 'font-medium text-foreground' : 'text-muted-foreground'} group-hover:text-foreground`}>
                    {price.label}
                  </span>
                </label>
              ))}
            </div>
            {/* Custom Slider Mock */}
            <div className="pt-4 pb-2">
              <div className="flex items-center justify-between text-[12px] text-muted-foreground mb-2">
                <span>0 €</span>
                <span>50 €</span>
              </div>
              <div className="relative h-1.5 w-full bg-[#e2f5e9] rounded-full flex items-center">
                <div className="absolute h-full w-[80%] bg-[#2d7d46] rounded-full"></div>
                <div className="absolute left-0 h-4 w-4 bg-white border-[3px] border-[#2d7d46] rounded-full shadow-sm cursor-pointer -ml-1"></div>
                <div className="absolute left-[80%] h-4 w-4 bg-white border-[3px] border-[#2d7d46] rounded-full shadow-sm cursor-pointer -ml-2"></div>
              </div>
            </div>
          </div>

          {/* Promotions */}
          <div className="space-y-4 border-t border-border/50 pt-6">
            <div className="flex items-center justify-between cursor-pointer">
              <h3 className="font-semibold text-[15px]">Promotions</h3>
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="space-y-3">
              {[
                { label: "Toutes", checked: false },
                { label: "En promotion", checked: false },
                { label: "Offres spéciales", checked: false },
                { label: "Bénéfices membre", checked: false },
              ].map((promo, i) => (
                <label key={i} className="flex items-center gap-3 cursor-pointer group">
                  <input type="checkbox" defaultChecked={promo.checked} className="h-[18px] w-[18px] rounded-[4px] border-border/60 text-[#2d7d46] focus:ring-[#2d7d46] accent-[#2d7d46] cursor-pointer" />
                  <span className={`text-[14px] ${promo.checked ? 'font-medium text-foreground' : 'text-muted-foreground'} group-hover:text-foreground`}>
                    {promo.label}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </aside>

        {/* Right Content */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="relative w-full sm:w-[320px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Rechercher un plat ou ingrédient..." 
                  className="pl-9 h-11 rounded-xl bg-white border-border/60 focus-visible:ring-[#2d7d46] w-full"
                />
              </div>
              <Button className="h-11 px-6 bg-[#2d7d46] hover:bg-[#2d7d46]/90 text-white rounded-xl font-semibold">
                Rechercher
              </Button>
            </div>
            <Button className="h-11 px-5 bg-[#2d7d46] hover:bg-[#2d7d46]/90 text-white rounded-xl font-semibold gap-2 w-full sm:w-auto">
              <Plus className="h-4 w-4" />
              Ajouter un plat
            </Button>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {mockDishes.map((dish) => (
              <div key={dish.id} className="bg-white border border-border/60 rounded-[24px] overflow-hidden shadow-sm hover:shadow-md transition-shadow group flex flex-col">
                <div className="relative h-[200px] w-full overflow-hidden bg-muted">
                  <Image 
                    src={dish.image} 
                    alt={dish.name} 
                    fill 
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  {dish.badge && (
                    <Badge className={`absolute top-4 left-4 font-semibold px-3 py-1 rounded-lg ${dish.badgeClass} border-0`}>
                      {dish.badge}
                    </Badge>
                  )}
                  {dish.discount && (
                    <Badge className={`absolute top-4 right-4 font-bold px-2.5 py-1 rounded-lg ${dish.discountClass} border-0`}>
                      {dish.discount}
                    </Badge>
                  )}
                </div>
                <div className="p-5 flex flex-col flex-1">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="font-bold text-[17px] text-foreground leading-tight line-clamp-2">
                      {dish.name}
                    </h3>
                    <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 -mt-1 text-muted-foreground hover:text-foreground shrink-0">
                      <MoreHorizontal className="h-5 w-5" />
                    </Button>
                  </div>
                  <p className="text-[13px] text-muted-foreground mb-6 font-medium">
                    {dish.cat}
                  </p>
                  <div className="mt-auto flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <div className="flex text-[#facc15]">
                        <Star className="h-4 w-4 fill-current" />
                        <Star className="h-4 w-4 fill-current" />
                        <Star className="h-4 w-4 fill-current" />
                        <Star className="h-4 w-4 fill-current" />
                        <Star className="h-4 w-4 fill-current" />
                      </div>
                      <div className="flex items-center gap-1 text-[13px]">
                        <span className="font-bold text-foreground">{dish.rating}</span>
                        <span className="text-muted-foreground">({dish.reviews})</span>
                      </div>
                    </div>
                    <span className="font-bold text-[16px] text-foreground">
                      {dish.price}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          <div className="mt-8 flex flex-col items-center justify-between gap-6 border-t border-border/60 pt-6 pb-4">
            <div className="flex flex-col sm:flex-row items-center justify-between w-full gap-4">
              <div className="flex items-center gap-3 text-[14px] text-muted-foreground">
                <span>Affichage</span>
                <Select defaultValue="12">
                  <SelectTrigger className="w-[70px] h-9 rounded-xl border-border/80 text-foreground font-medium bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="12">12</SelectItem>
                    <SelectItem value="24">24</SelectItem>
                    <SelectItem value="48">48</SelectItem>
                  </SelectContent>
                </Select>
                <span>sur 56 plats</span>
              </div>
              
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="ghost" className="h-9 w-9 bg-[#2d7d46] hover:bg-[#2d7d46]/90 text-white rounded-xl font-bold">
                  1
                </Button>
                <Button variant="ghost" className="h-9 w-9 text-foreground hover:bg-muted font-medium rounded-xl">
                  2
                </Button>
                <Button variant="ghost" className="h-9 w-9 text-foreground hover:bg-muted font-medium rounded-xl">
                  3
                </Button>
                <Button variant="ghost" className="h-9 w-9 text-muted-foreground hover:bg-transparent cursor-default pointer-events-none">
                  ...
                </Button>
                <Button variant="ghost" className="h-9 w-9 text-foreground hover:bg-muted font-medium rounded-xl">
                  5
                </Button>
                <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
              
            {/* Footer text */}
            <div className="flex flex-col sm:flex-row items-center justify-between w-full mt-4 text-[13px] text-muted-foreground">
              <div className="flex flex-wrap items-center gap-6">
                <span>Copyright © 2025 RestauCI</span>
                <a href="#" className="hover:text-foreground transition-colors">Politique de confidentialité</a>
                <a href="#" className="hover:text-foreground transition-colors">Conditions d&apos;utilisation</a>
                <a href="#" className="hover:text-foreground transition-colors">Contact</a>
              </div>
              <div className="flex items-center gap-4 mt-4 sm:mt-0">
                <a href="#" className="hover:text-foreground transition-colors">
                  <svg className="h-[15px] w-[15px] fill-current" viewBox="0 0 24 24"><path d="M14 13.5h2.5l1-4H14v-2c0-1.03 0-2 2-2h1.5V2.14c-.326-.043-1.557-.14-2.857-.14C11.928 2 10 3.657 10 6.7v2.8H7v4h3V22h4v-8.5z"/></svg>
                </a>
                <a href="#" className="hover:text-foreground transition-colors">
                  <svg className="h-[14px] w-[14px] fill-current" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                </a>
                <a href="#" className="hover:text-foreground transition-colors">
                  <svg className="h-[15px] w-[15px] fill-current" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                </a>
                <a href="#" className="hover:text-foreground transition-colors">
                  <svg className="h-[16px] w-[16px] fill-current" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.5 12 3.5 12 3.5s-7.505 0-9.377.55a3.016 3.016 0 0 0-2.122 2.136C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.55 9.376.55 9.376.55s7.505 0 9.377-.55a3.016 3.016 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
                </a>
                <a href="#" className="hover:text-foreground transition-colors">
                  <svg className="h-[15px] w-[15px] fill-current" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                </a>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
