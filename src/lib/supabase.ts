import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Doctor = {
  id: string;
  name: string;
  department: string | null;
  specialty: string | null;
  created_at: string;
};

export type Signature = {
  id: string;
  doctor_id: string;
  image_url: string;
  notes: string | null;
  created_at: string;
};

export type ScanHistory = {
  id: string;
  scanned_image_url: string | null;
  identified_doctor_id: string | null;
  confidence_score: number | null;
  notes: string | null;
  created_at: string;
};