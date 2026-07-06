import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { formatApiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Users2, CalendarDays, ArrowLeft } from "lucide-react";

export default function Groups() {
    const { isAdmin } = useAuth();
    const [groups, setGroups] = useState([]);
    const [managers, setManagers] = useState([]);
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({ name: "", description: "", manager_id: "" });

    const load = async () => {
        const r = await api.get("/groups");
        setGroups(r.data);
        if (isAdmin) {
            try {
                const u = await api.get("/users");
                setManagers(u.data.filter((x) => x.role === "manager" || x.role === "admin"));
            } catch {}
        }
    };

    useEffect(() => {
        load();
    }, []);

    const openNew = () => {
        setEditing(null);
        setForm({ name: "", description: "", manager_id: "" });
        setOpen(true);
    };

    const openEdit = (g) => {
        setEditing(g);
        setForm({ name: g.name, description: g.description || "", manager_id: g.manager_id || "" });
        setOpen(true);
    };

    const save = async () => {
        try {
            const payload = {
                name: form.name,
                description: form.description,
                manager_id: form.manager_id || null,
            };
            if (editing) {
                await api.patch(`/groups/${editing.id}`, payload);
                toast.success("تم تحديث المجموعة");
            } else {
                await api.post("/groups", payload);
                toast.success("تمت إضافة المجموعة");
            }
            setOpen(false);
            load();
        } catch (e) {
            toast.error(formatApiError(e.response?.data?.detail));
        }
    };

    const remove = async (id) => {
        if (!window.confirm("هل أنت متأكد من حذف المجموعة؟ سيتم حذف جميع الأفراد واللقاءات المرتبطة.")) return;
        try {
            await api.delete(`/groups/${id}`);
            toast.success("تم الحذف");
            load();
        } catch (e) {
            toast.error(formatApiError(e.response?.data?.detail));
        }
    };

    return (
        <div className="space-y-6" data-testid="groups-page">
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-1">المجموعات</h1>
                    <p className="text-muted-foreground">إدارة المجموعات وأعضائها ومدرائها</p>
                </div>
                {isAdmin && (
                    <Button onClick={openNew} data-testid="new-group-btn">
                        <Plus className="w-4 h-4 ms-2" /> مجموعة جديدة
                    </Button>
                )}
            </div>

            {groups.length === 0 ? (
                <Card>
                    <CardContent className="p-10 text-center text-muted-foreground">
                        لا توجد مجموعات بعد. ابدأ بإضافة أول مجموعة.
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {groups.map((g) => (
                        <Card key={g.id} className="transition-all hover:shadow-md" data-testid={`group-card-${g.id}`}>
                            <CardContent className="p-6">
                                <div className="flex items-start justify-between mb-3">
                                    <h3 className="text-lg font-bold">{g.name}</h3>
                                    {isAdmin && (
                                        <div className="flex gap-1">
                                            <Button size="icon" variant="ghost" onClick={() => openEdit(g)} data-testid={`edit-group-${g.id}`}>
                                                <Pencil className="w-4 h-4" />
                                            </Button>
                                            <Button size="icon" variant="ghost" onClick={() => remove(g.id)} data-testid={`delete-group-${g.id}`}>
                                                <Trash2 className="w-4 h-4 text-destructive" />
                                            </Button>
                                        </div>
                                    )}
                                </div>
                                {g.description && <p className="text-sm text-muted-foreground mb-4">{g.description}</p>}
                                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                                    <div className="flex items-center gap-1">
                                        <Users2 className="w-4 h-4" /> {g.members_count} أعضاء
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <CalendarDays className="w-4 h-4" /> {g.meetings_count} لقاءات
                                    </div>
                                </div>
                                <Link to={`/groups/${g.id}`}>
                                    <Button variant="outline" size="sm" className="w-full" data-testid={`open-group-${g.id}`}>
                                        فتح المجموعة <ArrowLeft className="w-4 h-4 me-2" />
                                    </Button>
                                </Link>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent dir="rtl">
                    <DialogHeader>
                        <DialogTitle>{editing ? "تعديل مجموعة" : "مجموعة جديدة"}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>اسم المجموعة</Label>
                            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="group-name-input" />
                        </div>
                        <div className="space-y-2">
                            <Label>الوصف</Label>
                            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} data-testid="group-description-input" />
                        </div>
                        {isAdmin && (
                            <div className="space-y-2">
                                <Label>مدير المجموعة</Label>
                                <Select value={form.manager_id || "none"} onValueChange={(v) => setForm({ ...form, manager_id: v === "none" ? "" : v })}>
                                    <SelectTrigger data-testid="group-manager-select"><SelectValue placeholder="اختر مديراً" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">بدون مدير</SelectItem>
                                        {managers.map((m) => (
                                            <SelectItem key={m.id} value={m.id}>{m.name} ({m.email})</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setOpen(false)} data-testid="group-cancel-btn">إلغاء</Button>
                        <Button onClick={save} data-testid="group-save-btn">حفظ</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
