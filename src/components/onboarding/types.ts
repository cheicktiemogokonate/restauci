export interface SpecialHourException {
  id: string;
  date: string;
  label: string;
  isOpen: boolean;
  openTime: string;
  closeTime: string;
}

export interface DaySchedule {
  day: string;
  isOpen: boolean;
  openTime: string;
  closeTime: string;
}

export interface GeneralInfo {
  name: string;
  description: string;
  logoUrl: string | null;
  logoAssetId: string | null;
  bannerUrl: string | null;
  bannerAssetId: string | null;
}

export interface AddressContact {
  country: string;
  city: string;
  commune: string;
  quarter: string;
  fullAddress: string;
  latitude: number;
  longitude: number;
  phone: string;
  email: string;
  whatsapp: string;
  website: string;
  facebook: string;
}

import type { ServiceTypeInput } from "@/modules/restaurants/contracts";
import type { EstablishmentType } from "@/modules/restaurants/presentation/onboarding-settings";

export interface RestaurantSettings {
  establishmentType: EstablishmentType;
  category: string;
  currency: string;
  serviceTypes: ServiceTypeInput[]; // 'dine-in', 'takeout', 'delivery', etc.
  menuLanguage: string;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  photoUrl: string | null;
  photoAssetId: string | null;
}

export interface RestaurantConfig {
  general: GeneralInfo;
  address: AddressContact;
  schedule: DaySchedule[];
  exceptions: SpecialHourException[];
  settings: RestaurantSettings;
  menu: MenuItem[];
}
