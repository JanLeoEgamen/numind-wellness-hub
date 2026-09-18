// Thin TanStack Query wrappers around the backend server functions in
// src/lib/server-functions.ts. Routes consume these instead of hand-rolling
// query boilerplate. All of the wrapped functions are POST server functions
// that return a promise of their document, so they plug straight into useQuery.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getMyStats,
  getMyHabits,
  getMyJournal,
  getMyNotifications,
  markNotificationsRead,
  getMyGarden,
  getCommunityFeed,
  getCommunityStats,
  getMyBadges,
  getMindGymActivities,
  getLearningCatalog,
  getMyQuests,
  getMyMemories,
  getMyNumiConversations,
  getNumiConversationMessages,
  getMyFocusPlan,
  getMyFocusHistory,
  getMyAnalytics,
  getMySettings,
  saveMySettings,
  getRewardsMarketplace,
  redeemReward,
  equipReward,
  getMyGames,
  updateMyProfile,
  getMyGoals,
  addMyGoal,
  completeMyGoal,
  getMyScreeningCompletions,
  getSafetyResources,
} from "@/lib/server-functions";
import {
  getSubscriptionPlans,
  getMySubscription,
  subscribeToPlan,
  cancelMySubscription,
} from "@/lib/subscription-functions";
import type { NumiMessage, UserSettings, RewardsMarketplace, UpdateProfileInput } from "@/lib/server-functions";
import type { MySubscription, BillingPeriod } from "@/lib/subscription-functions";

// Server functions return UUID primary keys; mock-data uses short slug ids.
// Guard server writes with this so we never post a non-UUID to an FK column.
export const isUuid = (value?: string | null) =>
  !!value && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

export function useMyStats() {
  return useQuery({ queryKey: ["myStats"], queryFn: () => getMyStats() });
}

export function useMyHabits() {
  return useQuery({ queryKey: ["myHabits"], queryFn: () => getMyHabits() });
}

export function useMyJournal() {
  return useQuery({ queryKey: ["myJournal"], queryFn: () => getMyJournal() });
}

export function useMyNotifications() {
  return useQuery({ queryKey: ["myNotifications"], queryFn: () => getMyNotifications() });
}

// Mark one or more notifications read, then invalidate the shared cache so the
// header badge and the inbox both settle on the server's canonical state.
export function useMarkNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (ids?: string[]) => markNotificationsRead({ data: ids?.length ? { ids } : {} }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["myNotifications"] }),
  });
}

export function useMyGarden() {
  return useQuery({ queryKey: ["myGarden"], queryFn: () => getMyGarden() });
}

export function useCommunityFeed() {
  return useQuery({ queryKey: ["communityFeed"], queryFn: () => getCommunityFeed() });
}

export function useCommunityStats() {
  return useQuery({ queryKey: ["communityStats"], queryFn: () => getCommunityStats() });
}

export function useMyBadges() {
  return useQuery({ queryKey: ["myBadges"], queryFn: () => getMyBadges() });
}

export function useMindGymActivities() {
  return useQuery({ queryKey: ["mindGymActivities"], queryFn: () => getMindGymActivities() });
}

export function useLearningCatalog() {
  return useQuery({ queryKey: ["learningCatalog"], queryFn: () => getLearningCatalog() });
}

export function useMyQuests() {
  return useQuery({ queryKey: ["myQuests"], queryFn: () => getMyQuests() });
}

export function useMyMemories() {
  return useQuery({ queryKey: ["myMemories"], queryFn: () => getMyMemories() });
}

export function useMyNumiConversations() {
  return useQuery({ queryKey: ["myNumiConversations"], queryFn: () => getMyNumiConversations() });
}

export function useNumiConversationMessages(conversationId?: string | null) {
  return useQuery<NumiMessage[]>({
    queryKey: ["numiConversationMessages", conversationId ?? "none"],
    queryFn: () =>
      conversationId
        ? getNumiConversationMessages({ data: { conversationId } })
        : Promise.resolve([]),
    enabled: !!conversationId,
  });
}

export function useMyFocusPlan(date?: string | null) {
  return useQuery({
    queryKey: ["myFocusPlan", date ?? "today"],
    queryFn: () => getMyFocusPlan({ data: { date: date ?? null } }),
  });
}

