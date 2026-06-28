"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

interface OrdersOverviewProps {
  data?: { date: string; orders: number }[];
  totalOrders?: number;
}

export function OrdersOverview({
  data = [],
  totalOrders = 0,
}: OrdersOverviewProps) {
  const hasData = data.length > 0;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-base font-semibold">
            Aperçu des commandes
          </CardTitle>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs font-medium text-brand-green">Total</span>
            <span className="text-lg font-bold text-brand-green">
              {totalOrders}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        {!hasData ? (
          <div className="h-45 flex items-center justify-center border-2 border-dashed rounded-lg">
            <p className="text-muted-foreground text-sm">
              Données insuffisantes
            </p>
          </div>
        ) : (
          <div className="h-45 w-full">
            <ResponsiveContainer>
              <BarChart
                data={data}
                margin={{ top: 10, right: 0, left: -20, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="oklch(0.9 0.01 145)"
                />
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "oklch(0.5 0.02 145)", fontSize: 11 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "oklch(0.5 0.02 145)", fontSize: 11 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "white",
                    border: "1px solid oklch(0.9 0.01 145)",
                    borderRadius: "8px",
                  }}
                  formatter={(value) =>
                    value !== undefined ? [`${value} commandes`, ""] : ["", ""]
                  }
                />
                <Bar dataKey="orders" radius={[4, 4, 0, 0]}>
                  {data.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        index === data.length - 1
                          ? "oklch(0.45 0.15 145)"
                          : "oklch(0.85 0.05 145)"
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
