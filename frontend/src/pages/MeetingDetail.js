import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api, { formatApiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowRight, Printer } from "lucide-react";

const LEVELS = [
    { value: "high", label: "درجة عالية" },
    { value: "medium", label: "درجة متوسطة" },
    { value: "low", label: "درجة منخفضة" },
    { value: "absent", label: "لم يحضر اللقاء" },
];

export default function MeetingDetail() {
    const { id } = useParams();
    const { canEdit } = useAuth();
    const [meeting, setMeeting] = useState(null);
    const [group, setGroup] = useState(null);
    const [members, setMembers] = useState([]);
    const [domains, setDomains] = useState([]);
    const [attMap, setAttMap] = useState({}); // member_id -> {attended, prepared, evaluations, notes}

    const load = async () => {
        const m = await api.get(`/meetings/${id}`);
        setMeeting(m.data);
        const [gs, ds] = await Promise.all([api.get("/groups"), api.get("/domains")]);
        const g = gs.data.find((x) => x.id === m.data.group_id);
        setGroup(g);
        setDomains(ds.data);
        const mem = await api.get(`/groups/${m.data.group_id}/members`);
        setMembers(mem.data);
        const map = {};
        // Default: all members are present unless explicitly recorded as absent
        for (const memberRow of mem.data) {
            map[memberRow.id] = { attended: true, prepared: false, evaluations: {}, notes: "" };
        }
        for (const a of m.data.attendances || []) {
            map[a.member_id] = { attended: !!a.attended, prepared: !!a.prepared, evaluations: a.evaluations || {}, notes: a.notes || "" };
        }
        setAttMap(map);
    };

    useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

    const setField = (memberId, field, value) => {
        setAttMap((prev) => ({
            ...prev,
            [memberId]: { ...(prev[memberId] || { attended: false, prepared: false, evaluations: {}, notes: "" }), [field]: value },
        }));
    };
    const setEval = (memberId, critId, level) => {
        setAttMap((prev) => {
            const cur = prev[memberId] || { attended: false, prepared: false, evaluations: {}, notes: "" };
            return {
                ...prev,
                [memberId]: { ...cur, evaluations: { ...(cur.evaluations || {}), [critId]: level } },
            };
        });
    };

    const saveMember = async (memberId) => {
        const data = attMap[memberId] || { attended: false, prepared: false, evaluations: {}, notes: "" };
        try {
            await api.post(`/meetings/${id}/attendance`, { member_id: memberId, ...data });
            toast.success("تم حفظ البيانات");
            load();
        } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
    };

    const saveAll = async () => {
        try {
            for (const m of members) {
                const data = attMap[m.id] || { attended: false, prepared: false, evaluations: {}, notes: "" };
                await api.post(`/meetings/${id}/attendance`, { member_id: m.id, ...data });
            }
            toast.success("تم حفظ التحضير لجميع الأعضاء");
            load();
        } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
    };

    if (!meeting) return <div className="text-muted-foreground">جارٍ التحميل...</div>;

    const domain = domains.find((d) => d.id === meeting.domain_id);
    const comp = domain?.competencies?.find((c) => c.id === meeting.competency_id);
    const criteria = comp?.criteria?.filter((c) => (meeting.criterion_ids || []).includes(c.id)) || [];

    return (
        <div className="space-y-6" data-testid="meeting-detail-page">
            <div className="flex items-center justify-between flex-wrap gap-4 no-print">
                <div>
                    <Link to="/meetings" className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1 mb-2">
                        <ArrowRight className="w-4 h-4" /> اللقاءات
                    </Link>
                    <h1 className="text-3xl font-bold">{meeting.title}</h1>
                    <p className="text-muted-foreground">{group?.name}</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => window.print()} data-testid="print-meeting-btn">
                        <Printer className="w-4 h-4 ms-2" /> طباعة
                    </Button>
                    {canEdit && members.length > 0 && (
                        <Button onClick={saveAll} data-testid="save-all-attendance-btn">حفظ جميع التحضير</Button>
                    )}
                </div>
            </div>

            <Card>
                <CardHeader><CardTitle>تفاصيل اللقاء</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <Info label="اليوم" value={meeting.day_of_week} />
                    <Info label="التاريخ الهجري" value={meeting.date_hijri} />
                    <Info label="التاريخ الميلادي" value={meeting.date_gregorian} dir="ltr" />
                    <Info label="المكان" value={meeting.location} />
                    <Info label="مقدم الموضوع" value={meeting.presenter} />
                    <Info label="نوع الإلقاء" value={meeting.presentation_type} />
                    <Info label="المجال" value={domain?.name} />
                    <Info label="الكفاية" value={comp?.name} />
                    <Info label="الحضور" value={meeting.attendance_count || 0} />
                    <Info label="الحالة" value={meeting.executed ? "تم التنفيذ" : "لم يُنفذ"} />
                    {meeting.materials_link && (
                        <div className="col-span-2">
                            <div className="text-muted-foreground text-xs mb-1">المواد</div>
                            <a href={meeting.materials_link} target="_blank" rel="noreferrer" className="text-primary hover:underline" dir="ltr">
                                {meeting.materials_link}
                            </a>
                        </div>
                    )}
                    {meeting.notes && (
                        <div className="col-span-full">
                            <div className="text-muted-foreground text-xs mb-1">ملاحظات</div>
                            <p>{meeting.notes}</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader><CardTitle>تحضير الأفراد ({members.length})</CardTitle></CardHeader>
                <CardContent className="p-0">
                    {canEdit && members.length > 0 && (
                        <div className="p-4 bg-primary/5 border-b text-sm text-primary flex items-center gap-2">
                            <span className="font-medium">تنبيه:</span>
                            <span>الحالة الافتراضية لجميع الأفراد هي «حضر». أطفئ مفتاح الحضور للغائبين فقط ثم اضغط «حفظ جميع التحضير».</span>
                        </div>
                    )}
                    {members.length === 0 ? (
                        <div className="p-6 text-center text-muted-foreground">لا يوجد أعضاء في هذه المجموعة</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="text-right sticky right-0 bg-white z-10">العضو</TableHead>
                                        <TableHead className="text-center">الحضور</TableHead>
                                        <TableHead className="text-center">التحضير</TableHead>
                                        {criteria.map((cr) => (
                                            <TableHead key={cr.id} className="text-right min-w-[200px]">{cr.text}</TableHead>
                                        ))}
                                        {canEdit && <TableHead>حفظ</TableHead>}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {members.map((mem) => {
                                        const cur = attMap[mem.id] || { attended: false, prepared: false, evaluations: {} };
                                        return (
                                            <TableRow key={mem.id} data-testid={`att-row-${mem.id}`}>
                                                <TableCell className="font-medium sticky right-0 bg-white z-10">
                                                    <Link to={`/members/${mem.id}`} className="text-primary hover:underline">{mem.name}</Link>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <Switch
                                                        checked={cur.attended}
                                                        onCheckedChange={(v) => setField(mem.id, "attended", v)}
                                                        disabled={!canEdit}
                                                        data-testid={`att-attended-${mem.id}`}
                                                    />
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <Switch
                                                        checked={cur.prepared}
                                                        onCheckedChange={(v) => setField(mem.id, "prepared", v)}
                                                        disabled={!canEdit}
                                                    />
                                                </TableCell>
                                                {criteria.map((cr) => (
                                                    <TableCell key={cr.id}>
                                                        <Select
                                                            value={cur.evaluations?.[cr.id] || ""}
                                                            onValueChange={(v) => setEval(mem.id, cr.id, v)}
                                                            disabled={!canEdit}
                                                        >
                                                            <SelectTrigger className="h-9"><SelectValue placeholder="تقييم" /></SelectTrigger>
                                                            <SelectContent>
                                                                {LEVELS.map((l) => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
                                                            </SelectContent>
                                                        </Select>
                                                    </TableCell>
                                                ))}
                                                {canEdit && (
                                                    <TableCell>
                                                        <Button size="sm" variant="outline" onClick={() => saveMember(mem.id)} data-testid={`save-att-${mem.id}`}>حفظ</Button>
                                                    </TableCell>
                                                )}
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

function Info({ label, value, dir }) {
    return (
        <div>
            <div className="text-muted-foreground text-xs mb-1">{label}</div>
            <div dir={dir} className={dir === "ltr" ? "text-right font-medium" : "font-medium"}>{value || "—"}</div>
        </div>
    );
}
