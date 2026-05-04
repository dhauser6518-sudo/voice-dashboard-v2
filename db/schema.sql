-- Voice Dashboard Schema
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS lead_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT,
  first_name TEXT,
  last_name TEXT,
  phone TEXT NOT NULL,
  email TEXT,
  street_address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  dob DATE,
  gender TEXT,
  existing_carrier TEXT,
  current_coverage NUMERIC,
  current_premium NUMERIC,
  policy_effective_date DATE,
  status TEXT DEFAULT 'pending',
  dnc BOOLEAN DEFAULT false,
  call_count INTEGER DEFAULT 0,
  last_called_at TIMESTAMPTZ,
  notes TEXT,
  list_id UUID REFERENCES lead_lists(id),
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leads_phone ON leads(phone);
CREATE INDEX IF NOT EXISTS idx_leads_state ON leads(state);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_list ON leads(list_id);

CREATE TABLE IF NOT EXISTS call_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID REFERENCES leads(id),
  call_control_id TEXT,
  phone TEXT,
  direction TEXT,
  status TEXT,
  disposition TEXT,
  duration_seconds INTEGER,
  recording_url TEXT,
  transcript JSONB,
  ai_responses JSONB,
  application_data JSONB,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_call_logs_lead ON call_logs(lead_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_started ON call_logs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_call_logs_disposition ON call_logs(disposition);

-- Voice Agents (bots) — each bot is a unique agent configuration (voice, script, pitch, speed)
-- Base table already exists in Supabase with: id, name, prompt_id, voice_id, product_type, is_active, created_at
-- Run the ALTER TABLE migration below to add voice config columns for A/B testing:
--
-- ALTER TABLE voice_agents
--   ADD COLUMN IF NOT EXISTS voice_name TEXT,
--   ADD COLUMN IF NOT EXISTS model TEXT DEFAULT 'claude-sonnet-4-6',
--   ADD COLUMN IF NOT EXISTS stability NUMERIC DEFAULT 0.55,
--   ADD COLUMN IF NOT EXISTS similarity_boost NUMERIC DEFAULT 0.85,
--   ADD COLUMN IF NOT EXISTS style NUMERIC DEFAULT 0.25,
--   ADD COLUMN IF NOT EXISTS speed NUMERIC DEFAULT 1.15,
--   ADD COLUMN IF NOT EXISTS phone_number TEXT,
--   ADD COLUMN IF NOT EXISTS max_concurrent INTEGER DEFAULT 5,
--   ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