export function useMyFocusHistory() {
  return useQuery({ queryKey: ["myFocusHistory"], queryFn: () => getMyFocusHistory() });
}

export function useMyAnalytics() {
  return useQuery({ queryKey: ["myAnalytics"], queryFn: () => getMyAnalytics() });
}


export function useMySettings() {
  return useQuery({ queryKey: ["mySettings"], queryFn: () => getMySettings() });
}

export function useSaveMySettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: Partial<UserSettings>) => saveMySettings({ data: { patch } }),
    onSuccess: (saved) => {
      // Reflect the server's canonical row immediately for any other query.
      queryClient.setQueryData(["mySettings"], saved);
    },
  });
}

export function useMyGames() {
  return useQuery({ queryKey: ["myGames"], queryFn: () => getMyGames() });
}


export function useRewardsMarketplace() {
  return useQuery({ queryKey: ["rewardsMarketplace"], queryFn: () => getRewardsMarketplace() });
}

export function useRedeemReward() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (rewardId: string) => redeemReward({ data: { rewardId } }),
    onSuccess: (data) => queryClient.setQueryData<RewardsMarketplace>(["rewardsMarketplace"], data),
  });
}

export function useEquipReward() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (rewardId: string | null) => equipReward({ data: { rewardId } }),
    onSuccess: (data) => queryClient.setQueryData<RewardsMarketplace>(["rewardsMarketplace"], data),
  });
}


export function useMyGoals() {
  return useQuery({ queryKey: ["myGoals"], queryFn: () => getMyGoals() });
}

export function useUpdateMyProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: UpdateProfileInput) => updateMyProfile({ data: patch }),
    onSuccess: () => {
      // Profile fields flow through getMyStats (nickname/avatar/names) too.
      queryClient.invalidateQueries({ queryKey: ["myStats"] });
    },
  });
}

export function useAddMyGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (title: string) => addMyGoal({ data: { title } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["myGoals"] }),
  });
}

export function useCompleteMyGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => completeMyGoal({ data: { id } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["myGoals"] }),
  });
}

export function useMyScreeningCompletions() {
  return useQuery({ queryKey: ["myScreeningCompletions"], queryFn: () => getMyScreeningCompletions() });
}

export function useSafetyResources() {
  return useQuery({ queryKey: ["safetyResources"], queryFn: () => getSafetyResources() });
}



export function useSubscriptionPlans() {
  return useQuery({ queryKey: ["subscriptionPlans"], queryFn: () => getSubscriptionPlans() });
}

export function useMySubscription(enabled = true) {
  return useQuery({
    queryKey: ["mySubscription"],
    queryFn: () => getMySubscription(),
    enabled,
  });
}

export function useSubscribeToPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (d: { planSlug: string; billingPeriod: BillingPeriod }) =>
      subscribeToPlan({ data: d }),
    onSuccess: (saved: MySubscription) => {
      // Entitlement drives several catalogs; refresh everything it gates.
      queryClient.setQueryData(["mySubscription"], saved);
      queryClient.invalidateQueries({ queryKey: ["mySubscription"] });
      queryClient.invalidateQueries({ queryKey: ["mindGymActivities"] });
      queryClient.invalidateQueries({ queryKey: ["learningCatalog"] });
      queryClient.invalidateQueries({ queryKey: ["myQuests"] });
      queryClient.invalidateQueries({ queryKey: ["myGames"] });
      queryClient.invalidateQueries({ queryKey: ["rewardsMarketplace"] });
      queryClient.invalidateQueries({ queryKey: ["numiConversations"] });
    },
  });
}

export function useCancelMySubscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => cancelMySubscription(),
    onSuccess: (saved: MySubscription) => {
      queryClient.setQueryData(["mySubscription"], saved);
      queryClient.invalidateQueries({ queryKey: ["mySubscription"] });
      queryClient.invalidateQueries({ queryKey: ["mindGymActivities"] });
      queryClient.invalidateQueries({ queryKey: ["learningCatalog"] });
      queryClient.invalidateQueries({ queryKey: ["myQuests"] });
      queryClient.invalidateQueries({ queryKey: ["myGames"] });
      queryClient.invalidateQueries({ queryKey: ["rewardsMarketplace"] });
    },
  });
}
