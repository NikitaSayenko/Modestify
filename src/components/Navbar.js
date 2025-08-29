import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import "../styles/Navbar.css";

function Navbar() {
const { firebaseUser, logout } = useAuth();
const { cart } = useCart();
const nav = useNavigate();

const handleLogout = async () => {
await logout();
nav("/");
};

return (
<nav className="navbar">
  <ul>
    <li><Link to="/">בית</Link></li>
    <li><Link to="/categories">קטגוריות</Link></li>
            <li><Link to="/favorites">מועדפים</Link></li>
      <li><Link to="/cart">🛒 עגלה ({cart.length})</Link></li>

      {/* right‑side auth links: */}
      {firebaseUser ? (
        <>
          <li><Link to="/profile">אזור אישי</Link></li>
           <Link to="/orders" style={{ marginLeft: 16 }}>היסטוריית הזמנות</Link>
          <li><button onClick={handleLogout} className="nav-button">התנתק</button></li>
        </>
      ) : (
        <>
          <li><Link to="/login">🔑 התחברות</Link></li>
          <li><Link to="/register">🚀 הרשמה</Link></li>
        </>
      )}
  </ul>
</nav>
);
}

export default Navbar;
