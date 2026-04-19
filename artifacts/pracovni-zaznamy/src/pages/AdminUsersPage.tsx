import { useState } from "react";
import { useListUsers, useCreateUser, useUpdateUser, useDeleteUser, getListUsersQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { formatDateTime } from "@/lib/utils";

interface UserForm {
  username: string;
  password: string;
  fullName: string;
  role: "admin" | "user";
  isActive: boolean;
}

interface EditUserForm {
  fullName: string;
  role: "admin" | "user";
  isActive: boolean;
  password: string;
}

function EditModal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-card border border-card-border rounded-lg shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="font-semibold text-foreground">{title}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

const inputClass = "w-full px-3 py-2 border border-input rounded bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm";
const labelClass = "block text-sm font-medium text-foreground mb-1";

export default function AdminUsersPage() {
  const queryClient = useQueryClient();
  const { data: users, isLoading } = useListUsers();
  const createMutation = useCreateUser();
  const updateMutation = useUpdateUser();
  const deleteMutation = useDeleteUser();

  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<UserForm>({ username: "", password: "", fullName: "", role: "user", isActive: true });
  const [editForm, setEditForm] = useState<EditUserForm>({ fullName: "", role: "user", isActive: true, password: "" });
  const [error, setError] = useState("");
  const [editError, setEditError] = useState("");

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() });

  const resetForm = () => {
    setForm({ username: "", password: "", fullName: "", role: "user", isActive: true });
    setError("");
  };

  const openEdit = (id: number) => {
    const u = users?.find((x) => x.id === id);
    if (!u) return;
    setEditForm({ fullName: u.fullName, role: u.role as "admin" | "user", isActive: u.isActive, password: "" });
    setEditId(id);
    setEditError("");
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.username.trim() || !form.password || !form.fullName.trim()) {
      setError("Všechna povinná pole musí být vyplněna");
      return;
    }
    if (form.password.length < 6) {
      setError("Heslo musí mít alespoň 6 znaků");
      return;
    }
    try {
      await createMutation.mutateAsync({ data: { username: form.username.trim(), password: form.password, fullName: form.fullName.trim(), role: form.role } });
      await invalidate();
      resetForm();
      setShowAdd(false);
    } catch {
      setError("Chyba při vytváření uživatele. Uživatelské jméno je možná již použito.");
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditError("");
    if (!editId || !editForm.fullName.trim()) { setEditError("Celé jméno je povinné"); return; }
    if (editForm.password && editForm.password.length < 6) { setEditError("Nové heslo musí mít alespoň 6 znaků"); return; }
    try {
      const data: Record<string, unknown> = {
        fullName: editForm.fullName.trim(),
        role: editForm.role,
        isActive: editForm.isActive,
      };
      if (editForm.password) data.password = editForm.password;
      await updateMutation.mutateAsync({ id: editId, data: data as never });
      await invalidate();
      setEditId(null);
    } catch {
      setEditError("Chyba při ukládání");
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Smazat uživatele „${name}"? Tato akce je nevratná.`)) return;
    await deleteMutation.mutateAsync({ id });
    await invalidate();
  };

  const roleLabel = (role: string) => role === "admin" ? "Admin" : "Uživatel";
  const roleBadgeClass = (role: string) =>
    role === "admin"
      ? "bg-primary/10 text-primary border border-primary/20"
      : "bg-secondary text-secondary-foreground border border-border";

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Správa uživatelů</h1>
          <p className="text-sm text-muted-foreground mt-1">{users?.length ?? 0} uživatelů v systému</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowAdd(true); }}
          className="px-3 py-1.5 bg-primary text-primary-foreground rounded text-sm font-medium hover:opacity-90 transition-opacity"
        >
          + Nový uživatel
        </button>
      </div>

      {showAdd && (
        <div className="bg-card border border-primary/30 rounded-lg p-5 shadow-sm">
          <h2 className="text-base font-semibold text-foreground mb-4">Nový uživatel</h2>
          {error && <div className="bg-destructive/10 text-destructive border border-destructive/20 rounded px-3 py-2 text-sm mb-4">{error}</div>}
          <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Uživatelské jméno *</label>
              <input
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                required
                className={inputClass}
                placeholder="jnovak"
                autoComplete="off"
              />
            </div>
            <div>
              <label className={labelClass}>Heslo * (min. 6 znaků)</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
                minLength={6}
                className={inputClass}
                placeholder="••••••••"
                autoComplete="new-password"
              />
            </div>
            <div>
              <label className={labelClass}>Celé jméno *</label>
              <input
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                required
                className={inputClass}
                placeholder="Jan Novák"
              />
            </div>
            <div>
              <label className={labelClass}>Role *</label>
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as "admin" | "user" })} className={inputClass}>
                <option value="user">Uživatel</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="sm:col-span-2 flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} className="rounded" />
                <span className="text-sm text-foreground">Účet aktivní</span>
              </label>
            </div>
            <div className="sm:col-span-2 flex gap-3">
              <button type="submit" disabled={createMutation.isPending} className="px-4 py-2 bg-primary text-primary-foreground rounded text-sm font-medium hover:opacity-90 disabled:opacity-60">
                {createMutation.isPending ? "Vytvářím..." : "Vytvořit uživatele"}
              </button>
              <button type="button" onClick={() => { setShowAdd(false); resetForm(); }} className="px-4 py-2 bg-secondary text-secondary-foreground border border-border rounded text-sm font-medium hover:bg-secondary/80">
                Zrušit
              </button>
            </div>
          </form>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-card border border-card-border rounded-lg animate-pulse" />)}
        </div>
      ) : !users?.length ? (
        <div className="bg-card border border-card-border rounded-lg p-8 text-center text-muted-foreground text-sm">
          Žádní uživatelé.
        </div>
      ) : (
        <div className="bg-card border border-card-border rounded-lg divide-y divide-border overflow-hidden">
          {users.map((u) => (
            <div key={u.id} className="flex items-center gap-3 px-4 py-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-foreground">{u.fullName}</span>
                  <span className="text-xs text-muted-foreground">@{u.username}</span>
                  <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${roleBadgeClass(u.role)}`}>
                    {roleLabel(u.role)}
                  </span>
                  <span className={`text-xs font-medium ${u.isActive ? "text-green-600" : "text-destructive"}`}>
                    {u.isActive ? "Aktivní" : "Neaktivní"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">Vytvořen: {formatDateTime(u.createdAt)}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => openEdit(u.id)}
                  className="px-2 py-1 text-xs text-primary border border-primary/30 rounded hover:bg-primary/5 transition-colors"
                >
                  Upravit
                </button>
                <button
                  onClick={() => updateMutation.mutateAsync({ id: u.id, data: { isActive: !u.isActive } as never }).then(invalidate)}
                  className="px-2 py-1 text-xs border border-border rounded hover:bg-accent/50 transition-colors text-muted-foreground"
                >
                  {u.isActive ? "Deakt." : "Aktivovat"}
                </button>
                <button
                  onClick={() => handleDelete(u.id, u.fullName)}
                  className="px-2 py-1 text-xs text-destructive border border-destructive/30 rounded hover:bg-destructive/5 transition-colors"
                >
                  Smazat
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editId !== null && (
        <EditModal title="Upravit uživatele" onClose={() => { setEditId(null); setEditError(""); }}>
          {editError && <div className="bg-destructive/10 text-destructive border border-destructive/20 rounded px-3 py-2 text-sm mb-3">{editError}</div>}
          <form onSubmit={handleUpdate} className="space-y-3">
            <div>
              <label className={labelClass}>Celé jméno *</label>
              <input value={editForm.fullName} onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })} className={inputClass} required />
            </div>
            <div>
              <label className={labelClass}>Role</label>
              <select value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value as "admin" | "user" })} className={inputClass}>
                <option value="user">Uživatel</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Nové heslo (nechat prázdné = beze změny)</label>
              <input
                type="password"
                value={editForm.password}
                onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                className={inputClass}
                placeholder="••••••••  (min. 6 znaků)"
                autoComplete="new-password"
              />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="edit-active" checked={editForm.isActive} onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })} className="rounded" />
              <label htmlFor="edit-active" className="text-sm text-foreground">Účet aktivní</label>
            </div>
            <div className="flex gap-2 pt-1">
              <button type="submit" disabled={updateMutation.isPending} className="flex-1 py-2 bg-primary text-primary-foreground rounded text-sm font-medium hover:opacity-90 disabled:opacity-60">
                {updateMutation.isPending ? "Ukládám..." : "Uložit změny"}
              </button>
              <button type="button" onClick={() => { setEditId(null); setEditError(""); }} className="px-4 py-2 bg-secondary text-secondary-foreground border border-border rounded text-sm font-medium">Zrušit</button>
            </div>
          </form>
        </EditModal>
      )}
    </div>
  );
}
