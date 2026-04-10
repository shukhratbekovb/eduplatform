import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Lang = 'ru' | 'en'

interface I18nStore {
  lang: Lang
  setLang: (l: Lang) => void
}

export const useI18nStore = create<I18nStore>()(
  persist(
    (set) => ({ lang: 'ru', setLang: (lang) => set({ lang }) }),
    { name: 'edu-lang' }
  )
)
