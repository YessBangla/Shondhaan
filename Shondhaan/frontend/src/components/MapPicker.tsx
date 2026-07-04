import { useState, useEffect, useCallback } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Loader2 } from "lucide-react";

const markerIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface MapPickerProps {
  onLocationSelect: (city: string, area: string) => void;
  onLoading?: (loading: boolean) => void;
}

const ClickHandler = ({ onClick }: { onClick: (lat: number, lng: number) => void }) => {
  useMapEvents({
    click(e) {
      onClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
};

const AutoLocate = ({ onLocate }: { onLocate: (lat: number, lng: number) => void }) => {
  const map = useMap();

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        map.flyTo([latitude, longitude], 14, { duration: 1.2 });
        onLocate(latitude, longitude);
      },
      () => {
        // GPS denied — stay at default
      },
      { timeout: 5000 }
    );
  }, [map, onLocate]);

  return null;
};

const MapPicker = ({ onLocationSelect, onLoading }: MapPickerProps) => {
  const [position, setPosition] = useState<[number, number]>([23.8103, 90.4125]);
  const [resolving, setResolving] = useState(false);

  const reverseGeocode = useCallback(
    async (lat: number, lng: number) => {
      setResolving(true);
      onLoading?.(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=bn&zoom=16`
        );
        const data = await res.json();
        const city =
          data.address?.city ||
          data.address?.town ||
          data.address?.county ||
          data.address?.state_district ||
          "ঢাকা";
        const area =
          data.address?.suburb ||
          data.address?.neighbourhood ||
          data.address?.road ||
          data.address?.village ||
          "";
        onLocationSelect(city, area);
      } catch {
        // keep current
      }
      setResolving(false);
      onLoading?.(false);
    },
    [onLocationSelect, onLoading]
  );

  const handleClick = useCallback(
    (lat: number, lng: number) => {
      setPosition([lat, lng]);
      reverseGeocode(lat, lng);
    },
    [reverseGeocode]
  );

  const handleAutoLocate = useCallback(
    (lat: number, lng: number) => {
      setPosition([lat, lng]);
    },
    []
  );

  return (
    <div className="relative w-full h-[220px] rounded-xl overflow-hidden border border-border">
      <MapContainer
        center={position}
        zoom={7}
        scrollWheelZoom={true}
        className="h-full w-full z-0"
        attributionControl={false}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <Marker position={position} icon={markerIcon} />
        <ClickHandler onClick={handleClick} />
        <AutoLocate onLocate={handleAutoLocate} />
      </MapContainer>

      {resolving && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/60 backdrop-blur-sm">
          <div className="flex items-center gap-2 rounded-lg bg-background px-3 py-2 shadow-md border border-border">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span className="text-xs text-muted-foreground">লোকেশন খোঁজা হচ্ছে...</span>
          </div>
        </div>
      )}

      <div className="absolute bottom-2 left-2 z-10 rounded-md bg-background/90 px-2 py-1 text-[10px] text-muted-foreground shadow-sm border border-border">
        ম্যাপে ট্যাপ করে লোকেশন সিলেক্ট করুন
      </div>
    </div>
  );
};

export default MapPicker;
