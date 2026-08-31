import { useState, useEffect, useCallback } from "react";
import { RefreshCw, Save, Eye, EyeOff, AlertCircle } from "lucide-react";

// ---------------------------------------------------------------------------
// Backend base URL.
// Leave empty ("") if the frontend is served from the same origin as the
// API (e.g. proxied through Vite/nginx). Otherwise point this at your
// Express server, e.g. "http://localhost:4000".
// ---------------------------------------------------------------------------

const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

// ---------------------------------------------------------------------------
// Types — mirrors the `payment_gateways` table columns.
// ---------------------------------------------------------------------------

interface PaymentGateway {
  id: number;
  gateway_name: string;
  display_name: string;
  is_enabled: boolean | 0 | 1;
  [key: string]: unknown;
}

interface CredentialField {
  key: string;
  label: string;
  placeholder?: string;
  secret?: boolean; // renders as password field with show/hide toggle
  multiline?: boolean; // renders as textarea (used for extra_config JSON)
}

interface PaymentMethodConfig {
  key: string; // matches gateway_name in the DB
  label: string; // display name shown in the badge + form title
  fields: CredentialField[];
}

// ---------------------------------------------------------------------------
// Static config: one entry per gateway seeded in db/paymentGateways.js.
// Field keys match the actual column names the backend controller accepts
// (see UPDATABLE_FIELDS in controllers/paymentGateway.controller.js).
// ---------------------------------------------------------------------------

const PAYMENT_METHODS: PaymentMethodConfig[] = [
  {
    key: "bkash",
    label: "bKash",
    fields: [
      { key: "base_url", label: "Base URL", placeholder: "https://tokenized.pay.bka.sh" },
      { key: "username", label: "Username", placeholder: "admin@gmail.com" },
      { key: "password", label: "Password", secret: true },
      { key: "app_key", label: "App Key" },
      { key: "app_secret", label: "App Secret", secret: true },
      { key: "callback_url", label: "Callback URL" },
    ],
  },
  {
    key: "nagad",
    label: "Nagad",
    fields: [
      { key: "base_url", label: "Base URL", placeholder: "https://api.mynagad.com" },
      { key: "merchant_id", label: "Merchant ID" },
      { key: "api_key", label: "API Key", secret: true },
      { key: "api_secret", label: "API Secret", secret: true },
      { key: "callback_url", label: "Callback URL" },
      { key: "extra_config", label: "Extra Config (JSON)", multiline: true },
    ],
  },
  {
    key: "rocket",
    label: "Rocket",
    fields: [
      { key: "merchant_id", label: "Merchant ID" },
      { key: "account_number", label: "Account Number" },
      { key: "api_key", label: "API Key", secret: true },
      { key: "api_secret", label: "API Secret", secret: true },
      { key: "base_url", label: "Base URL" },
      { key: "callback_url", label: "Callback URL" },
      { key: "extra_config", label: "Extra Config (JSON)", multiline: true },
    ],
  },
  {
    key: "shurjopay",
    label: "ShurjoPay",
    fields: [
      { key: "api_url", label: "API URL", placeholder: "https://engine.shurjopayment.com" },
      { key: "username", label: "Username" },
      { key: "password", label: "Password", secret: true },
      { key: "callback_url", label: "Callback URL" },
      { key: "extra_config", label: "Extra Config (JSON)", multiline: true },
    ],
  },
  {
    key: "sslcommerz",
    label: "SSLCommerz",
    fields: [
      { key: "store_id", label: "Store ID" },
      { key: "store_password", label: "Store Password", secret: true },
      { key: "api_url", label: "API URL" },
      { key: "success_url", label: "Success URL" },
      { key: "fail_url", label: "Fail URL" },
      { key: "cancel_url", label: "Cancel URL" },
      { key: "ipn_url", label: "IPN URL" },
    ],
  },
  {
    key: "uddoktapay",
    label: "UddoktaPay",
    fields: [
      { key: "api_key", label: "API Key", secret: true },
      { key: "base_url", label: "Base URL", placeholder: "https://sandbox.uddoktapay.com" },
    ],
  },
  {
    key: "cod",
    label: "Cash on Delivery",
    fields: [],
  },
];

// ---------------------------------------------------------------------------
// API helpers
// ---------------------------------------------------------------------------

async function apiRequest(path: string, options: RequestInit = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include", // send the auth cookie your backend expects
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {
      // ignore non-JSON error bodies
    }
    throw new Error(message);
  }
  if (res.status === 204) return null;
  return res.json();
}

// ---------------------------------------------------------------------------
// Small presentational toggle switch. Purely visual — the parent owns
// state and the async save/revert logic in toggleEnabled().
// ---------------------------------------------------------------------------

