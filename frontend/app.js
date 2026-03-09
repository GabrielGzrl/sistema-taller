// ===============================
// CONFIG + SEGURIDAD GLOBAL
// ===============================
const API_URL = 'https://sistema-taller-production.up.railway.app/api';
const token = localStorage.getItem('token');

// 🔐 Protección de página
if (!token) {
  window.location.href = 'login.html';
}

// ===============================
// LOGOUT
// ===============================
function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('usuario');
  window.location.href = 'login.html';
}

// ===============================
// PDF PRO (abre con token usando fetch + blob)
// ===============================
function abrirPdfPro(ordenId) {
  const token = localStorage.getItem('token');

  if (!token) {
    window.location.href = 'login.html';
    return;
  }

  fetch(`http://localhost:3000/api/pdf-pro/orden/${ordenId}`, {
    headers: { Authorization: `Bearer ${token}` }
  })
    .then(res => {
      if (!res.ok) {
        return res.text().then(t => {
          throw new Error(t);
        });
      }
      return res.blob();
    })
    .then(blob => {
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    })
    .catch(err => {
      console.error(err);
      alert('Error al abrir PDF PRO: ' + err.message);
    });
}

// ===============================
// FUNCIÓN PRINCIPAL
// ===============================
async function buscarVIN() {
  const vin = document.getElementById('vinInput').value.trim();
  const resultado = document.getElementById('resultado');

  if (!vin) {
    resultado.innerHTML = 'Ingresa un VIN válido';
    return;
  }

  resultado.innerHTML = 'Buscando...';

  try {
    // 1️ Buscar vehículo
    const resVehiculo = await fetch(`${API_URL}/vehiculos/vin/${vin}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!resVehiculo.ok) {
      resultado.innerHTML = 'Vehículo no encontrado';
      return;
    }

    const vehiculo = await resVehiculo.json();

    // 2️ Buscar órdenes
    const resOrdenes = await fetch(`${API_URL}/ordenes/vehiculo/${vehiculo.id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const ordenes = await resOrdenes.json();

    // 3️ Render
    resultado.innerHTML = `
      <div class="card">
        <div class="section-title">Cliente</div>
        <p><strong>${vehiculo.cliente}</strong></p>
      </div>

      <div class="card">
        <div class="section-title">Vehículo</div>
        <p><strong>${vehiculo.marca} ${vehiculo.modelo} (${vehiculo.anio})</strong></p>
        <p>VIN: ${vehiculo.vin}</p>
        <p>Placas: ${vehiculo.placas}</p>
        <p>Kilometraje: ${vehiculo.kms}</p>
      </div>

      <div class="card">
        <div class="section-title">Órdenes</div>
        ${
          ordenes.length === 0
            ? '<p>No hay órdenes</p>'
            : `
              <table>
                <thead>
                  <tr>
                    <th>Folio</th>
                    <th>Total</th>
                    <th>PDF PRO</th>
                    <th>PDF</th>
                  </tr>
                </thead>
                <tbody>
                  ${ordenes.map(o => `
                    <tr>
                      <td>${o.folio}</td>
                      <td>$${o.total ?? '0.00'}</td>
                      <td>
                        <button onclick="abrirPdfPro(${o.id})">
                          Ver PDF PRO
                        </button>
                      </td>
                      <td>
                        <a href="${API_URL}/pdf/orden/${o.id}" target="_blank">
                          PDF viejo
                        </a>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            `
        }
      </div>
    `;
  } catch (err) {
    console.error(err);
    resultado.innerHTML = 'Error de servidor';
  }
}