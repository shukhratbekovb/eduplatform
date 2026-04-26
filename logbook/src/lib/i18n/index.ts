'use client'

/**
 * Модуль интернационализации (i18n) для LMS-приложения.
 *
 * Предоставляет хук useT(), который возвращает функцию перевода t(key).
 * Поддерживаемые языки: русский (ru) и английский (en).
 * При отсутствии перевода на текущем языке используется русский как fallback.
 *
 * @module i18n
 *
 * @example
 * const t = useT()
 * t('nav.dashboard') // => "Дашборд" (ru) или "Dashboard" (en)
 * t('some.missing.key', 'Значение по умолчанию') // => "Значение по умолчанию"
 */

import { ru } from './ru'
import { en } from './en'
import { useI18nStore } from '@/lib/stores/useI18nStore'

/** Словари всех поддерживаемых языков */
const dictionaries: Record<string, Record<string, string>> = { ru, en }

/**
 * React-хук для получения функции перевода.
 *
 * Читает текущий язык из Zustand-стора i18n и возвращает функцию t(key, fallback?),
 * которая ищет перевод в словаре текущего языка, затем в русском (fallback),
 * затем возвращает переданный fallback или сам ключ.
 *
 * @returns Функция перевода t(key: string, fallback?: string) => string
 */
export function useT() {
  const lang = useI18nStore((s) => s.lang)
  const dict = dictionaries[lang] ?? ru

  return (key: string, fallback?: string): string =>
    dict[key] ?? ru[key] ?? fallback ?? key
}
