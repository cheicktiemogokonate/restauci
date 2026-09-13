import { getRestaurateurSession } from "@/app/_shared/restaurant-session";
import { getMenuCategoryOptions } from "@/modules/menu/server";
import PlatFormWizard from "@/modules/menu/presentation/menu-form-new";
import { createPlatWizardAction } from "../actions";

export const metadata = {
  title: "Nouveau plat",
  description: "Ajouter un plat à la carte de votre restaurant",
};

export default async function NewPlatPage() {
  const { restaurant } = await getRestaurateurSession();
  const categories = await getMenuCategoryOptions(restaurant.id);
  return <PlatFormWizard categories={categories} action={createPlatWizardAction} />;
}
