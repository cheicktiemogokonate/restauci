import { z } from "zod";

export const menuResourceIdSchema = z.string().uuid("Identifiant invalide");
export const menuCategoryNameSchema = z
  .string()
  .trim()
  .min(2, "Le nom doit contenir au moins 2 caractères.")
  .max(255, "Le nom est trop long.");

export const menuDishPayloadSchema = z
  .object({
    nom: z.string().trim().min(2, "Le nom du plat est obligatoire"),
    description: z.string().trim().max(2_000).optional(),
    prix: z.number().int().positive("Le prix doit être un entier positif"),
    image: z.string().url("URL d'image invalide").nullable().optional(),
    imageAssetId: z.string().uuid().optional(),
    disponible: z.boolean().default(true),
    categorieId: menuResourceIdSchema.optional(),
    categorieName: menuCategoryNameSchema.optional(),
    tags: z.array(z.string().trim().min(1).max(80)).max(30).default([]),
    allergenes: z.array(z.string().trim().min(1).max(80)).max(30).default([]),
  })
  .strict()
  .refine((value) => value.categorieId || value.categorieName, {
    message: "La catégorie du plat est requise.",
  });

const menuDishCommandSchema = z
  .object({
    restaurantId: z.string().min(1).max(36),
    ownerUserId: z.string().min(1).max(36),
    nom: z.string().trim().min(2).max(255),
    description: z.string().trim().max(2_000).optional(),
    prix: z.number().int().positive(),
    photoUrl: z.string().url().nullable().optional(),
    photoAssetId: z.string().uuid().optional(),
    categorieId: menuResourceIdSchema.optional(),
    newCategorieName: menuCategoryNameSchema.optional(),
    disponible: z.boolean().default(true),
    ordre: z.number().int().min(0).default(0),
    tags: z.array(z.string().trim().min(1).max(80)).max(30).default([]),
    allergenes: z.array(z.string().trim().min(1).max(80)).max(30).default([]),
    creneauId: menuResourceIdSchema.nullable().optional(),
  })
  .strict();

export const createMenuDishSchema = menuDishCommandSchema.refine(
  (value) => value.categorieId || value.newCategorieName,
  {
    message: "La catégorie est requise.",
    path: ["categorieId"],
  },
);

export const updateMenuDishSchema = menuDishCommandSchema
  .omit({ restaurantId: true, newCategorieName: true })
  .partial()
  .extend({
    restaurantId: z.string().min(1).max(36),
    dishId: menuResourceIdSchema,
    ownerUserId: z.string().min(1).max(36),
  })
  .strict();

export const menuDishListSchema = z
  .object({
    restaurantId: z.string().min(1).max(36),
    categoryId: menuResourceIdSchema.optional(),
    disponible: z.boolean().optional(),
    search: z.string().trim().max(100).optional(),
    page: z.number().int().min(1).default(1),
    limit: z.number().int().min(1).max(100).default(12),
  })
  .strict();

export type CreateMenuDishInput = z.infer<typeof createMenuDishSchema>;
export type UpdateMenuDishInput = z.infer<typeof updateMenuDishSchema>;
export type MenuDishListInput = z.infer<typeof menuDishListSchema>;

export interface MenuCategoryOptionDTO {
  id: string;
  nom: string;
}

export interface MenuCategoryManagementDTO extends MenuCategoryOptionDTO {
  creneauId: string | null;
  description: string | null;
  imageUrl: string | null;
  ordre: number;
  publicationIntent: boolean;
  firstPublishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  platCount: number;
  quotaEligible: boolean;
}

export interface MenuDishDTO {
  id: string;
  categorieId: string;
  creneauId: string | null;
  nom: string;
  description: string | null;
  prix: number;
  photoUrl: string | null;
  disponible: boolean;
  publicationIntent: boolean;
  firstPublishedAt: string | null;
  ordre: number;
  tags: string[];
  allergenes: string[];
  nombreCommandes: number;
  noteMoyenne: number;
  nombreAvis: number;
  createdAt: string;
  updatedAt: string;
  categorie: MenuCategoryOptionDTO;
  quotaEligible: boolean;
  categoryQuotaEligible: boolean;
}

export interface PublicMenuDishDTO {
  id: string;
  categorieId: string;
  nom: string;
  description: string | null;
  prix: number;
  photoUrl: string | null;
  disponible: boolean;
  commandableNow: boolean;
  nombreCommandes: number;
  noteMoyenne: number;
  nombreAvis: number;
  tags: string[];
  allergenes: string[];
}

export interface PublicMenuCategoryDTO extends MenuCategoryOptionDTO {
  description: string | null;
  imageUrl: string | null;
  ordre: number;
  plats: PublicMenuDishDTO[];
}

export interface MenuManagementWorkspaceDTO {
  categories: MenuCategoryManagementDTO[];
  dishes: MenuDishDTO[];
  totalDishes: number;
  page: number;
  limit: number;
  stats: { total: number; disponibles: number; indisponibles: number };
  quotaSummary: {
    category: { used: number; total: number; limit: number | null };
    dish: { used: number; total: number; limit: number | null };
  };
}

export interface MenuDishDetailWorkspaceDTO {
  dish: MenuDishDTO;
  categories: MenuCategoryOptionDTO[];
  similarDishes: MenuDishDTO[];
}

export interface OrderableDishDTO {
  id: string;
  nom: string;
  prix: number;
}
