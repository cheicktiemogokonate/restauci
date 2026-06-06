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

export interface SocialLinks {
  facebook: string;
  instagram: string;
  whatsapp: string;
  website: string;
  googleBusiness: string;
  tripadvisor: string;
}

export interface GeneralInfo {
  name: string;
  description: string;
  logoUrl: string | null;
  bannerUrl: string | null;
  galleryUrls: string[];
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

export interface RestaurantSettings {
  category: string;
  currency: string;
  serviceTypes: string[]; // 'dine-in', 'takeout', 'delivery'
  menuLanguage: string;
  taxRate: number;
  enableOnlineBooking: boolean;
}

export interface RestaurantConfig {
  general: GeneralInfo;
  address: AddressContact;
  schedule: DaySchedule[];
  exceptions: SpecialHourException[];
  socials: SocialLinks;
  settings: RestaurantSettings;
}
