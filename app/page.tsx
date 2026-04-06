"use client";

import { useEffect, useState } from "react";

// Omer start dates (evening of 16 Nisan — 2nd night of Pesach)
// The count begins that evening, so Day 1 is the next calendar day.
const OMER_START_DATES: Record<number, string> = {
  2025: "2025-04-13", // evening of April 13 → Day 1 = April 14 daytime
  2026: "2026-04-02", // evening of April 2 → Day 1 = April 3 daytime
  2027: "2027-03-22",
  2028: "2028-04-11",
  2029: "2029-03-31",
  2030: "2030-04-18",
  2031: "2031-04-07",
  2032: "2032-03-27",
  2033: "2033-04-14",
  2034: "2034-04-03",
  2035: "2035-04-23",
};

const HEBREW_DAYS = [
  "", "א", "ב", "ג", "ד", "ה", "ו", "ז", "ח", "ט", "י",
  "יא", "יב", "יג", "יד", "טו", "טז", "יז", "יח", "יט", "כ",
  "כא", "כב", "כג", "כד", "כה", "כו", "כז", "כח", "כט", "ל",
  "לא", "לב", "לג", "לד", "לה", "לו", "לז", "לח", "לט", "מ",
  "מא", "מב", "מג", "מד", "מה", "מו", "מז", "מח", "מט",
];

const LOCAL_IMAGE_COUNT = 15;

interface OmerState {
  day: number;
  status: "before" | "during" | "after";
  nextStart?: string;
}

function getOmerState(): OmerState {
  const now = new Date();
  const year = now.getFullYear();

  for (const checkYear of [year, year + 1]) {
    const startDateStr = OMER_START_DATES[checkYear];
    if (!startDateStr) continue;

    const startDate = new Date(startDateStr + "T18:00:00");
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 49);

    if (now < startDate) {
      return { status: "before", day: 0, nextStart: startDateStr };
    }

    if (now >= startDate && now < endDate) {
      const msElapsed = now.getTime() - startDate.getTime();
      const daysElapsed = Math.floor(msElapsed / (24 * 60 * 60 * 1000));
      const day = Math.min(daysElapsed + 1, 49);
      return { status: "during", day };
    }
  }

  const nextYear = year + 1;
  const nextStart = OMER_START_DATES[nextYear];
  return { status: "after", day: 0, nextStart: nextStart || undefined };
}

function getDaysUntil(dateStr: string): number {
  const now = new Date();
  const target = new Date(dateStr + "T18:00:00");
  const diff = target.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (24 * 60 * 60 * 1000)));
}

function getPlaceholderSrc(index: number): string {
  const colors = [
    "1a1a2e/e6b800", "16213e/e6b800", "0f3460/e6b800",
    "1a1a2e/ff6b6b", "16213e/00d2ff", "2d1b69/e6b800",
    "1b2838/e6b800", "0d1117/e6b800", "1e3a5f/e6b800",
    "2c003e/e6b800",
  ];
  const colorPair = colors[(index - 1) % colors.length];
  return `https://placehold.co/300x300/${colorPair}?text=Omer+${index}&font=montserrat`;
}

function OmerImage({
  index,
  blobImages,
  className,
}: {
  index: number;
  blobImages: string[];
  className?: string;
}) {
  const [errored, setErrored] = useState(false);

  // Pick image: cycle through blob images if available, else local files
  const src = (() => {
    if (errored) return getPlaceholderSrc(index);
    if (blobImages.length > 0) {
      return blobImages[(index - 1) % blobImages.length];
    }
    const imgNum = ((index - 1) % LOCAL_IMAGE_COUNT) + 1;
    return `/images/omer-${imgNum}.jpg`;
  })();

  return (
    <img
      src={src}
      onError={() => {
        if (!errored) setErrored(true);
      }}
      alt={`Omer ${index}`}
      className={className}
    />
  );
}

export default function Home() {
  const [omer, setOmer] = useState<OmerState | null>(null);
  const [blobImages, setBlobImages] = useState<string[]>([]);

  useEffect(() => {
    setOmer(getOmerState());
    const interval = setInterval(() => setOmer(getOmerState()), 60000);
    return () => clearInterval(interval);
  }, []);

  // Fetch images from blob storage
  useEffect(() => {
    fetch("/api/images/public")
      .then((r) => r.json())
      .then((data) => {
        if (data.images && data.images.length > 0) {
          setBlobImages(data.images.map((i: { url: string }) => i.url));
        }
      })
      .catch(() => {
        // Silently fall back to local images
      });
  }, []);

  if (!omer) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-lg text-neutral-500">Loading...</p>
      </div>
    );
  }

  if (omer.status !== "during") {
    const daysUntil = omer.nextStart ? getDaysUntil(omer.nextStart) : null;
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <div className="mb-8">
          <OmerImage
            index={1}
            blobImages={blobImages}
            className="mx-auto h-48 w-48 rounded-full object-cover grayscale opacity-60"
          />
        </div>
        <h1 className="mb-3 text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
          The Omer is not being counted right now
        </h1>
        <p className="text-lg text-neutral-500 dark:text-neutral-400">
          Omer Adam is taking a break 😴
        </p>
        {daysUntil !== null && daysUntil > 0 && (
          <p className="mt-4 text-sm text-neutral-400 dark:text-neutral-500">
            Next Omer season starts in{" "}
            <span className="font-semibold text-neutral-700 dark:text-neutral-300">
              {daysUntil} day{daysUntil !== 1 ? "s" : ""}
            </span>
          </p>
        )}
        <p className="mt-12 text-xs text-neutral-300 dark:text-neutral-600">
          Powered by Omer Adam · Not affiliated with the real Omer Adam (but
          he&apos;d probably approve)
        </p>
      </div>
    );
  }

  const days = Array.from({ length: omer.day }, (_, i) => i + 1);

  return (
    <div className="min-h-screen px-4 py-10 sm:px-6 lg:px-8">
      <header className="mx-auto mb-10 max-w-3xl text-center">
        <h1 className="text-4xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 sm:text-5xl">
          Count the Omer 🔢
        </h1>
        <p className="mt-2 text-lg text-neutral-500 dark:text-neutral-400">
          don&apos;t forget to count the Omer!
        </p>
        <div className="mt-4 inline-block rounded-full bg-neutral-900 px-5 py-2 text-sm font-semibold text-white dark:bg-white dark:text-neutral-900">
          Day {omer.day} of 49 · יום {HEBREW_DAYS[omer.day]}
        </div>
      </header>

      <div className="mx-auto max-w-5xl">
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7">
          {days.map((day) => (
            <div
              key={day}
              className="group flex flex-col items-center overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-neutral-200 transition-transform hover:scale-105 dark:bg-neutral-900 dark:ring-neutral-800"
            >
              <div className="aspect-square w-full overflow-hidden">
                <OmerImage
                  index={day}
                  blobImages={blobImages}
                  className="h-full w-full object-cover transition-transform group-hover:scale-110"
                />
              </div>
              <div className="flex w-full items-center justify-between px-3 py-2">
                <span className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
                  {day}
                </span>
                <span className="text-sm text-neutral-400 dark:text-neutral-500">
                  {HEBREW_DAYS[day]}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <footer className="mx-auto mt-12 max-w-3xl text-center">
        <p className="text-xs text-neutral-300 dark:text-neutral-600">
          Powered by Omer Adam · Not affiliated with the real Omer Adam (but
          he&apos;d probably approve)
        </p>
      </footer>
    </div>
  );
}
