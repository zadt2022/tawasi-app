import { useEffect, useState } from "react";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    BarChart,
    Bar,
    LineChart,
    Line,
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
} from "recharts";
import { Users2, CalendarDays, ClipboardCheck, UserCheck } from "lucide-react";

const COLORS = ["#2A5C43", "#D4A373", "#8A9A5B", "#E6CCB2", "#7E6B5A"];

function StatCard({ label, value, icon: Icon, testId }) {
    return (
        <Card data-testid={testId} className="transition-all hover:shadow-md">
            <CardContent className="p-6">
                <div className="flex items-start justify-between">
                    <div>
                        <div className="text-sm text-muted-foreground mb-1">{label}</div>
                        <div className="text-3xl font-bold text-foreground">{value}</div>
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary grid place-items-center">
                        <Icon className="w-5 h-5" />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

export default function Dashboard() {
    const [data, setData] = useState(null);

    useEffect(() => {
        api.get("/reports/summary").then((r) => setData(r.data));
    }, []);

    if (!data)
        return <div className="text-muted-foreground">جارٍ تحميل البيانات...</div>;

    return (
        <div className="space-y-8" data-testid="dashboard-page">
            <div>
                <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-2">لوحة التحكم</h1>
                <p className="text-muted-foreground">نظرة عامة على المجموعات واللقاءات ونسب الحضور</p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="عدد المجموعات" value={data.totals.groups} icon={Users2} testId="stat-groups" />
                <StatCard label="عدد الأفراد" value={data.totals.members} icon={UserCheck} testId="stat-members" />
                <StatCard label="اللقاءات المسجلة" value={data.totals.meetings} icon={CalendarDays} testId="stat-meetings" />
                <StatCard label="اللقاءات المنفذة" value={data.totals.executed} icon={ClipboardCheck} testId="stat-executed" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>الحضور الشهري</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={data.timeline}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#E7E5E4" />
                                <XAxis dataKey="month" reversed tick={{ fontSize: 12 }} />
                                <YAxis reversed orientation="right" tick={{ fontSize: 12 }} />
                                <Tooltip />
                                <Line
                                    type="monotone"
                                    dataKey="attendance"
                                    stroke="#2A5C43"
                                    strokeWidth={3}
                                    dot={{ r: 4 }}
                                    name="الحضور"
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>اللقاءات حسب المجال</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={data.by_domain}
                                    dataKey="value"
                                    nameKey="name"
                                    outerRadius={100}
                                    label
                                >
                                    {data.by_domain.map((_, i) => (
                                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>أنواع الإلقاء</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px]">
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
                    <CardHeader>
                        <CardTitle>نسبة تحقق الكفايات</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px]">
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
