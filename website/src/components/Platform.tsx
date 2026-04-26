"use client";

import {
  CalendarDays,
  Star,
  FileText,
  BarChart3,
  Gem,
  Trophy,
  ShoppingBag,
} from "lucide-react";
import { useT } from "@/lib/i18n";
import AnimatedSection from "./AnimatedSection";
import type { LucideIcon } from "lucide-react";

const featureConfigs: { icon: LucideIcon; key: "schedule" | "progress" | "homework" | "gamification" | "achievements" | "shop" }[] = [
  { icon: CalendarDays, key: "schedule" },
  { icon: BarChart3, key: "progress" },
  { icon: FileText, key: "homework" },
  { icon: Star, key: "gamification" },
  { icon: Trophy, key: "achievements" },
  { icon: ShoppingBag, key: "shop" },
];

function MockupCard() {
  const t = useT();

  return (
    <div className="relative">
      <div className="w-[280px] sm:w-[320px] mx-auto">
        <div className="rounded-[2rem] glass-light p-3 shadow-2xl shadow-accent/5">
          <div className="rounded-[1.5rem] bg-dark-900 overflow-hidden">
            <div className="flex justify-between items-center px-5 pt-3 pb-2">
              <span className="text-[10px] text-gray-500">9:41</span>
              <div className="flex gap-1">
                <div className="w-3 h-1.5 rounded-sm bg-gray-600" />
                <div className="w-3 h-1.5 rounded-sm bg-gray-600" />
              </div>
            </div>

            <div className="px-5 pb-4">
              <p className="text-xs text-gray-500 mb-0.5">{t.platform.welcome}</p>
              <p className="text-sm font-semibold text-white">Aleksey K.</p>
            </div>

            <div className="px-5 flex gap-2 mb-4">
              <div className="flex-1 bg-dark-700 rounded-xl p-3 text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Star className="w-3 h-3 text-yellow-400" />
                  <span className="text-sm font-bold text-white">342</span>
                </div>
                <p className="text-[9px] text-gray-500">{t.platform.stars}</p>
              </div>
              <div className="flex-1 bg-dark-700 rounded-xl p-3 text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Gem className="w-3 h-3 text-cyan-400" />
                  <span className="text-sm font-bold text-white">28</span>
                </div>
                <p className="text-[9px] text-gray-500">{t.platform.diamonds}</p>
              </div>
              <div className="flex-1 bg-dark-700 rounded-xl p-3 text-center">
                <p className="text-sm font-bold text-accent mb-1">8.7</p>
                <p className="text-[9px] text-gray-500">GPA</p>
              </div>
            </div>

            <div className="px-5 pb-5">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">
                {t.platform.today}
              </p>
              {[
                { time: "10:00", subject: "Python", room: "301" },
                { time: "12:00", subject: "Algorithms", room: "305" },
                { time: "14:00", subject: "Git & Linux", room: "302" },
              ].map((item) => (
                <div
                  key={item.time}
                  className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0"
                >
                  <span className="text-xs text-accent font-mono w-10">
                    {item.time}
                  </span>
                  <span className="text-xs text-white flex-1">
                    {item.subject}
                  </span>
                  <span className="text-[10px] text-gray-600">
                    {t.platform.room} {item.room}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="absolute inset-0 -z-10 bg-accent/5 blur-[80px] rounded-full" />
    </div>
  );
}

export default function Platform() {
  const t = useT();

  return (
    <section id="platform" className="py-24 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <AnimatedSection className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
            {t.platform.heading}
            <span className="gradient-text">{t.platform.headingHighlight}</span>
          </h2>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            {t.platform.subtitle}
          </p>
        </AnimatedSection>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          <AnimatedSection className="order-2 lg:order-1 flex justify-center">
            <MockupCard />
          </AnimatedSection>

          <div className="order-1 lg:order-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {featureConfigs.map((f, i) => {
              const feat = t.platform.features[f.key];
              return (
                <AnimatedSection key={f.key} delay={i * 0.08}>
                  <div className="group flex gap-3 p-4 rounded-xl hover:bg-dark-700/40 transition-colors">
                    <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0 group-hover:bg-accent/20 transition-colors">
                      <f.icon className="w-5 h-5 text-accent" />
                    </div>
                    <div>
                      <h4 className="text-white font-medium text-sm mb-0.5">
                        {feat.title}
                      </h4>
                      <p className="text-gray-500 text-xs leading-relaxed">
                        {feat.desc}
                      </p>
                    </div>
                  </div>
                </AnimatedSection>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
