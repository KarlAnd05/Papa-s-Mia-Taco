import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import type { MenuItem, MenuSection, Settings } from "@/lib/types";

export const MENU_QUERY_KEY = ["menu-items"];

// The menu database is shared by the website, online ordering and the POS.
export function useMenu() {
  return useQuery({
    queryKey: MENU_QUERY_KEY,
    queryFn: () => apiFetch<{ items: MenuItem[] }>("/menu-items").then((d) => d.items),
    staleTime: 60_000,
    retry: 3,
  });
}

// Group items into categories, in menu order (by each category's first item).
export function groupMenu(items: MenuItem[], { availableOnly = false } = {}): MenuSection[] {
  const sections = new Map<string, MenuSection>();
  for (const item of [...items].sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id)) {
    if (availableOnly && !item.isAvailable) continue;
    let section = sections.get(item.category);
    if (!section) {
      section = { category: item.category, callout: null, boost: null, items: [] };
      sections.set(item.category, section);
    }
    section.callout ??= item.callout;
    section.boost ??= item.boost;
    section.items.push(item);
  }
  return [...sections.values()];
}

export function usePublicSettings() {
  return useQuery({
    queryKey: ["settings"],
    queryFn: () => apiFetch<Settings>("/settings/public"),
    staleTime: 60_000,
  });
}
