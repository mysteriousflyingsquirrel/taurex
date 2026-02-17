import { useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { LatLngBoundsExpression, Icon } from "leaflet";
import { Link } from "react-router-dom";
import type { Apartment } from "@taurex/firebase";
import "leaflet/dist/leaflet.css";

// Fix default marker icons for Leaflet + bundler
const defaultIcon = new Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface ApartmentMapProps {
  apartments: Apartment[];
  tenantSlug: string;
  searchParams: URLSearchParams;
}

export default function ApartmentMap({
  apartments,
  tenantSlug,
  searchParams,
}: ApartmentMapProps) {
  const markers = useMemo(
    () =>
      apartments.filter(
        (a) =>
          a.location &&
          typeof a.location.lat === "number" &&
          typeof a.location.lng === "number" &&
          (a.location.lat !== 0 || a.location.lng !== 0)
      ),
    [apartments]
  );

  const bounds = useMemo<LatLngBoundsExpression | null>(() => {
    if (markers.length === 0) return null;
    if (markers.length === 1) {
      const { lat, lng } = markers[0].location;
      return [
        [lat - 0.01, lng - 0.01],
        [lat + 0.01, lng + 0.01],
      ];
    }
    const lats = markers.map((a) => a.location.lat);
    const lngs = markers.map((a) => a.location.lng);
    const pad = 0.01;
    return [
      [Math.min(...lats) - pad, Math.min(...lngs) - pad],
      [Math.max(...lats) + pad, Math.max(...lngs) + pad],
    ];
  }, [markers]);

  if (markers.length === 0 || !bounds) return null;

  return (
    <div className="mt-6 overflow-hidden rounded-2xl border border-gray-200 shadow-sm">
      <MapContainer
        bounds={bounds}
        scrollWheelZoom={false}
        style={{ height: "300px", width: "100%" }}
        className="z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {markers.map((apt) => (
          <Marker
            key={apt.id}
            position={[apt.location.lat, apt.location.lng]}
            icon={defaultIcon}
          >
            <Popup>
              <Link
                to={`/${tenantSlug}/${apt.slug}?${searchParams.toString()}`}
                className="font-medium text-indigo-600 hover:text-indigo-700"
              >
                {apt.name}
              </Link>
              {apt.location.address && (
                <p className="mt-1 text-xs text-gray-500">
                  {apt.location.address}
                </p>
              )}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
