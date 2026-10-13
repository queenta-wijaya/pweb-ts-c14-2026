// Logika Layar Antrian Publik (Monitor Display)
import { getActiveQueueTypes, getCalledTicket, getWaitingTicketsCount } from "./storage.js";
(function () {
    // Referensi Elemen DOM
    const displayGrid = document.getElementById("display-grid");
    const emptyState = document.getElementById("empty-state");
    const lastUpdateTimeEl = document.getElementById("last-update-time");
    const fullscreenBtn = document.getElementById("fullscreen-btn");
    const latestCallBanner = document.getElementById("latest-call-banner");
    const latestCallText = document.getElementById("latest-call-text");
    // State Pelacakan Panggilan untuk Audio & Animasi
    // Menyimpan { [kodeLayanan]: nomorTiketTerakhirYangDipanggil }
    const lastCalledTicketMap = new Map();
    let isInitialLoad = true;
    // Format Jam: HH.mm.ss (sesuai dokumen soal)
    function getFormattedCurrentTime() {
        const now = new Date();
        const pad = (n) => String(n).padStart(2, "0");
        return `${pad(now.getHours())}.${pad(now.getMinutes())}.${pad(now.getSeconds())}`;
    }
    // Render Tampilan Monitor Antrean
    function renderDisplayMonitor() {
        const activeTypes = getActiveQueueTypes();
        if (lastUpdateTimeEl) {
            lastUpdateTimeEl.textContent = getFormattedCurrentTime();
        }
        if (activeTypes.length === 0) {
            displayGrid.innerHTML = "";
            displayGrid.hidden = true;
            emptyState.hidden = false;
            return;
        }
        emptyState.hidden = true;
        displayGrid.hidden = false;
        let newlyCalledTicket = null;
        // Render atau update tiap kartu layanan
        displayGrid.innerHTML = "";
        for (const type of activeTypes) {
            const calledTicket = getCalledTicket(type.code);
            const waitingCount = getWaitingTicketsCount(type.code);
            const card = document.createElement("div");
            card.className = "display-card";
            card.setAttribute("data-code", type.code);
            // Cek apakah nomor yang dipanggil berbeda dari sebelumnya
            const previousCalledNum = lastCalledTicketMap.get(type.code);
            const currentCalledNum = calledTicket ? calledTicket.ticketNumber : "";
            let hasNewCall = false;
            if (!isInitialLoad && currentCalledNum && currentCalledNum !== previousCalledNum) {
                hasNewCall = true;
                newlyCalledTicket = { ticket: calledTicket, type };
            }
            // Simpan status pemanggilan saat ini
            lastCalledTicketMap.set(type.code, currentCalledNum);
            if (calledTicket) {
                card.classList.add("is-active-calling");
                if (hasNewCall) {
                    card.classList.add("newly-called");
                }
                card.innerHTML = `
                    <div class="card-header">
                        <span class="service-name"></span>
                        <span class="service-code">${type.code}</span>
                    </div>
                    <div class="card-body">
                        <div class="call-status-badge">
                            <span class="call-dot"></span> DIPANGGIL
                        </div>
                        <div class="called-number">${calledTicket.ticketNumber}</div>
                        <span class="priority-tag ${calledTicket.priority}">
                            Prioritas: ${calledTicket.priority}
                        </span>
                    </div>
                    <div class="card-footer">
                        <span>${waitingCount} tiket menunggu</span>
                    </div>
                `;
            }
            else {
                card.innerHTML = `
                    <div class="card-header">
                        <span class="service-name"></span>
                        <span class="service-code">${type.code}</span>
                    </div>
                    <div class="card-body">
                        <div class="idle-text">Belum ada nomor dipanggil</div>
                        <div class="idle-subtext">Nomor akan muncul setelah operator memanggil tiket.</div>
                    </div>
                    <div class="card-footer">
                        <span>${waitingCount} tiket menunggu</span>
                    </div>
                `;
            }
            card.querySelector(".service-name").textContent = type.name;
            displayGrid.appendChild(card);
        }
        // Tampilkan notifikasi visual jika ada tiket baru yang dipanggil.
        if (newlyCalledTicket) {
            const { ticket, type } = newlyCalledTicket;
            if (latestCallBanner && latestCallText) {
                latestCallText.textContent = `Nomor ${ticket.ticketNumber} (${ticket.priority}) menuju ${type.name}`;
                latestCallBanner.hidden = false;
            }
        }
        isInitialLoad = false;
    }
    // Toggle Fullscreen API
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
    // Polling Interval setiap 2 detik (sesuai spesifikasi soal: interval 2–3 detik)
    setInterval(() => {
        renderDisplayMonitor();
    }, 2000);
    // Storage event listener untuk respons instan ketika operator memanggil tiket di tab lain
    window.addEventListener("storage", (e) => {
        if (!e.key || e.key.includes("queue")) {
            renderDisplayMonitor();
        }
    });
    // Inisialisasi awal saat halaman siap
    document.addEventListener("DOMContentLoaded", () => {
        renderDisplayMonitor();
        updateFullscreenBtnText();
    });
    if (document.readyState === "interactive" || document.readyState === "complete") {
        renderDisplayMonitor();
        updateFullscreenBtnText();
    }
})();
