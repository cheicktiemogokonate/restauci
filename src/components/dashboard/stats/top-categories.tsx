"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { DASHBOARD_CHART_CONTAINER_PROPS } from "./chart-layout";

interface TopCategoriesProps {
  data?: { name: string; value: number; color: string }[];
}

export function TopCategories({ data = [] }: TopCategoriesProps) {
  const hasData = data.length > 0;

  return (
    <Card className="min-w-0">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-semibold sm:text-base">
          Top Catégories
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {!hasData ? (
          <div className="h-45 mt-4 flex items-center justify-center border-2 border-dashed rounded-lg">
            <p className="text-muted-foreground text-sm">
              Données insuffisantes
            </p>
          </div>
        ) : (
          <>
            <div className="h-44 min-h-0 w-full min-w-0 sm:h-52">
              <ResponsiveContainer {...DASHBOARD_CHART_CONTAINER_PROPS}>
                <PieChart>
                  <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 flex flex-wrap justify-start gap-x-3 gap-y-2 sm:justify-center">
              {data.map((item) => (
                <div key={item.name} className="flex items-center gap-1.5">
                  <div
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-[11px] text-muted-foreground sm:text-xs">
                    {item.name} {item.value}%
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
