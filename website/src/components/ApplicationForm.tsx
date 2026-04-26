"use client";

import { useState } from "react";
import { Send, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { useT } from "@/lib/i18n";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import AnimatedSection from "./AnimatedSection";

const directionKeys = [
  "python", "js", "java", "mobile", "devops",
  "datascience", "cybersecurity", "uiux", "english", "robotics",
] as const;

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export default function ApplicationForm() {
  const t = useT();
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    direction: "",
    comment: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const directionTitle = form.direction
        ? t.courses[form.direction as keyof typeof t.courses]
        : null;

      const res = await fetch(`${API_URL}/public/website-lead`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: form.name,
          phone: form.phone,
          email: form.email || null,
          direction:
            directionTitle && typeof directionTitle === "object"
              ? directionTitle.title
              : form.direction || null,
          comment: form.comment || null,
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      setSubmitted(true);
    } catch {
      setError(t.form.errorText);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <section id="apply" className="py-12 sm:py-16 lg:py-24 relative">
        <div className="max-w-xl mx-auto px-4 text-center">
          <AnimatedSection>
            <div className="glass rounded-2xl p-6 sm:p-12">
              <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-8 h-8 text-accent" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">
                {t.form.successTitle}
              </h3>
              <p className="text-gray-400">{t.form.successText}</p>
            </div>
          </AnimatedSection>
        </div>
      </section>
    );
  }

  return (
    <section id="apply" className="py-12 sm:py-16 lg:py-24 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent/5 rounded-full blur-[150px]" />

      <div className="relative max-w-xl mx-auto px-4 sm:px-6 lg:px-8">
        <AnimatedSection className="text-center mb-8 sm:mb-12">
          <h2 className="text-2xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
            {t.form.heading}
            <span className="gradient-text">{t.form.headingHighlight}</span>
          </h2>
          <p className="text-gray-400 text-base sm:text-lg">{t.form.subtitle}</p>
        </AnimatedSection>

        <AnimatedSection delay={0.15}>
          <form
            onSubmit={handleSubmit}
            className="glass rounded-2xl p-6 sm:p-8 space-y-5"
          >
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">
                {t.form.name}
              </label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder={t.form.namePlaceholder}
                className="w-full px-4 py-3 rounded-xl bg-dark-700/60 border border-white/5 text-white placeholder:text-gray-600 focus:outline-none focus:border-accent/40 focus:ring-1 focus:ring-accent/20 transition-all"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1.5">
                {t.form.phone}
              </label>
              <input
                type="tel"
                required
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder={t.form.phonePlaceholder}
                className="w-full px-4 py-3 rounded-xl bg-dark-700/60 border border-white/5 text-white placeholder:text-gray-600 focus:outline-none focus:border-accent/40 focus:ring-1 focus:ring-accent/20 transition-all"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1.5">
                {t.form.email}{" "}
                <span className="text-gray-600">{t.form.commentOptional}</span>
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder={t.form.emailPlaceholder}
                className="w-full px-4 py-3 rounded-xl bg-dark-700/60 border border-white/5 text-white placeholder:text-gray-600 focus:outline-none focus:border-accent/40 focus:ring-1 focus:ring-accent/20 transition-all"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1.5">
                {t.form.direction}
              </label>
              <Select
                value={form.direction || undefined}
                onValueChange={(v) => setForm({ ...form, direction: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t.form.directionPlaceholder} />
                </SelectTrigger>
                <SelectContent>
                  {directionKeys.map((key) => (
                    <SelectItem key={key} value={key}>
                      {t.courses[key].title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1.5">
                {t.form.comment}{" "}
                <span className="text-gray-600">{t.form.commentOptional}</span>
              </label>
              <textarea
                rows={3}
                value={form.comment}
                onChange={(e) =>
                  setForm({ ...form, comment: e.target.value })
                }
                placeholder={t.form.commentPlaceholder}
                className="w-full px-4 py-3 rounded-xl bg-dark-700/60 border border-white/5 text-white placeholder:text-gray-600 focus:outline-none focus:border-accent/40 focus:ring-1 focus:ring-accent/20 transition-all resize-none"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-400 text-sm bg-red-400/10 rounded-lg px-4 py-3">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-accent text-dark-900 font-semibold text-lg hover:bg-accent-light transition-all hover:shadow-lg hover:shadow-accent/20 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
              {t.form.submit}
            </button>

            <p className="text-center text-xs text-gray-600">
              {t.form.consent}
            </p>
          </form>
        </AnimatedSection>
      </div>
    </section>
  );
}
