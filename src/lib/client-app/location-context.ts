export interface ClientLocationSample {
  lat: number;
  lng: number;
  accuracyMeters: number;
  capturedAt: string;
}

export type ClientLocationContext =
  | { kind: "currentLocation"; sample: ClientLocationSample }
  | {
      kind: "destinationLocation";
      sample?: ClientLocationSample;
      serviceMarketCode?: string;
    }
  | { kind: "serviceLocation"; sample: ClientLocationSample };
