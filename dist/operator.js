import { getActiveQueueTypes, getQueueTypeByCode, getTickets, saveTickets } from "./storage.js";
const allowedRoles = ["admin", "moderator", "operator", "user"];
const currentRole = localStorage.getItem("role");
const token = localStorage.getItem("token");
if (!token || !currentRole || !allowedRoles.includes(currentRole)) {
    window.location.href = "login.html";
}
const operatorNameEl = document.getElementById("operator-name");
const logoutBtn = document.getElementById("logout-btn");
const operatorGrid = document.getElementById("operator-grid");
const toast = document.getElementById("toast");
function showToast(message, type = "info") {
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.classList.remove("hidden");
    setTimeout(() => toast.classList.add("hidden"), 3000);
}
function showOperatorName() {
    const firstName = localStorage.getItem("firstName");
    if (firstName) {
        operatorNameEl.textContent = firstName;
    }
}
function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("firstName");
    window.location.href = "login.html";
}
function getPriorityOrder(priority) {
    const order = {
        "VIP": 0,
        "Disabilitas": 1,
        "Lansia": 2,
        "Normal": 3
    };
    return order[priority] ?? 4;
}
function getPriorityLabel(priority) {
    const labels = {
        "VIP": "Prioritas VIP",
        "Disabilitas": "Prioritas Disabilitas",
        "Lansia": "Prioritas Lansia",
        "Normal": "Prioritas Normal"
    };
    return labels[priority] ?? "Prioritas Normal";
}
function renderOperatorGrid() {
    const activeTypes = getActiveQueueTypes();
    const tickets = getTickets();
    if (activeTypes.length === 0) {
        operatorGrid.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1;">
                <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>
                </svg>
                <p>Belum ada poli/loket aktif</p>
                <p style="font-size: 0.85rem;">Silakan tambah jenis antrean dari Dashboard Admin</p>
            </div>
        `;
        return;
    }
    operatorGrid.innerHTML = activeTypes.map(type => {
        const poliTickets = tickets.filter(t => t.queueTypeCode === type.code);
        const waitingTickets = poliTickets.filter(t => t.status === "Menunggu");
        const calledTicket = poliTickets.find(t => t.status === "Dipanggil");
        waitingTickets.sort((a, b) => {
            const priorityDiff = getPriorityOrder(a.priority) - getPriorityOrder(b.priority);
            if (priorityDiff !== 0)
                return priorityDiff;
            return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        });
        const nextTicket = waitingTickets[0] || null;
        const waitingCount = waitingTickets.length;
        return `
            <section class="card poli-card" data-poli-code="${type.code}">
                <div class="poli-card-header">
                    <h3>${type.name} (${type.code})</h3>
                    <span class="waiting-badge">${waitingCount} menunggu</span>
                </div>
                <div class="poli-card-body">
                    <div class="poli-column">
                        <span class="poli-column-label">SEDANG DIPANGGIL</span>
                        <div class="poli-current-ticket">
                            ${calledTicket
            ? `<span class="ticket-number-display">${calledTicket.ticketNumber}</span>`
            : `<span class="ticket-empty">-</span>`}
                        </div>
                    </div>
                    <div class="poli-column">
                        <span class="poli-column-label">BERIKUTNYA</span>
                        <div class="poli-next-ticket">
                            ${nextTicket
            ? `<span class="ticket-number-display">${nextTicket.ticketNumber}</span>
                                   <span class="priority-label priority-${nextTicket.priority.toLowerCase()}">${getPriorityLabel(nextTicket.priority)}</span>`
            : `<span class="ticket-empty">-</span>`}
                        </div>
                    </div>
                    <div class="poli-actions">
                        <button class="btn btn-primary call-next-btn" ${!nextTicket ? "disabled" : ""} data-poli-code="${type.code}">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="btn-icon">
                                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 11l-4 4m4-4H7m4-4v4"/>
                            </svg>
                            <span>Panggil Berikutnya</span>
                        </button>
                        <button class="btn btn-success finish-btn" ${!calledTicket ? "disabled" : ""} data-poli-code="${type.code}">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="btn-icon">
                                <path d="M20 6L9 17l-5-5"/>
                            </svg>
                            <span>Selesai</span>
                        </button>
                    </div>
                </div>
            </section>
        `;
    }).join("");
    attachEventListeners();
}
function attachEventListeners() {
    document.querySelectorAll(".call-next-btn").forEach(btn => {
        btn.addEventListener("click", handleCallNext);
    });
    document.querySelectorAll(".finish-btn").forEach(btn => {
        btn.addEventListener("click", handleFinish);
    });
}
function handleCallNext(e) {
    const btn = e.currentTarget;
    const poliCode = btn.dataset.poliCode;
    if (!poliCode)
        return;
    const tickets = getTickets();
    const waitingTickets = tickets.filter(t => t.queueTypeCode === poliCode && t.status === "Menunggu");
    if (waitingTickets.length === 0) {
        showToast("Tidak ada tiket menunggu di poli ini", "info");
        return;
    }
    waitingTickets.sort((a, b) => {
        const priorityDiff = getPriorityOrder(a.priority) - getPriorityOrder(b.priority);
        if (priorityDiff !== 0)
            return priorityDiff;
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });
    const nextTicket = waitingTickets[0];
    const ticketIndex = tickets.findIndex(t => t.id === nextTicket.id);
    if (ticketIndex === -1) {
        showToast("Tiket tidak ditemukan", "error");
        return;
    }
    tickets[ticketIndex].status = "Dipanggil";
    tickets[ticketIndex].calledAt = new Date().toISOString();
    saveTickets(tickets);
    const type = getQueueTypeByCode(poliCode);
    showToast(`Memanggil ${nextTicket.ticketNumber} (${getPriorityLabel(nextTicket.priority)}) - ${type?.name}`, "success");
    renderOperatorGrid();
}
function handleFinish(e) {
    const btn = e.currentTarget;
    const poliCode = btn.dataset.poliCode;
    if (!poliCode)
        return;
    const tickets = getTickets();
    const calledTicket = tickets.find(t => t.queueTypeCode === poliCode && t.status === "Dipanggil");
    if (!calledTicket) {
        showToast("Tidak ada tiket yang sedang dipanggil", "info");
        return;
    }
    const ticketIndex = tickets.findIndex(t => t.id === calledTicket.id);
    if (ticketIndex !== -1) {
        tickets[ticketIndex].status = "Selesai";
        saveTickets(tickets);
    }
    showToast(`Tiket ${calledTicket.ticketNumber} selesai`, "success");
    renderOperatorGrid();
}
logoutBtn.addEventListener("click", logout);
window.addEventListener("storage", (e) => {
    if (!e.key || e.key.includes("queue")) {
        renderOperatorGrid();
    }
});
setInterval(() => {
    renderOperatorGrid();
}, 3000);
showOperatorName();
renderOperatorGrid();
