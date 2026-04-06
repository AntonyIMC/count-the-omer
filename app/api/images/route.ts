import { list, put, del } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";

const ADMIN_TOKEN =
  process.env.ADMIN_TOKEN ||
  "ab59c269fbb4ff177f2972b2b401e220a0b99433528e063c";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function checkAuth(req: NextRequest): boolean {
  const url = new URL(req.url);
  const token =
    url.searchParams.get("token") || req.headers.get("x-admin-token");
  return token === ADMIN_TOKEN;
}

// GET /api/images?token=xxx — list all uploaded images
export async function GET(req: NextRequest) {
  if (!checkAuth(req)) return unauthorized();

  const { blobs } = await list({ prefix: "omer-images/" });
  const images = blobs
    .filter((b) => b.pathname.match(/\.(jpg|jpeg|png|webp)$/i))
    .map((b) => ({
      url: b.url,
      pathname: b.pathname,
      name: b.pathname.replace("omer-images/", ""),
      size: b.size,
      uploadedAt: b.uploadedAt,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

  return NextResponse.json({ images, count: images.length });
}

// POST /api/images?token=xxx — upload image(s) via multipart form data
export async function POST(req: NextRequest) {
  if (!checkAuth(req)) return unauthorized();

  try {
    const formData = await req.formData();
    const files = formData.getAll("files") as File[];

    if (files.length === 0) {
      return NextResponse.json(
        { error: "No files provided" },
        { status: 400 }
      );
    }

    const uploaded = [];
    for (const file of files) {
      // Convert File to ArrayBuffer for Vercel Blob
      const arrayBuffer = await file.arrayBuffer();
      const blob = await put(`omer-images/${file.name}`, arrayBuffer, {
        access: "public",
        addRandomSuffix: false,
        contentType: file.type || "image/jpeg",
      });
      uploaded.push({ url: blob.url, name: file.name });
    }

    return NextResponse.json({ uploaded, count: uploaded.length });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Upload error:", message);
    return NextResponse.json(
      { error: "Upload failed", details: message },
      { status: 500 }
    );
  }
}

// DELETE /api/images?token=xxx&url=<blob_url> — delete an image
export async function DELETE(req: NextRequest) {
  if (!checkAuth(req)) return unauthorized();

  const url = new URL(req.url);
  const blobUrl = url.searchParams.get("url");

  if (!blobUrl) {
    return NextResponse.json(
      { error: "Missing url parameter" },
      { status: 400 }
    );
  }

  try {
    await del(blobUrl);
    return NextResponse.json({ deleted: blobUrl });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "Delete failed", details: message },
      { status: 500 }
    );
  }
}
