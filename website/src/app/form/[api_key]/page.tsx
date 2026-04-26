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
  const [values, setValues] = useState<Record<string, string | boolean>>({});
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    fetch(`${API_URL}/public/forms/${apiKey}`)
      .then((res) => {
        if (!res.ok) throw new Error("Not found");
        return res.json();
      })
      .then((data: FormConfig) => {
        setConfig(data);
        const init: Record<string, string | boolean> = {};
        data.fields.forEach((f) => {
          init[f.name] = f.type === "checkbox" ? false : "";
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

    const customFields: Record<string, string | boolean> = {};
    for (const [key, val] of Object.entries(values)) {
      if (key.startsWith("cf_") && val !== "" && val !== false) {
        customFields[key.replace("cf_", "")] = val;
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

  const setValue = (name: string, val: string | boolean) => {
    setValues((prev) => ({ ...prev, [name]: val }));
  };

  const inputClass =
    "w-full px-4 py-3 rounded-xl bg-dark-700/60 border border-white/5 text-white placeholder:text-gray-600 focus:outline-none focus:border-accent/40 focus:ring-1 focus:ring-accent/20 transition-all";
  const selectClass = `${inputClass} appearance-none`;

  return (
    <div className="min-h-screen bg-[#0A0E17] flex flex-col items-center justify-center px-4 py-12">
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
          className="glass rounded-2xl p-12 text-center max-w-md w-full"
        >
          <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">
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
          className="glass rounded-2xl p-12 text-center max-w-md w-full"
        >
          <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-accent" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">
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
          <div className="text-center mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
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
                  <select
                    required={field.required}
                    value={(values[field.name] as string) || ""}
                    onChange={(e) => setValue(field.name, e.target.value)}
                    className={selectClass}
                  >
                    <option value="" className="bg-dark-800">
                      —
                    </option>
                    {(
                      (field.options as { choices?: string[] }).choices || []
                    ).map((c) => (
                      <option key={c} value={c} className="bg-dark-800">
                        {c}
                      </option>
                    ))}
                  </select>
                ) : field.type === "checkbox" ? (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!values[field.name]}
                      onChange={(e) => setValue(field.name, e.target.checked)}
                      className="w-4 h-4 rounded border-white/10 bg-dark-700/60 text-accent focus:ring-accent/20"
                    />
                    <span className="text-sm text-gray-300">{field.label}</span>
                  </label>
                ) : field.type === "number" ? (
                  <input
                    type="number"
                    required={field.required}
                    value={(values[field.name] as string) || ""}
                    onChange={(e) => setValue(field.name, e.target.value)}
                    className={inputClass}
                  />
                ) : field.type === "date" ? (
                  <input
                    type="date"
                    required={field.required}
                    value={(values[field.name] as string) || ""}
                    onChange={(e) => setValue(field.name, e.target.value)}
                    className={inputClass}
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
