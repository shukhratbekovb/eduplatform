"""Комплексный seed-скрипт для заполнения БД реалистичными, логически согласованными данными.

Скрипт создаёт полный набор данных для образовательной платформы EduPlatform,
соблюдая бизнес-правила и ограничения:
    - Преподаватели ведут ТОЛЬКО предметы своего направления.
    - Студенты зачислены ТОЛЬКО в группы, соответствующие направлению контракта.
    - Посещаемость и оценки — ТОЛЬКО для зачисленных студентов завершённых уроков.
    - Платежи соответствуют графику контракта.
    - Геймификация вычисляется из реальных данных (пересчёт отдельным скриптом).
    - 5 архетипов студентов для разнообразия ML-данных.

Создаваемые данные:
    - 4 административных сотрудника (директор, МУП, кассир, менеджер продаж)
    - 15 преподавателей (по 1-2 на направление)
    - 10 направлений обучения
    - 28 предметов
    - 10 аудиторий
    - 30 групп (3 на направление)
    - 200 студентов + контракты + платежи + зачисления
    - ~2400 уроков (8 недель истории)
    - ~48000 записей посещаемости
    - ~36000 оценок (participation + homework + exam)
    - ~960 домашних заданий + ~12800 submissions
    - 30 экзаменов
    - 30 CRM-лидов
    - 7 ачивок + 5 товаров магазина

Запуск:
    .. code-block:: bash

        docker compose exec api bash -c "PYTHONPATH=/app python /app/scripts/seed_full.py"
"""
import asyncio
import random
import uuid
from datetime import date, timedelta, datetime, timezone
from decimal import Decimal

import bcrypt
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

from src.config import settings

random.seed(42)

def hash_pw(pw: str) -> str:
    """Хеширует пароль с использованием bcrypt.

    Args:
        pw: Пароль в открытом виде.

    Returns:
        Строка с bcrypt-хешем пароля.
    """
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()

def uid() -> str:
    """Генерирует новый UUID v4 в строковом формате.

    Returns:
        Строковое представление UUID.
    """
    return str(uuid.uuid4())

PW_HASH = hash_pw("password123")
TODAY = date.today()
NOW = datetime.now(timezone.utc)

# ── Name pools ───────────────────────────────────────────────────────────────

FIRST_M = [
    "Alisher", "Bobur", "Doniyor", "Firdavs", "Jasur", "Kamron", "Mirzo",
    "Nodir", "Otabek", "Rustam", "Sardor", "Temur", "Ulugbek", "Xasan",
    "Zafar", "Bekzod", "Islom", "Jahongir", "Komil", "Mansur", "Qodir",
    "Sherzod", "Timur", "Abdulla", "Baxtiyor", "Eldor", "Husan", "Murod",
    "Ibrohim", "Sanjar", "Farrux", "Dostonbek", "Akbar", "Asror", "Javlon",
]
FIRST_F = [
    "Aziza", "Barno", "Dilnoza", "Feruza", "Gulnora", "Hilola", "Iroda",
    "Kamola", "Lola", "Madina", "Nasiba", "Nigora", "Ozoda", "Rano",
    "Sabohat", "Umida", "Zulfiya", "Malika", "Nodira", "Shahlo", "Yulduz",
    "Mohira", "Sarvinoz", "Dilorom", "Gavhar", "Zilola", "Nargiza", "Shoira",
    "Laylo", "Sitora", "Mushtariy", "Sevara", "Robiya", "Fotima", "Zamira",
]
LAST = [
    "Karimov", "Yusupov", "Rahimov", "Mirzayev", "Toshmatov", "Abdullayev",
    "Xasanov", "Normatov", "Tursunov", "Nazarov", "Saidov", "Aliyev",
    "Umarov", "Ismoilov", "Botirov", "Raxmatullayev", "Ergashev", "Mamadaliyev",
    "Qodirov", "Sultanov", "Jumayev", "Haydarov", "Olimov", "Teshaboyev",
    "Axmedov", "Salimov", "Ibragimov", "Murodov", "Xolmatov", "Nishonov",
]

_name_idx = 0
def next_name() -> str:
    """Генерирует следующее уникальное имя из пулов мужских/женских имён и фамилий.

    Использует глобальный счётчик для циклического обхода пулов.

    Returns:
        Строка "Имя Фамилия".
    """
    global _name_idx
    pool = FIRST_M + FIRST_F
    first = pool[_name_idx % len(pool)]
    last = LAST[_name_idx % len(LAST)]
    _name_idx += 1
    return f"{first} {last}"

def random_phone() -> str:
    """Генерирует случайный узбекский номер телефона.

    Returns:
        Строка формата "+99890XXXXXXX".
    """
    return f"+99890{random.randint(1000000, 9999999)}"

def random_dob(min_y=1985, max_y=2000) -> date:
    """Генерирует случайную дату рождения для сотрудника.

    Args:
        min_y: Минимальный год рождения (по умолчанию 1985).
        max_y: Максимальный год рождения (по умолчанию 2000).

    Returns:
        Случайная дата рождения.
    """
    return date(random.randint(min_y, max_y), random.randint(1, 12), random.randint(1, 28))

def student_dob() -> date:
    """Генерирует случайную дату рождения для студента (2005-2010).

    Returns:
        Случайная дата рождения студента.
    """
    return date(random.randint(2005, 2010), random.randint(1, 12), random.randint(1, 28))


