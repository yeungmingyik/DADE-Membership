"use client";

import { createContext, useContext, useState, type Dispatch, type SetStateAction } from "react";
import type { CountryCode } from "libphonenumber-js";

type AuthDraft = { phone: string; country: CountryCode; email: string };
const AuthDraftContext = createContext<{ draft: AuthDraft; setDraft: Dispatch<SetStateAction<AuthDraft>> } | null>(null);

export function AuthDraftProvider({ children }: { children: React.ReactNode }) {
  const [draft, setDraft] = useState<AuthDraft>({ phone: "", country: "SG", email: "" });
  return <AuthDraftContext.Provider value={{ draft, setDraft }}>{children}</AuthDraftContext.Provider>;
}

export function useAuthDraft() {
  const context = useContext(AuthDraftContext);
  if (!context) throw new Error("AUTH_DRAFT_CONTEXT_MISSING");
  return context;
}
