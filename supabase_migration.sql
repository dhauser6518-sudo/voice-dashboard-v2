-- Run this in Supabase SQL Editor (https://supabase.com/dashboard → SQL Editor)
-- Creates all tables needed for the Cartesia-integrated voice dashboard

-- Lead lists (groups of uploaded leads)
CREATE TABLE IF NOT EXISTS lead_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Voice leads (individual lead records)
CREATE TABLE IF NOT EXISTS voice_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT UNIQUE NOT NULL,
  full_name TEXT,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  street_address TEXT,
  city TEXT,
  state TEXT,
  zip TEXT,
  dob TEXT,
  age TEXT,
  gender TEXT,
  existing_carrier TEXT,
  current_coverage TEXT,
  current_premium TEXT,
  beneficiary TEXT,
  source TEXT DEFAULT 'csv_upload',
  status TEXT DEFAULT 'new',
  dnc BOOLEAN DEFAULT false,
  lead_list_id UUID REFERENCES lead_lists(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- User API keys (encrypted)
CREATE TABLE IF NOT EXISTS user_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL,
  cartesia_api_key JSONB,
  anthropic_api_key JSONB,
  openai_api_key JSONB,
  elevenlabs_api_key JSONB,
  deepgram_api_key JSONB,
  playht_api_key JSONB,
  telnyx_api_key JSONB,
  twilio_auth_token JSONB,
  signalwire_api_token JSONB,
  telnyx_connection_id TEXT,
  telnyx_phone_number TEXT,
  twilio_account_sid TEXT,
  twilio_phone_number TEXT,
  signalwire_project_id TEXT,
  signalwire_space_url TEXT,
  signalwire_phone_number TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Campaigns (batch call jobs)
CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  lead_list_id UUID REFERENCES lead_lists(id),
  status TEXT DEFAULT 'draft',
  total_leads INT DEFAULT 0,
  calls_made INT DEFAULT 0,
  calls_succeeded INT DEFAULT 0,
  calls_failed INT DEFAULT 0,
  created_by UUID,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Campaign calls (individual call records linked to campaigns)
CREATE TABLE IF NOT EXISTS campaign_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES campaigns(id),
  voice_lead_id UUID REFERENCES voice_leads(id),
  agent_id TEXT NOT NULL,
  agent_call_id TEXT,
  call_sid TEXT,
  phone TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  error TEXT,
  duration_seconds INT,
  outcome TEXT,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Voice scripts
CREATE TABLE IF NOT EXISTS voice_scripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  product_type TEXT DEFAULT 'final_expense',
  content TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Dashboard invites
CREATE TABLE IF NOT EXISTS dashboard_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  email TEXT,
  created_by UUID,
  expires_at TIMESTAMPTZ,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS but allow service role full access
ALTER TABLE lead_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_scripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_invites ENABLE ROW LEVEL SECURITY;

-- Service role bypass policies
CREATE POLICY "Service role full access" ON lead_lists FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON voice_leads FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON user_api_keys FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON campaigns FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON campaign_calls FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON voice_scripts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON dashboard_invites FOR ALL USING (true) WITH CHECK (true);
