"""
Seed script — заполняет базу реалистичными демо-данными IT-учебного центра.

~300 студентов, 12 преподавателей, 8 направлений, 24 предмета, 30 групп,
уроки за текущий месяц, CRM воронки + лиды.

Запуск:
    docker compose exec api bash -c "mkdir -p /app/scripts"
    docker cp scripts/seed.py eduplatform-api-1:/app/scripts/seed.py
    docker compose exec api bash -c "PYTHONPATH=/app python /app/scripts/seed.py"
"""
import asyncio
import random
import uuid
from datetime import date, timedelta, datetime, timezone

import bcrypt
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

from src.config import settings

random.seed(42)

def hash_pw(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()

def uid() -> str:
    return str(uuid.uuid4())

PW_HASH = hash_pw("password123")  # shared for speed

# ── Name pools ───────────────────────────────────────────────────────────────

FIRST_NAMES_M = [
    "Alisher", "Bobur", "Doniyor", "Firdavs", "Jasur", "Kamron", "Mirzo",
    "Nodir", "Otabek", "Rustam", "Sardor", "Temur", "Ulugbek", "Xasan",
    "Zafar", "Bekzod", "Islom", "Jahongir", "Komil", "Mansur", "Qodir",
    "Sherzod", "Timur", "Abdulla", "Baxtiyor", "Eldor", "Husan", "Murod",
]
FIRST_NAMES_F = [
    "Aziza", "Barno", "Dilnoza", "Feruza", "Gulnora", "Hilola", "Iroda",
    "Kamola", "Lola", "Madina", "Nasiba", "Nigora", "Ozoda", "Rano",
    "Sabohat", "Umida", "Zulfiya", "Malika", "Nodira", "Shahlo", "Yulduz",
    "Mohira", "Sarvinoz", "Dilorom", "Gavhar", "Zilola", "Nargiza", "Shoira",
]
LAST_NAMES = [
    "Karimov", "Yusupov", "Rahimov", "Mirzayev", "Toshmatov", "Abdullayev",
    "Xasanov", "Normatov", "Tursunov", "Nazarov", "Saidov", "Aliyev",
    "Umarov", "Ismoilov", "Botirov", "Raxmatullayev", "Ergashev", "Mamadaliyev",
    "Qodirov", "Sultanov", "Jumayev", "Haydarov", "Olimov", "Teshaboyev",
]

def random_name() -> str:
    first = random.choice(FIRST_NAMES_M + FIRST_NAMES_F)
    last = random.choice(LAST_NAMES)
    return f"{first} {last}"

def random_phone() -> str:
    return f"+99890{random.randint(1000000, 9999999)}"

def random_dob(min_year=1980, max_year=2000) -> date:
    return date(random.randint(min_year, max_year), random.randint(1, 12), random.randint(1, 28))

def random_student_dob() -> date:
    return date(random.randint(2005, 2012), random.randint(1, 12), random.randint(1, 28))


async def seed(conn) -> None:
    print("Seeding…")

    # ══════════════════════════════════════════════════════════════════════════
    # STAFF
    # ══════════════════════════════════════════════════════════════════════════

    director_id = uid()
    mup1_id, mup2_id = uid(), uid()
    sales1_id, sales2_id, sales3_id = uid(), uid(), uid()
    cashier_id = uid()

    staff = [
        (director_id, "director@edu.uz",  "Sardor Toshmatov",      "director",      date(1985, 3, 15), "+998901000001"),
        (mup1_id,     "mup1@edu.uz",      "Dilnoza Abdullayeva",   "mup",           date(1990, 7, 22), "+998901000002"),
        (mup2_id,     "mup2@edu.uz",      "Baxtiyor Sultanov",     "mup",           date(1988, 11, 10), "+998901000003"),
        (sales1_id,   "sales1@edu.uz",     "Malika Yusupova",       "sales_manager", date(1993, 1, 5), "+998901000004"),
        (sales2_id,   "sales2@edu.uz",     "Bobur Rahimov",         "sales_manager", date(1991, 6, 18), "+998901000005"),
        (sales3_id,   "sales3@edu.uz",     "Nigora Saidova",        "sales_manager", date(1994, 9, 30), "+998901000006"),
        (cashier_id,  "cashier@edu.uz",    "Umid Xasanov",          "cashier",       date(1992, 4, 12), "+998901000007"),
    ]
    for u_id, email, name, role, dob, phone in staff:
        await conn.execute(text("""
            INSERT INTO users (id, email, password_hash, name, role, phone, date_of_birth, is_active, created_at, updated_at)
            VALUES (:id, :email, :pw, :name, :role, :phone, :dob, true, now(), now())
            ON CONFLICT (email) DO NOTHING
        """), {"id": u_id, "email": email, "pw": PW_HASH, "name": name, "role": role, "phone": phone, "dob": dob})

    # ── Teachers (12) ─────────────────────────────────────────────────────────
    teacher_names = [
        "Nodira Karimova", "Jasur Mirzayev", "Sherzod Botirov", "Kamola Rahimova",
        "Otabek Ergashev", "Feruza Aliyeva", "Rustam Qodirov", "Madina Jumayeva",
        "Doniyor Haydarov", "Iroda Olimova", "Bekzod Teshaboyev", "Sarvinoz Mamadaliyeva",
    ]
    teacher_ids = []
    for i, name in enumerate(teacher_names):
        t_id = uid()
        teacher_ids.append(t_id)
        await conn.execute(text("""
            INSERT INTO users (id, email, password_hash, name, role, phone, date_of_birth, is_active, created_at, updated_at)
            VALUES (:id, :email, :pw, :name, 'teacher', :phone, :dob, true, now(), now())
            ON CONFLICT (email) DO NOTHING
        """), {
            "id": t_id, "email": f"teacher{i+1}@edu.uz", "pw": PW_HASH,
            "name": name, "phone": random_phone(), "dob": random_dob(1985, 1998),
        })

    print(f"  ✓ {len(staff) + len(teacher_ids)} staff users")

    # ══════════════════════════════════════════════════════════════════════════
    # DIRECTIONS (8 IT-oriented)
    # ══════════════════════════════════════════════════════════════════════════

    directions_data = [
        ("Python dasturlash",          "Python backend, Django, FastAPI, data science"),
        ("JavaScript & Frontend",      "React, Next.js, TypeScript, HTML/CSS"),
        ("Java dasturlash",            "Java Core, Spring Boot, Android"),
        ("Mobile dasturlash",          "Flutter, React Native, Swift, Kotlin"),
        ("DevOps & Cloud",             "Docker, Kubernetes, CI/CD, AWS"),
        ("Data Science & AI",          "Machine Learning, Deep Learning, NLP"),
        ("Kiberxavfsizlik",            "Penetration testing, SOC, network security"),
        ("UI/UX dizayn",               "Figma, Adobe XD, UX research, prototyping"),
        ("Ingliz tili (IT)",           "Technical English, IELTS for IT professionals"),
        ("Robototexnika",              "Arduino, Raspberry Pi, C++, electronics"),
    ]
    dir_ids = []
    for name, desc in directions_data:
        d_id = uid()
        dir_ids.append(d_id)
        await conn.execute(text("""
            INSERT INTO directions (id, name, description, is_active, created_at, updated_at)
            VALUES (:id, :name, :desc, true, now(), now())
        """), {"id": d_id, "name": name, "desc": desc})

    print(f"  ✓ {len(dir_ids)} directions")

    # ══════════════════════════════════════════════════════════════════════════
    # SUBJECTS (2-3 per direction, assigned to teachers)
    # ══════════════════════════════════════════════════════════════════════════

    subjects_by_dir = {
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
    all_subject_ids = []  # (subject_id, dir_idx)
    subj_id_map = {}      # subject_id -> dir_id
    t_idx = 0
    for dir_idx, subj_names in subjects_by_dir.items():
        for sname in subj_names:
            s_id = uid()
            tid = teacher_ids[t_idx % len(teacher_ids)]
            t_idx += 1
            all_subject_ids.append((s_id, dir_idx))
            subj_id_map[s_id] = dir_ids[dir_idx]
            await conn.execute(text("""
                INSERT INTO subjects (id, name, direction_id, teacher_id, is_active, created_at, updated_at)
                VALUES (:id, :name, :dir, :tid, true, now(), now())
            """), {"id": s_id, "name": sname, "dir": dir_ids[dir_idx], "tid": tid})

    print(f"  ✓ {len(all_subject_ids)} subjects")

    # ══════════════════════════════════════════════════════════════════════════
    # ROOMS (10)
    # ══════════════════════════════════════════════════════════════════════════

    rooms_data = [
        ("Xona 101", 15), ("Xona 102", 12), ("Xona 103", 20),
        ("Xona 201", 15), ("Xona 202", 18), ("Xona 203", 10),
        ("Kompyuter klass 1", 20), ("Kompyuter klass 2", 20),
        ("Coworking", 30), ("Konferens-zal", 50),
    ]
    room_ids = []
    for name, cap in rooms_data:
        r_id = uid()
        room_ids.append(r_id)
        await conn.execute(text("""
            INSERT INTO rooms (id, name, capacity, is_active, created_at, updated_at)
            VALUES (:id, :name, :cap, true, now(), now())
        """), {"id": r_id, "name": name, "cap": cap})

    print(f"  ✓ {len(room_ids)} rooms")

    # ══════════════════════════════════════════════════════════════════════════
    # GROUPS (30, 3 per direction)
    # ══════════════════════════════════════════════════════════════════════════

    group_names_tpl = [
        "{dir}-01", "{dir}-02", "{dir}-03",
    ]
    short_dir = ["PY", "JS", "JAVA", "MOB", "DEVOPS", "DS", "SEC", "UXUI", "ENG", "ROBO"]
    all_group_ids = []  # (group_id, dir_idx)
    for dir_idx in range(len(dir_ids)):
        for gi in range(3):
            g_id = uid()
            gname = f"{short_dir[dir_idx]}-{gi+1:02d}"
            days = random.choice([
                '{"days":["Mon","Wed","Fri"]}',
                '{"days":["Tue","Thu","Sat"]}',
                '{"days":["Mon","Wed"]}',
                '{"days":["Tue","Thu"]}',
            ])
            start_d = date(2026, random.choice([1, 2, 3]), random.randint(1, 15))
            end_d = start_d + timedelta(days=random.choice([120, 150, 180]))
            all_group_ids.append((g_id, dir_idx))
            await conn.execute(text("""
                INSERT INTO groups (id, name, direction_id, room_id,
                                    schedule, max_students, price_per_month,
                                    started_at, ended_at, is_active, created_at, updated_at)
                VALUES (:id, :name, :dir, :room,
                        :sched, :max_s, :price,
                        :start, :end, true, now(), now())
            """), {
                "id": g_id, "name": gname,
                "dir": dir_ids[dir_idx],
                "room": random.choice(room_ids),
                "sched": days,
                "max_s": random.choice([12, 15, 18, 20]),
                "price": random.choice([400000, 500000, 600000, 800000, 1000000]),
                "start": start_d, "end": end_d,
            })

    print(f"  ✓ {len(all_group_ids)} groups")

    # ══════════════════════════════════════════════════════════════════════════
    # STUDENTS (300)
    # ══════════════════════════════════════════════════════════════════════════

    student_ids = []
    risk_levels = ["low"] * 200 + ["medium"] * 60 + ["high"] * 30 + ["critical"] * 10
    random.shuffle(risk_levels)

    for i in range(300):
        s_id = uid()
        u_id = uid()
        name = random_name()
        email = f"student{i+1}@edu.uz"
        phone = random_phone()
        risk = risk_levels[i]
        gpa = round(random.uniform(2.0, 9.5), 2)
        att = round(random.uniform(40.0, 100.0), 1)
        dir_idx = i % len(dir_ids)

        await conn.execute(text("""
            INSERT INTO users (id, email, password_hash, name, role, is_active, created_at, updated_at)
            VALUES (:id, :email, :pw, :name, 'student', true, now(), now())
            ON CONFLICT (email) DO NOTHING
        """), {"id": u_id, "email": email, "pw": PW_HASH, "name": name})

        await conn.execute(text("""
            INSERT INTO students (id, user_id, full_name, email, student_code, phone, direction_id,
                                  date_of_birth, gpa, attendance_percent, risk_level,
                                  stars, crystals, coins, badge_level, is_active, created_at, updated_at)
            VALUES (:id, :uid, :name, :email, :code, :phone, :dir,
                    :dob, :gpa, :att, :risk,
                    :stars, :cryst, :coins, :badge, true, now(), now())
        """), {
            "id": s_id, "uid": u_id, "name": name, "email": email,
            "code": f"STU-{i+1:04d}", "phone": phone,
            "dir": dir_ids[dir_idx],
            "dob": random_student_dob(),
            "gpa": gpa, "att": att, "risk": risk,
            "stars": random.randint(0, 500),
            "cryst": random.randint(0, 200),
            "coins": random.randint(0, 1000),
            "badge": random.choice(["bronze", "silver", "gold", "platinum"]),
        })
        student_ids.append((s_id, dir_idx))

    print(f"  ✓ {len(student_ids)} students")

    # ══════════════════════════════════════════════════════════════════════════
    # ENROLLMENTS (~10 students per group)
    # ══════════════════════════════════════════════════════════════════════════

    enroll_count = 0
    students_by_dir: dict[int, list[str]] = {}
    for s_id, d_idx in student_ids:
        students_by_dir.setdefault(d_idx, []).append(s_id)

    for g_id, dir_idx in all_group_ids:
        pool = students_by_dir.get(dir_idx, [])
        chosen = random.sample(pool, min(random.randint(8, 15), len(pool)))
        for s_id in chosen:
            await conn.execute(text("""
                INSERT INTO enrollments (id, student_id, group_id, enrolled_at, is_active)
                VALUES (:id, :s, :g, now() - interval '1 day' * :ago, true)
            """), {"id": uid(), "s": s_id, "g": g_id, "ago": random.randint(10, 90)})
            enroll_count += 1

    print(f"  ✓ {enroll_count} enrollments")

    # ══════════════════════════════════════════════════════════════════════════
    # LESSONS (current month — ~4-5 per group)
    # ══════════════════════════════════════════════════════════════════════════

    today = date.today()
    month_start = today.replace(day=1)
    lesson_count = 0

    for g_id, dir_idx in all_group_ids:
        # Pick a subject from same direction
        dir_subjects = [(sid, di) for sid, di in all_subject_ids if di == dir_idx]
        if not dir_subjects:
            continue
        subj_id = random.choice(dir_subjects)[0]
        t_id = random.choice(teacher_ids)
        r_id = random.choice(room_ids)

        cur = month_start
        while cur <= today + timedelta(days=14):
            if cur.isoweekday() in [1, 3, 5] and random.random() < 0.7:
                hour = random.choice([9, 10, 11, 14, 15, 16])
                scheduled = datetime(cur.year, cur.month, cur.day, hour, 0, tzinfo=timezone.utc)
                status = "completed" if cur < today else "scheduled"
                await conn.execute(text("""
                    INSERT INTO lessons (id, group_id, subject_id, teacher_id, room_id,
                                         scheduled_at, duration_minutes, status, is_online,
                                         topic, created_at, updated_at)
                    VALUES (:id, :gid, :sid, :tid, :rid,
                            :sched, :dur, :st, false,
                            :topic, now(), now())
                """), {
                    "id": uid(), "gid": g_id, "sid": subj_id, "tid": t_id, "rid": r_id,
                    "sched": scheduled, "dur": 90, "st": status,
                    "topic": f"Dars {lesson_count + 1}" if status == "completed" else None,
                })
                lesson_count += 1
            cur += timedelta(days=1)

    print(f"  ✓ {lesson_count} lessons")

    # ══════════════════════════════════════════════════════════════════════════
    # CRM
    # ══════════════════════════════════════════════════════════════════════════

    # Funnels
    funnel_it_id = uid()
    funnel_lang_id = uid()
    for fid, fname in [(funnel_it_id, "IT kurslar"), (funnel_lang_id, "Til kurslari")]:
        await conn.execute(text("""
            INSERT INTO funnels (id, name, is_archived, created_by, created_at, updated_at)
            VALUES (:id, :name, false, :by, now(), now())
        """), {"id": fid, "name": fname, "by": director_id})

    # Stages
    stages_it = []
    for i, (name, color, prob) in enumerate([
        ("Yangi", "#6366F1", 10), ("Aloqa o'rnatildi", "#3B82F6", 25),
        ("Sinov darsi", "#F59E0B", 50), ("Qaror kutilmoqda", "#10B981", 75),
        ("Shartnoma", "#22C55E", 90),
    ]):
        s_id = uid()
        stages_it.append(s_id)
        await conn.execute(text("""
            INSERT INTO stages (id, funnel_id, name, color, win_probability, "order")
            VALUES (:id, :fid, :name, :color, :prob, :ord)
        """), {"id": s_id, "fid": funnel_it_id, "name": name, "color": color, "prob": prob, "ord": i})

    stages_lang = []
    for i, (name, color, prob) in enumerate([
        ("Yangi", "#8B5CF6", 10), ("Konsultatsiya", "#EC4899", 40),
        ("Test", "#F59E0B", 60), ("Shartnoma", "#22C55E", 90),
    ]):
        s_id = uid()
        stages_lang.append(s_id)
        await conn.execute(text("""
            INSERT INTO stages (id, funnel_id, name, color, win_probability, "order")
            VALUES (:id, :fid, :name, :color, :prob, :ord)
        """), {"id": s_id, "fid": funnel_lang_id, "name": name, "color": color, "prob": prob, "ord": i})

    # Sources
    src_ids = []
    for sname, stype, fid in [
        ("Qo'lda kiritish", "manual", None),
        ("Veb-sayt", "landing", funnel_it_id),
        ("Telegram bot", "api", funnel_it_id),
        ("Instagram", "manual", None),
        ("Tavsiya", "manual", None),
    ]:
        s_id = uid()
        src_ids.append(s_id)
        await conn.execute(text("""
            INSERT INTO lead_sources (id, name, type, is_active, funnel_id, api_key, created_at)
            VALUES (:id, :name, :type, true, :fid, :key, now())
        """), {"id": s_id, "name": sname, "type": stype, "fid": fid,
               "key": uid() if stype in ("api", "landing") else None})

    # Contacts & Leads (40)
    sales_ids = [sales1_id, sales2_id, sales3_id]
    lead_count = 0
    for i in range(40):
        c_id = uid()
        name = random_name()
        phone = random_phone()
        await conn.execute(text("""
            INSERT INTO crm_contacts (id, full_name, phone, created_at, updated_at)
            VALUES (:id, :name, :phone, now(), now())
        """), {"id": c_id, "name": name, "phone": phone})

        is_lang = i >= 32
        fid = funnel_lang_id if is_lang else funnel_it_id
        stage_pool = stages_lang if is_lang else stages_it
        status = random.choices(["active", "won", "lost"], weights=[60, 25, 15])[0]

        await conn.execute(text("""
            INSERT INTO leads (id, full_name, phone, funnel_id, stage_id, source_id,
                               assigned_to, contact_id, status, custom_fields,
                               last_activity_at, created_at, updated_at)
            VALUES (:id, :name, :phone, :fid, :sid, :src,
                    :assigned, :cid, :status, '{}',
                    now() - interval '1 hour' * :hrs,
                    now() - interval '1 day' * :days, now())
        """), {
            "id": uid(), "name": name, "phone": phone,
            "fid": fid, "sid": random.choice(stage_pool),
            "src": random.choice(src_ids),
            "assigned": random.choice(sales_ids),
            "cid": c_id, "status": status,
            "hrs": random.randint(1, 72),
            "days": random.randint(0, 30),
        })
        lead_count += 1

    print(f"  ✓ CRM: 2 funnels, {lead_count} leads, {len(src_ids)} sources")

    # ══════════════════════════════════════════════════════════════════════════

    print()
    print("✅ Seed complete!")
    print()
    print("  Логины (пароль для всех: password123):")
    print("  ─────────────────────────────────────────────────────")
    print("  director@edu.uz       (director)")
    print("  mup1@edu.uz           (mup)")
    print("  mup2@edu.uz           (mup)")
    print("  sales1@edu.uz         (sales_manager)")
    print("  sales2@edu.uz         (sales_manager)")
    print("  sales3@edu.uz         (sales_manager)")
    print("  cashier@edu.uz        (cashier)")
    print("  teacher1..12@edu.uz   (teacher)")
    print("  student1..300@edu.uz  (student)")
    print("  ─────────────────────────────────────────────────────")
    print(f"  Данные: {len(dir_ids)} направлений, {len(all_subject_ids)} предметов,")
    print(f"          {len(all_group_ids)} групп, {len(student_ids)} студентов,")
    print(f"          {lesson_count} уроков, {lead_count} лидов")
    print("  ─────────────────────────────────────────────────────")
    print("  API docs: http://localhost:8000/docs")


async def main() -> None:
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    async with engine.begin() as conn:
        await seed(conn)
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
