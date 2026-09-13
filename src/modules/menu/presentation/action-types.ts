export type MenuActionResult = {
  success?: boolean;
  error?: string;
};

export interface MenuCategoryActions {
  create: (name: string) => Promise<
    | {
        success: true;
        category: { id: string; nom: string };
      }
    | { success: false; error: string }
  >;
  rename: (categoryId: string, name: string) => Promise<MenuActionResult>;
  setPublication: (
    categoryId: string,
    publicationIntent: boolean,
  ) => Promise<MenuActionResult>;
}

export interface MenuDishActions {
  remove: (dishId: string) => Promise<MenuActionResult>;
  update: (input: {
    platId: string;
    nom: string;
    description?: string;
    prix: string;
    photoUrl?: string | null;
    photoAssetId?: string;
    categorieId: string;
    disponible: boolean;
  }) => Promise<MenuActionResult>;
  setAvailability: (
    dishId: string,
    disponible: boolean,
  ) => Promise<MenuActionResult>;
  setPublication: (
    dishId: string,
    publicationIntent: boolean,
  ) => Promise<MenuActionResult>;
}

export type CreateMenuDishAction = (
  input: {
    nom: string;
    description?: string;
    prix: string;
    image: string | null;
    imageAssetId?: string | null;
    categorieId?: string;
    newCategorieName?: string;
    disponible: boolean;
  },
) => Promise<{ error?: string } | void>;
