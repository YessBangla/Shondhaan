import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  CheckCircle,
  Loader2,
  MapPin,
  MessageCircle,
  Package,
  Phone,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Truck,
  XCircle,
  Check,
  ChevronsUpDown,
  Bell,
} from "lucide-react";

import NotificationBell from "@/components/NotificationBell";
import PanelSidebarTabs from "@/components/PanelSidebarTabs";
import DeliverymanKycForm from "@/components/mart/DeliverymanKycForm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { hasStaffRoleAccess } from "@/lib/roleAccess";
import { toast } from "sonner";

const API_BASE =
  import.meta.env.VITE_MART_API_BASE_URL ||
  import.meta.env.VITE_API_BASE ||
  "http://localhost:8081";

// ─── types ────────────────────────────────────────────────────────────────────
interface ApiDistrict {
  id: number;
  name: string;
  name_bn: string;
  thanas: string[];
}

interface ApiDivision {
  id: number;
  name: string;
  name_bn: string;
  districts: ApiDistrict[];
}

interface DistrictOption {
  divisionId: number;
  division: string;
  divisionEn: string;
  districtId: number;
  district: string;
  districtEn: string;
  thanas: string[];
}

interface DeliveryArea {
  id: number;
  user_id: number;
  district: string;
  thana?: string | null;
  area: string;
  created_at?: string;
  updated_at?: string;
}

interface DeliveryRequest {
  id: number;
  order_id: number;
  order_number: string;
  seller_id: number;
  deliveryman_user_id: number;
  status: "pending" | "accepted" | "declined" | "cancelled" | "delivered";
  customer_name: string;
  customer_phone: string;
  shipping_address: string;
  shipping_division?: string;
  shipping_district?: string;
  shipping_thana?: string;
  total: number;
  notes?: string;
  created_at: string;
  shop_name?: string;
  seller_name?: string;
  seller_mobile?: string;
  seller_avatar?: string;
}

interface Order {
  id: number;
  order_number: string;
  status: string;
  customer_name: string;
  customer_phone: string;
  shipping_address?: string;
  shipping_division?: string;
  shipping_district?: string;
  shipping_thana?: string;
  total: number;
  created_at: string;
  delivery_request_id: number;
}

const deliveryStatuses: Record<string, { label: string; color: string; icon: any }> = {
  confirmed:  { label: "Pickup ready", color: "bg-blue-50 text-blue-700 border border-blue-200",         icon: Package     },
  processing: { label: "Packing",      color: "bg-violet-50 text-violet-700 border border-violet-200",   icon: Package     },
  shipped:    { label: "In transit",   color: "bg-cyan-50 text-cyan-700 border border-cyan-200",          icon: Truck       },
  delivered:  { label: "Delivered",    color: "bg-emerald-50 text-emerald-700 border border-emerald-200", icon: CheckCircle },
  cancelled:  { label: "Cancelled",    color: "bg-red-50 text-red-700 border border-red-200",             icon: XCircle     },
};

// ─── helpers ──────────────────────────────────────────────────────────────────
const mapRequestToOrder = (r: any, mappedStatus: string): Order => ({
  id:                  r.order_id,
  order_number:        r.order_number,
  status:              mappedStatus,
  customer_name:       r.customer_name,
  customer_phone:      r.customer_phone,
  shipping_address:    r.shipping_address,
  shipping_division:   r.shipping_division,
  shipping_district:   r.shipping_district,
  shipping_thana:      r.shipping_thana,
  total:               r.total,
  created_at:          r.created_at,
  delivery_request_id: r.id,
});

/**
 * Deduplicate orders by delivery_request_id.
 * Priority: delivered > accepted/shipped > pending
 */
const mergeOrders = (
  pending: Order[],
  accepted: Order[],
  delivered: Order[],
): Order[] => {
  const map = new Map<number, Order>();
  for (const o of [...pending, ...accepted, ...delivered]) {
    map.set(o.delivery_request_id, o);
  }
  return Array.from(map.values());
};

