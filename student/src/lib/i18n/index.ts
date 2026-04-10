'use client'
import { ru } from './ru'
import { en } from './en'
import { useI18nStore } from '@/lib/stores/useI18nStore'

const dictionaries: Record<string, Record<string, string>> = { ru, en }

export function useT() {
  const lang = useI18nStore((s) => s.lang)
  const dict = dictionaries[lang] ?? ru

  return (key: string, fallback?: string): string =>
    dict[key] ?? ru[key] ?? fallback ?? key
}
