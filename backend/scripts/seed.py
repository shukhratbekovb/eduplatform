"""
Seed script — заполняет базу демо-данными.

Запуск в Docker:
    docker cp scripts/seed.py eduplatform-api-1:/app/scripts/seed.py
    docker compose exec api bash -c "PYTHONPATH=/app python /app/scripts/seed.py"

Запуск локально:
    poetry run python scripts/seed.py
"""
import asyncio
import uuid
from datetime import date

import bcrypt
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

from src.config import settings


def hash_pw(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def uid() -> str:
    return str(uuid.uuid4())


async def seed(conn) -> None:
    # ── Users ──────────────────────────────────────────────────────────────────
    users = [
        (uid(), "director@edu.uz",  hash_pw("director123"), "Sardor Toshmatov",   "director"),
        (uid(), "sales1@edu.uz",    hash_pw("sales123"),    "Malika Yusupova",    "sales_manager"),
        (uid(), "sales2@edu.uz",    hash_pw("sales123"),    "Bobur Rahimov",      "sales_manager"),
        (uid(), "teacher1@edu.uz",  hash_pw("teacher123"),  "Nodira Karimova",    "teacher"),
        (uid(), "teacher2@edu.uz",  hash_pw("teacher123"),  "Jasur Mirzayev",     "teacher"),
        (uid(), "mup@edu.uz",       hash_pw("mup12345"),    "Dilnoza Abdullayeva","mup"),
        (uid(), "cashier@edu.uz",   hash_pw("cashier123"),  "Umid Xasanov",       "cashier"),
        (uid(), "student1@edu.uz",  hash_pw("student123"),  "Alisher Normatov",   "student"),
        (uid(), "student2@edu.uz",  hash_pw("student123"),  "Zulfiya Tursunova",  "student"),
        (uid(), "student3@edu.uz",  hash_pw("student123"),  "Kamron Nazarov",     "student"),
    ]
    user_ids = {}  # name -> id
    for u_id, email, pw, name, role in users:
        await conn.execute(text("""
            INSERT INTO users (id, email, password_hash, name, role, is_active, created_at, updated_at)
            VALUES (:id, :email, :pw, :name, :role, true, now(), now())
            ON CONFLICT (email) DO NOTHING
        """), {"id": u_id, "email": email, "pw": pw, "name": name, "role": role})
        user_ids[name] = u_id

    teacher1_id = user_ids["Nodira Karimova"]
    teacher2_id = user_ids["Jasur Mirzayev"]

    # ── Directions ─────────────────────────────────────────────────────────────
    dir_it_id   = uid()
    dir_lang_id = uid()
    await conn.execute(text("""
        INSERT INTO directions (id, name, is_active, created_at, updated_at)
        VALUES (:id, :name, true, now(), now())
    """), [{"id": dir_it_id, "name": "IT va Dasturlash"},
           {"id": dir_lang_id, "name": "Ingliz tili"}])

    # ── Subjects ───────────────────────────────────────────────────────────────
    subj_py_id = uid()
    subj_en_id = uid()
    await conn.execute(text("""
        INSERT INTO subjects (id, name, direction_id, teacher_id, is_active, created_at, updated_at)
        VALUES (:id, :name, :dir_id, :teacher_id, true, now(), now())
    """), [
        {"id": subj_py_id, "name": "Python darslari",    "dir_id": dir_it_id,   "teacher_id": teacher1_id},
        {"id": subj_en_id, "name": "English (Beginner)", "dir_id": dir_lang_id, "teacher_id": teacher2_id},
    ])

    # ── Rooms ──────────────────────────────────────────────────────────────────
    room1_id = uid()
    room2_id = uid()
    await conn.execute(text("""
        INSERT INTO rooms (id, name, capacity, is_active, created_at, updated_at)
        VALUES (:id, :name, :cap, true, now(), now())
    """), [
        {"id": room1_id, "name": "Xona 101", "cap": 15},
        {"id": room2_id, "name": "Xona 202", "cap": 20},
    ])

    # ── Groups ─────────────────────────────────────────────────────────────────
    group_py_id = uid()
    group_en_id = uid()
    await conn.execute(text("""
        INSERT INTO groups (id, name, subject_id, teacher_id, room_id,
                            schedule, max_students, price_per_month,
                            started_at, ended_at, is_active, created_at, updated_at)
        VALUES (:id, :name, :subj, :teacher, :room,
                :sched, :max_s, :price,
                :start, :end, true, now(), now())
    """), [
        {
            "id": group_py_id, "name": "Python-01",
            "subj": subj_py_id, "teacher": teacher1_id, "room": room1_id,
            "sched": '{"days":["Mon","Wed","Fri"],"time":"10:00"}',
            "max_s": 15, "price": 500000,
            "start": date(2026, 2, 1), "end": date(2026, 6, 30),
        },
        {
            "id": group_en_id, "name": "English-A1",
            "subj": subj_en_id, "teacher": teacher2_id, "room": room2_id,
            "sched": '{"days":["Tue","Thu"],"time":"14:00"}',
            "max_s": 20, "price": 400000,
            "start": date(2026, 2, 1), "end": date(2026, 6, 30),
        },
    ])

    # ── Students ───────────────────────────────────────────────────────────────
    student_data = [
        ("Alisher Normatov",  user_ids["Alisher Normatov"],  "STU-001", "+998901234501", dir_it_id),
        ("Zulfiya Tursunova", user_ids["Zulfiya Tursunova"],  "STU-002", "+998901234502", dir_it_id),
        ("Kamron Nazarov",    user_ids["Kamron Nazarov"],     "STU-003", "+998901234503", dir_lang_id),
    ]
    student_ids = {}
    for name, u_id, code, phone, dir_id in student_data:
        s_id = uid()
        student_ids[name] = s_id
        await conn.execute(text("""
            INSERT INTO students (id, user_id, student_code, phone, direction_id,
                                  gpa, attendance_percent, risk_level, stars, crystals, coins,
                                  badge_level, created_at, updated_at)
            VALUES (:id, :user_id, :code, :phone, :dir_id,
                    0, 100, 'low', 0, 0, 0,
                    'bronze', now(), now())
        """), {"id": s_id, "user_id": u_id, "code": code, "phone": phone, "dir_id": dir_id})

    # ── Enrollments ────────────────────────────────────────────────────────────
    enrollments = [
        (student_ids["Alisher Normatov"],  group_py_id),
        (student_ids["Zulfiya Tursunova"], group_py_id),
        (student_ids["Kamron Nazarov"],    group_en_id),
    ]
    for s_id, g_id in enrollments:
        await conn.execute(text("""
            INSERT INTO enrollments (id, student_id, group_id, enrolled_at, is_active)
            VALUES (:id, :s, :g, now(), true)
        """), {"id": uid(), "s": s_id, "g": g_id})

    print("✓ Seed complete!")
    print()
    print("  Логины:")
    print("  ─────────────────────────────────────────────────")
    print("  director@edu.uz     / director123  (director)")
    print("  sales1@edu.uz       / sales123     (sales_manager)")
    print("  sales2@edu.uz       / sales123     (sales_manager)")
    print("  teacher1@edu.uz     / teacher123   (teacher — Python)")
    print("  teacher2@edu.uz     / teacher123   (teacher — English)")
    print("  mup@edu.uz          / mup12345     (mup)")
    print("  cashier@edu.uz      / cashier123   (cashier)")
    print("  student1@edu.uz     / student123   (student)")
    print("  student2@edu.uz     / student123   (student)")
    print("  student3@edu.uz     / student123   (student)")
    print("  ─────────────────────────────────────────────────")
    print("  API docs: http://localhost:8000/docs")


async def main() -> None:
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    async with engine.begin() as conn:
        await seed(conn)
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
