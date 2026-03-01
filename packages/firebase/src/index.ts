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
  ApartmentPromotion,
  CalendarSyncStatus,
  ApartmentCalendarImport,
  ApartmentCalendarManualBlock,
  ApartmentCalendarBusyRange,
  ApartmentCalendarConflict,
  ApartmentCalendar,
  ApartmentCalendarPrivate,
  BookingRequestStatus,
  BookingRequest,
  CreateBookingRequestInput,
  DecideBookingRequestInput,
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
  buildApartmentCalendarExportUrl,
  fetchApartmentCalendarPrivate,
  rotateApartmentCalendarExportToken,
  addApartmentCalendarImport,
  removeApartmentCalendarImport,
  setApartmentCalendarImportActive,
  setApartmentCalendarImportColor,
  setApartmentManualBlock,
  removeApartmentManualBlock,
  refreshApartmentCalendarImports,
} from "./services/apartmentService";

export {
  fetchBookingRequests,
  fetchBookingRequestById,
  createBookingRequest,
  decideBookingRequest,
} from "./services/bookingRequestService";

export {
  fetchSeasons,
  setSeason,
  deleteSeason,
  copySeasonsToYear,
} from "./services/seasonService";

export {
  uploadHostLogo,
  uploadHostBanner,
  removeHostLogo,
  removeHostBanner,
  deleteStorageFile,
  uploadApartmentImage,
  removeApartmentImage,
} from "./services/storageService";
