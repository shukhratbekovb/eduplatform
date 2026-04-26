"use client";

import { MessageSquare, Users, Code2, Trophy } from "lucide-react";
import { useT } from "@/lib/i18n";
import AnimatedSection from "./AnimatedSection";
import type { LucideIcon } from "lucide-react";

const stepConfigs: { step: string; icon: LucideIcon; key: "step1" | "step2" | "step3" | "step4" }[] = [
  { step: "01", icon: MessageSquare, key: "step1" },
  { step: "02", icon: Users, key: "step2" },
  { step: "03", icon: Code2, key: "step3" },
  { step: "04", icon: Trophy, key: "step4" },
];

export default function HowItWorks() {
  const t = useT();

  return (
    <section className="py-12 sm:py-16 lg:py-24 relative">
      <div className="absolute inset-0 bg-dark-800/40" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <AnimatedSection className="text-center mb-10 sm:mb-16">
          <h2 className="text-2xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
            {t.howItWorks.heading}
            <span className="gradient-text">{t.howItWorks.headingHighlight}</span>
          </h2>
          <p className="text-gray-400 text-base sm:text-lg max-w-2xl mx-auto">
            {t.howItWorks.subtitle}
          </p>
        </AnimatedSection>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stepConfigs.map((item, i) => {
            const s = t.howItWorks[item.key];
            return (
              <AnimatedSection key={item.step} delay={i * 0.1}>
                <div className="relative p-5 sm:p-6 rounded-2xl glass h-full group hover:bg-dark-600/40 transition-all">
                  <span className="text-4xl sm:text-5xl font-black text-accent/10 absolute top-4 right-4 group-hover:text-accent/20 transition-colors">
                    {item.step}
                  </span>
                  <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-5 group-hover:bg-accent/20 transition-colors">
                    <item.icon className="w-6 h-6 text-accent" />
                  </div>
                  <h3 className="text-white font-semibold text-base sm:text-lg mb-2 pr-10">
                    {s.title}
                  </h3>
                  <p className="text-gray-400 text-sm leading-relaxed">
                    {s.desc}
                  </p>
                  {i < stepConfigs.length - 1 && (
                    <div className="hidden lg:block absolute top-1/2 -right-3 w-6 border-t border-dashed border-accent/20" />
                  )}
                </div>
              </AnimatedSection>
            );
          })}
        </div>
      </div>
    </section>
  );
}
