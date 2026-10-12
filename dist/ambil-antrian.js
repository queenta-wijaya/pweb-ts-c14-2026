"use strict";
// Logika Halaman Ambil Antrian (Kiosk Publik)
(function () {
    // Referensi Elemen DOM
    const queueGrid = document.getElementById("queue-grid");
    const emptyState = document.getElementById("empty-state");
    const lastUpdateTimeEl = document.getElementById("last-update-time");
    const fullscreenBtn = document.getElementById("fullscreen-btn");
    const statusBanner = document.getElementById("status-banner");
    // Elemen Modal Struk
    const ticketModal = document.getElementById("ticket-modal");
    const modalCloseX = document.getElementById("modal-close-x");
    const modalOkBtn = document.getElementById("modal-ok-btn");
    const modalPrintBtn = document.getElementById("modal-print-btn");
    const ticketServiceName = document.getElementById("ticket-service-name");
    const ticketNumberDisplay = document.getElementById("ticket-number-display");
    const ticketPriorityDisplay = document.getElementById("ticket-priority-display");
    const ticketTimeDisplay = document.getElementById("ticket-time-display");
    const ticketWaitingDisplay = document.getElementById("ticket-waiting-display");
    // Cache state untuk mendeteksi perubahan data saat polling
    let lastRenderedSnapshot = "";
    // Format jam untuk footer: HH.mm.ss
    function getFormattedCurrentTime() {
        const now = new Date();
        const pad = (n) => String(n).padStart(2, "0");
        return `${pad(now.getHours())}.${pad(now.getMinutes())}.${pad(now.getSeconds())}`;
    }
    // Format tanggal jam lengkap untuk struk tiket
    function formatTicketDateTime(isoString) {
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
    // Fungsi Render Kartu Layanan Aktif
    function renderQueueCards(force = false) {
        if (!window.QueueStorage)
            return;
        const activeTypes = window.QueueStorage.getActiveQueueTypes();
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
        activeTypes.forEach((type) => {
            const card = document.createElement("div");
            card.className = "queue-card";
            card.setAttribute("data-code", type.code);
            card.innerHTML = `
                <div class="card-header">
                    <span class="service-name">${type.name}</span>
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
            queueGrid.appendChild(card);
        });
    }
    // Tampilkan Modal Struk Tiket
    function showTicketReceipt(ticket, typeName, waitingBefore) {
        ticketServiceName.textContent = typeName;
        ticketNumberDisplay.textContent = ticket.ticketNumber;
        ticketPriorityDisplay.textContent = ticket.priority.toUpperCase();
        ticketPriorityDisplay.className = `receipt-priority-badge badge-${ticket.priority}`;
        ticketTimeDisplay.textContent = formatTicketDateTime(ticket.createdAt);
        ticketWaitingDisplay.textContent = `${waitingBefore} pasien`;
        ticketModal.hidden = false;
    }
    function closeTicketReceipt() {
        ticketModal.hidden = true;
    }
    // Handler Pengambilan Tiket
    function handleTakeTicket(code, priority) {
        if (!window.QueueStorage)
            return;
        const type = window.QueueStorage.getQueueTypeByCode(code);
        if (!type || !type.isActive) {
            alert("Layanan antrean ini sedang tidak aktif.");
            renderQueueCards(true);
            return;
        }
        // Hitung berapa pasien yang sudah menunggu sebelum tiket ini dibuat
        const waitingBefore = window.QueueStorage.getWaitingTicketsCount(code);
        // Terbitkan tiket baru melalui storage helper
        const ticket = window.QueueStorage.createTicket(code, priority);
        if (ticket) {
            showTicketReceipt(ticket, type.name, waitingBefore);
        }
        else {
            alert("Gagal menerbitkan tiket. Silakan coba kembali.");
        }
    }
    // Event Delegation untuk tombol Ambil Tiket & Prioritas di dalam grid
    queueGrid.addEventListener("click", (event) => {
        const target = event.target;
        const button = target.closest("button");
        if (!button)
            return;
        const code = button.getAttribute("data-code");
        const priority = button.getAttribute("data-priority");
        if (code && priority) {
            handleTakeTicket(code, priority);
        }
    });
    // Event Listener Modal Struk
    if (modalCloseX)
        modalCloseX.addEventListener("click", closeTicketReceipt);
    if (modalOkBtn)
        modalOkBtn.addEventListener("click", closeTicketReceipt);
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
    function updateFullscreenBtnText() {
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
                }
                else {
                    if (document.exitFullscreen) {
                        await document.exitFullscreen();
                    }
                }
            }
            catch (err) {
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
    window.addEventListener("storage", (e) => {
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
})();
