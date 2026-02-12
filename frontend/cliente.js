const API_URL = 'http://localhost:3000/api';

function money(n) {
  return Number(n || 0).toFixed(2);
}

function getQueryParam(name) {
  const url = new URL(window.location.href);
  return url.searchParams.get(name);
}

function setStatus(text) {
  const pill = document.getElementById('statusPill');
  if (pill) pill.textContent = `Estatus: ${text || '—'}`;
}

function groupFotos(fotos = []) {
  return {
    antes: fotos.filter(f => f.tipo === 'antes'),
    despues: fotos.filter(f => f.tipo === 'despues')
  };
}

async function buscarOrdenCliente() {
  const folio = document.getElementById('folio').value.trim();
  const pin = document.getElementById('pin').value.trim();
  const msg = document.getElementById('msg');
  const resultado = document.getElementById('resultado');

  msg.className = 'muted';
  msg.textContent = '';
  resultado.innerHTML = '';

  if (!folio || !pin) {
    msg.className = 'err';
    msg.textContent = 'Folio y PIN son obligatorios.';
    return;
  }

  msg.textContent = 'Consultando...';

  try {
    const res = await fetch(`${API_URL}/ordenes/public/orden`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folio, pin })
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      msg.className = 'err';
      msg.textContent = data.mensaje || 'No se pudo consultar la orden.';
      setStatus('—');
      return;
    }

    msg.className = 'ok';
    msg.textContent = '✅ Orden encontrada';
    setStatus(data?.orden?.estatus || '—');

    const orden = data.orden || {};
    const vehiculo = data.vehiculo || {};
    const cliente = data.cliente || {};
    const servicios = data.servicios || [];
    const fotos = data.fotos || [];

    const { antes, despues } = groupFotos(fotos);

    resultado.innerHTML = `
      <div class="card">
        <div class="section-title">Resumen</div>
        <div class="grid2">
          <div>
            <p><strong>Folio:</strong> ${orden.folio || ''}</p>
            <p><strong>Cliente:</strong> ${cliente.nombre || ''}</p>
            <p><strong>Estatus:</strong> ${orden.estatus || ''}</p>
          </div>
          <div>
            <p><strong>Subtotal:</strong> $${money(orden.subtotal)}</p>
            <p><strong>IVA:</strong> $${money(orden.impuestos)}</p>
            <p><strong>Total:</strong> $${money(orden.total)}</p>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="section-title">Vehículo</div>
        <div class="grid2">
          <div>
            <p><strong>${vehiculo.marca || ''} ${vehiculo.modelo || ''} (${vehiculo.anio || ''})</strong></p>
            <p>Placas: ${vehiculo.placas || ''}</p>
          </div>
          <div>
            <p>VIN: ${vehiculo.vin || ''}</p>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="section-title">Servicios</div>
        ${
          servicios.length === 0
            ? '<p class="muted">Aún no hay servicios registrados.</p>'
            : `
              <table>
                <thead>
                  <tr>
                    <th>Descripción</th>
                    <th>Cant.</th>
                    <th>Precio</th>
                    <th>Importe</th>
                  </tr>
                </thead>
                <tbody>
                  ${servicios.map(s => `
                    <tr>
                      <td>${s.descripcion}</td>
                      <td>${s.cantidad}</td>
                      <td>$${money(s.precio_unitario)}</td>
                      <td>$${money(s.importe)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            `
        }
      </div>

      <div class="card">
        <div class="section-title">Evidencia fotográfica</div>
        ${
          fotos.length === 0
            ? '<p class="muted">Aún no hay fotos.</p>'
            : `
              <h3>Antes</h3>
              <div class="gal">
                ${antes.map(f => `
                  <a href="http://localhost:3000${f.url}" target="_blank">
                    <img src="http://localhost:3000${f.url}" alt="Antes">
                  </a>
                `).join('')}
              </div>

              <h3 style="margin-top:15px;">Después</h3>
              <div class="gal">
                ${despues.map(f => `
                  <a href="http://localhost:3000${f.url}" target="_blank">
                    <img src="http://localhost:3000${f.url}" alt="Después">
                  </a>
                `).join('')}
              </div>
            `
        }
      </div>
    `;
  } catch (e) {
    console.error(e);
    msg.className = 'err';
    msg.textContent = 'Error de conexión.';
    setStatus('—');
  }
}

// Autorellena folio si viene en query string
(function init() {
  const folioQS = getQueryParam('folio');
  if (folioQS) document.getElementById('folio').value = folioQS;
})();