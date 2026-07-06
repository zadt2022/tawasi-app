from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import io
import csv
import uuid
import logging
import bcrypt
import jwt as pyjwt
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict, Any

from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response
from fastapi.responses import StreamingResponse
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr

# ---------- Config ----------
MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
JWT_SECRET = os.environ["JWT_SECRET"]
JWT_ALGO = "HS256"
ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "admin@meetings.app")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "Admin@12345")
CORS_ORIGINS = [o.strip() for o in os.environ.get("CORS_ORIGINS", "*").split(",") if o.strip()]

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

app = FastAPI(title="نظام إدارة اللقاءات")
api = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("meetings")


# ---------- Utilities ----------
def new_id() -> str:
    return str(uuid.uuid4())


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def create_access_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "type": "access",
        "exp": datetime.now(timezone.utc) + timedelta(hours=12),
    }
    return pyjwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)


def decode_token(token: str) -> Dict[str, Any]:
    return pyjwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])


def strip_password(user: dict) -> dict:
    if not user:
        return user
    user = dict(user)
    user.pop("password_hash", None)
    user.pop("_id", None)
    return user


async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(status_code=401, detail="غير مصرح لك بالوصول")
    try:
        payload = decode_token(token)
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="رمز غير صالح")
        user = await db.users.find_one({"id": payload["sub"]})
        if not user:
            raise HTTPException(status_code=401, detail="المستخدم غير موجود")
        return strip_password(user)
    except pyjwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="انتهت صلاحية الجلسة")
    except pyjwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="رمز غير صالح")


def require_roles(*roles: str):
    async def _dep(user: dict = Depends(get_current_user)) -> dict:
        if user.get("role") not in roles:
            raise HTTPException(status_code=403, detail="ليس لديك صلاحية لهذا الإجراء")
        return user
    return _dep


async def can_edit_group(user: dict, group_id: str) -> bool:
    if user.get("role") == "admin":
        return True
    if user.get("role") == "manager":
        managed = user.get("managed_group_ids") or []
        return group_id in managed
    return False


# ---------- Models ----------
class LoginIn(BaseModel):
    email: EmailStr
    password: str


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: str = Field(pattern="^(admin|manager|member)$")
    managed_group_ids: List[str] = []
    group_id: Optional[str] = None  # للعضو: مجموعته الوحيدة


class UserUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = Field(default=None, pattern="^(admin|manager|member)$")
    managed_group_ids: Optional[List[str]] = None
    group_id: Optional[str] = None
    password: Optional[str] = None


DEFAULT_PERMISSIONS = {
    "manager": {
        "dashboard": True, "groups": True, "meetings": True,
        "domains": True, "reports": True,
    },
    "member": {
        "dashboard": True, "groups": True, "meetings": True,
        "domains": False, "reports": True,
    },
}


class PermissionsIn(BaseModel):
    manager: Dict[str, bool]
    member: Dict[str, bool]


async def get_permissions() -> Dict[str, Dict[str, bool]]:
    doc = await db.settings.find_one({"key": "role_permissions"})
    if not doc:
        return DEFAULT_PERMISSIONS
    return {"manager": doc.get("manager", DEFAULT_PERMISSIONS["manager"]),
            "member": doc.get("member", DEFAULT_PERMISSIONS["member"])}


class GroupIn(BaseModel):
    name: str
    description: Optional[str] = ""
    manager_id: Optional[str] = None


class MemberIn(BaseModel):
    name: str
    phone: Optional[str] = ""
    notes: Optional[str] = ""


class DomainIn(BaseModel):
    name: str
    description: Optional[str] = ""


class CompetencyIn(BaseModel):
    domain_id: str
    name: str
    description: Optional[str] = ""


class CriterionIn(BaseModel):
    competency_id: str
    text: str


