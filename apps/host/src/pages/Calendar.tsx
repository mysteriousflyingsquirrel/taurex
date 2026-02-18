import { Link } from "react-router-dom";

export default function Calendar() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Calendar</h1>
      <p className="mt-1 text-sm text-gray-600">
        Read-only availability overview from iCal feeds.
      </p>

      <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-8 text-center">
        <p className="text-gray-600">
          The availability calendar will be available in a future update.
        </p>
        <p className="mt-2 text-sm text-gray-400">
          This page will display a Gantt-style overview of all apartments and
          their booking status from external iCal feeds.
        </p>
        <Link
          to="/apartments"
          className="mt-4 inline-block text-sm font-medium text-indigo-600 hover:text-indigo-700"
        >
          Go to Apartments →
        </Link>
      </div>
    </div>
  );
}
