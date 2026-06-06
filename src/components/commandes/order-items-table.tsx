"use client";

import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";

interface OrderItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  notes?: string;
  unitPrice: number;
  total: number;
  image: string;
}

interface OrderItemsTableProps {
  items: OrderItem[];
  subtotal: number;
  total: number;
}

export function OrderItemsTable({
  items,
  subtotal,
  total,
}: OrderItemsTableProps) {
  return (
    <Card className="border border-border/60 shadow-sm rounded-2xl overflow-hidden h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between pb-2 pt-6">
        <CardTitle className="text-lg font-bold">
          Articles commandés
        </CardTitle>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        <div className="overflow-x-auto flex-1">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/40 text-[13px] text-muted-foreground">
                <th className="text-left pb-3 font-medium">Article</th>
                <th className="text-center pb-3 font-medium">Qté</th>
                <th className="text-left pb-3 font-medium">Notes</th>
                <th className="text-right pb-3 font-medium">Prix unitaire</th>
                <th className="text-right pb-3 font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-border/40 last:border-0">
                  <td className="py-4">
                    <div className="flex items-center gap-4">
                      <div className="relative h-12 w-12 rounded-xl overflow-hidden flex-shrink-0 bg-muted/20 border border-border/50">
                        <Image
                          src={item.image}
                          alt={item.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div>
                        <p className="font-semibold text-[14px]">{item.name}</p>
                        <p className="text-[12px] text-muted-foreground mt-0.5">
                          {item.category}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="text-center py-4 font-medium text-[14px]">{item.quantity}</td>
                  <td className="py-4">
                    {item.notes && (
                      <Badge
                        variant="secondary"
                        className="bg-orange-50 text-orange-600 border-orange-100 font-medium px-2.5 py-0.5"
                      >
                        {item.notes}
                      </Badge>
                    )}
                  </td>
                  <td className="text-right py-4 font-medium text-[14px]">
                    {item.unitPrice.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €
                  </td>
                  <td className="text-right py-4 font-semibold text-[14px]">
                    {item.total.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 pt-4 border-t border-border/60 space-y-3">
          <div className="flex justify-end gap-16 text-[14px]">
            <span className="font-semibold text-foreground">Sous-total</span>
            <span className="font-semibold w-24 text-right">{subtotal.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €</span>
          </div>
          <div className="flex justify-end gap-16 text-[16px]">
            <span className="font-bold text-foreground">Total à payer</span>
            <span className="font-bold w-24 text-right text-[#2d7d46]">
              {total.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
