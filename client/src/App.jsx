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

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/signup" element={<Signup />} />
        <Route path="/" element={<Login />} />

        <Route path="/client" element={<ClientDashboard />} />
        <Route path="/owner" element={<OwnerDashboard />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/notifications" element={<Notifications />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
