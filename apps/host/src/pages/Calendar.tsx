import { useNavigate } from "react-router-dom";
import PageHeader from "../components/PageHeader";
import Button from "../components/Button";

export default function Calendar() {
  const navigate = useNavigate();

  return (
    <div>
      <PageHeader title="Calendar" />

      <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-8 text-center">
        <p className="text-gray-600">
          The availability calendar will be available in a future update.
        </p>
        <p className="mt-2 text-sm text-gray-400">
          This page will display a Gantt-style overview of all apartments and
          their booking status from external iCal feeds.
        </p>
        <div className="mt-4">
          <Button variant="secondary" onClick={() => navigate("/apartments")}>Go to Apartments</Button>
        </div>
      </div>
    </div>
  );
}
