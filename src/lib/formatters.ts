import type { PricingMethod, ServiceCategory, ServiceType } from '../types/farmaccess';

export const NIGERIAN_STATES = [
  'Benue',
  'Kaduna',
  'Kano',
  'Katsina',
  'Kwara',
  'Nasarawa',
  'Niger',
  'Ogun',
  'Oyo',
  'Plateau',
  'Taraba',
  'Zamfara',
  'FCT Abuja',
  'Adamawa',
  'Bauchi',
  'Ekiti',
  'Ondo',
  'Osun',
];

export const SERVICE_CATALOG: {
  category: ServiceCategory;
  services: {
    name: ServiceType;
    unitLabel: string;
    defaultUnit: string;
    typicalRange: string;
    summary: string;
  }[];
}[] = [
  {
    category: 'Land Preparation',
    services: [
      {
        name: 'Tractor hiring',
        unitLabel: 'Hectares or Days',
        defaultUnit: 'hectares',
        typicalRange: '₦32,000 – ₦48,000 / ha',
        summary: '4WD utility tractors with certified operators for multi-stage field preparation.',
      },
      {
        name: 'Ploughing',
        unitLabel: 'Hectares',
        defaultUnit: 'hectares',
        typicalRange: '₦28,000 – ₦40,000 / ha',
        summary: 'Primary disc ploughing to break hardpan soil and incorporate crop residue.',
      },
      {
        name: 'Harrowing',
        unitLabel: 'Hectares',
        defaultUnit: 'hectares',
        typicalRange: '₦22,000 – ₦32,000 / ha',
        summary: 'Secondary clod-breaking and seedbed levelling before planting.',
      },
      {
        name: 'Ridging',
        unitLabel: 'Hectares',
        defaultUnit: 'hectares',
        typicalRange: '₦25,000 – ₦35,000 / ha',
        summary: 'Uniform ridge formation for maize, yam, cassava, and soybean rows.',
      },
    ],
  },
  {
    category: 'Crop Processing',
    services: [
      {
        name: 'Maize shelling',
        unitLabel: 'Bags (100 kg)',
        defaultUnit: 'bags',
        typicalRange: '₦800 – ₦1,400 / bag',
        summary: 'Diesel-powered high-output shelling with low grain breakage and cob separation.',
      },
      {
        name: 'Rice threshing',
        unitLabel: 'Bags (75–100 kg)',
        defaultUnit: 'bags',
        typicalRange: '₦1,200 – ₦1,800 / bag',
        summary: 'Mobile paddy threshing and winnowing directly at your farm or drying slab.',
      },
    ],
  },
];

export const ALL_SERVICE_TYPES: ServiceType[] = SERVICE_CATALOG.flatMap((c) =>
  c.services.map((s) => s.name)
);

export function getCategoryForService(serviceType: ServiceType): ServiceCategory {
  for (const cat of SERVICE_CATALOG) {
    if (cat.services.some((s) => s.name === serviceType)) {
      return cat.category;
    }
  }
  return 'Land Preparation';
}

export function getDefaultUnitForService(serviceType: ServiceType): string {
  for (const cat of SERVICE_CATALOG) {
    const found = cat.services.find((s) => s.name === serviceType);
    if (found) return found.defaultUnit;
  }
  return 'hectares';
}

export function formatNaira(amount: number): string {
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  return `₦${Math.round(safeAmount).toLocaleString('en-NG')}`;
}

export function formatPricingMethod(method: PricingMethod): string {
  switch (method) {
    case 'per_hectare':
      return 'per hectare';
    case 'per_hour':
      return 'per hour';
    case 'per_bag':
      return 'per bag';
    case 'per_day':
      return 'per day';
    default:
      return 'per unit';
  }
}

export function formatDateShort(isoOrDate: string | null | undefined): string {
  if (!isoOrDate) return '—';
  const parsed = new Date(isoOrDate);
  if (Number.isNaN(parsed.getTime())) return isoOrDate;
  return parsed.toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function generateReferenceNumber(prefix: 'REQ' | 'FA'): string {
  const year = new Date().getFullYear();
  const code = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${year}-${code}`;
}
