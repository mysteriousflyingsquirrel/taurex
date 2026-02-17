// Config
export { app } from "./config";
export { db } from "./firestore";

// Auth
export { auth, signIn, signOut, onAuthChanged } from "./auth";
export type { User } from "./auth";

// Types
export { AVAILABLE_LANGUAGES, AVAILABLE_CURRENCIES } from "./types";
export type {
  LanguageCode,
  CurrencyCode,
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
  createUserProfile,
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
