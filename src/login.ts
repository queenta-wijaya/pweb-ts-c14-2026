interface LoginResponse {
    id: number;
    username: string;
    firstName: string;
    role?: string;
    token?: string;
    accessToken?: string;
}

interface UserData {
    id: number;
    username: string;
    role?: string;
}

interface UsersResponse {
    users: UserData[];
}

const form = document.getElementById(
    "login-form"
) as HTMLFormElement;

const usernameInput = document.getElementById(
    "username"
) as HTMLInputElement;

const passwordInput = document.getElementById(
    "password"
) as HTMLInputElement;

const loading = document.getElementById(
    "loading"
) as HTMLParagraphElement;

const errorMessage = document.getElementById(
    "error-message"
) as HTMLParagraphElement;

const loginButton = document.getElementById(
    "login-button"
) as HTMLButtonElement;

async function getUserRole(
    user: LoginResponse
): Promise<string> {
    if (user.role) {
        return user.role.toLowerCase();
    }

    const endpoints = [
        "https://dummyjson.com/users/filter?key=role&value=admin",
        "https://dummyjson.com/users/filter?key=role&value=moderator",
        "https://dummyjson.com/users/filter?key=role&value=user"
    ];

    const responses = await Promise.all(
        endpoints.map(url => fetch(url))
    );

    if (responses.some(response => !response.ok)) {
        throw new Error("Gagal memverifikasi role pengguna. Silakan coba lagi.");
    }

    const results = await Promise.all(
        responses.map(response => response.json() as Promise<UsersResponse>)
    );
    const matchedUser = results.flatMap(result => result.users)
        .find(item => item.id === user.id);

    if (!matchedUser?.role) {
        throw new Error("Role pengguna tidak dapat diverifikasi.");
    }

    return matchedUser.role.toLowerCase();
}

form.addEventListener("submit", async (event: SubmitEvent) => {
    event.preventDefault();

    errorMessage.textContent = "";
    loading.hidden = false;
    loginButton.disabled = true;

    try {
        const response = await fetch(
            "https://dummyjson.com/auth/login",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    username: usernameInput.value.trim(),
                    password: passwordInput.value
                })
            }
        );

        const data = await response.json() as
            LoginResponse & { message?: string };

        if (!response.ok) {
            throw new Error(
                data.message || "Username atau password salah."
            );
        }

        const token = data.accessToken || data.token;

        if (!token || !data.firstName) {
            throw new Error(
                "Respons login tidak memiliki data sesi yang diperlukan."
            );
        }

        const role = await getUserRole(data);

        localStorage.setItem("token", token);
        localStorage.setItem("role", role);
        localStorage.setItem("firstName", data.firstName);

        if (role === "admin" || role === "moderator") {
            window.location.href = "index.html";
        } else {
            window.location.href = "ambil-antrian.html";
        }

    } catch (error) {
        if (error instanceof TypeError) {
            errorMessage.textContent =
                "Koneksi gagal. Periksa internet dan coba lagi.";
        } else {
            errorMessage.textContent =
                error instanceof Error
                    ? error.message
                    : "Terjadi kesalahan saat login.";
        }
    } finally {
        loading.hidden = true;
        loginButton.disabled = false;
    }
});