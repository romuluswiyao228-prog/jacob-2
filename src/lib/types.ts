export type AppRole = "owner" | "customer";

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  user_id: string;
  role: AppRole;
  created_at: string;
  updated_at: string;
}
