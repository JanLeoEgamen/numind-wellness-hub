// Thin TanStack Query wrappers around the backend server functions in
// src/lib/server-functions.ts. Routes consume these instead of hand-rolling
// query boilerplate. All of the wrapped functions are POST server functions
// that return a promise of their document, so they plug straight into useQuery.
import { useQuery } from "@tanstack/react-query";
import {
  getMyStats,
  getMyHabits,
  getMyJournal,
  getMyNotifications,
  getMyGarden,
  getCommunityFeed,
  getMyBadges,
  getMindGymActivities,
  getLearningCatalog,
  getMyQuests,
  getMyMemories,
} from "@/lib/server-functions";

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

export function useMyGarden() {
  return useQuery({ queryKey: ["myGarden"], queryFn: () => getMyGarden() });
}

export function useCommunityFeed() {
  return useQuery({ queryKey: ["communityFeed"], queryFn: () => getCommunityFeed() });
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
