"use strict";
const form = document.getElementById("login-form");
const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");
const loading = document.getElementById("loading");
const errorMessage = document.getElementById("error-message");
const loginButton = document.getElementById("login-button");
async function getUserRole(user) {
    // Gunakan role jika memang disediakan oleh respons login.
    if (user.role) {
        return user.role.toLowerCase();
    }
    // Cari pengguna pada daftar referensi role dari soal.
    const endpoints = [
        "https://dummyjson.com/users/filter?key=role&value=admin",
        "https://dummyjson.com/users/filter?key=role&value=user"
    ];
    try {
        const responses = await Promise.all(endpoints.map(url => fetch(url)));
        if (responses.some(response => !response.ok)) {
            return "user";
        }
        const results = await Promise.all(responses.map(response => response.json()));
        const admin = results[0].users.find(item => item.id === user.id);
        if (admin) {
            return (admin.role || "admin").toLowerCase();
        }
        const regularUser = results[1].users.find(item => item.id === user.id);
        if (regularUser) {
            return (regularUser.role || "user").toLowerCase();
        }
    }
    catch (error) {
        console.error("Gagal mengambil referensi role:", error);
    }
    // Jika role tidak dapat diverifikasi, jangan beri akses admin.
    return "user";
}
form.addEventListener("submit", async (event) => {
    event.preventDefault();
    errorMessage.textContent = "";
    loading.hidden = false;
    loginButton.disabled = true;
    try {
        const response = await fetch("https://dummyjson.com/auth/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                username: usernameInput.value.trim(),
                password: passwordInput.value
            })
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.message || "Username atau password salah.");
        }
        const token = data.accessToken || data.token;
        if (!token || !data.firstName) {
            throw new Error("Respons login tidak memiliki data sesi yang diperlukan.");
        }
        const role = await getUserRole(data);
        // Simpan sesi setelah login berhasil.
        localStorage.setItem("token", token);
        localStorage.setItem("role", role);
        localStorage.setItem("firstName", data.firstName);
        localStorage.setItem("username", data.username); // Tambahan untuk memastikan username tersimpan
        // Moderator mendapatkan akses yang sama dengan admin.
        if (role === "admin" || role === "moderator") {
            window.location.href = "index.html";
        }
        else {
            // Penanganan khusus untuk memisahkan Operator dan Pasien
            if (data.username === "alexanderj") {
                window.location.href = "operator.html";
            }
            else {
                window.location.href = "ambil-antrian.html";
            }
        }
    }
    catch (error) {
        if (error instanceof TypeError) {
            errorMessage.textContent =
                "Koneksi gagal. Periksa internet dan coba lagi.";
        }
        else {
            errorMessage.textContent =
                error instanceof Error
                    ? error.message
                    : "Terjadi kesalahan saat login.";
        }
    }
    finally {
        loading.hidden = true;
        loginButton.disabled = false;
    }
});
