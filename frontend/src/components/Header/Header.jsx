import { Link, useLocation, useNavigate } from "react-router-dom";
import { Phone, Mail, Menu, X } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import "./Header.css";
import logo from "../../images/tgLOGO.png";
import igIcon from "../../images/R.png";
import tgIcon from "../../images/telegram_logo_icon_147228.png";
import fbIcon from "../../images/f_logo_RGB-Blue_1024.png";
import waIcon from "../../images/whatsapp-icon-3.png";
import quantPdf from "../../images/pdf/Important Concepts for CAT.pdf";
import varcPdf from "../../images/100 RC.pdf";
import LoginModal from "../LoginModal/LoginModal";
import SignupModal from "../SignupModal/SignupModal";

export default function Header({ user, setUser }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();
  const dropdownRef = useRef(null);
  const closeMenu = () => setIsMobileMenuOpen(false);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (user) {
      setCurrentUser(user);
    } else {
      const storedUser = localStorage.getItem("user");
      const token = localStorage.getItem("authToken");
      if (storedUser && token) {
        try {
          setCurrentUser(JSON.parse(storedUser));
        } catch (e) {
          setCurrentUser(null);
        }
      } else {
        setCurrentUser(null);
      }
    }
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowProfileDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
    setCurrentUser(null);
    if (setUser) setUser(null);
    setShowProfileDropdown(false);
    navigate("/");
  };

  const getInitials = (name) => {
    if (!name) return "U";
    return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
  };

  const isLoggedIn = !!currentUser && !!localStorage.getItem("authToken");

  return (
    <>
      <header className="header-wrapper">
        <div className="top-contact-bar">
          <div className="top-bar-container">
            <div className="contact-left">
              <div className="contact-item">
                <Phone className="contact-icon" />
                <span>9205534439</span>
              </div>
              <div className="contact-separator">|</div>
              <div className="contact-item">
                <Mail className="contact-icon" />
                <span>info@tathagat.co.in</span>
              </div>
            </div>
            <div className="social-icons-center">
              <a href="https://wa.me/919205534439?text=Hi%20TathaGat%2C%20I%27m%20interested%20in%20CAT%20prep." target="_blank" rel="noreferrer" aria-label="WhatsApp Chat">
                <img src={waIcon} alt="WhatsApp" className="social-img" />
              </a>
              <a href="https://www.instagram.com/tgtathagat/?hl=en" target="_blank" rel="noreferrer" aria-label="TathaGat Instagram">
                <img src={igIcon} alt="Instagram" className="social-img" />
              </a>
              <a href="https://t.me/freecatprep" target="_blank" rel="noreferrer" aria-label="TathaGat Telegram">
                <img src={tgIcon} alt="Telegram" className="social-img" />
              </a>
              <a href="https://www.facebook.com/TGTathaGat/" target="_blank" rel="noreferrer" aria-label="TathaGat Facebook">
                <img src={fbIcon} alt="Facebook" className="social-img" />
              </a>
            </div>
            <div className="download-right">
              <Link to="/AboutUs" className="download-link">About Us</Link>
              <Link to="/cat" className="download-link">CAT Syllabus & Strategy</Link>
              <Link to="/resource" className="download-link">Free CAT Study Material</Link>
              <a href={varcPdf} download className="download-link">100 RC Download</a>
              <a href={quantPdf} download className="download-link">Download CAT Quant Formula PDF</a>
            </div>
          </div>
        </div>

        <div className="main-navigation">
          <div className="nav-container">
            <div className="nav-content">
              <Link to="/" className="logo-link">
                <div className="flex items-center gap-2">
                  <img src={logo} alt="TathaCat Logo" className="logo-img" />
                </div>
              </Link>

              <nav className="desktop-nav">
                <Link to="/course-details" className="nav-link dropdown">
                  <span>Courses</span>
                  <svg className="dropdown-arrow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </Link>
                <Link to="/score-card" className="nav-link dropdown">
                  <span>Results</span>
                  <svg className="dropdown-arrow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </Link>
                <Link to="/team" className="nav-link">Faculty</Link>
                <Link to="/resource" className="nav-link dropdown">
                  <span>Resources</span>
                  <svg className="dropdown-arrow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </Link>
                <Link to="/mock-test" className="nav-link dropdown">
                  <span>Downloads</span>
                  <svg className="dropdown-arrow" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </Link>
                <Link to="/GetInTouch" className="nav-link">Contact</Link>
                <Link to="/ourBlog" className="nav-link">Blogs</Link>
              </nav>

              <div className="nav-actions">
                <Link to="/student/dashboard">
                  <button className="btn-white">Student LMS</button>
                </Link>
                <Link to="/image-gallery">
                  <button className="btn-white">Join Us Today</button>
                </Link>

                {isLoggedIn ? (
                  <div className="header-profile-wrapper" ref={dropdownRef}>
                    <button
                      className="header-profile-btn"
                      onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                    >
                      {currentUser.profilePic ? (
                        <img
                          src={currentUser.profilePic}
                          alt="Profile"
                          className="header-profile-img"
                        />
                      ) : (
                        <div className="header-profile-initials">
                          {getInitials(currentUser.name)}
                        </div>
                      )}
                    </button>
                    {showProfileDropdown && (
                      <div className="header-profile-dropdown">
                        <div className="header-profile-info">
                          <span className="header-profile-name">{currentUser.name || "User"}</span>
                          <span className="header-profile-phone">{currentUser.phoneNumber}</span>
                        </div>
                        <div className="header-profile-divider"></div>
                        <Link
                          to="/student/dashboard"
                          className="header-dropdown-item"
                          onClick={() => setShowProfileDropdown(false)}
                        >
                          Dashboard
                        </Link>
                        <Link
                          to="/student/profile"
                          className="header-dropdown-item"
                          onClick={() => setShowProfileDropdown(false)}
                        >
                          My Profile
                        </Link>
                        <div className="header-profile-divider"></div>
                        <button className="header-dropdown-logout" onClick={handleLogout}>
                          Logout
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <button className="btn-orange" onClick={() => setShowLoginModal(true)}>
                    Log In
                  </button>
                )}
              </div>

              <button
                className="mobile-menu-btn"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                {isMobileMenuOpen ? <X className="menu-icon" /> : <Menu className="menu-icon" />}
              </button>
            </div>

            {isMobileMenuOpen && (
              <div className="mobile-menu">
                <nav className="mobile-nav">
                  <Link to="/course-details" className="mobile-link" onClick={closeMenu}>Courses</Link>
                  <Link to="/score-card" className="mobile-link" onClick={closeMenu}>Results</Link>
                  <Link to="/team" className="mobile-link" onClick={closeMenu}>Faculty</Link>
                  <Link to="/resource" className="mobile-link" onClick={closeMenu}>Resources</Link>
                  <Link to="/mock-test" className="mobile-link" onClick={closeMenu}>Downloads</Link>
                  <Link to="/GetInTouch" className="mobile-link" onClick={closeMenu}>Contact</Link>
                  <Link to="/ourBlog" className="mobile-link" onClick={closeMenu}>Blogs</Link>
                  <div className="mobile-actions">
                    <Link to="/student/dashboard" onClick={closeMenu}>
                      <button className="mobile-btn-white">Student LMS</button>
                    </Link>
                    <Link to="/image-gallery" onClick={closeMenu}>
                      <button className="mobile-btn-orange">Join Us Today</button>
                    </Link>

                    {isLoggedIn ? (
                      <>
                        <div className="mobile-profile-section">
                          <div className="mobile-profile-info">
                            {currentUser.profilePic ? (
                              <img src={currentUser.profilePic} alt="Profile" className="mobile-profile-img" />
                            ) : (
                              <div className="mobile-profile-initials">{getInitials(currentUser.name)}</div>
                            )}
                            <span>{currentUser.name || "User"}</span>
                          </div>
                          <Link to="/student/profile" className="mobile-link" onClick={closeMenu}>My Profile</Link>
                          <button className="mobile-logout-btn" onClick={() => { closeMenu(); handleLogout(); }}>
                            Logout
                          </button>
                        </div>
                      </>
                    ) : (
                      <button
                        className="mobile-btn-orange"
                        onClick={() => { closeMenu(); setShowLoginModal(true); }}
                      >
                        Log In
                      </button>
                    )}
                  </div>
                </nav>
              </div>
            )}
          </div>
        </div>
      </header>

      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        setUser={(u) => { setCurrentUser(u); if (setUser) setUser(u); }}
        onSwitchToSignup={() => { setShowLoginModal(false); setShowSignupModal(true); }}
      />

      <SignupModal
        isOpen={showSignupModal}
        onClose={() => setShowSignupModal(false)}
        setUser={(u) => { setCurrentUser(u); if (setUser) setUser(u); }}
        onSwitchToLogin={() => { setShowSignupModal(false); setShowLoginModal(true); }}
      />
    </>
  );
}
