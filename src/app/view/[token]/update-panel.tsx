"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, MessageSquarePlus, Paperclip } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

type Status = "idle" | "submitting" | "ok" | "error";

interface PanelProps {
  token: string;
  crmSynced: boolean;
}

export function UpdatePanel({ token, crmSynced }: PanelProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <NoteForm token={token} crmSynced={crmSynced} />
      <AttachmentForm token={token} crmSynced={crmSynced} />
    </div>
  );
}

function NoteForm({ token, crmSynced }: PanelProps) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || status === "submitting") return;
    setStatus("submitting");
    setError(null);
    try {
      const res = await fetch(`/api/view/${token}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || `Request failed (${res.status})`);
      }
      setText("");
      setStatus("ok");
      router.refresh();
      setTimeout(() => setStatus("idle"), 2000);
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Send failed");
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-3 rounded-xl border border-brand-navy/10 bg-white p-4"
    >
      <div className="flex items-center gap-2 text-sm font-semibold text-brand-navy">
        <MessageSquarePlus
          className="h-4 w-4 text-brand-orange"
          aria-hidden
        />
        Add a note
      </div>
      <Textarea
        rows={4}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Share a status update, ask a question, or add context we should know…"
        className="resize-y"
        disabled={status === "submitting"}
      />
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] text-brand-text-muted">
          {crmSynced
            ? "Sent to the Niche CRM and your WhatsApp group instantly."
            : "Saved now. Will sync to the Niche CRM once your initial record finishes syncing."}
        </p>
        <Button
          type="submit"
          size="sm"
          disabled={!text.trim() || status === "submitting"}
        >
          {status === "submitting" ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sending
            </>
          ) : (
            "Send note"
          )}
        </Button>
      </div>
      {status === "ok" && (
        <p className="text-[12px] font-medium text-emerald-700">
          Note sent ✓
        </p>
      )}
      {status === "error" && error && (
        <p className="text-[12px] font-medium text-destructive">{error}</p>
      )}
    </form>
  );
}

function AttachmentForm({ token, crmSynced }: PanelProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file || status === "submitting") return;
    setStatus("submitting");
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      if (caption.trim()) fd.append("caption", caption.trim());
      const res = await fetch(`/api/view/${token}/attachments`, {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || `Upload failed (${res.status})`);
      }
      setFile(null);
      setCaption("");
      if (inputRef.current) inputRef.current.value = "";
      setStatus("ok");
      router.refresh();
      setTimeout(() => setStatus("idle"), 2000);
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Upload failed");
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-3 rounded-xl border border-brand-navy/10 bg-white p-4"
    >
      <div className="flex items-center gap-2 text-sm font-semibold text-brand-navy">
        <Paperclip className="h-4 w-4 text-brand-orange" aria-hidden />
        Upload a file
      </div>
      <div
        className={`flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-5 text-center transition-colors ${
          file
            ? "border-brand-orange bg-brand-orange-light/40"
            : "border-brand-navy/20 bg-brand-cream/40"
        }`}
      >
        <Paperclip
          className={`h-6 w-6 ${
            file ? "text-brand-orange" : "text-brand-text-muted"
          }`}
          aria-hidden
        />
        <p className="text-[13px] text-brand-text-dark">
          {file ? (
            <>
              <span className="font-medium">{file.name}</span>{" "}
              <span className="text-brand-text-muted">
                ({Math.round(file.size / 1024)} KB)
              </span>
            </>
          ) : (
            <>Drop a file here or click to choose</>
          )}
        </p>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept="application/pdf,image/jpeg,image/png,image/heic,image/heif,image/webp,image/gif,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/plain,text/csv"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          disabled={status === "submitting"}
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => inputRef.current?.click()}
          disabled={status === "submitting"}
        >
          {file ? "Change file" : "Choose file"}
        </Button>
        <p className="text-[11px] text-brand-text-muted">
          PDF, images, Word / Excel · max 8 MB
        </p>
      </div>
      <Input
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        placeholder="Optional caption (what is this?)"
        maxLength={280}
        disabled={status === "submitting"}
      />
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] text-brand-text-muted">
          {crmSynced
            ? "Sent to the Niche CRM and your WhatsApp group instantly."
            : "Saved now. Will sync to the Niche CRM once your initial record finishes syncing."}
        </p>
        <Button
          type="submit"
          size="sm"
          disabled={!file || status === "submitting"}
        >
          {status === "submitting" ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Uploading
            </>
          ) : (
            "Upload file"
          )}
        </Button>
      </div>
      {status === "ok" && (
        <p className="text-[12px] font-medium text-emerald-700">
          Uploaded ✓
        </p>
      )}
      {status === "error" && error && (
        <p className="text-[12px] font-medium text-destructive">{error}</p>
      )}
    </form>
  );
}
