"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { ru } from "./ru";
import { en } from "./en";
import { uz } from "./uz";
import type { Locale, Translations } from "./types";

const translations: Record<Locale, Translations> = { ru, en, uz };

interface I18nState {
  locale: Locale;
  setLocale: (l: Locale) => void;
}

export const useI18nStore = create<I18nState>()(
  persist(
    (set) => ({
      locale: "ru",
      setLocale: (locale) => set({ locale }),
    }),
    { name: "website-locale" }
  )
);

export function useT(): Translations {
  const locale = useI18nStore((s) => s.locale);
  return translations[locale];
}

export type { Locale, Translations };
