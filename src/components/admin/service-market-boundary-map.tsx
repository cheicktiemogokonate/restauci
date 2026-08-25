"use client";

import { useEffect, useId, useMemo } from "react";
import { Map, MapControls, useMap } from "@/components/ui/map";

export interface ServiceMarketBoundaryFeature {
  versionId: string;
  marketId: string;
  marketName: string;
  version: number;
  active: boolean;
  geometry: GeoJSON.MultiPolygon;
  restaurantsInside: number;
  assignmentsToReview: number;
  restaurantsLeaving: number;
}

function BoundaryLayers({ features }: { features: ServiceMarketBoundaryFeature[] }) {
  const { map, isLoaded, isMapAlive } = useMap();
  const reactId = useId().replaceAll(":", "");
  const sourceId = `service-market-boundaries-${reactId}`;
  const fillId = `${sourceId}-fill`;
  const activeLineId = `${sourceId}-active-line`;
  const draftLineId = `${sourceId}-draft-line`;
  const collection = useMemo<GeoJSON.FeatureCollection<GeoJSON.MultiPolygon>>(
    () => ({
      type: "FeatureCollection",
      features: features.map((feature) => ({
        type: "Feature",
        id: feature.versionId,
        properties: {
          active: feature.active,
          marketName: feature.marketName,
          version: feature.version,
        },
        geometry: feature.geometry,
      })),
    }),
    [features],
  );

  useEffect(() => {
    if (!map || !isLoaded || features.length === 0) return;
    map.addSource(sourceId, { type: "geojson", data: collection });
    map.addLayer({
      id: fillId,
      type: "fill",
      source: sourceId,
      paint: {
        "fill-color": ["case", ["get", "active"], "#059669", "#f59e0b"],
        "fill-opacity": ["case", ["get", "active"], 0.22, 0.16],
      },
    });
    map.addLayer({
      id: activeLineId,
      type: "line",
      source: sourceId,
      filter: ["==", ["get", "active"], true],
      paint: {
        "line-color": "#047857",
        "line-width": 2.5,
      },
    });
    map.addLayer({
      id: draftLineId,
      type: "line",
      source: sourceId,
      filter: ["==", ["get", "active"], false],
      paint: {
        "line-color": "#d97706",
        "line-width": 2.5,
        "line-dasharray": [2, 2],
      },
    });

    const positions: [number, number][] = [];
    const collect = (value: unknown) => {
      if (!Array.isArray(value)) return;
      if (typeof value[0] === "number" && typeof value[1] === "number") {
        positions.push([value[0], value[1]]);
        return;
      }
      value.forEach(collect);
    };
    features.forEach((feature) => collect(feature.geometry.coordinates));
    if (positions.length > 0) {
      const lngs = positions.map(([lng]) => lng);
      const lats = positions.map(([, lat]) => lat);
      map.fitBounds(
        [
          [Math.min(...lngs), Math.min(...lats)],
          [Math.max(...lngs), Math.max(...lats)],
        ],
        { padding: 40, maxZoom: 11, duration: 0 },
      );
    }

    return () => {
      if (!isMapAlive(map)) return;
      if (map.getLayer(draftLineId)) map.removeLayer(draftLineId);
      if (map.getLayer(activeLineId)) map.removeLayer(activeLineId);
      if (map.getLayer(fillId)) map.removeLayer(fillId);
      if (map.getSource(sourceId)) map.removeSource(sourceId);
    };
  }, [activeLineId, collection, draftLineId, features, fillId, isLoaded, isMapAlive, map, sourceId]);

  return null;
}

export function ServiceMarketBoundaryMap({
  features,
}: {
  features: ServiceMarketBoundaryFeature[];
}) {
  if (features.length === 0) return null;
  return (
    <section className="space-y-3 rounded-xl border bg-white p-4">
      <div>
        <h2 className="font-semibold">Comparaison cartographique</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Vert plein : version active. Orange pointillé : brouillon non publié.
        </p>
      </div>
      <div className="h-[420px] overflow-hidden rounded-lg border">
        <Map center={[-5.5, 7.5]} zoom={6}>
          <MapControls position="bottom-right" showZoom showFullscreen />
          <BoundaryLayers features={features} />
        </Map>
      </div>
      <div className="grid gap-2 md:grid-cols-2">
        {features.map((feature) => (
          <div key={feature.versionId} className="rounded-lg border p-3 text-sm">
            <p className="font-medium">{feature.marketName} · v{feature.version}{feature.active ? " active" : " brouillon"}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {feature.restaurantsInside} restaurant(s) dedans · {feature.assignmentsToReview} affectation(s) à revoir · {feature.restaurantsLeaving} sortie(s)
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
