import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import LocationPermissionModal from "@/components/LocationPermissionModal";

interface LocationContextType {
  selectedCity: string;
  setSelectedCity: (city: string) => void;
  subArea: string;
  setSubArea: (area: string) => void;
  detecting: boolean;
  selectedCityEn: string;
  setSelectedCityEn: (city: string) => void;
  subAreaEn: string;
  setSubAreaEn: (area: string) => void;
}

const LocationContext = createContext<LocationContextType>({
  selectedCity: "ঢাকা",
  setSelectedCity: () => {},
  subArea: "",
  setSubArea: () => {},
  detecting: false,
  selectedCityEn: "Dhaka",
  setSelectedCityEn: () => {},
  subAreaEn: "",
  setSubAreaEn: () => {},
});

const LOCATION_ASKED_KEY = "location_permission_asked";

export const LocationProvider = ({ children }: { children: ReactNode }) => {
  const [selectedCity, setSelectedCity] = useState("ঢাকা");
  const [subArea, setSubArea] = useState("");
  const [selectedCityEn, setSelectedCityEn] = useState("Dhaka");
  const [subAreaEn, setSubAreaEn] = useState("");
  const [detecting, setDetecting] = useState(false);
  const [showModal, setShowModal] = useState(() => {
    if (!navigator.geolocation) return false;
    return !localStorage.getItem(LOCATION_ASKED_KEY);
  });

  const detectLocation = useCallback(() => {
    if (!navigator.geolocation) return;
    setDetecting(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          // Fetch both Bangla and English in parallel
          const [resBn, resEn] = await Promise.all([
            fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=bn&zoom=16`),
            fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=en&zoom=16`),
          ]);
          const [dataBn, dataEn] = await Promise.all([resBn.json(), resEn.json()]);

          const extractCity = (addr: any) =>
            addr?.city || addr?.town || addr?.county || addr?.state_district || "";
          const extractArea = (addr: any) =>
            addr?.suburb || addr?.neighbourhood || addr?.road || addr?.village || "";

          setSelectedCity(extractCity(dataBn.address) || "ঢাকা");
          setSubArea(extractArea(dataBn.address));
          setSelectedCityEn(extractCity(dataEn.address) || "Dhaka");
          setSubAreaEn(extractArea(dataEn.address));
        } catch {
          // keep defaults
        }
        setDetecting(false);
      },
      () => {
        setDetecting(false);
      },
      { timeout: 5000 }
    );
  }, []);

  const handleAllow = () => {
    localStorage.setItem(LOCATION_ASKED_KEY, "true");
    setShowModal(false);
    detectLocation();
  };

  const handleSkip = () => {
    localStorage.setItem(LOCATION_ASKED_KEY, "true");
    setShowModal(false);
  };

  return (
    <LocationContext.Provider value={{ selectedCity, setSelectedCity, subArea, setSubArea, detecting, selectedCityEn, setSelectedCityEn, subAreaEn, setSubAreaEn }}>
      <LocationPermissionModal open={showModal} onAllow={handleAllow} onSkip={handleSkip} />
      {children}
    </LocationContext.Provider>
  );
};

export const useLocation = () => useContext(LocationContext);
