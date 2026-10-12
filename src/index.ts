import {
    getQueueTypes,
    saveQueueTypes,
    getQueueTypeByCode,
    getWaitingTicketsCount,
    createTicket,
    resetAllQueues,
    QueueType
} from "./storage.js";

const allowedRoles = ["admin", "moderator"];
const currentRole = localStorage.getItem("role");
if (!currentRole || !allowedRoles.includes(currentRole)) {
    window.location.href = "login.html";
}

const formEl = document.getElementById("queue-type-form") as HTMLFormElement;
const codeInput = document.getElementById("code-input") as HTMLInputElement;
const nameInput = document.getElementById("name-input") as HTMLInputElement;
const tableBody = document.querySelector("#queue-types-table tbody") as HTMLTableSectionElement;
const resetBtn = document.getElementById("reset-queues-btn") as HTMLButtonElement;
const toast = document.getElementById("toast") as HTMLDivElement;
const greetingEl = document.getElementById("admin-greeting") as HTMLSpanElement;
const logoutBtn = document.getElementById("logout-btn") as HTMLButtonElement;
const manualTicketForm = document.getElementById("manual-ticket-form") as HTMLFormElement;
const manualQueueSelect = document.getElementById("manual-queue-select") as HTMLSelectElement;
const manualPrioritySelect = document.getElementById("manual-priority-select") as HTMLSelectElement;
const editModal = document.getElementById("edit-modal") as HTMLDivElement;
const editForm = document.getElementById("edit-form") as HTMLFormElement;
const editCodeInput = document.getElementById("edit-code") as HTMLInputElement;
const editNameInput = document.getElementById("edit-name") as HTMLInputElement;
const editActiveInput = document.getElementById("edit-active") as HTMLInputElement;
const modalCloseBtn = editModal.querySelector(".modal-close") as HTMLButtonElement;
const modalCancelBtn = editModal.querySelector(".modal-cancel") as HTMLButtonElement;

function showToast(message: string, type: "success" | "error" | "info" = "info"): void {
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.classList.remove("hidden");
    setTimeout(() => toast.classList.add("hidden"), 3000);
}

function showGreeting(): void {
    const firstName = localStorage.getItem("firstName");
    if (firstName) {
        greetingEl.textContent = `Halo, ${firstName}`;
    }
}

function handleLogout(): void {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("firstName");
    window.location.href = "login.html";
}

function renderQueueTypes(): void {
    const types = getQueueTypes();
    tableBody.innerHTML = "";

    types.forEach((type: QueueType) => {
        const waitingCount = getWaitingTicketsCount(type.code);
        const row = document.createElement("tr");
        row.innerHTML = `
            <td><code>${type.code}</code></td>
            <td>${type.name}</td>
            <td>
                <span class="status-badge ${type.isActive ? "active" : "inactive"}">
                    ${type.isActive ? "Aktif" : "Nonaktif"}
                </span>
            </td>
            <td><span class="counter-badge">${type.counter}</span></td>
            <td><span class="waiting-count">${waitingCount}</span></td>
            <td class="action-cell">
                <button class="btn btn-sm btn-toggle ${type.isActive ? "active" : "inactive"}" 
                        data-action="toggle" data-code="${type.code}">
                    ${type.isActive ? "Nonaktifkan" : "Aktifkan"}
                </button>
                <button class="btn btn-sm btn-secondary" 
                        data-action="edit" data-code="${type.code}">
                    Edit
                </button>
                <button class="btn btn-sm btn-delete" 
                        data-action="delete" data-code="${type.code}">
                    Hapus
                </button>
            </td>
        `;
        tableBody.appendChild(row);
    });

    updateManualQueueSelect(types);
}

function updateManualQueueSelect(types: QueueType[]): void {
    const activeTypes = types.filter(t => t.isActive);
    manualQueueSelect.innerHTML = '<option value="">-- Pilih Jenis Antrean --</option>';
    activeTypes.forEach(type => {
        const option = document.createElement("option");
        option.value = type.code;
        option.textContent = `${type.name} (${type.code})`;
        manualQueueSelect.appendChild(option);
    });
}

