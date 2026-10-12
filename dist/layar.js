"use strict";
// Logika Layar Antrian Publik (Monitor Display)
(function () {
    // Referensi Elemen DOM
    const displayGrid = document.getElementById("display-grid");
    const emptyState = document.getElementById("empty-state");
    const lastUpdateTimeEl = document.getElementById("last-update-time");
    const fullscreenBtn = document.getElementById("fullscreen-btn");
    const soundToggleBtn = document.getElementById("sound-toggle-btn");
    const soundIcon = document.getElementById("sound-icon");
    const soundLabel = document.getElementById("sound-label");
    const latestCallBanner = document.getElementById("latest-call-banner");
    const latestCallText = document.getElementById("latest-call-text");
    // State Pelacakan Panggilan untuk Audio & Animasi
    // Menyimpan { [kodeLayanan]: nomorTiketTerakhirYangDipanggil }
    const lastCalledTicketMap = new Map();
    let isInitialLoad = true;
    let isSoundEnabled = true;
    // Helper Web Audio API untuk efek suara Chime Bell (Tanpa butuh file audio eksternal)
    function playChimeSound() {
        if (!isSoundEnabled)
            return;
        try {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (!AudioContextClass)
                return;
            const ctx = new AudioContextClass();
            if (ctx.state === "suspended") {
                ctx.resume();
            }
            const playTone = (freq, startTime, duration) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = "sine";
                osc.frequency.setValueAtTime(freq, startTime);
                gain.gain.setValueAtTime(0.3, startTime);
                gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(startTime);
                osc.stop(startTime + duration);
            };
            const now = ctx.currentTime;
            // Nada ting-tung (Chime panggilan rumah sakit / bandara)
            playTone(659.25, now, 0.4); // E5
            playTone(880.00, now + 0.25, 0.6); // A5
        }
        catch (err) {
            console.warn("Web Audio chime tidak dapat diputar:", err);
        }
    }
    // Helper Web Speech API untuk Panggilan Suara Bahasa Indonesia (Bonus Fitur)
    function announceTicket(ticketNumber, serviceName) {
        if (!isSoundEnabled || !("speechSynthesis" in window))
            return;
        try {
            window.speechSynthesis.cancel(); // Batalkan antrean ucapan sebelumnya jika ada
            // Format pembacaan nomor agar jelas (misal A-001 dibaca A satu atau A kosong kosong satu)
            const parts = ticketNumber.split("-");
            let spokenNumber = ticketNumber;
            if (parts.length === 2) {
                const codeLetter = parts[0];
                const digits = parts[1].split("").map((d) => {
                    if (d === "0")
                        return "kosong";
                    return d;
                }).join(" ");
                spokenNumber = `${codeLetter}, ${digits}`;
            }
            const text = `Nomor antrean, ${spokenNumber}, silakan menuju loket ${serviceName}.`;
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = "id-ID";
            utterance.rate = 0.9; // Kecepatan nyaman
            utterance.pitch = 1.0;
            window.speechSynthesis.speak(utterance);
        }
        catch (e) {
            console.warn("Speech synthesis error:", e);
        }
    }
    // Format Jam: HH.mm.ss (sesuai dokumen soal)
    function getFormattedCurrentTime() {
        const now = new Date();
        const pad = (n) => String(n).padStart(2, "0");
        return `${pad(now.getHours())}.${pad(now.getMinutes())}.${pad(now.getSeconds())}`;
    }
    // Render Tampilan Monitor Antrean
    function renderDisplayMonitor() {
        if (!window.QueueStorage)
            return;
        const activeTypes = window.QueueStorage.getActiveQueueTypes();
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
            const calledTicket = window.QueueStorage.getCalledTicket(type.code);
            const waitingCount = window.QueueStorage.getWaitingTicketsCount(type.code);
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
                        <span class="service-name">${type.name}</span>
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
                        <span class="service-name">${type.name}</span>
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
            displayGrid.appendChild(card);
        }
        // Trigger Audio & Suara jika ada tiket baru yang dipanggil
        if (newlyCalledTicket) {
            const { ticket, type } = newlyCalledTicket;
            if (latestCallBanner && latestCallText) {
                latestCallText.textContent = `Nomor ${ticket.ticketNumber} (${ticket.priority}) menuju ${type.name}`;
                latestCallBanner.hidden = false;
            }
            playChimeSound();
            setTimeout(() => {
                announceTicket(ticket.ticketNumber, type.name);
            }, 600);
        }
        isInitialLoad = false;
    }
    // Toggle Suara Panggilan
    if (soundToggleBtn) {
        soundToggleBtn.addEventListener("click", () => {
            isSoundEnabled = !isSoundEnabled;
            if (isSoundEnabled) {
                soundIcon.textContent = "🔊";
                soundLabel.textContent = "Suara Aktif";
                soundToggleBtn.classList.remove("muted");
                // Test sound chime singkat untuk konfirmasi aktivasi
                playChimeSound();
            }
            else {
                soundIcon.textContent = "🔇";
                soundLabel.textContent = "Bisu";
                soundToggleBtn.classList.add("muted");
                if ("speechSynthesis" in window) {
                    window.speechSynthesis.cancel();
                }
            }
        });
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
