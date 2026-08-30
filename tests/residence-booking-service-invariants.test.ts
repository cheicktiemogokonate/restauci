import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Bloc 9 residence booking service invariants", () => {
  const service = readFileSync("src/modules/residences/server.ts", "utf8");
  const persistence = readFileSync(
    "src/modules/residences/_internal/bookings.ts",
    "utf8",
  );
  const partnerPage = readFileSync(
    "src/app/(dashboard)/partenaire/reservations/page.tsx",
    "utf8",
  );
  const publicAvailabilityRoute = readFileSync(
    "src/app/api/v1/public/residences/[id]/availability/route.ts",
    "utf8",
  );
  const partnerReservationActions = readFileSync(
    "src/app/(dashboard)/partenaire/reservations/actions.ts",
    "utf8",
  );
  const partnerReservationWorkspace = readFileSync(
    "src/components/partner/partner-reservations-workspace.tsx",
    "utf8",
  );

  it("locks the residence before checking overlap and inserting", () => {
    const start = service.indexOf("export async function createResidenceReservation");
    const end = service.indexOf("export function listClientResidenceReservations", start);
    const booking = service.slice(start, end);
    expect(booking.indexOf("lockResidenceRecord")).toBeGreaterThan(-1);
    expect(booking.indexOf("lockResidenceRecord")).toBeLessThan(booking.indexOf("hasResidenceConflictRecord"));
    expect(booking.indexOf("hasResidenceConflictRecord")).toBeLessThan(booking.indexOf("createResidenceReservationRecord"));
  });

  it("uses the canonical half-open overlap predicate", () => {
    expect(persistence).toContain("checkIn} < ${input.checkOut}");
    expect(persistence).toContain("checkOut} > ${input.checkIn}");
  });

  it("initializes Paystack only after the database transaction", () => {
    const transactionEnd = service.indexOf("const initialized = await initializePreparedPaystackPayment");
    const preparedStart = service.indexOf("const prepared = await transactionalDb.transaction");
    expect(preparedStart).toBeGreaterThan(-1);
    expect(transactionEnd).toBeGreaterThan(preparedStart);
  });

  it("separates public and partner residence availability policies", () => {
    const publicStart = service.indexOf(
      "export async function getPublicResidenceAvailability",
    );
    const partnerStart = service.indexOf(
      "export async function getPartnerResidenceAvailability",
    );
    const quoteStart = service.indexOf(
      "export async function getResidenceStayQuote",
    );
    const publicAvailability = service.slice(publicStart, partnerStart);
    const partnerAvailability = service.slice(partnerStart, quoteStart);

    expect(publicAvailability).toContain("getPublicResidenceById");
    expect(publicAvailability).not.toContain("getPartnerResidenceRecord");
    expect(partnerAvailability).toContain("getPartnerResidenceRecord");
    expect(partnerAvailability).not.toContain("getPublicResidenceById");
  });

  it("routes public and partner screens through their matching availability policy", () => {
    expect(partnerPage).toContain("getPartnerResidenceAvailability(partner.id");
    expect(partnerPage).not.toContain("getPublicResidenceAvailability");
    expect(publicAvailabilityRoute).toContain("getPublicResidenceAvailability");
    expect(publicAvailabilityRoute).not.toContain("getPartnerResidenceAvailability");
  });

  it("uses the canonical partner ownership guard for calendar writes", () => {
    const createStart = service.indexOf(
      "export async function createResidenceUnavailablePeriod",
    );
    const listStart = service.indexOf(
      "export async function listPartnerResidenceUnavailablePeriods",
    );
    const deleteStart = service.indexOf(
      "export async function deleteResidenceUnavailablePeriod",
    );
    const nextStart = service.indexOf(
      "export function getPartnerResidence",
      deleteStart,
    );

    expect(service.slice(createStart, listStart)).toContain(
      "getPartnerResidenceRecord",
    );
    expect(service.slice(listStart, deleteStart)).toContain(
      "getPartnerResidenceRecord",
    );
    expect(service.slice(deleteStart, nextStart)).toContain(
      "getPartnerResidenceRecord",
    );
  });

  it("protects owner reservation edits with ownership, availability and payment guards", () => {
    const updateStart = service.indexOf(
      "export async function updatePartnerResidenceReservation",
    );
    const cancelStart = service.indexOf(
      "export async function cancelPartnerResidenceReservation",
      updateStart,
    );
    const update = service.slice(updateStart, cancelStart);

    expect(update).toContain(
      "eq(residenceReservations.partnerAccountId, partnerAccountId)",
    );
    expect(update).toContain('transaction.status === "paid"');
    expect(update.indexOf('transaction.status === "paid"')).toBeLessThan(
      update.indexOf("updateResidenceReservationStayRecord"),
    );
    expect(update).toContain("excludeReservationId: reservation.id");
    expect(update).toContain("nights !== reservation.nights");
    expect(partnerReservationWorkspace).toContain(
      "const canEdit = isFutureActive && !isPaid",
    );
  });

  it("routes owner writes through canonical authenticated actions", () => {
    expect(partnerReservationActions).toContain(
      'requirePartnerActivity("residence")',
    );
    expect(partnerReservationActions).toContain(
      "updatePartnerResidenceReservation(partner.id, input)",
    );
    expect(partnerReservationActions).toContain(
      "cancelPartnerResidenceReservation(partner.id, input)",
    );
  });

  it("records owner cancellation provenance and flags paid refunds", () => {
    const cancelStart = service.indexOf(
      "export async function cancelPartnerResidenceReservation",
    );
    const nextStart = service.indexOf(
      "export async function getClientResidenceReservation",
      cancelStart,
    );
    const cancellation = service.slice(cancelStart, nextStart);

    expect(cancellation).toContain(
      '{ source: "partner", reason: parsed.reason }',
    );
    expect(cancellation).toContain(
      'const requiresManualRefund = transaction.status === "paid"',
    );
    expect(cancellation).toContain("sendClientExpoPush");
  });
});