// ─── component ────────────────────────────────────────────────────────────────
const MartDeliveryPanel = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const bn = language === "bn";

  // location data
  const [locationsLoading, setLocationsLoading] = useState(true);
  const [districtOptions, setDistrictOptions]   = useState<DistrictOption[]>([]);

  // delivery area form
  const [siteDistrict, setSiteDistrict]               = useState("");
  const [districtPickerOpen, setDistrictPickerOpen]   = useState(false);
  const [selectedSites, setSelectedSites]             = useState<string[]>([]);
  const [savingDeliveryAreas, setSavingDeliveryAreas] = useState(false);
  const [deliveryAreasLoading, setDeliveryAreasLoading] = useState(false);
  const [deliveryAreas, setDeliveryAreas]             = useState<DeliveryArea[]>([]);

  // access / orders
  const [hasAccess, setHasAccess]         = useState(false);
  const [loading, setLoading]             = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [orders, setOrders]               = useState<Order[]>([]);
  const [search, setSearch]               = useState("");

  // delivery requests (incoming from vendors)
  const [deliveryRequests, setDeliveryRequests]   = useState<DeliveryRequest[]>([]);
  const [requestsLoading, setRequestsLoading]     = useState(false);
  const [processingRequest, setProcessingRequest] = useState<Record<number, boolean>>({});

  // ── fetch locations ──────────────────────────────────────────────────────
  useEffect(() => {
    const fetchLocations = async () => {
      setLocationsLoading(true);
      try {
        const resp   = await fetch(`${API_BASE}/api/locations`);
        const result = await resp.json();
        if (!resp.ok || !result.success) throw new Error(result.message || "Failed");
        const divisions: ApiDivision[] = result.data || [];
        const flat: DistrictOption[] = divisions.flatMap((div) =>
          div.districts.map((dist) => ({
            divisionId: div.id,
            division:   div.name_bn,
            divisionEn: div.name,
            districtId: dist.id,
            district:   dist.name_bn,
            districtEn: dist.name,
            thanas:     dist.thanas || [],
          }))
        );
        setDistrictOptions(flat);
      } catch {
        toast.error("Failed to load location data");
      } finally {
        setLocationsLoading(false);
      }
    };
    fetchLocations();
  }, []);

  // ── derived values ───────────────────────────────────────────────────────
  const selectedSiteDistrict = useMemo(
    () => districtOptions.find((item) => item.districtEn === siteDistrict),
    [districtOptions, siteDistrict]
  );

  const districtLabel = selectedSiteDistrict
    ? (bn ? selectedSiteDistrict.district : selectedSiteDistrict.districtEn)
    : "";

  const deliverySiteOptions = useMemo(
    () => selectedSiteDistrict?.thanas || [],
    [selectedSiteDistrict]
  );

  const groupedDeliveryAreas = useMemo(
    () =>
      deliveryAreas.reduce<Record<string, DeliveryArea[]>>((groups, item) => {
        if (!groups[item.district]) groups[item.district] = [];
        groups[item.district].push(item);
        return groups;
      }, {}),
    [deliveryAreas]
  );

  // ── auth guard ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!authLoading && !user) navigate("/main-login", { replace: true });
  }, [user, authLoading, navigate]);

  // ── role check ───────────────────────────────────────────────────────────
  const checkRole = useCallback(async () => {
    if (!user) return;
    setHasAccess(await hasStaffRoleAccess(user.id, ["mart_delivery"]));
    setLoading(false);
  }, [user]);

  // ── fetch orders ─────────────────────────────────────────────────────────
  // delivery_requests.status mapping:
  //   pending   → UI "confirmed"  → Pickup tab
  //   accepted  → UI "shipped"    → In Transit tab
  //   delivered → UI "delivered"  → Done tab
  const fetchOrders = useCallback(async () => {
    const userId = Number(user?.id);
    if (!Number.isInteger(userId)) return;
    setOrdersLoading(true);
    try {
      const [pendingResp, acceptedResp, deliveredResp] = await Promise.all([
        fetch(`${API_BASE}/api/delivery-requests?deliveryman_user_id=${userId}&status=pending`),
        fetch(`${API_BASE}/api/delivery-requests?deliveryman_user_id=${userId}&status=accepted`),
        fetch(`${API_BASE}/api/delivery-requests?deliveryman_user_id=${userId}&status=delivered`),
      ]);

      const pendingResult   = await pendingResp.json().catch(() => ({}));
      const acceptedResult  = await acceptedResp.json().catch(() => ({}));
      const deliveredResult = await deliveredResp.json().catch(() => ({}));

      const pendingOrders   = (pendingResult.data  || []).map((r: any) => mapRequestToOrder(r, "confirmed"));
      const acceptedOrders  = (acceptedResult.data || []).map((r: any) => mapRequestToOrder(r, "shipped"));
      const deliveredOrders = (deliveredResult.data || []).map((r: any) => mapRequestToOrder(r, "delivered"));

      setOrders(mergeOrders(pendingOrders, acceptedOrders, deliveredOrders));
    } catch {
      toast.error("Order load failed");
    } finally {
      setOrdersLoading(false);
    }
  }, [user?.id]);

  // ── fetch delivery areas ─────────────────────────────────────────────────
  const fetchDeliveryAreas = useCallback(async () => {
    const userId = Number(user?.id);
    if (!Number.isInteger(userId)) { setDeliveryAreas([]); return; }
    setDeliveryAreasLoading(true);
    try {
      const resp   = await fetch(`${API_BASE}/api/delivery-areas?user_id=${encodeURIComponent(userId)}`);
      const result = await resp.json().catch(() => ({}));
      if (!resp.ok || result.success === false)
        throw new Error(result.message || "Failed to load delivery areas");
      setDeliveryAreas(Array.isArray(result.data) ? result.data : []);
    } catch (err: any) {
      toast.error(err.message || "Failed to load delivery areas");
    } finally {
      setDeliveryAreasLoading(false);
    }
  }, [user?.id]);

  // ── fetch pending delivery requests (banner) ─────────────────────────────
  const fetchDeliveryRequests = useCallback(async () => {
    const userId = Number(user?.id);
    if (!Number.isInteger(userId)) return;
    setRequestsLoading(true);
    try {
      const resp   = await fetch(
        `${API_BASE}/api/delivery-requests?deliveryman_user_id=${userId}&status=pending`
      );
      const result = await resp.json().catch(() => ({}));
      if (!resp.ok || result.success === false)
        throw new Error(result.message || "Failed to load requests");
      setDeliveryRequests(Array.isArray(result.data) ? result.data : []);
    } catch (err: any) {
      toast.error(err.message || "Failed to load delivery requests");
    } finally {
      setRequestsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { checkRole(); }, [checkRole]);
  useEffect(() => {
    if (hasAccess) {
      fetchOrders();
      fetchDeliveryAreas();
      fetchDeliveryRequests();
    }
  }, [hasAccess, fetchOrders, fetchDeliveryAreas, fetchDeliveryRequests]);

  // ── accept / decline incoming request ────────────────────────────────────
  const handleRequestAction = async (requestId: number, action: "accepted" | "declined") => {
    setProcessingRequest(prev => ({ ...prev, [requestId]: true }));
    try {
      const req = deliveryRequests.find(r => r.id === requestId);

      const resp = await fetch(`${API_BASE}/api/delivery-requests/${requestId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: action }),
      });
      const result = await resp.json();
      if (!result.success) throw new Error(result.message);

      if (action === "accepted" && req) {
        const newOrder = mapRequestToOrder(req, "shipped");
        setOrders(prev => {
          const exists = prev.find(o => o.delivery_request_id === req.id);
          if (exists) {
            return prev.map(o =>
              o.delivery_request_id === req.id ? { ...o, status: "shipped" } : o
            );
          }
          return [newOrder, ...prev];
        });
        toast.success("Request accepted — moved to In Transit");
      } else {
        toast.success("Request declined");
      }

      setDeliveryRequests(prev => prev.filter(r => r.id !== requestId));
      if (action === "accepted") fetchOrders();

    } catch (err: any) {
      toast.error(err.message || `Failed to ${action} request`);
    } finally {
      setProcessingRequest(prev => ({ ...prev, [requestId]: false }));
    }
  };

  // ── delivery area handlers ───────────────────────────────────────────────
  const toggleDeliverySite = (site: string, checked: boolean) => {
    setSelectedSites(prev =>
      checked ? [...prev, site] : prev.filter(s => s !== site)
    );
  };

  const handleAddDeliverySites = async (e: React.FormEvent) => {
    e.preventDefault();
    const userId = Number(user?.id);
    if (!Number.isInteger(userId)) {
      toast.error("Please login with a mart backend account to save delivery areas");
      return;
    }
    if (!selectedSiteDistrict || selectedSites.length === 0) {
      toast.error("Please select a district and at least one area");
      return;
    }
    setSavingDeliveryAreas(true);
    try {
      const resp = await fetch(`${API_BASE}/api/delivery-areas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id:     userId,
          district:    selectedSiteDistrict.district,
          district_en: selectedSiteDistrict.districtEn,
          thanas:      selectedSites,
        }),
      });
      const result = await resp.json().catch(() => ({}));
      if (!resp.ok || result.success === false)
        throw new Error(result.message || "Failed to add delivery sites");
      toast.success("Delivery sites added");
      setSiteDistrict("");
      setSelectedSites([]);
      await fetchDeliveryAreas();
    } catch (err: any) {
      toast.error(err.message || "Failed to add delivery sites");
    } finally {
      setSavingDeliveryAreas(false);
    }
  };

  // ── update order status ──────────────────────────────────────────────────
  // Picked Up  : orders → "shipped",   delivery_requests stays "accepted"
  // Delivered  : orders → "delivered", delivery_requests → "delivered"
  //
  // The Done tab queries delivery_requests where status="delivered",
  // so we MUST update delivery_requests to "delivered" for it to appear there.
  const updateStatus = async (
    deliveryRequestId: number,
    newStatus: string,
  ) => {
    // 1. Optimistic UI — card moves instantly
    setOrders(prev =>
      prev.map(o =>
        o.delivery_request_id === deliveryRequestId ? { ...o, status: newStatus } : o
      )
    );

    try {
      // 2. Update delivery request status. Backend also syncs orders.order_status.
      //    "shipped"   (Picked Up)  → delivery_requests = "accepted"
      //    "delivered" (Delivered)  → delivery_requests = "delivered"
      //    This ensures fetchOrders finds the record under the correct status bucket.
      const drStatus = newStatus === "delivered" ? "delivered" : "accepted";
      const drResp = await fetch(`${API_BASE}/api/delivery-requests/${deliveryRequestId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: drStatus }),
      });
      const drResult = await drResp.json();
      if (!drResult.success) throw new Error(drResult.message);

      toast.success(
        newStatus === "delivered" ? "Order delivered! 🎉" : "Status updated"
      );

      // 4. Brief pause for DB commit, then re-fetch all tabs
      await new Promise(r => setTimeout(r, 400));
      await fetchOrders();
      return true;

    } catch (err: any) {
      toast.error(err?.message || "Update failed");
      await fetchOrders(); // revert optimistic update
      return false;
    }
  };

  // ── loading / access guards ──────────────────────────────────────────────
  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg">
            <Truck className="h-6 w-6 text-white" />
          </div>
          <Loader2 className="h-5 w-5 animate-spin text-emerald-500" />
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6">
        <Truck className="h-12 w-12 text-slate-300" />
        <h2 className="text-xl font-bold text-slate-800">Access Denied</h2>
        <p className="text-sm text-slate-500 text-center">Delivery access required.</p>
        <Button onClick={() => navigate("/")}>Go Home</Button>
      </div>
    );
  }

  // ── derived order lists ──────────────────────────────────────────────────
  const pendingPickup = orders.filter(o => o.status === "confirmed" || o.status === "processing");
  const inDelivery    = orders.filter(o => o.status === "shipped");
  const completed     = orders.filter(o => o.status === "delivered");

  const sidebarItems = [
    {
      value: "pending",
      label: `Pickup (${pendingPickup.length})${deliveryRequests.length > 0 ? ` • ${deliveryRequests.length} new` : ""}`,
      icon: <Package />,
      group: "Delivery",
    },
    { value: "delivery",      label: `In Transit (${inDelivery.length})`, icon: <Truck />       },
    { value: "completed",     label: `Done (${completed.length})`,         icon: <CheckCircle /> },
    { value: "delivery_area", label: "Delivery Area",                      icon: <MapPin />      },
    { value: "kyc",           label: "KYC Verification",                   icon: <ShieldCheck /> },
  ];

  const getFilteredOrders = (tab: string) => {
    const base =
      tab === "pending"   ? pendingPickup :
      tab === "delivery"  ? inDelivery    :
      tab === "completed" ? completed     : [];
    const q = search.toLowerCase();
    return base.filter(o => {
      if (!search) return true;
      return (
        (o.customer_name  || "").toLowerCase().includes(q) ||
        (o.order_number   || "").toLowerCase().includes(q) ||
        (o.customer_phone || "").includes(q)
      );
    });
  };

  // ── render ───────────────────────────────────────────────────────────────
  return (
    <PanelSidebarTabs
      items={sidebarItems}
      defaultValue="pending"
      panelTitle="Delivery Menu"
      panelIcon={<Truck className="h-5 w-5" />}
      offsetForDesktopMegaMenu
    >
      {(activeTab) => {
        if (activeTab === "kyc") {
          return <DeliverymanKycForm />;
        }

        // ── delivery area tab ────────────────────────────────────────────
        if (activeTab === "delivery_area") {
          return (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-5 mt-9"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h1 className="text-xl font-bold text-slate-800">Delivery Area</h1>
                  <p className="text-sm text-slate-400">Add supported delivery locations</p>
                </div>
                <NotificationBell />
              </div>

              {/* add area form */}
              <form
                onSubmit={handleAddDeliverySites}
                className="max-w-4xl rounded-2xl bg-white border border-slate-100 p-5 shadow-sm space-y-4"
              >
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
                  <div className="space-y-1.5 md:w-72">
                    <label className="text-xs font-semibold text-slate-500">District</label>
                    <Popover open={districtPickerOpen} onOpenChange={setDistrictPickerOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          type="button" variant="outline" role="combobox"
                          aria-expanded={districtPickerOpen}
                          className="h-9 w-full justify-between rounded-xl border-slate-200 bg-slate-50 px-3 text-sm font-normal text-slate-700 hover:bg-slate-50"
                        >
                          <span className="truncate">
                            {locationsLoading ? "Loading..." : districtLabel || "Select district"}
                          </span>
                          {locationsLoading
                            ? <Loader2 className="ml-2 h-3.5 w-3.5 animate-spin text-slate-400" />
                            : <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 text-slate-400" />}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent align="start" className="w-[min(22rem,calc(100vw-2rem))] p-0">
                        <Command>
                          <CommandInput placeholder="Search district..." />
                          <CommandList>
                            <CommandEmpty>No district found</CommandEmpty>
                            <CommandGroup>
                              {districtOptions.map((item) => {
                                const label    = bn ? item.district : item.districtEn;
                                const meta     = bn ? item.division : item.divisionEn;
                                const selected = siteDistrict === item.districtEn;
                                return (
                                  <CommandItem
                                    key={`${item.divisionEn}-${item.districtEn}`}
                                    value={`${item.district} ${item.districtEn} ${item.division} ${item.divisionEn}`}
                                    onSelect={() => {
                                      setSiteDistrict(item.districtEn);
                                      setSelectedSites([]);
                                      setDistrictPickerOpen(false);
                                    }}
                                  >
                                    <Check className={`mr-2 h-4 w-4 ${selected ? "opacity-100" : "opacity-0"}`} />
                                    <span className="flex-1">{label}</span>
                                    <span className="text-xs text-slate-400">{meta}</span>
                                  </CommandItem>
                                );
                              })}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                  <Button
                    type="submit"
                    disabled={!siteDistrict || selectedSites.length === 0 || savingDeliveryAreas}
                    className="h-9 gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:opacity-90 text-white rounded-xl border-0 shadow-sm text-sm"
                  >
                    {savingDeliveryAreas
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : <Plus className="h-4 w-4" />}
                    Add Areas
                  </Button>
                </div>

                {siteDistrict ? (
                  <>
                    <p className="text-xs font-semibold text-slate-500">Area / Thana</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2">
                      {deliverySiteOptions.map((site) => (
                        <label
                          key={site}
                          className="flex items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 hover:border-emerald-200 hover:bg-emerald-50/40 transition-colors cursor-pointer"
                        >
                          <Checkbox
                            checked={selectedSites.includes(site)}
                            onCheckedChange={(checked) =>
                              toggleDeliverySite(site, checked === true)
                            }
                          />
                          <span className="truncate">{site}</span>
                        </label>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-400">
                    {locationsLoading ? "Loading districts..." : "Select a district to choose areas"}
                  </div>
                )}
              </form>

              {/* saved delivery areas */}
              <div className="max-w-4xl rounded-2xl bg-white border border-slate-100 p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-bold text-slate-800">Saved Delivery Areas</h2>
                    <p className="text-xs text-slate-400">Areas already available for delivery</p>
                  </div>
                  <Button
                    type="button" variant="outline" size="sm"
                    className="h-8 gap-1.5 rounded-xl border-slate-200"
                    onClick={fetchDeliveryAreas}
                    disabled={deliveryAreasLoading}
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${deliveryAreasLoading ? "animate-spin" : ""}`} />
                    Refresh
                  </Button>
                </div>

                {deliveryAreasLoading ? (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto text-emerald-500 mb-2" />
                    <p className="text-sm text-slate-400">Loading delivery areas...</p>
                  </div>
                ) : deliveryAreas.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
                    <MapPin className="h-6 w-6 mx-auto text-slate-300 mb-2" />
                    <p className="text-sm text-slate-400">No delivery areas added yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {Object.entries(groupedDeliveryAreas).map(([districtName, areas]) => (
                      <div key={districtName} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                        <div className="flex items-center justify-between gap-3 mb-2">
                          <p className="text-sm font-bold text-slate-800">{districtName}</p>
                          <Badge className="rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
                            {areas.length} Areas
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {areas.map((item) => (
                            <span
                              key={item.id}
                              className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600"
                            >
                              {item.thana || item.area}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          );
        }

        // ── orders tabs (pending / delivery / completed) ──────────────────
        const filteredOrders = getFilteredOrders(activeTab);

        return (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4 mt-9"
          >
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div>
                <h1 className="text-xl font-bold text-slate-800">Delivery Panel</h1>
                <p className="text-sm text-slate-400">Manage pickups and deliveries</p>
              </div>
              <div className="flex items-center gap-2">
                <NotificationBell />
                <Button
                  variant="outline" size="sm"
                  className="h-9 gap-1.5 rounded-xl border-slate-200"
                  onClick={() => navigate("/internal")}
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  Chat
                </Button>
              </div>
            </div>

            {/* stats */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Pickup",     value: pendingPickup.length, color: "text-amber-600",   bg: "bg-amber-50",   icon: Package     },
                { label: "In Transit", value: inDelivery.length,    color: "text-cyan-600",    bg: "bg-cyan-50",    icon: Truck       },
                { label: "Done",       value: completed.length,     color: "text-emerald-600", bg: "bg-emerald-50", icon: CheckCircle },
              ].map((stat) => (
                <div key={stat.label} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                  <div className={`w-9 h-9 rounded-xl ${stat.bg} flex items-center justify-center mb-2`}>
                    <stat.icon className={`h-4 w-4 ${stat.color}`} />
                  </div>
                  <p className="text-xl font-bold text-slate-800">{stat.value}</p>
                  <p className="text-xs text-slate-400 mt-1">{stat.label}</p>
                </div>
              ))}
            </div>

            {/* search + refresh */}
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <Input
                  placeholder="Order no / name / phone..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 h-9 rounded-xl border-slate-200 bg-white text-sm"
                />
              </div>
              <Button
                variant="outline" size="sm"
                className="h-9 gap-1.5 rounded-xl border-slate-200 shrink-0"
                onClick={() => { fetchOrders(); fetchDeliveryRequests(); }}
                disabled={ordersLoading}
              >
                <RefreshCw className={`h-3.5 w-3.5 ${ordersLoading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>

            {/* incoming delivery requests banner — only on Pickup tab */}
            {activeTab === "pending" && (
              <>
                {requestsLoading ? (
                  <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-amber-600" />
                    <p className="text-sm text-amber-700">Loading incoming requests...</p>
                  </div>
                ) : deliveryRequests.length > 0 ? (
                  <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center">
                          <Bell className="h-3.5 w-3.5 text-amber-600" />
                        </div>
                        <p className="text-sm font-bold text-amber-800">
                          Incoming Pickup Requests ({deliveryRequests.length})
                        </p>
                      </div>
                      <Button
                        variant="ghost" size="sm"
                        className="h-7 text-xs text-amber-700 hover:bg-amber-100 rounded-lg"
                        onClick={fetchDeliveryRequests}
                        disabled={requestsLoading}
                      >
                        <RefreshCw className="h-3 w-3 mr-1" /> Refresh
                      </Button>
                    </div>

                    {deliveryRequests.map((req) => {
                      const isProcessing = !!processingRequest[req.id];
                      return (
                        <div
                          key={req.id}
                          className="rounded-xl bg-white border border-amber-100 p-3 shadow-sm"
                        >
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <span className="text-sm font-bold text-slate-800 font-mono">
                                  {req.order_number}
                                </span>
                                {req.shop_name && (
                                  <span className="text-[11px] bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded-full font-medium">
                                    {req.shop_name}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-600 font-medium">{req.customer_name}</p>
                              {req.customer_phone && (
                                <a
                                  href={`tel:${req.customer_phone}`}
                                  className="inline-flex items-center gap-1 text-xs text-slate-400 mt-0.5"
                                >
                                  <Phone className="h-3 w-3" />{req.customer_phone}
                                </a>
                              )}
                              {(req.shipping_thana || req.shipping_district) && (
                                <p className="text-[11px] text-slate-400 mt-0.5 inline-flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {[req.shipping_thana, req.shipping_district, req.shipping_division]
                                    .filter(Boolean).join(", ")}
                                </p>
                              )}
                              {req.seller_mobile && (
                                <p className="text-[11px] text-slate-400 mt-0.5">
                                  Seller: {req.seller_name} · {req.seller_mobile}
                                </p>
                              )}
                            </div>
                            <div className="flex flex-col items-end gap-2 shrink-0">
                              <p className="text-lg font-extrabold text-emerald-600">
                                ৳{Number(req.total || 0).toLocaleString()}
                              </p>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  className="h-8 gap-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:opacity-90 text-white text-xs"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRequestAction(req.id, "accepted");
                                  }}
                                  disabled={isProcessing}
                                >
                                  {isProcessing
                                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    : <CheckCircle className="h-3.5 w-3.5" />}
                                  Accept
                                </Button>
                                <Button
                                  size="sm" variant="outline"
                                  className="h-8 gap-1.5 rounded-xl border-red-200 text-red-600 hover:bg-red-50 text-xs"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRequestAction(req.id, "declined");
                                  }}
                                  disabled={isProcessing}
                                >
                                  <XCircle className="h-3.5 w-3.5" />
                                  Decline
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </>
            )}

            {/* order list */}
            {ordersLoading ? (
              <div className="py-16 text-center">
                <Loader2 className="h-6 w-6 animate-spin mx-auto text-emerald-400 mb-2" />
                <p className="text-slate-400 text-sm">Loading orders...</p>
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="py-16 text-center">
                <div className="w-14 h-14 rounded-2xl bg-white border border-slate-100 flex items-center justify-center mx-auto mb-3">
                  <Truck className="h-7 w-7 text-slate-300" />
                </div>
                <p className="text-slate-500 font-medium text-sm">
                  {activeTab === "completed" ? "No delivered orders yet" : "No orders found"}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredOrders.map((order, i) => {
                  const sc = deliveryStatuses[order.status];
                  return (
                    // ✅ Key on delivery_request_id — always unique, never duplicates
                    <motion.div
                      key={order.delivery_request_id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                    >
                      <div className="rounded-2xl bg-white border border-slate-100 hover:border-slate-200 hover:shadow-sm transition-all overflow-hidden">
                        <div className="p-4">
                          <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-1.5">
                                <span className="font-bold text-slate-800 text-sm font-mono">
                                  {order.order_number}
                                </span>
                                {sc && (
                                  <Badge className={`${sc.color} text-[11px] rounded-full px-2.5 py-0.5`}>
                                    {sc.label}
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-3 flex-wrap">
                                <div className="flex items-center gap-1.5">
                                  <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                                    <span className="text-[11px] font-bold text-emerald-700">
                                      {(order.customer_name || "?").charAt(0).toUpperCase()}
                                    </span>
                                  </div>
                                  <span className="text-sm font-semibold text-slate-700">
                                    {order.customer_name}
                                  </span>
                                </div>
                                <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                                  <Phone className="h-3 w-3" />{order.customer_phone}
                                </span>
                              </div>
                              {order.shipping_address && (
                                <p className="text-xs text-slate-400 mt-1 truncate">
                                  {order.shipping_address}
                                </p>
                              )}
                              {(order.shipping_thana || order.shipping_district || order.shipping_division) && (
                                <p className="text-[11px] text-slate-400 mt-0.5">
                                  {[order.shipping_thana, order.shipping_district, order.shipping_division]
                                    .filter(Boolean).join(", ")}
                                </p>
                              )}
                              <p className="text-[11px] text-slate-400 mt-0.5">
                                {new Date(order.created_at).toLocaleString(bn ? "bn-BD" : "en-BD", {
                                  day: "numeric", month: "short", year: "numeric",
                                  hour: "2-digit", minute: "2-digit",
                                })}
                              </p>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <div className="text-right">
                                <p className="text-xl font-extrabold text-emerald-600">
                                  ৳{Number(order.total || 0).toLocaleString()}
                                </p>
                              </div>

                              {/* Pickup tab → Picked Up button */}
                              {(order.status === "confirmed" || order.status === "processing") && (
                                <Button
                                  size="sm"
                                  className="h-8 gap-1 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:opacity-90 text-white"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateStatus(order.delivery_request_id, "shipped");
                                  }}
                                >
                                  <Truck className="h-3.5 w-3.5" />
                                  {order.status === "processing" ? "Ship" : "Picked Up"}
                                </Button>
                              )}

                              {/* In Transit tab → Delivered button */}
                              {order.status === "shipped" && (
                                <Button
                                  size="sm"
                                  className="h-8 gap-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    const updated = await updateStatus(order.delivery_request_id, "delivered");
                                    if (updated) setActiveTab("completed");
                                  }}
                                >
                                  <CheckCircle className="h-3.5 w-3.5" /> Delivered
                                </Button>
                              )}

                              {/* Always show call button */}
                              <Button
                                variant="outline" size="sm"
                                className="h-8 w-8 rounded-xl border-slate-200 p-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.open(`tel:${order.customer_phone}`);
                                }}
                              >
                                <Phone className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        );
      }}
    </PanelSidebarTabs>
  );
};

export default MartDeliveryPanel;
