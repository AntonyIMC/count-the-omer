"use client";

import { useCallback, useEffect, useState } from "react";

interface ImageInfo {
  url: string;
  pathname: string;
  name: string;
  size: number;
  uploadedAt: string;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AdminPage() {
  const [token, setToken] = useState<string | null>(null);
  const [images, setImages] = useState<ImageInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  // Get token from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("token");
    if (!t) {
      setError("Missing token in URL. Access denied.");
      setLoading(false);
      return;
    }
    setToken(t);
  }, []);

  const fetchImages = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/images?token=${token}`);
      if (!res.ok) {
        if (res.status === 401) throw new Error("Invalid token");
        throw new Error("Failed to fetch images");
      }
      const data = await res.json();
      setImages(data.images);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load images");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) fetchImages();
  }, [token, fetchImages]);

  async function handleUpload(files: FileList | File[]) {
    if (!token || files.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      Array.from(files).forEach((f) => formData.append("files", f));
      const res = await fetch(`/api/images?token=${token}`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Upload failed");
      await fetchImages();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(img: ImageInfo) {
    if (!token) return;
    if (!confirm(`Delete ${img.name}?`)) return;
    setDeleting(img.url);
    setError(null);
    try {
      const res = await fetch(
        `/api/images?token=${token}&url=${encodeURIComponent(img.url)}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error("Delete failed");
      await fetchImages();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeleting(null);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      handleUpload(e.dataTransfer.files);
    }
  }

  if (!token && !loading) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-500">Access Denied</h1>
          <p className="mt-2 text-neutral-500">
            Add <code className="rounded bg-neutral-100 px-2 py-1 text-sm dark:bg-neutral-800">?token=YOUR_TOKEN</code> to the URL
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
            Omer Image Admin 🖼️
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            Upload, view, and remove Omer Adam images. Images are named and sorted
            alphabetically — they cycle through in order on the main page.
          </p>
        </header>

        {/* Error */}
        {error && (
          <div className="mb-6 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Upload zone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`mb-8 rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
            dragOver
              ? "border-blue-400 bg-blue-50 dark:border-blue-500 dark:bg-blue-900/20"
              : "border-neutral-200 dark:border-neutral-700"
          }`}
        >
          <p className="mb-3 text-neutral-500 dark:text-neutral-400">
            {uploading ? "Uploading..." : "Drag & drop images here, or"}
          </p>
          <label className="inline-block cursor-pointer rounded-lg bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200">
            {uploading ? "Uploading..." : "Choose Files"}
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              disabled={uploading}
              onChange={(e) => {
                if (e.target.files) handleUpload(e.target.files);
              }}
            />
          </label>
          <p className="mt-3 text-xs text-neutral-400">
            JPG, PNG, WebP. Name them like <code>omer-1.jpg</code>, <code>omer-2.jpg</code>, etc.
            The app cycles through them in alphabetical order.
          </p>
        </div>

        {/* Image count */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            Images ({images.length})
          </h2>
          <button
            onClick={fetchImages}
            disabled={loading}
            className="text-sm text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300"
          >
            {loading ? "Loading..." : "↻ Refresh"}
          </button>
        </div>

        {/* Image grid */}
        {loading && images.length === 0 ? (
          <p className="text-center text-neutral-500">Loading images...</p>
        ) : images.length === 0 ? (
          <p className="text-center text-neutral-500">
            No images uploaded yet. Upload some Omer Adam photos above!
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {images.map((img) => (
              <div
                key={img.url}
                className="group relative overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-neutral-200 dark:bg-neutral-900 dark:ring-neutral-800"
              >
                <div className="aspect-square overflow-hidden">
                  <img
                    src={img.url}
                    alt={img.name}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="px-3 py-2">
                  <p className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">
                    {img.name}
                  </p>
                  <p className="text-xs text-neutral-400">
                    {formatBytes(img.size)}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(img)}
                  disabled={deleting === img.url}
                  className="absolute right-2 top-2 rounded-full bg-red-500 px-2 py-1 text-xs font-medium text-white opacity-0 shadow transition-opacity group-hover:opacity-100 hover:bg-red-600"
                >
                  {deleting === img.url ? "..." : "✕ Delete"}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <footer className="mt-12 text-center text-xs text-neutral-300 dark:text-neutral-600">
          Admin panel for Count the Omer
        </footer>
      </div>
    </div>
  );
}
