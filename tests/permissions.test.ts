import assert from "node:assert/strict";
import test from "node:test";

import {
  PERMISSIONS,
  SYSTEM_ROLE_PERMISSIONS,
  hasAllPermissions,
  hasAnyPermission,
  hasPermission,
  isPermission,
  permissionsForRole,
} from "../src/lib/permissions";

test("permission registry contains no duplicates and has coherent helpers", () => {
  assert.equal(new Set(PERMISSIONS).size, PERMISSIONS.length);
  assert.ok(PERMISSIONS.every((permission) => isPermission(permission)));
  assert.equal(isPermission("ticket:destroy_everything"), false);
});

test("owner has every permission while admin cannot delete or transfer the tenant", () => {
  assert.deepEqual(new Set(SYSTEM_ROLE_PERMISSIONS.OWNER), new Set(PERMISSIONS));
  assert.equal(hasPermission("tenant:delete", { roleKey: "ADMIN" }), false);
  assert.equal(hasPermission("tenant:transfer", { roleKey: "ADMIN" }), false);
  assert.equal(hasPermission("ticket:delete", { roleKey: "ADMIN" }), true);
});

test("agents are limited to assigned-ticket scope, technicians own field-service capabilities", () => {
  assert.equal(hasPermission("ticket:read", { roleKey: "AGENT" }), true);
  assert.equal(hasPermission("ticket:read_all", { roleKey: "AGENT" }), false);
  assert.equal(hasPermission("invoice:manage", { roleKey: "AGENT" }), false);
  assert.equal(hasPermission("work-order:manage", { roleKey: "TECHNICIAN" }), true);
  assert.equal(hasPermission("member:invite", { roleKey: "TECHNICIAN" }), false);
});

test("custom role permissions are validated and unknown keys are dropped", () => {
  const custom = permissionsForRole("CUSTOM", [
    "ticket:read",
    "customer:read",
    "made-up:permission",
  ]);
  assert.deepEqual(custom, ["ticket:read", "customer:read"]);
  assert.equal(isPermission("made-up:permission"), false);
});

test("combined permission helpers implement any/all semantics", () => {
  const options = { roleKey: "AGENT" as const };
  assert.equal(hasAnyPermission(["member:invite", "ticket:read"], options), true);
  assert.equal(hasAnyPermission(["member:invite", "billing:manage"], options), false);
  assert.equal(hasAllPermissions(["ticket:read", "customer:read"], options), true);
  assert.equal(hasAllPermissions(["ticket:read", "tenant:update"], options), false);
});

test("super admin bypass is explicit and independent of tenant role", () => {
  const options = {
    roleKey: "CUSTOM" as const,
    customPermissions: [],
    isSuperAdmin: true,
  };
  assert.equal(hasPermission("tenant:delete", options), true);
  assert.equal(hasAllPermissions([...PERMISSIONS], options), true);
});
