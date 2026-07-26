"use client";

import { Input } from "@/components/motion/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/motion/tabs";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

const RESOURCE_TYPES = [
  { value: "tous", label: "Toutes" },
  { value: "restaurant", label: "Restaurants" },
  { value: "user", label: "Comptes" },
  { value: "client", label: "Clients" },
  { value: "commission", label: "Finance" },
  { value: "systeme", label: "Système" },
];

export function AuditAdminFilters({
  initialResourceType,
  initialResourceId,
}: {
  initialResourceType?: string;
  initialResourceId?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [resourceId, setResourceId] = useState(initialResourceId ?? "");

  const navigate = (params: URLSearchParams) => {
    params.delete("page");
    router.push(`?${params.toString()}`);
  };

  const changeResourceType = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "tous") params.delete("type");
    else params.set("type", value);
    navigate(params);
  };

  const applyResourceId = () => {
    const params = new URLSearchParams(searchParams.toString());
    const normalized = resourceId.trim();
    if (normalized) params.set("ressource", normalized);
    else params.delete("ressource");
    navigate(params);
  };

  return (
    <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
      <Tabs
        value={initialResourceType ?? "tous"}
        onValueChange={changeResourceType}
        variant="underline"
        className="max-w-full overflow-x-auto scrollbar-hide"
      >
        <TabsList className="h-11 min-w-max gap-0">
          {RESOURCE_TYPES.map((type) => (
            <TabsTrigger
              key={type.value}
              value={type.value}
              className="h-11 px-3.5 text-sm"
              indicatorClassName="h-0.5 bg-emerald-600"
            >
              {type.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="flex w-full gap-2 xl:ml-auto xl:w-auto">
        <Input
          value={resourceId}
          onChange={setResourceId}
          onKeyDown={(event) => event.key === "Enter" && applyResourceId()}
          aria-label="Identifiant de la ressource"
          placeholder="Identifiant exact d’une ressource"
          leftIcon={<Search />}
          className="min-w-0 flex-1 xl:w-72"
          classNames={{ field: "h-10 rounded-xl bg-white" }}
        />
        <Button type="button" onClick={applyResourceId} className="h-auto">
          Filtrer
        </Button>
      </div>
    </div>
  );
}
