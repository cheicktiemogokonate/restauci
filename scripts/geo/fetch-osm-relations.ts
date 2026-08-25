import { writeFileSync } from "node:fs";

type Coordinate = [number, number];

type OverpassMember = {
  type: string;
  ref: number;
  role?: string;
  geometry?: Array<{ lat: number; lon: number }>;
};

type OverpassRelation = {
  type: "relation";
  id: number;
  version: number;
  timestamp: string;
  tags: Record<string, string>;
  members: OverpassMember[];
};

type OverpassResponse = {
  osm3s?: { timestamp_osm_base?: string; copyright?: string };
  elements: OverpassRelation[];
};

function argument(name: string) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function requiredArgument(name: string) {
  const value = argument(name);
  if (!value) throw new Error(`${name} est obligatoire.`);
  return value;
}

function coordinateKey([lng, lat]: Coordinate) {
  return `${lng.toFixed(7)},${lat.toFixed(7)}`;
}

function sameCoordinate(left: Coordinate, right: Coordinate) {
  return coordinateKey(left) === coordinateKey(right);
}

function stitchRings(segments: Coordinate[][], relationId: number) {
  const pending = segments.map((segment) => [...segment]);
  const rings: Coordinate[][] = [];

  while (pending.length > 0) {
    const ring = pending.shift();
    if (!ring || ring.length < 2) continue;

    while (!sameCoordinate(ring[0], ring[ring.length - 1])) {
      const tail = ring[ring.length - 1];
      const matchingIndex = pending.findIndex((candidate) =>
        sameCoordinate(candidate[0], tail) ||
        sameCoordinate(candidate[candidate.length - 1], tail),
      );
      if (matchingIndex < 0) {
        throw new Error(
          `Relation ${relationId} : impossible de fermer une limite OSM.`,
        );
      }
      const [matching] = pending.splice(matchingIndex, 1);
      if (!sameCoordinate(matching[0], tail)) matching.reverse();
      ring.push(...matching.slice(1));
    }

    if (ring.length < 4) {
      throw new Error(`Relation ${relationId} : anneau trop court.`);
    }
    rings.push(ring);
  }

  return rings;
}

function pointInRing(point: Coordinate, ring: Coordinate[]) {
  let inside = false;
  for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index++) {
    const [x, y] = ring[index];
    const [previousX, previousY] = ring[previous];
    if (
      (y > point[1]) !== (previousY > point[1]) &&
      point[0] <
        ((previousX - x) * (point[1] - y)) / (previousY - y) + x
    ) {
      inside = !inside;
    }
  }
  return inside;
}

function relationGeometry(relation: OverpassRelation) {
  const membersWithGeometry = relation.members.filter(
    (member) => member.geometry && member.geometry.length >= 2,
  );
  const explicitOuter = membersWithGeometry.some(
    (member) => member.role === "outer",
  );
  const toCoordinates = (member: OverpassMember) =>
    member.geometry!.map(({ lon, lat }) => [lon, lat] as Coordinate);
  const outerSegments = membersWithGeometry
    .filter((member) =>
      explicitOuter ? member.role === "outer" : member.role !== "inner",
    )
    .map(toCoordinates);
  const innerSegments = membersWithGeometry
    .filter((member) => member.role === "inner")
    .map(toCoordinates);

  if (outerSegments.length === 0) {
    throw new Error(`Relation ${relation.id} : aucune limite extérieure.`);
  }
  const outerRings = stitchRings(outerSegments, relation.id);
  const innerRings = stitchRings(innerSegments, relation.id);
  const polygons = outerRings.map((outer) => [outer]);
  for (const inner of innerRings) {
    const polygon = polygons.find(([outer]) => pointInRing(inner[0], outer));
    if (!polygon) {
      throw new Error(
        `Relation ${relation.id} : trou sans polygone extérieur.`,
      );
    }
    polygon.push(inner);
  }
  return { type: "MultiPolygon" as const, coordinates: polygons };
}

const outputPath = requiredArgument("--output");
const countryCode = (argument("--country") ?? "CI").toUpperCase();
const relationIds = requiredArgument("--relations")
  .split(",")
  .map((value) => Number(value.trim()));
if (
  relationIds.length === 0 ||
  relationIds.some((value) => !Number.isSafeInteger(value) || value <= 0)
) {
  throw new Error("--relations doit contenir des identifiants OSM numériques.");
}

const overpassUrl = "https://overpass-api.de/api/interpreter";
const query = `[out:json][timeout:90];rel(id:${relationIds.join(",")});out meta geom;`;
const response = await fetch(`${overpassUrl}?data=${encodeURIComponent(query)}`, {
  headers: { "user-agent": "TOUTCI-Geo-Import/1.0" },
});
if (!response.ok) {
  throw new Error(`Overpass a répondu ${response.status}.`);
}
const payload = (await response.json()) as OverpassResponse;
const byId = new Map(payload.elements.map((relation) => [relation.id, relation]));
const missing = relationIds.filter((id) => !byId.has(id));
if (missing.length > 0) {
  throw new Error(`Relations OSM absentes : ${missing.join(", ")}.`);
}

const collection = {
  type: "FeatureCollection" as const,
  metadata: {
    source: "OpenStreetMap via Overpass",
    sourceUrl: overpassUrl,
    osmBaseTimestamp: payload.osm3s?.timestamp_osm_base ?? null,
    copyright: payload.osm3s?.copyright ?? "© OpenStreetMap contributors",
  },
  features: relationIds.map((id) => {
    const relation = byId.get(id)!;
    const properties: Record<string, string> = {
      ...relation.tags,
      source_ref: String(relation.id),
      osm_version: String(relation.version),
      timestamp: relation.timestamp,
      country_code: countryCode,
    };
    return {
      type: "Feature" as const,
      properties,
      geometry: relationGeometry(relation),
    };
  }),
};

writeFileSync(outputPath, `${JSON.stringify(collection, null, 2)}\n`, "utf8");
console.log(
  JSON.stringify(
    {
      outputPath,
      osmBaseTimestamp: collection.metadata.osmBaseTimestamp,
      relations: collection.features.map((feature) => ({
        sourceRef: feature.properties.source_ref,
        name: feature.properties.name,
        adminLevel: feature.properties.admin_level,
        version: feature.properties.osm_version,
        polygons: feature.geometry.coordinates.length,
      })),
    },
    null,
    2,
  ),
);
