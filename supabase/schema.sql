-- =============================================================================
-- FarmAccess PostgreSQL & Supabase Row-Level Security (RLS) Schema
-- Run this script in your Supabase SQL Editor to provision the database.
-- =============================================================================

create extension if not exists "pgcrypto";

-- 1. PROFILES TABLE
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null default '',
  phone text not null default '',
  state text not null default '',
  lga text not null default '',
  community text not null default '',
  bio text not null default '',
  role text not null check (role in ('farmer', 'provider', 'admin')) default 'farmer',
  account_status text not null check (account_status in ('active', 'suspended')) default 'active',
  created_at timestamptz not null default now()
);

-- 2. PROVIDERS TABLE
create table if not exists public.providers (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles(id) on delete cascade,
  business_name text not null,
  registration_number text not null default '',
  coverage_states text[] not null default '{}',
  coverage_lgas text not null default '',
  bio text not null default '',
  years_experience integer not null default 1 check (years_experience >= 0),
  approval_status text not null check (approval_status in ('pending', 'approved', 'rejected')) default 'pending',
  admin_notes text not null default '',
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);

-- 3. EQUIPMENT TABLE
create table if not exists public.equipment (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.providers(id) on delete cascade,
  name text not null,
  equipment_type text not null,
  category text not null check (category in ('Land Preparation', 'Crop Processing')),
  services_offered text[] not null default '{}',
  description text not null default '',
  pricing_method text not null check (pricing_method in ('per_hectare', 'per_hour', 'per_bag', 'per_day')),
  base_price numeric(12, 2) not null check (base_price > 0),
  service_locations text[] not null default '{}',
  image_url text not null default '',
  is_available boolean not null default true,
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);

-- 4. SERVICE REQUESTS TABLE
create table if not exists public.service_requests (
  id uuid primary key default gen_random_uuid(),
  reference_code text not null unique,
  farmer_id uuid not null references public.profiles(id) on delete cascade,
  service_category text not null check (service_category in ('Land Preparation', 'Crop Processing')),
  service_type text not null,
  farm_location text not null,
  state text not null,
  lga text not null default '',
  quantity numeric(10, 2) not null check (quantity > 0),
  unit text not null default 'hectares',
  preferred_date date not null,
  additional_requirements text not null default '',
  preferred_equipment_id uuid references public.equipment(id) on delete set null,
  status text not null check (status in ('Pending', 'Quoted', 'Accepted', 'Confirmed', 'In Progress', 'Completed', 'Cancelled')) default 'Pending',
  declined_by_provider_ids uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 5. QUOTATIONS TABLE
create table if not exists public.quotations (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.service_requests(id) on delete cascade,
  provider_id uuid not null references public.providers(id) on delete cascade,
  equipment_id uuid not null references public.equipment(id) on delete cascade,
  quoted_amount numeric(12, 2) not null check (quoted_amount > 0),
  pricing_breakdown text not null default '',
  available_date date not null,
  notes text not null default '',
  status text not null check (status in ('Pending', 'Accepted', 'Declined', 'Withdrawn')) default 'Pending',
  created_at timestamptz not null default now()
);

-- 6. BOOKINGS TABLE
create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  reference_number text not null unique,
  request_id uuid not null unique references public.service_requests(id) on delete cascade,
  quotation_id uuid not null unique references public.quotations(id) on delete cascade,
  farmer_id uuid not null references public.profiles(id) on delete cascade,
  provider_id uuid not null references public.providers(id) on delete cascade,
  equipment_id uuid not null references public.equipment(id) on delete cascade,
  service_type text not null,
  service_category text not null,
  farm_location text not null,
  state text not null,
  lga text not null default '',
  quantity numeric(10, 2) not null,
  unit text not null,
  scheduled_date date not null,
  agreed_amount numeric(12, 2) not null check (agreed_amount > 0),
  status text not null check (status in ('Confirmed', 'In Progress', 'Completed', 'Cancelled')) default 'Confirmed',
  provider_completed_at timestamptz,
  farmer_confirmed_at timestamptz,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 7. TRANSACTION RECORDS TABLE (Records agreed amounts & status; no real payment processing)
create table if not exists public.transaction_records (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references public.bookings(id) on delete cascade,
  reference_number text not null,
  farmer_name text not null,
  provider_name text not null,
  service_type text not null,
  agreed_amount numeric(12, 2) not null check (agreed_amount >= 0),
  payment_status text not null check (payment_status in ('Pending Settlement', 'Recorded on Delivery', 'Verified Settlement', 'Cancelled')) default 'Pending Settlement',
  recorded_at timestamptz not null default now(),
  notes text not null default ''
);

-- =============================================================================
-- HELPER FUNCTIONS FOR ROW LEVEL SECURITY
-- =============================================================================

create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and account_status = 'active'
  );
$$;

create or replace function public.is_approved_provider(p_provider_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1
    from public.providers pr
    join public.profiles pf on pf.id = pr.profile_id
    where pr.id = p_provider_id
      and pr.approval_status = 'approved'
      and pf.account_status = 'active'
  );
$$;

create or replace function public.my_provider_id()
returns uuid
language sql
security definer
stable
as $$
  select id from public.providers where profile_id = auth.uid() limit 1;
$$;

-- =============================================================================
-- ENABLE ROW LEVEL SECURITY
-- =============================================================================

alter table public.profiles enable row level security;
alter table public.providers enable row level security;
alter table public.equipment enable row level security;
alter table public.service_requests enable row level security;
alter table public.quotations enable row level security;
alter table public.bookings enable row level security;
alter table public.transaction_records enable row level security;

