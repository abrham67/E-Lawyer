export type Role = 'client' | 'lawyer' | 'court' | 'admin' | string;

export interface User {
  id: string;
  email?: string;
  full_name?: string;
  role?: Role;
  bar_number?: string;
  specialization?: string;
  court_name?: string;
  jurisdiction?: string;
  court_type?: string;
  id_number?: string;
  [key: string]: any;
}

export interface CaseSummary {
  id: string;
  title?: string;
  description?: string;
  status?: string;
  client_id?: string;
  lawyer_id?: string;
  court_id?: string;
}
