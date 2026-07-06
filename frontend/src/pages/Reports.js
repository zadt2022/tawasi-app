import { useEffect, useState } from "react";
import api, { API_BASE } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
    BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line,
} from "recharts";
import { Printer, Download, CheckCircle2, XCircle, Clock, CalendarRange } from "lucide-react";

const HIJRI_MONTH_NAMES = [
    "محرم", "صفر", "ربيع الأول", "ربيع الآخر", "جمادى الأولى", "جمادى الآخرة",
    "رجب", "شعبان", "رمضان", "شوال", "ذو القعدة", "ذو الحجة",
];
const HIJRI_YEARS = [47, 48, 49, 50, 51, 52];

const COLORS = ["#2A5C43", "#D4A373", "#8A9A5B", "#E6CCB2", "#7E6B5A"];

export default function Reports() {
    const [groups, setGroups] = useState([]);
    const [groupId, setGroupId] = useState("all");
    const [data, setData] = useState(null);
    const [months, setMonths] = useState([]);
    const [monthDetail, setMonthDetail] = useState(null);
    const [yearOpen, setYearOpen] = useState(false);
    const [yearSel, setYearSel] = useState(48);
    const [yearData, setYearData] = useState(null);

    const load = async () => {
        const g = await api.get("/groups");
        setGroups(g.data);
        const url = groupId && groupId !== "all" ? `/reports/summary?group_id=${groupId}` : "/reports/summary";
        const r = await api.get(url);
        setData(r.data);
        const mr = await api.get("/reports/months");
        setMonths(mr.data.sort((a, b) => (a.month || "").localeCompare(b.month || "")));
    };

    const openMonth = async (month) => {
        const r = await api.get(`/reports/by-month?month=${encodeURIComponent(month)}`);
        setMonthDetail(r.data);
    };

    const openYearSummary = async () => {
        setYearOpen(true);
        const rows = [];
        for (const name of HIJRI_MONTH_NAMES) {
            const m = `${name}${yearSel}`;
            const r = await api.get(`/reports/by-month?month=${encodeURIComponent(m)}`);
            rows.push({ month: m, name, ...r.data });
        }
        setYearData(rows);
    };

    useEffect(() => {
        if (yearOpen) {
            setYearData(null);
            openYearSummary();
        }
        // eslint-disable-next-line
    }, [yearSel]);

    useEffect(() => { load(); /* eslint-disable-next-line */ }, [groupId]);

    const download = () => {
        const token = localStorage.getItem("access_token");
        const url = new URL(`${API_BASE}/reports/export.csv`);
        if (groupId !== "all") url.searchParams.set("group_id", groupId);
        // Use anchor with fetch/blob for auth cookie support
        fetch(url.toString(), {
            credentials: "include",
            headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
            .then((r) => r.blob())
            .then((blob) => {
                const link = document.createElement("a");
                link.href = URL.createObjectURL(blob);
                link.download = "meetings_report.csv";
                link.click();
            });
    };

    if (!data) return <div className="text-muted-foreground">جارٍ التحميل...</div>;

    return (
        <div className="space-y-6" data-testid="reports-page">
            <div className="flex items-center justify-between flex-wrap gap-4 no-print">
                <div>
                    <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-1">التقارير</h1>
                    <p className="text-muted-foreground">تقارير تفاعلية قابلة للطباعة والتصدير</p>
                </div>
                <div className="flex gap-2 items-center">
                    <Select value={groupId} onValueChange={setGroupId}>
                        <SelectTrigger className="w-56" data-testid="report-group-select"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">جميع المجموعات</SelectItem>
                            {groups.map((g) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <Button variant="outline" onClick={() => window.print()} data-testid="print-report-btn"><Printer className="w-4 h-4 ms-2" /> طباعة PDF</Button>
                    <Button variant="outline" onClick={openYearSummary} data-testid="year-summary-btn"><CalendarRange className="w-4 h-4 ms-2" /> ملخص السنة الهجرية</Button>
                    <Button onClick={download} data-testid="export-csv-btn"><Download className="w-4 h-4 ms-2" /> تصدير Excel</Button>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <Stat title="المجموعات" value={data.totals.groups} />
                <Stat title="الأفراد" value={data.totals.members} />
                <Stat title="اللقاءات" value={data.totals.meetings} />
                <Stat title="المنفذة" value={data.totals.executed} />
                <Stat title="مجموع الحضور" value={data.totals.attendance} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader><CardTitle>تطور الحضور</CardTitle></CardHeader>
                    <CardContent className="h-[280px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={data.timeline}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#E7E5E4" />
                                <XAxis dataKey="month" reversed tick={{ fontSize: 12 }} />
                                <YAxis reversed orientation="right" tick={{ fontSize: 12 }} />
                                <Tooltip />
                                <Line type="monotone" dataKey="attendance" stroke="#2A5C43" strokeWidth={3} name="الحضور" />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle>حسب المجال</CardTitle></CardHeader>
                    <CardContent className="h-[280px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie data={data.by_domain} dataKey="value" nameKey="name" outerRadius={95} label>
                                    {data.by_domain.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle>حسب نوع الإلقاء</CardTitle></CardHeader>
                    <CardContent className="h-[280px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data.by_type}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#E7E5E4" />
                                <XAxis dataKey="name" reversed tick={{ fontSize: 12 }} />
                                <YAxis reversed orientation="right" tick={{ fontSize: 12 }} />
                                <Tooltip />
                                <Bar dataKey="value" fill="#8A9A5B" name="عدد" radius={[6, 6, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader><CardTitle>تحقق الكفايات %</CardTitle></CardHeader>
                    <CardContent className="h-[280px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data.competency_achievement} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" stroke="#E7E5E4" />
                                <XAxis type="number" domain={[0, 100]} reversed orientation="top" tick={{ fontSize: 12 }} />
                                <YAxis type="category" dataKey="name" orientation="right" width={140} tick={{ fontSize: 12 }} />
                                <Tooltip />
                                <Bar dataKey="value" fill="#D4A373" name="النسبة %" radius={[0, 6, 6, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader><CardTitle>اللقاءات حسب الشهر الهجري</CardTitle></CardHeader>
                <CardContent>
                    {months.length === 0 ? (
                        <div className="text-center py-6 text-muted-foreground">لا توجد بيانات</div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                            {months.map((m) => (
                                <button
                                    key={m.month}
                                    onClick={() => openMonth(m.month)}
                                    className="text-right border rounded-lg p-3 hover:border-primary hover:bg-primary/5 transition-all"
                                    data-testid={`month-card-${m.month}`}
                                >
                                    <div className="font-bold">{m.month}</div>
                                    <div className="text-xs text-muted-foreground mt-1">
                                        {m.executed}/{m.total} منفذة
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            <Dialog open={!!monthDetail} onOpenChange={(v) => !v && setMonthDetail(null)}>
                <DialogContent dir="rtl" className="max-w-2xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader><DialogTitle>تفاصيل شهر {monthDetail?.month}</DialogTitle></DialogHeader>
                    {monthDetail && (
                        <div className="space-y-2">
                            {monthDetail.groups.map((g) => (
                                <div key={g.group_id} className="flex items-center justify-between border rounded-md p-3">
                                    <span className="font-medium">{g.group_name}</span>
                                    {g.status === "executed" ? (
                                        <span className="flex items-center gap-1 text-primary text-sm"><CheckCircle2 className="w-4 h-4" /> نفّذت اللقاء</span>
                                    ) : g.status === "planned" ? (
                                        <span className="flex items-center gap-1 text-yellow-600 text-sm"><Clock className="w-4 h-4" /> مخطط لم يُنفذ</span>
                                    ) : (
                                        <span className="flex items-center gap-1 text-destructive text-sm"><XCircle className="w-4 h-4" /> لم يُسجَّل لقاء</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            <Dialog open={yearOpen} onOpenChange={setYearOpen}>
                <DialogContent dir="rtl" className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-4">
                            <span>ملخص السنة الهجرية 14{yearSel}هـ</span>
                            <Select value={String(yearSel)} onValueChange={(v) => setYearSel(Number(v))}>
                                <SelectTrigger className="w-32" data-testid="year-summary-select"><SelectValue /></SelectTrigger>
                                <SelectContent>{HIJRI_YEARS.map((y) => <SelectItem key={y} value={String(y)}>14{y}هـ</SelectItem>)}</SelectContent>
                            </Select>
                            <Button size="sm" variant="outline" onClick={() => window.print()}><Printer className="w-4 h-4 ms-1" /> طباعة</Button>
                        </DialogTitle>
                    </DialogHeader>
                    {!yearData ? (
                        <div className="text-center py-8 text-muted-foreground">جارٍ التحميل...</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm border-collapse" data-testid="year-summary-table">
                                <thead>
                                    <tr className="border-b">
                                        <th className="text-right p-2 font-bold sticky right-0 bg-white">الشهر</th>
                                        {(yearData[0]?.groups || []).map((g) => (
                                            <th key={g.group_id} className="text-center p-2 font-bold min-w-[110px]">{g.group_name}</th>
                                        ))}
                                        <th className="text-center p-2 font-bold">الإنجاز</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {yearData.map((row) => {
                                        const done = row.groups.filter((g) => g.status === "executed").length;
                                        const total = row.groups.length;
                                        return (
                                            <tr key={row.month} className="border-b hover:bg-muted/30">
                                                <td className="p-2 font-medium sticky right-0 bg-white">{row.name}</td>
                                                {row.groups.map((g) => (
                                                    <td key={g.group_id} className="text-center p-2">
                                                        {g.status === "executed" ? <span className="inline-block px-2 py-1 rounded bg-primary/15 text-primary text-xs">نفّذت</span>
                                                            : g.status === "planned" ? <span className="inline-block px-2 py-1 rounded bg-yellow-100 text-yellow-800 text-xs">مخطط</span>
                                                                : <span className="inline-block px-2 py-1 rounded bg-destructive/10 text-destructive text-xs">—</span>}
                                                    </td>
                                                ))}
                                                <td className="text-center p-2 font-medium">{done}/{total}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}

function Stat({ title, value }) {
    return (
        <Card>
            <CardContent className="p-5">
                <div className="text-sm text-muted-foreground mb-1">{title}</div>
                <div className="text-2xl font-bold">{value}</div>
            </CardContent>
        </Card>
    );
}
