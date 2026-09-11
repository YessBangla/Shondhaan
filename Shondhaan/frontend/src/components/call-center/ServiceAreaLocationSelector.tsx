import { useState } from "react";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { divisions as locationData, thanaEnMap } from "@/data/locations";

export interface ServiceAreaLocation {
  division: string;
  district: string;
  thana: string[];
  area: string;
}

interface ServiceAreaLocationSelectorProps {
  value: ServiceAreaLocation;
  onChange: (value: ServiceAreaLocation) => void;
}

interface SearchableLocationSelectProps {
  value: string | string[];
  options: { value: string; label: string; searchText?: string }[];
  placeholder: string;
  disabled?: boolean;
  multiple?: boolean;
  onChange: (value: string | string[]) => void;
  onClear: () => void;
}

const SearchableLocationSelect = ({
  value,
  options,
  placeholder,
  disabled = false,
  multiple = false,
  onChange,
  onClear,
}: SearchableLocationSelectProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const selectedValues = Array.isArray(value) ? value : value ? [value] : [];
  const selectedOptions = options.filter((option) => selectedValues.includes(option.value));
  const filteredOptions = options.filter((option) =>
    `${option.label} ${option.searchText || ""}`.toLowerCase().includes(search.trim().toLowerCase())
  );

  return (
    <div className="relative">
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        onClick={() => !disabled && setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (!disabled && (event.key === "Enter" || event.key === " ")) {
            event.preventDefault();
            setOpen((current) => !current);
          }
        }}
        className={`flex min-h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
      >
        {selectedOptions.length ? (
          <div className="flex min-w-0 flex-1 flex-wrap gap-1.5">
            {selectedOptions.map((option) => (
              <span key={option.value} className="inline-flex max-w-full items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-700">
                <span className="truncate">{option.label}</span>
                <button
                  type="button"
                  aria-label={`Remove ${option.label}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    onChange(multiple ? selectedValues.filter((item) => item !== option.value) : "");
                  }}
                  className="shrink-0 rounded-full text-slate-500 hover:text-slate-900"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        ) : (
          <span className="text-muted-foreground">{placeholder}</span>
        )}
        <span className="ml-2 shrink-0 text-muted-foreground">▾</span>
      </div>

      {open && !disabled && (
        <div className="absolute z-30 mt-1 w-full rounded-md border bg-white p-1 shadow-lg">
          <Input
            autoFocus
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onClick={(event) => event.stopPropagation()}
            placeholder="Search..."
            className="mb-1 h-9"
          />
          <div className="max-h-52 overflow-y-auto">
            {filteredOptions.length ? filteredOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onChange(multiple
                    ? (selectedValues.includes(option.value)
                      ? selectedValues.filter((item) => item !== option.value)
                      : [...selectedValues, option.value])
                    : option.value);
                  if (!multiple) setOpen(false);
                  setSearch("");
                }}
                className="block w-full rounded-sm px-2 py-2 text-left text-sm hover:bg-slate-50"
              >
                {option.label}
              </button>
            )) : (
              <p className="px-2 py-2 text-sm text-muted-foreground">No matching options</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const ServiceAreaLocationSelector = ({
  value,
  onChange,
}: ServiceAreaLocationSelectorProps) => {
  const { language } = useLanguage();
  const bn = language === "bn";
  const selectedDivision = locationData.find((division) => division.nameBn === value.division);
  const districtList = selectedDivision?.districts || [];
  const selectedDistrict = districtList.find((district) => district.nameBn === value.district);
  const thanaList = selectedDistrict?.thanas || [];

  return (
    <div className="flex flex-col gap-4">
      <div>
        <label className="mb-2 block text-sm font-medium text-foreground">
          {bn ? "বিভাগ" : "Division"}
        </label>
        <SearchableLocationSelect
          value={value.division}
          options={locationData.map((division) => ({ value: division.nameBn, label: bn ? division.nameBn : division.name }))}
          placeholder={bn ? "বিভাগ নির্বাচন করুন" : "Select Division"}
          onChange={(division) => onChange({ division: division as string, district: "", thana: [], area: "" })}
          onClear={() => onChange({ division: "", district: "", thana: [], area: "" })}
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-foreground">
          {bn ? "জেলা" : "District"}
        </label>
        <SearchableLocationSelect
          value={value.district}
          options={districtList.map((district) => ({ value: district.nameBn, label: bn ? district.nameBn : district.name }))}
          placeholder={bn ? "জেলা নির্বাচন করুন" : "Select District"}
          disabled={!value.division}
          onChange={(district) => onChange({ ...value, district: district as string, thana: [], area: "" })}
          onClear={() => onChange({ ...value, district: "", thana: [], area: "" })}
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-foreground">
          {bn ? "থানা / এলাকা" : "Thana / Area"}
        </label>
        <SearchableLocationSelect
          value={value.thana}
          options={thanaList.map((thana) => ({
            value: thana,
            label: thana,
            searchText: Object.entries(thanaEnMap)
              .filter(([, banglaName]) => banglaName === thana)
              .map(([englishName]) => englishName)
              .join(" "),
          }))}
          placeholder={bn ? "এলাকা নির্বাচন করুন" : "Select Area"}
          disabled={!value.district}
          multiple
          onChange={(thana) => onChange({ ...value, thana: thana as string[], area: "" })}
          onClear={() => onChange({ ...value, thana: [], area: "" })}
        />
      </div>

      <div>
        <label className="mb-2 block text-sm font-medium text-foreground">
          {bn ? "বিস্তারিত এলাকা" : "Specific Area"}
        </label>
        <Input
          value={value.area}
          onChange={(event) => onChange({ ...value, area: event.target.value })}
          placeholder={bn ? "বিস্তারিত এলাকার নাম লিখুন" : "Enter specific area"}
          disabled={!value.thana.length}
        />
      </div>
    </div>
  );
};

export default ServiceAreaLocationSelector;
