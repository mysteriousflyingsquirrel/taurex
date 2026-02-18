"use client";

import { useState, useCallback, useRef } from "react";
import type { ApartmentImage } from "@taurex/firebase";

interface ImageCarouselProps {
  images: ApartmentImage[];
  height?: string;
  emptyText?: string;
}

export default function ImageCarousel({
  images,
  height = "h-64 md:h-80 lg:h-96",
  emptyText = "No images available",
}: ImageCarouselProps) {
  const [current, setCurrent] = useState(0);
  const touchStartX = useRef<number | null>(null);

  const prev = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setCurrent((c) => (c === 0 ? images.length - 1 : c - 1));
    },
    [images.length]
  );

  const next = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setCurrent((c) => (c === images.length - 1 ? 0 : c + 1));
    },
    [images.length]
  );

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(diff) > 50) {
      if (diff < 0) setCurrent((c) => (c === images.length - 1 ? 0 : c + 1));
      else setCurrent((c) => (c === 0 ? images.length - 1 : c - 1));
    }
    touchStartX.current = null;
  };

  if (!images || images.length === 0) {
    return (
      <div className={`${height} flex items-center justify-center rounded-xl bg-gray-100 text-sm text-gray-400`}>
        {emptyText}
      </div>
    );
  }

  return (
    <div className={`group relative ${height} overflow-hidden rounded-xl bg-gray-100`} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      {images.map((img, i) => (
        <img
          key={img.src}
          src={img.srcBig ?? img.src}
          alt={img.alt || ""}
          loading={i === 0 ? "eager" : "lazy"}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${i === current ? "opacity-100" : "opacity-0"}`}
        />
      ))}
      {images.length > 1 && (
        <>
          <button onClick={prev} className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-1.5 opacity-0 shadow transition hover:bg-white group-hover:opacity-100" aria-label="Previous image">
            <svg className="h-5 w-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          </button>
          <button onClick={next} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-1.5 opacity-0 shadow transition hover:bg-white group-hover:opacity-100" aria-label="Next image">
            <svg className="h-5 w-5 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
          </button>
        </>
      )}
      {images.length > 1 && (
        <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
          {images.map((_, i) => (
            <button key={i} onClick={(e) => { e.preventDefault(); e.stopPropagation(); setCurrent(i); }} className={`h-2 rounded-full transition-all ${i === current ? "w-6 bg-white" : "w-2 bg-white/60 hover:bg-white/80"}`} aria-label={`Image ${i + 1}`} />
          ))}
        </div>
      )}
    </div>
  );
}
