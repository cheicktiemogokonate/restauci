"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, Eye } from "lucide-react";
import Image from "next/image";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Link from "next/link";

interface MenuItem {
  id: string;
  name: string;
  category: string;
  rating: number;
  views: number;
  price: string;
  image: string;
  badge?: string;
}

const trendingMenus: MenuItem[] = [
  {
    id: "1",
    name: "Couscous Royal RestauCI",
    category: "Burger",
    rating: 4.9,
    views: 250,
    price: "$18.00",
    image: "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400&h=300&fit=crop",
    badge: "1st",
  },
  {
    id: "2",
    name: "Attiéké Poisson Braisé",
    category: "Attiéké Pelaton Braisé",
    rating: 4.9,
    views: 450,
    price: "$10.00",
    image: "https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=400&h=300&fit=crop",
  },
  {
    id: "3",
    name: "Poulet DG aux Bananes Plantains",
    category: "Poulet",
    rating: 4.7,
    views: 870,
    price: "$12.00",
    image: "https://images.unsplash.com/photo-1432139555190-58524dae6a55?w=400&h=300&fit=crop",
  },
];

function MenuCard({ item }: { item: MenuItem }) {
  return (
    <div className="flex group relative overflow-hidden rounded-xl bg-card border border-border">
      <div className="relative aspect-[4/3] overflow-hidden">
        <Image
          src={item.image}
          alt={item.name}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />
        {item.badge && (
          <Badge className="absolute left-2 top-2 bg-brand-green text-white">
            {item.badge}
          </Badge>
        )}
      </div>
      <div className="p-3">
        <h3 className="font-semibold text-sm text-foreground line-clamp-1">{item.name}</h3>
        <p className="text-xs text-muted-foreground mt-0.5">{item.category}</p>
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
              <span className="text-xs font-medium">{item.rating}</span>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <Eye className="h-3.5 w-3.5" />
              <span className="text-xs">{item.views}</span>
            </div>
          </div>
          <span className="text-sm font-bold text-brand-green">{item.price}</span>
        </div>
      </div>
    </div>
  );
}

export function TrendingMenus() {
  return (
    <Card className="col-span-full xl:col-span-1">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-base font-semibold">Trending Menus</CardTitle>
        <Select defaultValue="week">
          <SelectTrigger className="w-[100px] h-8 text-xs">
            <SelectValue placeholder="Select" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">Miss Week</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4">
          {trendingMenus.map((item) => (
            <MenuCard key={item.id} item={item} />
          ))}
        </div>
        <Button asChild variant="outline" className="w-full text-xs">
        <Link href="restaurateur/menu">
          See All Menus
        </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
