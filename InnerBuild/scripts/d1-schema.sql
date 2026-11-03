-- AI Factory — Cloudflare D1 schema (source unique, SQLite)
-- Appliquer via : wrangler d1 execute aifactory --file=scripts/d1-schema.sql
-- ou via API D1. Prix unique : 4000 F CFA.

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'learner',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL DEFAULT '',
  level TEXT NOT NULL DEFAULT 'débutant',
  goal TEXT NOT NULL DEFAULT '',
  onboarded INTEGER NOT NULL DEFAULT 0,
  access_status TEXT NOT NULL DEFAULT 'free',
  avatar_url TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS user_roles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  UNIQUE(user_id, role)
);

CREATE TABLE IF NOT EXISTS courses (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  position INTEGER NOT NULL DEFAULT 0,
  published INTEGER NOT NULL DEFAULT 1,
  image_url TEXT NOT NULL DEFAULT '',
  pdf_url TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS course_modules (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL,
  title TEXT NOT NULL,
  step TEXT NOT NULL DEFAULT '',
  position INTEGER NOT NULL DEFAULT 0,
  free INTEGER NOT NULL DEFAULT 0,
  published INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS lessons (
  id TEXT PRIMARY KEY,
  module_id TEXT NOT NULL,
  title TEXT NOT NULL,
  minutes INTEGER NOT NULL DEFAULT 10,
  body TEXT NOT NULL DEFAULT '',
  task TEXT NOT NULL DEFAULT '',
  file_path TEXT NOT NULL DEFAULT '',
  image_path TEXT NOT NULL DEFAULT '',
  kind TEXT NOT NULL DEFAULT 'text',
  position INTEGER NOT NULL DEFAULT 0,
  published INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS lesson_progress (
  user_id TEXT NOT NULL,
  lesson_id TEXT NOT NULL,
  completed_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, lesson_id)
);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_user ON lesson_progress(user_id);

CREATE TABLE IF NOT EXISTS skill_lesson_progress (
  user_id TEXT NOT NULL,
  lesson_id TEXT NOT NULL,
  completed_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, lesson_id)
);

CREATE TABLE IF NOT EXISTS skill_progress (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  skill_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'in_progress',
  score REAL NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS skill_exercises (
  id TEXT PRIMARY KEY,
  skill_id TEXT NOT NULL,
  title TEXT NOT NULL,
  instructions TEXT NOT NULL DEFAULT '',
  position INTEGER NOT NULL DEFAULT 0,
  published INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS submissions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  repo_url TEXT NOT NULL DEFAULT '',
  demo_url TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  feedback TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  grade REAL,
  course_id TEXT,
  module_id TEXT,
  lesson_id TEXT,
  exercise_id TEXT,
  skill_id TEXT,
  skill_exercise_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_submissions_user ON submissions(user_id);

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  reference TEXT NOT NULL UNIQUE,
  amount REAL NOT NULL DEFAULT 4000,
  status TEXT NOT NULL DEFAULT 'completed',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id);

CREATE TABLE IF NOT EXISTS quiz_questions (
  id TEXT PRIMARY KEY,
  module_id TEXT NOT NULL,
  question TEXT NOT NULL,
  choices TEXT NOT NULL DEFAULT '[]',
  correct INTEGER NOT NULL DEFAULT 0,
  answers TEXT NOT NULL DEFAULT '[]',
  allow_multiple INTEGER NOT NULL DEFAULT 0,
  explanation TEXT NOT NULL DEFAULT '',
  points INTEGER NOT NULL DEFAULT 10,
  position INTEGER NOT NULL DEFAULT 0,
  published INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS exercises (
  id TEXT PRIMARY KEY,
  course_id TEXT,
  module_id TEXT,
  lesson_id TEXT,
  title TEXT NOT NULL,
  instructions TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL DEFAULT 'projet',
  points INTEGER NOT NULL DEFAULT 10,
  options TEXT,
  solution_criteria TEXT NOT NULL DEFAULT '',
  position INTEGER NOT NULL DEFAULT 0,
  published INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS course_exams (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  passing_score INTEGER NOT NULL DEFAULT 70,
  questions TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS announcements (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  kind TEXT NOT NULL DEFAULT 'announcement',
  pinned INTEGER NOT NULL DEFAULT 0,
  published INTEGER NOT NULL DEFAULT 1,
  event_at TEXT,
  video_url TEXT NOT NULL DEFAULT '',
  pdf_path TEXT NOT NULL DEFAULT '',
  image_path TEXT NOT NULL DEFAULT '',
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  link TEXT NOT NULL DEFAULT '',
  read INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);

CREATE TABLE IF NOT EXISTS forum_threads (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  author_name TEXT NOT NULL DEFAULT 'Apprenant',
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  topic TEXT NOT NULL DEFAULT 'Général',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS forum_posts (
  id TEXT PRIMARY KEY,
  thread_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  author_name TEXT NOT NULL DEFAULT 'Apprenant',
  body TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_forum_posts_thread ON forum_posts(thread_id);

CREATE TABLE IF NOT EXISTS coach_questions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  lesson_id TEXT NOT NULL DEFAULT '',
  lesson_title TEXT NOT NULL DEFAULT '',
  question TEXT NOT NULL,
  answer TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL DEFAULT 'AI Coach',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  actor_id TEXT,
  action TEXT NOT NULL,
  target TEXT NOT NULL DEFAULT '',
  details TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS auth_tokens (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL,
  metadata TEXT NOT NULL DEFAULT '{}',
  expires_at TEXT NOT NULL,
  used_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS file_metadata (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  r2_key TEXT NOT NULL,
  public_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL DEFAULT 'other',
  size_bytes INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS challenges (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT,
  description TEXT NOT NULL DEFAULT '',
  brief_content TEXT NOT NULL DEFAULT '',
  objectives TEXT NOT NULL DEFAULT '',
  target_audience TEXT NOT NULL DEFAULT '',
  solution_criteria TEXT NOT NULL DEFAULT '',
  prize_pool TEXT NOT NULL DEFAULT '500 000 FCFA',
  fee_amount INTEGER NOT NULL DEFAULT 0,
  duration_days INTEGER NOT NULL DEFAULT 7,
  max_participants INTEGER,
  status TEXT NOT NULL DEFAULT 'draft',
  start_date TEXT,
  end_date TEXT,
  cover_image TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS challenge_registrations (
  id TEXT PRIMARY KEY,
  challenge_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'accepted',
  motivation TEXT NOT NULL DEFAULT '',
  reviewed_by TEXT,
  reviewed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(challenge_id, user_id)
);

CREATE TABLE IF NOT EXISTS challenge_submissions (
  id TEXT PRIMARY KEY,
  challenge_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  repo_url TEXT NOT NULL DEFAULT '',
  demo_url TEXT NOT NULL DEFAULT '',
  r2_file_url TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'submitted',
  submitted_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(challenge_id, user_id)
);

CREATE TABLE IF NOT EXISTS challenge_evaluations (
  id TEXT PRIMARY KEY,
  challenge_id TEXT NOT NULL,
  submission_id TEXT NOT NULL,
  jury_id TEXT,
  jury_name TEXT NOT NULL DEFAULT 'Jury Expert',
  score REAL NOT NULL DEFAULT 0,
  score_ui REAL NOT NULL DEFAULT 0,
  score_architecture REAL NOT NULL DEFAULT 0,
  score_cahier_charges REAL NOT NULL DEFAULT 0,
  score_delivery REAL NOT NULL DEFAULT 0,
  feedback TEXT NOT NULL DEFAULT '',
  strengths TEXT NOT NULL DEFAULT '',
  improvements TEXT NOT NULL DEFAULT '',
  evaluated_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS challenge_jury (
  id TEXT PRIMARY KEY,
  challenge_id TEXT,
  user_id TEXT,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'expert',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS challenge_results (
  id TEXT PRIMARY KEY,
  challenge_id TEXT NOT NULL,
  submission_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  final_score REAL NOT NULL,
  rank INTEGER NOT NULL,
  award TEXT NOT NULL DEFAULT '',
  is_published INTEGER NOT NULL DEFAULT 1,
  published_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS challenge_daily_progress (
  id TEXT PRIMARY KEY,
  challenge_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  day_number INTEGER NOT NULL,
  progress_date TEXT NOT NULL DEFAULT (date('now')),
  content TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS course_exam_attempts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  course_id TEXT NOT NULL,
  score REAL NOT NULL DEFAULT 0,
  passed INTEGER NOT NULL DEFAULT 0,
  answers TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS skills_templates (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  tags TEXT NOT NULL DEFAULT '[]',
  published INTEGER NOT NULL DEFAULT 1,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS certificates (
  id                      TEXT PRIMARY KEY,
  user_id                 TEXT NOT NULL,
  recipient_name          TEXT NOT NULL,
  recipient_email         TEXT NOT NULL,
  type                    TEXT NOT NULL, -- 'formation' | 'hackathon'
  template_id             TEXT NOT NULL,
  certifigo_id            TEXT,
  certifigo_campaign_id   TEXT,
  certifigo_job_id        TEXT,
  status                  TEXT NOT NULL DEFAULT 'processing', -- 'draft' | 'processing' | 'completed' | 'failed'
  verification_url        TEXT,
  pdf_url                 TEXT,
  thumbnail_url           TEXT,
  signature               TEXT,
  issued_at               TEXT,
  created_at              TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_certificates_user ON certificates(user_id);
CREATE INDEX IF NOT EXISTS idx_certificates_type ON certificates(type);

