import { useEffect, useState } from "react";
import api, { formatApiError } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

const SECTIONS = [
    { key: "dashboard", label: "لوحة التحكم" },
    { key: "groups", label: "المجموعات" },
    { key: "meetings", label: "اللقاءات" },
    { key: "domains", label: "المجالات والكفايات" },
    { key: "reports", label: "التقارير" },
];

const ROLES = [
    { key: "manager", label: "مدير المجموعة" },
    { key: "member", label: "العضو / الفرد" },
];

export default function Permissions() {
    const [perms, setPerms] = useState({ manager: {}, member: {} });
    const [saving, setSaving] = useState(false);

    const load = async () => setPerms((await api.get("/permissions")).data);
    useEffect(() => { load(); }, []);

    const toggle = (role, section) => {
        setPerms((p) => ({ ...p, [role]: { ...p[role], [section]: !p[role]?.[section] } }));
    };

    const save = async () => {
        setSaving(true);
        try {
            await api.put("/permissions", perms);
            toast.success("تم حفظ الصلاحيات");
        } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
        setSaving(false);
    };

    return (
        <div className="space-y-6" data-testid="permissions-page">
            <div>
                <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-1">الصلاحيات</h1>
                <p className="text-muted-foreground">حدّد الأقسام الظاهرة لكل دور</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {ROLES.map((r) => (
                    <Card key={r.key}>
                        <CardHeader><CardTitle>{r.label}</CardTitle></CardHeader>
                        <CardContent className="space-y-3">
                            {SECTIONS.map((s) => (
                                <div key={s.key} className="flex items-center justify-between border rounded-md p-3">
                                    <span className="font-medium">{s.label}</span>
                                    <Switch
                                        checked={!!perms[r.key]?.[s.key]}
                                        onCheckedChange={() => toggle(r.key, s.key)}
                                        data-testid={`perm-${r.key}-${s.key}`}
                                    />
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                ))}
            </div>
            <div>
                <Button onClick={save} disabled={saving} data-testid="save-permissions-btn">
                    {saving ? "جارٍ الحفظ..." : "حفظ الصلاحيات"}
                </Button>
            </div>
        </div>
    );
}
