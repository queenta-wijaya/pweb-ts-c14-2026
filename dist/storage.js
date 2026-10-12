"use strict";
// Master Type Definitions & Storage Management
// Default Seed Data jenis antrean sesuai modul praktikum
const DEFAULT_QUEUE_TYPES = [
    { code: "A", name: "UMUM-1", isActive: true, counter: 0 },
    { code: "B", name: "UMUM-2", isActive: true, counter: 0 },
    { code: "C", name: "UMUM-3", isActive: true, counter: 0 },
    { code: "G", name: "GIGI", isActive: true, counter: 0 },
    { code: "F", name: "FARMASI", isActive: true, counter: 0 },
    { code: "P", name: "PSIKOLOG", isActive: true, counter: 0 }
];
const QUEUE_TYPES_KEY = "hospital_queue_types";
const QUEUE_TICKETS_KEY = "hospital_queue_tickets";
// Mengambil master jenis antrean (dengan fallback ke default jika kosong)
function getQueueTypes() {
    try {
        const raw = localStorage.getItem(QUEUE_TYPES_KEY) || localStorage.getItem("queue_types");
        if (!raw) {
            saveQueueTypes(DEFAULT_QUEUE_TYPES);
            return DEFAULT_QUEUE_TYPES;
        }
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
        }
    }
    catch (e) {
        console.error("Gagal membaca jenis antrean dari LocalStorage:", e);
    }
    saveQueueTypes(DEFAULT_QUEUE_TYPES);
    return DEFAULT_QUEUE_TYPES;
}
function saveQueueTypes(types) {
    localStorage.setItem(QUEUE_TYPES_KEY, JSON.stringify(types));
    // Simpan juga ke key alias untuk kompatibilitas jika Orang 2 menggunakan key berbeda
    localStorage.setItem("queue_types", JSON.stringify(types));
}
function getActiveQueueTypes() {
    return getQueueTypes().filter((item) => item.isActive);
}
function getQueueTypeByCode(code) {
    const upper = code.toUpperCase();
    return getQueueTypes().find((item) => item.code.toUpperCase() === upper);
}
function getTickets() {
    try {
        const raw = localStorage.getItem(QUEUE_TICKETS_KEY) || localStorage.getItem("queue_tickets");
        if (!raw)
            return [];
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
            return parsed;
        }
    }
    catch (e) {
        console.error("Gagal membaca daftar tiket dari LocalStorage:", e);
    }
    return [];
}
function saveTickets(tickets) {
    localStorage.setItem(QUEUE_TICKETS_KEY, JSON.stringify(tickets));
    localStorage.setItem("queue_tickets", JSON.stringify(tickets));
}
// Fungsi pembuatan tiket baru dengan format KODE-001 (tiga digit)
function createTicket(queueTypeCode, priority = "Normal") {
    const types = getQueueTypes();
    const typeIndex = types.findIndex((t) => t.code.toUpperCase() === queueTypeCode.toUpperCase());
    if (typeIndex === -1 || !types[typeIndex].isActive) {
        return null;
    }
    // Naikkan counter jenis antrean
    const currentType = types[typeIndex];
    const nextNumber = (currentType.counter || 0) + 1;
    currentType.counter = nextNumber;
    saveQueueTypes(types);
    // Format nomor 3 digit: misal A-001, B-012, C-100
    const formattedNumber = `${currentType.code.toUpperCase()}-${String(nextNumber).padStart(3, "0")}`;
    const newTicket = {
        id: "tkt-" + Date.now() + "-" + Math.random().toString(36).substring(2, 7),
        queueTypeCode: currentType.code.toUpperCase(),
        ticketNumber: formattedNumber,
        priority: priority,
        status: "Menunggu",
        createdAt: new Date().toISOString()
    };
    const tickets = getTickets();
    tickets.push(newTicket);
    saveTickets(tickets);
    return newTicket;
}
// Mengambil tiket yang sedang berstatus "Dipanggil" untuk suatu jenis antrean
function getCalledTicket(queueTypeCode) {
    const upper = queueTypeCode.toUpperCase();
    const tickets = getTickets();
    // Cari tiket yang berstatus "Dipanggil" untuk jenis ini (ambil yang paling baru jika ada)
    const calledList = tickets.filter((t) => t.queueTypeCode.toUpperCase() === upper && t.status === "Dipanggil");
    if (calledList.length === 0)
        return undefined;
    return calledList[calledList.length - 1];
}
// Menghitung jumlah tiket yang masih dalam antrean (status "Menunggu")
function getWaitingTicketsCount(queueTypeCode) {
    const upper = queueTypeCode.toUpperCase();
    const tickets = getTickets();
    return tickets.filter((t) => t.queueTypeCode.toUpperCase() === upper && t.status === "Menunggu").length;
}
// Reset semua nomor tiket dan antrean
function resetAllQueues() {
    const types = getQueueTypes();
    const resetTypes = types.map((t) => ({ ...t, counter: 0 }));
    saveQueueTypes(resetTypes);
    saveTickets([]);
}
// Ekspos ke global window.QueueStorage
window.QueueStorage = {
    STORAGE_KEYS: {
        TYPES: QUEUE_TYPES_KEY,
        TICKETS: QUEUE_TICKETS_KEY
    },
    getQueueTypes,
    saveQueueTypes,
    getActiveQueueTypes,
    getQueueTypeByCode,
    getTickets,
    saveTickets,
    createTicket,
    getCalledTicket,
    getWaitingTicketsCount,
    resetAllQueues
};
