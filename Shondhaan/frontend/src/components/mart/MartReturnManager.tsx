import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Package, CheckCircle, XCircle, Clock, Search, RefreshCw, AlertTriangle, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface ReturnOrder {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  total: number;
  status: string;
  return_requested_at: string;
  return_reason: string | null;
  cancel_reason: string | null;
  cancelled_at: string | null;
  shipping_address: string;
  payment_method: string;
  payment_status: string;
  created_at: string;
}

const returnStatusMap: Record<string, { label: string; labelEn: string; color: string }> = {
  return_requested: { label: "রিটার্ন অনুরোধ", labelEn: "Return Requested", color: "bg-orange-100 text-orange-800" },
  return_approved: { label: "রিটার্ন অনুমোদিত", labelEn: "Return Approved", color: "bg-blue-100 text-blue-800" },
  return_rejected: { label: "রিটার্ন প্রত্যাখ্যাত", labelEn: "Return Rejected", color: "bg-red-100 text-red-800" },
  refunded: { label: "রিফান্ড সম্পন্ন", labelEn: "Refunded", color: "bg-green-100 text-green-800" },
  cancelled: { label: "বাতিল", labelEn: "Cancelled", color: "bg-gray-100 text-gray-800" },
};

const MartReturnManager = () => {
  const { language } = useLanguage();
  const bn = language === "bn";
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState<ReturnOrder | null>(null);
  const [adminNote, setAdminNote] = useState("");

  const { data: orders = [], isLoading, refetch } = useQuery({
    queryKey: ["mart-return-orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mart_orders")
        .select("*")
        .or("return_requested_at.not.is.null,status.eq.cancelled")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as ReturnOrder[];
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Record<string, any> }) => {
      const { error } = await supabase.from("mart_orders").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mart-return-orders"] });
      toast.success(bn ? "আপডেট হয়েছে" : "Updated");
      setSelectedOrder(null);
      setAdminNote("");
    },
    onError: () => toast.error(bn ? "সমস্যা হয়েছে" : "Error occurred"),
  });

  const handleApproveReturn = (order: ReturnOrder) => {
    updateMutation.mutate({ id: order.id, updates: { status: "return_approved", notes: adminNote || order.return_reason } });
  };

  const handleRejectReturn = (order: ReturnOrder) => {
    updateMutation.mutate({ id: order.id, updates: { status: "return_rejected", notes: adminNote || "প্রত্যাখ্যাত" } });
  };

  const handleRefund = (order: ReturnOrder) => {
    updateMutation.mutate({ id: order.id, updates: { status: "refunded", payment_status: "refunded", notes: adminNote || "রিফান্ড সম্পন্ন" } });
  };

  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      const matchSearch = !search || o.customer_name?.includes(search) || o.order_number?.includes(search) || o.customer_phone?.includes(search);
      const matchStatus = filterStatus === "all" 
        || (filterStatus === "return" && o.return_requested_at && !["return_approved", "return_rejected", "refunded"].includes(o.status))
        || (filterStatus === "approved" && o.status === "return_approved")
        || (filterStatus === "rejected" && o.status === "return_rejected")
        || (filterStatus === "refunded" && o.status === "refunded")
        || (filterStatus === "cancelled" && o.status === "cancelled" && !o.return_requested_at);
      return matchSearch && matchStatus;
    });
  }, [orders, search, filterStatus]);

  const stats = useMemo(() => ({
    totalReturns: orders.filter(o => o.return_requested_at).length,
    pendingReturns: orders.filter(o => o.return_requested_at && !["return_approved", "return_rejected", "refunded"].includes(o.status)).length,
    approvedReturns: orders.filter(o => o.status === "return_approved").length,
    refunded: orders.filter(o => o.status === "refunded").length,
    totalRefundAmount: orders.filter(o => o.status === "refunded").reduce((s, o) => s + (o.total || 0), 0),
    cancelled: orders.filter(o => o.status === "cancelled").length,
  }), [orders]);

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: bn ? "মোট রিটার্ন" : "Total Returns", value: stats.totalReturns, color: "text-orange-600", bg: "bg-orange-50", icon: Package },
          { label: bn ? "অপেক্ষমাণ" : "Pending", value: stats.pendingReturns, color: "text-amber-600", bg: "bg-amber-50", icon: Clock },
          { label: bn ? "রিফান্ড সম্পন্ন" : "Refunded", value: stats.refunded, color: "text-green-600", bg: "bg-green-50", icon: CheckCircle },
          { label: bn ? "রিফান্ড পরিমাণ" : "Refund Amount", value: `৳${stats.totalRefundAmount.toLocaleString("bn-BD")}`, color: "text-blue-600", bg: "bg-blue-50", icon: DollarSign },
        ].map((stat, i) => (
          <Card key={i} className="border-border/50">
            <CardContent className="p-3 flex items-center gap-3">
              <div className={`${stat.bg} p-2 rounded-lg`}><stat.icon className={`h-4 w-4 ${stat.color}`} /></div>
              <div>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                <p className="text-lg font-bold text-foreground">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pending alert */}
      {stats.pendingReturns > 0 && (
        <div className="flex items-center gap-2 rounded-xl border border-orange-200 bg-orange-50 dark:border-orange-900/40 dark:bg-orange-900/10 p-3">
          <AlertTriangle className="h-4 w-4 text-orange-600 shrink-0" />
          <p className="text-xs text-orange-800 dark:text-orange-200">
            <span className="font-semibold">{stats.pendingReturns}টি</span> {bn ? "রিটার্ন অনুরোধ অপেক্ষমাণ — মনোযোগ প্রয়োজন" : "return requests pending"}
          </p>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder={bn ? "অর্ডার/কাস্টমার খুঁজুন..." : "Search..."} value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full md:w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{bn ? "সকল" : "All"}</SelectItem>
            <SelectItem value="return">{bn ? "অপেক্ষমাণ রিটার্ন" : "Pending Returns"}</SelectItem>
            <SelectItem value="approved">{bn ? "অনুমোদিত" : "Approved"}</SelectItem>
            <SelectItem value="rejected">{bn ? "প্রত্যাখ্যাত" : "Rejected"}</SelectItem>
            <SelectItem value="refunded">{bn ? "রিফান্ড সম্পন্ন" : "Refunded"}</SelectItem>
            <SelectItem value="cancelled">{bn ? "বাতিল" : "Cancelled"}</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="icon" onClick={() => refetch()}><RefreshCw className="h-4 w-4" /></Button>
      </div>

      {/* Orders list with detail panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-2 max-h-[600px] overflow-y-auto">
          {isLoading ? (
            <div className="py-12 text-center text-muted-foreground">{bn ? "লোড হচ্ছে..." : "Loading..."}</div>
          ) : filteredOrders.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>{bn ? "কোনো রিটার্ন/বাতিল অর্ডার নেই" : "No return/cancelled orders"}</p>
            </div>
          ) : filteredOrders.map((order, i) => {
            const isReturn = !!order.return_requested_at;
            const statusKey = isReturn
              ? (["return_approved", "return_rejected", "refunded"].includes(order.status) ? order.status : "return_requested")
              : order.status;
            const statusInfo = returnStatusMap[statusKey] || { label: order.status, labelEn: order.status, color: "bg-muted text-foreground" };
            const isSelected = selectedOrder?.id === order.id;

            return (
              <motion.div key={order.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}>
                <Card className={`border-border/50 cursor-pointer transition-colors ${isSelected ? "ring-2 ring-primary" : "hover:bg-muted/30"}`} onClick={() => setSelectedOrder(order)}>
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-foreground text-sm">{order.order_number}</span>
                          <Badge className={`${statusInfo.color} text-[10px]`}>{bn ? statusInfo.label : statusInfo.labelEn}</Badge>
                          {isReturn && <Badge variant="outline" className="text-[10px] border-orange-300 text-orange-700">🔄 {bn ? "রিটার্ন" : "Return"}</Badge>}
                        </div>
                        <p className="text-xs text-foreground mt-1">{order.customer_name} • {order.customer_phone}</p>
                        {order.return_reason && <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">📝 {order.return_reason}</p>}
                      </div>
                      <p className="font-bold text-primary">৳{order.total.toLocaleString("bn-BD")}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Detail Panel */}
        <div>
          {selectedOrder ? (
            <Card className="border-border/50 sticky top-4">
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-foreground">{selectedOrder.order_number}</h3>
                  <Badge className={`${(returnStatusMap[selectedOrder.return_requested_at ? (["return_approved", "return_rejected", "refunded"].includes(selectedOrder.status) ? selectedOrder.status : "return_requested") : selectedOrder.status] || { color: "bg-muted" }).color} text-xs`}>
                    {selectedOrder.status}
                  </Badge>
                </div>

                <div className="space-y-2 text-sm">
                  <p><span className="font-medium">{bn ? "কাস্টমার:" : "Customer:"}</span> {selectedOrder.customer_name}</p>
                  <p>📞 {selectedOrder.customer_phone}</p>
                  <p>📍 {selectedOrder.shipping_address}</p>
                  <p><span className="font-medium">{bn ? "মোট:" : "Total:"}</span> ৳{selectedOrder.total.toLocaleString("bn-BD")}</p>
                  <p><span className="font-medium">{bn ? "পেমেন্ট:" : "Payment:"}</span> {selectedOrder.payment_method} ({selectedOrder.payment_status})</p>
                  <p className="text-xs text-muted-foreground">{new Date(selectedOrder.created_at).toLocaleString("bn-BD")}</p>
                </div>

                {selectedOrder.return_reason && (
                  <div className="bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-900/40 rounded-lg p-3">
                    <p className="text-xs font-semibold text-orange-800 dark:text-orange-200 mb-1">🔄 {bn ? "রিটার্ন কারণ" : "Return Reason"}</p>
                    <p className="text-sm text-orange-700 dark:text-orange-300">{selectedOrder.return_reason}</p>
                    {selectedOrder.return_requested_at && (
                      <p className="text-[10px] text-orange-600 mt-1">{bn ? "অনুরোধ:" : "Requested:"} {new Date(selectedOrder.return_requested_at).toLocaleString("bn-BD")}</p>
                    )}
                  </div>
                )}

                {selectedOrder.cancel_reason && (
                  <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/40 rounded-lg p-3">
                    <p className="text-xs font-semibold text-red-800 dark:text-red-200 mb-1">❌ {bn ? "বাতিলের কারণ" : "Cancel Reason"}</p>
                    <p className="text-sm text-red-700 dark:text-red-300">{selectedOrder.cancel_reason}</p>
                  </div>
                )}

                {/* Admin Note */}
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">{bn ? "অ্যাডমিন নোট:" : "Admin Note:"}</p>
                  <Textarea placeholder={bn ? "নোট লিখুন..." : "Write note..."} value={adminNote} onChange={e => setAdminNote(e.target.value)} className="text-sm" rows={2} />
                </div>

                {/* Action Buttons */}
                {selectedOrder.return_requested_at && !["return_approved", "return_rejected", "refunded"].includes(selectedOrder.status) && (
                  <div className="flex gap-2">
                    <Button size="sm" className="flex-1 gap-1" onClick={() => handleApproveReturn(selectedOrder)} disabled={updateMutation.isPending}>
                      <CheckCircle className="h-4 w-4" /> {bn ? "অনুমোদন" : "Approve"}
                    </Button>
                    <Button variant="destructive" size="sm" className="flex-1 gap-1" onClick={() => handleRejectReturn(selectedOrder)} disabled={updateMutation.isPending}>
                      <XCircle className="h-4 w-4" /> {bn ? "প্রত্যাখ্যান" : "Reject"}
                    </Button>
                  </div>
                )}

                {selectedOrder.status === "return_approved" && (
                  <Button size="sm" className="w-full gap-1 bg-green-600 hover:bg-green-700" onClick={() => handleRefund(selectedOrder)} disabled={updateMutation.isPending}>
                    <DollarSign className="h-4 w-4" /> {bn ? "রিফান্ড প্রসেস করুন" : "Process Refund"}
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="border-border/50">
              <CardContent className="p-8 text-center text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>{bn ? "একটি অর্ডার সিলেক্ট করুন" : "Select an order"}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default MartReturnManager;
