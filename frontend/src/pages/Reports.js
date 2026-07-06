import { useEffect, useState } from "react";
import api, { API_BASE } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
    BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line,
} from "recharts";
import { Printer, Download } from "lucide-react";

const COLORS = ["#2A5C43", "#D4A373", "#8A9A5B", "#E6CCB2", "#7E6B5A"];

export default function Reports() {
    const [groups, setGroups] = useState([]);
    const [groupId, setGroupId] = useState("all");
    const [data, setData] = useState(null);

    const load = async () => {
        const g = await api.get("/groups");
        setGroups(g.data);
        const url = groupId && groupId !== "all" ? `/reports/summary?group_id=${groupId}` : "/reports/summary";
        const r = await api.get(url);
        setData(r.data);
    };

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
