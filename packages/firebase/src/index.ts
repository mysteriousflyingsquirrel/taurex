// Config
export { initFirebase } from "./config";

// Auth
export { signIn, signOut, onAuthChanged, createAuthUser } from "./auth";
export type { User } from "./auth";

// Types
export {
  AVAILABLE_LANGUAGES,
  AVAILABLE_CURRENCIES,
  STANDARD_PRICE_PER_APARTMENT,
  DEFAULT_BILLING,
  getEffectivePrice,
  getMonthlyTotal,
  currencySymbol,
  formatMoney,
  formatDate,
} from "./types";
export type {
  LanguageCode,
  CurrencyCode,
  HostBilling,
  Host,
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
  fetchHosts,
  fetchHostBySlug,
  createHost,
  updateHost,
  deleteHost,
} from "./services/hostService";

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
