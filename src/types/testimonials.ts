export interface User {
  id: number
  name: string
  email: string
  role: string
  status: string
  created_at: string
  updated_at: string
}

export interface Customer {
  id: number
  user_id: number
  alamat: string
  no_hp: string
  nasionality: string
  region: string
  status: string
  created_at: string
  updated_at: string
  user: User
}

export interface Trip {
  id: number
  name: string
  include: string
  exclude: string
  note: string
  start_time: string
  end_time: string
  meeting_point: string
  type: string
  status: string
  is_highlight: string
  destination_count: number
  has_boat: boolean
  created_at: string
  updated_at: string
}

// Interface untuk model Testimonial yang baru (sesuai dengan PHP model)
export interface Testimonial {
  id: number
  customer_name: string
  customer_email: string
  customer_phone: string
  trip_id?: number
  rating: number
  review: string
  is_approved: boolean
  is_highlight: boolean
  source: string
  created_at: string
  updated_at: string
  trip?: Trip
}

// Interface untuk testimonial lama (jika masih digunakan)
export interface TestimonialLegacy {
  id: number
  customer_id: number
  trip_id?: number
  rating: number
  review: string
  is_approved: boolean
  is_highlight: boolean
  created_at: string
  updated_at: string
  customer: Customer
  trip?: Trip
} 