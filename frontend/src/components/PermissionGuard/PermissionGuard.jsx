import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { getRequiredPermission, getStoredPermissions, isSuperAdmin } from "../../utils/permissionMap";

const PermissionGuard = ({ children, module: explicitModule }) => {
  const location = useLocation();
  const token = localStorage.getItem("adminToken");

  if (!token) {
    return <Navigate to="/admin" />;
  }

  if (isSuperAdmin()) {
    return children;
  }

  const permissions = getStoredPermissions();

  if (!permissions) {
    return children;
  }

  const requiredModule = explicitModule || getRequiredPermission(location.pathname);

  if (requiredModule === null) {
    return children;
  }

  if (permissions[requiredModule]?.view === true) {
    return children;
  }

  return <Navigate to="/admin/unauthorized" replace />;
};

export default PermissionGuard;
