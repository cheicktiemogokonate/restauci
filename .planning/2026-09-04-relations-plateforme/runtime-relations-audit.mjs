import pg from "pg";

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 20_000,
});

const checks = {
  accountEntityMatrix: `
    SELECT
      pa.activity_type,
      u.role,
      COUNT(*)::int AS accounts,
      COUNT(r.id)::int AS restaurants,
      COUNT(DISTINCT re.id)::int AS residences
    FROM partner_accounts pa
    JOIN users u ON u.id = pa.user_id
    LEFT JOIN restaurants r ON r.partner_account_id = pa.id
    LEFT JOIN residences re ON re.partner_account_id = pa.id AND re.archived_at IS NULL
    GROUP BY pa.activity_type, u.role
    ORDER BY pa.activity_type, u.role
  `,
  emptyAccounts: `
    SELECT
      COUNT(*) FILTER (
        WHERE pa.activity_type = 'restaurant' AND NOT EXISTS (
          SELECT 1 FROM restaurants r WHERE r.partner_account_id = pa.id
        )
      )::int AS restaurant_accounts_without_restaurant,
      COUNT(*) FILTER (
        WHERE pa.activity_type = 'residence' AND NOT EXISTS (
          SELECT 1 FROM residences re
          WHERE re.partner_account_id = pa.id AND re.archived_at IS NULL
        )
      )::int AS residence_accounts_without_residence
    FROM partner_accounts pa
  `,
  kycByActivity: `
    SELECT pa.activity_type, piv.status, COUNT(*)::int AS total
    FROM partner_identity_verifications piv
    JOIN partner_accounts pa ON pa.id = piv.partner_account_id
    GROUP BY pa.activity_type, piv.status
    ORDER BY pa.activity_type, piv.status
  `,
  subscriptionsByActivity: `
    SELECT pa.activity_type, sp.plan_code, sp.statut, COUNT(*)::int AS periods,
           SUM(sp.prix_paye_fcfa)::int AS paid_fcfa
    FROM subscription_periods sp
    JOIN partner_accounts pa ON pa.id = sp.partner_account_id
    GROUP BY pa.activity_type, sp.plan_code, sp.statut
    ORDER BY pa.activity_type, sp.plan_code, sp.statut
  `,
  transactionPaymentMatrix: `
    SELECT t.type, t.status AS transaction_status,
           COALESCE(p.method::text, 'none') AS payment_method,
           COALESCE(p.status::text, 'none') AS payment_status,
           COUNT(*)::int AS total,
           SUM(t.amount_fcfa)::int AS amount_fcfa
    FROM transactions t
    LEFT JOIN LATERAL (
      SELECT method, status
      FROM payments p
      WHERE p.transaction_id = t.id
      ORDER BY p.created_at DESC, p.id DESC
      LIMIT 1
    ) p ON TRUE
    GROUP BY t.type, t.status, p.method, p.status
    ORDER BY t.type, t.status, p.method, p.status
  `,
  ordersByStatus: `
    SELECT c.statut,
           COUNT(*)::int AS orders,
           COUNT(*) FILTER (WHERE t.id IS NULL)::int AS without_transaction,
           COUNT(*) FILTER (WHERE co.id IS NULL)::int AS without_commission
    FROM commandes c
    LEFT JOIN transactions t ON t.restaurant_order_id = c.id
    LEFT JOIN commissions co ON co.commande_id = c.id
    GROUP BY c.statut
    ORDER BY c.statut
  `,
  clientCounterDrift: `
    SELECT
      COUNT(*) FILTER (WHERE actual_orders > 0 AND nombre_commandes <> actual_orders)::int
        AS order_counter_mismatches,
      COUNT(*) FILTER (WHERE actual_paid_fcfa > 0 AND total_depense <> actual_paid_fcfa)::int
        AS spend_counter_mismatches
    FROM (
      SELECT cl.id, cl.nombre_commandes, cl.total_depense,
             COUNT(DISTINCT c.id) FILTER (WHERE c.statut <> 'en_attente_paiement')::int AS actual_orders,
             COALESCE(SUM(DISTINCT CASE WHEN t.status = 'paid' THEN t.amount_fcfa END), 0)::int AS actual_paid_fcfa
      FROM clients cl
      LEFT JOIN commandes c ON c.client_id = cl.id
      LEFT JOIN transactions t ON t.restaurant_order_id = c.id
      GROUP BY cl.id
    ) x
  `,
  notificationTargets: `
    SELECT n.lien_type,
           COUNT(*)::int AS notifications,
           COUNT(*) FILTER (
             WHERE n.lien_id IS NOT NULL AND (
               (n.lien_type = 'commande' AND c.id IS NULL) OR
               (n.lien_type = 'restaurant' AND r.id IS NULL) OR
               (n.lien_type = 'residence' AND re.id IS NULL) OR
               (n.lien_type = 'reservation_residence' AND rr.id IS NULL) OR
               (n.lien_type = 'livraison' AND l.id IS NULL)
             )
           )::int AS dangling_known_targets
    FROM notifications n
    LEFT JOIN commandes c ON n.lien_type = 'commande' AND c.id = n.lien_id
    LEFT JOIN restaurants r ON n.lien_type = 'restaurant' AND r.id = n.lien_id
    LEFT JOIN residences re ON n.lien_type = 'residence' AND re.id::text = n.lien_id
    LEFT JOIN residence_reservations rr ON n.lien_type = 'reservation_residence' AND rr.id::text = n.lien_id
    LEFT JOIN livraisons l ON n.lien_type = 'livraison' AND l.id = n.lien_id
    GROUP BY n.lien_type
    ORDER BY n.lien_type
  `,
  geoRelationChecks: `
    SELECT
      COUNT(*) FILTER (
        WHERE sm.active_version_id IS NOT NULL AND smv.id IS NULL
      )::int AS market_active_version_missing,
      COUNT(*) FILTER (
        WHERE smv.id IS NOT NULL AND smv.service_market_id <> sm.id
      )::int AS market_active_version_wrong_market,
      (SELECT COUNT(*)::int
       FROM restaurants r
       JOIN service_market_versions rv ON rv.id = r.service_market_version_id
       WHERE r.service_market_id IS NULL OR rv.service_market_id <> r.service_market_id
      ) AS restaurant_market_version_mismatch,
      (SELECT COUNT(*)::int
       FROM commandes c
       JOIN service_market_versions cv ON cv.id = c.service_market_version_id
       WHERE c.service_market_id IS NULL OR cv.service_market_id <> c.service_market_id
      ) AS order_market_version_mismatch
    FROM service_markets sm
    LEFT JOIN service_market_versions smv ON smv.id = sm.active_version_id
  `,
  discoveryRelationChecks: `
    SELECT de.activity_type,
           COUNT(*)::int AS events,
           COUNT(*) FILTER (
             WHERE de.activity_type = 'restaurant'
               AND (r.id IS NULL OR r.partner_account_id <> de.partner_account_id)
           )::int AS restaurant_resource_or_owner_mismatch,
           COUNT(*) FILTER (
             WHERE de.activity_type = 'residence'
               AND (re.id IS NULL OR re.partner_account_id <> de.partner_account_id)
           )::int AS residence_resource_or_owner_mismatch
    FROM discovery_events de
    LEFT JOIN restaurants r ON de.activity_type = 'restaurant' AND r.id = de.resource_id
    LEFT JOIN residences re ON de.activity_type = 'residence' AND re.id::text = de.resource_id
    GROUP BY de.activity_type
    ORDER BY de.activity_type
  `,
  deliveryRelationChecks: `
    SELECT
      (SELECT COUNT(*)::int FROM livraisons l
       JOIN commandes c ON c.id = l.commande_id
       LEFT JOIN livreurs d ON d.id = l.livreur_id
       WHERE (d.id IS NOT NULL AND d.restaurant_id <> c.restaurant_id))
        AS delivery_driver_wrong_restaurant,
      (SELECT COUNT(*)::int FROM delivery_offers o
       JOIN livraisons l ON l.id = o.delivery_id
       JOIN commandes c ON c.id = o.order_id
       JOIN livreurs d ON d.id = o.driver_id
       WHERE l.commande_id <> o.order_id OR c.restaurant_id <> o.restaurant_id
          OR d.restaurant_id <> o.restaurant_id)
        AS offer_relation_mismatch,
      (SELECT COUNT(*)::int FROM driver_cash_collections cc
       JOIN livraisons l ON l.id = cc.delivery_id
       JOIN commandes c ON c.id = cc.order_id
       JOIN livreurs d ON d.id = cc.driver_id
       WHERE l.commande_id <> cc.order_id OR c.restaurant_id <> cc.restaurant_id
          OR d.restaurant_id <> cc.restaurant_id
          OR cc.collected_amount_fcfa <> c.total)
        AS cash_collection_relation_mismatch,
      (SELECT COUNT(*)::int FROM delivery_events e
       LEFT JOIN livraisons l ON l.id = e.delivery_id
       LEFT JOIN commandes c ON c.id = e.order_id
       LEFT JOIN livreurs d ON d.id = e.driver_id
       WHERE (l.id IS NOT NULL AND c.id IS NOT NULL AND l.commande_id <> c.id)
          OR (c.id IS NOT NULL AND c.restaurant_id <> e.restaurant_id)
          OR (d.id IS NOT NULL AND d.restaurant_id <> e.restaurant_id))
        AS event_relation_mismatch
  `,
  auditPaymentConsequences: `
    SELECT
      COUNT(*) FILTER (WHERE action = 'abonnement_valide')::int AS subscription_validated_audits,
      COUNT(*) FILTER (WHERE action = 'provider_account_associe')::int AS provider_linked_audits,
      COUNT(*) FILTER (WHERE action = 'provider_account_desactive')::int AS provider_disabled_audits,
      (SELECT COUNT(*)::int FROM notifications WHERE lien_type = 'abonnement')
        AS subscription_notifications
    FROM audit_log
  `,
};

await client.connect();

try {
  await client.query("BEGIN TRANSACTION READ ONLY");
  const output = {};
  for (const [name, query] of Object.entries(checks)) {
    const { rows } = await client.query(query);
    output[name] = rows;
  }
  console.log(JSON.stringify(output, null, 2));
  await client.query("ROLLBACK");
} catch (error) {
  await client.query("ROLLBACK").catch(() => undefined);
  throw error;
} finally {
  await client.end();
}
