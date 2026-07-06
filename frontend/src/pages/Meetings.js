import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import api, { formatApiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, ExternalLink } from "lucide-react";

const DAYS = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
const PRESENTATION_TYPES = ["محاضرة", "ورشة", "درس", "نقاش", "قصة", "استضافة"];

const emptyForm = {
    group_id: "", title: "", day_of_week: "", date_hijri: "", date_gregorian: "",
    location: "", presenter: "", presentation_type: "",
    domain_id: "", competency_id: "", criterion_ids: [],
    executed: false, materials_link: "", notes: "",
};

export default function Meetings() {
    const { canEdit } = useAuth();
    const [params] = useSearchParams();
    const initialGroup = params.get("group_id") || "all";
    const [groups, setGroups] = useState([]);
    const [meetings, setMeetings] = useState([]);
    const [domains, setDomains] = useState([]);
    const [filterGroup, setFilterGroup] = useState(initialGroup);
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState(emptyForm);

    const load = async () => {
        const [gs, ds] = await Promise.all([api.get("/groups"), api.get("/domains")]);
        setGroups(gs.data);
        setDomains(ds.data);
        const url = filterGroup && filterGroup !== "all" ? `/meetings?group_id=${filterGroup}` : "/meetings";
        const ms = await api.get(url);
        setMeetings(ms.data);
    };

    useEffect(() => { load(); /* eslint-disable-next-line */ }, [filterGroup]);

    const openNew = () => {
        setEditing(null);
        setForm({ ...emptyForm, group_id: filterGroup !== "all" ? filterGroup : (groups[0]?.id || "") });
        setOpen(true);
    };
    const openEdit = (m) => {
        setEditing(m);
        setForm({
            group_id: m.group_id, title: m.title, day_of_week: m.day_of_week || "",
            date_hijri: m.date_hijri || "", date_gregorian: m.date_gregorian || "",
            location: m.location || "", presenter: m.presenter || "",
            presentation_type: m.presentation_type || "",
            domain_id: m.domain_id || "", competency_id: m.competency_id || "",
            criterion_ids: m.criterion_ids || [],
            executed: !!m.executed, materials_link: m.materials_link || "", notes: m.notes || "",
        });
        setOpen(true);
    };

    const save = async () => {
        try {
            const payload = {
                ...form,
                domain_id: form.domain_id || null,
                competency_id: form.competency_id || null,
            };
            if (editing) await api.patch(`/meetings/${editing.id}`, payload);
            else await api.post("/meetings", payload);
            toast.success("تم الحفظ");
            setOpen(false); load();
        } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
    };
    const remove = async (id) => {
        if (!window.confirm("حذف اللقاء؟")) return;
        try { await api.delete(`/meetings/${id}`); toast.success("تم الحذف"); load(); }
        catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
    };

    const selectedDomain = domains.find((d) => d.id === form.domain_id);
    const availableComps = selectedDomain?.competencies || [];
    const selectedComp = availableComps.find((c) => c.id === form.competency_id);
    const availableCriteria = selectedComp?.criteria || [];

    const gmap = Object.fromEntries(groups.map((g) => [g.id, g.name]));

    return (
        <div className="space-y-6" data-testid="meetings-page">
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-1">اللقاءات</h1>
                    <p className="text-muted-foreground">جدولة اللقاءات الشهرية ومتابعتها</p>
                </div>
                <div className="flex items-center gap-3">
                    <Select value={filterGroup} onValueChange={setFilterGroup}>
                        <SelectTrigger className="w-56" data-testid="filter-group-select">
                            <SelectValue placeholder="جميع المجموعات" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">جميع المجموعات</SelectItem>
                            {groups.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    {canEdit && (
                        <Button onClick={openNew} disabled={groups.length === 0} data-testid="new-meeting-btn">
                            <Plus className="w-4 h-4 ms-2" /> لقاء جديد
                        </Button>
                    )}
                </div>
            </div>

            <Card>
                <CardContent className="p-0">
                    {meetings.length === 0 ? (
                        <div className="p-10 text-center text-muted-foreground">لا توجد لقاءات</div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="text-right">العنوان</TableHead>
                                    <TableHead className="text-right">المجموعة</TableHead>
                                    <TableHead className="text-right">اليوم</TableHead>
                                    <TableHead className="text-right">هجري</TableHead>
                                    <TableHead className="text-right">ميلادي</TableHead>
                                    <TableHead className="text-right">المكان</TableHead>
                                    <TableHead className="text-right">المقدم</TableHead>
                                    <TableHead className="text-right">النوع</TableHead>
                                    <TableHead className="text-right">الحضور</TableHead>
                                    <TableHead className="text-right">الحالة</TableHead>
                                    <TableHead className="text-right">إجراءات</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {meetings.map((m) => (
                                    <TableRow key={m.id} data-testid={`meeting-row-${m.id}`}>
                                        <TableCell className="font-medium">
                                            <Link to={`/meetings/${m.id}`} className="text-primary hover:underline">{m.title}</Link>
                                        </TableCell>
                                        <TableCell>{gmap[m.group_id]}</TableCell>
                                        <TableCell>{m.day_of_week}</TableCell>
                                        <TableCell>{m.date_hijri}</TableCell>
                                        <TableCell dir="ltr" className="text-right">{m.date_gregorian}</TableCell>
                                        <TableCell>{m.location}</TableCell>
                                        <TableCell>{m.presenter}</TableCell>
                                        <TableCell>{m.presentation_type}</TableCell>
                                        <TableCell>{m.attendance_count || 0}</TableCell>
                                        <TableCell>
                                            {m.executed
                                                ? <span className="text-primary font-medium">تم التنفيذ</span>
                                                : <span className="text-destructive">لم يُنفذ</span>}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex gap-1">
                                                <Link to={`/meetings/${m.id}`}>
                                                    <Button size="icon" variant="ghost" data-testid={`open-meeting-${m.id}`}>
                                                        <ExternalLink className="w-4 h-4" />
                                                    </Button>
                                                </Link>
                                                {canEdit && <>
                                                    <Button size="icon" variant="ghost" onClick={() => openEdit(m)} data-testid={`edit-meeting-${m.id}`}><Pencil className="w-4 h-4" /></Button>
                                                    <Button size="icon" variant="ghost" onClick={() => remove(m.id)} data-testid={`delete-meeting-${m.id}`}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                                                </>}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent dir="rtl" className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader><DialogTitle>{editing ? "تعديل لقاء" : "لقاء جديد"}</DialogTitle></DialogHeader>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2 md:col-span-2">
                            <Label>عنوان اللقاء</Label>
                            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} data-testid="meeting-title-input" />
                        </div>
                        <div className="space-y-2">
                            <Label>المجموعة</Label>
                            <Select value={form.group_id} onValueChange={(v) => setForm({ ...form, group_id: v })}>
                                <SelectTrigger data-testid="meeting-group-select"><SelectValue placeholder="اختر" /></SelectTrigger>
                                <SelectContent>{groups.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>اليوم</Label>
                            <Select value={form.day_of_week || "none"} onValueChange={(v) => setForm({ ...form, day_of_week: v === "none" ? "" : v })}>
                                <SelectTrigger><SelectValue placeholder="اختر" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">—</SelectItem>
                                    {DAYS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>التاريخ الهجري</Label>
                            <Input value={form.date_hijri} placeholder="20/1/1447هـ" onChange={(e) => setForm({ ...form, date_hijri: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                            <Label>التاريخ الميلادي</Label>
                            <Input type="date" value={form.date_gregorian} dir="ltr" onChange={(e) => setForm({ ...form, date_gregorian: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                            <Label>المكان</Label>
                            <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                            <Label>مقدم الموضوع</Label>
                            <Input value={form.presenter} onChange={(e) => setForm({ ...form, presenter: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                            <Label>نوع الإلقاء</Label>
                            <Select value={form.presentation_type || "none"} onValueChange={(v) => setForm({ ...form, presentation_type: v === "none" ? "" : v })}>
                                <SelectTrigger><SelectValue placeholder="اختر" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">—</SelectItem>
                                    {PRESENTATION_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>المجال</Label>
                            <Select value={form.domain_id || "none"} onValueChange={(v) => setForm({ ...form, domain_id: v === "none" ? "" : v, competency_id: "", criterion_ids: [] })}>
                                <SelectTrigger><SelectValue placeholder="اختر" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">—</SelectItem>
                                    {domains.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>الكفاية</Label>
                            <Select value={form.competency_id || "none"} disabled={!form.domain_id} onValueChange={(v) => setForm({ ...form, competency_id: v === "none" ? "" : v, criterion_ids: [] })}>
                                <SelectTrigger><SelectValue placeholder="اختر" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">—</SelectItem>
                                    {availableComps.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        {availableCriteria.length > 0 && (
                            <div className="space-y-2 md:col-span-2">
                                <Label>معايير التحقق المستهدفة</Label>
                                <div className="border rounded-md p-3 space-y-2 max-h-48 overflow-y-auto">
                                    {availableCriteria.map((cr) => {
                                        const checked = form.criterion_ids.includes(cr.id);
                                        return (
                                            <label key={cr.id} className="flex items-start gap-2 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={checked}
                                                    onChange={() => {
                                                        setForm({
                                                            ...form,
                                                            criterion_ids: checked
                                                                ? form.criterion_ids.filter((x) => x !== cr.id)
                                                                : [...form.criterion_ids, cr.id],
                                                        });
                                                    }}
                                                    className="mt-1"
                                                />
                                                <span className="text-sm">{cr.text}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                        <div className="space-y-2 md:col-span-2">
                            <Label>مواد وملفات ذات صلة (رابط)</Label>
                            <Input value={form.materials_link} dir="ltr" onChange={(e) => setForm({ ...form, materials_link: e.target.value })} />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <Label>ملاحظات</Label>
                            <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                        </div>
                        <div className="flex items-center gap-3 md:col-span-2">
                            <Switch checked={form.executed} onCheckedChange={(v) => setForm({ ...form, executed: v })} data-testid="meeting-executed-switch" />
                            <Label>تم تنفيذ اللقاء</Label>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
                        <Button onClick={save} data-testid="meeting-save-btn">حفظ</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
