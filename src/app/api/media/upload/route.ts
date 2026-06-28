import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { cloudinary, configureCloudinary, isCloudinaryConfigured } from "@/lib/cloudinary";
import { checkRateLimit, uploadLimiter } from "@/lib/rate-limit";
import { apiLogger } from "@/lib/loggers";

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

  if (!isCloudinaryConfigured()) {
    apiLogger.error({ ip, reason: "cloudinary not configured" }, "Cloudinary upload failed");
    return NextResponse.json(
      {
        error:
          "Configuration Cloudinary manquante. Définissez CLOUDINARY_URL ou CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY et CLOUDINARY_API_SECRET dans .env.local.",
      },
      { status: 500 }
    );
  }

  configureCloudinary();

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    apiLogger.warn({ ip, reason: "no file provided" }, "Media upload failed");
    return NextResponse.json(
      { error: "Aucun fichier envoyé." },
      { status: 400 }
    );
  }

  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    apiLogger.warn({ ip, fileType: file.type, reason: "invalid file type" }, "Media upload failed");
    return NextResponse.json(
      { error: "Le format doit être jpeg, png ou webp." },
      { status: 400 }
    );
  }

  if (file.size > 5 * 1024 * 1024) {
    apiLogger.warn({ ip, fileSize: file.size, reason: "file too large" }, "Media upload failed");
    return NextResponse.json(
      { error: "Le fichier doit faire moins de 5 Mo." },
      { status: 400 }
    );
  }

  apiLogger.info({ ip, filename: file.name, fileSize: file.size, fileType: file.type }, "Starting Cloudinary upload");

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const dataUri = `data:${file.type};base64,${buffer.toString("base64")}`;

    const result = await cloudinary.uploader.upload(dataUri, {
      folder: "restau-platform",
      resource_type: "image",
    });

    apiLogger.info({ ip, url: result.secure_url, publicId: result.public_id }, "Media uploaded successfully");
    return NextResponse.json({ url: result.secure_url });
  } catch (error) {
    apiLogger.error({ 
      ip, 
      filename: file.name,
      error: error instanceof Error ? error.message : "Unknown error",
      stack: process.env.NODE_ENV === "development" && error instanceof Error ? error.stack : undefined
    }, "Cloudinary upload error");
    return NextResponse.json(
      { error: "Erreur lors de l'envoi de l'image." },
      { status: 500 }
    );
  }
}
