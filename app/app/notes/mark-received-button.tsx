"use client";

import { useState, useTransition } from "react";
import { PackageCheck, Check } from "lucide-react";
import { markReceived } from "./actions";
import Button from "../ui/button";
import Spinner from "../ui/spinner";
import { toast } from "../ui/toast";

export default function MarkReceivedButton({ noteId }: { noteId: string }) {
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);

  function mark() {
    startTransition(async () => {
      const result = await markReceived(noteId);
      if (result.ok) {
        setDone(true);
        toast("Handoff marked received.", "success");
      } else {
        toast(result.message, "danger");
      }
    });
  }

  if (done) {
    return (
      <span className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-base border border-pine/40 bg-pine/10 px-3 text-sm font-medium text-pine sm:min-h-8 sm:w-auto">
        <Check aria-hidden="true" className="size-4" />
        Received
      </span>
    );
  }

  return (
    <Button type="button" variant="secondary" size="sm" full disabled={pending} onClick={mark}>
      {pending ? (
        <>
          <Spinner />
          <span>Marking…</span>
        </>
      ) : (
        <>
          <PackageCheck aria-hidden="true" className="size-4" />
          Mark handoff received
        </>
      )}
    </Button>
  );
}