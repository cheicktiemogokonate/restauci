import { z } from "zod";

export interface LocationSample {
  lat: number;
  lng: number;
  accuracyMeters: number;
  capturedAt: string;
}

export const locationSampleSchema = z
  .object({
    lat: z.number().finite().min(-90).max(90),
    lng: z.number().finite().min(-180).max(180),
    accuracyMeters: z.number().finite().min(0).max(100_000),
    capturedAt: z.string().datetime({ offset: true }),
  })
  .strict();
