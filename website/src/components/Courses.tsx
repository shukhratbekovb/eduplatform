"use client";

import {
  Code2,
  Globe,
  Coffee,
  Smartphone,
  Server,
  Database,
  Shield,
  Palette,
  Languages,
  Cpu,
} from "lucide-react";
import { useT } from "@/lib/i18n";
import AnimatedSection from "./AnimatedSection";
import type { LucideIcon } from "lucide-react";

interface CourseConfig {
  icon: LucideIcon;
  key: "python" | "js" | "java" | "mobile" | "devops" | "datascience" | "cybersecurity" | "uiux" | "english" | "robotics";
  duration: number;
  color: string;
  iconColor: string;
}

const courseConfigs: CourseConfig[] = [
  { icon: Code2, key: "python", duration: 6, color: "from-yellow-400/20 to-yellow-600/5", iconColor: "text-yellow-400" },
  { icon: Globe, key: "js", duration: 6, color: "from-amber-400/20 to-amber-600/5", iconColor: "text-amber-400" },
  { icon: Coffee, key: "java", duration: 8, color: "from-orange-400/20 to-orange-600/5", iconColor: "text-orange-400" },
  { icon: Smartphone, key: "mobile", duration: 7, color: "from-blue-400/20 to-blue-600/5", iconColor: "text-blue-400" },
  { icon: Server, key: "devops", duration: 5, color: "from-violet-400/20 to-violet-600/5", iconColor: "text-violet-400" },
  { icon: Database, key: "datascience", duration: 8, color: "from-emerald-400/20 to-emerald-600/5", iconColor: "text-emerald-400" },
  { icon: Shield, key: "cybersecurity", duration: 6, color: "from-red-400/20 to-red-600/5", iconColor: "text-red-400" },
  { icon: Palette, key: "uiux", duration: 5, color: "from-pink-400/20 to-pink-600/5", iconColor: "text-pink-400" },
  { icon: Languages, key: "english", duration: 4, color: "from-sky-400/20 to-sky-600/5", iconColor: "text-sky-400" },
  { icon: Cpu, key: "robotics", duration: 6, color: "from-teal-400/20 to-teal-600/5", iconColor: "text-teal-400" },
];

export default function Courses() {
  const t = useT();

  return (
    <section id="courses" className="py-24 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <AnimatedSection className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
            {t.courses.heading}
            <span className="gradient-text">{t.courses.headingHighlight}</span>
          </h2>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            {t.courses.subtitle}
          </p>
        </AnimatedSection>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {courseConfigs.map((course, i) => {
            const courseT = t.courses[course.key];
            return (
              <AnimatedSection key={course.key} delay={i * 0.05}>
                <a
                  href="#apply"
                  className="group block p-5 rounded-2xl glass hover:bg-dark-600/60 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-accent/5 h-full"
                >
                  <div
                    className={`w-12 h-12 rounded-xl bg-gradient-to-br ${course.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}
                  >
                    <course.icon className={`w-6 h-6 ${course.iconColor}`} />
                  </div>
                  <h3 className="text-white font-semibold mb-1.5 group-hover:text-accent transition-colors">
                    {courseT.title}
                  </h3>
                  <p className="text-gray-500 text-sm leading-relaxed mb-3">
                    {courseT.desc}
                  </p>
                  <span className="inline-flex items-center text-xs text-accent/70 font-medium">
                    {course.duration} {t.courses.months}
                  </span>
                </a>
              </AnimatedSection>
            );
          })}
        </div>
      </div>
    </section>
  );
}
