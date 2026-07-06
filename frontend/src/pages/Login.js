import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ShieldCheck, Loader2 } from "lucide-react";

export default function Login() {
    const { user, login, loading } = useAuth();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const navigate = useNavigate();

    if (loading) return null;
    if (user) return <Navigate to="/dashboard" replace />;

    const onSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        const res = await login(email, password);
        setSubmitting(false);
        if (res.ok) {
            toast.success("تم تسجيل الدخول بنجاح");
            navigate("/dashboard");
        } else {
            toast.error(res.error || "فشل تسجيل الدخول");
        }
    };

    return (
        <div className="min-h-screen grid md:grid-cols-2" dir="rtl">
            <div className="hidden md:flex relative bg-primary text-primary-foreground p-10 items-center justify-center overflow-hidden">
                <div
                    className="absolute inset-0 opacity-25"
                    style={{
                        backgroundImage:
                            "url(https://images.pexels.com/photos/34256958/pexels-photo-34256958.jpeg)",
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                    }}
                />
                <div className="relative z-10 max-w-md">
                    <img src="/logo.png" alt="شعار" className="w-24 h-24 mb-8 object-contain bg-white/10 rounded-2xl p-2 backdrop-blur" />
                    <h1 className="text-arabic-hero text-4xl md:text-5xl mb-4">
                        مشروع تواصي
                    </h1>
                    <p className="text-lg text-primary-foreground/85 leading-relaxed">
                        نظِّم مجموعاتك، تابع لقاءاتك الشهرية، وقس تحقق الكفايات
                        من خلال لوحة تقارير تفاعلية.
                    </p>
                    <div className="mt-10 grid grid-cols-3 gap-4 text-sm">
                        <div className="bg-white/10 rounded-lg p-4">
                            <div className="font-bold text-xl">مجموعات</div>
                            <div className="text-primary-foreground/70">إدارة كاملة</div>
                        </div>
                        <div className="bg-white/10 rounded-lg p-4">
                            <div className="font-bold text-xl">لقاءات</div>
                            <div className="text-primary-foreground/70">تنظيم شهري</div>
                        </div>
                        <div className="bg-white/10 rounded-lg p-4">
                            <div className="font-bold text-xl">تقارير</div>
                            <div className="text-primary-foreground/70">رسوم تفاعلية</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-center p-6 md:p-10 bg-grid-pattern">
                <Card className="w-full max-w-md shadow-sm">
                    <CardContent className="p-8">
                        <div className="mb-6">
                            <h2 className="text-2xl font-bold mb-2">تسجيل الدخول</h2>
                            <p className="text-sm text-muted-foreground">
                                أدخل بيانات حسابك للمتابعة إلى لوحة التحكم
                            </p>
                        </div>
                        <form onSubmit={onSubmit} className="space-y-5">
                            <div className="space-y-2">
                                <Label htmlFor="email">البريد الإلكتروني</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="admin@meetings.app"
                                    dir="ltr"
                                    className="text-right"
                                    required
                                    data-testid="login-email-input"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="password">كلمة المرور</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    data-testid="login-password-input"
                                />
                            </div>
                            <Button
                                type="submit"
                                className="w-full"
                                disabled={submitting}
                                data-testid="login-submit-btn"
                            >
                                {submitting && <Loader2 className="w-4 h-4 animate-spin ms-2" />}
                                دخول
                            </Button>
                        </form>
                        <div className="mt-6 text-xs text-muted-foreground text-center">
                            الحساب الافتراضي: <span dir="ltr">admin@meetings.app</span> / Admin@12345
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
