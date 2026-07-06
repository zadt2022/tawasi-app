import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api, { formatApiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, ArrowRight } from "lucide-react";

export default function GroupDetail() {
    const { id } = useParams();
    const { canEdit } = useAuth();
    const [group, setGroup] = useState(null);
    const [members, setMembers] = useState([]);
    const [meetings, setMeetings] = useState([]);
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({ name: "", phone: "", notes: "" });

    const load = async () => {
        const [gs, ms, mts] = await Promise.all([
            api.get("/groups"),
            api.get(`/groups/${id}/members`),
            api.get(`/meetings?group_id=${id}`),
        ]);
        setGroup(gs.data.find((g) => g.id === id));
        setMembers(ms.data);
        setMeetings(mts.data);
    };

    useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

    const openNew = () => {
        setEditing(null);
        setForm({ name: "", phone: "", notes: "" });
        setOpen(true);
    };
    const openEdit = (m) => {
        setEditing(m);
        setForm({ name: m.name, phone: m.phone || "", notes: m.notes || "" });
        setOpen(true);
    };
    const save = async () => {
        try {
            if (editing) await api.patch(`/members/${editing.id}`, form);
            else await api.post(`/groups/${id}/members`, form);
            toast.success("تم الحفظ");
            setOpen(false);
            load();
        } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
    };
    const remove = async (mid) => {
        if (!window.confirm("حذف العضو؟")) return;
        try { await api.delete(`/members/${mid}`); toast.success("تم الحذف"); load(); }
        catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
    };

    if (!group) return <div className="text-muted-foreground">جارٍ التحميل...</div>;

    return (
        <div className="space-y-6" data-testid="group-detail-page">
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <Link to="/groups" className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1 mb-2">
                        <ArrowRight className="w-4 h-4" /> المجموعات
                    </Link>
                    <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-1">{group.name}</h1>
                    {group.description && <p className="text-muted-foreground">{group.description}</p>}
                </div>
            </div>

            <Tabs defaultValue="members">
                <TabsList>
                    <TabsTrigger value="members" data-testid="tab-members">الأفراد ({members.length})</TabsTrigger>
                    <TabsTrigger value="meetings" data-testid="tab-meetings">اللقاءات ({meetings.length})</TabsTrigger>
                </TabsList>
                <TabsContent value="members" className="mt-4">
                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-bold text-lg">أفراد المجموعة</h3>
                                {canEdit && <Button size="sm" onClick={openNew} data-testid="new-member-btn"><Plus className="w-4 h-4 ms-2" /> إضافة عضو</Button>}
                            </div>
                            {members.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">لا يوجد أعضاء بعد</div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="text-right">الاسم</TableHead>
                                            <TableHead className="text-right">الجوال</TableHead>
                                            <TableHead className="text-right">ملاحظات</TableHead>
                                            {canEdit && <TableHead className="text-right">إجراءات</TableHead>}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {members.map((m) => (
                                            <TableRow key={m.id} data-testid={`member-row-${m.id}`}>
                                                <TableCell className="font-medium">{m.name}</TableCell>
                                                <TableCell dir="ltr" className="text-right">{m.phone}</TableCell>
                                                <TableCell className="text-muted-foreground">{m.notes}</TableCell>
                                                {canEdit && (
                                                    <TableCell>
                                                        <Button size="icon" variant="ghost" onClick={() => openEdit(m)} data-testid={`edit-member-${m.id}`}><Pencil className="w-4 h-4" /></Button>
                                                        <Button size="icon" variant="ghost" onClick={() => remove(m.id)} data-testid={`delete-member-${m.id}`}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                                                    </TableCell>
                                                )}
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="meetings" className="mt-4">
                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-bold text-lg">لقاءات المجموعة</h3>
                                <Link to={`/meetings?group_id=${id}`}>
                                    <Button size="sm" variant="outline">إدارة اللقاءات</Button>
                                </Link>
                            </div>
                            {meetings.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">لا توجد لقاءات بعد</div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="text-right">العنوان</TableHead>
                                            <TableHead className="text-right">التاريخ</TableHead>
                                            <TableHead className="text-right">المكان</TableHead>
                                            <TableHead className="text-right">الحضور</TableHead>
                                            <TableHead className="text-right">الحالة</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {meetings.map((m) => (
                                            <TableRow key={m.id}>
                                                <TableCell className="font-medium">
                                                    <Link to={`/meetings/${m.id}`} className="text-primary hover:underline">{m.title}</Link>
                                                </TableCell>
                                                <TableCell>{m.date_hijri || m.date_gregorian}</TableCell>
                                                <TableCell>{m.location}</TableCell>
                                                <TableCell>{m.attendance_count || 0}</TableCell>
                                                <TableCell>{m.executed ? <span className="text-primary">تم التنفيذ</span> : <span className="text-destructive">لم يُنفذ</span>}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent dir="rtl">
                    <DialogHeader><DialogTitle>{editing ? "تعديل عضو" : "عضو جديد"}</DialogTitle></DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2"><Label>الاسم</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="member-name-input" /></div>
                        <div className="space-y-2"><Label>الجوال</Label><Input value={form.phone} dir="ltr" onChange={(e) => setForm({ ...form, phone: e.target.value })} data-testid="member-phone-input" /></div>
                        <div className="space-y-2"><Label>ملاحظات</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} data-testid="member-notes-input" /></div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
                        <Button onClick={save} data-testid="member-save-btn">حفظ</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
