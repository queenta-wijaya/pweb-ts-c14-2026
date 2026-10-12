import {
    getActiveQueueTypes,
    getQueueTypeByCode,
    getTickets,
    saveTickets,
    createTicket,
    QueueType,
    QueueTicket,
    PriorityLevel,
    TicketStatus
} from "./storage.js";

const allowedRoles = ["admin", "moderator", "operator"];
const currentRole = localStorage.getItem("role");
const token = localStorage.getItem("token");
if (!token || !currentRole || !allowedRoles.includes(currentRole)) {
    window.location.href = "login.html";
}

const operatorNameEl = document.getElementById("operator-name") as HTMLSpanElement;
const logoutBtn = document.getElementById("logout-btn") as HTMLButtonElement;
const currentTicketDisplay = document.getElementById("current-ticket-display") as HTMLDivElement;
const currentTicketContent = document.getElementById("current-ticket-content") as HTMLDivElement;
const currentTicketNumber = document.getElementById("current-ticket-number") as HTMLDivElement;
const currentTicketService = document.getElementById("current-ticket-service") as HTMLSpanElement;
const currentTicketPriority = document.getElementById("current-ticket-priority") as HTMLSpanElement;
const currentTicketTime = document.getElementById("current-ticket-time") as HTMLDivElement;
const callNextBtn = document.getElementById("call-next-btn") as HTMLButtonElement;
const finishBtn = document.getElementById("finish-btn") as HTMLButtonElement;
const skipBtn = document.getElementById("skip-btn") as HTMLButtonElement;
const manualTicketForm = document.getElementById("manual-ticket-form") as HTMLFormElement;
const manualQueueSelect = document.getElementById("manual-queue-select") as HTMLSelectElement;
const manualPrioritySelect = document.getElementById("manual-priority-select") as HTMLSelectElement;
const waitingSummary = document.getElementById("waiting-summary") as HTMLDivElement;
const toast = document.getElementById("toast") as HTMLDivElement;

let currentTicket: QueueTicket | null = null;

function showToast(message: string, type: "success" | "error" | "info" | "warning" = "info"): void {
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.classList.remove("hidden");
    setTimeout(() => toast.classList.add("hidden"), 3000);
}

function showOperatorName(): void {
    const firstName = localStorage.getItem("firstName");
    if (firstName) {
        operatorNameEl.textContent = firstName;
    }
}

function logout(): void {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("firstName");
    window.location.href = "login.html";
}

function formatDateTime(isoString: string): string {
    const date = new Date(isoString);
    return date.toLocaleString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        day: "numeric",
        month: "short",
        year: "numeric"
    });
}

function getPriorityOrder(priority: PriorityLevel): number {
    const order: Record<PriorityLevel, number> = {
        "VIP": 0,
        "Disabilitas": 1,
        "Lansia": 2,
        "Normal": 3
    };
    return order[priority] ?? 4;
}

