import { useState, useRef, useEffect, useMemo } from "react";
import { formatDate } from "../i18n";

interface DateRangePickerProps {
  checkIn: string;
  checkOut: string;
  onCheckInChange: (date: string) => void;
  onCheckOutChange: (date: string) => void;
  placeholderFrom?: string;
  placeholderTo?: string;
}

const DAY_HEADERS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

function pad2(n: number): string {
  return n.toString().padStart(2, "0");
}

function toDateStr(year: number, month: number, day: number): string {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function firstWeekday(year: number, month: number): number {
  const d = new Date(year, month - 1, 1).getDay();
  return d === 0 ? 6 : d - 1; // Monday = 0
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function addMonths(year: number, month: number, count: number): { year: number; month: number } {
  const m = month - 1 + count;
  return {
    year: year + Math.floor(m / 12),
    month: (((m % 12) + 12) % 12) + 1,
  };
}

export default function DateRangePicker({
  checkIn,
  checkOut,
  onCheckInChange,
  onCheckOutChange,
  placeholderFrom = "dd.mm.yyyy",
  placeholderTo = "dd.mm.yyyy",
}: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const [hoverDay, setHoverDay] = useState<string | null>(null);
  // "selecting" tracks what the next click will set
  const [selecting, setSelecting] = useState<"checkIn" | "checkOut">(
    checkIn ? "checkOut" : "checkIn"
  );

  const now = new Date();
  const todayStr = toDateStr(now.getFullYear(), now.getMonth() + 1, now.getDate());

  // Base month for the left calendar
  const [baseYear, setBaseYear] = useState(now.getFullYear());
  const [baseMonth, setBaseMonth] = useState(now.getMonth() + 1);

  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const rightMonth = useMemo(() => addMonths(baseYear, baseMonth, 1), [baseYear, baseMonth]);

  const goBack = () => {
    const prev = addMonths(baseYear, baseMonth, -1);
    // Don't go before current month
    const nowMonth = now.getFullYear() * 12 + now.getMonth();
    const prevMonth = prev.year * 12 + (prev.month - 1);
    if (prevMonth >= nowMonth) {
      setBaseYear(prev.year);
      setBaseMonth(prev.month);
    }
  };

  const goForward = () => {
    const next = addMonths(baseYear, baseMonth, 1);
    setBaseYear(next.year);
    setBaseMonth(next.month);
  };

  const handleDayClick = (day: string) => {
    if (day < todayStr) return;

    if (selecting === "checkIn") {
      onCheckInChange(day);
      // If there's a checkout that's before or equal, clear it
      if (checkOut && day >= checkOut) {
        onCheckOutChange("");
      }
      setSelecting("checkOut");
    } else {
      // selecting === "checkOut"
      if (day <= checkIn) {
        // User clicked before check-in, restart
        onCheckInChange(day);
        onCheckOutChange("");
        setSelecting("checkOut");
      } else {
        onCheckOutChange(day);
        setSelecting("checkIn");
        setOpen(false);
      }
    }
  };

  const handleOpen = () => {
    setOpen(true);
    // Reset base to current month when opening
    setBaseYear(now.getFullYear());
    setBaseMonth(now.getMonth() + 1);
    if (!checkIn) setSelecting("checkIn");
    else if (!checkOut) setSelecting("checkOut");
    else setSelecting("checkIn");
  };

  const displayValue = () => {
    const from = checkIn ? formatDate(checkIn) : placeholderFrom;
    const to = checkOut ? formatDate(checkOut) : placeholderTo;
    return `${from}  –  ${to}`;
  };

  const isInRange = (day: string): boolean => {
    if (checkIn && checkOut) {
      return day >= checkIn && day <= checkOut;
    }
    if (checkIn && !checkOut && hoverDay && hoverDay > checkIn && selecting === "checkOut") {
      return day >= checkIn && day <= hoverDay;
    }
    return false;
  };

  const isStart = (day: string) => day === checkIn;
  const isEnd = (day: string) => day === checkOut;

  return (
    <div ref={ref} className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={handleOpen}
        className={`w-full rounded-lg border bg-white px-3 py-2 text-left text-sm transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none ${
          checkIn || checkOut
            ? "border-gray-300 text-gray-900"
            : "border-gray-300 text-gray-400"
        }`}
      >
        {displayValue()}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 rounded-xl border border-gray-200 bg-white p-4 shadow-xl">
          {/* Navigation */}
          <div className="mb-3 flex items-center justify-between">
            <button
              onClick={goBack}
              className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
              aria-label="Previous month"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="flex gap-8 text-sm font-semibold text-gray-900">
              <span>{MONTH_NAMES[baseMonth - 1]} {baseYear}</span>
              <span>{MONTH_NAMES[rightMonth.month - 1]} {rightMonth.year}</span>
            </div>
            <button
              onClick={goForward}
              className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
              aria-label="Next month"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Two month grids */}
          <div className="flex gap-6">
            <MonthGrid
              year={baseYear}
              month={baseMonth}
              todayStr={todayStr}
              isInRange={isInRange}
              isStart={isStart}
              isEnd={isEnd}
              onDayClick={handleDayClick}
              onDayHover={setHoverDay}
            />
            <MonthGrid
              year={rightMonth.year}
              month={rightMonth.month}
              todayStr={todayStr}
              isInRange={isInRange}
              isStart={isStart}
              isEnd={isEnd}
              onDayClick={handleDayClick}
              onDayHover={setHoverDay}
            />
          </div>

          {/* Hint */}
          <p className="mt-3 text-center text-xs text-gray-400">
            {selecting === "checkIn" ? "Select check-in date" : "Select check-out date"}
          </p>
        </div>
      )}
    </div>
  );
}

/* ─── Month Grid ─── */

function MonthGrid({
  year,
  month,
  todayStr,
  isInRange,
  isStart,
  isEnd,
  onDayClick,
  onDayHover,
}: {
  year: number;
  month: number;
  todayStr: string;
  isInRange: (day: string) => boolean;
  isStart: (day: string) => boolean;
  isEnd: (day: string) => boolean;
  onDayClick: (day: string) => void;
  onDayHover: (day: string) => void;
}) {
  const days = daysInMonth(year, month);
  const offset = firstWeekday(year, month);

  return (
    <div className="w-[252px]">
      {/* Day headers */}
      <div className="grid grid-cols-7 gap-0 text-center">
        {DAY_HEADERS.map((d) => (
          <span key={d} className="pb-2 text-xs font-medium text-gray-400">
            {d}
          </span>
        ))}
      </div>

      {/* Days */}
      <div className="grid grid-cols-7 gap-0">
        {Array.from({ length: offset }, (_, i) => (
          <span key={`e${i}`} />
        ))}
        {Array.from({ length: days }, (_, i) => {
          const day = toDateStr(year, month, i + 1);
          const disabled = day < todayStr;
          const inRange = isInRange(day);
          const start = isStart(day);
          const end = isEnd(day);
          const isEndpoint = start || end;

          return (
            <button
              key={day}
              type="button"
              disabled={disabled}
              onClick={() => onDayClick(day)}
              onMouseEnter={() => onDayHover(day)}
              className={`flex h-9 w-9 items-center justify-center text-sm transition-colors ${
                disabled
                  ? "cursor-not-allowed text-gray-300"
                  : isEndpoint
                    ? "rounded-full bg-indigo-600 font-semibold text-white"
                    : inRange
                      ? "bg-indigo-100 text-indigo-700"
                      : "text-gray-700 hover:rounded-full hover:bg-gray-100"
              }`}
            >
              {i + 1}
            </button>
          );
        })}
      </div>
    </div>
  );
}
