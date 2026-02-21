import React, { useState, useEffect } from "react";
import axios from "axios";
import AdminLayout from "../AdminLayout/AdminLayout";
import "./UpiSettings.css";

const UpiSettings = () => {
  const [upiId, setUpiId] = useState("");
  const [qrPreview, setQrPreview] = useState("");
  const [qrFile, setQrFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });

  const getToken = () => localStorage.getItem("adminToken");

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await axios.get("/api/manual-payment/upi-settings/admin", {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.data.success && res.data.settings) {
        setUpiId(res.data.settings.upiId || "");
        setQrPreview(res.data.settings.qrCodeImage || "");
      }
    } catch (err) {
      console.error("Failed to fetch UPI settings", err);
    } finally {
      setLoading(false);
    }
  };

  const handleQrChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setQrFile(file);
      setQrPreview(URL.createObjectURL(file));
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!upiId.trim()) {
      setMessage({ text: "Please enter a UPI ID", type: "error" });
      return;
    }

    setSaving(true);
    setMessage({ text: "", type: "" });

    try {
      const formData = new FormData();
      formData.append("upiId", upiId.trim());
      if (qrFile) formData.append("qrCodeImage", qrFile);

      const res = await axios.post("/api/manual-payment/upi-settings", formData, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
          "Content-Type": "multipart/form-data",
        },
      });

      if (res.data.success) {
        setMessage({ text: "UPI settings saved successfully!", type: "success" });
        if (res.data.settings?.qrCodeImage) {
          setQrPreview(res.data.settings.qrCodeImage);
        }
        setQrFile(null);
      }
    } catch (err) {
      setMessage({ text: err.response?.data?.message || "Failed to save settings", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="upi-settings-page">
          <p>Loading...</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="upi-settings-page">
        <div className="upi-settings-header">
          <h2>UPI Payment Settings</h2>
          <p>Configure UPI ID and QR code for manual payment collection</p>
        </div>

        {message.text && (
          <div className={`upi-settings-msg ${message.type}`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSave} className="upi-settings-form">
          <div className="upi-settings-card">
            <div className="upi-form-row">
              <label>UPI ID</label>
              <input
                type="text"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                placeholder="e.g. yourname@upi or yourname@paytm"
                className="upi-settings-input"
              />
            </div>

            <div className="upi-form-row">
              <label>QR Code Image</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleQrChange}
                className="upi-settings-file"
              />
              {qrPreview && (
                <div className="upi-qr-preview">
                  <img src={qrPreview} alt="QR Code Preview" />
                </div>
              )}
            </div>

            <button type="submit" className="upi-settings-save" disabled={saving}>
              {saving ? "Saving..." : "Save Settings"}
            </button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
};

export default UpiSettings;
