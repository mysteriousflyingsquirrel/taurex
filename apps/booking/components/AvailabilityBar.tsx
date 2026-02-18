"use client";

import GuestStepper from "./GuestStepper";
import DateRangePicker from "./DateRangePicker";
import { t } from "../lib/i18n";

interface AvailabilityBarProps {
  checkIn: string;
  checkOut: string;
  guests: number;
  onlyAvailable: boolean;
  lang: string;
  onCheckInChange: (date: string) => void;
  onCheckOutChange: (date: string) => void;
  onGuestsChange: (guests: number) => void;
  onOnlyAvailableChange: (checked: boolean) => void;
  onReset: () => void;
}

export default function AvailabilityBar({ checkIn, checkOut, guests, onlyAvailable, lang, onCheckInChange, onCheckOutChange, onGuestsChange, onOnlyAvailableChange, onReset }: AvailabilityBarProps) {
  const hasFilters = checkIn || checkOut || guests > 1 || onlyAvailable;
  const hasDates = checkIn && checkOut;
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-end gap-4">
        <div className="min-w-[260px] flex-1">
          <label className="mb-1 block text-xs font-medium text-gray-500">{t(lang, "filter.dateRange")}</label>
          <DateRangePicker checkIn={checkIn} checkOut={checkOut} onCheckInChange={onCheckInChange} onCheckOutChange={onCheckOutChange} />
        </div>
        <div><GuestStepper value={guests} onChange={onGuestsChange} label={t(lang, "filter.guests")} /></div>
        <label className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${hasDates ? "cursor-pointer border-gray-300 hover:border-indigo-400" : "cursor-not-allowed border-gray-200 opacity-50"}`}>
          <input type="checkbox" checked={onlyAvailable} disabled={!hasDates} onChange={(e) => onOnlyAvailableChange(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 disabled:opacity-50" />
          <span className="whitespace-nowrap text-gray-700">{t(lang, "filter.onlyAvailable")}</span>
        </label>
        {hasFilters && (
          <button onClick={onReset} className="rounded-lg px-3 py-2 text-sm font-medium text-gray-500 transition hover:bg-gray-100 hover:text-gray-700">{t(lang, "filter.reset")}</button>
        )}
      </div>
    </div>
  );
}
