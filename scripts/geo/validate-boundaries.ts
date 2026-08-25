import { readFileSync } from "node:fs";

type Geometry = {
  type: "Polygon" | "MultiPolygon";
  coordinates: unknown;
};

type Feature = {
  type: "Feature";
  properties?: Record<string, unknown>;
  geometry: Geometry | null;
};

type FeatureCollection = {
  type: "FeatureCollection";
  features: Feature[];
};

function argument(name: string) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function assertCoordinates(value: unknown, path = "coordinates"): number {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`${path} doit être un tableau non vide.`);
  }
  if (typeof value[0] === "number") {
    if (
      value.length < 2 ||
      !Number.isFinite(value[0]) ||
      !Number.isFinite(value[1]) ||
      value[0] < -180 ||
      value[0] > 180 ||
      value[1] < -90 ||
      value[1] > 90
    ) {
      throw new Error(`${path} contient une position invalide.`);
    }
    return 1;
  }
  return value.reduce<number>(
    (count, child, index) => count + assertCoordinates(child, `${path}[${index}]`),
    0,
  );
}

function sourceRef(properties: Record<string, unknown>) {
  const value = properties.source_ref ?? properties["@id"] ?? properties.id;
  if (typeof value !== "string" && typeof value !== "number") {
    throw new Error("Chaque entité doit exposer source_ref, @id ou id.");
  }
  const normalized = String(value).replace(/^relation\//, "");
  if (!/^\d+$/.test(normalized)) {
    throw new Error(`Référence OSM relation invalide : ${String(value)}`);
  }
  return normalized;
}

const geojsonPath = argument("--geojson");
const countryCode = (argument("--country") ?? "CI").toUpperCase();
if (!geojsonPath) {
  throw new Error("--geojson est obligatoire.");
}

const collection = JSON.parse(
  readFileSync(geojsonPath, "utf8"),
) as FeatureCollection;
if (collection.type !== "FeatureCollection" || !Array.isArray(collection.features)) {
  throw new Error("Le fichier doit être un FeatureCollection GeoJSON.");
}

const references = new Set<string>();
let coordinateCount = 0;
const summary = collection.features.map((feature, index) => {
  if (feature.type !== "Feature" || !feature.geometry) {
    throw new Error(`Feature ${index} invalide ou sans géométrie.`);
  }
  if (!['Polygon', 'MultiPolygon'].includes(feature.geometry.type)) {
    throw new Error(`Feature ${index} : seuls Polygon et MultiPolygon sont acceptés.`);
  }
  const properties = feature.properties ?? {};
  const ref = sourceRef(properties);
  if (references.has(ref)) throw new Error(`Relation OSM dupliquée : ${ref}`);
  references.add(ref);
  const name = properties.name;
  if (typeof name !== "string" || name.trim().length < 2) {
    throw new Error(`Feature ${index} : nom manquant.`);
  }
  const featureCountry = String(properties.country_code ?? countryCode).toUpperCase();
  if (featureCountry !== countryCode) {
    throw new Error(`Feature ${index} : pays ${featureCountry}, attendu ${countryCode}.`);
  }
  const points = assertCoordinates(feature.geometry.coordinates, `features[${index}].geometry.coordinates`);
  coordinateCount += points;
  return { sourceRef: ref, name, points };
});

console.log(JSON.stringify({
  valid: true,
  countryCode,
  featureCount: summary.length,
  coordinateCount,
  features: summary,
}, null, 2));
