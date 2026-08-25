// Bridge A3 temporaire. La source de vérité vit dans le module Restaurants.
export {
  isRestaurantOrderable,
  isRestaurantPubliclyVisible,
} from "@/modules/restaurants/model";
export type { RestaurantAvailabilityState } from "@/modules/restaurants/model";
