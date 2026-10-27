"use client";
import { useState, type ReactNode } from "react";
import { PersonalTodos } from "./personal-todos";

export function PlannerTabs({
  children,
  onChanged,
}: {
  children: ReactNode;
  onChanged?: () => void;
}) {
  const [tab, setTab] = useState<"mock" | "personal">("mock");
  return (
    <div className="space-y-5">
      <div role="group" aria-label="Planner source" className="segment-group">
        <button
          type="button"
          className="segment"
          aria-pressed={tab === "mock"}
          onClick={() => setTab("mock")}
        >
          Mock plan
        </button>
        <button
          type="button"
          className="segment"
          aria-pressed={tab === "personal"}
          onClick={() => setTab("personal")}
        >
          Personal todos
        </button>
      </div>
      {tab === "mock" ? children : <PersonalTodos onChanged={onChanged} />}
    </div>
  );
}