class MeetingIn(BaseModel):
    group_id: str
    title: str
    hijri_month: Optional[str] = ""  # مثال: "محرم48"
    hijri_day: Optional[int] = None
    day_of_week: Optional[str] = ""
    date_hijri: Optional[str] = ""
    date_gregorian: Optional[str] = ""  # ISO date string
    location: Optional[str] = ""
    presenter: Optional[str] = ""
    presentation_type: Optional[str] = ""  # محاضرة، ورشة، نقاش، درس، أخرى
    presentation_type_other: Optional[str] = ""  # عند اختيار "أخرى"
    domain_id: Optional[str] = None
    competency_id: Optional[str] = None
    criterion_ids: List[str] = []
    executed: bool = False
    materials_link: Optional[str] = ""
    notes: Optional[str] = ""


class AttendanceIn(BaseModel):
    member_id: str
    attended: bool = False
    prepared: bool = False
    evaluations: Dict[str, str] = {}  # criterion_id -> level (high/medium/low/absent)
    notes: Optional[str] = ""


# ---------- Auth Endpoints ----------
def set_auth_cookie(response: Response, token: str):
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=12 * 3600,
        path="/",
    )


@api.post("/auth/login")
async def login(payload: LoginIn, response: Response):
    email = payload.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="البريد الإلكتروني أو كلمة المرور غير صحيحة")
    token = create_access_token(user["id"], user["email"], user["role"])
    set_auth_cookie(response, token)
    return {"user": strip_password(user), "token": token}


@api.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    return {"ok": True}


@api.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    perms = await get_permissions()
    role = user.get("role")
    user["permissions"] = perms.get(role, {}) if role in ("manager", "member") else {
        "dashboard": True, "groups": True, "meetings": True, "domains": True, "reports": True,
    }
    return user


@api.get("/permissions")
async def read_permissions(_: dict = Depends(require_roles("admin"))):
    return await get_permissions()


@api.put("/permissions")
async def update_permissions(payload: PermissionsIn, _: dict = Depends(require_roles("admin"))):
    await db.settings.update_one(
        {"key": "role_permissions"},
        {"$set": {"key": "role_permissions", "manager": payload.manager, "member": payload.member}},
        upsert=True,
    )
    return await get_permissions()


# ---------- Users Management (admin only) ----------
@api.get("/users")
async def list_users(_: dict = Depends(require_roles("admin"))):
    users = await db.users.find({}).to_list(1000)
    return [strip_password(u) for u in users]


@api.post("/users")
async def create_user(payload: UserCreate, _: dict = Depends(require_roles("admin"))):
    email = payload.email.lower().strip()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="البريد الإلكتروني مستخدم بالفعل")
    doc = {
        "id": new_id(),
        "email": email,
        "name": payload.name,
        "role": payload.role,
        "managed_group_ids": payload.managed_group_ids,
        "group_id": payload.group_id,
        "password_hash": hash_password(payload.password),
        "created_at": now_iso(),
    }
    await db.users.insert_one(doc)
    return strip_password(doc)


@api.patch("/users/{user_id}")
async def update_user(user_id: str, payload: UserUpdate, _: dict = Depends(require_roles("admin"))):
    upd = {}
    if payload.name is not None:
        upd["name"] = payload.name
    if payload.role is not None:
        upd["role"] = payload.role
    if payload.managed_group_ids is not None:
        upd["managed_group_ids"] = payload.managed_group_ids
    if payload.group_id is not None:
        upd["group_id"] = payload.group_id or None
    if payload.password:
        upd["password_hash"] = hash_password(payload.password)
    if not upd:
        raise HTTPException(status_code=400, detail="لا توجد بيانات للتحديث")
    res = await db.users.update_one({"id": user_id}, {"$set": upd})
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="المستخدم غير موجود")
    user = await db.users.find_one({"id": user_id})
    return strip_password(user)


@api.delete("/users/{user_id}")
async def delete_user(user_id: str, current: dict = Depends(require_roles("admin"))):
    if user_id == current["id"]:
        raise HTTPException(status_code=400, detail="لا يمكنك حذف حسابك")
    await db.users.delete_one({"id": user_id})
    return {"ok": True}


