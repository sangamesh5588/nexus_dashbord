export type LeadStatus = 'active' | 'replied' | 'unsubscribed' | 'spam';

export type LeadTab = 'all' | 'step1' | 'step2' | 'step3' | 'done' | 'spam';

export type LeadWithStep = Lead & { max_step: number | null };

export type EmailLogStatus = 'sent' | 'failed' | 'replied';

export type Lead = {
  id: string;
  email: string;
  name: string | null;
  company: string | null;
  custom_note: string | null;
  status: LeadStatus;
  upload_batch: string | null;
  created_at: string;
  updated_at: string;
};

export type EmailCampaign = {
  id: string;
  name: string;
  step: 1 | 2 | 3;
  subject: string;
  body: string;
  delay_days: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type EmailLog = {
  id: string;
  lead_id: string;
  campaign_id: string | null;
  step: number;
  subject: string;
  body: string;
  status: EmailLogStatus;
  gmail_thread_id: string | null;
  gmail_message_id: string | null;
  error_message: string | null;
  sent_at: string;
};

export type AIProvider = 'anthropic' | 'openai' | 'gemini';

export type EmailSettings = {
  user_id: string;
  gmail_address: string | null;
  gmail_app_password: string | null;
  sender_display_name: string | null;
  ai_persona_bio: string | null;
  gmail_oauth_access_token: string | null;
  gmail_oauth_refresh_token: string | null;
  gmail_oauth_token_expiry: string | null;
  is_gmail_connected?: boolean; // virtual — computed by the API layer
  // AI provider config (user brings their own key)
  ai_provider: AIProvider | null;
  ai_api_key: string | null;
  // Profile fields (used to auto-generate bio)
  profile_role: string | null;
  profile_company: string | null;
  updated_at: string;
};

export type ParsedLead = {
  email: string;
  name?: string;
  company?: string;
  custom_note?: string;
};

export type EmailStats = {
  totalLeads: number;
  activeLeads: number;
  repliedLeads: number;
  totalSent: number;
  // Pipeline breakdown
  step1Pending: number;   // never emailed
  step2Pending: number;   // step 1 sent, waiting for step 2
  step3Pending: number;   // step 2 sent, waiting for step 3
  allStepsDone: number;   // 3 emails sent, no reply
  sentToday: number;      // emails sent today (for daily cap tracking)
};

export type SequencerResult = {
  sent: number;
  skipped: number;
  errors: string[];
};

export type ReplyDetectionResult = {
  repliesFound: number;
  aiRepliesSent: number;
  errors: string[];
};

export type SendEmailOpts = {
  to: string;
  subject: string;
  body: string;
  imageUrl?: string;
  lead: Lead;
  campaignId?: string;
  step: number;
  settings: EmailSettings;
  userId: string;
};

export type SendResult = {
  success: boolean;
  logId: string;
  threadId?: string;
  error?: string;
};

export type MessageTemplate = {
  id: string;
  user_id: string;
  name: string;
  step: 1 | 2 | 3;
  subject: string;
  body: string;
  is_default: boolean;
  image_url: string | null;
  image_name: string | null;
  created_at: string;
  updated_at: string;
};
