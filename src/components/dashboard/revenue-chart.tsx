"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const data = [
  { month: "Mar", income: 14000, expense: 8000 },
  { month: "Apr", income: 12000, expense: 9500 },
  { month: "May", income: 16000, expense: 7000 },
  { month: "Jun", income: 13000, expense: 10000 },
  { month: "Jul", income: 18000, expense: 8500 },
  { month: "Aug", income: 21000, expense: 12000 },
  { month: "Sep", income: 24200, expense: 14200 },
  { month: "Oct", income: 19000, expense: 11000 },
];

export function RevenueChart() {
  return (
    <Card className="col-span-full lg:col-span-2">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-base font-semibold">Total Revenue</CardTitle>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold">$45,860</span>
            <span className="text-xs text-muted-foreground">Sep 2025</span>
            <span className="text-xs text-muted-foreground">$14,200</span>
          </div>
        </div>
        <Select defaultValue="6months">
          <SelectTrigger className="w-[130px] h-8 text-xs">
            <SelectValue placeholder="Select period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="6months">Last 6 Months</SelectItem>
            <SelectItem value="year">Last Year</SelectItem>
            <SelectItem value="all">All Time</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-brand-green" />
            <span className="text-xs text-muted-foreground">Income</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-muted-foreground/30" />
            <span className="text-xs text-muted-foreground">Expense</span>
          </div>
        </div>
        <div className="h-[200px] sm:h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="oklch(0.45 0.15 145)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="oklch(0.45 0.15 145)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="oklch(0.7 0.02 145)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="oklch(0.7 0.02 145)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="oklch(0.9 0.01 145)" />
              <XAxis
                dataKey="month"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "oklch(0.5 0.02 145)", fontSize: 12 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "oklch(0.5 0.02 145)", fontSize: 12 }}
                tickFormatter={(value) => `${value / 1000}K`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "white",
                  border: "1px solid oklch(0.9 0.01 145)",
                  borderRadius: "8px",
                  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                }}
                formatter={(value: any) => [`$${value.toLocaleString()}`, "Revenue"]}
              />
              <Area
                type="monotone"
                dataKey="expense"
                stroke="oklch(0.7 0.02 145)"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorExpense)"
              />
              <Area
                type="monotone"
                dataKey="income"
                stroke="oklch(0.45 0.15 145)"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorIncome)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
