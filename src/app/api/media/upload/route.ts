import { NextRequest, NextResponse } from "next/server"
import { v2 as cloudinary } from "cloudinary"
import { getCurrentUser } from "@/lib/auth"

cloudinary.config({ secure: true })

export async function POST(request: NextRequest) {
  const currentUser = await getCurrentUser()
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const cloudinaryUrl = process.env.CLOUDINARY_URL
  if (!cloudinaryUrl) {
    return NextResponse.json(
      { error: "Configuration Cloudinary manquante." },
      { status: 500 }
    )
  }

  const formData = await request.formData()
  const file = formData.get("file")

  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "Aucun fichier envoyé." },
      { status: 400 }
    )
  }

  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    return NextResponse.json(
      { error: "Le format doit être jpeg, png ou webp." },
      { status: 400 }
    )
  }

  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json(
      { error: "Le fichier doit faire moins de 5 Mo." },
      { status: 400 }
    )
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer())
    const dataUri = `data:${file.type};base64,${buffer.toString("base64")}`

    const result = await cloudinary.uploader.upload(dataUri, {
      folder: "restau-platform",
      resource_type: "image",
    })

    return NextResponse.json({ url: result.secure_url })
  } catch (error) {
    console.error("Cloudinary upload error:", error)
    return NextResponse.json(
      { error: "Erreur lors de l'envoi de l'image." },
      { status: 500 }
    )
  }
}
