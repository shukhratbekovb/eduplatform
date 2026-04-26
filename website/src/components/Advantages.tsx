"use client";

import {
  UserCheck,
  RefreshCw,
  Users,
  Rocket,
  Award,
  Briefcase,
} from "lucide-react";
import { useT } from "@/lib/i18n";
import AnimatedSection from "./AnimatedSection";
import type { LucideIcon } from "lucide-react";

const advantageConfigs: { icon: LucideIcon; key: "teachers" | "program" | "smallGroups" | "practice" | "certificate" | "employment" }[] = [
  { icon: UserCheck, key: "teachers" },
  { icon: RefreshCw, key: "program" },
  { icon: Users, key: "smallGroups" },
  { icon: Rocket, key: "practice" },
  { icon: Award, key: "certificate" },
  { icon: Briefcase, key: "employment" },
];

export default function Advantages() {
  const t = useT();

  return (
    <section id="advantages" className="py-12 sm:py-16 lg:py-24 relative">
      <div className="absolute inset-0 bg-dark-800/40" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <AnimatedSection className="text-center mb-10 sm:mb-16">
          <h2 className="text-2xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
            {t.advantages.heading}
            <span className="gradient-text">{t.advantages.headingHighlight}</span>
          </h2>
          <p className="text-gray-400 text-base sm:text-lg max-w-2xl mx-auto">
            {t.advantages.subtitle}
          </p>
        </AnimatedSection>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {advantageConfigs.map((item, i) => {
            const adv = t.advantages[item.key];
            return (
              <AnimatedSection key={item.key} delay={i * 0.08}>
                <div className="group p-6 rounded-2xl glass hover:bg-dark-600/40 transition-all duration-300 h-full">
                  <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-4 group-hover:bg-accent/20 transition-colors">
                    <item.icon className="w-6 h-6 text-accent" />
                  </div>
                  <h3 className="text-white font-semibold text-lg mb-2">
                    {adv.title}
                  </h3>
                  <p className="text-gray-400 text-sm leading-relaxed">
                    {adv.desc}
                  </p>
                </div>
              </AnimatedSection>
            );
          })}
        </div>
      </div>
    </section>
  );
}
