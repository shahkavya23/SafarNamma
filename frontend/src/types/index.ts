export const PLACE_CATEGORIES = [
  'Religious Places',
  'Mall',
  'Entertainment',
  'Monuments',
  'Museums',
  'Cafes & Restaurants',
  'Nature',
  'Games & Adventure',
  'Street Shopping',
  'Food Places',
] as const;

export type PlaceCategory = (typeof PLACE_CATEGORIES)[number];

export interface Place {
  id: number;
  name: string;
  state?: string;
  category: string;
  description: string;
  image_url?: string;
  best_season?: string;
  budget_tier: string;
  rating: number;
  is_hidden_gem: boolean;
  latitude?: number;
  longitude?: number;
  map_link?: string ;
  is_approved?: boolean;
  submitted_by_email?: string | null;
  submission_status?: string | null;
  
  // (We'll keep a few of the old ones optional so React doesn't complain elsewhere for now)
  distance_km?: number;
  duration?: string;
  opening_hours?: string;
  closing_hours?: string;
  transport_options?: string;
  nearby_facilities?: string;
  gallery_images?: string[];
  is_popular_weekend?: boolean;
}


export interface Group {
  id: number | string;
  destination_id?: number | null;
  custom_destination?: string | null;
  place_id?: string | number; // For backwards compatibility
  title: string;
  description: string;
  trip_date: string;
  meeting_area: string;
  estimated_cost: number;
  max_members: number;
  current_members: number;
  organizer_name: string;
  organizer_email: string;
  chat_link?: string | null;
  status: 'open' | 'full' | 'completed' | 'cancelled';
  safety_notes?: string | null;
  created_at: string;
  user_request_status?: 'pending' | 'approved' | 'rejected' | null;
}

export interface GroupRequest {
  id: number;
  group_id: number;
  user_name: string;
  user_email: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
  avatar_url?: string;
  bio?: string ;
  created_at: string;
}

export interface Submission {
  id: string;
  submitted_by: string;
  place_name: string;
  category: string;
  description: string;
  approximate_location: string;
  estimated_cost: number;
  source_url?: string;
  image_url?: string;
  status: 'pending' | 'approved' | 'rejected';
  moderation_notes?: string;
  created_at: string;
}



export interface Review{
  id : number ;
  destination_id : number ;
  rating : number ; 
  comment : string ;
  user_id :number ;
  created_at : string ;
}

export interface AppNotification {
  id: number;
  user_email: string;
  type: string;
  title: string;
  message: string;
  link?: string | null;
  is_read: boolean;
  created_at: string;
}