function openEditModal(code: string): void {
    const types = getQueueTypes();
    const type = types.find((t: QueueType) => t.code === code);
    if (!type) return;

    editCodeInput.value = type.code;
    editNameInput.value = type.name;
    editActiveInput.checked = type.isActive;
    editModal.classList.remove("hidden");
    editNameInput.focus();
}

function closeEditModal(): void {
    editModal.classList.add("hidden");
    editForm.reset();
}

formEl.addEventListener("submit", (e) => {
    e.preventDefault();
    const code = codeInput.value.trim().toUpperCase();
    const name = nameInput.value.trim();

    if (!code || !name) {
        showToast("Kode dan nama wajib diisi", "error");
        return;
    }

    if (code.length !== 1 || !/^[A-Z]$/.test(code)) {
        showToast("Kode harus 1 huruf kapital (A-Z)", "error");
        return;
    }

    const existing = getQueueTypeByCode(code);
    if (existing) {
        showToast(`Kode "${code}" sudah digunakan`, "error");
        return;
    }

    const types = getQueueTypes();
    types.push({ code, name, isActive: true, counter: 0 });
    saveQueueTypes(types);

    codeInput.value = "";
    nameInput.value = "";
    renderQueueTypes();
    showToast(`Jenis antrean "${name}" (${code}) berhasil ditambahkan`, "success");
});

tableBody.addEventListener("click", (e) => {
    const target = e.target as HTMLButtonElement;
    if (!target.matches("button")) return;

    const action = target.dataset.action;
    const code = target.dataset.code;
    if (!action || !code) return;

    const types = getQueueTypes();
    const typeIndex = types.findIndex((t: QueueType) => t.code === code);
    if (typeIndex === -1) return;

    if (action === "toggle") {
        types[typeIndex].isActive = !types[typeIndex].isActive;
        saveQueueTypes(types);
        renderQueueTypes();
        showToast(`${types[typeIndex].name} ${types[typeIndex].isActive ? "diaktifkan" : "dinonaktifkan"}`, "success");
    } else if (action === "edit") {
        openEditModal(code);
    } else if (action === "delete") {
        const typeName = types[typeIndex].name;
        if (confirm(`Hapus jenis antrean "${typeName}" (${code})?`)) {
            types.splice(typeIndex, 1);
            saveQueueTypes(types);
            renderQueueTypes();
            showToast(`Jenis antrean "${typeName}" dihapus`, "success");
        }
    }
});

editForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const code = editCodeInput.value;
    const name = editNameInput.value.trim();
    const isActive = editActiveInput.checked;

    if (!name) {
        showToast("Nama wajib diisi", "error");
        return;
    }

    const types = getQueueTypes();
    const typeIndex = types.findIndex((t: QueueType) => t.code === code);
    if (typeIndex === -1) return;

    types[typeIndex].name = name;
    types[typeIndex].isActive = isActive;
    saveQueueTypes(types);

    closeEditModal();
    renderQueueTypes();
    showToast(`Jenis antrean "${name}" berhasil diperbarui`, "success");
});

modalCloseBtn.addEventListener("click", closeEditModal);
modalCancelBtn.addEventListener("click", closeEditModal);
editModal.querySelector(".modal-overlay")?.addEventListener("click", closeEditModal);

manualTicketForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const queueTypeCode = manualQueueSelect.value;
    const priority = manualPrioritySelect.value as "Normal" | "VIP" | "Disabilitas" | "Lansia";

    if (!queueTypeCode) {
        showToast("Pilih jenis antrean terlebih dahulu", "error");
        return;
    }

    const ticket = createTicket(queueTypeCode, priority);
    if (ticket) {
        renderQueueTypes();
        showToast(`Tiket ${ticket.ticketNumber} (${priority}) berhasil diterbitkan`, "success");
        manualQueueSelect.value = "";
        manualPrioritySelect.value = "Normal";
    } else {
        showToast("Gagal menerbitkan tiket. Jenis antrean mungkin tidak aktif.", "error");
    }
});

resetBtn.addEventListener("click", () => {
    if (confirm("Yakin ingin reset SEMUA antrean? Semua tiket hari ini akan dihapus dan penomoran dikembalikan ke 0.")) {
        resetAllQueues();
        renderQueueTypes();
        showToast("Semua antrean berhasil direset", "success");
    }
});

logoutBtn.addEventListener("click", handleLogout);

showGreeting();
renderQueueTypes();