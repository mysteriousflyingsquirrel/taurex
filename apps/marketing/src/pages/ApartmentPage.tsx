import { useParams, Link } from "react-router-dom";

export default function ApartmentPage() {
  const { tenantSlug, apartmentSlug } = useParams();

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link to="/" className="text-xl font-bold tracking-tight text-indigo-600">
            taurex
          </Link>
          <Link
            to={`/${tenantSlug}`}
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            Back to {tenantSlug}
          </Link>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-6 py-16 text-center">
        <p className="text-sm font-medium text-indigo-600">{tenantSlug}</p>
        <h1 className="mt-2 text-4xl font-bold text-gray-900">{apartmentSlug}</h1>
        <p className="mt-4 text-lg text-gray-600">
          Apartment booking page. Details and booking form will appear here.
        </p>
        <div className="mx-auto mt-12 max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-left">
          <p className="text-sm text-gray-500 uppercase tracking-wide">Coming Soon</p>
          <p className="mt-2 text-gray-700">
            This page will show apartment details, photos, availability calendar,
            and a booking form for guests.
          </p>
        </div>
      </main>
    </div>
  );
}
