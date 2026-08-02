import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import PrivateRoute from "./components/PrivateRoute";
import AdminRoute from "./components/AdminRoute";
import ReportFab from "./components/ReportFab";
import Home from "./pages/Home";
import AdminDashboard from "./pages/AdminDashboard";
import Categories from "./pages/Categories";
import CategoryPage from "./pages/CategoryPage";
import ProductPage from "./pages/ProductPage";
import Favorites from "./pages/Favorites";
import Profile from "./pages/Profile";
import Login from "./pages/Login";
import Register from "./pages/Register";
import CartPage from "./pages/CartPage";
import OrderHistory from "./pages/OrderHistory";
import SearchPage from "./pages/SearchPage";
import AdminEditItem from "./pages/AdminEditItem";
import Personal from "./pages/Personal";
import OrderDetails from "./pages/OrderDetails";
import AdminReports from "./pages/AdminReports";
import "./styles/App.css";


function App() {
  return (
    <Router>
      <Navbar />
      <ReportFab />
      <Routes>
        {/* Public */}
        <Route path="/" element={<Home />} />
        <Route path="/categories" element={<Categories />} />
        <Route path="/categories/:category" element={<CategoryPage />} />
        <Route path="/product/:id" element={<ProductPage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Admin edit/create */}
        <Route path="/admin/edit" element={<AdminEditItem />} />
        <Route path="/admin/edit/:id" element={<AdminEditItem />} />
        <Route path="/admin/new" element={<AdminEditItem />} />

        {/* Personal / account (ציבורי לטעינת דף, אך בפנים אתה מושך user; אם תרצה, אפשר גם כאן PrivateRoute) */}
        <Route path="/account" element={<Personal />} />


        <Route
  path="/admin/reports"
  element={
    <AdminRoute>
      <AdminReports />
    </AdminRoute>
  }
/>
        {/* Auth-only */}
        <Route
          path="/profile"
          element={
            <PrivateRoute>
              <Profile />
            </PrivateRoute>
          }
        />
        <Route
          path="/orders/:id"
          element={
            <PrivateRoute>
              <OrderDetails />
            </PrivateRoute>
          }
        />
        <Route
          path="/orders"
          element={
            <PrivateRoute>
              <OrderHistory />
            </PrivateRoute>
          }
        />
        <Route
          path="/favorites"
          element={
            <PrivateRoute>
              <Favorites />
            </PrivateRoute>
          }
        />
        <Route
          path="/cart"
          element={
            <PrivateRoute>
              <CartPage />
            </PrivateRoute>
          }
        />

        {/* Admin-only */}
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
