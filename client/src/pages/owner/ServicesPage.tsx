// src/pages/owner/ServicesPage.tsx
import React, { useEffect, useState } from "react";
import axios from "axios";

interface Service {
  id: string;
  name: string;
  duration: number;
  price: number;
  active: boolean;
}

const ServicesPage: React.FC = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [isNew, setIsNew] = useState(false);

    useEffect(() => {
    const fetchServices = async () => {
        try {
        const res = await axios.get("http://localhost:4000/api/services/owner", {
            withCredentials: true,
        });

        // Normalize backend → frontend
        const mapped = res.data.map((s: any) => ({
            id: s.serviceId,
            name: s.serviceName,
            duration: s.duration,
            price: s.price,
            active: s.isActive,
        }));

        setServices(mapped);
        } catch (err) {
        console.error("Error fetching services:", err);
        }
    };
    fetchServices();
    }, []);


  const deleteService = async (id: string) => {
    try {
      await axios.delete(`http://localhost:4000/api/services/${id}`, {
        withCredentials: true,
      });
      setServices((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      console.error("Error deleting service:", err);
    }
  };

  const handleEditChange = (field: keyof Service, value: any) => {
    if (!editingService) return;
    setEditingService({ ...editingService, [field]: value });
  };

  const saveService = async () => {
    if (!editingService) return;
    try {
      if (isNew) {
        // Create new service
        const res = await axios.post(
          `http://localhost:4000/api/services`,
          editingService,
          { withCredentials: true }
        );
        setServices((prev) => [...prev, res.data]);
      } else {
        // Update existing service
        const res = await axios.put(
          `http://localhost:4000/api/services/${editingService.id}`,
          editingService,
          { withCredentials: true }
        );
        setServices((prev) =>
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
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">My Services</h2>
        <button
          onClick={() => {
            setIsNew(true);
            setEditingService({ id: "", name: "", duration: 30, price: 0, active: true });
          }}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          + Add New Service
        </button>
      </div>

      {services.length === 0 ? (
        <p className="text-gray-500">No services added yet.</p>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {services.map((service) => (
            <div
              key={service.id}
              className="p-4 border rounded-lg bg-white shadow flex flex-col justify-between"
            >
              <div>
                <h3 className="font-semibold text-lg">{service.name}</h3>
                <p className="text-sm text-gray-600">{service.duration} mins</p>
                <p className="font-bold text-purple-600">KES {service.price}</p>
                <span
                  className={`inline-block mt-2 px-3 py-1 text-sm rounded-full ${
                    service.active
                      ? "bg-green-100 text-green-600"
                      : "bg-gray-200 text-gray-500"
                  }`}
                >
                  {service.active ? "Active" : "Inactive"}
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => {
                    setIsNew(false);
                    setEditingService(service);
                  }}
                  className="px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                >
                  Edit
                </button>
                <button
                  onClick={() => deleteService(service.id)}
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
              <div>
                <label className="block text-sm font-medium">Name</label>
                <input
                  type="text"
                  value={editingService.name}
                  onChange={(e) => handleEditChange("name", e.target.value)}
                  className="w-full p-2 border rounded"
                />
              </div>
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
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={editingService.active}
                  onChange={(e) => handleEditChange("active", e.target.checked)}
                />
                <label className="text-sm">Active</label>
              </div>
            </div>

            {/* Modal Buttons */}
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
