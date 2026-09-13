import { getClientIp } from "@/shared/http/client-ip";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/modules/auth/server";
import { checkRateLimit, uploadLimiter } from "@/infrastructure/rate-limit";
import { apiLogger } from "@/infrastructure/loggers";
import {
  ACCEPTED_IMAGE_TYPES,
  MAX_IMAGE_SIZE,
  sanitizeImage,
} from "@/modules/media/server";
import {
  createTemporaryPublicMediaAsset,
  isR2Configured,
} from "@/modules/media/server";
import { enforceContentLength } from "@/app/api/_shared/request-size";

const MAX_MULTIPART_OVERHEAD = 128 * 1024;

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  
  const session = await getCurrentUser();
  if (session) {
    const rateLimitResponse = await checkRateLimit(uploadLimiter, session.userId);
    if (rateLimitResponse) return rateLimitResponse;
  }
  if (!session) {
    apiLogger.warn({ ip, reason: "unauthorized access attempt" }, "Unauthorized media upload attempt");
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  if (!isR2Configured()) {
    apiLogger.error({ ip, reason: "r2 not configured" }, "R2 upload failed");
    return NextResponse.json(
      {
        error:
          "Configuration Cloudflare R2 manquante. Définissez les variables R2 dans l’environnement.",
      },
      { status: 500 }
    );
  }

  const sizeError = enforceContentLength(
    request,
    MAX_IMAGE_SIZE + MAX_MULTIPART_OVERHEAD,
  );
  if (sizeError) return sizeError;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Corps multipart invalide." },
      { status: 400 },
    );
  }
  const file = formData.get("file");

  if (!(file instanceof File)) {
    apiLogger.warn({ ip, reason: "no file provided" }, "Media upload failed");
    return NextResponse.json(
      { error: "Aucun fichier envoyé." },
      { status: 400 }
    );
  }

  if (!ACCEPTED_IMAGE_TYPES.some((type) => type === file.type)) {
    apiLogger.warn({ ip, fileType: file.type, reason: "invalid file type" }, "Media upload failed");
    return NextResponse.json(
      { error: "Le format doit être jpeg, png ou webp." },
      { status: 400 }
    );
  }

  if (file.size === 0 || file.size > MAX_IMAGE_SIZE) {
    apiLogger.warn({ ip, fileSize: file.size, reason: "file too large" }, "Media upload failed");
    return NextResponse.json(
      { error: "Le fichier doit faire moins de 5 Mo." },
      { status: 400 }
    );
  }

  apiLogger.info({ ip, filename: file.name, fileSize: file.size, fileType: file.type }, "Starting R2 upload");

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const validatedImage = await sanitizeImage(buffer, file.type);

    if (!validatedImage) {
      apiLogger.warn(
        { ip, filename: file.name, fileType: file.type },
        "Media signature validation failed",
      );
      return NextResponse.json(
        { error: "Le contenu du fichier ne correspond pas à une image valide." },
        { status: 400 },
      );
    }

    const result = await createTemporaryPublicMediaAsset({
      body: validatedImage.body,
      contentType: validatedImage.contentType,
      extension: validatedImage.extension,
      ownerUserId: session.userId,
    });

    apiLogger.info({ ip, assetId: result.id }, "Media uploaded successfully");
    return NextResponse.json({
      assetId: result.id,
      url: result.url,
      expiresAt: result.expiresAt,
    });
  } catch (error) {
    apiLogger.error({ 
      ip, 
      filename: file.name,
      error: error instanceof Error ? error.message : "Unknown error",
      stack: process.env.NODE_ENV === "development" && error instanceof Error ? error.stack : undefined
    }, "R2 upload error");
    return NextResponse.json(
      { error: "Erreur lors de l'envoi de l'image." },
      { status: 500 }
    );
  }
}
