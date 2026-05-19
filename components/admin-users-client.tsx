"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ClipboardList, CheckSquare, Loader2 } from "lucide-react";

const ROLE_OPTIONS = [
  { value: "point_manager", label: "Manager lokalu" },
  { value: "regional_manager", label: "Regionalny manager" },
  { value: "employee", label: "Pracownik" },
  { value: "accounting", label: "Księgowość" },
];

const ROLE_LABELS: Record<string, string> = {
  point_manager: "Manager lokalu",
  regional_manager: "Manager regionalny",
  employee: "Pracownik",
  accounting: "Księgowość",
};

const EXTRA_PERMISSIONS = [
  { key: "inventory", label: "Inwentaryzacja", icon: ClipboardList },
  { key: "checklist", label: "Checklista", icon: CheckSquare },
];

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  extraPermissions: string[];
};

type AdminUsersClientProps = {
  subscriptionPlan?: string | null;
  companyId?: string | null;
};

export function AdminUsersClient({ subscriptionPlan }: AdminUsersClientProps) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<string>("point_manager");
  const [password, setPassword] = useState("");
  const [locationName, setLocationName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const router = useRouter();

  const [users, setUsers] = useState<UserRow[]>([]);
  const [permSaving, setPermSaving] = useState<string | null>(null);

  const plan = subscriptionPlan;

  const loadUsers = useCallback(async () => {
    const res = await fetch("/api/admin/users");
    if (res.ok) {
      const data = await res.json();
      setUsers(data.users ?? []);
    }
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const togglePermission = async (userId: string, perm: string, current: string[]) => {
    const next = current.includes(perm)
      ? current.filter(p => p !== perm)
      : [...current, perm];

    setPermSaving(userId + perm);
    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, extraPermissions: next }),
    });
    if (res.ok) {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, extraPermissions: next } : u));
    }
    setPermSaving(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    if (role === "point_manager" && !locationName.trim()) {
      setIsLoading(false);
      setError("Podaj nazwę lokalu dla managera.");
      return;
    }

    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          role,
          password: password || undefined,
          locationName: locationName.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Nie udało się utworzyć użytkownika");

      setSuccess(
        password
          ? "Konto zostało utworzone. Użytkownik może się zalogować."
          : "Zaproszenie zostało wysłane do użytkownika.",
      );
      setEmail("");
      setRole("point_manager");
      setPassword("");
      setLocationName("");
      loadUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Wystąpił nieoczekiwany błąd przy tworzeniu użytkownika");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-muted/20">
      <Sidebar
        adminName="Właściciel"
        activeView="admin_users"
        onNavigate={() => {}}
        onLogout={() => router.push("/auth/login")}
      />
      <main className="flex-1 p-4 md:p-8">
        <div className="max-w-xl mx-auto space-y-6">

          {/* ── Create user form ── */}
          <Card>
            <CardHeader>
              <CardTitle>Tworzenie kont pracowników</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Jako właściciel możesz tworzyć konta dla managerów, pracowników
                oraz działu księgowości. Użytkownik otrzyma e-mail z zaproszeniem
                do założenia hasła lub będzie mógł zalogować się od razu, jeśli
                ustawisz hasło.
              </p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email użytkownika</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="manager@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Hasło (opcjonalne)</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min. 6 znaków, zostaw puste aby wysłać zaproszenie"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Rola</Label>
                  <select
                    id="role"
                    className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                  >
                    {ROLE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Nazwa lokalu (dla managera)</Label>
                  <Input
                    id="location"
                    type="text"
                    placeholder="np. Chmielna 10 Warszawa"
                    value={locationName}
                    onChange={(e) => setLocationName(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Dla roli &ldquo;Manager lokalu&rdquo; wpisz nazwę lokalu, do którego ma mieć dostęp.
                  </p>
                </div>

                {plan === "plan1" && (
                  <p className="text-xs text-muted-foreground">Plan 1: rekomendowany 1 manager lokalu.</p>
                )}
                {plan === "plan2" && (
                  <p className="text-xs text-muted-foreground">Plan 2: rekomendowani maks. 2 managerowie i 2 lokale.</p>
                )}

                {error && <p className="text-sm text-red-500" role="alert">{error}</p>}
                {success && <p className="text-sm text-green-600">{success}</p>}

                <div className="flex gap-2 justify-end pt-2">
                  <Button type="button" variant="outline" onClick={() => router.back()}>Anuluj</Button>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? "Tworzenie..." : "Utwórz konto"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* ── Extra permissions ── */}
          {users.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Dodatkowe uprawnienia</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Przyznaj dowolnemu użytkownikowi panelu ops dostęp do inwentaryzacji lub checklisy.
                </p>
                <div className="space-y-2">
                  {users.map(user => (
                    <div key={user.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold text-slate-800 truncate">{user.name}</p>
                        <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {EXTRA_PERMISSIONS.map(({ key, label, icon: Icon }) => {
                          const active = user.extraPermissions.includes(key);
                          const saving = permSaving === user.id + key;
                          return (
                            <button
                              key={key}
                              onClick={() => togglePermission(user.id, key, user.extraPermissions)}
                              disabled={saving}
                              title={label}
                              className={[
                                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[12px] font-medium border transition-all",
                                active
                                  ? "bg-blue-600 text-white border-blue-600"
                                  : "bg-white text-slate-500 border-slate-200 hover:border-blue-400 hover:text-blue-600",
                              ].join(" ")}
                            >
                              {saving
                                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                : <Icon className="w-3.5 h-3.5" />}
                              {label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}


        </div>
      </main>
    </div>
  );
}
