"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Menu, X, GraduationCap, Globe } from "lucide-react";
import { useT, useI18nStore, type Locale } from "@/lib/i18n";

const localeLabels: Record<Locale, string> = {
  ru: "RU",
  uz: "UZ",
  en: "EN",
};

const localeOrder: Locale[] = ["ru", "uz", "en"];

export default function Header() {
  const t = useT();
  const { locale, setLocale } = useI18nStore();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const navLinks = [
    { href: "#courses", label: t.header.courses },
    { href: "#advantages", label: t.header.advantages },
    { href: "#platform", label: t.header.platform },
    { href: "#reviews", label: t.header.reviews },
    { href: "#faq", label: t.header.faq },
  ];

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? "glass shadow-lg shadow-black/20" : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* Logo */}
          <a href="#" className="flex items-center gap-2 sm:gap-2.5 group min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-gradient-to-br from-accent to-cyan-400 flex items-center justify-center shrink-0 group-hover:shadow-lg group-hover:shadow-accent/25 transition-shadow">
              <GraduationCap className="w-4 h-4 sm:w-5 sm:h-5 text-dark-900" />
            </div>
            <span className="text-base sm:text-lg font-bold text-white truncate">
              Edu<span className="text-accent">Platform</span>
            </span>
          </a>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="px-4 py-2 text-sm text-gray-300 hover:text-accent transition-colors rounded-lg hover:bg-white/5"
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* CTA + Lang */}
          <div className="hidden md:flex items-center gap-3">
            {/* Language switcher */}
            <div className="relative">
              <button
                onClick={() => setLangOpen(!langOpen)}
                className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-300 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
              >
                <Globe className="w-4 h-4" />
                {localeLabels[locale]}
              </button>
              {langOpen && (
                <div className="absolute top-full right-0 mt-1 glass rounded-lg overflow-hidden min-w-[80px] shadow-xl">
                  {localeOrder.map((l) => (
                    <button
                      key={l}
                      onClick={() => {
                        setLocale(l);
                        setLangOpen(false);
                      }}
                      className={`block w-full px-4 py-2 text-sm text-left transition-colors ${
                        l === locale
                          ? "text-accent bg-accent/10"
                          : "text-gray-300 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      {localeLabels[l]}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <a
              href="#apply"
              className="px-5 py-2.5 text-sm font-medium rounded-lg bg-accent text-dark-900 hover:bg-accent-light transition-all hover:shadow-lg hover:shadow-accent/25"
            >
              {t.header.apply}
            </a>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 text-gray-300 hover:text-white"
          >
            {mobileOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile nav */}
      {mobileOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="md:hidden glass border-t border-white/5 max-h-[80vh] overflow-y-auto"
        >
          <div className="px-4 py-4 space-y-1">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="block px-4 py-3 text-gray-300 hover:text-accent hover:bg-white/5 rounded-lg transition-colors"
              >
                {link.label}
              </a>
            ))}

            {/* Mobile language switcher */}
            <div className="flex flex-wrap gap-2 px-4 py-3">
              {localeOrder.map((l) => (
                <button
                  key={l}
                  onClick={() => {
                    setLocale(l);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    l === locale
                      ? "bg-accent text-dark-900"
                      : "text-gray-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  {localeLabels[l]}
                </button>
              ))}
            </div>

            <a
              href="#apply"
              onClick={() => setMobileOpen(false)}
              className="block mt-3 px-4 py-3 text-center font-medium rounded-lg bg-accent text-dark-900"
            >
              {t.header.apply}
            </a>
          </div>
        </motion.div>
      )}
    </motion.header>
  );
}
