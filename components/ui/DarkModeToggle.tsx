"use client"

import { useState, useEffect } from "react"
import { Moon, Sun } from "lucide-react"

export default function DarkModeToggle() {
  const [dark, setDark] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem("ps_theme")
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
    const isDark = stored === "dark" || (!stored && prefersDark)
    setDark(isDark)
    document.documentElement.classList.toggle("dark", isDark)
  }, [])

  const toggle = () => {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle("dark", next)
    localStorage.setItem("ps_theme", next ? "dark" : "light")
  }

  return (
    <button
      onClick={toggle}
      className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors"
      aria-label={dark ? "Modo claro" : "Modo escuro"}
      title={dark ? "Modo claro" : "Modo escuro"}
    >
      {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </button>
  )
}
