"use client";
import { useState } from "react";
import { useStored } from "@/lib/store";

export const useAccessCode = () => useStored<string>("accessCode", "");

export function AccessCodeForm({ onSaved }: { onSaved: () => void }) {
  const [code, setCode] = useAccessCode();
  const [v, setV] = useState(code);
  return (
    <form className="card mx-auto max-w-md space-y-3" onSubmit={(e) => { e.preventDefault(); setCode(v.trim()); onSaved(); }}>
      <h2 className="text-xl font-semibold">Access code needed</h2>
      <p className="text-sm text-muted">Ask your chapter officer or advisor for the code.</p>
      <label className="label" htmlFor="access-code">Access code</label>
      <input id="access-code" className="field" value={v} onChange={(e) => setV(e.target.value)} autoComplete="off" />
      <button className="btn-primary" type="submit">Save and continue</button>
    </form>
  );
}
