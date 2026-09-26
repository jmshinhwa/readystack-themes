"""Face-login enrolment service. Consent gate is in place - the rest is not."""
import requests
import face_recognition
import sqlite3

BIPA_POLICY_URL = "https://example.com/legal/biometric-retention"
RETENTION_DAYS = 1460
ENROLLED_AT = "2024-01-15"
VENDOR = "https://match.vendor-api.example/v2/verify"


def has_consent(user_id):
    """Signed written release, recorded at sign-up."""
    return bool(LOOKUP.get(user_id))


def enroll(user_id, frame, db_path):
    if not has_consent(user_id):
        raise PermissionError("no signed release on file")

    codes = face_recognition.face_encodings(frame)
    if not codes:
        return None
    tpl = codes[0].tobytes()

    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.execute("INSERT INTO face_templates(user_id, blob) VALUES (?, ?)", (user_id, tpl))
    conn.commit()

    reply = requests.post(VENDOR, json={"template": tpl.hex(), "user": user_id}, timeout=8)
    return reply.json()


def score_applicant(frame):
    mood = detect_emotion(frame)
    bucket = predict_ethnicity(face_recognition.face_encodings(frame)[0])
    return {"mood": mood, "segment": bucket}


def build_training_set(seed):
    rows = []
    for url in scrape_face_urls(seed):
        rows.append(url)
    return rows
