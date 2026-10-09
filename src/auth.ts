
interface UserSession {
    token: string;
    role: string;
    firstName: string;
}

interface QueueAuthAPI {
    getSession(): UserSession | null;
    requireAuth(allowedRoles?: string[]): boolean;
    logout(): void;
}

interface Window {
    QueueAuth: QueueAuthAPI;
}

function getSession(): UserSession | null {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");
    const firstName = localStorage.getItem("firstName");

    if (!token || !role || !firstName) {
        return null;
    }

    return { token, role, firstName };
}

function requireAuth(allowedRoles?: string[]): boolean {
    const session = getSession();

    if (!session) {
        window.location.replace("login.html");
        return false;
    }

    if (
        allowedRoles &&
        !allowedRoles.includes(session.role.toLowerCase())
    ) {
        window.location.replace("login.html");
        return false;
    }

    return true;
}

function logout(): void {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("firstName");

    window.location.replace("login.html");
}

window.QueueAuth = {
    getSession,
    requireAuth,
    logout
};