# ---------- Groups ----------
@api.get("/groups")
async def list_groups(user: dict = Depends(get_current_user)):
    q = {}
    if user["role"] == "manager":
        q = {"id": {"$in": user.get("managed_group_ids", [])}}
    elif user["role"] == "member":
        gid = user.get("group_id")
        q = {"id": gid} if gid else {"id": "__none__"}
    groups = await db.groups.find(q, {"_id": 0}).to_list(1000)
    # attach member count
    for g in groups:
        g["members_count"] = await db.members.count_documents({"group_id": g["id"]})
        g["meetings_count"] = await db.meetings.count_documents({"group_id": g["id"]})
    return groups


@api.post("/groups")
async def create_group(payload: GroupIn, _: dict = Depends(require_roles("admin"))):
    doc = {
        "id": new_id(),
        "name": payload.name,
        "description": payload.description or "",
        "manager_id": payload.manager_id,
        "created_at": now_iso(),
    }
    await db.groups.insert_one(doc)
    if payload.manager_id:
        await db.users.update_one(
            {"id": payload.manager_id},
            {"$addToSet": {"managed_group_ids": doc["id"]}},
        )
    doc.pop("_id", None)
    return doc


@api.patch("/groups/{group_id}")
async def update_group(group_id: str, payload: GroupIn, user: dict = Depends(get_current_user)):
    if not await can_edit_group(user, group_id):
        raise HTTPException(status_code=403, detail="لا تملك صلاحية تعديل هذه المجموعة")
    upd = {"name": payload.name, "description": payload.description or ""}
    if user["role"] == "admin":
        upd["manager_id"] = payload.manager_id
    await db.groups.update_one({"id": group_id}, {"$set": upd})
    g = await db.groups.find_one({"id": group_id}, {"_id": 0})
    if not g:
        raise HTTPException(status_code=404, detail="المجموعة غير موجودة")
    return g


@api.delete("/groups/{group_id}")
async def delete_group(group_id: str, _: dict = Depends(require_roles("admin"))):
    await db.groups.delete_one({"id": group_id})
    await db.members.delete_many({"group_id": group_id})
    meetings = await db.meetings.find({"group_id": group_id}, {"id": 1}).to_list(10000)
    ids = [m["id"] for m in meetings]
    await db.meetings.delete_many({"group_id": group_id})
    await db.attendances.delete_many({"meeting_id": {"$in": ids}})
    return {"ok": True}


# ---------- Members ----------
@api.get("/groups/{group_id}/members")
async def list_members(group_id: str, _: dict = Depends(get_current_user)):
    members = await db.members.find({"group_id": group_id}, {"_id": 0}).to_list(1000)
    return members


@api.post("/groups/{group_id}/members")
async def create_member(group_id: str, payload: MemberIn, user: dict = Depends(get_current_user)):
    if not await can_edit_group(user, group_id):
        raise HTTPException(status_code=403, detail="لا تملك الصلاحية")
    doc = {
        "id": new_id(),
        "group_id": group_id,
        "name": payload.name,
        "phone": payload.phone or "",
        "notes": payload.notes or "",
        "created_at": now_iso(),
    }
    await db.members.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.patch("/members/{member_id}")
async def update_member(member_id: str, payload: MemberIn, user: dict = Depends(get_current_user)):
    m = await db.members.find_one({"id": member_id})
    if not m:
        raise HTTPException(status_code=404, detail="العضو غير موجود")
    if not await can_edit_group(user, m["group_id"]):
        raise HTTPException(status_code=403, detail="لا تملك الصلاحية")
    await db.members.update_one({"id": member_id}, {"$set": payload.model_dump()})
    return await db.members.find_one({"id": member_id}, {"_id": 0})


@api.delete("/members/{member_id}")
async def delete_member(member_id: str, user: dict = Depends(get_current_user)):
    m = await db.members.find_one({"id": member_id})
    if not m:
        return {"ok": True}
    if not await can_edit_group(user, m["group_id"]):
        raise HTTPException(status_code=403, detail="لا تملك الصلاحية")
    await db.members.delete_one({"id": member_id})
    return {"ok": True}


