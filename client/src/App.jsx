// import FahariBeauty from "./FahariBeauty";
// export default function App() {
//   return <FahariBeauty />;
  
// }
// export default function App() {
//   return (
//     <div className="h-screen flex items-center justify-center bg-gradient-to-r from-purple-600 to-pink-600 text-white text-4xl font-bold">
//       Tailwind is Working 🎉
//     </div>
//   )
//}
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Signup from "./pages/Signup";
import Login from "./pages/Login";
import ClientDashboard from "./pages/ClientDashboard";
import OwnerDashboard from "./pages/OwnerDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import Notifications from "./pages/Notifications";
import CreateSalonForm from "./pages/owner/CreateSalonForm";
import SalonOwnerSalons from "./pages/owner/SalonsPage";
import { UserProvider } from './contexts/UserContext';

function App() {
  return (
    <UserProvider>
    <BrowserRouter>
      <Routes>
        <Route path="/signup" element={<Signup />} />
        <Route path="/" element={<Login />} />
        <Route path="/create-salon" element={<CreateSalonForm />} />
        <Route path="/client" element={<ClientDashboard />} />
        <Route path="/owner" element={<OwnerDashboard />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/owner/salons" element={<SalonOwnerSalons />} />
      </Routes>
    </BrowserRouter>
    </UserProvider>
  );
}

export default App;
