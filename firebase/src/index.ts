// Config
export { app } from "./config";
export { db } from "./firestore";

// Auth
export { auth, signIn, signOut, onAuthChanged } from "./auth";
export type { User } from "./auth";

// Types
export {
  AVAILABLE_LANGUAGES,
  AVAILABLE_CURRENCIES,
  STANDARD_PRICE_PER_APARTMENT,
  DEFAULT_BILLING,
  getEffectivePrice,
  getMonthlyTotal,
  formatDate,
} from "./types";
export type {
  LanguageCode,
  CurrencyCode,
  TenantBilling,
  Tenant,
  UserProfile,
  Apartment,
  ApartmentImage,
  ApartmentFacts,
  ApartmentLocation,
  BookingLink,
  Season,
  SeasonDateRange,
  DateString,
} from "./types";

// Services
export {
  fetchUserProfile,
  fetchAllUsers,
  createUserProfile,
  deleteUserProfile,
} from "./services/userService";

export {
  fetchTenants,
  fetchTenantBySlug,
  createTenant,
  updateTenant,
  deleteTenant,
} from "./services/tenantService";

export {
  fetchApartments,
  fetchApartmentBySlug,
  createApartment,
  updateApartment,
  deleteApartment,
} from "./services/apartmentService";

export {
  fetchSeasons,
  setSeason,
  deleteSeason,
  copySeasonsToYear,
} from "./services/seasonService";
