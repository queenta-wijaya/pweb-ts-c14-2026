const sessionUser = document.getElementById("session-user") as HTMLSpanElement;
const roleHomeLink = document.getElementById("role-home-link") as HTMLAnchorElement;
const logoutButton = document.getElementById("public-logout-btn") as HTMLButtonElement;
const session = window.QueueAuth.getSession();

if (session) {
    const role = session.role.toLowerCase();
    const displayRole = session.role.charAt(0).toUpperCase() +
        session.role.slice(1).toLowerCase();
    sessionUser.textContent = `${session.firstName} | ${displayRole}`;
    sessionUser.hidden = false;
    logoutButton.hidden = false;

    if (role === "admin" || role === "moderator") {
        roleHomeLink.href = "index.html";
        roleHomeLink.textContent = "Dashboard Admin";
        roleHomeLink.hidden = false;
    }
}

logoutButton.addEventListener("click", () => {
    window.QueueAuth.logout();
});