# ---------- Domains / Competencies / Criteria ----------
@api.get("/domains")
async def list_domains(_: dict = Depends(get_current_user)):
    domains = await db.domains.find({}, {"_id": 0}).to_list(1000)
    for d in domains:
        comps = await db.competencies.find({"domain_id": d["id"]}, {"_id": 0}).to_list(1000)
        for c in comps:
            c["criteria"] = await db.criteria.find({"competency_id": c["id"]}, {"_id": 0}).to_list(1000)
        d["competencies"] = comps
    return domains


@api.post("/domains")
async def create_domain(payload: DomainIn, _: dict = Depends(require_roles("admin", "manager"))):
    doc = {"id": new_id(), "name": payload.name, "description": payload.description or "", "created_at": now_iso()}
    await db.domains.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.patch("/domains/{domain_id}")
async def update_domain(domain_id: str, payload: DomainIn, _: dict = Depends(require_roles("admin", "manager"))):
    await db.domains.update_one({"id": domain_id}, {"$set": payload.model_dump()})
    return await db.domains.find_one({"id": domain_id}, {"_id": 0})


@api.delete("/domains/{domain_id}")
async def delete_domain(domain_id: str, _: dict = Depends(require_roles("admin"))):
    comps = await db.competencies.find({"domain_id": domain_id}, {"id": 1}).to_list(1000)
    comp_ids = [c["id"] for c in comps]
    await db.criteria.delete_many({"competency_id": {"$in": comp_ids}})
    await db.competencies.delete_many({"domain_id": domain_id})
    await db.domains.delete_one({"id": domain_id})
    return {"ok": True}


@api.post("/competencies")
async def create_competency(payload: CompetencyIn, _: dict = Depends(require_roles("admin", "manager"))):
    doc = {"id": new_id(), **payload.model_dump(), "created_at": now_iso()}
    await db.competencies.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.patch("/competencies/{cid}")
async def update_competency(cid: str, payload: CompetencyIn, _: dict = Depends(require_roles("admin", "manager"))):
    await db.competencies.update_one({"id": cid}, {"$set": payload.model_dump()})
    return await db.competencies.find_one({"id": cid}, {"_id": 0})


@api.delete("/competencies/{cid}")
async def delete_competency(cid: str, _: dict = Depends(require_roles("admin"))):
    await db.criteria.delete_many({"competency_id": cid})
    await db.competencies.delete_one({"id": cid})
    return {"ok": True}


@api.post("/criteria")
async def create_criterion(payload: CriterionIn, _: dict = Depends(require_roles("admin", "manager"))):
    doc = {"id": new_id(), **payload.model_dump(), "created_at": now_iso()}
    await db.criteria.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.patch("/criteria/{crid}")
async def update_criterion(crid: str, payload: CriterionIn, _: dict = Depends(require_roles("admin", "manager"))):
    await db.criteria.update_one({"id": crid}, {"$set": payload.model_dump()})
    return await db.criteria.find_one({"id": crid}, {"_id": 0})


@api.delete("/criteria/{crid}")
async def delete_criterion(crid: str, _: dict = Depends(require_roles("admin"))):
    await db.criteria.delete_one({"id": crid})
    return {"ok": True}


# ---------- Meetings ----------
@api.get("/meetings")
async def list_meetings(group_id: Optional[str] = None, user: dict = Depends(get_current_user)):
    q = {}
    if group_id:
        q["group_id"] = group_id
    if user["role"] == "manager":
        q["group_id"] = {"$in": user.get("managed_group_ids", [])}
    elif user["role"] == "member":
        gid = user.get("group_id")
        q["group_id"] = gid if gid else "__none__"
    meetings = await db.meetings.find(q, {"_id": 0}).sort("date_gregorian", -1).to_list(2000)
    return meetings


