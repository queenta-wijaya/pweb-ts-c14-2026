// Logika Halaman Ambil Antrian (Kiosk Publik)

import {
    getActiveQueueTypes,
    getQueueTypeByCode,
    getTickets,
    createTicket,
    QueueType,
    PriorityLevel,
    QueueTicket
} from "./storage.js";

// Referensi Elemen DOM
const queueGrid = document.getElementById("queue-grid") as HTMLDivElement;
const emptyState = document.getElementById("empty-state") as HTMLDivElement;
const lastUpdateTimeEl = document.getElementById("last-update-time") as HTMLSpanElement;
const fullscreenBtn = document.getElementById("fullscreen-btn") as HTMLButtonElement;
const statusBanner = document.getElementById("status-banner") as HTMLDivElement;

// Elemen Modal Struk
const ticketModal = document.getElementById("ticket-modal") as HTMLDivElement;
const modalCloseX = document.getElementById("modal-close-x") as HTMLButtonElement;
const modalOkBtn = document.getElementById("modal-ok-btn") as HTMLButtonElement;
const modalPrintBtn = document.getElementById("modal-print-btn") as HTMLButtonElement;
const ticketServiceName = document.getElementById("ticket-service-name") as HTMLDivElement;
const ticketNumberDisplay = document.getElementById("ticket-number-display") as HTMLSpanElement;
const ticketPriorityDisplay = document.getElementById("ticket-priority-display") as HTMLSpanElement;
const ticketTimeDisplay = document.getElementById("ticket-time-display") as HTMLElement;
const ticketWaitingDisplay = document.getElementById("ticket-waiting-display") as HTMLElement;

// Cache state untuk mendeteksi perubahan data saat polling
let lastRenderedSnapshot = "";

