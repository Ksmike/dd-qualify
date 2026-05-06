"use client";

import { useState } from "react";
import { ApiKeyCard } from "./ApiKeyCard";
import type { ApiKeyStatus } from "@/lib/actions/apiKeys";

export function ApiKeySection({ initial }: { initial: ApiKeyStatus[] }) {
  const [statuses, setStatuses] = useState(initial);

  function handleUpdate(updated: ApiKeyStatus) {
    setStatuses((prev) =>
      prev.map((s) => (s.provider === updated.provider ? updated : s))
    );
  }

  return (
    <div className="space-y-3">
      {statuses.map((status) => (
        <ApiKeyCard
          key={status.provider}
          initial={status}
          onUpdate={handleUpdate}
        />
      ))}
    </div>
  );
}
