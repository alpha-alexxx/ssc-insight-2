"use client";
import { useState } from "react";
import { durationSeconds } from "@/lib/mock-entry";

export function DurationInput({
  subjectName,
  value,
  onChange,
}: {
  subjectName: string;
  value: number | null | undefined;
  onChange: (seconds: number) => void;
}) {
  const [parts, setParts] = useState(() =>
    value == null
      ? ["", "", ""]
      : [Math.floor(value / 3600), Math.floor(value / 60) % 60, value % 60].map(
          (n) => String(n).padStart(2, "0"),
        ),
  );
  function change(index: number, value: string) {
    const next = parts.map((part, i) => (i === index ? value : part));
    setParts(next);
    onChange(durationSeconds(next));
  }
  return (
    <fieldset className="col-span-2 min-w-0 lg:col-span-1">
      <legend className="mb-[7px] text-xs font-medium text-muted lg:sr-only">
        Time (hh:mm:ss)
      </legend>
      <div className="flex h-10 items-center gap-1 tabular">
        {["hours", "minutes", "seconds"].map((unit, index) => (
          <div key={unit} className="contents">
            {index > 0 && (
              <span aria-hidden="true" className="text-muted">
                :
              </span>
            )}
            <input
              aria-label={`${subjectName} ${unit}`}
              type="number"
              inputMode="numeric"
              min={0}
              max={index === 0 ? 23 : 59}
              step={1}
              placeholder="00"
              className="min-w-0 flex-1 !px-1 !text-center [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              value={parts[index]}
              onChange={(e) => change(index, e.target.value)}
              onBlur={() =>
                change(
                  index,
                  parts[index] === "" ? "00" : parts[index].padStart(2, "0"),
                )
              }
            />
          </div>
        ))}
      </div>
    </fieldset>
  );
}
