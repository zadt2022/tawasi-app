import { useEffect, useState } from "react";
import api, { formatApiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, Target } from "lucide-react";

export default function Domains() {
    const { canEdit, isAdmin } = useAuth();
    const [domains, setDomains] = useState([]);
    const [dialog, setDialog] = useState(null); // {type, mode, data, parentId?}

    const load = async () => setDomains((await api.get("/domains")).data);
    useEffect(() => { load(); }, []);

    const save = async () => {
        try {
            const { type, mode, data, parentId } = dialog;
            const url = mode === "edit"
                ? { domain: `/domains/${data.id}`, competency: `/competencies/${data.id}`, criterion: `/criteria/${data.id}` }[type]
                : { domain: "/domains", competency: "/competencies", criterion: "/criteria" }[type];
            const method = mode === "edit" ? "patch" : "post";
            const payload = type === "domain"
                ? { name: data.name, description: data.description }
                : type === "competency"
                    ? { name: data.name, description: data.description, domain_id: parentId || data.domain_id }
                    : { text: data.text, competency_id: parentId || data.competency_id };
            await api[method](url, payload);
            toast.success("تم الحفظ");
            setDialog(null);
            load();
        } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
    };

    const remove = async (type, id) => {
        if (!window.confirm("هل تريد الحذف؟")) return;
        const url = { domain: `/domains/${id}`, competency: `/competencies/${id}`, criterion: `/criteria/${id}` }[type];
        try { await api.delete(url); toast.success("تم الحذف"); load(); }
        catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
    };

    return (
        <div className="space-y-6" data-testid="domains-page">
            <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-1">المجالات والكفايات</h1>
                    <p className="text-muted-foreground">إدارة المجالات وكفاياتها ومعايير تحققها</p>
                </div>
                {canEdit && (
                    <Button onClick={() => setDialog({ type: "domain", mode: "new", data: { name: "", description: "" } })} data-testid="new-domain-btn">
                        <Plus className="w-4 h-4 ms-2" /> مجال جديد
                    </Button>
                )}
            </div>

            {domains.length === 0 ? (
                <Card><CardContent className="p-10 text-center text-muted-foreground">لا توجد مجالات</CardContent></Card>
            ) : (
                <Accordion type="multiple" className="space-y-3">
                    {domains.map((d) => (
                        <AccordionItem key={d.id} value={d.id} className="border rounded-lg bg-white px-4">
                            <AccordionTrigger data-testid={`domain-${d.id}`}>
                                <div className="flex items-center gap-3 flex-1">
                                    <Target className="w-4 h-4 text-primary" />
                                    <div className="text-right flex-1">
                                        <div className="font-bold">{d.name}</div>
                                        {d.description && <div className="text-xs text-muted-foreground font-normal">{d.description}</div>}
                                    </div>
                                    <span className="text-xs text-muted-foreground ms-2">{d.competencies?.length || 0} كفاية</span>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="space-y-3 pt-2">
                                {canEdit && (
                                    <div className="flex gap-2">
                                        <Button size="sm" variant="outline" onClick={() => setDialog({ type: "competency", mode: "new", data: { name: "", description: "" }, parentId: d.id })} data-testid={`add-competency-${d.id}`}>
                                            <Plus className="w-4 h-4 ms-1" /> كفاية
                                        </Button>
                                        <Button size="sm" variant="ghost" onClick={() => setDialog({ type: "domain", mode: "edit", data: { ...d } })}>
                                            <Pencil className="w-4 h-4" />
                                        </Button>
                                        {isAdmin && (
                                            <Button size="sm" variant="ghost" onClick={() => remove("domain", d.id)}>
                                                <Trash2 className="w-4 h-4 text-destructive" />
                                            </Button>
                                        )}
                                    </div>
                                )}
                                {(d.competencies || []).map((c) => (
                                    <div key={c.id} className="border rounded-md p-3 bg-muted/30">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="font-medium">{c.name}</div>
                                            {canEdit && (
                                                <div className="flex gap-1">
                                                    <Button size="icon" variant="ghost" onClick={() => setDialog({ type: "criterion", mode: "new", data: { text: "" }, parentId: c.id })} data-testid={`add-criterion-${c.id}`}>
                                                        <Plus className="w-4 h-4" />
                                                    </Button>
                                                    <Button size="icon" variant="ghost" onClick={() => setDialog({ type: "competency", mode: "edit", data: { ...c } })}>
                                                        <Pencil className="w-4 h-4" />
                                                    </Button>
                                                    {isAdmin && (
                                                        <Button size="icon" variant="ghost" onClick={() => remove("competency", c.id)}>
                                                            <Trash2 className="w-4 h-4 text-destructive" />
                                                        </Button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        {c.description && <div className="text-xs text-muted-foreground mb-2">{c.description}</div>}
                                        <ul className="space-y-1">
                                            {(c.criteria || []).map((cr) => (
                                                <li key={cr.id} className="flex items-center justify-between text-sm bg-white border rounded px-3 py-2">
                                                    <span>• {cr.text}</span>
                                                    {canEdit && (
                                                        <div className="flex gap-1">
                                                            <Button size="icon" variant="ghost" onClick={() => setDialog({ type: "criterion", mode: "edit", data: { ...cr } })}>
                                                                <Pencil className="w-3 h-3" />
                                                            </Button>
                                                            {isAdmin && (
                                                                <Button size="icon" variant="ghost" onClick={() => remove("criterion", cr.id)}>
                                                                    <Trash2 className="w-3 h-3 text-destructive" />
                                                                </Button>
                                                            )}
                                                        </div>
                                                    )}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                ))}
                            </AccordionContent>
                        </AccordionItem>
                    ))}
                </Accordion>
            )}

            <Dialog open={!!dialog} onOpenChange={(v) => !v && setDialog(null)}>
                <DialogContent dir="rtl">
                    <DialogHeader>
                        <DialogTitle>
                            {dialog?.mode === "edit" ? "تعديل" : "إضافة"}{" "}
                            {dialog?.type === "domain" ? "مجال" : dialog?.type === "competency" ? "كفاية" : "معيار تحقق"}
                        </DialogTitle>
                    </DialogHeader>
                    {dialog && (
                        <div className="space-y-4">
                            {dialog.type === "criterion" ? (
                                <div className="space-y-2">
                                    <Label>نص المعيار</Label>
                                    <Textarea value={dialog.data.text || ""} onChange={(e) => setDialog({ ...dialog, data: { ...dialog.data, text: e.target.value } })} data-testid="criterion-text-input" />
                                </div>
                            ) : (
                                <>
                                    <div className="space-y-2">
                                        <Label>الاسم</Label>
                                        <Input value={dialog.data.name || ""} onChange={(e) => setDialog({ ...dialog, data: { ...dialog.data, name: e.target.value } })} data-testid={`${dialog.type}-name-input`} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>الوصف (اختياري)</Label>
                                        <Textarea value={dialog.data.description || ""} onChange={(e) => setDialog({ ...dialog, data: { ...dialog.data, description: e.target.value } })} />
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialog(null)}>إلغاء</Button>
                        <Button onClick={save} data-testid="domain-dialog-save-btn">حفظ</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
