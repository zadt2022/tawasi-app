# نظام إدارة اللقاءات — PRD

## Original Problem Statement
تطبيق عربي لتنظيم المجموعات وأعضائها ولقاءاتها الشهرية مع:
- بيانات لقاء: يوم، تاريخ هجري/ميلادي، عدد الحضور، المكان، تحضير الأفراد
- مجال اللقاء، الكفاية، الموضوع، مقدم الموضوع، نوع الإلقاء
- إدارة هرمية للمجالات → الكفايات → معايير تحقق الكفاية
- صلاحيات: مشرف عام + مدراء مجموعات فقط للتعديل
- لوحة تقارير برسوم بيانية تفاعلية + طباعة/تصدير

## Architecture
- Backend: FastAPI + MongoDB (motor) + JWT (bcrypt + PyJWT)
- Frontend: React 19 + Tailwind + shadcn/ui + Recharts + RTL (Tajawal)

## User Personas
- **مشرف عام (admin)**: صلاحيات كاملة (CRUD على كل شيء + إدارة المستخدمين)
- **مدير مجموعة (manager)**: تعديل مجموعاته المحددة فقط
- **عضو (member)**: عرض فقط

## Implemented (2026-02)
- JWT auth (login/logout/me) + admin seeding
- CRUD: Groups, Members, Domains, Competencies, Criteria, Meetings, Users
- Per-member attendance + criterion evaluation (high/medium/low/absent)
- Interactive dashboard (attendance timeline, domain pie, presentation-type bar, competency achievement)
- Reports page with charts + CSV/Excel export + print-to-PDF
- Full Arabic RTL UI with collapsible off-canvas sidebar
- Role-based UI (edit buttons hidden for viewers)

## Test Credentials
- admin@meetings.app / Admin@12345 (see /app/memory/test_credentials.md)

## Backlog (P1/P2)
- P1: Import initial data from Excel template
- P1: Excel (.xlsx) export using openpyxl (currently CSV with BOM)
- P1: Hijri date picker (currently manual text input)
- P2: Bulk attendance entry shortcuts
- P2: Email notifications for upcoming meetings
- P2: Per-member historical performance timeline