@api.get("/meetings/{meeting_id}")
async def get_meeting(meeting_id: str, _: dict = Depends(get_current_user)):
    m = await db.meetings.find_one({"id": meeting_id}, {"_id": 0})
    if not m:
        raise HTTPException(status_code=404, detail="اللقاء غير موجود")
    m["attendances"] = await db.attendances.find({"meeting_id": meeting_id}, {"_id": 0}).to_list(1000)
    return m


@api.post("/meetings")
async def create_meeting(payload: MeetingIn, user: dict = Depends(get_current_user)):
    if not await can_edit_group(user, payload.group_id):
        raise HTTPException(status_code=403, detail="لا تملك الصلاحية")
    doc = {"id": new_id(), **payload.model_dump(), "created_at": now_iso()}
    await db.meetings.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.patch("/meetings/{meeting_id}")
async def update_meeting(meeting_id: str, payload: MeetingIn, user: dict = Depends(get_current_user)):
    m = await db.meetings.find_one({"id": meeting_id})
    if not m:
        raise HTTPException(status_code=404, detail="اللقاء غير موجود")
    if not await can_edit_group(user, m["group_id"]):
        raise HTTPException(status_code=403, detail="لا تملك الصلاحية")
    await db.meetings.update_one({"id": meeting_id}, {"$set": payload.model_dump()})
    return await db.meetings.find_one({"id": meeting_id}, {"_id": 0})


@api.delete("/meetings/{meeting_id}")
async def delete_meeting(meeting_id: str, user: dict = Depends(get_current_user)):
    m = await db.meetings.find_one({"id": meeting_id})
    if not m:
        return {"ok": True}
    if not await can_edit_group(user, m["group_id"]):
        raise HTTPException(status_code=403, detail="لا تملك الصلاحية")
    await db.meetings.delete_one({"id": meeting_id})
    await db.attendances.delete_many({"meeting_id": meeting_id})
    return {"ok": True}


# ---------- Attendance ----------
@api.post("/meetings/{meeting_id}/attendance")
async def upsert_attendance(meeting_id: str, payload: AttendanceIn, user: dict = Depends(get_current_user)):
    m = await db.meetings.find_one({"id": meeting_id})
    if not m:
        raise HTTPException(status_code=404, detail="اللقاء غير موجود")
    if not await can_edit_group(user, m["group_id"]):
        raise HTTPException(status_code=403, detail="لا تملك الصلاحية")
    existing = await db.attendances.find_one({"meeting_id": meeting_id, "member_id": payload.member_id})
    data = {
        "meeting_id": meeting_id,
        **payload.model_dump(),
        "updated_at": now_iso(),
    }
    if existing:
        await db.attendances.update_one({"id": existing["id"]}, {"$set": data})
        return await db.attendances.find_one({"id": existing["id"]}, {"_id": 0})
    data["id"] = new_id()
    data["created_at"] = now_iso()
    await db.attendances.insert_one(data)
    data.pop("_id", None)
    # update attendance_count on meeting
    total = await db.attendances.count_documents({"meeting_id": meeting_id, "attended": True})
    await db.meetings.update_one({"id": meeting_id}, {"$set": {"attendance_count": total}})
    return data


