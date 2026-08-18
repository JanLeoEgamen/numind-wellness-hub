// Admin React Query hooks wrapping the admin server functions in src/lib/admin-functions.ts.
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

// Timeout every admin request so a stalled server function surfaces a readable
// error instead of an indefinite "Loading…" spinner, and skip the retry storm.
const ADMIN_REQUEST_TIMEOUT_MS = 12_000;
const ADMIN_QUERY_RETRY = 1;

function withTimeout<T>(promise: Promise<T>, ms = ADMIN_REQUEST_TIMEOUT_MS): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error("Admin request timed out. Please try again.")),
      ms,
    );
  });
  return Promise.race([promise, timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

export const ADMIN_KEYS = {
  dashboard: ["admin", "dashboard"] as const,
  users: ["admin", "users"] as const,
  subscriptions: ["admin", "subscriptions"] as const,
  moderation: ["admin", "moderation"] as const,
  xp: ["admin", "xp"] as const,
  catalog: (table: CatalogTable) => ["admin", "catalog", table] as const,
};

export function useAdminDashboard() {
  return useQuery({ queryKey: ADMIN_KEYS.dashboard, queryFn: () => withTimeout(getAdminDashboard()), retry: ADMIN_QUERY_RETRY });
}

export function useAdminUsers() {
  return useQuery({ queryKey: ADMIN_KEYS.users, queryFn: () => withTimeout(adminListUsers()), retry: ADMIN_QUERY_RETRY });
}

export function useAdminUserDetail(userId: string | null) {
  return useQuery({
    queryKey: [...ADMIN_KEYS.users, userId],
    queryFn: () => withTimeout(adminGetUserDetail({ data: { userId: userId! } })),
    enabled: !!userId,
    retry: ADMIN_QUERY_RETRY,
  });
}

export function useAdminSubscriptions() {
  return useQuery({ queryKey: ADMIN_KEYS.subscriptions, queryFn: () => withTimeout(adminListSubscriptions()), retry: ADMIN_QUERY_RETRY });
}

export function useAdminModeration() {
  return useQuery({ queryKey: ADMIN_KEYS.moderation, queryFn: () => withTimeout(adminListAllPosts()), retry: ADMIN_QUERY_RETRY });
}

export function useAdminRecentXp() {
  return useQuery({ queryKey: ADMIN_KEYS.xp, queryFn: () => withTimeout(adminRecentXp()), retry: ADMIN_QUERY_RETRY });
}

export function useAdminCatalog(table: CatalogTable) {
  return useQuery({ queryKey: ADMIN_KEYS.catalog(table), queryFn: () => withTimeout(adminListCatalog({ data: { table } })), retry: ADMIN_QUERY_RETRY });
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
      withTimeout(adminUpsertCatalog({ data: { table, ...d } })),
    onSuccess: () => invalidate(ADMIN_KEYS.catalog(table)),
  });
}

export function useAdminDeleteCatalog(table: CatalogTable) {
  const { invalidate } = useAdminInvalidator();
  return useMutation({
    mutationFn: (id: string) => withTimeout(adminDeleteCatalog({ data: { table, id } })),
    onSuccess: () => invalidate(ADMIN_KEYS.catalog(table)),
  });
}

export function useAdminSetCatalogActive(table: CatalogTable) {
  const { invalidate } = useAdminInvalidator();
  return useMutation({
    mutationFn: (d: { id: string; active: boolean }) =>
      withTimeout(adminSetCatalogActive({ data: { table, ...d } })),
    onSuccess: () => invalidate(ADMIN_KEYS.catalog(table)),
  });
}

export function useAdminSetUserRole() {
  const { invalidate } = useAdminInvalidator();
  return useMutation({
    mutationFn: (d: { userId: string; role: "admin" | "moderator" | "user" }) =>
      withTimeout(adminSetUserRole({ data: d })),
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
      withTimeout(adminRemoveUserRole({ data: d })),
    onSuccess: () => invalidate(ADMIN_KEYS.users),
  });
}

export function useAdminSetSubscriptionStatus() {
  const { invalidate } = useAdminInvalidator();
  return useMutation({
    mutationFn: (d: { id: string; status: "trialing" | "active" | "past_due" | "canceled" | "expired" }) =>
      withTimeout(adminSetSubscriptionStatus({ data: d })),
    onSuccess: () => invalidate(ADMIN_KEYS.subscriptions),
  });
}

export function useAdminSetPostHidden() {
  const { invalidate } = useAdminInvalidator();
  return useMutation({
    mutationFn: (d: { id: string; hidden: boolean }) => withTimeout(adminSetPostHidden({ data: d })),
    onSuccess: () => invalidate(ADMIN_KEYS.moderation),
  });
}

export function useAdminDeletePost() {
  const { invalidate } = useAdminInvalidator();
  return useMutation({
    mutationFn: (id: string) => withTimeout(adminDeletePost({ data: { id } })),
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
    }) => withTimeout(adminBroadcastNotification({ data: d })),
    onSuccess: () => invalidate(ADMIN_KEYS.dashboard),
  });
}
