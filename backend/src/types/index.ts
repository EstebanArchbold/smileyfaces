export interface Booking {
  id: string;
  client_name: string;
  client_email: string;
  client_phone: string | null;
  address: string | null;
  service_type: string;
  date: string;
  start_time: string;
  end_time: string;
  notes: string | null;
  num_kids: string | null;
  duration: string | null;
  theme: string | null;
  arrival_time: string | null;
  hours_booked: string | null;
  bday_kid_name: string | null;
  kids_age_range: string | null;
  allergies: string | null;
  comments: string | null;
  confirmation_submitted_at: string | null;
  discount: string | number | null;
  discount_note: string | null;
  extra_charges: { label: string; amount: number }[];
  admin_notes: string | null;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  google_event_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface GalleryItem {
  id: string;
  title: string | null;
  category: string;
  image_path: string;
  display_order: number;
  service: string | null;
  created_at: string;
}

export interface EventType {
  id: string;
  value: string;
  label: string;
  icon: string;
  display_order: number;
  created_at: string;
}

export interface Testimonial {
  id: string;
  author: string;
  quote: string;
  display_order: number;
  status: 'pending' | 'approved' | 'archived';
  images: string[];
  booking_id: string | null;
  client_email: string | null;
  submitted_at: string | null;
  created_at: string;
}

export interface Setting {
  key: string;
  value: string;
}

export interface BookingStats {
  totalBookings: number;
  totalRevenue: number;
  upcomingBookings: number;
  bookingsByMonth: { month: string; count: number }[];
  revenueByMonth: { month: string; revenue: number }[];
}

export interface JwtPayload {
  email: string;
  role: string;
}