# ---------- Reports ----------
@api.get("/reports/summary")
async def report_summary(group_id: Optional[str] = None, user: dict = Depends(get_current_user)):
    q = {}
    if group_id:
        q["group_id"] = group_id
    if user["role"] == "manager":
        q["group_id"] = {"$in": user.get("managed_group_ids", [])}
    elif user["role"] == "member":
        gid = user.get("group_id")
        q["group_id"] = gid if gid else "__none__"

    meetings = await db.meetings.find(q, {"_id": 0}).to_list(5000)
    meeting_ids = [m["id"] for m in meetings]

    total_meetings = len(meetings)
    executed = sum(1 for m in meetings if m.get("executed"))
    total_attendance = sum(int(m.get("attendance_count") or 0) for m in meetings)

    groups_count = await db.groups.count_documents({} if not group_id else {"id": group_id})
    members_count = await db.members.count_documents({} if not group_id else {"group_id": group_id})

    # attendance timeline by month (gregorian)
    timeline_map: Dict[str, int] = {}
    for m in meetings:
        d = m.get("date_gregorian") or ""
        key = d[:7] if len(d) >= 7 else "غير محدد"
        timeline_map[key] = timeline_map.get(key, 0) + int(m.get("attendance_count") or 0)
    timeline = [{"month": k, "attendance": v} for k, v in sorted(timeline_map.items())]

    # by domain
    domains = await db.domains.find({}, {"_id": 0}).to_list(1000)
    domain_map = {d["id"]: d["name"] for d in domains}
    by_domain_map: Dict[str, int] = {}
    for m in meetings:
        did = m.get("domain_id")
        name = domain_map.get(did, "غير محدد")
        by_domain_map[name] = by_domain_map.get(name, 0) + 1
    by_domain = [{"name": k, "value": v} for k, v in by_domain_map.items()]

    # by presentation type
    by_type_map: Dict[str, int] = {}
    for m in meetings:
        t = m.get("presentation_type") or "غير محدد"
        by_type_map[t] = by_type_map.get(t, 0) + 1
    by_type = [{"name": k, "value": v} for k, v in by_type_map.items()]

    # competency achievement based on evaluations
    attendances = await db.attendances.find({"meeting_id": {"$in": meeting_ids}}, {"_id": 0}).to_list(20000)
    level_score = {"high": 100, "medium": 66, "low": 33, "absent": 0}
    comp_totals: Dict[str, list] = {}
    criteria_docs = await db.criteria.find({}, {"_id": 0}).to_list(2000)
    crit_to_comp = {c["id"]: c["competency_id"] for c in criteria_docs}
    comps_docs = await db.competencies.find({}, {"_id": 0}).to_list(2000)
    comp_names = {c["id"]: c["name"] for c in comps_docs}
    for a in attendances:
        for crit_id, level in (a.get("evaluations") or {}).items():
            comp_id = crit_to_comp.get(crit_id)
            if not comp_id:
                continue
            comp_totals.setdefault(comp_id, []).append(level_score.get(level, 0))
    competency_achievement = [
        {
            "name": comp_names.get(cid, "غير معروف"),
            "value": round(sum(v) / len(v), 1) if v else 0,
        }
        for cid, v in comp_totals.items()
    ]

    return {
        "totals": {
            "groups": groups_count,
            "members": members_count,
            "meetings": total_meetings,
            "executed": executed,
            "attendance": total_attendance,
        },
        "timeline": timeline,
        "by_domain": by_domain,
        "by_type": by_type,
        "competency_achievement": competency_achievement,
    }


@api.get("/reports/by-month")
async def report_by_month(month: str, user: dict = Depends(get_current_user)):
    # For a specific hijri month, list which groups executed a meeting and which did not
    q = {"hijri_month": month}
    if user["role"] == "manager":
        q_scope = {"$in": user.get("managed_group_ids", [])}
    elif user["role"] == "member":
        gid = user.get("group_id")
        q_scope = gid if gid else "__none__"
    else:
        q_scope = None
    if q_scope is not None:
        q["group_id"] = q_scope

    meetings = await db.meetings.find(q, {"_id": 0}).to_list(2000)
    executed_gids = {m["group_id"] for m in meetings if m.get("executed")}
    all_gids = {m["group_id"] for m in meetings}

    group_q = {}
    if user["role"] == "manager":
        group_q = {"id": {"$in": user.get("managed_group_ids", [])}}
    elif user["role"] == "member":
        group_q = {"id": user.get("group_id") or "__none__"}
    groups = await db.groups.find(group_q, {"_id": 0}).to_list(1000)

    result = []
    for g in groups:
        status = "executed" if g["id"] in executed_gids else ("planned" if g["id"] in all_gids else "missing")
        result.append({"group_id": g["id"], "group_name": g["name"], "status": status})
    return {"month": month, "groups": result, "meetings": meetings}


