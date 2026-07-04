import { useState } from "react";
import { MapPin, Navigation, ChevronRight, Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { divisions } from "@/data/locations";
import { toast } from "sonner";

interface LocationPickerProps {
  division: string;
  district: string;
  thana: string;
  detailArea: string;
  onDivisionChange: (v: string) => void;
  onDistrictChange: (v: string) => void;
  onThanaChange: (v: string) => void;
  onDetailAreaChange: (v: string) => void;
  bn?: boolean;
  compact?: boolean;
  showGps?: boolean;
}

const LocationPicker = ({
  division, district, thana, detailArea,
  onDivisionChange, onDistrictChange, onThanaChange, onDetailAreaChange,
  bn = true, compact = false, showGps = true,
}: LocationPickerProps) => {
  const [locating, setLocating] = useState(false);

  const selectedDivision = divisions.find(d => d.nameBn === division || d.name === division);
  const districtList = selectedDivision?.districts || [];
  const selectedDistrict = districtList.find(d => d.nameBn === district || d.name === district);
  const thanaList = selectedDistrict?.thanas || [];

  const handleDivisionChange = (v: string) => {
    onDivisionChange(v);
    onDistrictChange("");
    onThanaChange("");
  };

  const handleDistrictChange = (v: string) => {
    onDistrictChange(v);
    onThanaChange("");
  };

  const detectGps = async () => {
    if (!navigator.geolocation) {
      toast.error(bn ? "আপনার ব্রাউজারে GPS সাপোর্ট নেই" : "GPS not supported");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json&accept-language=bn&zoom=16`
          );
          const data = await res.json();
          const state = data.address?.state || "";
          const city = data.address?.city || data.address?.town || data.address?.county || data.address?.state_district || "";
          const area = data.address?.suburb || data.address?.neighbourhood || data.address?.road || data.address?.village || "";

          const matchDiv = divisions.find(d =>
            state.includes(d.nameBn) || state.toLowerCase().includes(d.name.toLowerCase())
          );
          if (matchDiv) {
            onDivisionChange(matchDiv.nameBn);
            const matchDist = matchDiv.districts.find(d =>
              city.includes(d.nameBn) || city.toLowerCase().includes(d.name.toLowerCase())
            );
            if (matchDist) {
              onDistrictChange(matchDist.nameBn);
              if (matchDist.thanas && area) {
                const matchThana = matchDist.thanas.find(t =>
                  area.includes(t) || t.includes(area)
                );
                if (matchThana) onThanaChange(matchThana);
              }
            }
          }
          
          const detailParts = [
            data.address?.road || "",
            data.address?.neighbourhood || "",
          ].filter(Boolean).join(", ");
          if (detailParts) onDetailAreaChange(detailParts);
          
          toast.success(bn ? "লোকেশন পাওয়া গেছে" : "Location detected");
        } catch {
          toast.error(bn ? "লোকেশন পাওয়া যায়নি" : "Could not detect location");
        }
        setLocating(false);
      },
      () => {
        toast.error(bn ? "লোকেশন অ্যাক্সেস দিন" : "Allow location access");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const done = (v: string) => !!v;

  return (
    <div className="space-y-1.5">
      {/* GPS Auto-detect */}
      {showGps && (
        <button
          type="button"
          disabled={locating}
          onClick={detectGps}
          className="w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 px-3 py-2.5 text-xs font-medium text-primary transition-all hover:bg-primary/10 hover:border-primary/50 active:scale-[0.98] disabled:opacity-60"
        >
          {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Navigation className="h-4 w-4" />}
          {locating ? (bn ? "লোকেশন খুঁজছে..." : "Detecting...") : (bn ? "📍 স্বয়ংক্রিয় লোকেশন সনাক্ত করুন" : "📍 Auto-detect Location")}
        </button>
      )}

      {/* Cascading selects card */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {/* Division */}
        <div className="flex items-center gap-2 px-3 py-0.5 border-b border-border/50">
          <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${done(division) ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>১</span>
          <Select value={division} onValueChange={handleDivisionChange}>
            <SelectTrigger className="border-0 shadow-none px-0 h-9 text-xs font-medium focus:ring-0 bg-transparent">
              <SelectValue placeholder={bn ? "বিভাগ নির্বাচন করুন" : "Select Division"} />
            </SelectTrigger>
            <SelectContent className="max-h-[200px]">
              {divisions.map(d => (
                <SelectItem key={d.name} value={d.nameBn} className="text-xs">
                  <span className="font-medium">{d.nameBn}</span>
                  <span className="text-muted-foreground ml-1.5">({d.name})</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {done(division) && <ChevronRight className="h-3.5 w-3.5 text-primary shrink-0" />}
        </div>

        {/* District */}
        <div className={`flex items-center gap-2 px-3 py-0.5 border-b border-border/50 transition-opacity ${division ? "opacity-100" : "opacity-40 pointer-events-none"}`}>
          <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${done(district) ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>২</span>
          <Select value={district} onValueChange={handleDistrictChange} disabled={!division}>
            <SelectTrigger className="border-0 shadow-none px-0 h-9 text-xs font-medium focus:ring-0 bg-transparent">
              <SelectValue placeholder={bn ? "জেলা নির্বাচন করুন" : "Select District"} />
            </SelectTrigger>
            <SelectContent className="max-h-[200px]">
              {districtList.map(d => (
                <SelectItem key={d.name} value={d.nameBn} className="text-xs">
                  <span className="font-medium">{d.nameBn}</span>
                  <span className="text-muted-foreground ml-1.5">({d.name})</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {done(district) && <ChevronRight className="h-3.5 w-3.5 text-primary shrink-0" />}
        </div>

        {/* Thana */}
        {thanaList.length > 0 && (
          <div className={`flex items-center gap-2 px-3 py-0.5 border-b border-border/50 transition-opacity ${district ? "opacity-100" : "opacity-40 pointer-events-none"}`}>
            <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${done(thana) ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>৩</span>
            <Select value={thana} onValueChange={onThanaChange} disabled={!district}>
              <SelectTrigger className="border-0 shadow-none px-0 h-9 text-xs font-medium focus:ring-0 bg-transparent">
                <SelectValue placeholder={bn ? "থানা/এলাকা নির্বাচন" : "Select Thana"} />
              </SelectTrigger>
              <SelectContent className="max-h-[200px]">
                {thanaList.map(t => (
                  <SelectItem key={t} value={t} className="text-xs font-medium">{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Detail address */}
        <div className="flex items-center gap-2 px-3 py-0.5">
          <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
          <Input
            placeholder={bn ? "বিস্তারিত ঠিকানা (রোড, বাড়ি)" : "Detail address"}
            value={detailArea}
            onChange={(e) => onDetailAreaChange(e.target.value)}
            className="border-0 shadow-none px-0 h-9 text-xs focus-visible:ring-0 bg-transparent"
            maxLength={200}
          />
        </div>
      </div>

      {/* Location summary chips */}
      {division && district && (
        <div className="flex flex-wrap gap-1 px-1">
          <span className="inline-flex items-center gap-0.5 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">📍 {division}</span>
          <span className="inline-flex items-center gap-0.5 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-foreground">🏙️ {district}</span>
          {thana && <span className="inline-flex items-center gap-0.5 rounded-full bg-accent px-2 py-0.5 text-[10px] font-medium text-accent-foreground">📌 {thana}</span>}
        </div>
      )}
    </div>
  );
};

export default LocationPicker;