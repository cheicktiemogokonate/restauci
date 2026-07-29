import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { checkRateLimit, uploadLimiter } from "@/lib/rate-limit";
import { apiLogger } from "@/lib/loggers";
import {
  ACCEPTED_IMAGE_TYPES,
  MAX_IMAGE_SIZE,
  validateImageType,
} from "@/lib/media/image";
import { isR2Configured, uploadImageToR2 } from "@/lib/r2";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ??
    request.headers.get("x-real-ip") ??
    "anonymous";
  
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

  const formData = await request.formData();
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
    const validatedImage = validateImageType(buffer, file.type);

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

    const result = await uploadImageToR2({
      body: buffer,
      contentType: validatedImage.contentType,
      extension: validatedImage.extension,
      ownerId: session.userId,
    });

    apiLogger.info({ ip, key: result.key }, "Media uploaded successfully");
    return NextResponse.json({ url: result.url });
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
