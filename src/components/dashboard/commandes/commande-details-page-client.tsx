// commande-details-page-client.tsx
"use client";

import { createRoot } from "react-dom/client";
import { ClientInfo } from "./client-info";
import { DeliveryMap } from "./delivery-map";
import { DriverInfo } from "./driver-info";
import type { CommandeDetailsView } from "./map-commande-to-details";
import { OrderDetailsHeader } from "./order-details-header";
import { OrderItemsTable } from "./order-items-table";
import { OrderStatusMenu } from "./order-status-control";
import { OrderTracking } from "./order-tracking";
import { ReceiptPrintContent } from "./receipt-print-content";

interface CommandeDetailsPageClientProps {
  order: CommandeDetailsView;
  restaurantCoordinate: { longitude: number; latitude: number };
  customerCoordinate?: { longitude: number; latitude: number };
  availableDrivers: Array<{
    id: string;
    name: string;
    vehicle: string | null;
    isOnline: boolean;
  }>;
}

export default function CommandeDetailsPageClient({
  order,
  restaurantCoordinate,
  customerCoordinate,
  availableDrivers,
}: CommandeDetailsPageClientProps) {
  const showDriver = order.modeCommande === "livraison" && order.driver;

  const handlePrint = () => {
    const printWindow = window.open("", "", "width=1200,height=900");
    if (!printWindow) return;

    const printDocument = printWindow.document;
    printDocument.open();
    printDocument.write(`
      <!DOCTYPE html>
      <html lang="fr">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Reçu de Commande - ${order.delivery.restaurantName}</title>
      </head>
      <body>
        <div id="receipt-root"></div>
      </body>
      </html>
    `);
    printDocument.close();

    const receiptRootElement = printDocument.getElementById("receipt-root");
    if (!receiptRootElement) {
      printWindow.close();
      return;
    }

    const root = createRoot(receiptRootElement);
    root.render(<ReceiptPrintContent order={order} />);

    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <main className="flex-1 overflow-y-auto p-4 lg:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Colonne principale */}
          <div className="lg:col-span-2 space-y-6">
            <OrderDetailsHeader
              orderId={order.displayId}
              status={order.status}
              date={order.date}
              time={order.time}
              orderType={order.orderType}
              serviceContext={
                order.modeCommande === "sur_place"
                  ? `Table ${order.client.tableNumber ?? "non renseignée"}`
                  : order.modeCommande === "emporter"
                    ? "Retrait au comptoir"
                    : order.delivery.customerAddress
              }
              onPrint={handlePrint}
              actions={
                <OrderStatusMenu
                  commandeId={order.id}
                  currentStatus={order.rawStatus}
                  modeCommande={order.modeCommande}
                />
              }
            />

            <OrderItemsTable
              items={order.items}
              subtotal={order.subtotal}
              fraisLivraison={order.fraisLivraison}
              remise={order.remise}
              noteClient={order.noteClient}
              total={order.total}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ClientInfo
                name={order.client.name}
                status={order.client.status}
                phone={order.client.phone}
                email={order.client.email}
                address={order.client.address}
                modeCommande={order.modeCommande}
                tableNumber={order.client.tableNumber}
                avatar={order.client.avatar}
              />
              <OrderTracking steps={order.tracking} status={order.rawStatus} />
            </div>
          </div>

          {/* Colonne latérale */}
          <div className="space-y-6">
            <DeliveryMap
              restaurantName={order.delivery.restaurantName}
              restaurantAddress={order.delivery.restaurantAddress}
              restaurantLng={restaurantCoordinate.longitude}
              restaurantLat={restaurantCoordinate.latitude}
              customerName={order.delivery.customerName}
              customerAddress={order.delivery.customerAddress}
              customerLng={customerCoordinate?.longitude ?? 0}
              customerLat={customerCoordinate?.latitude ?? 0}
              distance={order.delivery.distance}
              estimatedTime={order.delivery.estimatedTime}
              departureTime={order.delivery.departureTime}
              departureDate={order.delivery.departureDate}
              arrivalTime={order.delivery.arrivalTime}
              arrivalDate={order.delivery.arrivalDate}
              modeCommande={order.modeCommande}
              tableNumber={order.client.tableNumber}
            />

            {showDriver && order.driver && (
              <DriverInfo
                commandeId={order.id}
                assigned={order.driver.assigned}
                name={order.driver.name}
                status={order.driver.status}
                phone={order.driver.phone}
                vehicleType={order.driver.vehicleType}
                vehicleNumber={order.driver.vehicleNumber}
                avatar={order.driver.avatar}
                availableDrivers={availableDrivers}
                deliveryStatus={order.deliveryTracking?.status ?? null}
                commandeStatus={order.rawStatus}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
