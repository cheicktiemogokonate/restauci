import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Package, ShoppingBag, Truck } from "lucide-react";

interface OrderTypeStat {
  label: string;
  percentage: number;
  count: number;
  color: string;
  type: "sur_place" | "a_emporter" | "livraison";
}

interface OrderTypesProps {
  data?: OrderTypeStat[];
}

export function OrderTypes({ data = [] }: OrderTypesProps) {
  const hasData = data.length > 0;

  const getIcon = (type: string) => {
    switch (type) {
      case "sur_place":
        return ShoppingBag;
      case "a_emporter":
        return Package;
      case "livraison":
        return Truck;
      default:
        return ShoppingBag;
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-semibold">
          Types de commandes
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-2">
        {!hasData ? (
          <div className="h-45 flex items-center justify-center border-2 border-dashed rounded-lg">
            <p className="text-muted-foreground text-sm">
              Données insuffisantes
            </p>
          </div>
        ) : (
          data.map((type) => {
            const Icon = getIcon(type.type);
            return (
              <div key={type.label} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{type.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {Math.round(type.percentage)}%
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-semibold">{type.count}</span>
                </div>
                <Progress value={type.percentage} className="h-2" />
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