const ToggleSwitch = ({
  checked,
  disabled,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: () => void;
}) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    disabled={disabled}
    onClick={onChange}
    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${
      checked ? "bg-green-500" : "bg-gray-300"
    }`}
  >
    <span
      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
        checked ? "translate-x-6" : "translate-x-1"
      }`}
    />
  </button>
);

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const AdminPaymentSettings = () => {
  const [gateways, setGateways] = useState<Record<string, PaymentGateway>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [togglingKey, setTogglingKey] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [selectedKey, setSelectedKey] = useState<string>("bkash");
  const [drafts, setDrafts] = useState<Record<string, Record<string, string>>>({});
  const [revealedFields, setRevealedFields] = useState<Record<string, boolean>>({});
  const [savedFlash, setSavedFlash] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);

  const fetchGateways = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // ?reveal=true returns actual credential values (not masked) so the
      // edit form can be pre-filled. The backend should keep this endpoint
      // behind admin auth — see routes/paymentGateway.routes.js.
      const rows: PaymentGateway[] = await apiRequest("/api/payment-gateways?reveal=true");
      const map: Record<string, PaymentGateway> = {};
      const draftMap: Record<string, Record<string, string>> = {};
      rows.forEach((row) => {
        map[row.gateway_name] = row;
        const draft: Record<string, string> = {};
        PAYMENT_METHODS.find((m) => m.key === row.gateway_name)?.fields.forEach((f) => {
          const value = row[f.key];
          draft[f.key] =
            value === null || value === undefined
              ? ""
              : typeof value === "string"
                ? value
                : JSON.stringify(value);
        });
        draftMap[row.gateway_name] = draft;
      });
      setGateways(map);
      setDrafts(draftMap);
    } catch (err) {
      setError(err instanceof Error ? err.message : "গেটওয়ে লোড করা যায়নি");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGateways();
  }, [fetchGateways]);

  const toggleEnabled = async (gatewayName: string) => {
    const current = gateways[gatewayName];
    const nextEnabled = !current?.is_enabled;

    // Optimistic update so the switch responds immediately.
    setGateways((prev) => ({
      ...prev,
      [gatewayName]: { ...(prev[gatewayName] as PaymentGateway), is_enabled: nextEnabled },
    }));
    setTogglingKey(gatewayName);
    setError(null);

    try {
      const updated = await apiRequest(`/api/payment-gateways/${gatewayName}/toggle`, {
        method: "PATCH",
        body: JSON.stringify({ is_enabled: nextEnabled }),
      });
      setGateways((prev) => ({ ...prev, [gatewayName]: updated }));
    } catch (err) {
      // Revert on failure.
      setGateways((prev) => ({ ...prev, [gatewayName]: current as PaymentGateway }));
      setError(err instanceof Error ? err.message : "আপডেট ব্যর্থ হয়েছে");
    } finally {
      setTogglingKey(null);
    }
  };

  const updateDraftField = (gatewayName: string, fieldKey: string, value: string) => {
    setDrafts((prev) => ({
      ...prev,
      [gatewayName]: { ...(prev[gatewayName] || {}), [fieldKey]: value },
    }));
  };

  const saveCredentials = async (method: PaymentMethodConfig) => {
    const draft = drafts[method.key] || {};

    // extra_config must be valid JSON before it can be saved into the
    // JSON column — validate client-side so bad input doesn't 500 the API.
    const extraConfigField = method.fields.find((f) => f.key === "extra_config");
    if (extraConfigField && draft.extra_config) {
      try {
        JSON.parse(draft.extra_config);
      } catch {
        setFieldError("Extra Config অবশ্যই সঠিক JSON হতে হবে");
        return;
      }
    }
    setFieldError(null);
    setSavingKey(method.key);
    setError(null);

    try {
      const updated = await apiRequest(`/api/payment-gateways/${method.key}`, {
        method: "PUT",
        body: JSON.stringify(draft),
      });
      setGateways((prev) => ({ ...prev, [method.key]: updated }));
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "সংরক্ষণ ব্যর্থ হয়েছে");
    } finally {
      setSavingKey(null);
    }
  };

  const toggleReveal = (fieldId: string) => {
    setRevealedFields((prev) => ({ ...prev, [fieldId]: !prev[fieldId] }));
  };

  if (loading) {
    return <div className="py-8 text-center text-muted-foreground">লোড হচ্ছে...</div>;
  }

  const selectedMethod = PAYMENT_METHODS.find((m) => m.key === selectedKey) ?? PAYMENT_METHODS[0];
  const draft = drafts[selectedMethod.key] || {};
  const selectedIsEnabled = !!gateways[selectedMethod.key]?.is_enabled;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-heading text-lg font-bold text-foreground">পেমেন্ট সেটিংস</h3>
        <button
          onClick={fetchGateways}
          className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium text-foreground hover:bg-secondary"
        >
          <RefreshCw className="h-3.5 w-3.5" /> রিফ্রেশ
        </button>
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        {/* -------------------------------------------------------------- */}
        {/* Left: pick a method (no checkbox — just selection)             */}
        {/* -------------------------------------------------------------- */}
        <div className="rounded-2xl border border-border bg-card p-4">
          <h4 className="mb-3 border-b border-border pb-3 text-base font-bold text-userprimary">
            পেমেন্ট মেথড
          </h4>
          <div className="grid grid-cols-2 gap-2.5">
            {PAYMENT_METHODS.map((method) => {
              const isEnabled = !!gateways[method.key]?.is_enabled;
              const isSelected = selectedKey === method.key;

              return (
                <button
                  type="button"
                  key={method.key}
                  onClick={() => setSelectedKey(method.key)}
                  className={`flex items-center justify-between gap-2 rounded-lg bg-secondary/60 px-3 py-2.5 text-left transition-colors ${
                    isSelected ? "ring-2 ring-userprimary" : "hover:bg-secondary"
                  }`}
                >
                  <span className="text-sm font-medium text-userprimary">{method.label}</span>
                  <span
                    className={`h-2 w-2 shrink-0 rounded-full ${
                      isEnabled ? "bg-green-500" : "bg-muted-foreground/30"
                    }`}
                    aria-hidden="true"
                  />
                </button>
              );
            })}
          </div>
        </div>

        {/* -------------------------------------------------------------- */}
        {/* Right: Credentials for the selected method                     */}
        {/* -------------------------------------------------------------- */}
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="mb-3 flex items-center justify-between border-b border-border pb-3">
            <h4 className="text-base font-bold text-userprimary">
              {selectedMethod.label} {selectedMethod.fields.length > 0 ? "API" : ""}
            </h4>
            <ToggleSwitch
              checked={selectedIsEnabled}
              disabled={togglingKey === selectedMethod.key}
              onChange={() => toggleEnabled(selectedMethod.key)}
            />
          </div>

          {selectedMethod.fields.length === 0 ? (
            <p className="py-6 text-center text-xs text-muted-foreground">
              এই পদ্ধতিতে কোনো ক্রেডেনশিয়াল প্রয়োজন নেই — অর্ডার ডেলিভারির সময় নগদ সংগ্রহ করা হয়।
            </p>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {selectedMethod.fields.map((field) => {
                  const fieldId = `${selectedMethod.key}-${field.key}`;
                  const isRevealed = revealedFields[fieldId];
                  const inputType = field.secret && !isRevealed ? "password" : "text";
                  const isFullWidth = field.key.includes("url") || field.multiline;

                  return (
                    <div key={field.key} className={isFullWidth ? "sm:col-span-2" : ""}>
                      <label
                        htmlFor={fieldId}
                        className="mb-1 block text-xs font-medium text-muted-foreground"
                      >
                        {field.label}
                      </label>
                      {field.multiline ? (
                        <textarea
                          id={fieldId}
                          value={draft[field.key] || ""}
                          onChange={(e) =>
                            updateDraftField(selectedMethod.key, field.key, e.target.value)
                          }
                          placeholder='{"key": "value"}'
                          rows={3}
                          className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-xs text-foreground outline-none focus:border-userprimary"
                        />
                      ) : (
                        <div className="relative">
                          <input
                            id={fieldId}
                            type={inputType}
                            value={draft[field.key] || ""}
                            onChange={(e) =>
                              updateDraftField(selectedMethod.key, field.key, e.target.value)
                            }
                            placeholder={field.placeholder}
                            autoComplete="off"
                            className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-userprimary pr-8"
                          />
                          {field.secret && (
                            <button
                              type="button"
                              onClick={() => toggleReveal(fieldId)}
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                              {isRevealed ? (
                                <EyeOff className="h-3.5 w-3.5" />
                              ) : (
                                <Eye className="h-3.5 w-3.5" />
                              )}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {fieldError && <p className="text-xs text-red-600">{fieldError}</p>}

              <div className="flex items-center gap-3 pt-1">
                <button
                  onClick={() => saveCredentials(selectedMethod)}
                  disabled={savingKey === selectedMethod.key}
                  className="flex items-center gap-1.5 rounded-lg bg-userprimary px-4 py-2 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
                >
                  <Save className="h-3.5 w-3.5" />
                  {savingKey === selectedMethod.key ? "সংরক্ষণ হচ্ছে..." : "সংরক্ষণ করুন"}
                </button>
                {savedFlash && (
                  <span className="text-xs font-medium text-green-700">সংরক্ষিত হয়েছে ✓</span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminPaymentSettings;