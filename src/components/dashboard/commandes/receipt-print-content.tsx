"use client";

import { formatPrix } from "@/lib/utils/format";
import type { CommandeDetailsView } from "./map-commande-to-details";

interface ReceiptPrintContentProps {
  order: CommandeDetailsView;
}

export function ReceiptPrintContent({ order }: ReceiptPrintContentProps) {
  const orderTypeLabel =
    order.modeCommande === "livraison"
      ? "Livraison à domicile"
      : order.modeCommande === "sur_place"
        ? "Sur place"
        : "À emporter";

  const paymentMethod =
    order.modeCommande === "livraison" ? "Espèces à la livraison" : "Espèces";

  const notesClient =
    order.items.flatMap((item) => (item.notes ? [item.notes] : [])).join(" ") ||
    "Aucune note";

  const qrUrl = `https://${order.delivery.restaurantName.replace(/\s+/g, "").toLowerCase()}.ci`;

  return (
    <>
      <style>{`
        :root {
          color-scheme: light;
        }
        body {
          margin: 0;
          background: #f3f4f6;
          font-family: Inter, Arial, sans-serif;
          color: #111827;
        }
        .receipt-container {
          max-width: 900px;
          margin: 24px auto;
          padding: 32px;
          background: #ffffff;
          border: 1px solid #e5e7eb;
          box-shadow: 0 16px 40px rgba(15, 23, 42, 0.08);
        }
        .top-brand-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 22px;
          padding-bottom: 16px;
          border-bottom: 1px dashed #d1d5db;
        }
        .top-brand-logo {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 18px;
          font-weight: 700;
          color: #166534;
        }
        .top-brand-subtitle {
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: #166534;
        }
        .receipt-header {
          display: flex;
          justify-content: space-between;
          gap: 24px;
          flex-wrap: wrap;
          margin-bottom: 18px;
        }
        .restaurant-profile {
          display: flex;
          gap: 18px;
          align-items: flex-start;
        }
        .circle-logo {
          width: 92px;
          min-width: 92px;
          height: 92px;
          border-radius: 999px;
          border: 2px solid #166534;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          color: #166534;
          padding: 8px;
          box-sizing: border-box;
        }
        .logo-title {
          margin-top: 6px;
          font-size: 10px;
          font-weight: 700;
          line-height: 1.2;
          color: #111827;
        }
        .logo-tag {
          margin-top: 4px;
          font-size: 7px;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: #166534;
        }
        .restaurant-details h2 {
          margin: 0 0 4px;
          font-size: 20px;
          color: #111827;
        }
        .restaurant-tagline {
          margin: 0 0 10px;
          color: #6b7280;
        }
        .info-item {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          margin-bottom: 8px;
          font-size: 13px;
          color: #374151;
        }
        .order-meta {
          min-width: 220px;
          text-align: left;
        }
        .order-meta h2 {
          margin: 0 0 6px;
          font-size: 20px;
          color: #111827;
        }
        .order-id {
          font-size: 22px;
          font-weight: 700;
          color: #166534;
          margin-bottom: 12px;
        }
        .meta-item {
          display: flex;
          align-items: center;
          justify-content: flex-start;
          gap: 8px;
          margin-bottom: 8px;
          font-size: 13px;
          color: #374151;
        }
        .main-divider {
          border: 0;
          border-top: 2px solid #166534;
          margin: 16px 0 24px;
        }
        .shipping-client-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 24px;
          margin-bottom: 24px;
        }
        .grid-column {
          min-width: 0;
        }
        .section-title {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 12px;
          font-size: 14px;
          font-weight: 700;
          color: #166534;
          text-transform: uppercase;
        }
        .data-row {
          display: grid;
          grid-template-columns: 120px 1fr;
          gap: 8px 12px;
          margin-bottom: 8px;
          font-size: 13px;
          color: #374151;
        }
        .data-label {
          font-weight: 600;
          color: #6b7280;
        }
        .items-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 24px;
        }
        .table-header {
          background: #166534;
          color: #ffffff;
          font-size: 13px;
          font-weight: 700;
        }
        .table-header th {
          padding: 12px 10px;
          text-align: left;
        }
        .table-row td {
          padding: 12px 10px;
          border-bottom: 1px solid #f3f4f6;
          font-size: 13px;
        }
        .table-row:last-child td {
          border-bottom: none;
        }
        .center {
          text-align: center;
        }
        .right {
          text-align: right;
        }
        .num {
          color: #6b7280;
        }
        .designation {
          font-weight: 600;
          color: #111827;
        }
        .total-cell {
          font-weight: 700;
          color: #111827;
        }
        .bottom-sections {
          display: grid;
          grid-template-columns: 1.2fr 0.8fr;
          gap: 24px;
          margin-bottom: 24px;
        }
        .notes-payment-block {
          display: flex;
          flex-direction: column;
          gap: 16px;
          background: #f9fafb;
          padding: 16px;
          border-radius: 10px;
        }
        .sub-block-title {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
          font-size: 13px;
          font-weight: 700;
          color: #166534;
          text-transform: uppercase;
        }
        .notes-list {
          margin: 0;
          padding-left: 18px;
          color: #374151;
          font-size: 13px;
        }
        .payment-text {
          font-size: 13px;
          color: #374151;
          margin-left: 6px;
        }
        .totals-box {
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          padding: 16px;
          font-size: 13px;
          color: #374151;
        }
        .total-row,
        .final-total-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 10px;
        }
        .remise {
          color: #dc2626;
        }
        .val {
          font-weight: 700;
        }
        .totals-dashed-line {
          border: 0;
          border-top: 1px dashed #d1d5db;
          margin: 12px 0;
        }
        .final-total-row {
          align-items: center;
          margin-bottom: 0;
        }
        .final-total-label {
          font-weight: 600;
          color: #111827;
          font-size: 12px;
        }
        .final-total-amount {
          font-size: 18px;
          font-weight: 600;
          color: #166534;
        }
        .signature-section {
          margin: 28px 0 20px;
        }
        .signature-text {
          font-family: "Caveat", cursive;
          color: #166534;
          font-size: 28px;
          transform: rotate(-2deg);
        }
        .signature-line {
          width: 72px;
          height: 2px;
          background: #166534;
          margin-top: 6px;
          border-radius: 999px;
        }
        .receipt-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          padding-top: 18px;
          border-top: 1px dashed #d1d5db;
        }
        .footer-marketing {
          flex: 1;
          text-align: center;
        }
        .thank-you {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-size: 14px;
          font-weight: 600;
          color: #111827;
          margin-bottom: 6px;
        }
        .sub-thank-you {
          font-size: 12px;
          color: #6b7280;
          margin-bottom: 12px;
        }
        .social-container {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          color: #166534;
        }
        .social-title {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.2em;
          text-transform: uppercase;
        }
        .social-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          border-radius: 999px;
          border: 1px solid #cbd5e1;
          color: #166534;
          text-decoration: none;
        }
        .qr-block {
          display: flex;
          align-items: center;
          gap: 10px;
          max-width: 180px;
        }
        .qr-text {
          font-size: 10px;
          color: #6b7280;
          line-height: 1.4;
        }
        @media print {
          body {
            background: #ffffff;
          }
          .receipt-container {
            box-shadow: none;
            margin: 0;
            padding: 24px;
            border: none;
          }
        }
      `}</style>
      <div className="receipt-container">
        <div className="top-brand-header">
          <div className="top-brand-logo">
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M6 18V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v14" />
              <path d="M3 18h18a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-2a1 1 0 0 1 1-1Z" />
              <path d="M12 2v16" />
            </svg>
            {order.delivery.restaurantName}
          </div>
          <div className="top-brand-subtitle">Restaurant</div>
        </div>

        <div className="receipt-header">
          <div className="restaurant-profile">
            <div className="circle-logo">
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 3.5 1 9.8A7 7 0 0 1 11 20Z" />
                <path d="M9 22c0-5 1.5-7 3-10" />
              </svg>
              <div className="logo-title">{order.delivery.restaurantName}</div>
              <div className="logo-tag">Restaurant</div>
            </div>

            <div className="restaurant-details">
              <h2>{order.delivery.restaurantName}</h2>
              <p className="restaurant-tagline">
                Cuisine ivoirienne authentique
              </p>

              <div className="info-item">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                <span>{order.delivery.restaurantAddress}</span>
              </div>
              <div className="info-item">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
                <span>{order.client.phone}</span>
              </div>
              <div className="info-item">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <rect width="20" height="16" x="2" y="4" rx="2" />
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                </svg>
                <span>{order.client.email || "—"}</span>
              </div>
              <div className="info-item">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20M2 12h20" />
                </svg>
                <span>{`www.${order.delivery.restaurantName.replace(/\s+/g, "").toLowerCase()}.ci`}</span>
              </div>
            </div>
          </div>

          <div className="order-meta">
            <h2>REÇU DE COMMANDE</h2>
            <div className="order-id">#{order.displayId}</div>

            <div className="meta-item">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
                <line x1="16" x2="16" y1="2" y2="6" />
                <line x1="8" x2="8" y1="2" y2="6" />
                <line x1="3" x2="21" y1="10" y2="10" />
              </svg>
              <span>Date : {order.date}</span>
            </div>
            <div className="meta-item">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <span>Heure : {order.time}</span>
            </div>
            <div className="meta-item">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <rect width="20" height="12" x="2" y="3" rx="2" />
                <path d="M12 17H21" />
                <path d="M2 17h6" />
                <path d="m20 21-2-4" />
                <path d="m4 21 2-4" />
              </svg>
              <span>Caissier : Koffi A.</span>
            </div>
          </div>
        </div>

        <hr className="main-divider" />

        <div className="shipping-client-grid">
          <div className="grid-column">
            <div className="section-title">
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              INFORMATIONS CLIENT
            </div>
            <div className="data-row">
              <div className="data-label">Nom :</div>
              <div className="data-value">{order.client.name}</div>
            </div>
            <div className="data-row">
              <div className="data-label">Téléphone :</div>
              <div className="data-value">{order.client.phone}</div>
            </div>
            <div className="data-row">
              <div className="data-label">Email :</div>
              <div className="data-value">{order.client.email || "—"}</div>
            </div>
            <div className="data-row">
              <div className="data-label">Adresse :</div>
              <div className="data-value">{order.client.address}</div>
            </div>
            <div className="data-row" style={{ marginTop: 16 }}>
              <div className="data-label">Notes client :</div>
              <div className="data-value">{notesClient}</div>
            </div>
          </div>

          <div className="grid-column">
            <div className="section-title">
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <rect width="14" height="12" x="2" y="7" rx="2" ry="2" />
                <path d="M16 8h4l3 3v7a2 2 0 0 1-2 2h-1" />
                <circle cx="6.5" cy="18.5" r="2.5" />
                <circle cx="18.5" cy="18.5" r="2.5" />
              </svg>
              LIVRAISON
            </div>
            <div className="data-row">
              <div className="data-label">Type :</div>
              <div className="data-value">{orderTypeLabel}</div>
            </div>
            <div className="data-row">
              <div className="data-label">Adresse de livraison :</div>
              <div className="data-value">{order.delivery.customerAddress}</div>
            </div>
            <div className="data-row" style={{ marginTop: 16 }}>
              <div className="data-label">Distance :</div>
              <div className="data-value">{order.delivery.distance}</div>
            </div>
            <div className="data-row">
              <div className="data-label">Délai estimé :</div>
              <div className="data-value">{order.delivery.estimatedTime}</div>
            </div>
          </div>
        </div>

        <table className="items-table">
          <thead>
            <tr className="table-header">
              <th style={{ width: "8%" }}>N°</th>
              <th style={{ width: "52%" }}>DÉSIGNATION</th>
              <th className="center" style={{ width: "10%" }}>
                QTÉ
              </th>
              <th className="right" style={{ width: "15%" }}>
                PRIX UNIT.
              </th>
              <th className="right" style={{ width: "15%" }}>
                TOTAL
              </th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item, index) => (
              <tr className="table-row" key={item.id}>
                <td className="num">{index + 1}</td>
                <td className="designation">{item.name}</td>
                <td className="center">{item.quantity}</td>
                <td className="right">{formatPrix(item.unitPrice)}</td>
                <td className="right total-cell">{formatPrix(item.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="bottom-sections">
          <div className="notes-payment-block">
            <div>
              <div className="sub-block-title">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                NOTES DE LA COMMANDE
              </div>
              <ul className="notes-list">
                {notesClient === "Aucune note" ? (
                  <li>{notesClient}</li>
                ) : (
                  notesClient
                    .split(" ")
                    .map((note, index) => (
                      <li key={`${note}-${index}`}>{note}</li>
                    ))
                )}
              </ul>
            </div>
            <div>
              <div className="sub-block-title">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <rect width="20" height="14" x="2" y="5" rx="2" />
                  <line x1="2" x2="22" y1="10" y2="10" />
                </svg>
                MODE DE PAIEMENT
              </div>
              <div className="payment-text">{paymentMethod}</div>
            </div>
          </div>

          <div className="totals-box">
            <div className="total-row">
              <span>SOUS-TOTAL</span>
              <span>{formatPrix(order.subtotal)}</span>
            </div>
            <div className="total-row">
              <span>FRAIS DE LIVRAISON</span>
              <span>{formatPrix(0)}</span>
            </div>

            <hr className="totals-dashed-line" />

            <div className="final-total-row">
              <span className="final-total-label">TOTAL À PAYER :</span>
              <span className="final-total-amount">
                {formatPrix(order.total)}
              </span>
            </div>
          </div>
        </div>

        <div className="signature-section">
          <div className="signature-text">Merci pour votre confiance !</div>
          <div className="signature-line" />
        </div>

        <div className="receipt-footer">
          <div className="footer-marketing">
            <div className="thank-you">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
              </svg>
              Merci d'avoir choisi {order.delivery.restaurantName} !
            </div>
            <div className="sub-thank-you">
              Nous vous régalons à chaque commande.
            </div>

            <div className="social-container">
              <span className="social-title">SUIVEZ-NOUS</span>
              <a href="#" className="social-icon">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                </svg>
              </a>
              <a href="#" className="social-icon">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                  <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
                </svg>
              </a>
              <a href="#" className="social-icon">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
