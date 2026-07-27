import { useState, useEffect } from "react";
import { MapPin, Loader2, X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/contexts/LanguageContext";
import { divisions as locationData } from "@/data/locations";
import { toast } from "sonner";

interface DealLocationSelectorProps {
  value: { division: string; district: string; thana: string };
  onChange: (val: { division: string; district: string; thana: string }) => void;
}

const DealLocationSelector = ({ value, onChange }: DealLocationSelectorProps) => {
  const { language } = useLanguage();
  const bn = language === "bn";

  const [locating, setLocating] = useState(false);
  const [detailArea, setDetailArea] = useState("");

  //  NEW: search state
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  //  Location logic (unchanged)
  const selectedDivision = locationData.find(
    (d) => d.nameBn === value.division
  );
  const districtList = selectedDivision?.districts || [];

  const selectedDistrict = districtList.find(
    (d) => d.nameBn === value.district
  );
  const thanaList = selectedDistrict?.thanas || [];

  const handleDivisionChange = (v: string) => {
    onChange({ division: v, district: "", thana: "" });
  };

  const handleDistrictChange = (v: string) => {
    onChange({ ...value, district: v, thana: "" });
  };

  const handleThanaChange = (v: string) => {
    onChange({ ...value, thana: v });
  };

  const handleClear = () => {
    onChange({ division: "", district: "", thana: "" });
    setDetailArea("");
    setSearch("");
    setResults([]);
  };

  // API FETCH FUNCTION
  const fetchListings = async (query: string) => {
    try {
      setLoading(true);

      const res = await fetch(
        `http://localhost:4000/api/deal/listings?search=${query}`
      );

      const data = await res.json();

      if (data.success) {
        setResults(data.data);
      } else {
        setResults([]);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch listings");
    } finally {
      setLoading(false);
    }
  };

  // Debounced search
  useEffect(() => {
    const delay = setTimeout(() => {
      if (search.trim()) {
        fetchListings(search);
      } else {
        setResults([]);
      }
    }, 400);

    return () => clearTimeout(delay);
  }, [search]);

  return (
    <div className="space-y-4">
      {/* 🔍 SEARCH INPUT */}
      <div className="relative">
        <Input
          placeholder={bn ? "খুঁজুন..." : "Search deals..."}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {loading && (
          <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin" />
        )}

        {search && (
          <button
            onClick={() => {
              setSearch("");
              setResults([]);
            }}
            className="absolute right-3 top-2.5"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* 🔽 SEARCH RESULTS */}
      {results.length > 0 && (
        <div className="border rounded-lg max-h-60 overflow-auto">
          {results.map((item) => (
            <div
              key={item.id}
              className="p-3 border-b last:border-b-0 hover:bg-gray-50 cursor-pointer"
            >
              <p className="font-medium">
                {bn ? item.title : item.title_en}
              </p>
              <p className="text-sm text-gray-500">
                {item.location_district}, {item.location_area}
              </p>
              <p className="text-sm font-semibold">৳ {item.price}</p>
            </div>
          ))}
        </div>
      )}
      {/* 📍 LOCATION SELECTORS */}
      <div className="grid grid-cols-1 gap-3">
        {/* Division */}
        <Select value={value.division} onValueChange={handleDivisionChange}>
          <SelectTrigger>
            <SelectValue placeholder={bn ? "বিভাগ নির্বাচন করুন" : "Select Division"} />
          </SelectTrigger>
          <SelectContent>
            {locationData.map((d) => (
              <SelectItem key={d.nameBn} value={d.nameBn}>
                {bn ? d.nameBn : d.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* District */}
        <Select value={value.district} onValueChange={handleDistrictChange}>
          <SelectTrigger>
            <SelectValue placeholder={bn ? "জেলা নির্বাচন করুন" : "Select District"} />
          </SelectTrigger>
          <SelectContent>
            {districtList.map((d) => (
              <SelectItem key={d.nameBn} value={d.nameBn}>
                {bn ? d.nameBn : d.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Thana */}
        <Select value={value.thana} onValueChange={handleThanaChange}>
          <SelectTrigger>
            <SelectValue placeholder={bn ? "এলাকা নির্বাচন করুন" : "Select Area"} />
          </SelectTrigger>
          <SelectContent>
            {thanaList.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 🧹 CLEAR BUTTON */}
      <button
        onClick={handleClear}
        className="text-sm text-red-500 flex items-center gap-1"
      >
        <X size={14} /> {bn ? "মুছুন" : "Clear"}
      </button>
    </div>
  );
};

export default DealLocationSelector;