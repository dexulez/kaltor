'use client'

import { createContext, useContext } from 'react'
import type { Lang } from '@/lib/i18n/landing'

type LangCtxValue = { lang: Lang; setLang: (l: Lang) => void }
export const LangContext = createContext<LangCtxValue>({ lang: 'es', setLang: () => {} })
export function useLang() { return useContext(LangContext) }
