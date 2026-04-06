import { list } from "@vercel/blob";
import { NextResponse } from "next/server";

// GET /api/images/public — list all images (public, no auth)
export async function GET() {
  try {
    const { blobs } = await list({ prefix: "omer-images/" });
    const images = blobs
      .filter((b) => b.pathname.match(/\.(jpg|jpeg|png|webp)$/i))
      .map((b) => ({
        url: b.url,
        name: b.pathname.replace("omer-images/", ""),
      }))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));

    return NextResponse.json(
      { images, count: images.length },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      }
    );
  } catch {
    // If blob storage isn't configured, fall back to empty
    return NextResponse.json({ images: [], count: 0 });
  }
}