@api.get("/reports/months")
async def report_months(user: dict = Depends(get_current_user)):
    q = {}
    if user["role"] == "manager":
        q["group_id"] = {"$in": user.get("managed_group_ids", [])}
    elif user["role"] == "member":
        gid = user.get("group_id")
        q["group_id"] = gid if gid else "__none__"
    meetings = await db.meetings.find(q, {"_id": 0, "hijri_month": 1, "executed": 1, "group_id": 1}).to_list(5000)
    counts = {}
    for m in meetings:
        key = m.get("hijri_month") or "غير محدد"
        if key not in counts:
            counts[key] = {"month": key, "total": 0, "executed": 0}
        counts[key]["total"] += 1
        if m.get("executed"):
            counts[key]["executed"] += 1
    return list(counts.values())
async def export_csv(group_id: Optional[str] = None, user: dict = Depends(get_current_user)):
    q = {}
    if group_id:
        q["group_id"] = group_id
    if user["role"] == "manager":
        q["group_id"] = {"$in": user.get("managed_group_ids", [])}
    elif user["role"] == "member":
        gid = user.get("group_id")
        q["group_id"] = gid if gid else "__none__"
    meetings = await db.meetings.find(q, {"_id": 0}).to_list(5000)
    groups = await db.groups.find({}, {"_id": 0}).to_list(1000)
    gmap = {g["id"]: g["name"] for g in groups}
    domains = await db.domains.find({}, {"_id": 0}).to_list(1000)
    dmap = {d["id"]: d["name"] for d in domains}
    comps = await db.competencies.find({}, {"_id": 0}).to_list(1000)
    cmap = {c["id"]: c["name"] for c in comps}

    buf = io.StringIO()
    buf.write("\ufeff")  # BOM for Excel Arabic
    w = csv.writer(buf)
    w.writerow(["المجموعة", "عنوان اللقاء", "التاريخ الهجري", "التاريخ الميلادي", "اليوم", "المكان",
                "المجال", "الكفاية", "مقدم الموضوع", "نوع الإلقاء", "عدد الحضور", "منفذ", "ملاحظات"])
    for m in meetings:
        w.writerow([
            gmap.get(m.get("group_id"), ""),
            m.get("title", ""),
            m.get("date_hijri", ""),
            m.get("date_gregorian", ""),
            m.get("day_of_week", ""),
            m.get("location", ""),
            dmap.get(m.get("domain_id"), ""),
            cmap.get(m.get("competency_id"), ""),
            m.get("presenter", ""),
            m.get("presentation_type", ""),
            m.get("attendance_count", 0),
            "نعم" if m.get("executed") else "لا",
            m.get("notes", ""),
        ])
    buf.seek(0)
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": 'attachment; filename="meetings_report.csv"'},
    )


# ---------- Startup ----------
@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.groups.create_index("id", unique=True)
    await db.members.create_index("id", unique=True)
    await db.meetings.create_index("id", unique=True)
    await db.attendances.create_index("id", unique=True)
    await db.domains.create_index("id", unique=True)
    await db.competencies.create_index("id", unique=True)
    await db.criteria.create_index("id", unique=True)

    existing = await db.users.find_one({"email": ADMIN_EMAIL.lower()})
    if not existing:
        await db.users.insert_one({
            "id": new_id(),
            "email": ADMIN_EMAIL.lower(),
            "name": "المشرف العام",
            "role": "admin",
            "managed_group_ids": [],
            "password_hash": hash_password(ADMIN_PASSWORD),
            "created_at": now_iso(),
        })
        logger.info("Admin seeded: %s", ADMIN_EMAIL)
    elif not verify_password(ADMIN_PASSWORD, existing["password_hash"]):
        await db.users.update_one(
            {"email": ADMIN_EMAIL.lower()},
            {"$set": {"password_hash": hash_password(ADMIN_PASSWORD)}},
        )
        logger.info("Admin password re-hashed for %s", ADMIN_EMAIL)


@app.on_event("shutdown")
async def shutdown():
    client.close()


# ---------- App wiring ----------
app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS if CORS_ORIGINS else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
