/**
 * Стор интернационализации (Zustand + persist).
 *
 * Хранит выбранный язык интерфейса в localStorage под ключом 'logbook-lang'.
 * Язык по умолчанию: русский ('ru').
 * Поддерживаемые языки: 'ru' (русский), 'en' (английский).
 *
 * @module useI18nStore
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/** Поддерживаемые коды языков */
export type Lang = 'ru' | 'en'

/** Интерфейс стора i18n */
interface I18nStore {
  /** Текущий язык интерфейса */
  lang: Lang
  /** Установить новый язык */
  setLang: (l: Lang) => void
}

/**
 * Zustand-стор для управления языком интерфейса.
 * Персистируется в localStorage для сохранения выбора между сессиями.
 */
export const useI18nStore = create<I18nStore>()(
  persist(
    (set) => ({ lang: 'ru', setLang: (lang) => set({ lang }) }),
    { name: 'logbook-lang' },
  ),
)
