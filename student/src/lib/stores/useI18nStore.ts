import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type Lang = 'ru' | 'en'

interface I18nStore {
  lang: Lang
  setLang: (lang: Lang) => void
}

export const useI18nStore = create<I18nStore>()(
  persist(
    (set) => ({
      lang: 'ru',
      setLang: (lang) => set({ lang }),
    }),
    { name: 'student-lang' }
  )
)
