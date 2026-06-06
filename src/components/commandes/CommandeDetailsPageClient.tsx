"use client";

import { Header } from "@/components/dashboard/header";
import { OrderDetailsHeader } from "./order-details-header";
import { OrderItemsTable } from "./order-items-table";
import { DeliveryMap } from "./delivery-map";
import { ClientInfo } from "./client-info";
import { OrderTracking } from "./order-tracking";
import { DriverInfo } from "./driver-info";
import { Footer } from "./footer";
import type { CommandeDetailsView } from "./map-commande-to-details";

interface CommandeDetailsPageClientProps {
  order: CommandeDetailsView;
}

export default function CommandeDetailsPageClient({
  order,
}: CommandeDetailsPageClientProps) {
  const showDriver = order.modeCommande === "livraison" && order.driver;

  return (
    <div className="flex flex-1 flex-col min-h-full overflow-hidden">
      <Header
        title="Détails de la commande"
        backHref="/restaurateur/commandes"
        breadcrumb={[
          { label: "Commandes", href: "/restaurateur/commandes" },
          { label: `Commande ${order.displayId}` },
        ]}
      />

      <main className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-6">
        <OrderDetailsHeader
          orderId={order.displayId}
          status={order.status}
          date={order.date}
          time={order.time}
          orderType={order.orderType}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <OrderItemsTable
            items={order.items}
            subtotal={order.subtotal}
            total={order.total}
          />

          <DeliveryMap
            restaurantName={order.delivery.restaurantName}
            restaurantAddress={order.delivery.restaurantAddress}
            customerName={order.delivery.customerName}
            customerAddress={order.delivery.customerAddress}
            distance={order.delivery.distance}
            estimatedTime={order.delivery.estimatedTime}
            departureTime={order.delivery.departureTime}
            departureDate={order.delivery.departureDate}
            arrivalTime={order.delivery.arrivalTime}
            arrivalDate={order.delivery.arrivalDate}
          />
        </div>

        <div
          className={`grid grid-cols-1 gap-6 ${
            showDriver ? "md:grid-cols-2 lg:grid-cols-3" : "md:grid-cols-2"
          }`}
        >
          <ClientInfo
            name={order.client.name}
            status={order.client.status}
            phone={order.client.phone}
            email={order.client.email}
            address={order.client.address}
            avatar={order.client.avatar}
          />

          <OrderTracking steps={order.tracking} />

          {showDriver && order.driver && (
            <DriverInfo
              name={order.driver.name}
              status={order.driver.status}
              phone={order.driver.phone}
              vehicleType={order.driver.vehicleType}
              vehicleNumber={order.driver.vehicleNumber}
              avatar={order.driver.avatar}
            />
          )}
        </div>

        <Footer />
      </main>
    </div>
  );
}
