"use client";

import { GraduationCap, Phone, Mail, MapPin, Send } from "lucide-react";
import { useT } from "@/lib/i18n";

export default function Footer() {
  const t = useT();

  const navLinks = [
    { label: t.header.courses, href: "#courses" },
    { label: t.header.advantages, href: "#advantages" },
    { label: t.header.platform, href: "#platform" },
    { label: t.header.reviews, href: "#reviews" },
    { label: t.header.faq, href: "#faq" },
  ];

  const courseLinks = [
    "python", "js", "java", "mobile", "devops", "datascience", "uiux",
  ] as const;

  return (
    <footer className="border-t border-white/5 bg-dark-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-10">
          {/* Brand */}
          <div>
            <a href="#" className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-accent to-cyan-400 flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-dark-900" />
              </div>
              <span className="text-lg font-bold text-white">
                Edu<span className="text-accent">Platform</span>
              </span>
            </a>
            <p className="text-gray-500 text-sm leading-relaxed mb-4">
              {t.footer.description}
            </p>
            <div className="flex gap-2">
              <a
                href="#"
                className="w-9 h-9 rounded-lg glass-light flex items-center justify-center text-gray-400 hover:text-accent hover:bg-accent/10 transition-all"
                aria-label="Telegram"
              >
                <Send className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Navigation */}
          <div>
            <h4 className="text-white font-semibold mb-4">
              {t.footer.navigation}
            </h4>
            <ul className="space-y-2.5">
              {navLinks.map((l) => (
                <li key={l.href}>
                  <a
                    href={l.href}
                    className="text-gray-500 text-sm hover:text-accent transition-colors"
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Courses */}
          <div>
            <h4 className="text-white font-semibold mb-4">
              {t.footer.courses}
            </h4>
            <ul className="space-y-2.5">
              {courseLinks.map((key) => (
                <li key={key}>
                  <a
                    href="#courses"
                    className="text-gray-500 text-sm hover:text-accent transition-colors"
                  >
                    {t.courses[key].title}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contacts */}
          <div>
            <h4 className="text-white font-semibold mb-4">
              {t.footer.contacts}
            </h4>
            <ul className="space-y-3">
              <li className="flex items-center gap-2.5 text-gray-500 text-sm">
                <Phone className="w-4 h-4 text-accent flex-shrink-0" />
                +998 71 200 00 00
              </li>
              <li className="flex items-center gap-2.5 text-gray-500 text-sm">
                <Mail className="w-4 h-4 text-accent flex-shrink-0" />
                info@eduplatform.uz
              </li>
              <li className="flex items-start gap-2.5 text-gray-500 text-sm">
                <MapPin className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
                Tashkent
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-gray-600 text-xs">
            &copy; {new Date().getFullYear()} EduPlatform. {t.footer.rights}
          </p>
          <p className="text-gray-700 text-xs">
            {t.footer.poweredBy}{" "}
            <span className="text-accent/60">EduPlatform</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
