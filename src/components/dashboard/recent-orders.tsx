"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface Order {
  id: string;
  image: string;
  name: string;
  category: string;
  quantity: number;
  amount: string;
  customer: string;
  status: "On Process" | "Cancelled" | "Completed";
}

const orders: Order[] = [
  {
    id: "ORD1025",
    image: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=100&h=100&fit=crop",
    name: "Salmon Sushi Roll",
    category: "Seafood",
    quantity: 3,
    amount: "$30.00",
    customer: "Dani White",
    status: "On Process",
  },
  {
    id: "ORD1026",
    image: "https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=100&h=100&fit=crop",
    name: "Spaghetti Carbonara",
    category: "Pasta",
    quantity: 1,
    amount: "$15.50",
    customer: "Eve Carter",
    status: "Cancelled",
  },
  {
    id: "ORD1027",
    image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=100&h=100&fit=crop",
    name: "Classic Cheeseburger",
    category: "Burger",
    quantity: 1,
    amount: "$10.00",
    customer: "Charlie Brown",
    status: "Completed",
  },
];

const statusStyles = {
  "On Process": "bg-primary/10 text-primary border-primary/20",
  Cancelled: "bg-destructive/10 text-destructive border-destructive/20",
  Completed: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
};

export function RecentOrders() {
  return (
    <Card className="col-span-full">
      <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 space-y-0 pb-4">
        <CardTitle className="text-base font-semibold">Recent Orders</CardTitle>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search placeholder"
              className="pl-9 w-full sm:w-[200px] h-9 text-sm"
            />
          </div>
          <Select defaultValue="week">
            <SelectTrigger className="w-full sm:w-[110px] h-9 text-xs">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="text-xs">
            See All Orders
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto -mx-6 px-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Order ID</TableHead>
                <TableHead className="text-xs">Photo</TableHead>
                <TableHead className="text-xs">Menu</TableHead>
                <TableHead className="text-xs text-center">Qty</TableHead>
                <TableHead className="text-xs">Amount</TableHead>
                <TableHead className="text-xs">Customer</TableHead>
                <TableHead className="text-xs">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium text-sm">{order.id}</TableCell>
                  <TableCell>
                    <div className="relative h-10 w-10 overflow-hidden rounded-lg">
                      <Image
                        src={order.image}
                        alt={order.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium text-sm">{order.name}</p>
                      <p className="text-xs text-muted-foreground">{order.category}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-center text-sm">{order.quantity}</TableCell>
                  <TableCell className="font-medium text-sm">{order.amount}</TableCell>
                  <TableCell className="text-sm">{order.customer}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn("text-xs font-medium", statusStyles[order.status])}
                    >
                      {order.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
