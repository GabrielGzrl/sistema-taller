
// CONFIG

const API_URL = 'https://sistema-taller-production.up.railway.app/';

function getToken() {
  return localStorage.getItem('token');
}

function headersAuth(extra = {}) {
  const token = getToken();
  return { ...extra, Authorization: `Bearer ${token}` };
}

function money(n) {
  return Number(n || 0).toFixed(2);
}

// Si el backend responde 401/Token inválido -> logout limpio
async function parseJsonSafe(res) {
  const text = await res.text();
  try { return JSON.parse(text); } catch { return { mensaje: text }; }
}

function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('usuario');
  window.location.href = 'login.html';
}

function goLoginIfNoToken() {
  if (!getToken()) window.location.href = 'login.html';
}


// JWT helpers (para saber rol en frontend)
function decodeJwt(token) {
  try {
    const payload = token.split('.')[1];
    const b64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(b64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function getRolFromToken() {
  const t = getToken();
  const decoded = t ? decodeJwt(t) : null;
  return decoded?.rol || null;
}

// Fetch wrapper con manejo 401/403

async function apiFetch(url, options = {}) {
  const res = await fetch(url, options);

  if (res.status === 401) {
    // token expirado/invalido
    logout();
    throw new Error('No autorizado (401)');
  }
  return res;
}

// PDF PRO (con token incluido)

async function abrirPdfProPorId(ordenId) {
  goLoginIfNoToken();

  try {
    const res = await apiFetch(`${API_URL}/pdf-pro/orden/${ordenId}`, {
      headers: headersAuth()
    });

    if (!res.ok) {
      const txt = await res.text();
      alert('Error PDF: ' + txt);
      return;
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  } catch (e) {
    console.error(e);
    alert('Error al abrir PDF');
  }
}

// COPIAR AL PORTAPAPELES 
async function copyToClipboard(text) {
  // 1) Intento moderno
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (e) {
    // seguimos al fallback
  }

  // 2) Fallback  
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.top = '-1000px';
    ta.style.left = '-1000px';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();

    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch (e) {
    return false;
  }
}

// Base para armar URL del frontend (file:// o http://)
function getBaseFrontend() {
  // Cuando abres dashboard.html desde file://
  if (window.location.protocol === 'file:') {
    return window.location.href.replace(/dashboard\.html.*/, '');
  }
  // Cuando estás en un servidor (http://localhost/...)
  return window.location.origin + window.location.pathname.replace(/\/[^/]*$/, '/');
}

// PIN CLIENTE (guardar en backend)
async function configurarPinCliente() {
  const orden_id = Number(document.getElementById('srv_orden_id').value);
  const pin = document.getElementById('pin_cliente').value.trim();
  const msg = document.getElementById('pin_msg');

  if (!orden_id) return alert('Selecciona una orden');
  if (!pin || String(pin).length < 4) {
    if (msg) msg.innerText = 'PIN inválido (mínimo 4 dígitos).';
    return;
  }

  if (msg) msg.innerText = 'Guardando PIN...';

  try {
    const res = await apiFetch(`${API_URL}/ordenes/${orden_id}/pin`, {
      method: 'PUT',
      headers: headersAuth({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ pin })
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      if (msg) msg.innerText = data.mensaje || 'No se pudo guardar el PIN';
      return;
    }

    if (msg) msg.innerText = '✅ PIN configurado para esta orden';
  } catch (e) {
    console.error(e);
    if (msg) msg.innerText = 'Error guardando PIN';
  }
}

// COPIAR LINK CLIENTE (guarda PIN + copia link)
async function copiarLinkCliente() {
  const orden_id = Number(document.getElementById('srv_orden_id').value);
  const msg = document.getElementById('link_msg');

  if (!orden_id) return alert('Selecciona una orden');
  if (msg) msg.innerText = 'Generando link...';

  try {
    // 1) Sacar folio de la orden
    const res = await apiFetch(`${API_URL}/ordenes`, { headers: headersAuth() });
    const ordenes = await res.json();
    const orden = ordenes.find(o => Number(o.id) === orden_id);

    if (!orden) {
      if (msg) msg.innerText = 'No se encontró la orden';
      return;
    }

    const folio = orden.folio;

    // 2) Pedir PIN
    const pin = prompt('PIN del cliente (mínimo 4 dígitos). Ej: 1234');
    if (!pin) {
      if (msg) msg.innerText = 'Cancelado.';
      return;
    }
    if (String(pin).length < 4) {
      if (msg) msg.innerText = 'PIN inválido (mínimo 4 dígitos).';
      return;
    }

    // 3) Guardar PIN en backend
    const resPin = await apiFetch(`${API_URL}/ordenes/${orden_id}/pin`, {
      method: 'PUT',
      headers: headersAuth({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ pin })
    });

    const dataPin = await resPin.json().catch(() => ({}));

    if (!resPin.ok) {
      if (msg) msg.innerText = dataPin.mensaje || 'Error guardando PIN';
      alert('No se pudo guardar PIN: ' + (dataPin.mensaje || resPin.status));
      return;
    }

    // 4) Link sin PIN
    const base = getBaseFrontend();
    const url = `${base}cliente.html?folio=${encodeURIComponent(folio)}`;

    // 5) Copiar (robusto)
    const ok = await copyToClipboard(url);

    if (!ok) {
      if (msg) msg.innerText = 'No se pudo copiar automáticamente';
      alert('No se pudo copiar. Copia manualmente:\n' + url);
      return;
    }

    if (msg) msg.innerText = '✅ Link copiado (PIN guardado)';
   // alert al final, ya no rompe el foco antes de copiar
    alert('Link copiado:\n' + url);

  } catch (e) {
    console.error(e);
    if (msg) msg.innerText = 'Error generando link';
    alert('Error generando link');
  }
}
// UI: Mostrar/Ocultar Usuarios según rol
function applyRoleUI() {
  const rol = getRolFromToken();
  const btnUsuarios = document.getElementById('btn-usuarios');
  const viewUsuarios = document.getElementById('view-usuarios');

  if (rol !== 'admin') {
    if (btnUsuarios) btnUsuarios.style.display = 'none';
    if (viewUsuarios) viewUsuarios.style.display = 'none';
  } else {
    if (btnUsuarios) btnUsuarios.style.display = '';
    if (viewUsuarios) viewUsuarios.style.display = '';
  }
}

// NAVEGACIÓN (SIDEBAR)
function setupNavigation() {
  document.querySelectorAll('.navbtn[data-view]').forEach(btn => {
    btn.addEventListener('click', async () => {
      document.querySelectorAll('.navbtn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const id = btn.dataset.view;
      document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
      const view = document.getElementById(id);
      if (view) view.classList.add('active');

      // refrescos por vista
      try {
        if (id === 'view-clientes') await listarClientes();
        if (id === 'view-vehiculos') { await cargarClientesSelect(); await listarVehiculos(); }
        if (id === 'view-ordenes') { await cargarVehiculosSelect(); await listarOrdenesRecientes(); }
        if (id === 'view-servicios') { await cargarOrdenesSelect(); }
        if (id === 'view-usuarios') { await listarUsuarios(); }
      } catch (e) {
        console.error(e);
      }
    });
  });
}

// 1) VIN BUSCAR
async function buscarVIN() {
  const vin = document.getElementById('vinInput').value.trim();
  const resultado = document.getElementById('resultado');

  if (!vin) {
    resultado.innerHTML = 'Ingresa un VIN válido';
    return;
  }

  resultado.innerHTML = 'Buscando...';

  try {
    const resVehiculo = await apiFetch(`${API_URL}/vehiculos/vin/${vin}`, {
      headers: headersAuth()
    });

    if (!resVehiculo.ok) {
      resultado.innerHTML = 'Vehículo no encontrado';
      return;
    }

    const vehiculo = await resVehiculo.json();

    const resOrdenes = await apiFetch(`${API_URL}/ordenes/vehiculo/${vehiculo.id}`, {
      headers: headersAuth()
    });
    const ordenes = await resOrdenes.json();

    resultado.innerHTML = `
      <div class="card">
        <div class="section-title">Cliente</div>
        <p><strong>${vehiculo.cliente || ''}</strong></p>
      </div>

      <div class="card">
        <div class="section-title">Vehículo</div>
        <p><strong>${vehiculo.marca} ${vehiculo.modelo} (${vehiculo.anio})</strong></p>
        <p>VIN: ${vehiculo.vin}</p>
        <p>Placas: ${vehiculo.placas || ''}</p>
        <p>Kilometraje: ${vehiculo.kms || ''}</p>
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
                    <th>PDF</th>
                  </tr>
                </thead>
                <tbody>
                  ${ordenes.map(o => `
                    <tr>
                      <td>${o.folio}</td>
                      <td>$${money(o.total)}</td>
                      <td>
                        <button class="btn-link" onclick="abrirPdfProPorId(${o.id})">Ver PDF</button>
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

// 2) CLIENTES
async function crearCliente() {
  const nombre = document.getElementById('cli_nombre').value.trim();
  const telefono = document.getElementById('cli_telefono').value.trim();
  const email = document.getElementById('cli_email').value.trim();
  const msg = document.getElementById('cli_msg');

  if (!nombre || !telefono) {
    msg.innerText = 'Nombre y teléfono son obligatorios';
    return;
  }

  try {
    const res = await apiFetch(`${API_URL}/clientes`, {
      method: 'POST',
      headers: headersAuth({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ nombre, telefono, email })
    });

    const data = await parseJsonSafe(res);

    if (!res.ok) {
      msg.innerText = data.mensaje || 'Error al crear cliente';
      return;
    }

    msg.innerText = `✅ Cliente creado (ID ${data.id})`;
    document.getElementById('cli_nombre').value = '';
    document.getElementById('cli_telefono').value = '';
    document.getElementById('cli_email').value = '';

    await listarClientes();
    await cargarClientesSelect();
  } catch (e) {
    console.error(e);
    msg.innerText = 'Error al conectar con servidor';
  }
}

async function listarClientes() {
  const cont = document.getElementById('cli_list');
  cont.innerHTML = 'Cargando...';

  const res = await apiFetch(`${API_URL}/clientes`, { headers: headersAuth() });
  const clientes = await res.json();

  cont.innerHTML = clientes.map(c => `
    <div class="mini">
      <strong>ID:</strong> ${c.id} &nbsp; | &nbsp;
      <strong>${c.nombre}</strong> &nbsp; | &nbsp;
      ${c.telefono || ''} &nbsp; | &nbsp;
      ${c.email || ''}
      <button style="margin-left:10px;" onclick="copiarTexto('${c.id}')">Copiar ID</button>
    </div>
  `).join('');
}

function copiarTexto(txt) {
  navigator.clipboard.writeText(String(txt));
  alert('Copiado: ' + txt);
}

// 3) VEHICULOS
async function cargarClientesSelect() {
  const select = document.getElementById('veh_cliente_id');
  if (!select) return;

  const res = await apiFetch(`${API_URL}/clientes`, { headers: headersAuth() });
  const clientes = await res.json();

  select.innerHTML = `<option value="">Selecciona cliente</option>`;
  clientes.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = `${c.id} - ${c.nombre}`;
    select.appendChild(opt);
  });
}

async function crearVehiculo() {
  const msg = document.getElementById('veh_msg');

  const vin = document.getElementById('veh_vin').value.trim();
  const marca = document.getElementById('veh_marca').value.trim();
  const modelo = document.getElementById('veh_modelo').value.trim();
  const anio = document.getElementById('veh_anio').value.trim();
  const color = document.getElementById('veh_color').value.trim();
  const placas = document.getElementById('veh_placas').value.trim();
  const kmsRaw = document.getElementById('veh_kms').value.trim();
  const cliente_id = document.getElementById('veh_cliente_id').value.trim();

  const kms = kmsRaw.replace(/,/g, '');

  if (!vin || !marca || !modelo || !anio || !cliente_id) {
    msg.innerText = 'VIN, marca, modelo, año y cliente son obligatorios';
    return;
  }

  try {
    const res = await apiFetch(`${API_URL}/vehiculos`, {
      method: 'POST',
      headers: headersAuth({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ vin, marca, modelo, anio, color, placas, kms, cliente_id })
    });

    const data = await parseJsonSafe(res);
    if (!res.ok) {
      msg.innerText = data.mensaje || 'Error al crear vehículo';
      return;
    }

    msg.innerText = '✅ Vehículo creado';
    ['veh_vin','veh_marca','veh_modelo','veh_anio','veh_color','veh_placas','veh_kms'].forEach(id => {
      document.getElementById(id).value = '';
    });
    document.getElementById('veh_cliente_id').value = '';

    await listarVehiculos();
    await cargarVehiculosSelect();
  } catch (e) {
    console.error(e);
    msg.innerText = 'Error al conectar con servidor';
  }
}

async function listarVehiculos() {
  const cont = document.getElementById('veh_list');
  cont.innerHTML = 'Cargando...';

  const res = await apiFetch(`${API_URL}/vehiculos`, { headers: headersAuth() });
  const vehiculos = await res.json();

  cont.innerHTML = vehiculos.map(v => `
    <div class="mini">
      <strong>${v.marca} ${v.modelo} (${v.anio})</strong> | VIN: ${v.vin} | Cliente ID: ${v.cliente_id}
    </div>
  `).join('');
}

// 4) ORDENES
async function cargarVehiculosSelect() {
  const select = document.getElementById('ord_vehiculo_id');
  if (!select) return;

  const res = await apiFetch(`${API_URL}/vehiculos`, { headers: headersAuth() });
  const vehiculos = await res.json();

  select.innerHTML = `<option value="">Selecciona vehículo</option>`;
  vehiculos.forEach(v => {
    const opt = document.createElement('option');
    opt.value = v.id;
    opt.textContent = `${v.id} - ${v.marca} ${v.modelo} (${v.anio})`;
    select.appendChild(opt);
  });
}

async function crearOrden() {
  const msg = document.getElementById('ord_msg');
  const vehiculo_id = document.getElementById('ord_vehiculo_id').value;
  const comentarios = document.getElementById('ord_comentarios').value.trim();

  if (!vehiculo_id) {
    msg.innerText = 'Selecciona un vehículo';
    return;
  }

  try {
    const res = await apiFetch(`${API_URL}/ordenes`, {
      method: 'POST',
      headers: headersAuth({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ vehiculo_id, comentarios })
    });

    const data = await parseJsonSafe(res);
    if (!res.ok) {
      msg.innerText = data.mensaje || 'Error al crear orden';
      return;
    }

    msg.innerText = `✅ Orden creada (Folio ${data.folio})`;
    document.getElementById('ord_comentarios').value = '';

    await listarOrdenesRecientes();
    await cargarOrdenesSelect();
  } catch (e) {
    console.error(e);
    msg.innerText = 'Error al conectar con servidor';
  }
}

async function listarOrdenesRecientes() {
  const cont = document.getElementById('ord_list');
  cont.innerHTML = 'Cargando...';

  const res = await apiFetch(`${API_URL}/ordenes`, { headers: headersAuth() });
  const ordenes = await res.json();

  cont.innerHTML = ordenes.map(o => `
    <div class="mini">
      <strong>ID:</strong> ${o.id} | <strong>${o.folio}</strong>
      &nbsp; | Total: $${money(o.total)}
      &nbsp; | <button class="btn-link" onclick="abrirPdfProPorId(${o.id})">PDF</button>
    </div>
  `).join('');
}

// 5) SERVICIOS + TOTALES + PDF 
async function cargarOrdenesSelect() {
  const select = document.getElementById('srv_orden_id');
  if (!select) return;

  const res = await apiFetch(`${API_URL}/ordenes`, { headers: headersAuth() });
  const ordenes = await res.json();

  select.innerHTML = `<option value="">Selecciona una orden</option>`;
  ordenes.forEach(o => {
    const opt = document.createElement('option');
    opt.value = o.id;
    opt.textContent = `${o.id} - ${o.folio}`;
    select.appendChild(opt);
  });
}

async function mostrarServicios(orden_id) {
  const res = await apiFetch(`${API_URL}/detalle/orden/${orden_id}`, { headers: headersAuth() });
  const servicios = await res.json();

  const tbody = document.getElementById('srv_tabla');
  tbody.innerHTML = '';

  servicios.forEach(s => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${s.descripcion}</td>
      <td>${s.cantidad}</td>
      <td>$${money(s.precio_unitario)}</td>
      <td>$${money(s.importe)}</td>
    `;
    tbody.appendChild(tr);
  });
}

async function actualizarTotales(orden_id) {
  const res = await apiFetch(`${API_URL}/totales/orden/${orden_id}`, {
    method: 'PUT',
    headers: headersAuth()
  });

  const data = await res.json();
  document.getElementById('srv_subtotal').innerText = money(data.subtotal);
  document.getElementById('srv_iva').innerText = money(data.impuestos);
  document.getElementById('srv_total').innerText = money(data.total);
}

async function recalcularTotales() {
  const orden_id = Number(document.getElementById('srv_orden_id').value);
  if (!orden_id) return;
  await actualizarTotales(orden_id);
}

async function agregarServicio() {
  const orden_id = Number(document.getElementById('srv_orden_id').value);
  const descripcion = document.getElementById('srv_desc').value.trim();
  const cantidad = Number(document.getElementById('srv_cant').value);
  const precio_unitario = Number(document.getElementById('srv_precio').value);
  const msg = document.getElementById('srv_msg');

  if (!orden_id || !descripcion || cantidad <= 0 || precio_unitario <= 0) {
    msg.innerText = 'Completa todos los campos correctamente';
    return;
  }

  const res = await apiFetch(`${API_URL}/detalle`, {
    method: 'POST',
    headers: headersAuth({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ orden_id, descripcion, cantidad, precio_unitario })
  });

  const data = await parseJsonSafe(res);
  if (!res.ok) {
    msg.innerText = data.mensaje || 'Error al agregar servicio';
    return;
  }

  msg.innerText = '✅ Servicio agregado';
  document.getElementById('srv_desc').value = '';
  document.getElementById('srv_cant').value = 1;
  document.getElementById('srv_precio').value = '';

  await mostrarServicios(orden_id);
  await actualizarTotales(orden_id);
  await cargarFotosOrden(orden_id);
}

async function abrirPdfPro() {
  const orden_id = Number(document.getElementById('srv_orden_id').value);
  if (!orden_id) return alert('Selecciona una orden');
  await abrirPdfProPorId(orden_id);
}

// evento change select servicios
const srvSelect = document.getElementById('srv_orden_id');
if (srvSelect) {
  srvSelect.addEventListener('change', async (e) => {
    const id = Number(e.target.value);
    if (!id) return;
    await mostrarServicios(id);
    await actualizarTotales(id);
    await cargarFotosOrden(id);
    await cargarEstatus(id); 
  });
}


// 6) USUARIOS (solo admin puede ver)
async function listarUsuarios() {
  const cont = document.getElementById('usr_list');
  if (!cont) return;

  cont.innerHTML = 'Cargando...';

  const res = await apiFetch(`${API_URL}/usuarios`, { headers: headersAuth() });

  if (res.status === 403) {
    cont.innerHTML = 'No tienes permisos.';
    return;
  }

  const usuarios = await res.json();

  cont.innerHTML = usuarios.map(u => `
    <div class="mini">
      <strong>ID:</strong> ${u.id} &nbsp; | &nbsp;
      <strong>${u.nombre}</strong> &nbsp; | &nbsp;
      ${u.email} &nbsp; | &nbsp;
      <strong>${u.rol}</strong>
    </div>
  `).join('');
}

async function crearUsuario() {
  const msg = document.getElementById('usr_msg');
  const nombre = document.getElementById('usr_nombre')?.value.trim();
  const email = document.getElementById('usr_email')?.value.trim();
  const password = document.getElementById('usr_password')?.value.trim();
  const rol = document.getElementById('usr_rol')?.value || 'empleado';

  if (!nombre || !email || !password) {
    msg.innerText = 'Nombre, email y password son obligatorios';
    return;
  }

  const res = await apiFetch(`${API_URL}/usuarios`, {
    method: 'POST',
    headers: headersAuth({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ nombre, email, password, rol })
  });

  const data = await parseJsonSafe(res);

  if (res.status === 403) {
    msg.innerText = 'No tienes permisos para crear usuarios';
    return;
  }
  if (!res.ok) {
    msg.innerText = data.mensaje || 'Error al crear usuario';
    return;
  }

  msg.innerText = `✅ Usuario creado (ID ${data.id})`;
  document.getElementById('usr_nombre').value = '';
  document.getElementById('usr_email').value = '';
  document.getElementById('usr_password').value = '';
  document.getElementById('usr_rol').value = 'empleado';

  await listarUsuarios();
}
async function guardarEstatus() {
  const orden_id = Number(document.getElementById('srv_orden_id').value);
  if (!orden_id) return alert('Selecciona una orden');

  const estatus = document.getElementById('ord_estatus').value;
  const msg = document.getElementById('estatus_msg');
  msg.innerText = 'Guardando...';

  const res = await fetch(`${API_URL}/ordenes/${orden_id}/estatus`, {
    method: 'PUT',
    headers: headersAuth({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ estatus })
  });

  const data = await res.json();
  if (!res.ok) {
    msg.innerText = data.mensaje || 'Error';
    return;
  }
  msg.innerText = `✅ Estatus: ${data.estatus}`;
}

async function subirFotoOrden() {
  const orden_id = Number(document.getElementById('srv_orden_id').value);
  if (!orden_id) return alert('Selecciona una orden');

  const tipo = document.getElementById('foto_tipo').value;
  const file = document.getElementById('foto_file').files[0];
  const msg = document.getElementById('foto_msg');

  if (!file) return (msg.innerText = 'Selecciona una imagen');

  msg.innerText = 'Subiendo...';

  const form = new FormData();
  form.append('tipo', tipo);
  form.append('foto', file);

  const res = await fetch(`${API_URL}/ordenes/${orden_id}/fotos`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    body: form
  });

  const data = await res.json();
  if (!res.ok) {
    msg.innerText = data.mensaje || 'Error al subir';
    return;
  }

  msg.innerText = '✅ Foto subida';
  document.getElementById('foto_file').value = '';
  await cargarFotosOrden(orden_id);
}
async function cargarEstatus(orden_id) {
  const msg = document.getElementById('estatus_msg');
  if (msg) msg.innerText = '⏳ Cargando estatus...';

  const res = await fetch(`${API_URL}/ordenes/${orden_id}/estatus`, {
    headers: headersAuth()
  });

  const data = await parseJsonSafe(res);
  if (!res.ok) {
    if (msg) msg.innerText = '';
    return;
  }

  const select = document.getElementById('ord_estatus'); // select de estatus
  if (select && data.estatus) select.value = data.estatus;

  if (msg) msg.innerText = `✅ Estatus: ${data.estatus}`;
}

async function cargarFotosOrden(orden_id) {
  const cont = document.getElementById('galeria_fotos');
  cont.innerHTML = 'Cargando fotos...';

  const res = await fetch(`${API_URL}/ordenes/${orden_id}/fotos`, {
    headers: headersAuth()
  });

  const fotos = await res.json();
  if (!res.ok) {
    cont.innerHTML = 'No se pudieron cargar fotos';
    return;
  }

  if (fotos.length === 0) {
    cont.innerHTML = '<p>No hay fotos aún.</p>';
    return;
  }



  

  // agrupamos por tipo
  const antes = fotos.filter(f => f.tipo === 'antes');
  const despues = fotos.filter(f => f.tipo === 'despues');

  cont.innerHTML = `
    <div style="margin-top:10px;">
      <h3>Antes</h3>
      <div style="display:flex; gap:10px; flex-wrap:wrap;">
        ${antes.map(f => `
          <a href="http://localhost:3000${f.url}" target="_blank">
            <img src="http://localhost:3000${f.url}" style="width:140px; height:140px; object-fit:cover; border-radius:10px;" />
          </a>
        `).join('')}
      </div>

      <h3 style="margin-top:15px;">Después</h3>
      <div style="display:flex; gap:10px; flex-wrap:wrap;">
        ${despues.map(f => `
          <a href="http://localhost:3000${f.url}" target="_blank">
            <img src="http://localhost:3000${f.url}" style="width:140px; height:140px; object-fit:cover; border-radius:10px;" />
          </a>
        `).join('')}
      </div>
    </div>
  `;
}



// INIT
(function init() {
  goLoginIfNoToken();
  applyRoleUI();
  setupNavigation();

  // precarga mínima
  (async () => {
    await listarClientes().catch(() => {});
    await cargarClientesSelect().catch(() => {});
    await listarVehiculos().catch(() => {});
    await cargarVehiculosSelect().catch(() => {});
    await listarOrdenesRecientes().catch(() => {});
    await cargarOrdenesSelect().catch(() => {});
    // usuarios solo si admin
    if (getRolFromToken() === 'admin') await listarUsuarios().catch(() => {});
  })();
})();