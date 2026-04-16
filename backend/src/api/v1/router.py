from fastapi import APIRouter

from src.api.v1 import auth, files, gamification
from src.api.v1.lms import (
    students, lessons, groups, catalog,
    attendance, homework, payments,
    enrollments, grades, notifications as lms_notifs,
)
from src.api.v1.lms import users as lms_users
from src.api.v1.lms import mup_tasks
from src.api.v1.lms import compensation
from src.api.v1.lms import late_requests
from src.api.v1.lms import analytics as lms_analytics
from src.api.v1.crm import (
    funnels, leads, tasks, contracts,
    activities as crm_activities,
    notifications as crm_notifs,
)
from src.api.v1.crm import analytics as crm_analytics
from src.api.v1.student import portal
from src.api.v1 import notifications as unified_notifs
from src.api.v1 import public

router = APIRouter()

# ── Auth ──────────────────────────────────────────────────────────────────────
router.include_router(auth.router)

# ── LMS ───────────────────────────────────────────────────────────────────────
# Legacy routers have no /lms prefix in their module, so we add it here
router.include_router(catalog.router, prefix="/lms")        # directions, subjects, rooms
router.include_router(students.router, prefix="/lms")
router.include_router(enrollments.router, prefix="/lms")
router.include_router(lessons.router, prefix="/lms")
router.include_router(groups.router, prefix="/lms")
router.include_router(attendance.router, prefix="/lms")
router.include_router(homework.router, prefix="/lms")
router.include_router(grades.router, prefix="/lms")
router.include_router(payments.router, prefix="/lms")
router.include_router(lms_notifs.router)    # already has /notifications/lms prefix
# New routers already have /lms in their prefix
router.include_router(lms_users.router)
router.include_router(mup_tasks.router)
router.include_router(compensation.router)
router.include_router(late_requests.router)
router.include_router(lms_analytics.router)

# ── CRM ───────────────────────────────────────────────────────────────────────
router.include_router(funnels.router)
router.include_router(leads.router)
router.include_router(tasks.router)
router.include_router(crm_activities.router)
router.include_router(crm_notifs.router)
router.include_router(crm_analytics.router)
router.include_router(contracts.router)

# ── Student Portal ────────────────────────────────────────────────────────────
router.include_router(portal.router)

# ── Gamification ──────────────────────────────────────────────────────────────
router.include_router(gamification.router)

# ── Unified Notifications ─────────────────────────────────────────────────────
router.include_router(unified_notifs.router)

# ── Public (no auth — API/landing lead submission) ───────────────────────────
router.include_router(public.router)

# ── Files (S3 presigned upload) ───────────────────────────────────────────────
router.include_router(files.router)
