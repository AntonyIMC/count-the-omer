import { list, put, del } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";

const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "ab59c269fbb4ff177f2972b2b401e220a0b99433528e063c";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function checkAuth(req: NextRequest): boolean {
  const url = new URL(req.url);
  const token = url.searchParams.get("token") || req.headers.get("x-admin-token");
  return token === ADMIN_TOKEN;
}

// GET /api/images?token=xxx — list all uploaded images
export async function GET(req: NextRequest) {
  if (!checkAuth(req)) return unauthorized();

  const { blobs } = await list({ prefix: "omer-images/" });
  const images = blobs
    .filter((b) => b.pathname.match(/\.(jpg|jpeg|png|webp)$/i))
    .map((b, i) => ({
      url: b.url,
      pathname: b.pathname,
      name: b.pathname.replace("omer-images/", ""),
      size: b.size,
      uploadedAt: b.uploadedAt,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

  return NextResponse.json({ images, count: images.length });
}

// POST /api/images?token=xxx — upload image(s)
export async function POST(req: NextRequest) {
  if (!checkAuth(req)) return unauthorized();

  const formData = await req.formData();
  const files = formData.getAll("files") as File[];

  if (files.length === 0) {
    return NextResponse.json({ error: "No files provided" }, { status: 400 });
  }

  const uploaded = [];
  for (const file of files) {
    const blob = await put(`omer-images/${file.name}`, file, {
      access: "public",
      addRandomSuffix: false,
    });
    uploaded.push({ url: blob.url, name: file.name });
  }

  return NextResponse.json({ uploaded, count: uploaded.length });
}

// DELETE /api/images?token=xxx&url=<blob_url> — delete an image
export async function DELETE(req: NextRequest) {
  if (!checkAuth(req)) return unauthorized();

  const url = new URL(req.url);
  const blobUrl = url.searchParams.get("url");

  if (!blobUrl) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
  }

  await del(blobUrl);
  return NextResponse.json({ deleted: blobUrl });
}
