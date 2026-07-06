import os, sys, uuid, json, requests

BASE = "https://nizam-ijtimaai.preview.emergentagent.com/api"
ADMIN_EMAIL = "admin@meetings.app"
ADMIN_PASSWORD = "Admin@12345"

results = {"passed": [], "failed": []}

def rec(ok, name, evidence=""):
    if ok:
        results["passed"].append(name)
        print(f"PASS: {name}")
    else:
        results["failed"].append({"area": name, "issue": evidence})
        print(f"FAIL: {name} :: {evidence}")

def hdr(tok):
    return {"Authorization": f"Bearer {tok}", "Content-Type": "application/json"}

# 1) Admin login
r = requests.post(f"{BASE}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=15)
j = r.json() if r.status_code == 200 else {}
admin_tok = j.get("access_token") or j.get("token")
rec(r.status_code == 200 and admin_tok, "admin_login", f"{r.status_code} {r.text[:200]}")

# 2) Regression: /api/groups, /api/meetings, /api/reports/summary
r_groups = requests.get(f"{BASE}/groups", headers=hdr(admin_tok), timeout=15)
rec(r_groups.status_code == 200, "GET /groups", f"{r_groups.status_code}")
r_meetings = requests.get(f"{BASE}/meetings", headers=hdr(admin_tok), timeout=15)
rec(r_meetings.status_code == 200, "GET /meetings", f"{r_meetings.status_code}")
r_sum = requests.get(f"{BASE}/reports/summary", headers=hdr(admin_tok), timeout=15)
rec(r_sum.status_code == 200, "GET /reports/summary", f"{r_sum.status_code}")

# 3) Create Group A and Group B
suffix = uuid.uuid4().hex[:6]
r = requests.post(f"{BASE}/groups", headers=hdr(admin_tok), json={"name": f"GroupA-{suffix}", "description": "A"})
rec(r.status_code == 200, "create groupA", f"{r.status_code} {r.text[:200]}")
gA = r.json()
r = requests.post(f"{BASE}/groups", headers=hdr(admin_tok), json={"name": f"GroupB-{suffix}", "description": "B"})
rec(r.status_code == 200, "create groupB", f"{r.status_code} {r.text[:200]}")
gB = r.json()

# 4) Create 2 members in Group A
r = requests.post(f"{BASE}/groups/{gA['id']}/members", headers=hdr(admin_tok), json={"name": "Member1", "phone": "", "notes": ""})
rec(r.status_code == 200, "create member1", f"{r.status_code} {r.text[:200]}")
m1 = r.json()
r = requests.post(f"{BASE}/groups/{gA['id']}/members", headers=hdr(admin_tok), json={"name": "Member2", "phone": "", "notes": ""})
rec(r.status_code == 200, "create member2", f"{r.status_code} {r.text[:200]}")
m2 = r.json()

# 5) Create a member in Group B
r = requests.post(f"{BASE}/groups/{gB['id']}/members", headers=hdr(admin_tok), json={"name": "MemberB", "phone": "", "notes": ""})
rec(r.status_code == 200, "create memberB", f"{r.status_code} {r.text[:200]}")
mB = r.json()

# 6) Create domain/competency/criterion for evaluation
r = requests.post(f"{BASE}/domains", headers=hdr(admin_tok), json={"name": f"Dom-{suffix}", "description": ""})
rec(r.status_code == 200, "create domain", f"{r.status_code} {r.text[:200]}")
dom = r.json()
r = requests.post(f"{BASE}/competencies", headers=hdr(admin_tok), json={"domain_id": dom["id"], "name": f"Comp-{suffix}", "description": ""})
rec(r.status_code == 200, "create competency", f"{r.status_code} {r.text[:200]}")
comp = r.json()
r = requests.post(f"{BASE}/criteria", headers=hdr(admin_tok), json={"competency_id": comp["id"], "text": "Criterion 1"})
rec(r.status_code == 200, "create criterion", f"{r.status_code} {r.text[:200]}")
crit = r.json()

# 7) Create meeting in Group A
meeting_payload = {
    "group_id": gA["id"], "title": "Meeting 1",
    "hijri_month": "محرم48", "date_hijri": "1/محرم/48",
    "date_gregorian": "2026-07-01", "executed": True,
    "criterion_ids": [crit["id"]],
}
r = requests.post(f"{BASE}/meetings", headers=hdr(admin_tok), json=meeting_payload)
rec(r.status_code == 200, "create meeting", f"{r.status_code} {r.text[:200]}")
meeting = r.json()

# 8) Record attendance for member1
r = requests.post(f"{BASE}/meetings/{meeting['id']}/attendance", headers=hdr(admin_tok), json={
    "member_id": m1["id"], "attended": True, "prepared": True,
    "evaluations": {crit["id"]: "high"}, "notes": ""
})
rec(r.status_code == 200, "record attendance m1", f"{r.status_code} {r.text[:200]}")

# 9) GET profile member1
r = requests.get(f"{BASE}/members/{m1['id']}/profile", headers=hdr(admin_tok), timeout=15)
if r.status_code != 200:
    rec(False, "profile m1 status", f"{r.status_code} {r.text[:300]}")
else:
    p = r.json()
    totals = p.get("totals", {})
    hist = p.get("history", [])
    comp_avgs = p.get("competency_averages", [])
    ok = (totals.get("attended") == 1 and totals.get("meetings_recorded") == 1
          and totals.get("prepared") == 1 and len(hist) == 1
          and len(comp_avgs) >= 1)
    rec(ok, "profile m1 totals/history/competency", f"totals={totals} hist_len={len(hist)} comps={comp_avgs}")

# 10) GET profile member2 (no attendance)
r = requests.get(f"{BASE}/members/{m2['id']}/profile", headers=hdr(admin_tok), timeout=15)
if r.status_code != 200:
    rec(False, "profile m2 status", f"{r.status_code} {r.text[:300]}")
else:
    p = r.json()
    totals = p.get("totals", {})
    ok = (totals.get("attended") == 0 and totals.get("meetings_recorded") == 0
          and totals.get("attendance_rate") == 0 and p.get("history") == [])
    rec(ok, "profile m2 zeros", f"totals={totals} hist={p.get('history')}")

# 11) Create manager user for Group A only + login
mgr_email = f"mgr-{suffix}@test.app"
r = requests.post(f"{BASE}/users", headers=hdr(admin_tok), json={
    "email": mgr_email, "password": "Passw0rd!", "name": "MgrA",
    "role": "manager", "managed_group_ids": [gA["id"]], "group_id": None
})
rec(r.status_code == 200, "create manager", f"{r.status_code} {r.text[:200]}")

r = requests.post(f"{BASE}/auth/login", json={"email": mgr_email, "password": "Passw0rd!"})
rec(r.status_code == 200, "manager login", f"{r.status_code} {r.text[:200]}")
_j = r.json() if r.status_code == 200 else {}
mgr_tok = _j.get("access_token") or _j.get("token")

# Manager: access m1 (Group A) → 200
r = requests.get(f"{BASE}/members/{m1['id']}/profile", headers=hdr(mgr_tok))
rec(r.status_code == 200, "manager access groupA member -> 200", f"{r.status_code} {r.text[:200]}")
# Manager: access mB (Group B) → 403
r = requests.get(f"{BASE}/members/{mB['id']}/profile", headers=hdr(mgr_tok))
rec(r.status_code == 403, "manager access groupB member -> 403", f"{r.status_code} {r.text[:200]}")

# 12) Create member user for Group A + login
mem_email = f"mem-{suffix}@test.app"
r = requests.post(f"{BASE}/users", headers=hdr(admin_tok), json={
    "email": mem_email, "password": "Passw0rd!", "name": "MemA",
    "role": "member", "managed_group_ids": [], "group_id": gA["id"]
})
rec(r.status_code == 200, "create member user (auto-member)", f"{r.status_code} {r.text[:200]}")
# Verify auto-member record was created in group A
r_mem_list = requests.get(f"{BASE}/groups/{gA['id']}/members", headers=hdr(admin_tok))
if r_mem_list.status_code == 200:
    names = [x.get("name") for x in r_mem_list.json()]
    rec("MemA" in names, "auto-member record created", f"names={names}")
else:
    rec(False, "list groupA members", f"{r_mem_list.status_code}")

r = requests.post(f"{BASE}/auth/login", json={"email": mem_email, "password": "Passw0rd!"})
rec(r.status_code == 200, "member login", f"{r.status_code} {r.text[:200]}")
_j = r.json() if r.status_code == 200 else {}
mem_tok = _j.get("access_token") or _j.get("token")

# member: access m1 (own group A) → 200
r = requests.get(f"{BASE}/members/{m1['id']}/profile", headers=hdr(mem_tok))
rec(r.status_code == 200, "member access same group -> 200", f"{r.status_code} {r.text[:200]}")
# member: access mB (Group B) → 403
r = requests.get(f"{BASE}/members/{mB['id']}/profile", headers=hdr(mem_tok))
rec(r.status_code == 403, "member access other group -> 403", f"{r.status_code} {r.text[:200]}")

# 13) 404 for unknown member
r = requests.get(f"{BASE}/members/nonexistent-id-xyz/profile", headers=hdr(admin_tok))
rec(r.status_code == 404, "unknown member -> 404", f"{r.status_code}")

print("\n=== SUMMARY ===")
print(f"Passed: {len(results['passed'])}  Failed: {len(results['failed'])}")
for f in results["failed"]:
    print("  -", f)

with open("/tmp/member_profile_results.json", "w") as fh:
    json.dump(results, fh, indent=2, ensure_ascii=False)
