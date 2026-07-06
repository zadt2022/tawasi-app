import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { ArrowRight, Printer, User, CheckCircle2, XCircle, BookOpen } from "lucide-react";

const LEVEL_LABEL = { high: "عالية", medium: "متوسطة", low: "منخفضة", absent: "لم يحضر" };
const LEVEL_COLOR = { high: "bg-primary/15 text-primary", medium: "bg-secondary/25 text-secondary-foreground", low: "bg-yellow-100 text-yellow-800", absent: "bg-destructive/10 text-destructive" };

export default function MemberProfile() {
    const { id } = useParams();
    const [data, setData] = useState(null);

    useEffect(() => {
        api.get(`/members/${id}/profile`).then((r) => setData(r.data));
    }, [id]);

    if (!data) return <div className="text-muted-foreground">جارٍ التحميل...</div>;

    const { member, group, totals, history, competency_averages } = data;

    return (
        <div className="space-y-6" data-testid="member-profile-page">
            <div className="flex items-center justify-between flex-wrap gap-3 no-print">
                <div>
                    <Link to={`/groups/${group?.id}`} className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1 mb-2">
                        <ArrowRight className="w-4 h-4" /> {group?.name}
                    </Link>
                    <h1 className="text-3xl font-bold flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground grid place-items-center">
                            <User className="w-6 h-6" />
                        </div>
                        {member.name}
                    </h1>
                    {member.phone && <p className="text-muted-foreground mt-1" dir="ltr">{member.phone}</p>}
                </div>
                <Button variant="outline" onClick={() => window.print()} data-testid="print-profile-btn">
                    <Printer className="w-4 h-4 ms-2" /> طباعة البطاقة
                </Button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card><CardContent className="p-5"><div className="text-sm text-muted-foreground mb-1">لقاءات مسجّلة</div><div className="text-2xl font-bold">{totals.meetings_recorded}</div></CardContent></Card>
                <Card><CardContent className="p-5"><div className="text-sm text-muted-foreground mb-1">مرات الحضور</div><div className="text-2xl font-bold text-primary">{totals.attended}</div></CardContent></Card>
                <Card><CardContent className="p-5"><div className="text-sm text-muted-foreground mb-1">مرات التحضير</div><div className="text-2xl font-bold">{totals.prepared}</div></CardContent></Card>
                <Card><CardContent className="p-5"><div className="text-sm text-muted-foreground mb-1">نسبة الحضور</div><div className="text-2xl font-bold">{totals.attendance_rate}%</div></CardContent></Card>
            </div>

            {competency_averages.length > 0 && (
                <Card>
                    <CardHeader><CardTitle>متوسط تحقق الكفايات (%)</CardTitle></CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={competency_averages} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" stroke="#E7E5E4" />
                                <XAxis type="number" domain={[0, 100]} reversed orientation="top" tick={{ fontSize: 12 }} />
                                <YAxis type="category" dataKey="name" orientation="right" width={160} tick={{ fontSize: 12 }} />
                                <Tooltip />
                                <Bar dataKey="value" fill="#0F766E" radius={[0, 6, 6, 0]} name="النسبة %" />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
            )}

            <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><BookOpen className="w-5 h-5" /> سجل اللقاءات</CardTitle></CardHeader>
                <CardContent className="p-0">
                    {history.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground">لا يوجد سجل بعد</div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="text-right">اللقاء</TableHead>
                                    <TableHead className="text-right">الشهر</TableHead>
                                    <TableHead className="text-right">الحضور</TableHead>
                                    <TableHead className="text-right">التحضير</TableHead>
                                    <TableHead className="text-right">التقييمات</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {history.map((h) => (
                                    <TableRow key={h.meeting_id} data-testid={`profile-row-${h.meeting_id}`}>
                                        <TableCell className="font-medium">
                                            <Link to={`/meetings/${h.meeting_id}`} className="text-primary hover:underline">{h.title}</Link>
                                        </TableCell>
                                        <TableCell>{h.hijri_month || "—"}</TableCell>
                                        <TableCell>{h.attended ? <span className="flex items-center gap-1 text-primary"><CheckCircle2 className="w-4 h-4" /> حضر</span> : <span className="flex items-center gap-1 text-destructive"><XCircle className="w-4 h-4" /> غاب</span>}</TableCell>
                                        <TableCell>{h.prepared ? "نعم" : "لا"}</TableCell>
                                        <TableCell>
                                            <div className="flex flex-wrap gap-1">
                                                {Object.entries(h.evaluations || {}).map(([cid, lvl]) => (
                                                    <span key={cid} className={`text-xs px-2 py-0.5 rounded ${LEVEL_COLOR[lvl] || "bg-muted"}`}>{LEVEL_LABEL[lvl] || lvl}</span>
                                                ))}
                                                {Object.keys(h.evaluations || {}).length === 0 && <span className="text-muted-foreground text-xs">—</span>}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
