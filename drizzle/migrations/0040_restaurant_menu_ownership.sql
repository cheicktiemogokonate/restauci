-- Phase 7 : ownership relationnel Restaurant/Menu.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM plats p
    JOIN categories c ON c.id = p.categorie_id
    WHERE p.restaurant_id <> c.restaurant_id
  ) THEN
    RAISE EXCEPTION 'menu_cross_restaurant_category_reference';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM categories c
    JOIN creneaux_horaires h ON h.id = c.creneau_id
    WHERE c.restaurant_id <> h.restaurant_id
  ) OR EXISTS (
    SELECT 1
    FROM plats p
    JOIN creneaux_horaires h ON h.id = p.creneau_id
    WHERE p.restaurant_id <> h.restaurant_id
  ) THEN
    RAISE EXCEPTION 'menu_cross_restaurant_schedule_reference';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM categories
    GROUP BY restaurant_id, lower(trim(nom))
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'menu_duplicate_category_name';
  END IF;
END $$;
--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS "creneaux_horaires_restaurant_id_unique"
  ON "creneaux_horaires" ("restaurant_id", "id");
CREATE UNIQUE INDEX IF NOT EXISTS "categories_restaurant_id_unique"
  ON "categories" ("restaurant_id", "id");
CREATE UNIQUE INDEX IF NOT EXISTS "categories_restaurant_name_unique"
  ON "categories" ("restaurant_id", lower(trim("nom")));
--> statement-breakpoint

ALTER TABLE "categories"
  DROP CONSTRAINT IF EXISTS "categories_creneau_id_creneaux_horaires_id_fk";
ALTER TABLE "plats"
  DROP CONSTRAINT IF EXISTS "plats_categorie_id_categories_id_fk";
ALTER TABLE "plats"
  DROP CONSTRAINT IF EXISTS "plats_creneau_id_creneaux_horaires_id_fk";
--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "categories"
    ADD CONSTRAINT "categories_restaurant_schedule_fk"
    FOREIGN KEY ("restaurant_id", "creneau_id")
    REFERENCES "creneaux_horaires" ("restaurant_id", "id")
    ON DELETE RESTRICT ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "plats"
    ADD CONSTRAINT "plats_restaurant_category_fk"
    FOREIGN KEY ("restaurant_id", "categorie_id")
    REFERENCES "categories" ("restaurant_id", "id")
    ON DELETE RESTRICT ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
--> statement-breakpoint

DO $$ BEGIN
  ALTER TABLE "plats"
    ADD CONSTRAINT "plats_restaurant_schedule_fk"
    FOREIGN KEY ("restaurant_id", "creneau_id")
    REFERENCES "creneaux_horaires" ("restaurant_id", "id")
    ON DELETE RESTRICT ON UPDATE NO ACTION;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
