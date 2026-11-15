export type UserRole = 'farmer' | 'provider' | 'admin';

export type AccountStatus = 'active' | 'suspended';

export type ProviderApprovalStatus = 'pending' | 'approved' | 'rejected';

export type ServiceCategory = 'Land Preparation' | 'Crop Processing';

export type ServiceType =
  | 'Tractor hiring'
  | 'Ploughing'
  | 'Harrowing'
  | 'Ridging'
  | 'Maize shelling'
  | 'Rice threshing';

export type PricingMethod = 'per_hectare' | 'per_hour' | 'per_bag' | 'per_day';

export type BookingStatus =
  | 'Pending'
  | 'Quoted'
  | 'Accepted'
  | 'Confirmed'
  | 'In Progress'
  | 'Completed'
  | 'Cancelled';

export type QuotationStatus = 'Pending' | 'Accepted' | 'Declined' | 'Withdrawn';

export type TransactionPaymentStatus =
  | 'Pending Settlement'
  | 'Recorded on Delivery'
  | 'Verified Settlement'
  | 'Cancelled';

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  state: string;
  lga: string;
  community: string;
  bio: string;
  role: UserRole;
  account_status: AccountStatus;
  created_at: string;
}

export interface ProviderProfile {
  id: string;
  profile_id: string;
  business_name: string;
  registration_number: string;
  coverage_states: string[];
  coverage_lgas: string;
  bio: string;
  years_experience: number;
  approval_status: ProviderApprovalStatus;
  admin_notes?: string;
  created_at: string;
  // Hydrated convenience fields
  owner_name?: string;
  owner_phone?: string;
  owner_email?: string;
  account_status?: AccountStatus;
}

export interface Equipment {
  id: string;
  provider_id: string;
  name: string;
  equipment_type: string;
  category: ServiceCategory;
  services_offered: ServiceType[];
  description: string;
  pricing_method: PricingMethod;
  base_price: number;
  service_locations: string[];
  image_url: string;
  is_available: boolean;
  created_at: string;
  // Hydrated convenience fields
  provider_name?: string;
  provider_approval_status?: ProviderApprovalStatus;
}

export interface ServiceRequest {
  id: string;
  reference_code: string;
  farmer_id: string;
  service_category: ServiceCategory;
  service_type: ServiceType;
  farm_location: string;
  state: string;
  lga: string;
  quantity: number;
  unit: string;
  preferred_date: string;
  additional_requirements: string;
  preferred_equipment_id?: string | null;
  status: BookingStatus;
  declined_by_provider_ids: string[];
  created_at: string;
  updated_at: string;
  // Hydrated fields (private farmer contact only exposed when booking is confirmed or to farmer/admin)
  farmer_name?: string;
  farmer_phone?: string;
  preferred_equipment_name?: string;
}

export interface Quotation {
  id: string;
  request_id: string;
  provider_id: string;
  equipment_id: string;
  quoted_amount: number;
  pricing_breakdown: string;
  available_date: string;
  notes: string;
  status: QuotationStatus;
  created_at: string;
  // Hydrated convenience fields
  provider_name?: string;
  provider_states?: string[];
  equipment_name?: string;
  equipment_type?: string;
  equipment_image?: string;
}

export interface Booking {
  id: string;
  reference_number: string;
  request_id: string;
  quotation_id: string;
  farmer_id: string;
  provider_id: string;
  equipment_id: string;
  service_type: ServiceType;
  service_category: ServiceCategory;
  farm_location: string;
  state: string;
  lga: string;
  quantity: number;
  unit: string;
  scheduled_date: string;
  agreed_amount: number;
  status: BookingStatus;
  provider_completed_at?: string | null;
  farmer_confirmed_at?: string | null;
  notes: string;
  created_at: string;
  updated_at: string;
  // Hydrated convenience fields
  farmer_name?: string;
  farmer_phone?: string;
  provider_name?: string;
  provider_phone?: string;
  equipment_name?: string;
}

export interface TransactionRecord {
  id: string;
  booking_id: string;
  reference_number: string;
  farmer_name: string;
  provider_name: string;
  service_type: ServiceType;
  agreed_amount: number;
  payment_status: TransactionPaymentStatus;
  recorded_at: string;
  notes: string;
}

export interface AppNotification {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  message?: string;
}
