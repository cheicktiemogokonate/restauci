"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { ShoppingBag, Truck, Package } from "lucide-react";

const orderTypes = [
  {
    icon: ShoppingBag,
    label: "En Salle",
    percentage: 45,
    count: 500,
    color: "bg-brand-green",
  },
  {
    icon: Truck,
    label: "Takeaway",
    percentage: 30,
    count: 600,
    color: "bg-brand-green/70",
  },
  {
    icon: Package,
    label: "À emporter",
    percentage: 20,
    count: 300,
    color: "bg-brand-green/40",
  },
];

export function OrderTypes() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-semibold">Order Types</CardTitle>
        <Select defaultValue="month">
          <SelectTrigger className="w-[110px] h-8 text-xs">
            <SelectValue placeholder="Select period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">This Week</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
            <SelectItem value="year">This Year</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="space-y-4 pt-2">
        {orderTypes.map((type) => (
          <div key={type.label} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                  <type.icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium">{type.label}</p>
                  <p className="text-xs text-muted-foreground">{type.percentage}%</p>
                </div>
              </div>
              <span className="text-sm font-semibold">{type.count}</span>
            </div>
            <Progress value={type.percentage} className="h-2" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
