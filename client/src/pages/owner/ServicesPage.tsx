// src/pages/owner/ServicesPage.tsx
import React, { useEffect, useState } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";

interface BaseService {
  id: string;
  name: string;
  description?: string;
  category?: string;
  isActive: boolean;
}

interface SalonService {
  id: string; // salonService.id
  price: number;
  duration: number;
  service: BaseService; // base service details
}

const ServicesPage: React.FC = () => {
   const { salonId } = useParams();
  const [salonServices, setSalonServices] = useState<SalonService[]>([]);
  const [baseServices, setBaseServices] = useState<BaseService[]>([]);
  const [editingService, setEditingService] = useState<SalonService | null>(null);
  const [isNew, setIsNew] = useState(false);

  // Fetch both base services + salon services
  useEffect(() => {
    const fetchData = async () => {
      console.log("Fetching services for salonId:", salonId);
      if (!salonId) {
        console.error("No salonId provided in URL");
        return;
      }
      try {
        const [salonRes, baseRes] = await Promise.all([
          axios.get(`https://fahari-production.up.railway.app/api/salon-services/${salonId}`, {
            withCredentials: true,
          }),
          axios.get("https://fahari-production.up.railway.app/api/services", {
            withCredentials: true,
          }),
        ]);
        setSalonServices(salonRes.data);
        setBaseServices(baseRes.data);
      } catch (err) {
        console.error("Error fetching services:", err);
      }
    };
    fetchData();
  }, []);

  const deleteService = async (id: string) => {
    try {
      await axios.delete(`https://fahari-production.up.railway.app/api/salon-services/${id}`, {
        withCredentials: true,
      });
      setSalonServices((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      console.error("Error deleting service:", err);
    }
  };

  const handleEditChange = (field: "price" | "duration" | "serviceId", value: any) => {
    if (!editingService) return;

    if (field === "serviceId") {
      const selected = baseServices.find((b) => b.id === value);
      if (!selected) return;
      setEditingService({
        ...editingService,
        service: selected,
      });
    } else {
      setEditingService({
        ...editingService,
        [field]: value,
      });
    }
  };

  const saveService = async () => {
    if (!editingService) return;

    try {
      if (isNew) {
        // Create new salon service
        const res = await axios.post(
          "https://fahari-production.up.railway.app/api/salon-services",
          {
            serviceId: editingService.service.id, // base service id
            price: editingService.price,
            duration: editingService.duration,
          },
          { withCredentials: true }
        );
        setSalonServices((prev) => [...prev, res.data]);
      } else {
        // Update existing salon service
        const res = await axios.put(
          `https://fahari-production.up.railway.app/api/salon-services/${editingService.id}`,
          {
            price: editingService.price,
            duration: editingService.duration,
          },
          { withCredentials: true }
        );
        setSalonServices((prev) =>
          prev.map((s) => (s.id === editingService.id ? res.data : s))
        );
      }

      setEditingService(null);
      setIsNew(false);
    } catch (err) {
      console.error("Error saving service:", err);
    }
  };

  return (
    <div>
      <div className="mt-6 mb-4 ">
        <h2 className="text-2xl font-bold">My Services</h2>
        <br />
        <button
          onClick={() => {
            setIsNew(true);
            setEditingService({
              id: "",
              price: 0,
              duration: 30,
              service: { id: "", name: "", isActive: true },
            });
          }}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          + Add New Service
        </button>
      </div>

      {salonServices.length === 0 ? (
        <p className="text-gray-500">No services added yet.</p>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {salonServices.map((s) => (
            <div
              key={s.id}
              className="p-4 border rounded-lg bg-white shadow flex flex-col justify-between"
            >
              <div>
                <h3 className="font-semibold text-lg">{s.service.name}</h3>
                <p className="text-sm text-gray-600">{s.duration} mins</p>
                <p className="font-bold text-purple-600">KES {s.price}</p>
                <span
                  className={`inline-block mt-2 px-3 py-1 text-sm rounded-full ${
                    s.service.isActive
                      ? "bg-green-100 text-green-600"
                      : "bg-gray-200 text-gray-500"
                  }`}
                >
                  {s.service.isActive ? "Active" : "Inactive"}
                </span>
              </div>

              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => {
                    setIsNew(false);
                    setEditingService(s);
                  }}
                  className="px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                >
                  Edit
                </button>
                <button
                  onClick={() => deleteService(s.id)}
                  className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {editingService && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-md shadow-lg">
            <h3 className="text-xl font-bold mb-4">
              {isNew ? "Add New Service" : "Edit Service"}
            </h3>

            <div className="space-y-4">
              {isNew ? (
                <div>
                  <label className="block text-sm font-medium">Service</label>
                  <select
                    value={editingService.service.id}
                    onChange={(e) => handleEditChange("serviceId", e.target.value)}
                    className="w-full p-2 border rounded"
                  >
                    <option value="">Select a service</option>
                    {baseServices.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium">Service</label>
                  <input
                    type="text"
                    value={editingService.service.name}
                    disabled
                    className="w-full p-2 border rounded bg-gray-100"
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium">Duration (mins)</label>
                <input
                  type="number"
                  value={editingService.duration}
                  onChange={(e) =>
                    handleEditChange("duration", Number(e.target.value))
                  }
                  className="w-full p-2 border rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium">Price (KES)</label>
                <input
                  type="number"
                  value={editingService.price}
                  onChange={(e) =>
                    handleEditChange("price", Number(e.target.value))
                  }
                  className="w-full p-2 border rounded"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setEditingService(null);
                  setIsNew(false);
                }}
                className="px-4 py-2 border rounded hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={saveService}
                className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
              >
                {isNew ? "Create" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServicesPage;
