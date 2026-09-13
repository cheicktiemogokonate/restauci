import type {
  CancelPartnerResidenceReservationInput,
  SaveResidenceInput,
  UpdatePartnerResidenceReservationInput,
} from "../contracts";

export type ResidenceActionResult = {
  success: boolean;
  message: string;
  residenceId?: string;
};

export type ResidenceGeocodeResult = {
  error?: string;
  success?: true;
  result?: {
    lat: number;
    lng: number;
    ville?: string;
    pays?: string;
  };
};

export interface ResidenceEditorActions {
  create: (input: SaveResidenceInput) => Promise<ResidenceActionResult>;
  update: (
    residenceId: string,
    input: SaveResidenceInput,
  ) => Promise<ResidenceActionResult>;
  geocode: (input: {
    address: string;
    city?: string;
    country?: string;
  }) => Promise<ResidenceGeocodeResult>;
}

export type ResidenceOnboardingActions = Pick<
  ResidenceEditorActions,
  "create" | "geocode"
>;

export interface ResidencePublicationActions {
  publish: (residenceId: string) => Promise<ResidenceActionResult>;
  withdraw: (residenceId: string) => Promise<ResidenceActionResult>;
}

export interface ResidenceCalendarActions {
  createUnavailablePeriod: (input: {
    residenceId: string;
    checkIn: string;
    checkOut: string;
    reason: string | null;
  }) => Promise<ResidenceActionResult>;
  deleteUnavailablePeriod: (
    residenceId: string,
    periodId: string,
  ) => Promise<ResidenceActionResult>;
}

export interface ResidenceReservationActions {
  update: (
    input: UpdatePartnerResidenceReservationInput,
  ) => Promise<ResidenceActionResult>;
  cancel: (
    input: CancelPartnerResidenceReservationInput,
  ) => Promise<
    ResidenceActionResult & { refundObligationId?: string | null }
  >;
  calendar: ResidenceCalendarActions;
}

export interface ResidenceReviewActions {
  approve: (residenceId: string) => Promise<ResidenceActionResult>;
  reject: (input: {
    residenceId: string;
    reason: string;
  }) => Promise<ResidenceActionResult>;
  suspend: (input: {
    residenceId: string;
    reason: string;
  }) => Promise<ResidenceActionResult>;
  reactivate: (residenceId: string) => Promise<ResidenceActionResult>;
}
