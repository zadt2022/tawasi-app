import { useEffect, useState } from "react";
import api, { formatApiError } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2, Pencil } from "lucide-react";

const ROLES = [
    { value: "admin", label: "مشرف عام" },
    { value: "manager", label: "مدير مجموعة" },
    { value: "member", label: "عضو" },
];

const emptyForm = { email: "", password: "", name: "", role: "manager", group_id: "" };

export default function Users() {
    const [users, setUsers] = useState([]);
    const [groups, setGroups] = useState([]);
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState(emptyForm);

    const load = async () => {
        setUsers((await api.get("/users")).data);
        setGroups((await api.get("/groups")).data);
    };
    useEffect(() => { load(); }, []);

    const openNew = () => { setEditing(null); setForm(emptyForm); setOpen(true); };
    const openEdit = (u) => {
        setEditing(u);
        setForm({ email: u.email, password: "", name: u.name, role: u.role, group_id: u.group_id || "" });
        setOpen(true);
    };

    const save = async () => {
        try {
            if (editing) {
                const payload = { name: form.name, role: form.role, group_id: form.group_id || null };
                if (form.password) payload.password = form.password;
                await api.patch(`/users/${editing.id}`, payload);
            } else {
                await api.post("/users", { ...form, group_id: form.group_id || null });
            }
            toast.success("تم الحفظ");
            setOpen(false); load();
        } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
    };

    const remove = async (id) => {
        if (!window.confirm("حذف المستخدم؟")) return;
        try { await api.delete(`/users/${id}`); toast.success("تم الحذف"); load(); }
        catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
    };

    return (
        <div className="space-y-6" data-testid="users-page">
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-1">المستخدمون</h1>
                    <p className="text-muted-foreground">إدارة حسابات المشرفين والمدراء</p>
                </div>
                <Button onClick={openNew} data-testid="new-user-btn"><Plus className="w-4 h-4 ms-2" /> مستخدم جديد</Button>
            </div>

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="text-right">الاسم</TableHead>
                                <TableHead className="text-right">البريد</TableHead>
                                <TableHead className="text-right">الدور</TableHead>
                                <TableHead className="text-right">إجراءات</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {users.map((u) => (
                                <TableRow key={u.id} data-testid={`user-row-${u.id}`}>
                                    <TableCell className="font-medium">{u.name}</TableCell>
                                    <TableCell dir="ltr" className="text-right">{u.email}</TableCell>
                                    <TableCell>{ROLES.find((r) => r.value === u.role)?.label}</TableCell>
                                    <TableCell>
                                        <Button size="icon" variant="ghost" onClick={() => openEdit(u)}><Pencil className="w-4 h-4" /></Button>
                                        <Button size="icon" variant="ghost" onClick={() => remove(u.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent dir="rtl">
                    <DialogHeader><DialogTitle>{editing ? "تعديل مستخدم" : "مستخدم جديد"}</DialogTitle></DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2"><Label>الاسم</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="user-name-input" /></div>
                        <div className="space-y-2"><Label>البريد</Label><Input value={form.email} disabled={!!editing} dir="ltr" onChange={(e) => setForm({ ...form, email: e.target.value })} data-testid="user-email-input" /></div>
                        <div className="space-y-2">
                            <Label>{editing ? "كلمة مرور جديدة (اتركها فارغة لعدم التغيير)" : "كلمة المرور"}</Label>
                            <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} data-testid="user-password-input" />
                        </div>
                        <div className="space-y-2">
                            <Label>الدور</Label>
                            <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                                <SelectTrigger data-testid="user-role-select"><SelectValue /></SelectTrigger>
                                <SelectContent>{ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        {form.role === "member" && (
                            <div className="space-y-2">
                                <Label>المجموعة</Label>
                                <Select value={form.group_id || "none"} onValueChange={(v) => setForm({ ...form, group_id: v === "none" ? "" : v })}>
                                    <SelectTrigger data-testid="user-group-select"><SelectValue placeholder="اختر مجموعة" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">—</SelectItem>
                                        {groups.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
                        <Button onClick={save} data-testid="user-save-btn">حفظ</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
