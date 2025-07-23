
"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"
import type { ThemeProviderProps } from "next-themes/dist/types"

export function useTheme() {
  const context = React.useContext(ThemeContext)

  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider")
  }

  return context
}

// This is a workaround for the fact that the `useTheme` hook from `next-themes`
// can return `undefined` on the server, which can cause issues with hydration.
// By creating our own context, we can ensure that the value is always defined
// on the client.
//
// We also add the `isMounted` state to prevent hydration mismatches.
// See: https://github.com/pacocoursey/next-themes?tab=readme-ov-file#avoid-hydration-mismatch
const ThemeContext = React.createContext<
  | (ReturnType<typeof useNextThemes> & {
      isMounted: boolean
    })
  | undefined
>(undefined)

// We need to create a custom `useTheme` hook that uses the `useTheme` hook
// from `next-themes` and wraps it in our own context.
const useNextThemes = () => {
  const context = React.useContext(
    (NextThemesProvider as any).useTheme.__PRIVATE__
  )
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider")
  }
  return context as ReturnType<typeof useNextThemes>
}

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  const [isMounted, setIsMounted] = React.useState(false)
  const theme = useNextThemes()

  React.useEffect(() => {
    setIsMounted(true)
  }, [])

  return (
    <NextThemesProvider {...props}>
      <ThemeContext.Provider
        value={{
          ...theme,
          isMounted,
        }}
      >
        {children}
      </ThemeContext.Provider>
    </NextThemesProvider>
  )
}
