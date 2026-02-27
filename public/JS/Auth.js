async function checkAuth() {
    try {
        const res = await fetch('/me');
        const data = await res.json();
        const userLi = document.getElementById('userNav');
        if (!userLi) return;

        if (data.logged) {
            // Se loggato, mostra nome utente e dropdown
            const isDashboardUser = data.user.isDashboardUser;

const accountLink = isDashboardUser
  ? 'Dashboard.html'
  : 'profilo.html#info';

const ordersLink = isDashboardUser
  ? '' // oppure 'Dashboard.html#orders' se un giorno vuoi
  : '<a href="profilo.html#orders">I miei ordini</a>';

userLi.innerHTML = `
  <div class="user-menu">
    <span class="user-name">👤 ${data.user.nome}</span>
    <div class="dropdown">
      <a href="${accountLink}">Il mio account</a>
      ${ordersLink}
      <a href="#" id="logoutBtn">Logout</a>
    </div>
  </div>
`;


            document.getElementById('logoutBtn').addEventListener('click', async () => {
                await fetch('/logout', { method: 'POST' });
                window.location.reload();
            });

        } else {
            // Se non loggato, mostra Login/Registrati
            userLi.innerHTML = `<a href="Login-register.html" id="loginLink">Login/Registrati</a>`;
        }

    } catch (err) {
        console.error('Errore controllo login:', err);
    }
}

// Chiama subito la funzione
checkAuth();