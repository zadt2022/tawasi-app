import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { Toaster } from "@/components/ui/sonner";
import Layout from "@/components/Layout";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Groups from "@/pages/Groups";
import GroupDetail from "@/pages/GroupDetail";
import Meetings from "@/pages/Meetings";
import MeetingDetail from "@/pages/MeetingDetail";
import Domains from "@/pages/Domains";
import Reports from "@/pages/Reports";
import Users from "@/pages/Users";
import Permissions from "@/pages/Permissions";
import MemberProfile from "@/pages/MemberProfile";
import "@/App.css";

function Protected({ children, adminOnly }) {
    const { user, loading } = useAuth();
    if (loading)
        return (
            <div className="min-h-screen flex items-center justify-center text-muted-foreground">
                جارٍ التحميل...
            </div>
        );
    if (!user) return <Navigate to="/login" replace />;
    if (adminOnly && user.role !== "admin") return <Navigate to="/dashboard" replace />;
    return children;
}

function AppRoutes() {
    return (
        <Routes>
            <Route path="/login" element={<Login />} />
            <Route
                element={
                    <Protected>
                        <Layout />
                    </Protected>
                }
            >
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/groups" element={<Groups />} />
                <Route path="/groups/:id" element={<GroupDetail />} />
                <Route path="/meetings" element={<Meetings />} />
                <Route path="/meetings/:id" element={<MeetingDetail />} />
                <Route path="/members/:id" element={<MemberProfile />} />
                <Route path="/domains" element={<Domains />} />
                <Route path="/reports" element={<Reports />} />
                <Route
                    path="/users"
                    element={
                        <Protected adminOnly>
                            <Users />
                        </Protected>
                    }
                />
                <Route
                    path="/permissions"
                    element={
                        <Protected adminOnly>
                            <Permissions />
                        </Protected>
                    }
                />
            </Route>
        </Routes>
    );
}

export default function App() {
    return (
        <div className="App" dir="rtl">
            <AuthProvider>
                <BrowserRouter>
                    <AppRoutes />
                    <Toaster position="top-center" richColors dir="rtl" />
                </BrowserRouter>
            </AuthProvider>
        </div>
    );
}