# ── Data definitions ─────────────────────────────────────────────────────────

DIRECTIONS = [
    ("Python dasturlash",     "Python backend, Django, FastAPI, data science",     6, 72),
    ("JavaScript & Frontend", "React, Next.js, TypeScript, HTML/CSS",              6, 72),
    ("Java dasturlash",       "Java Core, Spring Boot, Android",                   6, 72),
    ("Mobile dasturlash",     "Flutter, React Native, Swift, Kotlin",              6, 72),
    ("DevOps & Cloud",        "Docker, Kubernetes, CI/CD, AWS",                    4, 48),
    ("Data Science & AI",     "Machine Learning, Deep Learning, NLP",              6, 72),
    ("Kiberxavfsizlik",       "Penetration testing, SOC, network security",        6, 72),
    ("UI/UX dizayn",          "Figma, Adobe XD, UX research, prototyping",         4, 48),
    ("Ingliz tili (IT)",      "Technical English, IELTS for IT professionals",     6, 72),
    ("Robototexnika",         "Arduino, Raspberry Pi, C++, electronics",           6, 72),
]
DIR_SHORT = ["PY", "JS", "JAVA", "MOB", "DEVOPS", "DS", "SEC", "UXUI", "ENG", "ROBO"]

SUBJECTS_PER_DIR = {
    0: ["Python asoslari", "Django & DRF", "FastAPI"],
    1: ["HTML/CSS", "JavaScript", "React & Next.js"],
    2: ["Java Core", "Spring Boot", "Android Studio"],
    3: ["Flutter", "React Native", "Kotlin"],
    4: ["Linux & Docker", "Kubernetes", "CI/CD Pipeline"],
    5: ["Python for DS", "Machine Learning", "Deep Learning"],
    6: ["Network Security", "Ethical Hacking", "SOC Analysis"],
    7: ["Figma asoslari", "UX Research", "Prototyping"],
    8: ["Technical English", "IELTS Prep"],
    9: ["Arduino basics", "Raspberry Pi", "C++ for embedded"],
}

# Teacher assignment: 1-2 teachers per direction, they teach ONLY that direction's subjects
TEACHERS_PER_DIR = [
    # (name, email) — each teacher is dedicated to exactly one direction
    [("Nodira Karimova", "t.python1@edu.uz"), ("Jasur Mirzayev", "t.python2@edu.uz")],
    [("Sherzod Botirov", "t.js1@edu.uz"), ("Kamola Rahimova", "t.js2@edu.uz")],
    [("Otabek Ergashev", "t.java1@edu.uz")],
    [("Feruza Aliyeva", "t.mobile1@edu.uz"), ("Rustam Qodirov", "t.mobile2@edu.uz")],
    [("Madina Jumayeva", "t.devops1@edu.uz")],
    [("Doniyor Haydarov", "t.ds1@edu.uz"), ("Iroda Olimova", "t.ds2@edu.uz")],
    [("Bekzod Teshaboyev", "t.sec1@edu.uz")],
    [("Sarvinoz Mamadaliyeva", "t.ux1@edu.uz")],
    [("Timur Sultanov", "t.eng1@edu.uz")],
    [("Farrux Axmedov", "t.robo1@edu.uz")],
]

ROOMS = [
    ("Xona 101", 15), ("Xona 102", 12), ("Xona 103", 20), ("Xona 201", 15),
    ("Xona 202", 18), ("Xona 203", 10), ("Kompyuter klass 1", 20),
    ("Kompyuter klass 2", 20), ("Coworking", 30), ("Konferens-zal", 50),
]

# Student archetypes for ML variety
# (proportion, attendance_range, grade_range, hw_completion, payment_on_time, risk_label)
ARCHETYPES = [
    ("strong",     0.30, (0.88, 1.0),  (7.5, 10.0), (0.85, 1.0),  0.95),
    ("average",    0.25, (0.72, 0.90), (5.5, 8.0),  (0.60, 0.85), 0.80),
    ("struggling", 0.20, (0.55, 0.75), (4.0, 6.5),  (0.40, 0.65), 0.50),
    ("declining",  0.15, (0.40, 0.65), (3.5, 5.5),  (0.25, 0.50), 0.30),
    ("at_risk",    0.10, (0.20, 0.50), (2.0, 4.5),  (0.10, 0.35), 0.15),
]

N_STUDENTS = 200
GROUPS_PER_DIR = 3
LESSONS_WEEKS_BACK = 8  # 2 months of lesson history
PAYMENT_MONTHS = 6


