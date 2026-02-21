import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "../../../utils/axiosConfig";
import "./RoleLogin.css";

const RoleLogin = () => {
  const { roleSlug } = useParams();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [roleInfo, setRoleInfo] = useState(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const fetchRoleInfo = async () => {
      try {
        const res = await axios.get(`/api/admin/roles/by-slug/${roleSlug}`);
        if (res.data.success) {
          setRoleInfo(res.data.role);
        }
      } catch {
        setNotFound(true);
      }
    };
    fetchRoleInfo();
  }, [roleSlug]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await axios.post("/api/admin/admin-users/login", { email, password });

      if (res.data && res.data.token) {
        localStorage.setItem("adminToken", res.data.token);
        if (res.data.permissions) {
          localStorage.setItem("adminPermissions", JSON.stringify(res.data.permissions));
        }
        if (res.data.user) {
          localStorage.setItem("adminUser", JSON.stringify(res.data.user));
        }
        window.location.href = "/admin/dashboard";
      } else {
        throw new Error("No token received from server");
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || "Login failed";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (notFound) {
    return (
      <div className="role-login__container">
        <div className="role-login__left">
          <span className="role-login__brand">TathaGat</span>
        </div>
        <div className="role-login__right">
          <div className="role-login__form" style={{ textAlign: "center" }}>
            <h2>Page Not Found</h2>
            <p style={{ color: "#666", marginTop: "10px" }}>This login page does not exist.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="role-login__container">
      <div className="role-login__left">
        <span className="role-login__welcome">Welcome to</span>
        <span className="role-login__brand">{roleInfo?.name || "Panel"}</span>
      </div>
      <div className="role-login__right">
        <form className="role-login__form" onSubmit={handleSubmit}>
          <h2>{roleInfo?.name || "Login"}</h2>
          <input
            type="email"
            placeholder="Email"
            required
            className="role-login__input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            placeholder="Password"
            required
            className="role-login__input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button type="submit" className="role-login__button" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </button>
          {error && <p className="role-login__error">{error}</p>}
        </form>
      </div>
    </div>
  );
};

export default RoleLogin;
