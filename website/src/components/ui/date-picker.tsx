"use client";

import * as React from "react";
import { useState, useRef, useEffect, useCallback } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addMonths,
  subMonths,
  addYears,
  subYears,
  setMonth as setMonthFn,
  setYear as setYearFn,
  addDays,
  isSameDay,
  isSameMonth,
  isToday,
  isValid,
  parseISO,
  getYear,
  getMonth,
} from "date-fns";
import { ru, enUS, uz } from "date-fns/locale";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT, useI18nStore } from "@/lib/i18n";

const dateFnsLocales = { ru, en: enUS, uz } as const;

interface DatePickerProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: boolean;
  className?: string;
  minDate?: string;
  maxDate?: string;
}

type ViewMode = "days" | "months" | "years";

function toISO(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

function parseValue(v?: string): Date | null {
  if (!v) return null;
  const d = parseISO(v);
  return isValid(d) ? d : null;
}

function getCalendarDays(month: Date): Date[] {
  const start = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
  const end = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
  const days: Date[] = [];
  let cur = start;
  while (cur <= end) {
    days.push(cur);
    cur = addDays(cur, 1);
  }
  return days;
}

function getYearRange(centerYear: number): number[] {
  const start = centerYear - 5;
  return Array.from({ length: 12 }, (_, i) => start + i);
}

const DatePicker = React.forwardRef<HTMLDivElement, DatePickerProps>(
  (
    { value, onChange, placeholder, disabled, error, className, minDate, maxDate }
  ) => {
    const t = useT();
    const locale = useI18nStore((s) => s.locale);
    const dfLocale = dateFnsLocales[locale] || ru;

    const WEEKDAYS = t.datepicker.weekdays;
    const MONTH_NAMES = t.datepicker.months;

    const [open, setOpen] = useState(false);
    const [viewMonth, setViewMonth] = useState(
      () => parseValue(value) ?? new Date()
    );
    const [mode, setMode] = useState<ViewMode>("days");

    const containerRef = useRef<HTMLDivElement>(null);
    const selected = parseValue(value);
    const minD = parseValue(minDate);
    const maxD = parseValue(maxDate);

    useEffect(() => {
      if (!open) return;
      function handleClick(e: MouseEvent) {
        if (
          containerRef.current &&
          !containerRef.current.contains(e.target as Node)
        ) {
          setOpen(false);
          setMode("days");
        }
      }
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }, [open]);

    useEffect(() => {
      const parsed = parseValue(value);
      if (parsed) setViewMonth(parsed);
    }, [value]);

    const handleSelectDay = useCallback(
      (day: Date) => {
        onChange?.(toISO(day));
        setOpen(false);
        setMode("days");
      },
      [onChange]
    );

    const handleSelectMonth = useCallback(
      (monthIdx: number) => {
        setViewMonth(setMonthFn(viewMonth, monthIdx));
        setMode("days");
      },
      [viewMonth]
    );

    const handleSelectYear = useCallback(
      (year: number) => {
        setViewMonth(setYearFn(viewMonth, year));
        setMode("months");
      },
      [viewMonth]
    );

    const isDisabledDay = useCallback(
      (day: Date) => {
        if (minD && day < minD) return true;
        if (maxD && day > maxD) return true;
        return false;
      },
      [minD, maxD]
    );

    const days = getCalendarDays(viewMonth);
    const currentYear = getYear(viewMonth);
    const currentMonth = getMonth(viewMonth);
    const yearRange = getYearRange(currentYear);

    return (
      <div ref={containerRef} className={cn("relative", className)}>
        {/* Trigger */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            if (!disabled) {
              setOpen(!open);
              setMode("days");
            }
          }}
          className={cn(
            "flex items-center h-12 w-full rounded-xl bg-dark-700/60 border px-4 py-3 text-sm text-left",
            "focus:outline-none focus:border-accent/40 focus:ring-1 focus:ring-accent/20",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "transition-all",
            error ? "border-red-500/50" : "border-white/5"
          )}
        >
          <CalendarDays className="w-4 h-4 text-gray-500 mr-2 shrink-0" />
          <span className={cn(selected ? "text-white" : "text-gray-600")}>
            {selected
              ? format(selected, "d MMMM yyyy", { locale: dfLocale })
              : placeholder ?? t.datepicker.selectDate}
          </span>
        </button>

        {/* Dropdown */}
        {open && (
          <div className="absolute z-50 mt-1 bg-dark-700 rounded-xl border border-white/10 shadow-xl backdrop-blur-xl p-3 w-[280px]">
            {/* Days view */}
            {mode === "days" && (
              <>
                <div className="flex items-center justify-between mb-2">
                  <button
                    type="button"
                    onClick={() => setViewMonth(subMonths(viewMonth, 1))}
                    className="p-1 rounded-lg hover:bg-white/5 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4 text-gray-400" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode("months")}
                    className="text-sm font-semibold text-white hover:text-accent hover:bg-accent/10 px-2 py-0.5 rounded-lg transition-colors capitalize"
                  >
                    {format(viewMonth, "LLLL yyyy", { locale: dfLocale })}
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMonth(addMonths(viewMonth, 1))}
                    className="p-1 rounded-lg hover:bg-white/5 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </button>
                </div>

                <div className="grid grid-cols-7 mb-1">
                  {WEEKDAYS.map((wd) => (
                    <div
                      key={wd}
                      className="text-center text-[10px] font-medium text-gray-500 py-1"
                    >
                      {wd}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7">
                  {days.map((day, i) => {
                    const inMonth = isSameMonth(day, viewMonth);
                    const isSel = selected && isSameDay(day, selected);
                    const isTod = isToday(day);
                    const dis = isDisabledDay(day);
                    return (
                      <button
                        key={i}
                        type="button"
                        disabled={dis}
                        onClick={() => !dis && handleSelectDay(day)}
                        className={cn(
                          "h-8 w-full rounded-lg text-xs font-medium transition-colors",
                          "focus:outline-none focus:ring-1 focus:ring-accent/40",
                          dis && "opacity-30 cursor-not-allowed",
                          !inMonth && !isSel && "text-gray-600",
                          inMonth &&
                            !isSel &&
                            !isTod &&
                            "text-gray-300 hover:bg-white/5",
                          isTod &&
                            !isSel &&
                            "bg-white/5 text-accent font-bold",
                          isSel &&
                            "bg-accent text-dark-900 hover:bg-accent-light"
                        )}
                      >
                        {format(day, "d")}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-2 pt-2 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => {
                      const td = new Date();
                      setViewMonth(td);
                      handleSelectDay(td);
                    }}
                    className="w-full text-xs text-accent hover:text-accent-light font-medium py-1"
                  >
                    {t.datepicker.today}
                  </button>
                </div>
              </>
            )}

            {/* Months view */}
            {mode === "months" && (
              <>
                <div className="flex items-center justify-between mb-3">
                  <button
                    type="button"
                    onClick={() => setViewMonth(subYears(viewMonth, 1))}
                    className="p-1 rounded-lg hover:bg-white/5 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4 text-gray-400" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode("years")}
                    className="text-sm font-semibold text-white hover:text-accent hover:bg-accent/10 px-2 py-0.5 rounded-lg transition-colors"
                  >
                    {currentYear}
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMonth(addYears(viewMonth, 1))}
                    className="p-1 rounded-lg hover:bg-white/5 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {MONTH_NAMES.map((name, idx) => {
                    const isActive = idx === currentMonth;
                    const isCurMonth =
                      idx === new Date().getMonth() &&
                      currentYear === new Date().getFullYear();
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSelectMonth(idx)}
                        className={cn(
                          "py-2.5 rounded-lg text-sm font-medium transition-colors",
                          "focus:outline-none focus:ring-1 focus:ring-accent/40",
                          isActive &&
                            "bg-accent text-dark-900 hover:bg-accent-light",
                          !isActive &&
                            isCurMonth &&
                            "bg-white/5 text-accent font-bold hover:bg-white/10",
                          !isActive &&
                            !isCurMonth &&
                            "text-gray-300 hover:bg-white/5"
                        )}
                      >
                        {name}
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            {/* Years view */}
            {mode === "years" && (
              <>
                <div className="flex items-center justify-between mb-3">
                  <button
                    type="button"
                    onClick={() => setViewMonth(subYears(viewMonth, 12))}
                    className="p-1 rounded-lg hover:bg-white/5 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4 text-gray-400" />
                  </button>
                  <span className="text-sm font-semibold text-white">
                    {yearRange[0]} — {yearRange[yearRange.length - 1]}
                  </span>
                  <button
                    type="button"
                    onClick={() => setViewMonth(addYears(viewMonth, 12))}
                    className="p-1 rounded-lg hover:bg-white/5 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {yearRange.map((yr) => {
                    const isActive = yr === currentYear;
                    const isCurYear = yr === new Date().getFullYear();
                    return (
                      <button
                        key={yr}
                        type="button"
                        onClick={() => handleSelectYear(yr)}
                        className={cn(
                          "py-2.5 rounded-lg text-sm font-medium transition-colors",
                          "focus:outline-none focus:ring-1 focus:ring-accent/40",
                          isActive &&
                            "bg-accent text-dark-900 hover:bg-accent-light",
                          !isActive &&
                            isCurYear &&
                            "bg-white/5 text-accent font-bold hover:bg-white/10",
                          !isActive &&
                            !isCurYear &&
                            "text-gray-300 hover:bg-white/5"
                        )}
                      >
                        {yr}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    );
  }
);
DatePicker.displayName = "DatePicker";

export { DatePicker };
export type { DatePickerProps };
