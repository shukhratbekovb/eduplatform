"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  Send,
  CheckCircle,
  AlertCircle,
  Loader2,
  GraduationCap,
  XCircle,
} from "lucide-react";
import { motion } from "framer-motion";
import { useT } from "@/lib/i18n";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

interface FormField {
  name: string;
  label: string;
  type: string;
  required: boolean;
  options?: { choices?: string[] } | null;
}

interface FormConfig {
  sourceName: string;
  funnelName: string;
  fields: FormField[];
}

type PageState = "loading" | "ready" | "submitting" | "success" | "error";

export default function PublicFormPage() {
  const params = useParams();
  const apiKey = params.api_key as string;
  const t = useT();

  const [state, setState] = useState<PageState>("loading");
  const [config, setConfig] = useState<FormConfig | null>(null);
  const [values, setValues] = useState<Record<string, string | boolean | string[]>>({});
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    fetch(`${API_URL}/public/forms/${apiKey}`)
      .then((res) => {
        if (!res.ok) throw new Error("Not found");
        return res.json();
      })
      .then((data: FormConfig) => {
        setConfig(data);
        const init: Record<string, string | boolean | string[]> = {};
        data.fields.forEach((f) => {
          if (f.type === "checkbox") init[f.name] = false;
          else if (f.type === "multiselect") init[f.name] = [];
          else init[f.name] = "";
        });
        setValues(init);
        setState("ready");
      })
      .catch(() => setState("error"));
  }, [apiKey]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState("submitting");
    setSubmitError("");

    const fullName = (values.fullName as string) || "";
    const phone = (values.phone as string) || "";
    const email = (values.email as string) || "";

    const customFields: Record<string, string | boolean | string[]> = {};
    for (const [key, val] of Object.entries(values)) {
      if (key.startsWith("cf_")) {
        const isEmpty = val === "" || val === false || (Array.isArray(val) && val.length === 0);
        if (!isEmpty) customFields[key.replace("cf_", "")] = val;
      }
    }

    try {
      const res = await fetch(`${API_URL}/public/forms/${apiKey}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          phone,
          email: email || null,
          customFields: Object.keys(customFields).length > 0 ? customFields : null,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setState("success");
    } catch {
      setSubmitError(t.publicForm.errorText);
      setState("ready");
    }
  };

  const setValue = (name: string, val: string | boolean | string[]) => {
    setValues((prev) => ({ ...prev, [name]: val }));
  };

  const inputClass =
    "w-full px-4 py-3 rounded-xl bg-dark-700/60 border border-white/5 text-white placeholder:text-gray-600 focus:outline-none focus:border-accent/40 focus:ring-1 focus:ring-accent/20 transition-all";


  return (
    <div className="min-h-screen bg-[#0A0E17] flex flex-col items-center px-4 py-8 sm:py-12 sm:justify-center overflow-x-hidden">
      {/* Logo */}
      <a href="/" className="flex items-center gap-2.5 mb-8 group">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-accent to-cyan-400 flex items-center justify-center">
          <GraduationCap className="w-5 h-5 text-dark-900" />
        </div>
        <span className="text-lg font-bold text-white">
          Edu<span className="text-accent">Platform</span>
        </span>
      </a>

      {/* Loading */}
      {state === "loading" && (
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-accent animate-spin mx-auto mb-3" />
          <p className="text-gray-400 text-sm">{t.publicForm.loading}</p>
        </div>
      )}

      {/* Error — form not found */}
      {state === "error" && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-2xl p-6 sm:p-12 text-center max-w-md w-full"
        >
          <XCircle className="w-10 h-10 sm:w-12 sm:h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-lg sm:text-xl font-bold text-white mb-2">
            {t.publicForm.errorTitle}
          </h2>
          <p className="text-gray-400 text-sm">{t.publicForm.errorDesc}</p>
        </motion.div>
      )}

      {/* Success */}
      {state === "success" && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass rounded-2xl p-6 sm:p-12 text-center max-w-md w-full"
        >
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-accent/20 flex items-center justify-center mx-auto mb-4 sm:mb-6">
            <CheckCircle className="w-7 h-7 sm:w-8 sm:h-8 text-accent" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-3">
            {t.publicForm.successTitle}
          </h2>
          <p className="text-gray-400">{t.publicForm.successText}</p>
        </motion.div>
      )}

      {/* Form */}
      {(state === "ready" || state === "submitting") && config && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-lg"
        >
          {/* Header */}
          <div className="text-center mb-6 sm:mb-8">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white mb-2">
              {config.sourceName}
            </h1>
            <p className="text-gray-500 text-sm">{config.funnelName}</p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="glass rounded-2xl p-6 sm:p-8 space-y-5"
          >
            {config.fields.map((field) => (
              <div key={field.name}>
                <label className="block text-sm text-gray-400 mb-1.5">
                  {field.label}
                  {field.required && (
                    <span className="text-accent ml-1">*</span>
                  )}
                </label>

                {field.type === "select" && field.options ? (
                  <Select
                    value={(values[field.name] as string) || undefined}
                    onValueChange={(v) => setValue(field.name, v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="—" />
                    </SelectTrigger>
                    <SelectContent>
                      {(
                        (field.options as { choices?: string[] }).choices || []
                      ).map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : field.type === "multiselect" && field.options ? (() => {
                  const selected = Array.isArray(values[field.name]) ? values[field.name] as string[] : [];
                  const choices = (field.options as { choices?: string[] }).choices || [];
                  const toggle = (opt: string) => {
                    const next = selected.includes(opt)
                      ? selected.filter((v) => v !== opt)
                      : [...selected, opt];
                    setValue(field.name, next);
                  };
                  return (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {choices.map((opt) => {
                        const active = selected.includes(opt);
                        return (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => toggle(opt)}
                            className={`text-sm px-3 py-1.5 rounded-lg border transition-all ${
                              active
                                ? "bg-accent/20 border-accent text-accent"
                                : "border-white/10 text-gray-400 hover:border-accent/30 hover:text-gray-300"
                            }`}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  );
                })() : field.type === "checkbox" ? (
                  <button
                    type="button"
                    onClick={() => setValue(field.name, !values[field.name])}
                    className="flex items-center gap-3 cursor-pointer group"
                  >
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
                      values[field.name]
                        ? "bg-accent border-accent"
                        : "border-white/20 group-hover:border-accent/50"
                    }`}>
                      {values[field.name] && (
                        <svg className="w-3 h-3 text-dark-900" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <span className={`text-sm transition-colors ${
                      values[field.name] ? "text-accent" : "text-gray-400"
                    }`}>
                      {field.label}
                    </span>
                  </button>
                ) : field.type === "number" ? (
                  <input
                    type="number"
                    required={field.required}
                    value={(values[field.name] as string) || ""}
                    onChange={(e) => setValue(field.name, e.target.value)}
                    className={inputClass}
                  />
                ) : field.type === "date" ? (
                  <DatePicker
                    value={(values[field.name] as string) || undefined}
                    onChange={(v) => setValue(field.name, v)}
                  />
                ) : (
                  <input
                    type={field.name === "email" ? "email" : "text"}
                    required={field.required}
                    value={(values[field.name] as string) || ""}
                    onChange={(e) => setValue(field.name, e.target.value)}
                    className={inputClass}
                  />
                )}
              </div>
            ))}

            {submitError && (
              <div className="flex items-center gap-2 text-red-400 text-sm bg-red-400/10 rounded-lg px-4 py-3">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {submitError}
              </div>
            )}

            <button
              type="submit"
              disabled={state === "submitting"}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-accent text-dark-900 font-semibold text-lg hover:bg-accent-light transition-all hover:shadow-lg hover:shadow-accent/20 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {state === "submitting" ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
              {t.publicForm.submitBtn}
            </button>
          </form>

          <p className="text-center text-xs text-gray-700 mt-6">
            {t.publicForm.poweredBy}
          </p>
        </motion.div>
      )}
    </div>
  );
}
