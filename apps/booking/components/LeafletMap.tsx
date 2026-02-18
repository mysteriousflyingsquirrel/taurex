"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

// Fix default marker icon paths broken by bundlers
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

export interface MapPin {
  lat: number;
  lng: number;
  label: string;
  href?: string;
}

interface LeafletMapProps {
  pins: MapPin[];
  zoom?: number;
  className?: string;
}

export default function LeafletMap({ pins, zoom, className = "h-80 w-full" }: LeafletMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || pins.length === 0) return;

    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    const map = L.map(containerRef.current, {
      scrollWheelZoom: false,
    });

    L.tileLayer(TILE_URL, { attribution: ATTRIBUTION }).addTo(map);

    const markers: L.Marker[] = [];
    for (const pin of pins) {
      const marker = L.marker([pin.lat, pin.lng]).addTo(map);
      if (pin.href) {
        marker.bindPopup(
          `<a href="${pin.href}" style="font-weight:600;color:#4f46e5;text-decoration:none;">${pin.label}</a>`
        );
      } else {
        marker.bindPopup(`<strong>${pin.label}</strong>`);
      }
      markers.push(marker);
    }

    if (pins.length === 1) {
      map.setView([pins[0].lat, pins[0].lng], zoom ?? 14);
    } else {
      const group = L.featureGroup(markers);
      map.fitBounds(group.getBounds().pad(0.15));
    }

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [pins, zoom]);

  if (pins.length === 0) return null;

  return <div ref={containerRef} className={`rounded-2xl ${className}`} />;
}
