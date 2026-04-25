import { readDraftCookie } from "@/lib/draft-cookie";
import { findDraftByToken } from "@/lib/draft-store";
import type { FullFormData } from "@/lib/form-schema";

import { SubmitForm } from "./submit-form";

export const metadata = {
  title: "Submit a JV opportunity · JV With Niche",
};

export const dynamic = "force-dynamic";

export default async function SubmitPage() {
  // Try to hydrate an existing draft from the cookie. If the cookie points
  // at a missing or already-submitted row, we start from scratch - the first
  // client-side autosave will create a new row and set a fresh cookie.
  const token = await readDraftCookie();
  let initialData: Partial<FullFormData> = {};
  if (token) {
    const draft = await findDraftByToken(token);
    if (draft) {
      initialData = draft.formData as Partial<FullFormData>;
    }
  }

  return <SubmitForm initialData={initialData} />;
}
