document.addEventListener("DOMContentLoaded", () => {
  const app = document.getElementById("app");

  function renderLogin() {
    app.innerHTML = `
      <h2>Login</h2>
      <input id="email" placeholder="Email">
      <input id="password" type="password" placeholder="Contraseña">
      <button id="btnLogin">Ingresar</button>
    `;

    document.getElementById("btnLogin").onclick = async () => {
      const email = document.getElementById("email").value;
      const password = document.getElementById("password").value;

      try {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password })
        });

        const data = await res.json();

        if (!res.ok) {
          alert(data.error || "Error login");
          return;
        }

        localStorage.setItem("token", data.token);
        iniciarApp();

      } catch {
        alert("Error conexión");
      }
    };
  }

  function iniciarApp() {
    app.innerHTML = `
      <h2>IusCloud funcionando</h2>
      <button id="btnClientes">Clientes</button>
      <div id="contenido"></div>
    `;

    document.getElementById("btnClientes").onclick = cargarClientes;
  }

  async function cargarClientes() {
    const token = localStorage.getItem("token");

    try {
      const res = await fetch("/api/clientes", {
        headers: {
          Authorization: "Bearer " + token
        }
      });

      const data = await res.json();

      document.getElementById("contenido").innerHTML =
        JSON.stringify(data, null, 2);

    } catch {
      alert("Error cargando clientes");
    }
  }

  if (localStorage.getItem("token")) {
    iniciarApp();
  } else {
    renderLogin();
  }
});