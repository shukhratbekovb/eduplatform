"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Quote } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useT } from "@/lib/i18n";
import AnimatedSection from "./AnimatedSection";

export default function Testimonials() {
  const t = useT();
  const [current, setCurrent] = useState(0);
  const items = t.testimonials.items;

  const prev = () =>
    setCurrent((c) => (c === 0 ? items.length - 1 : c - 1));
  const next = () =>
    setCurrent((c) => (c === items.length - 1 ? 0 : c + 1));

  const item = items[current];

  return (
    <section id="reviews" className="py-12 sm:py-16 lg:py-24 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <AnimatedSection className="text-center mb-10 sm:mb-16">
          <h2 className="text-2xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
            {t.testimonials.heading}
            <span className="gradient-text">{t.testimonials.headingHighlight}</span>
          </h2>
          <p className="text-gray-400 text-base sm:text-lg max-w-2xl mx-auto">
            {t.testimonials.subtitle}
          </p>
        </AnimatedSection>

        <div className="max-w-3xl mx-auto">
          <div className="glass rounded-2xl p-6 sm:p-8 lg:p-12 relative">
            <Quote className="absolute top-6 left-6 w-10 h-10 text-accent/10" />

            <AnimatePresence mode="wait">
              <motion.div
                key={current}
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.3 }}
                className="text-center"
              >
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-accent to-cyan-400 flex items-center justify-center mx-auto mb-4 sm:mb-6">
                  <span className="text-dark-900 font-bold text-sm sm:text-lg">
                    {item.avatar}
                  </span>
                </div>
                <p className="text-gray-300 text-base sm:text-lg leading-relaxed mb-4 sm:mb-6 italic">
                  &ldquo;{item.text}&rdquo;
                </p>
                <p className="text-white font-semibold">{item.name}</p>
                <p className="text-accent text-sm">{item.course}</p>
              </motion.div>
            </AnimatePresence>

            <div className="flex items-center justify-center gap-4 mt-8">
              <button
                onClick={prev}
                className="p-2 rounded-lg glass-light text-gray-400 hover:text-accent transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="flex gap-1.5">
                {items.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrent(i)}
                    className={`w-2 h-2 rounded-full transition-all ${
                      i === current
                        ? "bg-accent w-6"
                        : "bg-gray-600 hover:bg-gray-500"
                    }`}
                  />
                ))}
              </div>
              <button
                onClick={next}
                className="p-2 rounded-lg glass-light text-gray-400 hover:text-accent transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
