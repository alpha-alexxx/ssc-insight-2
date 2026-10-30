"use client";

import { useState } from "react";
import { Dialog } from "radix-ui";
import { X } from "lucide-react";
import { Button } from "../ui/button";
import { useOverlayFocus } from "../use-overlay-viewport";
import type { GroupWithCount } from "./types";

/**
 * Create, rename, and remove groups in one dialog. Removing a group keeps
 * its tasks (they become Ungrouped) — the copy says so before the action.
 */
export function GroupsManagerDialog({
  open,
  onOpenChange,
  groups,
  busy,
  onCreate,
  onRename,
  onDelete,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groups: GroupWithCount[];
  busy: boolean;
  onCreate: (name: string) => Promise<boolean>;
  onRename: (id: string, name: string) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
}) {
  const overlayFocus = useOverlayFocus();
  const [name, setName] = useState("");
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function create() {
    const value = name.trim();
    if (!value) return;
    setError("");
    const ok = await onCreate(value);
    if (ok) setName("");
    else setError("Could not create the group. The name may already exist.");
  }

  async function rename(id: string) {
    const value = renameValue.trim();
    if (!value) return;
    setError("");
    const ok = await onRename(id, value);
    if (ok) setRenaming(null);
    else setError("Could not rename. The name may already exist.");
  }

  async function remove(id: string) {
    setError("");
    const ok = await onDelete(id);
    if (ok) setConfirmingDelete(null);
    else setError("Could not remove the group. Try again.");
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next && !busy) {
          onOpenChange(false);
          setRenaming(null);
          setConfirmingDelete(null);
          setError("");
        }
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-ink/40" />
        <Dialog.Content
          {...overlayFocus}
          aria-describedby="groups-manager-description"
          className="task-editor-dialog"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <Dialog.Title className="font-serif text-2xl">
                Groups
              </Dialog.Title>
              <Dialog.Description
                id="groups-manager-description"
                className="mt-1 text-xs text-muted"
              >
                Organize tasks by subject or project. Removing a group keeps
                its tasks under Ungrouped.
              </Dialog.Description>
            </div>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Close groups"
              disabled={busy}
              onClick={() => onOpenChange(false)}
            >
              <X size={18} />
            </Button>
          </div>
          <form
            className="mt-4 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void create();
            }}
          >
            <label className="sr-only" htmlFor="new-group-name">
              New group name
            </label>
            <input
              id="new-group-name"
              placeholder="New group, e.g. Maths revision"
              value={name}
              maxLength={80}
              required
              onChange={(e) => setName(e.target.value)}
              disabled={busy}
            />
            <Button type="submit" disabled={busy || !name.trim()}>
              Create
            </Button>
          </form>
          {error && (
            <p role="alert" className="mt-2 text-xs text-danger">
              {error}
            </p>
          )}
          <div className="mt-4 max-h-80 space-y-1 overflow-y-auto border-t border-rule-soft pt-3">
            {groups.length === 0 && (
              <p className="py-6 text-center text-xs text-muted">
                No groups yet. Create one above, or from any task&apos;s editor.
              </p>
            )}
            {groups.map((group) =>
              renaming === group.id ? (
                <div key={group.id} className="flex gap-2 py-1">
                  <input
                    aria-label={`Rename ${group.name}`}
                    value={renameValue}
                    maxLength={80}
                    autoFocus
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void rename(group.id);
                      }
                    }}
                    disabled={busy}
                  />
                  <Button
                    size="sm"
                    disabled={busy || !renameValue.trim()}
                    onClick={() => void rename(group.id)}
                  >
                    Save
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setRenaming(null)}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <div
                  key={group.id}
                  className="flex items-center gap-2 py-1.5"
                >
                  <span className="min-w-0 flex-1 truncate text-sm text-ink">
                    {group.name}
                  </span>
                  <span className="shrink-0 text-xs tabular text-muted">
                    {group.count} {group.count === 1 ? "task" : "tasks"}
                  </span>
                  {confirmingDelete === group.id ? (
                    <>
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={busy}
                        onClick={() => void remove(group.id)}
                      >
                        Remove group
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setConfirmingDelete(null)}
                      >
                        Keep
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={busy}
                        onClick={() => {
                          setRenaming(group.id);
                          setRenameValue(group.name);
                        }}
                      >
                        Rename
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={busy}
                        className="text-danger hover:bg-danger-soft hover:text-danger"
                        onClick={() => setConfirmingDelete(group.id)}
                      >
                        Remove
                      </Button>
                    </>
                  )}
                </div>
              ),
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
