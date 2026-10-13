"use strict";
function getSession() {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");
    const firstName = localStorage.getItem("firstName");
    if (!token || !role || !firstName) {
        return null;
    }
    return { token, role, firstName };
}
function requireAuth(allowedRoles) {
    const session = getSession();
    if (!session) {
        window.location.replace("login.html");
        return false;
    }
    if (allowedRoles &&
        !allowedRoles.includes(session.role.toLowerCase())) {
        window.location.replace("login.html");
        return false;
    }
    return true;
}
function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("firstName");
    localStorage.removeItem("username");
    window.location.replace("login.html");
}
window.QueueAuth = {
    getSession,
    requireAuth,
    logout
};
