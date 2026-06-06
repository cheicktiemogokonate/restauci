"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Expand, Plus, Minus, Navigation, Store, User, Car, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DeliveryMapProps {
  restaurantName: string;
  restaurantAddress: string;
  customerName: string;
  customerAddress: string;
  distance: string;
  estimatedTime: string;
  departureTime: string;
  departureDate: string;
  arrivalTime: string;
  arrivalDate: string;
}

export function DeliveryMap({
  restaurantName,
  restaurantAddress,
  customerName,
  customerAddress,
  distance,
  estimatedTime,
  departureTime,
  departureDate,
  arrivalTime,
  arrivalDate,
}: DeliveryMapProps) {
  return (
    <Card className="border border-border/60 shadow-sm rounded-2xl overflow-hidden h-full flex flex-col">
      <CardContent className="p-0 flex-1 flex flex-col">
        {/* Map Container */}
        <div className="relative flex-1 min-h-[280px] bg-muted">
          {/* Static map background */}
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: `url('https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/-122.4194,37.7749,12,0/600x400?access_token=pk.placeholder')`,
              backgroundColor: "#e8e4dc",
            }}
          >
            {/* Simulated map with street grid */}
            <svg
              className="absolute inset-0 w-full h-full"
              viewBox="0 0 600 280"
              preserveAspectRatio="xMidYMid slice"
            >
              {/* Background */}
              <rect width="600" height="280" fill="#e8e4dc" />

              {/* Major roads */}
              <line
                x1="0"
                y1="100"
                x2="600"
                y2="100"
                stroke="#fff"
                strokeWidth="8"
              />
              <line
                x1="0"
                y1="180"
                x2="600"
                y2="180"
                stroke="#fff"
                strokeWidth="8"
              />
              <line
                x1="150"
                y1="0"
                x2="150"
                y2="280"
                stroke="#fff"
                strokeWidth="6"
              />
              <line
                x1="300"
                y1="0"
                x2="300"
                y2="280"
                stroke="#fff"
                strokeWidth="6"
              />
              <line
                x1="450"
                y1="0"
                x2="450"
                y2="280"
                stroke="#fff"
                strokeWidth="6"
              />

              {/* Minor streets */}
              <line
                x1="0"
                y1="50"
                x2="600"
                y2="50"
                stroke="#fff"
                strokeWidth="3"
              />
              <line
                x1="0"
                y1="140"
                x2="600"
                y2="140"
                stroke="#fff"
                strokeWidth="3"
              />
              <line
                x1="0"
                y1="220"
                x2="600"
                y2="220"
                stroke="#fff"
                strokeWidth="3"
              />
              <line
                x1="75"
                y1="0"
                x2="75"
                y2="280"
                stroke="#fff"
                strokeWidth="3"
              />
              <line
                x1="225"
                y1="0"
                x2="225"
                y2="280"
                stroke="#fff"
                strokeWidth="3"
              />
              <line
                x1="375"
                y1="0"
                x2="375"
                y2="280"
                stroke="#fff"
                strokeWidth="3"
              />
              <line
                x1="525"
                y1="0"
                x2="525"
                y2="280"
                stroke="#fff"
                strokeWidth="3"
              />

              {/* Highway */}
              <path
                d="M 50 30 Q 200 60 350 40 Q 500 20 580 50"
                stroke="#f5d442"
                strokeWidth="6"
                fill="none"
              />
              <circle cx="180" cy="50" r="12" fill="#f5d442" />
              <text
                x="180"
                y="54"
                textAnchor="middle"
                fill="#333"
                fontSize="10"
                fontWeight="bold"
              >
                101
              </text>

              {/* Delivery route */}
              <path
                d="M 120 160 L 200 160 L 200 100 L 350 100 L 350 180 L 480 180"
                stroke="#16a34a"
                strokeWidth="4"
                fill="none"
                strokeDasharray="4 4"
              />

              {/* Restaurant marker */}
              <circle cx="120" cy="160" r="8" fill="#16a34a" />
              <circle cx="120" cy="160" r="4" fill="#fff" />

              {/* Delivery marker */}
              <circle cx="480" cy="180" r="10" fill="#fff" stroke="#333" strokeWidth="2" />
              <path
                d="M 480 170 L 480 185 M 475 175 L 485 175"
                stroke="#333"
                strokeWidth="2"
              />

              {/* Area labels */}
              <text
                x="100"
                y="80"
                fill="#666"
                fontSize="11"
                fontWeight="500"
              >
                MARINA DISTRICT
              </text>
              <text
                x="280"
                y="130"
                fill="#666"
                fontSize="11"
                fontWeight="500"
              >
                PACIFIC HEIGHTS
              </text>
              <text
                x="400"
                y="220"
                fill="#666"
                fontSize="11"
                fontWeight="500"
              >
                WESTERN ADDITION
              </text>
              <text
                x="500"
                y="250"
                fill="#333"
                fontSize="14"
                fontWeight="600"
              >
                San Francisco
              </text>

              {/* Street names */}
              <text
                x="520"
                y="95"
                fill="#888"
                fontSize="8"
              >
                Clay St
              </text>
              <text
                x="520"
                y="175"
                fill="#888"
                fontSize="8"
              >
                Bush St
              </text>
              <text
                x="360"
                y="250"
                fill="#888"
                fontSize="8"
              >
                Ellis St
              </text>
            </svg>
          </div>

          {/* Map controls */}
          <div className="absolute top-3 right-3 flex flex-col gap-2">
            <Button
              variant="secondary"
              size="icon"
              className="h-8 w-8 bg-white shadow-md rounded-lg"
            >
              <Expand className="h-4 w-4" />
            </Button>
          </div>
          <div className="absolute bottom-6 right-3 flex flex-col gap-1">
            <Button
              variant="secondary"
              size="icon"
              className="h-8 w-8 bg-white shadow-md rounded-b-none rounded-t-lg"
            >
              <Plus className="h-4 w-4" />
            </Button>
            <Button
              variant="secondary"
              size="icon"
              className="h-8 w-8 bg-white shadow-md rounded-t-none rounded-b-lg"
            >
              <Minus className="h-4 w-4" />
            </Button>
            <Button
              variant="secondary"
              size="icon"
              className="mt-2 h-8 w-8 bg-white shadow-md rounded-lg"
            >
              <Navigation className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Delivery info */}
        <div className="p-5 space-y-6 bg-white shrink-0">
          {/* Route summary */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <p className="font-bold text-[14px]">{restaurantName}</p>
              <p className="text-[12px] text-muted-foreground mt-0.5 flex items-center gap-1.5">
                <Store className="h-3.5 w-3.5" />
                {restaurantAddress}
              </p>
            </div>

            <div className="flex flex-col items-center w-full max-w-[200px] shrink-0">
              <div className="flex items-center gap-1.5 text-[12px] font-semibold text-muted-foreground mb-3">
                <span>{distance}</span>
                <span>~</span>
                <span>{estimatedTime}</span>
              </div>
              <div className="relative w-full flex items-center">
                <div className="h-[3px] w-full bg-[#2d7d46] rounded-full" />
                <div className="absolute -left-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-white text-[#2d7d46] shadow-sm">
                  <Store className="h-3.5 w-3.5" />
                </div>
                <div className="absolute left-1/2 -translate-x-1/2 flex h-[28px] w-[28px] items-center justify-center rounded-full border-2 border-white bg-[#2d7d46] text-white shadow-sm">
                  <Car className="h-4 w-4" />
                </div>
                <div className="absolute -right-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-white text-[#2d7d46] shadow-sm">
                  <Home className="h-3.5 w-3.5" />
                </div>
              </div>
            </div>

            <div className="flex-1 text-right">
              <p className="font-bold text-[14px]">{customerName}</p>
              <p className="text-[12px] text-muted-foreground mt-0.5 flex justify-end items-center gap-1.5">
                <User className="h-3.5 w-3.5" />
                {customerAddress}
              </p>
            </div>
          </div>

          {/* Times */}
          <div className="flex justify-between text-[12px] pt-2 border-t border-border/60">
            <div>
              <p className="text-muted-foreground mb-1">Heure de livraison</p>
              <p className="font-bold text-[13px] text-foreground">
                {departureTime}, {departureDate}
              </p>
            </div>
            <div className="text-right">
              <p className="text-muted-foreground mb-1">Arrivée estimée</p>
              <p className="font-bold text-[13px] text-foreground">
                {arrivalTime}, {arrivalDate}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
