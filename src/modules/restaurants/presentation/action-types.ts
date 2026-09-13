import type {
  OpeningHoursInput,
  RestaurantScheduleDTO,
} from "../contracts";

export type RestaurantActionResult = {
  success?: true;
  error?: string;
};

export interface RestaurantProfileActions {
  update: (
    previousState: unknown,
    formData: FormData,
  ) => Promise<{ error?: unknown; success?: boolean }>;
  setOnline: (enLigne: boolean) => Promise<
    | {
        success: true;
        enLigne: boolean;
        accepteCommandes: boolean;
      }
    | { error: string }
  >;
  setOrderAcceptance: (
    accepteCommandes: boolean,
  ) => Promise<RestaurantActionResult & { accepteCommandes?: boolean }>;
  geocode: (input: {
    adresse: string;
    ville?: string;
    pays?: string;
  }) => Promise<
    | {
        success: true;
        result: { lat: number; lng: number; ville?: string; pays?: string };
      }
    | { error: string }
  >;
}

export interface RestaurantScheduleActions {
  save: (input: OpeningHoursInput) => Promise<
    RestaurantActionResult & { creneau?: RestaurantScheduleDTO }
  >;
  toggle: (id: string, actif: boolean) => Promise<RestaurantActionResult>;
  remove: (id: string) => Promise<RestaurantActionResult>;
}

export type ResubmitRestaurantAction = () => Promise<RestaurantActionResult>;