// Format jam untuk footer: HH.mm.ss
function getFormattedCurrentTime(): string {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${pad(now.getHours())}.${pad(now.getMinutes())}.${pad(now.getSeconds())}`;
}

// Format tanggal jam lengkap untuk struk tiket
function formatTicketDateTime(isoString: string): string {
    const date = new Date(isoString);
    return date.toLocaleString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
    });
}

function getPriorityOrder(priority: PriorityLevel): number {
    const order: Record<PriorityLevel, number> = {
        "VIP": 0,
        "Disabilitas": 1,
        "Lansia": 2,
        "Normal": 3
    };
    return order[priority];
}

// Fungsi Render Kartu Layanan Aktif
function renderQueueCards(force = false): void {
    const activeTypes = getActiveQueueTypes();
    const snapshot = JSON.stringify(activeTypes);

    // Jangan render ulang jika data sama persis, agar tidak mengganggu klik pengguna
    if (!force && snapshot === lastRenderedSnapshot) {
        if (lastUpdateTimeEl) {
            lastUpdateTimeEl.textContent = getFormattedCurrentTime();
        }
        return;
    }

    lastRenderedSnapshot = snapshot;

    if (lastUpdateTimeEl) {
        lastUpdateTimeEl.textContent = getFormattedCurrentTime();
    }

    if (activeTypes.length === 0) {
        queueGrid.innerHTML = "";
        queueGrid.hidden = true;
        emptyState.hidden = false;
        return;
    }

    emptyState.hidden = true;
    queueGrid.hidden = false;
    queueGrid.innerHTML = "";

    activeTypes.forEach((type: QueueType) => {
        const card = document.createElement("div");
        card.className = "queue-card";
        card.setAttribute("data-code", type.code);

        card.innerHTML = `
            <div class="card-header">
                <span class="service-name"></span>
                <span class="service-code">${type.code}</span>
            </div>
            <div class="card-actions">
                <button type="button" class="btn-take-ticket" data-code="${type.code}" data-priority="Normal">
                    Ambil Nomor
                </button>
                <div class="priority-section">
                    <span class="priority-label">&#x25BE; Ambil dengan prioritas</span>
                    <div class="priority-button-group">
                        <button type="button" class="btn-priority" data-code="${type.code}" data-priority="Lansia">
                            Lansia
                        </button>
                        <button type="button" class="btn-priority" data-code="${type.code}" data-priority="Disabilitas">
                            Disabilitas
                        </button>
                        <button type="button" class="btn-priority" data-code="${type.code}" data-priority="VIP">
                            VIP
                        </button>
                    </div>
                </div>
            </div>
        `;
        card.querySelector(".service-name")!.textContent = type.name;

        queueGrid.appendChild(card);
    });
}

// Tampilkan Modal Struk Tiket
function showTicketReceipt(ticket: QueueTicket, typeName: string, waitingBefore: number): void {
    ticketServiceName.textContent = typeName;
    ticketNumberDisplay.textContent = ticket.ticketNumber;
    ticketPriorityDisplay.textContent = ticket.priority.toUpperCase();
    ticketPriorityDisplay.className = `receipt-priority-badge badge-${ticket.priority}`;
    ticketTimeDisplay.textContent = formatTicketDateTime(ticket.createdAt);
    ticketWaitingDisplay.textContent = `${waitingBefore} pasien`;

    ticketModal.hidden = false;
}

function closeTicketReceipt(): void {
    ticketModal.hidden = true;
}

// Handler Pengambilan Tiket
function handleTakeTicket(code: string, priority: PriorityLevel): void {
    const type = getQueueTypeByCode(code);
    if (!type || !type.isActive) {
        alert("Layanan antrean ini sedang tidak aktif.");
        renderQueueCards(true);
        return;
    }

    // Hitung berapa pasien yang sudah menunggu sebelum tiket ini dibuat
    const tickets = getTickets();
    const waitingBefore = tickets.filter(ticket =>
        ticket.queueTypeCode === code &&
        ticket.status === "Menunggu" &&
        (
            getPriorityOrder(ticket.priority) < getPriorityOrder(priority) ||
            (
                getPriorityOrder(ticket.priority) === getPriorityOrder(priority) &&
                new Date(ticket.createdAt).getTime() <= Date.now()
            )
        )
    ).length;

    // Terbitkan tiket baru melalui storage helper
    const ticket = createTicket(code, priority);
    if (ticket) {
        showTicketReceipt(ticket, type.name, waitingBefore);
    } else {
        alert("Gagal menerbitkan tiket. Silakan coba kembali.");
    }
}

// Event Delegation untuk tombol Ambil Tiket & Prioritas di dalam grid
queueGrid.addEventListener("click", (event: MouseEvent) => {
    const target = event.target as HTMLElement;
    const button = target.closest("button") as HTMLButtonElement | null;
    if (!button) return;

    const code = button.getAttribute("data-code");
    const priority = button.getAttribute("data-priority") as PriorityLevel | null;

    if (code && priority) {
        handleTakeTicket(code, priority);
    }
});

// Event Listener Modal Struk
if (modalCloseX) modalCloseX.addEventListener("click", closeTicketReceipt);
if (modalOkBtn) modalOkBtn.addEventListener("click", closeTicketReceipt);
if (ticketModal) {
    ticketModal.addEventListener("click", (e) => {
        if (e.target === ticketModal) {
            closeTicketReceipt();
        }
    });
}

if (modalPrintBtn) {
    modalPrintBtn.addEventListener("click", () => {
        window.print();
    });
}

// Toggle Layar Penuh (Fullscreen API)
function updateFullscreenBtnText(): void {
    const isFullscreen = !!document.fullscreenElement;
    if (fullscreenBtn) {
        fullscreenBtn.textContent = isFullscreen ? "Keluar Layar Penuh" : "Layar Penuh";
    }
}

if (fullscreenBtn) {
    fullscreenBtn.addEventListener("click", async () => {
        try {
            if (!document.fullscreenElement) {
                await document.documentElement.requestFullscreen();
            } else {
                if (document.exitFullscreen) {
                    await document.exitFullscreen();
                }
            }
        } catch (err) {
            console.warn("Fullscreen API tidak diizinkan atau tidak didukung:", err);
        }
    });
}

document.addEventListener("fullscreenchange", updateFullscreenBtnText);

// Polling interval setiap 2.5 detik untuk memperbarui jenis antrean jika admin menambah/mengubah
setInterval(() => {
    renderQueueCards();
}, 2500);

// Storage event listener untuk pembaruan instan antar-tab/jendela browser
window.addEventListener("storage", (e: StorageEvent) => {
    if (!e.key || e.key.includes("queue_types")) {
        renderQueueCards(true);
    }
});

// Inisialisasi awal saat halaman dimuat
document.addEventListener("DOMContentLoaded", () => {
    renderQueueCards(true);
    updateFullscreenBtnText();
});

// Fallback jika DOM sudah siap
if (document.readyState === "interactive" || document.readyState === "complete") {
    renderQueueCards(true);
    updateFullscreenBtnText();
}