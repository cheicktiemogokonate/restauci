import { AdminPage } from "@/components/admin/ui/admin-page";
import { PageHeader } from "@/components/admin/ui/page-header";
import { ServiceMarketAdmin } from "@/components/admin/service-market-admin";
import { getAdminSession } from "@/lib/auth/get-admin-session";
import {
  listGeoSourceAreas,
  listServiceMarkets,
  listServiceMarketVersionFeatures,
} from "@/modules/service-markets/server";

export default async function AdminServiceMarketsPage() {
  await getAdminSession();
  const [markets, sourceAreas, boundaryFeatures] = await Promise.all([
    listServiceMarkets(),
    listGeoSourceAreas("CI"),
    listServiceMarketVersionFeatures("CI"),
  ]);

  return (
    <AdminPage>
      <PageHeader
        title="Zones de service"
        description="Frontières OSM versionnées, publication contrôlée et activation indépendante des Restaurants, Résidences et Événements."
      />
      <ServiceMarketAdmin
        markets={markets.map((market) => ({
          id: market.id,
          code: market.code,
          name: market.name,
          countryCode: market.countryCode,
          status: market.status,
          activeVersionId: market.activeVersionId,
          capabilities: market.capabilities.map((capability) => ({
            activityType: capability.activityType,
            status: capability.status,
          })),
          versions: market.versions.map((version) => ({
            id: version.id,
            version: version.version,
            geometryChecksum: version.geometryChecksum,
            publishedAt: version.publishedAt?.toISOString() ?? null,
            retiredAt: version.retiredAt?.toISOString() ?? null,
            areaNames: version.areas.map((area) => area.sourceArea.name),
          })),
        }))}
        sourceAreas={sourceAreas.map((area) => ({
          id: area.id,
          name: area.name,
          sourceRef: area.sourceRef,
          sourceVersion: area.sourceVersion,
          adminLevel: area.adminLevel,
        }))}
        boundaryFeatures={boundaryFeatures}
      />
    </AdminPage>
  );
}
