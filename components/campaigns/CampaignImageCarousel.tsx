"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

interface CampaignImageCarouselProps {
  title: string;
  imageUrl: string | null;
  galleryUrls: string[] | null;
}

export function CampaignImageCarousel({ title, imageUrl, galleryUrls }: CampaignImageCarouselProps) {
  const images = useMemo(() => {
    const allImages = [imageUrl, ...(galleryUrls ?? [])].filter((url): url is string => Boolean(url));
    return Array.from(new Set(allImages));
  }, [galleryUrls, imageUrl]);

  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (images.length <= 1) {
      return;
    }

    const interval = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % images.length);
    }, 4000);

    return () => window.clearInterval(interval);
  }, [images.length]);

  const goToPrevious = () => {
    if (images.length <= 1) return;
    setActiveIndex((current) => (current - 1 + images.length) % images.length);
  };

  const goToNext = () => {
    if (images.length <= 1) return;
    setActiveIndex((current) => (current + 1) % images.length);
  };

  if (images.length === 0) {
    return (
      <div className="flex h-[28rem] w-full items-center justify-center rounded-2xl border border-[var(--line)] bg-[var(--surface-soft)] text-sm text-[var(--muted)]">
        No campaign images available
      </div>
    );
  }

  return (
    <div key={images.join("|")} className="relative overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)] shadow-sm">
      <div className="relative h-[28rem] w-full">
        {images.map((src, index) => {
          const isActive = index === activeIndex;

          return (
            <div
              key={`${src}-${index}`}
              className={`absolute inset-0 transition-all duration-700 ease-out ${
                isActive ? "opacity-100 translate-x-0" : "pointer-events-none opacity-0 translate-x-4"
              }`}
            >
              <Image
                src={src}
                alt={`${title} image ${index + 1}`}
                fill
                priority={index === 0}
                className="object-cover"
              />
            </div>
          );
        })}

        {images.length > 1 ? (
          <>
            <button
              type="button"
              onClick={goToPrevious}
              className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/35 px-3 py-2 text-xl font-bold text-white backdrop-blur transition hover:bg-black/55"
              aria-label="Previous image"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={goToNext}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/35 px-3 py-2 text-xl font-bold text-white backdrop-blur transition hover:bg-black/55"
              aria-label="Next image"
            >
              ›
            </button>
          </>
        ) : null}

        <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2 rounded-full bg-black/25 px-3 py-2 backdrop-blur-sm">
          {images.map((_, index) => (
            <button
              key={index}
              type="button"
              aria-label={`Go to image ${index + 1}`}
              onClick={() => setActiveIndex(index)}
              className={`h-2.5 rounded-full transition-all ${
                index === activeIndex ? "w-8 bg-white" : "w-2.5 bg-white/60 hover:bg-white"
              }`}
            />
          ))}
        </div>
      </div>

      <div className="border-t border-[var(--line)] bg-[var(--surface-soft)] px-4 py-3 text-sm text-[var(--muted)]">
        Auto-slides every few seconds. Use arrows or dots to browse images.
      </div>
    </div>
  );
}
