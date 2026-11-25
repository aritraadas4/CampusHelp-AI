import sqlite3
from datetime import datetime
from typing import List, Dict, Any, Optional
import bcrypt
from backend.config import DB_PATH

def get_db_connection() -> sqlite3.Connection:
    """Returns a SQLite connection with dict-like row access and WAL mode for concurrency."""
    conn = sqlite3.connect(str(DB_PATH), timeout=20.0)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode = WAL;")
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn

def init_db():
    """
    Safely integrates with existing database:
    1. Preserves existing 'complaints' table and all historical rows.
    2. Adds missing columns safely without destroying data.
    3. Populates ticket IDs for historical records.
    4. Creates 'users' table and seeds default role accounts.
    """
    conn = get_db_connection()
    cur = conn.cursor()

    try:
        # Ensure the complaints table exists (for fresh databases / test DBs).
        # In production the table already exists; this is a no-op there.
        cur.execute("""
            CREATE TABLE IF NOT EXISTS complaints (
                id           INTEGER PRIMARY KEY AUTOINCREMENT,
                student_name TEXT,
                complaint    TEXT,
                category     TEXT,
                department   TEXT,
                confidence   REAL,
                priority     TEXT DEFAULT 'Normal',
                status       TEXT DEFAULT 'Pending',
                date         TEXT
            );
        """)

        # Check existing columns in complaints
        cur.execute("PRAGMA table_info(complaints);")
        existing_cols = {col["name"] for col in cur.fetchall()}

        # New columns to safely add if they do not already exist
        new_columns = [
            ("ticket_id", "TEXT DEFAULT ''"),
            ("student_email", "TEXT DEFAULT ''"),
            ("location", "TEXT DEFAULT 'Main Campus'"),
            ("urgency", "TEXT DEFAULT 'Medium'"),
            ("attachment_url", "TEXT DEFAULT ''"),
            ("admin_notes", "TEXT DEFAULT ''"),
            ("assigned_to", "TEXT DEFAULT ''"),
            ("updated_at", "TEXT DEFAULT ''")
        ]

        for col_name, col_def in new_columns:
            if col_name not in existing_cols:
                cur.execute(f"ALTER TABLE complaints ADD COLUMN {col_name} {col_def};")

        # Ensure historical records have valid ticket_ids and urgency
        cur.execute("SELECT id, priority, ticket_id, urgency, date, updated_at FROM complaints;")
        rows = cur.fetchall()
        for row in rows:
            cid = row["id"]
            ticket = row["ticket_id"]
            urgency = row["urgency"]
            priority = row["priority"] or ""
            date_str = row["date"] or datetime.now().strftime("%Y-%m-%d %H:%M:%S")

            updates = []
            params = []

            if not ticket:
                updates.append("ticket_id = ?")
                params.append(f"CMP-{1000 + cid}")

            if not urgency or urgency == "Medium":
                if "URGENT" in priority.upper():
                    updates.append("urgency = ?")
                    params.append("Urgent")
                elif "HIGH" in priority.upper():
                    updates.append("urgency = ?")
                    params.append("High")

            if not row["updated_at"]:
                updates.append("updated_at = ?")
                params.append(date_str)

            if updates:
                params.append(cid)
                cur.execute(
                    f"UPDATE complaints SET {', '.join(updates)} WHERE id = ?;",
                    tuple(params)
                )

        # Create users table for authentication and RBAC
        cur.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                full_name TEXT NOT NULL,
                role TEXT NOT NULL,
                department TEXT,
                created_at TEXT NOT NULL
            );
        """)

        # Seed initial system accounts if none exist
        cur.execute("SELECT COUNT(*) as count FROM users;")
        user_count = cur.fetchone()["count"]

        if user_count == 0:
            def hash_pw(pw: str) -> str:
                return bcrypt.hashpw(pw.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

            seed_users = [
                ("admin@campus.edu", hash_pw("Admin@123"), "System Administrator", "admin", None),
                ("it.staff@campus.edu", hash_pw("Staff@123"), "IT Staff Specialist", "staff", "IT Department"),
                ("electrical.staff@campus.edu", hash_pw("Staff@123"), "Electrical Supervisor", "staff", "Electrical Department"),
                ("plumbing.staff@campus.edu", hash_pw("Staff@123"), "Plumbing Supervisor", "staff", "Plumbing Department"),
                ("maintenance.staff@campus.edu", hash_pw("Staff@123"), "Maintenance Supervisor", "staff", "Maintenance Department"),
                ("housekeeping.staff@campus.edu", hash_pw("Staff@123"), "Housekeeping Supervisor", "staff", "Housekeeping"),
                ("student@campus.edu", hash_pw("Student@123"), "Jane Doe (Student)", "student", None),
            ]

            cur.executemany("""
                INSERT INTO users (email, password_hash, full_name, role, department, created_at)
                VALUES (?, ?, ?, ?, ?, datetime('now'));
            """, seed_users)

        conn.commit()
    finally:
        conn.close()

# Database Query Utilities
def get_complaint_by_id(complaint_id: int) -> Optional[Dict[str, Any]]:
    conn = get_db_connection()
    try:
        cur = conn.cursor()
        cur.execute("SELECT * FROM complaints WHERE id = ?;", (complaint_id,))
        row = cur.fetchone()
        return dict(row) if row else None
    finally:
        conn.close()

def get_complaint_by_ticket_id(ticket_id: str) -> Optional[Dict[str, Any]]:
    conn = get_db_connection()
    try:
        cur = conn.cursor()
        cur.execute("SELECT * FROM complaints WHERE ticket_id = ? OR id = ?;", (ticket_id, ticket_id))
        row = cur.fetchone()
        return dict(row) if row else None
    finally:
        conn.close()

def list_complaints(
    department: Optional[str] = None,
    status: Optional[str] = None,
    urgency: Optional[str] = None,
    review_required: Optional[bool] = None,
    student_email: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 100,
    offset: int = 0
) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    try:
        cur = conn.cursor()
        query = "SELECT * FROM complaints WHERE 1=1"
        params = []

        if department:
            query += " AND department = ?"
            params.append(department)

        if status:
            query += " AND status = ?"
            params.append(status)

        if urgency:
            query += " AND urgency = ?"
            params.append(urgency)

        if review_required is not None:
            if review_required:
                query += " AND confidence < 40.0"
            else:
                query += " AND confidence >= 40.0"

        if student_email:
            query += " AND student_email = ?"
            params.append(student_email)

        if search:
            search_param = f"%{search}%"
            query += " AND (complaint LIKE ? OR student_name LIKE ? OR ticket_id LIKE ? OR location LIKE ?)"
            params.extend([search_param, search_param, search_param, search_param])

        query += " ORDER BY id DESC LIMIT ? OFFSET ?"
        params.extend([limit, offset])

        cur.execute(query, tuple(params))
        rows = cur.fetchall()
        return [dict(row) for row in rows]
    finally:
        conn.close()

def create_complaint_record(data: Dict[str, Any]) -> Dict[str, Any]:
    conn = get_db_connection()
    try:
        cur = conn.cursor()
        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        cur.execute("""
            INSERT INTO complaints (
                student_name, complaint, category, department,
                confidence, priority, status, date,
                ticket_id, student_email, location, urgency,
                attachment_url, admin_notes, assigned_to, updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        """, (
            data.get("student_name", "Anonymous"),
            data["complaint"],
            data["category"],
            data["department"],
            float(data.get("confidence", 0.0)),
            data.get("priority", "Normal"),
            data.get("status", "Pending"),
            data.get("date", now_str),
            "", # placeholder for ticket_id
            data.get("student_email", ""),
            data.get("location", "Main Campus"),
            data.get("urgency", "Medium"),
            data.get("attachment_url", ""),
            data.get("admin_notes", ""),
            data.get("assigned_to", ""),
            now_str
        ))
        complaint_id = cur.lastrowid
        ticket_id = f"CMP-{1000 + complaint_id}"

        cur.execute("UPDATE complaints SET ticket_id = ? WHERE id = ?;", (ticket_id, complaint_id))
        conn.commit()

        cur.execute("SELECT * FROM complaints WHERE id = ?;", (complaint_id,))
        return dict(cur.fetchone())
    finally:
        conn.close()

def update_complaint_record(complaint_id: int, updates: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    conn = get_db_connection()
    try:
        cur = conn.cursor()
        allowed_fields = [
            "status", "department", "category", "urgency", "priority",
            "admin_notes", "assigned_to", "location"
        ]

        fields_to_update = []
        params = []
        for key in allowed_fields:
            if key in updates and updates[key] is not None:
                fields_to_update.append(f"{key} = ?")
                params.append(updates[key])

        if not fields_to_update:
            return get_complaint_by_id(complaint_id)

        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        fields_to_update.append("updated_at = ?")
        params.append(now_str)

        params.append(complaint_id)
        cur.execute(
            f"UPDATE complaints SET {', '.join(fields_to_update)} WHERE id = ?;",
            tuple(params)
        )
        conn.commit()

        return get_complaint_by_id(complaint_id)
    finally:
        conn.close()

def get_analytics_metrics() -> Dict[str, Any]:
    conn = get_db_connection()
    try:
        cur = conn.cursor()
        cur.execute("SELECT COUNT(*) as total FROM complaints;")
        total = cur.fetchone()["total"]

        cur.execute("SELECT status, COUNT(*) as count FROM complaints GROUP BY status;")
        status_counts = {row["status"]: row["count"] for row in cur.fetchall()}

        cur.execute("SELECT category, COUNT(*) as count FROM complaints GROUP BY category;")
        category_counts = {row["category"]: row["count"] for row in cur.fetchall()}

        cur.execute("SELECT department, COUNT(*) as count FROM complaints GROUP BY department;")
        department_counts = {row["department"]: row["count"] for row in cur.fetchall()}

        cur.execute("SELECT urgency, COUNT(*) as count FROM complaints GROUP BY urgency;")
        urgency_counts = {row["urgency"]: row["count"] for row in cur.fetchall()}

        cur.execute("SELECT COUNT(*) as review_count FROM complaints WHERE confidence < 40.0;")
        review_count = cur.fetchone()["review_count"]

        cur.execute("SELECT AVG(confidence) as avg_conf FROM complaints;")
        avg_conf = cur.fetchone()["avg_conf"] or 0.0

        return {
            "total_complaints": total,
            "status_breakdown": status_counts,
            "category_breakdown": category_counts,
            "department_breakdown": department_counts,
            "urgency_breakdown": urgency_counts,
            "needs_human_review_count": review_count,
            "average_confidence": round(float(avg_conf), 2)
        }
    finally:
        conn.close()

def get_user_by_email(email: str) -> Optional[Dict[str, Any]]:
    conn = get_db_connection()
    try:
        cur = conn.cursor()
        cur.execute("SELECT * FROM users WHERE LOWER(email) = LOWER(?);", (email.strip(),))
        row = cur.fetchone()
        return dict(row) if row else None
    finally:
        conn.close()

def get_user_by_id(user_id: int) -> Optional[Dict[str, Any]]:
    conn = get_db_connection()
    try:
        cur = conn.cursor()
        cur.execute("SELECT * FROM users WHERE id = ?;", (user_id,))
        row = cur.fetchone()
        return dict(row) if row else None
    finally:
        conn.close()

def create_user_record(email: str, password_hash: str, full_name: str, role: str, department: Optional[str] = None) -> Dict[str, Any]:
    conn = get_db_connection()
    try:
        cur = conn.cursor()
        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        cur.execute("""
            INSERT INTO users (email, password_hash, full_name, role, department, created_at)
            VALUES (?, ?, ?, ?, ?, ?);
        """, (email.strip().lower(), password_hash, full_name.strip(), role, department, now_str))
        conn.commit()
        user_id = cur.lastrowid
        cur.execute("SELECT id, email, full_name, role, department, created_at FROM users WHERE id = ?;", (user_id,))
        return dict(cur.fetchone())
    finally:
        conn.close()
