
export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: 'lawyer' | 'client' | 'court' | 'admin';
  specialization?: string;
  bar_number?: string;
  created_at: string;
  updated_at: string;
  years_of_experience?: number;
  education?: string[];
  languages?: string[];
  avatar_url?: string;
  hourly_rate?: number;
  contact_number?: string;
  office_address?: string;
  court_name?: string;
  jurisdiction?: string;
  court_type?: string;
}

export interface Case {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'active' | 'closed';
  lawyer_id: string;
  client_id: string;
  case_type?: string;
  practice_area?: string;
  created_at: string;
  updated_at: string;
  lawyer?: Profile;
  client?: Profile;
}

export interface CourtSession {
  id: string;
  case_id: string;
  scheduled_date: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | string;
  virtual_meeting_link?: string;
  recording_url?: string;
  meeting_platform?: string;
  meeting_password?: string;
  notes?: string;
  created_at: string;
  updated_at?: string;
  case?: {
    title: string;
    lawyer?: Profile;
    client?: Profile;
    case_type?: string;
    practice_area?: string;
  };
  is_virtual?: boolean;
  is_custom_meeting?: boolean;
  custom_meeting_id?: string;
  custom_meeting_token?: string;
  host_id?: string;
}

export interface CourtLawyer {
  id: string;
  court_id: string;
  lawyer_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
}

export interface CaseDocument {
  id: string;
  case_id: string;
  file_name: string;
  file_path: string;
  file_type?: string;
  file_size?: number;
  uploaded_by?: string;
  created_at: string;
}
