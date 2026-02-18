"use client";

import dynamic from "next/dynamic";
import type { MapPin } from "./LeafletMap";

const LeafletMap = dynamic(() => import("./LeafletMap"), { ssr: false });

interface MapProps {
  pins: MapPin[];
  zoom?: number;
  className?: string;
}

export default function Map({ pins, zoom, className }: MapProps) {
  return <LeafletMap pins={pins} zoom={zoom} className={className} />;
}

export type { MapPin };
