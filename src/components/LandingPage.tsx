import {
  ArrowRight,
  CalendarCheck,
  Check,
  MapPin,
  Tractor,
} from 'lucide-react';
import { EQUIPMENT_IMAGE_MAP, HERO_IMAGE_URL } from '../data/seedData';
import {
  formatNaira,
  formatPricingMethod,
  SERVICE_CATALOG,
} from '../lib/formatters';
import type { Equipment, Profile, ServiceType } from '../types/farmaccess';
import { ResilientImage } from './ui/ResilientImage';

interface LandingPageProps {
  currentUser: Profile | null;
  equipmentList: Equipment[];
  onOpenAuth: (mode: 'login' | 'register', preselectRole?: 'farmer' | 'provider') => void;
  onGoToDashboard: () => void;
  onSelectServiceToBook: (serviceType: ServiceType, equipmentId?: string) => void;
}

const SERVICE_CATEGORY_HIGHLIGHTS = [
  {
    title: 'Tractor Hiring & Ploughing',
    category: 'Land Preparation',
    image: EQUIPMENT_IMAGE_MAP.tractorPlough,
    description:
      '4WD utility tractors fitted with 3-disc ploughs to prepare hardpan savannah and forest-zone farmland.',
    serviceType: 'Ploughing' as ServiceType,
  },
  {
    title: 'Harrowing & Ridging',
    category: 'Land Preparation',
    image: EQUIPMENT_IMAGE_MAP.harrowRidger,
    description:
      'Offset disc harrows and multi-row ridgers for uniform seedbeds across maize, yam, and soybean plots.',
    serviceType: 'Ridging' as ServiceType,
  },
  {
    title: 'Maize Shelling',
    category: 'Crop Processing',
    image: EQUIPMENT_IMAGE_MAP.maizeSheller,
    description:
      'Diesel-powered mobile shellers delivering clean grain separation directly at your farm or drying slab.',
    serviceType: 'Maize shelling' as ServiceType,
  },
  {
    title: 'Rice Threshing',
    category: 'Crop Processing',
    image: EQUIPMENT_IMAGE_MAP.riceThresher,
    description:
      'Mobile axial-flow paddy threshers that reduce post-harvest grain loss and cut manual labour time.',
    serviceType: 'Rice threshing' as ServiceType,
  },
];