function findNextTicket(): QueueTicket | null {
    const tickets = getTickets();
    const waitingTickets = tickets.filter(t => t.status === "Menunggu");

    if (waitingTickets.length === 0) {
        return null;
    }

    waitingTickets.sort((a, b) => {
        const priorityDiff = getPriorityOrder(a.priority) - getPriorityOrder(b.priority);
        if (priorityDiff !== 0) return priorityDiff;
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

    return waitingTickets[0];
}

function updateCurrentTicketDisplay(): void {
    if (currentTicket) {
        currentTicketDisplay.classList.remove("empty");
        currentTicketContent.classList.remove("hidden");

        currentTicketNumber.textContent = currentTicket.ticketNumber;
        const type = getQueueTypeByCode(currentTicket.queueTypeCode);
        currentTicketService.textContent = type?.name ?? currentTicket.queueTypeCode;
        currentTicketPriority.textContent = currentTicket.priority;
        currentTicketPriority.className = `ticket-priority priority-${currentTicket.priority.toLowerCase()}`;
        currentTicketTime.textContent = `Dipanggil pada: ${formatDateTime(currentTicket.calledAt || new Date().toISOString())}`;

        callNextBtn.disabled = true;
        finishBtn.disabled = false;
        skipBtn.disabled = false;
    } else {
        currentTicketDisplay.classList.add("empty");
        currentTicketContent.classList.add("hidden");

        callNextBtn.disabled = false;
        finishBtn.disabled = true;
        skipBtn.disabled = true;
    }
}

function callNextTicket(): void {
    const nextTicket = findNextTicket();
    if (!nextTicket) {
        showToast("Tidak ada tiket menunggu di semua antrean", "info");
        return;
    }

    const tickets = getTickets();
    const ticketIndex = tickets.findIndex(t => t.id === nextTicket.id);
    if (ticketIndex === -1) {
        showToast("Tiket tidak ditemukan", "error");
        return;
    }

    tickets[ticketIndex].status = "Dipanggil";
    tickets[ticketIndex].calledAt = new Date().toISOString();
    saveTickets(tickets);

    currentTicket = tickets[ticketIndex];
    updateCurrentTicketDisplay();
    renderWaitingSummary();

    const type = getQueueTypeByCode(currentTicket.queueTypeCode);
    showToast(`Memanggil ${currentTicket.ticketNumber} (${currentTicket.priority}) - ${type?.name}`, "success");
}

function finishCurrentTicket(): void {
    if (!currentTicket) return;
    const ticket = currentTicket;

    const tickets = getTickets();
    const ticketIndex = tickets.findIndex(t => t.id === ticket.id);
    if (ticketIndex !== -1) {
        tickets[ticketIndex].status = "Selesai";
        saveTickets(tickets);
    }

    showToast(`Tiket ${ticket.ticketNumber} selesai`, "success");
    currentTicket = null;
    updateCurrentTicketDisplay();
    renderWaitingSummary();
}

function skipCurrentTicket(): void {
    if (!currentTicket) return;
    const ticket = currentTicket;

    const tickets = getTickets();
    const ticketIndex = tickets.findIndex(t => t.id === ticket.id);
    if (ticketIndex !== -1) {
        tickets[ticketIndex].status = "Dilewati";
        saveTickets(tickets);
    }

    showToast(`Tiket ${ticket.ticketNumber} dilewati`, "warning");
    currentTicket = null;
    updateCurrentTicketDisplay();
    renderWaitingSummary();
}

function renderWaitingSummary(): void {
    const activeTypes = getActiveQueueTypes();
    const tickets = getTickets();

    if (activeTypes.length === 0) {
        waitingSummary.innerHTML = `
            <div class="empty-state">
                <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>
                </svg>
                <p>Belum ada jenis antrean aktif</p>
            </div>
        `;
        return;
    }

    let hasWaiting = false;
    const summaryItems = activeTypes.map(type => {
        const waitingByPriority: Record<PriorityLevel, number> = {
            "VIP": 0,
            "Disabilitas": 0,
            "Lansia": 0,
            "Normal": 0
        };

        tickets.filter(t => t.queueTypeCode === type.code && t.status === "Menunggu")
            .forEach(t => waitingByPriority[t.priority]++);

        const total = waitingByPriority.VIP + waitingByPriority.Disabilitas + waitingByPriority.Lansia + waitingByPriority.Normal;
        if (total > 0) hasWaiting = true;

        return `
            <div class="waiting-item">
                <div class="waiting-item-header">
                    <span class="waiting-service">${type.name}</span>
                    <span class="waiting-code">${type.code}</span>
                </div>
                <div class="waiting-counts">
                    ${waitingByPriority.VIP > 0 ? `
                        <div class="waiting-count-row">
                            <span class="waiting-count-label">VIP</span>
                            <span class="waiting-count-value priority-vip">${waitingByPriority.VIP}</span>
                        </div>` : ""}
                    ${waitingByPriority.Disabilitas > 0 ? `
                        <div class="waiting-count-row">
                            <span class="waiting-count-label">Disabilitas</span>
                            <span class="waiting-count-value priority-disabilitas">${waitingByPriority.Disabilitas}</span>
                        </div>` : ""}
                    ${waitingByPriority.Lansia > 0 ? `
                        <div class="waiting-count-row">
                            <span class="waiting-count-label">Lansia</span>
                            <span class="waiting-count-value priority-lansia">${waitingByPriority.Lansia}</span>
                        </div>` : ""}
                    ${waitingByPriority.Normal > 0 ? `
                        <div class="waiting-count-row">
                            <span class="waiting-count-label">Normal</span>
                            <span class="waiting-count-value priority-normal">${waitingByPriority.Normal}</span>
                        </div>` : ""}
                    <div class="waiting-count-row waiting-total">
                        <span class="waiting-count-label">Total</span>
                        <span class="waiting-count-value">${total}</span>
                    </div>
                </div>
            </div>
        `;
    }).join("");

    if (!hasWaiting) {
        waitingSummary.innerHTML = `
            <div class="empty-state">
                <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>
                </svg>
                <p>Semua antrean kosong</p>
                <p style="font-size: 0.85rem;">Tidak ada pasien menunggu saat ini</p>
            </div>
        `;
    } else {
        waitingSummary.innerHTML = `<div class="waiting-grid">${summaryItems}</div>`;
    }
}

function populateManualQueueSelect(): void {
    const activeTypes = getActiveQueueTypes();
    manualQueueSelect.innerHTML = '<option value="">-- Pilih Jenis Antrean --</option>';
    activeTypes.forEach(type => {
        const option = document.createElement("option");
        option.value = type.code;
        option.textContent = `${type.name} (${type.code})`;
        manualQueueSelect.appendChild(option);
    });
}

function loadExistingCalledTicket(): void {
    const tickets = getTickets();
    const calledTickets = tickets.filter(t => t.status === "Dipanggil");
    if (calledTickets.length > 0) {
        calledTickets.sort((a, b) => new Date(b.calledAt || "").getTime() - new Date(a.calledAt || "").getTime());
        currentTicket = calledTickets[0];
        updateCurrentTicketDisplay();
    }
}

callNextBtn.addEventListener("click", callNextTicket);
finishBtn.addEventListener("click", finishCurrentTicket);
skipBtn.addEventListener("click", skipCurrentTicket);

manualTicketForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const queueTypeCode = manualQueueSelect.value;
    const priority = manualPrioritySelect.value as PriorityLevel;

    if (!queueTypeCode) {
        showToast("Pilih jenis antrean terlebih dahulu", "error");
        return;
    }

    const ticket = createTicket(queueTypeCode, priority);
    if (ticket) {
        renderWaitingSummary();
        populateManualQueueSelect();
        showToast(`Tiket ${ticket.ticketNumber} (${priority}) berhasil diterbitkan`, "success");
        manualQueueSelect.value = "";
        manualPrioritySelect.value = "Normal";
    } else {
        showToast("Gagal menerbitkan tiket. Jenis antrean mungkin tidak aktif.", "error");
    }
});

logoutBtn.addEventListener("click", logout);

window.addEventListener("storage", (e: StorageEvent) => {
    if (!e.key || e.key.includes("queue")) {
        loadExistingCalledTicket();
        renderWaitingSummary();
        populateManualQueueSelect();
    }
});

setInterval(() => {
    loadExistingCalledTicket();
    renderWaitingSummary();
}, 3000);

showOperatorName();
populateManualQueueSelect();
loadExistingCalledTicket();
renderWaitingSummary();
updateCurrentTicketDisplay();