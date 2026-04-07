-- ============================================================
-- Sarkie Database Schema
-- ============================================================

-- Users
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(255) NOT NULL,
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  verified      BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMP DEFAULT NOW()
);

-- Email Verification Codes
CREATE TABLE IF NOT EXISTS verification_codes (
  email      VARCHAR(255) PRIMARY KEY,
  code       VARCHAR(10) NOT NULL,
  expires_at TIMESTAMP NOT NULL
);

-- Supplements
CREATE TABLE IF NOT EXISTS supplements (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name       VARCHAR(255) NOT NULL,
  dosage     VARCHAR(100),
  frequency  VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Supplement Effects
CREATE TABLE IF NOT EXISTS supplement_effects (
  id                 SERIAL PRIMARY KEY,
  user_id            INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  effect_type        VARCHAR(50) NOT NULL CHECK (effect_type IN ('positive', 'negative')),
  effect_description TEXT NOT NULL,
  timestamp          TIMESTAMP DEFAULT NOW()
);

-- Conversations (Chat History)
CREATE TABLE IF NOT EXISTS conversations (
  id        SERIAL PRIMARY KEY,
  user_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message   TEXT NOT NULL,
  sender    VARCHAR(10) NOT NULL CHECK (sender IN ('user', 'ai')),
  timestamp TIMESTAMP DEFAULT NOW()
);

-- Mood Scores
CREATE TABLE IF NOT EXISTS mood_scores (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  score      INTEGER NOT NULL CHECK (score >= 1 AND score <= 10),
  date       DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (user_id, date)
);