export function LandingPage({
  currentUser,
  equipmentList,
  onOpenAuth,
  onGoToDashboard,
  onSelectServiceToBook,
}: LandingPageProps) {
  const approvedEquipment = equipmentList.filter(
    (e) => e.is_available && e.provider_approval_status === 'approved'
  );

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAF8] text-slate-900">
      {/* Top Bar Contract: 3 zones separated by gap-8 */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-slate-200">
        <div className="max-w-[1200px] mx-auto px-6 py-4 flex items-center justify-between gap-8">
          <a
            href="#top"
            className="font-display text-xl font-bold tracking-tight text-[#14532D] whitespace-nowrap shrink-0"
          >
            FarmAccess
          </a>

          <nav
            className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600"
            aria-label="Primary navigation"
          >
            <a
              href="#services"
              className="hover:text-[#14532D] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Services
            </a>
            <a
              href="#how-it-works"
              className="hover:text-[#14532D] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              How It Works
            </a>
            <a
              href="#machinery"
              className="hover:text-[#14532D] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Machinery
            </a>
            <a
              href="#benefits"
              className="hover:text-[#14532D] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Benefits
            </a>
          </nav>

          <div className="flex items-center shrink-0">
            {currentUser ? (
              <button
                type="button"
                onClick={onGoToDashboard}
                className="px-4 py-2 text-sm font-semibold text-white bg-[#14532D] rounded-lg hover:bg-[#166534] transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#14532D]"
              >
                Open Dashboard
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onOpenAuth('login')}
                className="px-4 py-2 text-sm font-semibold text-white bg-[#14532D] rounded-lg hover:bg-[#166534] transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#14532D]"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </header>

      <main id="top" className="flex-1">
        {/* Hero Section */}
        <section className="max-w-[1200px] mx-auto px-6 pt-10 pb-14 lg:pt-14 lg:pb-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-stretch">
            <div className="lg:col-span-6 flex flex-col justify-between py-2">
              <div>
                <p className="text-sm font-medium text-[#166534] mb-3">
                  Farm services, within reach · Nigeria Smallholder Mechanisation
                </p>
                <h1
                  className="font-display font-bold tracking-tight text-slate-900 leading-[1.12] [text-wrap:balance]"
                  style={{ fontSize: 'clamp(2.25rem, 4vw, 3.5rem)' }}
                >
                  Reliable tractors and crop processing for every planting season.
                </h1>
                <p className="mt-5 text-base sm:text-lg text-slate-600 leading-relaxed max-w-xl">
                  FarmAccess connects smallholder farmers across Nigeria with verified
                  equipment owners and professional operators. Browse available
                  services, sign up to submit a request, compare Naira quotations,
                  and track your booking through completion.
                </p>

                <div className="mt-8 flex flex-wrap items-center gap-4">
                  <button
                    type="button"
                    onClick={() =>
                      currentUser
                        ? onGoToDashboard()
                        : onOpenAuth('register', 'farmer')
                    }
                    className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-[#14532D] rounded-lg hover:bg-[#166534] transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#14532D]"
                  >
                    <span>
                      {currentUser ? 'Go to My Workspace' : 'Sign Up to Request Service'}
                    </span>
                    <ArrowRight className="w-4 h-4" aria-hidden="true" />
                  </button>

                  {!currentUser && (
                    <button
                      type="button"
                      onClick={() => onOpenAuth('register', 'provider')}
                      className="px-5 py-3 text-sm font-semibold text-[#14532D] bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#14532D]"
                    >
                      Register as Equipment Provider
                    </button>
                  )}
                </div>
              </div>

              <p className="mt-8 text-xs text-slate-500">
                Browse all agricultural services freely · Create an account to submit requests or list machinery.
              </p>
            </div>

            <div className="lg:col-span-6">
              <div className="relative h-72 sm:h-96 lg:h-full min-h-[340px] rounded-xl overflow-hidden border border-slate-200 bg-slate-900">
                <ResilientImage
                  src={HERO_IMAGE_URL}
                  alt="Agricultural tractor ploughing dark fertile soil on a Nigerian farm at golden hour"
                  className="w-full h-full object-cover"
                  fallbackTitle="Nigerian Agricultural Mechanisation"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                  <p className="text-xs font-medium text-amber-300">
                    Land Preparation · Crop Processing
                  </p>
                  <p className="mt-1 text-base font-semibold">
                    Verified machinery operators dispatched directly to your farm cluster
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 4-Column Operational Summary Strip below Hero */}
          <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border border-slate-200 rounded-xl bg-white divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
            <div className="p-5">
              <p className="text-xs font-medium text-slate-500">01 · Core Categories</p>
              <p className="mt-1.5 text-base font-semibold text-slate-900">
                Land Prep &amp; Processing
              </p>
              <p className="mt-1 text-xs text-slate-600">
                6 essential field and post-harvest services
              </p>
            </div>
            <div className="p-5">
              <p className="text-xs font-medium text-slate-500">02 · Pricing Clarity</p>
              <p className="mt-1.5 text-base font-semibold text-slate-900 font-mono tabular-nums">
                Transparent ₦ Quotes
              </p>
              <p className="mt-1 text-xs text-slate-600">
                Compare offers before confirming any booking
              </p>
            </div>
            <div className="p-5">
              <p className="text-xs font-medium text-slate-500">03 · Provider Vetting</p>
              <p className="mt-1.5 text-base font-semibold text-slate-900">
                Admin-Approved Fleet
              </p>
              <p className="mt-1 text-xs text-slate-600">
                Equipment owners verified prior to listing
              </p>
            </div>
            <div className="p-5">
              <p className="text-xs font-medium text-slate-500">04 · Full Traceability</p>
              <p className="mt-1.5 text-base font-semibold text-slate-900">
                Dual-Confirmed Jobs
              </p>
              <p className="mt-1 text-xs text-slate-600">
                Tracked from request to farmer sign-off
              </p>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section
          id="how-it-works"
          className="bg-white border-y border-slate-200 py-16"
        >
          <div className="max-w-[1200px] mx-auto px-6">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold text-[#166534]">How It Works</p>
              <h2 className="mt-2 font-display text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight [text-wrap:balance]">
                From service request to completed field work in four clear stages.
              </h2>
            </div>

            <div className="mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                {
                  step: '01. Submit Request',
                  title: 'Specify farm & service needs',
                  desc: 'Sign up, select ploughing, ridging, shelling, or threshing, and enter your farm location, size, and preferred date.',
                },
                {
                  step: '02. Receive Quotations',
                  title: 'Compare provider offers',
                  desc: 'Approved providers within your coverage area review your request and send itemized Naira quotations and availability.',
                },
                {
                  step: '03. Confirm Booking',
                  title: 'Lock in operator & reference',
                  desc: 'Accept the best quotation to generate a unique booking reference number and dispatch schedule.',
                },
                {
                  step: '04. Track & Confirm',
                  title: 'Verify completed service',
                  desc: 'Monitor status from Confirmed to In Progress, then confirm completion once field work meets expectations.',
                },
              ].map((item) => (
                <div
                  key={item.step}
                  className="p-6 rounded-xl border border-slate-200 bg-[#F8FAF8]"
                >
                  <p className="text-xs font-semibold text-[#B45309] font-mono">
                    {item.step}
                  </p>
                  <h3 className="mt-2.5 text-base font-semibold text-slate-900">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Available Agricultural Services */}
        <section id="services" className="py-16 max-w-[1200px] mx-auto px-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold text-[#166534]">
                Available Services
              </p>
              <h2 className="mt-2 font-display text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight [text-wrap:balance]">
                Mechanisation services tailored for smallholder crops.
              </h2>
            </div>
            <p className="text-sm text-slate-600 max-w-md">
              Indicative rates in Nigerian Naira (₦). Sign up to request any service and receive direct quotations from providers.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 lg:grid-cols-2 gap-8">
            {SERVICE_CATALOG.map((group) => (
              <div
                key={group.category}
                className="bg-white border border-slate-200 rounded-xl overflow-hidden"
              >
                <div className="px-6 py-5 border-b border-slate-200 bg-[#F8FAF8] flex items-center justify-between gap-4">
                  <div>
                    <h3 className="font-display text-lg font-bold text-slate-900">
                      {group.category}
                    </h3>
                    <p className="text-xs text-slate-600 mt-0.5">
                      {group.services.length} core service types available
                    </p>
                  </div>
                  <Tractor className="w-5 h-5 text-[#14532D]" aria-hidden="true" />
                </div>

                <div className="divide-y divide-slate-200">
                  {group.services.map((svc) => (
                    <div
                      key={svc.name}
                      className="p-5 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                          <span className="font-medium text-slate-700">
                            {svc.unitLabel}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono tabular-nums text-[#14532D] font-medium">
                            {svc.typicalRange}
                          </span>
                        </div>
                        <h4 className="mt-1 text-base font-semibold text-slate-900">
                          {svc.name}
                        </h4>
                        <p className="mt-1 text-sm text-slate-600 leading-relaxed">
                          {svc.summary}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => onSelectServiceToBook(svc.name)}
                        className="px-3.5 py-2 text-xs font-semibold text-[#14532D] bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors whitespace-nowrap shrink-0 self-start sm:self-center"
                      >
                        Request {svc.name}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Machinery Categories & Live Verified Listings */}
        <section
          id="machinery"
          className="bg-white border-y border-slate-200 py-16"
        >
          <div className="max-w-[1200px] mx-auto px-6">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-[#166534]">
                  {approvedEquipment.length > 0
                    ? 'Available Machinery Listings'
                    : 'Supported Equipment Categories'}
                </p>
                <h2 className="mt-2 font-display text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                  {approvedEquipment.length > 0
                    ? 'Verified equipment ready for booking'
                    : 'Mechanisation fleet capabilities across Nigeria'}
                </h2>
              </div>
              {!currentUser && (
                <button
                  type="button"
                  onClick={() => onOpenAuth('register', 'provider')}
                  className="text-xs font-semibold text-[#14532D] hover:underline whitespace-nowrap"
                >
                  Own agricultural equipment? Register as a provider
                </button>
              )}
            </div>

            {approvedEquipment.length > 0 ? (
              <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {approvedEquipment.slice(0, 4).map((item) => (
                  <article
                    key={item.id}
                    className="rounded-xl border border-slate-200 bg-[#F8FAF8] overflow-hidden flex flex-col"
                  >
                    <div className="aspect-[4/3] w-full bg-slate-100 border-b border-slate-200 overflow-hidden">
                      <ResilientImage
                        src={item.image_url}
                        alt={item.name}
                        className="w-full h-full object-cover"
                        fallbackTitle={item.name}
                      />
                    </div>
                    <div className="p-5 flex-1 flex flex-col justify-between">
                      <div>
                        <p className="text-xs text-slate-500">
                          {item.category} · {item.provider_name}
                        </p>
                        <h3 className="mt-1.5 text-base font-semibold text-slate-900 leading-snug">
                          {item.name}
                        </h3>
                        <p className="mt-1.5 text-xs text-slate-600 line-clamp-2">
                          {item.description}
                        </p>
                        <p className="mt-3 text-xs text-slate-600 flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" aria-hidden="true" />
                          <span className="truncate">
                            {item.service_locations.join(', ')}
                          </span>
                        </p>
                      </div>

                      <div className="mt-5 pt-4 border-t border-slate-200 flex items-center justify-between gap-2">
                        <div>
                          <p className="text-xs text-slate-500">Base rate</p>
                          <p className="text-sm font-bold text-[#14532D] font-mono tabular-nums">
                            {formatNaira(item.base_price)}{' '}
                            <span className="font-sans font-normal text-xs text-slate-500">
                              {formatPricingMethod(item.pricing_method)}
                            </span>
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            onSelectServiceToBook(
                              item.services_offered[0] || 'Tractor hiring',
                              item.id
                            )
                          }
                          className="px-3 py-1.5 text-xs font-semibold text-white bg-[#14532D] rounded-lg hover:bg-[#166534] transition-colors whitespace-nowrap shrink-0"
                        >
                          Request
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {SERVICE_CATEGORY_HIGHLIGHTS.map((card) => (
                  <article
                    key={card.title}
                    className="rounded-xl border border-slate-200 bg-[#F8FAF8] overflow-hidden flex flex-col"
                  >
                    <div className="aspect-[4/3] w-full bg-slate-100 border-b border-slate-200 overflow-hidden">
                      <ResilientImage
                        src={card.image}
                        alt={card.title}
                        className="w-full h-full object-cover"
                        fallbackTitle={card.title}
                      />
                    </div>
                    <div className="p-5 flex-1 flex flex-col justify-between">
                      <div>
                        <p className="text-xs text-slate-500">{card.category}</p>
                        <h3 className="mt-1.5 text-base font-semibold text-slate-900 leading-snug">
                          {card.title}
                        </h3>
                        <p className="mt-1.5 text-xs text-slate-600 leading-relaxed">
                          {card.description}
                        </p>
                      </div>

                      <div className="mt-5 pt-4 border-t border-slate-200 flex justify-end">
                        <button
                          type="button"
                          onClick={() => onSelectServiceToBook(card.serviceType)}
                          className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#14532D] rounded-lg hover:bg-[#166534] transition-colors whitespace-nowrap"
                        >
                          Request Service
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Benefits for Farmers & Equipment Owners */}
        <section id="benefits" className="py-16 max-w-[1200px] mx-auto px-6">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold text-[#166534]">
              Built for Both Sides of the Field
            </p>
            <h2 className="mt-2 font-display text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight [text-wrap:balance]">
              Clear benefits for smallholder farmers and equipment owners.
            </h2>
          </div>

          <div className="mt-10 grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="p-7 rounded-xl bg-white border border-slate-200">
              <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-200">
                <div>
                  <p className="text-xs font-medium text-[#166534]">For Smallholder Farmers</p>
                  <h3 className="mt-1 font-display text-xl font-bold text-slate-900">
                    Timely mechanisation without middleman guesswork
                  </h3>
                </div>
                <CalendarCheck className="w-6 h-6 text-[#14532D] shrink-0" aria-hidden="true" />
              </div>

              <ul className="mt-5 space-y-3.5 text-sm text-slate-700">
                {[
                  'Submit one structured request with your farm location, hectares or bags, and preferred date.',
                  'Compare competitive Naira quotations from verified providers operating in your state.',
                  'Track every confirmed booking with a unique reference number until job completion.',
                  'Keep full control — cancel pending requests anytime before accepting an offer.',
                ].map((point) => (
                  <li key={point} className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-[#16A34A] shrink-0 mt-0.5" aria-hidden="true" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-7">
                <button
                  type="button"
                  onClick={() =>
                    currentUser
                      ? onGoToDashboard()
                      : onOpenAuth('register', 'farmer')
                  }
                  className="px-4 py-2.5 text-sm font-semibold text-white bg-[#14532D] rounded-lg hover:bg-[#166534] transition-colors whitespace-nowrap"
                >
                  Create Farmer Account
                </button>
              </div>
            </div>

            <div className="p-7 rounded-xl bg-white border border-slate-200">
              <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-200">
                <div>
                  <p className="text-xs font-medium text-[#B45309]">For Equipment Owners</p>
                  <h3 className="mt-1 font-display text-xl font-bold text-slate-900">
                    Higher seasonal utilisation for your tractors &amp; threshers
                  </h3>
                </div>
                <Tractor className="w-6 h-6 text-[#B45309] shrink-0" aria-hidden="true" />
              </div>

              <ul className="mt-5 space-y-3.5 text-sm text-slate-700">
                {[
                  'List tractors, ploughs, harrows, ridgers, shellers, and threshers with custom Naira rates.',
                  'Receive qualified service requests matched to your state and equipment capabilities.',
                  'Issue tailored quotations factoring mobilisation distance, terrain, and schedule.',
                  'Track confirmed field jobs, mark completion, and monitor estimated seasonal earnings.',
                ].map((point) => (
                  <li key={point} className="flex items-start gap-2.5">
                    <Check className="w-4 h-4 text-[#B45309] shrink-0 mt-0.5" aria-hidden="true" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-7">
                <button
                  type="button"
                  onClick={() =>
                    currentUser
                      ? onGoToDashboard()
                      : onOpenAuth('register', 'provider')
                  }
                  className="px-4 py-2.5 text-sm font-semibold text-slate-900 bg-amber-400 rounded-lg hover:bg-amber-300 transition-colors whitespace-nowrap"
                >
                  Register as Equipment Provider
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Quiet Footer */}
      <footer className="bg-white border-t border-slate-200 py-10">
        <div className="max-w-[1200px] mx-auto px-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <p className="font-display text-lg font-bold text-[#14532D]">
              FarmAccess
            </p>
            <p className="mt-1 text-sm text-slate-600">
              Farm services, within reach. Agricultural mechanisation booking platform for Nigeria.
            </p>
          </div>
          <div className="flex items-center gap-6 text-sm text-slate-600 shrink-0">
            <a href="#services" className="hover:text-[#14532D]">
              Services
            </a>
            <a href="#how-it-works" className="hover:text-[#14532D]">
              How It Works
            </a>
            <button
              type="button"
              onClick={() => onOpenAuth('login')}
              className="font-medium text-[#14532D] hover:underline"
            >
              Sign In
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