-- PROFILES POLICIES
create policy "Users can view own profile or admins view all"
  on public.profiles for select
  using (
    id = auth.uid()
    or public.is_admin()
    or exists (
      select 1 from public.bookings b
      join public.providers p on p.id = b.provider_id
      where p.profile_id = auth.uid() and b.farmer_id = profiles.id
    )
    or exists (
      select 1 from public.providers p
      where p.profile_id = profiles.id and p.approval_status = 'approved'
    )
  );

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (id = auth.uid() and role in ('farmer', 'provider'));

create policy "Users update own profile or admin updates any"
  on public.profiles for update
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- PROVIDERS POLICIES
create policy "Approved providers are viewable publicly; own and admin always"
  on public.providers for select
  using (
    approval_status = 'approved'
    or profile_id = auth.uid()
    or public.is_admin()
  );

create policy "Authenticated providers can register provider profile"
  on public.providers for insert
  with check (profile_id = auth.uid() and approval_status = 'pending');

create policy "Providers update own non-approval details or admin updates all"
  on public.providers for update
  using (profile_id = auth.uid() or public.is_admin())
  with check (
    public.is_admin()
    or (
      profile_id = auth.uid()
      and approval_status = (select approval_status from public.providers where id = providers.id)
    )
  );

-- EQUIPMENT POLICIES (Unapproved providers cannot publish listings)
create policy "Public can browse equipment from approved active providers"
  on public.equipment for select
  using (
    (public.is_approved_provider(provider_id) and is_available = true)
    or provider_id = public.my_provider_id()
    or public.is_admin()
  );

create policy "Only approved providers can publish equipment"
  on public.equipment for insert
  with check (
    provider_id = public.my_provider_id()
    and public.is_approved_provider(provider_id)
  );

create policy "Providers manage own equipment or admin"
  on public.equipment for update
  using (provider_id = public.my_provider_id() or public.is_admin());

create policy "Providers delete own equipment or admin"
  on public.equipment for delete
  using (provider_id = public.my_provider_id() or public.is_admin());

-- SERVICE REQUESTS POLICIES
create policy "Farmers view own requests; approved providers view open requests; admin views all"
  on public.service_requests for select
  using (
    farmer_id = auth.uid()
    or public.is_admin()
    or (
      public.is_approved_provider(public.my_provider_id())
      and status in ('Pending', 'Quoted')
    )
    or exists (
      select 1 from public.quotations q
      where q.request_id = service_requests.id and q.provider_id = public.my_provider_id()
    )
  );

create policy "Active farmers create service requests"
  on public.service_requests for insert
  with check (
    farmer_id = auth.uid()
    and exists (select 1 from public.profiles where id = auth.uid() and role = 'farmer' and account_status = 'active')
  );

create policy "Farmers update/cancel own requests or admin"
  on public.service_requests for update
  using (farmer_id = auth.uid() or public.is_admin());

-- QUOTATIONS POLICIES
create policy "Request farmer, quoting approved provider, or admin view quotations"
  on public.quotations for select
  using (
    provider_id = public.my_provider_id()
    or public.is_admin()
    or exists (
      select 1 from public.service_requests sr
      where sr.id = quotations.request_id and sr.farmer_id = auth.uid()
    )
  );

create policy "Only approved providers submit quotations for open requests"
  on public.quotations for insert
  with check (
    provider_id = public.my_provider_id()
    and public.is_approved_provider(provider_id)
    and exists (
      select 1 from public.service_requests sr
      where sr.id = request_id and sr.status in ('Pending', 'Quoted')
    )
  );

create policy "Farmer accepts/declines quotations on own request; provider withdraws own"
  on public.quotations for update
  using (
    provider_id = public.my_provider_id()
    or public.is_admin()
    or exists (
      select 1 from public.service_requests sr
      where sr.id = quotations.request_id and sr.farmer_id = auth.uid()
    )
  );

-- BOOKINGS POLICIES (Unapproved providers cannot receive confirmed bookings)
create policy "Booking parties and admin view bookings"
  on public.bookings for select
  using (
    farmer_id = auth.uid()
    or provider_id = public.my_provider_id()
    or public.is_admin()
  );

create policy "Farmer creates booking when accepting valid quotation from approved provider"
  on public.bookings for insert
  with check (
    farmer_id = auth.uid()
    and public.is_approved_provider(provider_id)
  );

create policy "Farmer, assigned provider, or admin update booking status"
  on public.bookings for update
  using (
    farmer_id = auth.uid()
    or provider_id = public.my_provider_id()
    or public.is_admin()
  );

-- TRANSACTION RECORDS POLICIES
create policy "Booking parties and admin view transaction records"
  on public.transaction_records for select
  using (
    public.is_admin()
    or exists (
      select 1 from public.bookings b
      where b.id = transaction_records.booking_id
        and (b.farmer_id = auth.uid() or b.provider_id = public.my_provider_id())
    )
  );

create policy "Farmer or admin creates transaction record for booking"
  on public.transaction_records for insert
  with check (
    public.is_admin()
    or exists (
      select 1 from public.bookings b
      where b.id = booking_id and b.farmer_id = auth.uid()
    )
  );

create policy "Admin or booking farmer updates transaction settlement record"
  on public.transaction_records for update
  using (
    public.is_admin()
    or exists (
      select 1 from public.bookings b
      where b.id = transaction_records.booking_id and b.farmer_id = auth.uid()
    )
  );

-- =============================================================================
-- STORAGE BUCKET FOR EQUIPMENT IMAGES
-- =============================================================================
insert into storage.buckets (id, name, public)
values ('equipment-images', 'equipment-images', true)
on conflict (id) do nothing;

create policy "Public can view equipment images"
  on storage.objects for select
  using (bucket_id = 'equipment-images');

create policy "Authenticated users upload equipment images"
  on storage.objects for insert
  with check (bucket_id = 'equipment-images' and auth.role() = 'authenticated');
