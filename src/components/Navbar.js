import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import useUserRole from "../hooks/useUserRole";
import "../styles/Navbar.css";
import SearchBar from "../components/SearchBar";

function Navbar() {
  const { firebaseUser, logout } = useAuth();
  const { cart } = useCart();
  const { isAdmin } = useUserRole();
  const nav = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      nav("/");
    } catch (e) {
      console.error("Logout failed:", e);
    }
  };

  const cartCount = Array.isArray(cart)
    ? cart.reduce((sum, it) => sum + Number(it.quantity || 1), 0)
    : 0;

  return (
    <header className="header">
      <nav className="navbar">
        <div className="nav-left">
          <Link to="/" className="brand-link">
            <img
              src="/images/logo.png"
              alt="Modestify logo"
              className="brand-logo"
              width="28"
              height="28"
            />
            <span className="brand-text">Modestify</span>
          </Link>

          <ul className="nav-links">
            <li><Link to="/" className="btn-ghost">בית</Link></li>
            <li><Link to="/categories" className="btn-ghost">קטגוריות</Link></li>
            {isAdmin && <li><Link to="/admin" className="btn-ghost">אדמין</Link></li>}
          </ul>
        </div>

        <div className="nav-right">
          <div className="search-wrap">
            <SearchBar inputClassName="search-input" />
          </div>

          {firebaseUser ? (
            <>
              <Link to="/cart" className="btn-ghost cart-link">
                עגלה{cartCount > 0 ? <span className="cart-count"> ({cartCount})</span> : ""}
              </Link>
              <Link to="/account" className="btn-ghost">אזור אישי</Link>
              <Link to="/favorites" className="btn-ghost">מועדפים</Link>
              <Link to="/orders" className="btn-ghost">הזמנות</Link>
              <button onClick={handleLogout} className="btn-solid">התנתק</button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn-ghost">התחברות</Link>
              <Link to="/register" className="btn-solid">הרשמה</Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}

export default Navbar;
