import { describe, expect, it } from "vitest";
import { getRoleConfig } from "@/config/roles";

describe("deal_admin role redirect", () => {
  it("maps deal_admin to the admin deal dashboard", () => {
    const config = getRoleConfig("deal_admin");

    expect(config).toBeDefined();
    expect(config?.panelPath).toBe("/admin/deal-overview");
  });
});
