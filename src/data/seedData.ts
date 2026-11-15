import type {
  Booking,
  Equipment,
  Profile,
  ProviderProfile,
  Quotation,
  ServiceRequest,
  TransactionRecord,
} from '../types/farmaccess';

export interface UserCredentials {
  identifier: string;
  email: string;
  phone: string;
  password: string;
  profileId: string;
}

export interface LocalFarmAccessDB {
  profiles: Profile[];
  credentials: UserCredentials[];
  providers: ProviderProfile[];
  equipment: Equipment[];
  serviceRequests: ServiceRequest[];
  quotations: Quotation[];
  bookings: Booking[];
  transactionRecords: TransactionRecord[];
}

export const HERO_IMAGE_URL = '/src/assets/images/hero_nigerian_farmland_1794736138864.jpg';

export const EQUIPMENT_IMAGE_MAP = {
  tractorPlough: '/src/assets/images/equip_tractor_plough_1794736139591.jpg',
  harrowRidger: '/src/assets/images/equip_harrow_ridger_1794736138945.jpg',
  maizeSheller: '/src/assets/images/equip_maize_sheller_1794736140138.jpg',
  riceThresher: '/src/assets/images/equip_rice_thresher_1794736140673.jpg',
};

export const EMPTY_DB: LocalFarmAccessDB = {
  profiles: [],
  credentials: [],
  providers: [],
  equipment: [],
  serviceRequests: [],
  quotations: [],
  bookings: [],
  transactionRecords: [],
};
