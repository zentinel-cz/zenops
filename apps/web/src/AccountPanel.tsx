import { type FormEvent, useState } from "react";

export function AccountPanel({ onPasswordChanged }: { onPasswordChanged: () => void }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = event.currentTarget;
    const data = new FormData(form);
    const newPassword = String(data.get("newPassword") ?? "");
    if (newPassword !== data.get("confirmation")) {
      setError("Nové heslo a potvrzení se neshodují.");
      return;
    }
    setSubmitting(true);
    const response = await fetch("/api/auth/password", {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ currentPassword: data.get("currentPassword"), newPassword }),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({ error: "Heslo se nepodařilo změnit." })) as { error?: string };
      setError(body.error ?? "Heslo se nepodařilo změnit.");
      setSubmitting(false);
      return;
    }
    form.reset();
    onPasswordChanged();
  }

  return (
    <>
      <button className="ghost" onClick={() => setOpen((value) => !value)}>{open ? "Zavřít účet" : "Můj účet"}</button>
      {open && <section className="account-panel" aria-label="Můj účet">
        <form onSubmit={submit}>
          <div><p className="eyebrow">ZABEZPEČENÍ ÚČTU</p><h3>Změnit heslo</h3></div>
          <label>Současné heslo<input name="currentPassword" type="password" autoComplete="current-password" minLength={12} required /></label>
          <label>Nové heslo<input name="newPassword" type="password" autoComplete="new-password" minLength={12} required /></label>
          <label>Nové heslo znovu<input name="confirmation" type="password" autoComplete="new-password" minLength={12} required /></label>
          {error && <p className="error" role="alert">{error}</p>}
          <p className="account-hint">Po změně hesla budou bezpečně ukončena všechna přihlášení včetně tohoto.</p>
          <button disabled={submitting}>{submitting ? "Měním heslo…" : "Změnit heslo"}</button>
        </form>
      </section>}
    </>
  );
}
