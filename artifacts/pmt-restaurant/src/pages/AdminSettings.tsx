import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyRound, Loader2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { usePublicSettings } from "@/hooks/useMenu";
import { useStaffUser } from "@/hooks/useStaffAuth";
import { apiFetch, errorMessage } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import type { Settings } from "@/lib/types";

// Restaurant settings, staff accounts and the signed-in user's password.

type StaffRow = { id: number; username: string; displayName: string; isActive: boolean; lastLoginAt: string | null; createdAt: string };

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="bg-card border border-border rounded-xl p-5 space-y-4">
      <div>
        <h2 className="font-bold text-lg text-foreground">{title}</h2>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {children}
    </section>
  );
}

function ToggleRow({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
      <span>
        <span className="block font-semibold text-sm">{label}</span>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </label>
  );
}

function NumberField({ label, value, onChange, step = 1, min = 0 }: { label: string; value: number; onChange: (v: number) => void; step?: number; min?: number }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input type="number" min={min} step={step} className="bg-background" value={value} onChange={(e) => onChange(parseFloat(e.target.value) || 0)} />
    </div>
  );
}

function RestaurantSettings({ settings }: { settings: Settings }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(settings);
  const [busy, setBusy] = useState(false);
  useEffect(() => setForm(settings), [settings]);

  const save = async () => {
    setBusy(true);
    try {
      const { restaurant, ordering, tax } = form;
      const updated = await apiFetch<Settings>("/settings", { method: "PUT", body: { restaurant, ordering, tax } });
      queryClient.setQueryData(["settings"], updated);
      toast({ title: "Settings saved" });
    } catch (err) {
      toast({ title: "Couldn't save settings", description: errorMessage(err), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const r = form.restaurant;
  const o = form.ordering;
  const setR = (p: Partial<Settings["restaurant"]>) => setForm({ ...form, restaurant: { ...r, ...p } });
  const setO = (p: Partial<Settings["ordering"]>) => setForm({ ...form, ordering: { ...o, ...p } });

  return (
    <>
      <Section title="Restaurant" description="Shown on the website footer and home page, receipts and invoices.">
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5"><Label>Name</Label><Input className="bg-background" value={r.name} onChange={(e) => setR({ name: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Phone</Label><Input className="bg-background" value={r.phone} onChange={(e) => setR({ phone: e.target.value })} placeholder="+961 …" /></div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Address</Label>
            <textarea
              className="w-full min-h-16 rounded-md border border-input bg-background px-3 py-2 text-base md:text-sm"
              value={r.address}
              onChange={(e) => setR({ address: e.target.value })}
              placeholder="Street, area, city — leave empty to hide it on the website"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Location (home page)</Label>
            <Input className="bg-background" value={r.location} onChange={(e) => setR({ location: e.target.value })} placeholder="e.g. Lebanon or Beirut" />
            <p className="text-xs text-muted-foreground">Shown as “Est. 2024 · Lebanon” and in the About text.</p>
          </div>
          <div className="space-y-1.5">
            <Label>Time zone</Label>
            <Input className="bg-background" value={r.timezone} onChange={(e) => setR({ timezone: e.target.value })} placeholder="Asia/Beirut" />
            <p className="text-xs text-muted-foreground">Used for “today” on the dashboard and for which reservation times can still be booked.</p>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Opening hours</Label>
            <textarea
              className="w-full min-h-24 rounded-md border border-input bg-background px-3 py-2 text-base md:text-sm"
              value={r.hours}
              onChange={(e) => setR({ hours: e.target.value })}
              placeholder={"One line per row, e.g.\nMon - Thu: 12pm - 11pm"}
            />
            <p className="text-xs text-muted-foreground">Shown in the website footer. Reservation times are set separately under Reservations → Availability.</p>
          </div>
          <div className="space-y-1.5"><Label>Instagram link</Label><Input className="bg-background" value={r.instagram} onChange={(e) => setR({ instagram: e.target.value })} placeholder="https://www.instagram.com/…" /></div>
          <div className="space-y-1.5"><Label>Facebook link</Label><Input className="bg-background" value={r.facebook} onChange={(e) => setR({ facebook: e.target.value })} placeholder="https://www.facebook.com/…" /></div>
          <div className="space-y-1.5"><Label>TikTok link</Label><Input className="bg-background" value={r.tiktok} onChange={(e) => setR({ tiktok: e.target.value })} placeholder="https://www.tiktok.com/@…" /></div>
          <p className="text-xs text-muted-foreground sm:self-end">Leave a link empty to hide its icon.</p>
        </div>
      </Section>

      <Section title="Online ordering">
        <div className="grid sm:grid-cols-2 gap-3">
          <ToggleRow label="Accept online orders" hint="Turn off to pause ordering (e.g. when very busy)" checked={o.enabled} onChange={(v) => setO({ enabled: v })} />
          <ToggleRow label="Pickup" checked={o.pickupEnabled} onChange={(v) => setO({ pickupEnabled: v })} />
          <ToggleRow label="Delivery" checked={o.deliveryEnabled} onChange={(v) => setO({ deliveryEnabled: v })} />
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <NumberField label="Delivery fee ($)" value={o.deliveryFee} step={0.5} onChange={(v) => setO({ deliveryFee: v })} />
          <NumberField label="Minimum order ($)" value={o.minimumOrder} step={1} onChange={(v) => setO({ minimumOrder: v })} />
          <NumberField label="Pickup ready in (min)" value={o.pickupMinutes} step={5} onChange={(v) => setO({ pickupMinutes: Math.round(v) })} />
          <NumberField label="Delivery time (min)" value={o.deliveryMinutes} step={5} onChange={(v) => setO({ deliveryMinutes: Math.round(v) })} />
        </div>
      </Section>

      <Section title="Tax" description="Added on top of menu prices on receipts, POS sales and online orders. Leave at 0 if prices already include tax.">
        <div className="grid sm:grid-cols-2 gap-4">
          <NumberField label="Tax rate (%)" value={form.tax.rate} step={0.001} onChange={(v) => setForm({ ...form, tax: { ...form.tax, rate: v } })} />
          <div className="space-y-1.5"><Label>Label on receipts</Label><Input className="bg-background" value={form.tax.label} onChange={(e) => setForm({ ...form, tax: { ...form.tax, label: e.target.value } })} placeholder="e.g. GST + QST" /></div>
        </div>
      </Section>

      <div className="flex justify-end">
        <Button onClick={save} disabled={busy} className="h-11 px-8">{busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Save settings</Button>
      </div>
    </>
  );
}

function StaffAccounts() {
  const { toast } = useToast();
  const { data: me } = useStaffUser();
  const { data: staff, refetch } = useQuery({
    queryKey: ["admin-staff"],
    queryFn: () => apiFetch<{ staff: StaffRow[] }>("/staff").then((d) => d.staff),
  });
  const [form, setForm] = useState({ displayName: "", username: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [resetting, setResetting] = useState<StaffRow | null>(null);
  const [newPassword, setNewPassword] = useState("");

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await apiFetch("/staff", { body: form });
      setForm({ displayName: "", username: "", password: "" });
      refetch();
      toast({ title: "Staff account created", description: `They can sign in at /admin with the username “${form.username.toLowerCase()}”.` });
    } catch (err) {
      toast({ title: "Couldn't create account", description: errorMessage(err), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const update = async (row: StaffRow, body: Record<string, unknown>, message: string) => {
    try {
      await apiFetch(`/staff/${row.id}`, { method: "PATCH", body });
      refetch();
      toast({ title: message });
      return true;
    } catch (err) {
      toast({ title: "Couldn't update account", description: errorMessage(err), variant: "destructive" });
      return false;
    }
  };

  return (
    <Section title="Staff accounts" description="Everyone with an account has full access to the admin area and the POS.">
      <ul className="divide-y divide-border border border-border rounded-lg">
        {staff?.map((s) => (
          <li key={s.id} className="flex flex-wrap items-center gap-3 px-3 py-3">
            <div className="flex-1 min-w-40">
              <p className="font-semibold text-foreground">
                {s.displayName} {s.id === me?.id && <Badge variant="outline" className="ml-1">You</Badge>}
              </p>
              <p className="text-xs text-muted-foreground">
                @{s.username} · {s.lastLoginAt ? `last sign-in ${formatDateTime(s.lastLoginAt)}` : "never signed in"}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => { setResetting(s); setNewPassword(""); }}>
              <KeyRound className="w-4 h-4 mr-1" /> Reset password
            </Button>
            <label className="flex items-center gap-2 text-sm">
              <Switch
                checked={s.isActive}
                disabled={s.id === me?.id}
                onCheckedChange={(v) => update(s, { isActive: v }, v ? "Account re-activated" : "Account deactivated")}
              />
              {s.isActive ? "Active" : "Disabled"}
            </label>
          </li>
        ))}
      </ul>

      <form onSubmit={add} className="rounded-lg bg-muted/50 p-4 space-y-3">
        <p className="font-semibold text-sm flex items-center gap-2"><UserPlus className="w-4 h-4" /> Add a staff member</p>
        <div className="grid sm:grid-cols-3 gap-3">
          <Input className="bg-background" placeholder="Full name" value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} required />
          <Input className="bg-background" placeholder="Username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} autoCapitalize="none" required />
          <Input className="bg-background" type="password" placeholder="Password (min. 8 characters)" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} autoComplete="new-password" minLength={8} required />
        </div>
        <Button type="submit" disabled={busy}>{busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Create account</Button>
      </form>

      <Dialog open={resetting !== null} onOpenChange={(o) => !o && setResetting(null)}>
        <DialogContent className="bg-card sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Reset password for {resetting?.displayName}</DialogTitle>
          </DialogHeader>
          <Input type="password" className="bg-background" placeholder="New password (min. 8 characters)" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} autoComplete="new-password" minLength={8} />
          <p className="text-xs text-muted-foreground">They'll be signed out on other devices and need the new password to sign in.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetting(null)}>Cancel</Button>
            <Button
              disabled={newPassword.length < 8}
              onClick={async () => {
                if (resetting && (await update(resetting, { password: newPassword }, "Password reset"))) setResetting(null);
              }}
            >
              Set password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Section>
  );
}

function ChangePassword() {
  const { toast } = useToast();
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.newPassword !== form.confirm) {
      toast({ title: "New passwords don't match", variant: "destructive" });
      return;
    }
    setBusy(true);
    try {
      await apiFetch("/auth/change-password", { body: { currentPassword: form.currentPassword, newPassword: form.newPassword } });
      setForm({ currentPassword: "", newPassword: "", confirm: "" });
      toast({ title: "Password changed", description: "Other devices have been signed out." });
    } catch (err) {
      toast({ title: "Couldn't change password", description: errorMessage(err), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Section title="My password">
      <form onSubmit={submit} className="grid sm:grid-cols-3 gap-3 items-end">
        <div className="space-y-1.5"><Label>Current password</Label><Input type="password" className="bg-background" value={form.currentPassword} onChange={(e) => setForm({ ...form, currentPassword: e.target.value })} autoComplete="current-password" required /></div>
        <div className="space-y-1.5"><Label>New password</Label><Input type="password" className="bg-background" value={form.newPassword} onChange={(e) => setForm({ ...form, newPassword: e.target.value })} autoComplete="new-password" minLength={8} required /></div>
        <div className="space-y-1.5"><Label>Confirm new password</Label><Input type="password" className="bg-background" value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} autoComplete="new-password" minLength={8} required /></div>
        <div className="sm:col-span-3"><Button type="submit" disabled={busy}>{busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Change password</Button></div>
      </form>
    </Section>
  );
}

export function AdminSettings() {
  const { data: settings, isLoading } = usePublicSettings();
  return (
    <div className="space-y-5 max-w-4xl animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-serif font-bold text-foreground mb-1">Settings</h1>
        <p className="text-muted-foreground">Restaurant details, online ordering, tax and staff access. Reservation rules are under Reservations → Availability.</p>
      </div>
      {isLoading || !settings ? (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      ) : (
        <RestaurantSettings settings={settings} />
      )}
      <StaffAccounts />
      <ChangePassword />
    </div>
  );
}
