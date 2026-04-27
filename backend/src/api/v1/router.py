from fastapi import APIRouter, Depends

from src.api.dependencies import crm_platform_guard, lms_platform_guard, student_platform_guard
from src.api.v1 import auth, files, gamification, public
from src.api.v1 import notifications as unified_notifs
from src.api.v1.crm import (
    activities as crm_activities,
)
from src.api.v1.crm import analytics as crm_analytics
from src.api.v1.crm import (
    contracts,
    funnels,
    leads,
    tasks,
)
from src.api.v1.crm import (
    notifications as crm_notifs,
)
from src.api.v1.lms import analytics as lms_analytics
from src.api.v1.lms import (
    attendance,
    catalog,
    compensation,
    enrollments,
    grades,
    groups,
    homework,
    late_requests,
    lessons,
    mup_tasks,
    payments,
    students,
)
from src.api.v1.lms import exams as lms_exams
from src.api.v1.lms import (
    notifications as lms_notifs,
)
from src.api.v1.lms import reports as lms_reports
from src.api.v1.lms import users as lms_users
from src.api.v1.student import portal

router = APIRouter()

# ── Auth ──────────────────────────────────────────────────────────────────────
router.include_router(auth.router)

# ── LMS (director, mup, teacher, cashier only) ──────────────────────────────
_lms_deps = [Depends(lms_platform_guard)]

router.include_router(catalog.router, prefix="/lms", dependencies=_lms_deps)
router.include_router(students.router, prefix="/lms", dependencies=_lms_deps)
router.include_router(enrollments.router, prefix="/lms", dependencies=_lms_deps)
router.include_router(lessons.router, prefix="/lms", dependencies=_lms_deps)
router.include_router(groups.router, prefix="/lms", dependencies=_lms_deps)
router.include_router(attendance.router, prefix="/lms", dependencies=_lms_deps)
router.include_router(homework.router, prefix="/lms", dependencies=_lms_deps)
router.include_router(grades.router, prefix="/lms", dependencies=_lms_deps)
router.include_router(payments.router, prefix="/lms", dependencies=_lms_deps)
router.include_router(lms_notifs.router, dependencies=_lms_deps)
router.include_router(lms_users.router, dependencies=_lms_deps)
router.include_router(mup_tasks.router, dependencies=_lms_deps)
router.include_router(compensation.router, dependencies=_lms_deps)
router.include_router(late_requests.router, dependencies=_lms_deps)
router.include_router(lms_analytics.router, dependencies=_lms_deps)
router.include_router(lms_reports.router, dependencies=_lms_deps)
router.include_router(lms_exams.router, prefix="/lms", dependencies=_lms_deps)

# ── CRM (director, sales_manager only) ───────────────────────────────────────
_crm_deps = [Depends(crm_platform_guard)]

router.include_router(funnels.router, dependencies=_crm_deps)
router.include_router(leads.router, dependencies=_crm_deps)
router.include_router(tasks.router, dependencies=_crm_deps)
router.include_router(crm_activities.router, dependencies=_crm_deps)
router.include_router(crm_notifs.router, dependencies=_crm_deps)
router.include_router(crm_analytics.router, dependencies=_crm_deps)
router.include_router(contracts.router, dependencies=_crm_deps)

# ── Student Portal (student only) ─────────────────────────────────────────────
router.include_router(portal.router, dependencies=[Depends(student_platform_guard)])

# ── Gamification ──────────────────────────────────────────────────────────────
router.include_router(gamification.router)

# ── Unified Notifications ─────────────────────────────────────────────────────
router.include_router(unified_notifs.router)

# ── Public (no auth — API/landing lead submission) ───────────────────────────
router.include_router(public.router)

# ── Files (S3 presigned upload) ───────────────────────────────────────────────
router.include_router(files.router)
