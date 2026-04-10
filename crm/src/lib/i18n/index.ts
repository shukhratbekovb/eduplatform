import { useI18nStore } from '@/lib/stores/useI18nStore'
import { ru } from './ru'
import { en } from './en'

const dicts = { ru, en }

/** Returns a translation function for the current language. */
export function useT() {
  const lang = useI18nStore((s) => s.lang)
  const dict = dicts[lang]
  return (key: string, fallback?: string): string =>
    dict[key] ?? fallback ?? key
}