async def seed(conn) -> None:
    """Основная функция seed — заполняет БД полным набором данных.

    Выполняет 14 последовательных этапов:
        1. Создание административных пользователей.
        2. Создание направлений обучения.
        3. Создание преподавателей (привязка к направлениям).
        4. Создание предметов (привязка к направлениям и преподавателям).
        5. Создание аудиторий.
        6. Создание групп (3 на направление).
        7. Создание студентов + контрактов + платежей + зачислений.
        8. Генерация уроков (8 недель истории).
        9. Генерация посещаемости и оценок для завершённых уроков.
        10. Генерация домашних заданий (~40% уроков).
        11. Генерация экзаменов (1 на группу).
        12. Пересчёт GPA и посещаемости из реальных данных.
        13. Создание CRM-данных (воронка, этапы, лиды).
        14. Создание геймификации (ачивки, товары магазина).

    Args:
        conn: Асинхронное соединение SQLAlchemy (begin()).
    """
    print("=== Comprehensive seed ===\n")

    # Check if data already exists
    r = (await conn.execute(text("SELECT count(*) FROM users"))).scalar()
    if r and r > 5:
        print("Database already has data. Truncating...")
        await conn.execute(text("""
            TRUNCATE TABLE
                student_activity_events, student_achievements, student_purchases,
                risk_factors, diamond_records, coin_transactions,
                homework_submissions, homework_assignments, lesson_materials,
                grade_records, attendance_records, late_entry_requests,
                lms_notifications, crm_notifications, crm_tasks,
                lead_comments, lead_assignment_changes, lead_stage_changes,
                lead_activities, leads, lead_sources, custom_fields, stages, funnels,
                salary_calculations, compensation_models, exams, mup_tasks,
                payments, contracts, enrollments, lessons, groups, subjects,
                rooms, directions, crm_contacts, students, users
            CASCADE
        """))
        print("  Truncated.\n")

    # ══════════════════════════════════════════════════════════════════════════
    # 1. STAFF USERS
    # ══════════════════════════════════════════════════════════════════════════

    director_id = uid()
    mup_id = uid()
    cashier_id = uid()
    sales_id = uid()

    staff = [
        (director_id, "director@edu.uz",  "Камалов Бахтияр",    "director",      date(1985, 3, 15), "+998901000001"),
        (mup_id,      "mup@edu.uz",       "Абдуллаева Дилноза", "mup",           date(1990, 7, 22), "+998901000002"),
        (cashier_id,  "cashier@edu.uz",    "Касимова Зарина",    "cashier",       date(1992, 4, 12), "+998901000003"),
        (sales_id,    "sales@edu.uz",      "Юсупова Малика",     "sales_manager", date(1993, 1, 5),  "+998901000004"),
    ]
    for u_id, email, name, role, dob, phone in staff:
        await conn.execute(text("""
            INSERT INTO users (id, email, password_hash, name, role, phone, date_of_birth, is_active, created_at, updated_at)
            VALUES (:id, :email, :pw, :name, :role, :phone, :dob, true, now(), now())
        """), {"id": u_id, "email": email, "pw": PW_HASH, "name": name, "role": role, "phone": phone, "dob": dob})

    print(f"  ✓ {len(staff)} staff users")

    # ══════════════════════════════════════════════════════════════════════════
    # 2. DIRECTIONS
    # ══════════════════════════════════════════════════════════════════════════

    dir_ids: list[str] = []
    for name, desc, dur, total_l in DIRECTIONS:
        d_id = uid()
        dir_ids.append(d_id)
        await conn.execute(text("""
            INSERT INTO directions (id, name, description, is_active, duration_months, total_lessons, created_at, updated_at)
            VALUES (:id, :name, :desc, true, :dur, :tl, now(), now())
        """), {"id": d_id, "name": name, "desc": desc, "dur": dur, "tl": total_l})

    print(f"  ✓ {len(dir_ids)} directions")

    # ══════════════════════════════════════════════════════════════════════════
    # 3. TEACHERS — each teacher dedicated to one direction
    # ══════════════════════════════════════════════════════════════════════════

    # teacher_id -> dir_idx mapping
    teacher_ids_by_dir: dict[int, list[str]] = {}
    all_teacher_ids: list[str] = []

    for dir_idx, teachers in enumerate(TEACHERS_PER_DIR):
        teacher_ids_by_dir[dir_idx] = []
        for name, email in teachers:
            t_id = uid()
            all_teacher_ids.append(t_id)
            teacher_ids_by_dir[dir_idx].append(t_id)
            await conn.execute(text("""
                INSERT INTO users (id, email, password_hash, name, role, phone, date_of_birth, is_active, created_at, updated_at)
                VALUES (:id, :email, :pw, :name, 'teacher', :phone, :dob, true, now(), now())
            """), {"id": t_id, "email": email, "pw": PW_HASH, "name": name, "phone": random_phone(), "dob": random_dob()})

    total_teachers = sum(len(v) for v in teacher_ids_by_dir.values())
    print(f"  ✓ {total_teachers} teachers")

    # ══════════════════════════════════════════════════════════════════════════
    # 4. SUBJECTS — each subject has teacher from SAME direction
    # ══════════════════════════════════════════════════════════════════════════

    # subject_id -> (dir_idx, teacher_id)
    subject_map: dict[str, tuple[int, str]] = {}
    subjects_by_dir: dict[int, list[str]] = {}

    for dir_idx, subj_names in SUBJECTS_PER_DIR.items():
        subjects_by_dir[dir_idx] = []
        dir_teachers = teacher_ids_by_dir[dir_idx]
        for i, sname in enumerate(subj_names):
            s_id = uid()
            t_id = dir_teachers[i % len(dir_teachers)]
            subject_map[s_id] = (dir_idx, t_id)
            subjects_by_dir[dir_idx].append(s_id)
            await conn.execute(text("""
                INSERT INTO subjects (id, name, direction_id, teacher_id, is_active, created_at, updated_at)
                VALUES (:id, :name, :dir, :tid, true, now(), now())
            """), {"id": s_id, "name": sname, "dir": dir_ids[dir_idx], "tid": t_id})

    total_subjects = sum(len(v) for v in subjects_by_dir.values())
    print(f"  ✓ {total_subjects} subjects")

    # ══════════════════════════════════════════════════════════════════════════
    # 5. ROOMS
    # ══════════════════════════════════════════════════════════════════════════

    room_ids: list[str] = []
    for name, cap in ROOMS:
        r_id = uid()
        room_ids.append(r_id)
        await conn.execute(text("""
            INSERT INTO rooms (id, name, capacity, is_active, created_at, updated_at)
            VALUES (:id, :name, :cap, true, now(), now())
        """), {"id": r_id, "name": name, "cap": cap})

    print(f"  ✓ {len(room_ids)} rooms")

    # ══════════════════════════════════════════════════════════════════════════
    # 6. GROUPS — 3 per direction
    # ══════════════════════════════════════════════════════════════════════════

    # group_id -> dir_idx
    group_map: dict[str, int] = {}
    groups_by_dir: dict[int, list[str]] = {}
    schedules = [
        '{"days":["Mon","Wed","Fri"]}',
        '{"days":["Tue","Thu","Sat"]}',
        '{"days":["Mon","Wed"]}',
    ]

    for dir_idx in range(len(dir_ids)):
        groups_by_dir[dir_idx] = []
        for gi in range(GROUPS_PER_DIR):
            g_id = uid()
            gname = f"{DIR_SHORT[dir_idx]}-{gi + 1:02d}"
            group_map[g_id] = dir_idx
            groups_by_dir[dir_idx].append(g_id)
            start_d = date(2026, random.choice([1, 2, 3]), random.randint(1, 15))
            await conn.execute(text("""
                INSERT INTO groups (id, name, direction_id, room_id, schedule,
                                    max_students, price_per_month, started_at, is_active,
                                    created_at, updated_at)
                VALUES (:id, :name, :dir, :room, :sched,
                        :max_s, :price, :start, true,
                        now(), now())
            """), {
                "id": g_id, "name": gname, "dir": dir_ids[dir_idx],
                "room": room_ids[dir_idx % len(room_ids)],
                "sched": schedules[gi % len(schedules)],
                "max_s": random.choice([12, 15, 18]),
                "price": random.choice([500000, 600000, 800000, 1000000, 1200000]),
                "start": start_d,
            })

    total_groups = sum(len(v) for v in groups_by_dir.values())
    print(f"  ✓ {total_groups} groups")

    # ══════════════════════════════════════════════════════════════════════════
    # 7. STUDENTS + CONTRACTS + PAYMENTS + ENROLLMENTS
    #    Contract direction = enrollment group direction
    # ══════════════════════════════════════════════════════════════════════════

    # Build archetype distribution
    archetype_list: list[tuple] = []
    for arch_name, proportion, att_r, grade_r, hw_r, pay_r in ARCHETYPES:
        count = int(N_STUDENTS * proportion)
        for _ in range(count):
            archetype_list.append((arch_name, att_r, grade_r, hw_r, pay_r))
    while len(archetype_list) < N_STUDENTS:
        archetype_list.append(ARCHETYPES[0][0:1] + ARCHETYPES[0][2:])
    random.shuffle(archetype_list)

    # student_id -> (dir_idx, archetype_data, user_id)
    student_info: dict[str, dict] = {}
    students_by_dir_pool: dict[int, list[str]] = {i: [] for i in range(len(dir_ids))}
    contract_ids: list[str] = []

    for i in range(N_STUDENTS):
        s_id = uid()
        u_id = uid()
        name = next_name()
        dir_idx = i % len(dir_ids)
        arch = archetype_list[i]
        arch_name, att_r, grade_r, hw_r, pay_r = arch
        email = f"student{i + 1}@edu.uz"
        phone = random_phone()

        # Create user
        await conn.execute(text("""
            INSERT INTO users (id, email, password_hash, name, role, phone, is_active, created_at, updated_at)
            VALUES (:id, :email, :pw, :name, 'student', :phone, true, now(), now())
        """), {"id": u_id, "email": email, "pw": PW_HASH, "name": name, "phone": phone})

        # Create student (gpa/attendance will be recalculated from actual data later)
        await conn.execute(text("""
            INSERT INTO students (id, user_id, full_name, email, student_code, phone,
                                  direction_id, date_of_birth, parent_name, parent_phone,
                                  gpa, attendance_percent, risk_level,
                                  stars, crystals, coins, badge_level,
                                  is_active, created_at, updated_at)
            VALUES (:id, :uid, :name, :email, :code, :phone,
                    :dir, :dob, :parent, :pphone,
                    null, null, 'low',
                    0, 0, 0, 'bronze',
                    true, now(), now())
        """), {
            "id": s_id, "uid": u_id, "name": name, "email": email,
            "code": f"STU-{i + 1:04d}", "phone": phone,
            "dir": dir_ids[dir_idx], "dob": student_dob(),
            "parent": next_name(), "pphone": random_phone(),
        })

        # Create CONTRACT for this student in their direction
        c_id = uid()
        contract_ids.append(c_id)
        payment_amount = random.choice([500000, 600000, 800000, 1000000, 1200000])
        start_d = date(2026, random.choice([1, 2]), random.randint(1, 15))
        await conn.execute(text("""
            INSERT INTO contracts (id, contract_number, student_id, user_id, direction_id,
                                   full_name, phone, email, payment_type, payment_amount,
                                   currency, start_date, status, created_by, created_at, updated_at)
            VALUES (:id, :num, :sid, :uid, :dir,
                    :name, :phone, :email, 'monthly', :amount,
                    'UZS', :start, 'active', :by, now(), now())
        """), {
            "id": c_id, "num": f"C-{2026}{i + 1:04d}",
            "sid": s_id, "uid": u_id, "dir": dir_ids[dir_idx],
            "name": name, "phone": phone, "email": email,
            "amount": payment_amount, "start": start_d, "by": sales_id,
        })

        # Create PAYMENT schedule (6 monthly payments)
        for pm in range(PAYMENT_MONTHS):
            p_id = uid()
            due = start_d + timedelta(days=30 * pm)
            # Based on archetype, decide if paid
            is_paid = random.random() < pay_r
            past_due = due < TODAY
            if is_paid and past_due:
                status = "paid"
                paid_at = datetime(due.year, due.month, min(due.day + random.randint(0, 5), 28), tzinfo=timezone.utc)
                paid_amount = payment_amount
            elif past_due:
                status = "overdue"
                paid_at = None
                paid_amount = 0
            else:
                status = "pending"
                paid_at = None
                paid_amount = 0

            await conn.execute(text("""
                INSERT INTO payments (id, student_id, contract_id, description, amount, currency,
                                      status, due_date, paid_at, method, paid_amount,
                                      period_number, created_by, created_at, updated_at)
                VALUES (:id, :sid, :cid, :desc, :amt, 'UZS',
                        :st, :due, :paid_at, :method, :paid_amt,
                        :pn, :by, now(), now())
            """), {
                "id": p_id, "sid": s_id, "cid": c_id,
                "desc": f"Оплата за {pm + 1}-й месяц",
                "amt": payment_amount, "st": status, "due": due,
                "paid_at": paid_at,
                "method": random.choice(["cash", "card", "transfer", "payme", "click"]) if is_paid else None,
                "paid_amt": paid_amount, "pn": pm + 1, "by": cashier_id,
            })

        # ENROLL student in a group from SAME direction
        dir_groups = groups_by_dir[dir_idx]
        target_group = dir_groups[i % len(dir_groups)]
        enrolled_at = datetime(2026, random.choice([1, 2]), random.randint(5, 20), tzinfo=timezone.utc)
        await conn.execute(text("""
            INSERT INTO enrollments (id, student_id, group_id, enrolled_at, is_active)
            VALUES (:id, :sid, :gid, :eat, true)
        """), {"id": uid(), "sid": s_id, "gid": target_group, "eat": enrolled_at})

        student_info[s_id] = {
            "dir_idx": dir_idx,
            "arch_name": arch_name,
            "att_range": att_r,
            "grade_range": grade_r,
            "hw_range": hw_r,
            "pay_range": pay_r,
            "user_id": u_id,
            "group_id": target_group,
            "name": name,
        }
        students_by_dir_pool[dir_idx].append(s_id)

    print(f"  ✓ {N_STUDENTS} students + contracts + payments + enrollments")

    # ══════════════════════════════════════════════════════════════════════════
    # 8. LESSONS — 8 weeks of history, realistic schedule
    # ══════════════════════════════════════════════════════════════════════════

    # Build enrollment lookup: group_id -> [student_ids]
    enrolled: dict[str, list[str]] = {}
    for s_id, info in student_info.items():
        g_id = info["group_id"]
        enrolled.setdefault(g_id, []).append(s_id)

    # lesson_id -> (group_id, subject_id, teacher_id, scheduled_at)
    lesson_map: dict[str, dict] = {}
    completed_lessons: list[str] = []
    schedule_weekdays = {
        '{"days":["Mon","Wed","Fri"]}': [0, 2, 4],
        '{"days":["Tue","Thu","Sat"]}': [1, 3, 5],
        '{"days":["Mon","Wed"]}': [0, 2],
    }

    lesson_start = TODAY - timedelta(weeks=LESSONS_WEEKS_BACK)

    for g_id, dir_idx in group_map.items():
        dir_subjects = subjects_by_dir[dir_idx]
        if not dir_subjects:
            continue

        # Get group's schedule
        sched_json = schedules[list(groups_by_dir[dir_idx]).index(g_id) % len(schedules)]
        weekdays = schedule_weekdays[sched_json]

        # Rotate subjects
        subj_cycle_idx = 0
        cur = lesson_start
        while cur <= TODAY + timedelta(days=7):
            if cur.weekday() in weekdays:
                subj_id = dir_subjects[subj_cycle_idx % len(dir_subjects)]
                subj_cycle_idx += 1
                _, teacher_id = subject_map[subj_id]

                hour = random.choice([9, 10, 14, 15, 16])
                sched_dt = datetime(cur.year, cur.month, cur.day, hour, 0, tzinfo=timezone.utc)
                status = "completed" if cur < TODAY else "scheduled"
                l_id = uid()

                await conn.execute(text("""
                    INSERT INTO lessons (id, group_id, subject_id, teacher_id, room_id,
                                         scheduled_at, duration_minutes, status, is_online,
                                         topic, created_at, updated_at)
                    VALUES (:id, :gid, :sid, :tid, :rid,
                            :sched, 90, :st, false,
                            :topic, now(), now())
                """), {
                    "id": l_id, "gid": g_id, "sid": subj_id, "tid": teacher_id,
                    "rid": room_ids[dir_idx % len(room_ids)],
                    "sched": sched_dt, "st": status,
                    "topic": f"Тема: {SUBJECTS_PER_DIR[dir_idx][subj_cycle_idx % len(dir_subjects)]}" if status == "completed" else None,
                })
                lesson_map[l_id] = {
                    "group_id": g_id, "subject_id": subj_id,
                    "teacher_id": teacher_id, "scheduled_at": sched_dt,
                    "dir_idx": dir_idx,
                }
                if status == "completed":
                    completed_lessons.append(l_id)
            cur += timedelta(days=1)

    print(f"  ✓ {len(lesson_map)} lessons ({len(completed_lessons)} completed)")

    # ══════════════════════════════════════════════════════════════════════════
    # 9. ATTENDANCE + GRADES for completed lessons
    # ══════════════════════════════════════════════════════════════════════════

    att_count = 0
    grade_count = 0

    for l_id in completed_lessons:
        linfo = lesson_map[l_id]
        g_id = linfo["group_id"]
        subj_id = linfo["subject_id"]
        teacher_id = linfo["teacher_id"]
        sched = linfo["scheduled_at"]
        students_in_group = enrolled.get(g_id, [])

        for s_id in students_in_group:
            sinfo = student_info[s_id]
            att_lo, att_hi = sinfo["att_range"]
            grade_lo, grade_hi = sinfo["grade_range"]

            # Attendance — based on archetype probability
            att_roll = random.random()
            if att_roll < (att_lo + att_hi) / 2:
                att_status = "present"
            elif att_roll < (att_lo + att_hi) / 2 + 0.1:
                att_status = "late"
            else:
                att_status = "absent"

            await conn.execute(text("""
                INSERT INTO attendance_records (id, lesson_id, student_id, status, minutes_late,
                                                recorded_by, recorded_at)
                VALUES (:id, :lid, :sid, :st, :late, :by, :at)
            """), {
                "id": uid(), "lid": l_id, "sid": s_id, "st": att_status,
                "late": random.randint(5, 20) if att_status == "late" else None,
                "by": teacher_id, "at": sched,
            })
            att_count += 1

            # Grade (participation type) — only if present or late
            if att_status in ("present", "late"):
                score = round(random.uniform(grade_lo, grade_hi), 1)
                score = max(1.0, min(10.0, score))
                await conn.execute(text("""
                    INSERT INTO grade_records (id, student_id, subject_id, lesson_id,
                                               type, score, max_score, graded_by, graded_at)
                    VALUES (:id, :sid, :subj, :lid,
                            'participation', :score, 10, :by, :at)
                """), {
                    "id": uid(), "sid": s_id, "subj": subj_id, "lid": l_id,
                    "score": score, "by": teacher_id, "at": sched,
                })
                grade_count += 1

    print(f"  ✓ {att_count} attendance records")
    print(f"  ✓ {grade_count} grades (participation)")

    # ══════════════════════════════════════════════════════════════════════════
    # 10. HOMEWORK — ~40% of completed lessons get homework
    # ══════════════════════════════════════════════════════════════════════════

    hw_assign_count = 0
    hw_sub_count = 0

    hw_lessons = random.sample(completed_lessons, k=int(len(completed_lessons) * 0.4))

    for l_id in hw_lessons:
        linfo = lesson_map[l_id]
        g_id = linfo["group_id"]
        teacher_id = linfo["teacher_id"]
        sched = linfo["scheduled_at"]
        subj_id = linfo["subject_id"]
        dir_idx = linfo["dir_idx"]

        # Create assignment
        a_id = uid()
        due = sched + timedelta(days=random.choice([3, 5, 7]))
        topics = SUBJECTS_PER_DIR[dir_idx]
        title = f"ДЗ: {random.choice(topics)} — практика"
        await conn.execute(text("""
            INSERT INTO homework_assignments (id, lesson_id, title, description, due_date, max_score,
                                              created_by, created_at, updated_at)
            VALUES (:id, :lid, :title, :desc, :due, 10, :by, :sched, :sched)
        """), {
            "id": a_id, "lid": l_id, "title": title,
            "desc": f"Выполните практическое задание по теме урока.",
            "due": due, "by": teacher_id, "sched": sched,
        })
        hw_assign_count += 1

        # Create submissions for enrolled students
        students_in_group = enrolled.get(g_id, [])
        for s_id in students_in_group:
            sinfo = student_info[s_id]
            hw_lo, hw_hi = sinfo["hw_range"]
            grade_lo, grade_hi = sinfo["grade_range"]

            sub_id = uid()
            completed_hw = random.random() < (hw_lo + hw_hi) / 2

            if completed_hw:
                # Submitted — maybe on time, maybe late
                submit_dt = due - timedelta(hours=random.randint(1, 48)) if random.random() < 0.7 else due + timedelta(hours=random.randint(1, 48))
                # Was it graded?
                graded = random.random() < 0.8
                if graded:
                    score = round(random.uniform(grade_lo, grade_hi), 1)
                    score = max(1.0, min(10.0, score))
                    status = "graded"
                    graded_at = submit_dt + timedelta(days=random.randint(1, 3))
                else:
                    score = None
                    status = "submitted"
                    graded_at = None

                await conn.execute(text("""
                    INSERT INTO homework_submissions (id, assignment_id, student_id, status,
                                                      submitted_at, answer_text, score, feedback,
                                                      graded_by, graded_at)
                    VALUES (:id, :aid, :sid, :st,
                            :sub_at, :answer, :score, :fb,
                            :by, :graded_at)
                """), {
                    "id": sub_id, "aid": a_id, "sid": s_id, "st": status,
                    "sub_at": submit_dt, "answer": "Выполнено" if random.random() < 0.6 else None,
                    "score": score, "fb": "Хорошо" if score and score >= 7 else ("Доработать" if score else None),
                    "by": teacher_id if graded else None, "graded_at": graded_at,
                })

                # If graded, also create a grade_record
                if graded and score:
                    await conn.execute(text("""
                        INSERT INTO grade_records (id, student_id, subject_id, lesson_id,
                                                   type, score, max_score, graded_by, graded_at)
                        VALUES (:id, :sid, :subj, :lid,
                                'homework', :score, 10, :by, :at)
                    """), {
                        "id": uid(), "sid": s_id, "subj": subj_id, "lid": l_id,
                        "score": score, "by": teacher_id, "at": graded_at,
                    })
                    grade_count += 1
            else:
                # Not submitted — overdue or pending
                is_past = due < NOW
                status = "overdue" if is_past else "pending"
                await conn.execute(text("""
                    INSERT INTO homework_submissions (id, assignment_id, student_id, status)
                    VALUES (:id, :aid, :sid, :st)
                """), {"id": sub_id, "aid": a_id, "sid": s_id, "st": status})

            hw_sub_count += 1

    print(f"  ✓ {hw_assign_count} homework assignments")
    print(f"  ✓ {hw_sub_count} homework submissions")
    print(f"  ✓ {grade_count} total grade records")

    # ══════════════════════════════════════════════════════════════════════════
    # 11. EXAMS — 1 per group
    # ══════════════════════════════════════════════════════════════════════════

    exam_count = 0
    for g_id, dir_idx in group_map.items():
        dir_subjects = subjects_by_dir[dir_idx]
        if not dir_subjects:
            continue
        subj_id = dir_subjects[0]
        _, teacher_id = subject_map[subj_id]

        e_id = uid()
        exam_date = datetime(2026, 3, random.randint(15, 28), 10, 0, tzinfo=timezone.utc)
        await conn.execute(text("""
            INSERT INTO exams (id, subject_id, group_id, title, description,
                               scheduled_at, duration_minutes, max_score, created_by,
                               created_at, updated_at)
            VALUES (:id, :sid, :gid, :title, :desc,
                    :sched, 120, 10, :by,
                    now(), now())
        """), {
            "id": e_id, "sid": subj_id, "gid": g_id,
            "title": f"Промежуточный экзамен",
            "desc": f"Экзамен по {SUBJECTS_PER_DIR[dir_idx][0]}",
            "sched": exam_date, "by": teacher_id,
        })

        # Exam grades for enrolled students
        for s_id in enrolled.get(g_id, []):
            sinfo = student_info[s_id]
            grade_lo, grade_hi = sinfo["grade_range"]
            score = round(random.uniform(grade_lo, min(grade_hi, 10.0)), 1)
            score = max(1.0, min(10.0, score))
            await conn.execute(text("""
                INSERT INTO grade_records (id, student_id, subject_id, exam_id,
                                           type, score, max_score, graded_by, graded_at)
                VALUES (:id, :sid, :subj, :eid,
                        'exam', :score, 10, :by, :at)
            """), {
                "id": uid(), "sid": s_id, "subj": subj_id, "eid": e_id,
                "score": score, "by": teacher_id, "at": exam_date,
            })
            grade_count += 1

        exam_count += 1

    print(f"  ✓ {exam_count} exams + grades")

    # ══════════════════════════════════════════════════════════════════════════
    # 12. RECALCULATE GPA + ATTENDANCE for all students (from actual data)
    # ══════════════════════════════════════════════════════════════════════════

    for s_id in student_info:
        # GPA
        gpa_result = (await conn.execute(text("""
            SELECT avg(score / max_score * 10) as gpa
            FROM grade_records WHERE student_id = :sid AND max_score > 0
        """), {"sid": s_id})).scalar()

        # Attendance %
        total_att = (await conn.execute(text("""
            SELECT count(*) FROM attendance_records WHERE student_id = :sid
        """), {"sid": s_id})).scalar() or 0

        present_att = (await conn.execute(text("""
            SELECT count(*) FROM attendance_records
            WHERE student_id = :sid AND status IN ('present', 'late')
        """), {"sid": s_id})).scalar() or 0

        att_pct = round(present_att / total_att * 100, 2) if total_att > 0 else None
        gpa_val = round(float(gpa_result), 2) if gpa_result else None

        await conn.execute(text("""
            UPDATE students SET gpa = :gpa, attendance_percent = :att WHERE id = :sid
        """), {"gpa": gpa_val, "att": att_pct, "sid": s_id})

    print(f"  ✓ Recalculated GPA + attendance for {len(student_info)} students")

    # ══════════════════════════════════════════════════════════════════════════
    # 13. CRM — Funnel, stages, leads
    # ══════════════════════════════════════════════════════════════════════════

    funnel_id = uid()
    await conn.execute(text("""
        INSERT INTO funnels (id, name, is_archived, created_by, created_at, updated_at)
        VALUES (:id, 'IT-обучение', false, :by, now(), now())
    """), {"id": funnel_id, "by": director_id})

    stage_names = [
        ("Новый", "#6366F1", 10, 1),
        ("Связались", "#3B82F6", 25, 2),
        ("Интерес", "#22C55E", 50, 3),
        ("Пробный урок", "#F59E0B", 70, 4),
        ("Договор", "#EF4444", 90, 5),
    ]
    stage_ids = []
    for sname, color, prob, order in stage_names:
        st_id = uid()
        stage_ids.append(st_id)
        await conn.execute(text("""
            INSERT INTO stages (id, funnel_id, name, color, win_probability, "order")
            VALUES (:id, :fid, :name, :color, :prob, :ord)
        """), {"id": st_id, "fid": funnel_id, "name": sname, "color": color, "prob": prob, "ord": order})

    # Lead source
    src_id = uid()
    await conn.execute(text("""
        INSERT INTO lead_sources (id, name, type, is_active, funnel_id, created_at)
        VALUES (:id, 'Веб-сайт', 'landing', true, :fid, now())
    """), {"id": src_id, "fid": funnel_id})

    # 30 leads
    for li in range(30):
        lead_id = uid()
        stage = random.choice(stage_ids)
        await conn.execute(text("""
            INSERT INTO leads (id, full_name, phone, email, source_id, funnel_id, stage_id,
                               assigned_to, status, custom_fields, created_at, updated_at)
            VALUES (:id, :name, :phone, :email, :src, :fid, :stage,
                    :assign, :st, '{}', now(), now())
        """), {
            "id": lead_id, "name": next_name(), "phone": random_phone(),
            "email": f"lead{li + 1}@mail.uz", "src": src_id, "fid": funnel_id,
            "stage": stage, "assign": sales_id,
            "st": random.choice(["active", "active", "active", "won", "lost"]),
        })

    print(f"  ✓ CRM: 1 funnel, {len(stage_ids)} stages, 30 leads")

    # ══════════════════════════════════════════════════════════════════════════
    # 14. GAMIFICATION — achievements + shop items
    # ══════════════════════════════════════════════════════════════════════════

    achievements = [
        ("Первая оценка", "Получи первую оценку", "academic", "🎯", 10, 0, "first_grade", 1),
        ("Пять десяток", "Получи 5 оценок 10/10", "academic", "🌟", 50, 5, "five_tens", 5),
        ("GPA 9+", "Средний балл выше 9", "academic", "🏆", 100, 10, "gpa_9", 1),
        ("10 посещений", "Посети 10 уроков подряд", "attendance", "📅", 20, 5, "ten_present", 10),
        ("30 посещений", "Посети 30 уроков подряд", "attendance", "🔥", 50, 15, "thirty_present", 30),
        ("10 домашек", "Сдай 10 домашних заданий", "activity", "📝", 30, 5, "ten_homework", 10),
        ("Лидер", "Займи первое место в рейтинге", "social", "👑", 100, 20, "leaderboard_first", 1),
    ]
    for aname, adesc, cat, icon, stars, cryst, trigger, tval in achievements:
        await conn.execute(text("""
            INSERT INTO achievements (id, name, description, category, icon,
                                      reward_stars, reward_crystals, trigger_type, trigger_value,
                                      is_active, created_at, updated_at)
            VALUES (:id, :name, :desc, :cat, :icon,
                    :stars, :cryst, :trigger, :tval,
                    true, now(), now())
        """), {
            "id": uid(), "name": aname, "desc": adesc, "cat": cat, "icon": icon,
            "stars": stars, "cryst": cryst, "trigger": trigger, "tval": tval,
        })

    shop_items = [
        ("Стикерпак", "Набор IT-стикеров", "🎨", 50, 0),
        ("Сертификат", "Именной сертификат", "📜", 200, 0),
        ("Скидка 10%", "На следующий месяц", "💰", 0, 30),
        ("Футболка", "Брендированная футболка", "👕", 500, 0),
        ("Бесплатный урок", "Один доп. урок бесплатно", "📚", 0, 50),
    ]
    for sname, sdesc, icon, cost_s, cost_c in shop_items:
        await conn.execute(text("""
            INSERT INTO shop_items (id, name, description, icon, category,
                                    cost_stars, cost_crystals, is_active, created_at, updated_at)
            VALUES (:id, :name, :desc, :icon, 'reward',
                    :cs, :cc, true, now(), now())
        """), {"id": uid(), "name": sname, "desc": sdesc, "icon": icon, "cs": cost_s, "cc": cost_c})

    print(f"  ✓ {len(achievements)} achievements + {len(shop_items)} shop items")

    # ══════════════════════════════════════════════════════════════════════════
    # SUMMARY (ML risk scoring runs separately after seed)
    # ══════════════════════════════════════════════════════════════════════════

    print(f"\n{'=' * 50}")
    print(f"  Seed complete!")
    print(f"  Students:    {N_STUDENTS}")
    print(f"  Groups:      {total_groups}")
    print(f"  Lessons:     {len(lesson_map)}")
    print(f"  Attendance:  {att_count}")
    print(f"  Grades:      {grade_count}")
    print(f"  Homework:    {hw_assign_count} assignments, {hw_sub_count} submissions")
    print(f"  Exams:       {exam_count}")
    print(f"  Contracts:   {len(contract_ids)}")
    print(f"{'=' * 50}")


async def main() -> None:
    """Точка входа: создаёт подключение к БД и запускает seed в транзакции.

    Использует create_async_engine с DATABASE_URL из settings.
    Весь seed выполняется в одной транзакции (begin()).
    """
    engine = create_async_engine(str(settings.DATABASE_URL), echo=False)
    async with engine.begin() as conn:
        await seed(conn)
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
