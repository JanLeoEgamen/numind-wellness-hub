// React Query hooks that wrap the admin server functions in
// src/lib/admin-functions.ts. The admin.tsx route consumes these instead of
// hand-rolling query/mutation boilerplate. Every call is admin-gated server-side.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  adminBroadcastNotification,
  adminDeleteCatalog,
  adminDeletePost,
  adminGetUserDetail,
  adminListAllPosts,
  adminListCatalog,
  adminListSubscriptions,
  adminListUsers,
  adminRecentXp,
  adminRemoveUserRole,
  adminSetCatalogActive,
  adminSetPostHidden,
  adminSetSubscriptionStatus,
  adminSetUserRole,
  adminUpsertCatalog,
  getAdminDashboard,
  type CatalogTable,
} from "@/lib/admin-functions";

export const ADMIN_KEYS = {
  dashboard: ["admin", "dashboard"] as const,
  users: ["admin", "users"] as const,
  subscriptions: ["admin", "subscriptions"] as const,
  moderation: ["admin", "moderation"] as const,
  xp: ["admin", "xp"] as const,
  catalog: (table: CatalogTable) => ["admin", "catalog", table] as const,
};

export function useAdminDashboard() {
  return useQuery({
    queryKey: ADMIN_KEYS.dashboard,
    queryFn: () => getAdminDashboard(),
  });
}

export function useAdminUsers() {
  return useQuery({ queryKey: ADMIN_KEYS.users, queryFn: () => adminListUsers() });
}

export function useAdminUserDetail(userId: string | null) {
  return useQuery({
    queryKey: [...ADMIN_KEYS.users, userId],
    queryFn: () => adminGetUserDetail({ data: { userId: userId! } }),
    enabled: !!userId,
  });
}

export function useAdminSubscriptions() {
  return useQuery({
    queryKey: ADMIN_KEYS.subscriptions,
    queryFn: () => adminListSubscriptions(),
  });
}

export function useAdminModeration() {
  return useQuery({
    queryKey: ADMIN_KEYS.moderation,
    queryFn: () => adminListAllPosts(),
  });
}

export function useAdminRecentXp() {
  return useQuery({ queryKey: ADMIN_KEYS.xp, queryFn: () => adminRecentXp() });
}

export function useAdminCatalog(table: CatalogTable) {
  return useQuery({
    queryKey: ADMIN_KEYS.catalog(table),
    queryFn: () => adminListCatalog({ data: { table } }),
  });
}

function useAdminInvalidator() {
  const qc = useQueryClient();
  const invalidate = (keys: readonly unknown[]) => qc.invalidateQueries({ queryKey: keys });
  return { qc, invalidate };
}

export function useAdminUpsertCatalog(table: CatalogTable) {
  const { invalidate } = useAdminInvalidator();
  return useMutation({
    mutationFn: (d: { id?: string; fields: Record<string, unknown> }) =>
      adminUpsertCatalog({ data: { table, ...d } }),
    onSuccess: () => invalidate(ADMIN_KEYS.catalog(table)),
  });
}

export function useAdminDeleteCatalog(table: CatalogTable) {
  const { invalidate } = useAdminInvalidator();
  return useMutation({
    mutationFn: (id: string) => adminDeleteCatalog({ data: { table, id } }),
    onSuccess: () => invalidate(ADMIN_KEYS.catalog(table)),
  });
}

export function useAdminSetCatalogActive(table: CatalogTable) {
  const { invalidate } = useAdminInvalidator();
  return useMutation({
    mutationFn: (d: { id: string; active: boolean }) => adminSetCatalogActive({ data: { table, ...d } }),
    onSuccess: () => invalidate(ADMIN_KEYS.catalog(table)),
  });
}

export function useAdminSetUserRole() {
  const { invalidate } = useAdminInvalidator();
  return useMutation({
    mutationFn: (d: { userId: string; role: "admin" | "moderator" | "user" }) =>
      adminSetUserRole({ data: d }),
    onSuccess: () => {
      invalidate(ADMIN_KEYS.users);
      invalidate(ADMIN_KEYS.dashboard);
    },
  });
}

export function useAdminRemoveUserRole() {
  const { invalidate } = useAdminInvalidator();
  return useMutation({
    mutationFn: (d: { userId: string; role: "admin" | "moderator" | "user" }) =>
      adminRemoveUserRole({ data: d }),
    onSuccess: () => invalidate(ADMIN_KEYS.users),
  });
}

export function useAdminSetSubscriptionStatus() {
  const { invalidate } = useAdminInvalidator();
  return useMutation({
    mutationFn: (d: { id: string; status: "trialing" | "active" | "past_due" | "canceled" | "expired" }) =>
      adminSetSubscriptionStatus({ data: d }),
    onSuccess: () => invalidate(ADMIN_KEYS.subscriptions),
  });
}

export function useAdminSetPostHidden() {
  const { invalidate } = useAdminInvalidator();
  return useMutation({
    mutationFn: (d: { id: string; hidden: boolean }) => adminSetPostHidden({ data: d }),
    onSuccess: () => invalidate(ADMIN_KEYS.moderation),
  });
}

export function useAdminDeletePost() {
  const { invalidate } = useAdminInvalidator();
  return useMutation({
    mutationFn: (id: string) => adminDeletePost({ data: { id } }),
    onSuccess: () => invalidate(ADMIN_KEYS.moderation),
  });
}

export function useAdminBroadcast() {
  const { invalidate } = useAdminInvalidator();
  return useMutation({
    mutationFn: (d: {
      title: string;
      message?: string;
      type?: string;
      emoji?: string;
      targetUserId?: string;
    }) => adminBroadcastNotification({ data: d }),
    onSuccess: () => invalidate(ADMIN_KEYS.dashboard),
  });
}

