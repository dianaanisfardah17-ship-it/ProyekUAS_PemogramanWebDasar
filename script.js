// ===== DATA STORE =====
let store = {
  suratMasuk: [],
  suratKeluar: [],
  dokumen: [],
  anggota: [],
  kegiatan: [],
  nextAbsensiId: 1,
  editMode: { type: null, id: null },
  ttdList: [],
  absensiSessions: [],
  fileStore: {},
  notulensi: [],
};

let deleteCallback = null;// ===== LOGIN =====
// Mascot: tutup mata saat password difokus
(function initMascot() {
  const wrap   = document.getElementById('mascotWrap');
  const face   = document.getElementById('mascotFace');
  const passEl = document.getElementById('loginPass');
  const userEl = document.getElementById('loginUser');
  if (!wrap || !face || !passEl) return;

  passEl.addEventListener('focus', () => {
    wrap.classList.add('peek');
    face.classList.remove('success-anim', 'error-anim');
  });
  passEl.addEventListener('blur', () => wrap.classList.remove('peek'));
})();
async function doLogin() {
  const username = document.getElementById('loginUser').value.trim();
  const password = document.getElementById('loginPass').value;

  try {
    const res = await fetch('api/auth.php?action=login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username,
        password
      })
    });

    const data = await res.json();

    if (data.success) {

      document.getElementById('login-screen').style.opacity = '0';
      document.getElementById('login-screen').style.transition = 'opacity .4s';

      setTimeout(() => {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('app').style.display = 'flex';
        initApp();
      }, 400);

      mascotWrap.classList.remove('peek');
      mascotFace.classList.add('success-anim');

    } else {

      document.getElementById('loginError').textContent =
        data.message || 'Login gagal';

      document.getElementById('loginError').style.display = 'block';

      mascotFace.classList.add('error-anim');
      setTimeout(() => {
        mascotFace.classList.remove('error-anim');
      }, 700);
    }

  } catch (err) {
    console.error(err);

    document.getElementById('loginError').textContent =
      'Tidak dapat terhubung ke server';

    document.getElementById('loginError').style.display = 'block';
  }
}

async function doLogout() {

  await fetch('api/auth.php?action=logout', {
    method: 'POST'
  });

  location.reload();
}

// ===== INIT =====
async function initApp() {
  const now = new Date();
  document.getElementById('topbarDate').textContent = now.toLocaleDateString('id-ID', {weekday:'long', day:'numeric', month:'long', year:'numeric'});
  refreshDashboard();
  await Promise.all([
    loadSuratMasuk(),
    loadSuratKeluar(),
    loadDokumen(),
    loadAnggota(),
    loadKegiatan(),
    loadNotulensi(),
  ]);
  renderAnggota();
  loadAbsensiSessions();
  renderAbsensiSessionList();
  renderNotulensi();
  initSignature();
  await loadSavedSignature(); // Muat TTD tersimpan dari database
  initSuratKeluarNomor();
  // Set default notulensi date
  const today = new Date().toISOString().split('T')[0];
  const el = document.getElementById('not_tanggal');
  if (el) el.value = today;
  refreshDashboard();
}

// ===== NAVIGATION =====
function navigate(section, el) {
  document.querySelectorAll('.nav-item').forEach(x => x.classList.remove('active'));
  if (el) el.classList.add('active');
  document.querySelectorAll('.page-section').forEach(x => x.classList.remove('active'));
  document.getElementById('sec-' + section).classList.add('active');
  const titles = {dashboard:'Dashboard', surat:'Manajemen Surat', dokumen:'Arsip Dokumen', anggota:'Data Anggota', kegiatan:'Program Kegiatan', absensi:'Absensi', notulensi:'Notulensi Rapat', pengesahan:'TTD Digital'};
  document.getElementById('pageTitle').textContent = titles[section] || section;
  }

function switchTab(group, tab, el) {
  document.querySelectorAll(`#sec-${group} .tab-btn`).forEach(x => x.classList.remove('active'));
  el.classList.add('active');
  document.querySelectorAll(`#sec-${group} .tab-pane`).forEach(x => x.classList.remove('active'));
  document.getElementById(`stab-${tab}`).classList.add('active');
}

// ===== DASHBOARD =====
function refreshDashboard() {
  document.getElementById('stat-surat').textContent = store.suratMasuk.length + store.suratKeluar.length;
  document.getElementById('stat-dok').textContent = store.dokumen.length;
  document.getElementById('stat-anggota').textContent = store.anggota.filter(a => a.status === 'Aktif').length;
  document.getElementById('stat-kegiatan').textContent = store.kegiatan.length;

  const acts = [];
  store.suratMasuk.slice(-3).forEach(s => acts.push({text:`Surat masuk: ${s.perihal} dari ${s.pengirim}`, time: formatDate(s.tanggal), date: s.tanggal}));
  store.suratKeluar.slice(-3).forEach(s => acts.push({text:`Surat keluar: ${s.perihal} ke ${s.tujuan}`, time: formatDate(s.tanggal), date: s.tanggal}));
  store.dokumen.slice(-3).forEach(d => acts.push({text:`Dokumen diarsipkan: ${d.nama}`, time: formatDate(d.tanggal), date: d.tanggal}));
  store.kegiatan.slice(-3).forEach(k => acts.push({text:`Kegiatan: ${k.nama}`, time: formatDate(k.mulai), date: k.mulai}));

  acts.sort((a,b) => new Date(b.date) - new Date(a.date));
  const topActs = acts.slice(0,5);

  document.getElementById('recentActivity').innerHTML = topActs.length
    ? topActs.map(a => `
    <div class="activity-item">
      <div class="activity-dot"></div>
      <div><div class="activity-text">${a.text}</div><div class="activity-time">${a.time}</div></div>
    </div>`).join('')
    : `<div class="activity-item"><div><div class="activity-text">Belum ada aktivitas</div></div></div>`;

  const agendas = store.kegiatan.slice(0,4).map(k => {
    const d = new Date(k.mulai);
    return `<div class="agenda-item">
      <div class="agenda-date"><div class="day">${d.getDate()}</div><div class="mon">${d.toLocaleString('id-ID',{month:'short'})}</div></div>
      <div class="agenda-info"><p>${k.nama}</p><span>${k.tempat} · ${k.divisi}</span></div>
    </div>`;
  }).join('');
  document.getElementById('upcomingAgenda').innerHTML = agendas;
}

// ===== SURAT MASUK =====
function renderSuratMasuk()
 {
  const tbody = document.getElementById('tbodySuratMasuk');
  tbody.innerHTML = store.suratMasuk.map((s, i) => `
    <tr>
      <td>${i+1}</td>
      <td><strong>${s.nomor}</strong></td>
      <td>${formatDate(s.tanggal)}</td>
      <td>${s.pengirim}</td>
      <td>${s.perihal}</td>
      <td><span class="badge ${statusBadge(s.status)}">${s.status}</span></td>
      <td>${s.files.length > 0 ? `<span class="badge badge-gold" style="cursor:pointer;" onclick="detailSuratMasuk(${s.id})"><i class="fas fa-paperclip"></i> ${s.files.length} file</span>` : '<span class="badge badge-gray">—</span>'}</td>
      <td><div class="action-btns">
        <button class="btn btn-outline btn-sm" onclick="detailSuratMasuk(${s.id})"><i class="fas fa-eye"></i></button>
        <button class="btn btn-primary btn-sm" onclick="editSuratMasuk(${s.id})"><i class="fas fa-edit"></i></button>
        <button class="btn btn-danger btn-sm" onclick="hapus('suratMasuk',${s.id})"><i class="fas fa-trash"></i></button>
      </div></td>
    </tr>`).join('') || '<tr><td colspan="8" style="text-align:center;padding:30px;color:#aaa">Belum ada data surat masuk</td></tr>';
}
async function loadSuratMasuk() {

  const response = await fetch('api/surat_masuk.php');
  const data = await response.json();

  // files sudah disertakan dari server (surat_masuk_files)
  data.forEach(item => {
    if (!item.files) item.files = [];
  });

  store.suratMasuk = data;

  renderSuratMasuk();
}
async function saveSuratMasuk() {
  const nomor = document.getElementById('sm_nomor').value.trim();
  const tanggal = document.getElementById('sm_tanggal').value;
  const pengirim = document.getElementById('sm_pengirim').value.trim();
  const perihal = document.getElementById('sm_perihal').value.trim();
  if (!nomor || !tanggal || !pengirim || !perihal) { showToast('Lengkapi semua field yang wajib diisi!', 'error'); return; }

  const newFiles = window.fileDataStore['listSM'] || [];
  let files = [];

if (newFiles.length > 0) {

  files = newFiles.map(f => ({
    name: f.name,
    size: f.size,
    type: f.type,
    dataUrl: f.dataUrl
  }));
}
else if (store.editMode.type === 'suratMasuk') {

  const surat = store.suratMasuk.find(
    x => Number(x.id) === Number(store.editMode.id)
  );

  files = surat?.files || [];

}

const data = {
  id: store.editMode.type === 'suratMasuk' ? store.editMode.id : null,
  nomor,
  tanggal,
  pengirim,
  perihal,
  status: document.getElementById('sm_status').value,
  disposisi: document.getElementById('sm_disposisi').value,
  ket: document.getElementById('sm_ket').value,
  files
};
  let suratId;

  if (store.editMode.type === 'suratMasuk') {
    const putResponse = await fetch('api/surat_masuk.php', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const putResult = await putResponse.json();
    suratId = putResult.id || store.editMode.id;
    showToast('Surat masuk berhasil diperbarui!');
  } else {
    const response = await fetch('api/surat_masuk.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const result = await response.json();
    suratId = result.id;
    showToast('Surat masuk berhasil ditambahkan!');
  }

  // Upload file baru jika ada (berlaku untuk POST maupun PUT/edit)
  if (newFiles.length > 0 && suratId) {
    const formData = new FormData();
    formData.append('surat_id', suratId);
    newFiles.forEach(f => {
      formData.append('files[]', f.file);
    });
    await fetch('api/upload_surat_masuk.php', {
      method: 'POST',
      body: formData
    });
  }

await loadSuratMasuk();
await loadDokumen();

store.editMode = {type:null, id:null};
clearFileStore('listSM');
document.getElementById('fileSM').value = '';
closeModal('modalSuratMasuk');
refreshDashboard();
}

function editSuratMasuk(id) {
  const s = store.suratMasuk.find(
  x => Number(x.id) === Number(id)
);
  store.editMode = { type: 'suratMasuk', id };
  document.getElementById('sm_nomor').value = s.nomor;
  document.getElementById('sm_tanggal').value = s.tanggal;
  document.getElementById('sm_pengirim').value = s.pengirim;
  document.getElementById('sm_terima').value = s.tanggal;
  document.getElementById('sm_perihal').value = s.perihal;
  document.getElementById('sm_status').value = s.status;
  document.getElementById('sm_disposisi').value = s.disposisi;
  document.getElementById('sm_ket').value = s.ket;
  // Restore file list (tampilkan file lama dari server, jangan masuk fileDataStore agar tidak diupload ulang)
  const listEl = document.getElementById('listSM');
  listEl.innerHTML = '';
  window.fileDataStore['listSM'] = []; // hanya file BARU yang ditambahkan user
 // SESUDAH — mirror pola editSuratMasuk
if (s.files && s.files.length > 0) {
  s.files.forEach(f => {
    const name     = typeof f === 'string' ? f : f.name;
    const dataUrl  = typeof f === 'object' ? f.dataUrl   : null;
    const filePath = typeof f === 'object' ? f.file_path : null;  // ← TAMBAH
    const href     = dataUrl || filePath;
    const ftype    = typeof f === 'object' ? (f.type || '') : '';
    const ext      = name ? name.split('.').pop().toLowerCase() : '';
    const isImg    = (ftype && ftype.startsWith('image/'))
                  || ['jpg','jpeg','png','gif','webp','bmp'].includes(ext);

    // Hanya push ke fileDataStore jika file BARU (ada dataUrl, bukan dari server)
    if (typeof f === 'object' && f.dataUrl) window.fileDataStore['listSM'].push(f); // ← FIX

    const div = document.createElement('div');
    div.className = 'file-item';
    div.innerHTML = `
      ${isImg && href
        ? `<img src="${href}" style="width:36px;height:36px;object-fit:cover;border-radius:5px;border:1px solid var(--gray-200);">`
        : `<i class="${fileIcon(name)} file-icon"></i>`}
      <span class="file-name">${name}</span>
      <span class="file-size">${typeof f === 'object' && f.size
        ? (f.size/1024).toFixed(0)+' KB'
        : (filePath ? '<i class="fas fa-server" style="font-size:10px;color:var(--gray-400);" title="Tersimpan di server"></i>' : '')
      }</span>
      <span class="file-remove" onclick="removeFileItem(this,'listSM','${name}')"><i class="fas fa-times"></i></span>`;
    listEl.appendChild(div);
  });
}
  openModal('modalSuratMasuk');
}

function tambahSuratMasuk() {
  store.editMode = { type: null, id: null };
  document.getElementById('sm_nomor').value = '';
  document.getElementById('sm_tanggal').value = new Date().toISOString().split('T')[0];
  document.getElementById('sm_pengirim').value = '';
  document.getElementById('sm_terima').value = new Date().toISOString().split('T')[0];
  document.getElementById('sm_perihal').value = '';
  document.getElementById('sm_status').value = 'Diproses';
  document.getElementById('sm_disposisi').value = 'Ketua';
  document.getElementById('sm_ket').value = '';
  clearFileStore('listSM');
  document.getElementById('listSM').innerHTML = '';
  document.getElementById('fileSM').value = '';
  openModal('modalSuratMasuk');
}

function detailSuratMasuk(id) {
  const s = store.suratMasuk.find(
  x => Number(x.id) === Number(id)
);
  document.getElementById('detailTitle').innerHTML = '<i class="fas fa-envelope-open-text"></i> Detail Surat Masuk';

  // Build lampiran preview section
  let lampiranHtml = '';
  if (s.files && s.files.length > 0) {
    // SESUDAH — mirror pola detailSuratMasuk
const thumbs = s.files.map(f => {
  const name     = typeof f === 'string' ? f : f.name;
  const dataUrl  = typeof f === 'object' ? f.dataUrl   : null;
  const filePath = typeof f === 'object' ? f.file_path : null;   // ← TAMBAH
  const href     = dataUrl || (filePath ? filePath : null);       // ← TAMBAH
  const ftype    = typeof f === 'object' ? (f.type || '') : '';
  const ext      = name ? name.split('.').pop().toLowerCase() : '';
  const isImg    = (ftype && ftype.startsWith('image/'))          // ← TAMBAH ext check
                || ['jpg','jpeg','png','gif','webp','bmp'].includes(ext);

  if (isImg && href) {
    return `<div style="display:flex;flex-direction:column;align-items:center;gap:6px;">
      <a href="${href}" target="_blank" title="${name}">
        <img src="${href}" style="width:90px;height:90px;object-fit:cover;border-radius:8px;border:1.5px solid var(--gray-200);box-shadow:0 2px 8px rgba(0,0,0,.1);">
      </a>
      <span style="font-size:11px;color:var(--gray-600);max-width:90px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:center;">${name}</span>
    </div>`;
  } else if (href) {
    return `<div style="display:flex;flex-direction:column;align-items:center;gap:6px;">
      <a href="${href}" download="${name}" title="Unduh ${name}" style="display:flex;flex-direction:column;align-items:center;text-decoration:none;">
        <div style="width:90px;height:90px;display:flex;flex-direction:column;align-items:center;justify-content:center;border-radius:8px;border:1.5px solid var(--gray-200);background:var(--cream);gap:6px;">
          <i class="${fileIcon(name)}" style="font-size:30px;color:var(--navy-light);"></i>
          <span style="font-size:10px;color:var(--gray-400);text-transform:uppercase;">${ext}</span>
        </div>
      </a>
      <span style="font-size:11px;color:var(--gray-600);max-width:90px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:center;">${name}</span>
    </div>`;
  } else {
    return `<div class="file-thumb"><i class="${fileIcon(name)} fa-lg"></i>${name}</div>`;
  }
}).join('');
    lampiranHtml = `
    <div style="margin-top:18px; border-top:1px solid var(--gray-200); padding-top:14px;">
      <div style="font-size:11px;font-weight:600;color:var(--gray-400);text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px;">
        <i class="fas fa-paperclip" style="margin-right:5px;"></i>Lampiran (${s.files.length} file)
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:12px;align-items:flex-start;">${thumbs}</div>
    </div>`;
  }

  document.getElementById('detailBody').innerHTML = `
    <div class="detail-grid">
      <div class="detail-item"><label>Nomor Surat</label><p>${s.nomor}</p></div>
      <div class="detail-item"><label>Tanggal</label><p>${formatDate(s.tanggal)}</p></div>
      <div class="detail-item"><label>Pengirim</label><p>${s.pengirim}</p></div>
      <div class="detail-item"><label>Status</label><p><span class="badge ${statusBadge(s.status)}">${s.status}</span></p></div>
      <div class="detail-item" style="grid-column:1/-1"><label>Perihal</label><p>${s.perihal}</p></div>
      <div class="detail-item"><label>Disposisi</label><p>${s.disposisi}</p></div>
      <div class="detail-item" style="grid-column:1/-1"><label>Keterangan</label><p>${s.ket || '—'}</p></div>
    </div>
    ${lampiranHtml}
  `;
  openModal('modalDetail');
}

// ===== SURAT KELUAR =====
let skCounter = 3;
function initSuratKeluarNomor() {
  document.getElementById('sk_nomor').value = `SK/${String(skCounter).padStart(3,'0')}/HM/2025`;
}

function renderSuratKeluar() {
  const tbody = document.getElementById('tbodySuratKeluar');
  tbody.innerHTML = store.suratKeluar.map((s, i) => `
    <tr>
      <td>${i+1}</td>
      <td><strong>${s.nomor}</strong></td>
      <td>${formatDate(s.tanggal)}</td>
      <td>${s.tujuan}</td>
      <td>${s.perihal}</td>
      <td><span class="badge ${statusBadge(s.status)}">${s.status}</span></td>
      <td>${s.files && s.files.length > 0 ? `<span class="badge badge-gold" style="cursor:pointer;" onclick="detailSuratKeluar(${s.id})"><i class="fas fa-paperclip"></i> ${s.files.length} file</span>` : '<span class="badge badge-gray">—</span>'}</td>
      <td><div class="action-btns">
        <button class="btn btn-outline btn-sm" onclick="previewSuratById(${s.id})"><i class="fas fa-eye"></i></button>
        <button class="btn btn-primary btn-sm" onclick="editSuratKeluar(${s.id})"><i class="fas fa-edit"></i></button>
        <button class="btn btn-success btn-sm" onclick="exportSuratKeluarWordById(${s.id})" title="Export Word"><i class="fas fa-file-word"></i></button>
        <button class="btn btn-danger btn-sm" onclick="exportSuratKeluarPDFById(${s.id})" title="Export PDF"><i class="fas fa-file-pdf"></i></button>
        <button class="btn btn-danger btn-sm" onclick="hapus('suratKeluar',${s.id})"><i class="fas fa-trash"></i></button>
      </div></td>
    </tr>`).join('') || '<tr><td colspan="8" style="text-align:center;padding:30px;color:#aaa">Belum ada data surat keluar</td></tr>';
}

async function loadSuratKeluar() {
  try {
    const res  = await fetch('api/surat_keluar.php');
    const data = await res.json();
    store.suratKeluar = data.map(s => ({
      ...s,
      id   : Number(s.id),
      di   : s.lokasi || s.di || '',
      files: (s.files || [])
    }));
    if (store.suratKeluar.length > 0) {
      const maxId = Math.max(...store.suratKeluar.map(s => s.id));
      skCounter = maxId + 1;
    }
    renderSuratKeluar();
    refreshDashboard();
  } catch (e) {
    console.error('Gagal load surat keluar:', e);
  }
}

async function saveSuratKeluar() {
  const newFiles = window.fileDataStore['listSK'] || [];
  const nomor   = document.getElementById('sk_nomor').value;
  const tanggal = document.getElementById('sk_tanggal').value;
  const tujuan  = document.getElementById('sk_tujuan').value.trim();
  const perihal = document.getElementById('sk_perihal').value.trim();
  if (!tanggal || !tujuan || !perihal) { showToast('Lengkapi semua field yang wajib diisi!', 'error'); return; }
  const isEdit   = store.editMode.type === 'suratKeluar';

  const payload = {
    nomor, tanggal, tujuan,
    di     : document.getElementById('sk_di').value,
    perihal,
    isi    : document.getElementById('sk_isi').value,
    ttd    : document.getElementById('sk_ttd').value,
    status : document.getElementById('sk_status').value,
  };

  try {
    let suratId;

    if (isEdit) {
      payload.id = store.editMode.id;
      const res  = await fetch('api/surat_keluar.php', {
        method : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify(payload)
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.message || 'Gagal update');
      suratId = payload.id;
      showToast('Surat keluar berhasil diperbarui!');
    } else {
      const res  = await fetch('api/surat_keluar.php', {
        method : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify(payload)
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.message || 'Gagal simpan');
      suratId = result.id;
      skCounter++;
      showToast('Surat keluar berhasil dibuat & diarsipkan!');
    }

    if (newFiles.length > 0 && suratId) {
  console.log('suratId:', suratId);
  console.log('jumlah file:', newFiles.length);
  newFiles.forEach((f, i) => console.log('file ke-' + i, f.name, f.file instanceof File));

  const fd = new FormData();
  fd.append('surat_id', suratId);
  newFiles.forEach(f => fd.append('files[]', f.file));

  const uploadRes = await fetch('api/upload_surat_keluar.php', { method: 'POST', body: fd });
  const text = await uploadRes.text();
console.log('RESPON SERVER:', text);
}

    store.editMode = { type: null, id: null };
    clearFileStore('listSK');
    document.getElementById('fileSK').value = '';
    closeModal('modalSuratKeluar');
    await loadSuratKeluar();
    await loadDokumen();
    initSuratKeluarNomor();
    refreshDashboard();

  } catch (e) {
    console.error('saveSuratKeluar error:', e);
    showToast('Gagal menyimpan surat keluar: ' + e.message, 'error');
  }
}

function editSuratKeluar(id) {
  const s = store.suratKeluar.find(x => x.id === id);
  store.editMode = { type: 'suratKeluar', id };
  document.getElementById('sk_nomor').value = s.nomor;
  document.getElementById('sk_tanggal').value = s.tanggal;
  document.getElementById('sk_tujuan').value = s.tujuan;
  document.getElementById('sk_di').value = s.di;
  document.getElementById('sk_perihal').value = s.perihal;
  document.getElementById('sk_isi').value = s.isi;
  document.getElementById('sk_ttd').value = s.ttd;
  document.getElementById('sk_status').value = s.status;

  const listEl = document.getElementById('listSK');
  listEl.innerHTML = '';
  window.fileDataStore['listSK'] = [];

  if (s.files && s.files.length > 0) {
    s.files.forEach(f => {
      const name     = typeof f === 'string' ? f : f.name;
      const dataUrl  = typeof f === 'object' ? f.dataUrl   : null;
      const filePath = typeof f === 'object' ? f.file_path : null;
      const href     = dataUrl || filePath;
      const ftype    = typeof f === 'object' ? (f.type || '') : '';
      const ext      = name ? name.split('.').pop().toLowerCase() : '';
      const isImg    = (ftype && ftype.startsWith('image/'))
                    || ['jpg','jpeg','png','gif','webp','bmp'].includes(ext);

      // hanya file BARU (punya dataUrl) yang masuk fileDataStore, file lama dari server tidak ikut diupload ulang
      if (typeof f === 'object' && f.dataUrl) window.fileDataStore['listSK'].push(f);

      const div = document.createElement('div');
      div.className = 'file-item';
      div.innerHTML = `
        ${isImg && href
          ? `<img src="${href}" style="width:36px;height:36px;object-fit:cover;border-radius:5px;border:1px solid var(--gray-200);">`
          : `<i class="${fileIcon(name)} file-icon"></i>`}
        <span class="file-name">${name}</span>
        <span class="file-size">${typeof f === 'object' && f.size
          ? (f.size/1024).toFixed(0)+' KB'
          : (filePath ? '<i class="fas fa-server" style="font-size:10px;color:var(--gray-400);" title="Tersimpan di server"></i>' : '')
        }</span>
        <span class="file-remove" onclick="removeFileItem(this,'listSK','${name}')"><i class="fas fa-times"></i></span>`;
      listEl.appendChild(div);
    });
  }
  openModal('modalSuratKeluar');
}

function tambahSuratKeluar() {
  store.editMode = { type: null, id: null };
  initSuratKeluarNomor();
  document.getElementById('sk_tanggal').value = new Date().toISOString().split('T')[0];
  document.getElementById('sk_tujuan').value = '';
  document.getElementById('sk_di').value = '';
  document.getElementById('sk_perihal').value = '';
  document.getElementById('sk_isi').value = '';
  document.getElementById('sk_ttd').value = '';
  document.getElementById('sk_status').value = 'Draft';
  clearFileStore('listSK');
  document.getElementById('listSK').innerHTML = '';
  document.getElementById('fileSK').value = '';
  openModal('modalSuratKeluar');
}

function detailSuratKeluar(id) {
  const s = store.suratKeluar.find(x => x.id === id);
  document.getElementById('detailTitle').innerHTML = '<i class="fas fa-paper-plane"></i> Detail Surat Keluar';
  let lampiranHtml = '';
  if (s.files && s.files.length > 0) {
    const thumbs = s.files.map(f => {
      const name     = typeof f === 'string' ? f : f.name;
      const dataUrl  = typeof f === 'object' ? f.dataUrl   : null;
      const filePath = typeof f === 'object' ? f.file_path : null;
      const href     = dataUrl || filePath;
      const ftype    = typeof f === 'object' ? (f.type || '') : '';
      const ext      = name ? name.split('.').pop().toLowerCase() : '';
      const isImg    = (ftype && ftype.startsWith('image/'))
                    || ['jpg','jpeg','png','gif','webp','bmp'].includes(ext);

      if (isImg && href) {
        return `<div style="display:flex;flex-direction:column;align-items:center;gap:6px;">
          <a href="${href}" target="_blank" title="${name}">
            <img src="${href}" style="width:90px;height:90px;object-fit:cover;border-radius:8px;border:1.5px solid var(--gray-200);box-shadow:0 2px 8px rgba(0,0,0,.1);">
          </a>
          <span style="font-size:11px;color:var(--gray-600);max-width:90px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:center;">${name}</span>
        </div>`;
      } else if (href) {
        return `<div style="display:flex;flex-direction:column;align-items:center;gap:6px;">
          <a href="${href}" download="${name}" title="Unduh ${name}" style="display:flex;flex-direction:column;align-items:center;text-decoration:none;">
            <div style="width:90px;height:90px;display:flex;flex-direction:column;align-items:center;justify-content:center;border-radius:8px;border:1.5px solid var(--gray-200);background:var(--cream);gap:6px;">
              <i class="${fileIcon(name)}" style="font-size:30px;color:var(--navy-light);"></i>
              <span style="font-size:10px;color:var(--gray-400);text-transform:uppercase;">${ext}</span>
            </div>
          </a>
          <span style="font-size:11px;color:var(--gray-600);max-width:90px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:center;">${name}</span>
        </div>`;
      } else {
        return `<div class="file-thumb"><i class="${fileIcon(name)} fa-lg"></i>${name}</div>`;
      }
    }).join('');
    lampiranHtml = `
    <div style="margin-top:18px; border-top:1px solid var(--gray-200); padding-top:14px;">
      <div style="font-size:11px;font-weight:600;color:var(--gray-400);text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px;">
        <i class="fas fa-paperclip" style="margin-right:5px;"></i>Lampiran (${s.files.length} file)
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:12px;align-items:flex-start;">${thumbs}</div>
    </div>`;
  }
  document.getElementById('detailBody').innerHTML = `
    <div class="detail-grid">
      <div class="detail-item"><label>Nomor Surat</label><p>${s.nomor}</p></div>
      <div class="detail-item"><label>Tanggal</label><p>${formatDate(s.tanggal)}</p></div>
      <div class="detail-item"><label>Kepada</label><p>${s.tujuan}</p></div>
      <div class="detail-item"><label>Status</label><p><span class="badge ${statusBadge(s.status)}">${s.status}</span></p></div>
      <div class="detail-item" style="grid-column:1/-1"><label>Perihal</label><p>${s.perihal}</p></div>
      <div class="detail-item"><label>Penandatangan</label><p>${s.ttd || '—'}</p></div>
      <div class="detail-item" style="grid-column:1/-1"><label>Isi Surat</label><p>${s.isi || '—'}</p></div>
    </div>
    ${lampiranHtml}
  `;
  openModal('modalDetail');
}

function previewSuratKeluar() {
  const tujuan = document.getElementById('sk_tujuan').value || '...';
  const di = document.getElementById('sk_di').value || '...';
  const perihal = document.getElementById('sk_perihal').value || '...';
  const isi = document.getElementById('sk_isi').value || '...';
  const nomor = document.getElementById('sk_nomor').value;
  const tanggal = document.getElementById('sk_tanggal').value ? formatDate(document.getElementById('sk_tanggal').value) : '...';
  const ttd = document.getElementById('sk_ttd').value || '...';
  generatePreviewSurat(nomor, tanggal, tujuan, di, perihal, isi, ttd);
}

function previewSuratById(id) {
  const s = store.suratKeluar.find(x => x.id === id);
  generatePreviewSurat(s.nomor, formatDate(s.tanggal), s.tujuan, s.di, s.perihal, s.isi, s.ttd);
}

function generatePreviewSurat(nomor, tanggal, tujuan, di, perihal, isi, ttd) {
  const sigImg = store.savedSignature ? `<img src="${store.savedSignature}" style="width:120px; margin:8px auto; display:block;">` : '';
  document.getElementById('previewContent').innerHTML = `
    <div class="kop">
      <h2>Himpunan Mahasiswa Informatika</h2>
      <p>Fakultas Teknik | Universitas Nusantara</p>
      <p>Sekretariat: Gedung A Lt. 2, Kampus Utama</p>
    </div>
    <table class="surat-body"><tr>
      <td width="20%">Nomor</td><td width="5%">:</td><td>${nomor}</td>
    </tr><tr>
      <td>Tanggal</td><td>:</td><td>${tanggal}</td>
    </tr><tr>
      <td>Perihal</td><td>:</td><td>${perihal}</td>
    </tr></table>
    <br>
    <p>Kepada Yth.<br><strong>${tujuan}</strong><br>Di- ${di}</p>
    <br>
    <p>Dengan hormat,</p>
    <p>${isi}</p>
    <br>
    <p>Demikian surat ini kami sampaikan. Atas perhatian dan kerjasamanya, kami ucapkan terima kasih.</p>
    <div class="ttd">
      <div class="ttd-box">
        <p>Hormat kami,</p>
        ${sigImg}
        <div class="ttd-name">${ttd}</div>
        <small>Ketua HMIF 2024/2025</small>
      </div>
    </div>`;
  openModal('modalPreviewSurat');
}

// ===== DOKUMEN =====
function renderDokumen() {
  const tbody = document.getElementById('tbodyDokumen');
  tbody.innerHTML = store.dokumen.map((d, i) => {
    const isAuto = d.sumber === 'surat_masuk' || d.sumber === 'surat_keluar';
    const sumberBadge = d.sumber === 'surat_masuk'
      ? `<span class="badge" style="background:var(--teal,#0d9488);color:#fff;font-size:10px;margin-left:4px"><i class="fas fa-inbox"></i> Surat Masuk</span>`
      : d.sumber === 'surat_keluar'
      ? `<span class="badge" style="background:var(--navy-light,#1e40af);color:#fff;font-size:10px;margin-left:4px"><i class="fas fa-paper-plane"></i> Surat Keluar</span>`
      : '';
    return `
    <tr>
      <td>${i+1}</td>
      <td><strong>${d.nama}</strong>${sumberBadge}</td>
      <td><span class="badge badge-info">${d.kategori}</span></td>
      <td>${formatDate(d.tanggal)}</td>
      <td>${d.ukuran}</td>
      <td style="max-width:160px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${d.deskripsi}</td>
      <td><span class="badge badge-gold"><i class="fas fa-file"></i> ${d.files.length}</span></td>
      <td><div class="action-btns">
        <button class="btn btn-outline btn-sm" onclick="detailDokumen(${d.id})"><i class="fas fa-eye"></i></button>
        ${!isAuto ? `<button class="btn btn-primary btn-sm" onclick="editDokumen(${d.id})"><i class="fas fa-edit"></i></button>` : `<button class="btn btn-outline btn-sm" disabled title="Dokumen otomatis dari surat, edit melalui Manajemen Surat"><i class="fas fa-lock"></i></button>`}
        <button class="btn btn-danger btn-sm" onclick="hapus('dokumen',${d.id})"><i class="fas fa-trash"></i></button>
      </div></td>
    </tr>`;
  }).join('') || '<tr><td colspan="8" style="text-align:center;padding:30px;color:#aaa">Belum ada arsip dokumen</td></tr>';
}

async function loadDokumen() {
  try {
    const res  = await fetch('api/dokumen.php');
    const data = await res.json();
    // Normalise: API mengembalikan files sebagai array objek {id,name,file_path}
    store.dokumen = data.map(d => ({
      ...d,
      id: Number(d.id),
      files: (d.files || []).map(f => typeof f === 'string' ? f : f.name),
      _filesRaw: d.files || []  // simpan raw untuk download link
    }));
    renderDokumen();
    refreshDashboard();
  } catch (e) {
    console.error('Gagal load dokumen:', e);
    showToast('Gagal memuat data dokumen dari server', 'error');
  }
}

async function saveDokumen() {
  const nama     = document.getElementById('dok_nama').value.trim();
  const kategori = document.getElementById('dok_kategori').value;
  if (!nama) { showToast('Nama dokumen wajib diisi!', 'error'); return; }

  const inputFiles = document.getElementById('fileDok').files;
  const isEdit     = store.editMode.type === 'dokumen';
  const existing   = isEdit ? store.dokumen.find(x => x.id === store.editMode.id) : null;

  const totalSize = inputFiles.length > 0
    ? (Array.from(inputFiles).reduce((a, f) => a + f.size, 0) / 1024 / 1024).toFixed(2) + ' MB'
    : (existing ? existing.ukuran : '—');

  const payload = {
    nama,
    kategori,
    tanggal  : new Date().toISOString().split('T')[0],
    ukuran   : totalSize,
    deskripsi: document.getElementById('dok_deskripsi').value,
    tahun    : document.getElementById('dok_tahun').value,
  };

  try {
    let dokumenId;

    if (isEdit) {
      payload.id = store.editMode.id;
      const res  = await fetch('api/dokumen.php', {
        method : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify(payload)
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.message || 'Gagal update');
      dokumenId = payload.id;
      showToast('Dokumen berhasil diperbarui!');
    } else {
      const res  = await fetch('api/dokumen.php', {
        method : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify(payload)
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.message || 'Gagal simpan');
      dokumenId = result.id;
      showToast('Dokumen berhasil diarsipkan!');
    }

    // Upload file jika ada
    if (inputFiles.length > 0) {
      const fd = new FormData();
      fd.append('dokumen_id', dokumenId);
      Array.from(inputFiles).forEach(f => fd.append('files[]', f));
      await fetch('api/upload_dokumen.php', { method: 'POST', body: fd });
    }

    store.editMode = { type: null, id: null };
    closeModal('modalDokumen');
    await loadDokumen();
    refreshDashboard();

  } catch (e) {
    console.error('saveDokumen error:', e);
    showToast('Gagal menyimpan dokumen: ' + e.message, 'error');
  }
}

function tambahDokumen() {
  store.editMode = { type: null, id: null };
  document.getElementById('dok_nama').value      = '';
  document.getElementById('dok_kategori').value  = 'AD/ART';
  document.getElementById('dok_tahun').value     = new Date().getFullYear();
  document.getElementById('dok_deskripsi').value = '';
  document.getElementById('listDok').innerHTML   = '';
  document.getElementById('fileDok').value       = '';
  openModal('modalDokumen');
}

function editDokumen(id) {
  const d = store.dokumen.find(x => x.id === id);
  store.editMode = { type: 'dokumen', id };
  document.getElementById('dok_nama').value      = d.nama;
  document.getElementById('dok_kategori').value  = d.kategori;
  document.getElementById('dok_tahun').value     = d.tahun;
  document.getElementById('dok_deskripsi').value = d.deskripsi;
  document.getElementById('fileDok').value       = '';
  const rawFiles = d._filesRaw || d.files.map(f => ({ name: f, file_path: '' }));
  document.getElementById('listDok').innerHTML   = rawFiles.map(f => {
    const fname = typeof f === 'string' ? f : f.name;
    const fpath = typeof f === 'object' && f.file_path ? f.file_path : null;
    const fid   = typeof f === 'object' && f.id ? f.id : null;
    return `<div class="file-item">
      <i class="${fileIcon(fname)} file-icon"></i>
      <span class="file-name">${fname}</span>
      ${fpath ? `<a href="${fpath}" target="_blank" style="margin-left:6px;font-size:11px;color:var(--primary)"><i class="fas fa-download"></i></a>` : ''}
      ${fid ? `<button type="button" onclick="hapusFileDokumen(${fid}, this)" style="margin-left:6px;border:none;background:none;color:var(--danger,#dc2626);cursor:pointer;font-size:11px;"><i class="fas fa-trash"></i></button>` : ''}
    </div>`;
  }).join('');
  openModal('modalDokumen');
}

async function hapusFileDokumen(fileId, btn) {
  if (!confirm('Hapus file ini dari dokumen?')) return;
  try {
    const res = await fetch(`api/dokumen.php?file_id=${fileId}`, { method: 'DELETE' });
    const result = await res.json();
    if (!result.success) throw new Error(result.message || 'Gagal menghapus file');
    btn.closest('.file-item').remove();
    await loadDokumen();
    showToast('File berhasil dihapus!');
  } catch (e) {
    console.error('hapusFileDokumen error:', e);
    showToast('Gagal menghapus file: ' + e.message, 'error');
  }
}

function detailDokumen(id) {
  const d = store.dokumen.find(x => x.id === id);
  const rawFiles = d._filesRaw || d.files.map(f => ({ name: f, file_path: '' }));
  document.getElementById('detailTitle').innerHTML = '<i class="fas fa-folder-open"></i> Detail Dokumen';
  document.getElementById('detailBody').innerHTML  = `
    <div class="detail-grid">
      <div class="detail-item"><label>Nama Dokumen</label><p>${d.nama}</p></div>
      <div class="detail-item"><label>Kategori</label><p><span class="badge badge-info">${d.kategori}</span></p></div>
      <div class="detail-item"><label>Tanggal Upload</label><p>${formatDate(d.tanggal)}</p></div>
      <div class="detail-item"><label>Tahun</label><p>${d.tahun}</p></div>
      <div class="detail-item" style="grid-column:1/-1"><label>Deskripsi</label><p>${d.deskripsi || '—'}</p></div>
    </div>
    <div style="margin-top:16px">
      <label style="font-weight:600;font-size:13px;">File Terlampir (${rawFiles.length})</label>
      <div class="file-thumb-list">${rawFiles.map(f => {
        const fname = typeof f === 'string' ? f : f.name;
        const fpath = typeof f === 'object' && f.file_path ? f.file_path : null;
        return `<div class="file-thumb" style="cursor:${fpath?'pointer':'default'}" ${fpath?`onclick="window.open('${fpath}','_blank')"`:''}  title="${fpath?'Klik untuk buka file':''}">
          <i class="${fileIcon(fname)}"></i>${fname}
          ${fpath ? '<br><small style="color:var(--primary)"><i class="fas fa-external-link-alt"></i> Buka</small>' : ''}
        </div>`;
      }).join('')}</div>
    </div>`;
  openModal('modalDetail');
}

// ===== ANGGOTA =====
function renderAnggota() {
  const tbody = document.getElementById('tbodyAnggota');
  tbody.innerHTML = store.anggota.map((a, i) => `
    <tr>
      <td>${i+1}</td>
      <td><code>${a.nim}</code></td>
      <td>
        <div style="display:flex;align-items:center;gap:9px;">
          <div class="user-avatar" style="width:30px;height:30px;font-size:12px;">${a.nama.charAt(0)}</div>
          <strong>${a.nama}</strong>
        </div>
      </td>
      <td>${a.jabatan}</td>
      <td><span class="badge badge-info">${a.bidang}</span></td>
      <td>${a.angkatan}</td>
      <td><span class="badge ${a.status==='Aktif'?'badge-success':a.status==='Non-Aktif'?'badge-danger':'badge-warning'}">${a.status}</span></td>
      <td><div class="action-btns">
        <button class="btn btn-outline btn-sm" onclick="detailAnggota(${a.id})"><i class="fas fa-eye"></i></button>
        <button class="btn btn-primary btn-sm" onclick="editAnggota(${a.id})"><i class="fas fa-edit"></i></button>
        <button class="btn btn-danger btn-sm" onclick="hapus('anggota',${a.id})"><i class="fas fa-trash"></i></button>
      </div></td>
    </tr>`).join('') || '<tr><td colspan="8" style="text-align:center;padding:30px;color:#aaa">Belum ada data anggota</td></tr>';
}
async function loadAnggota() {
    console.log("LOAD ANGGOTA JALAN");

    const response = await fetch('api/anggota.php');
    const data = await response.json();

    console.log("DATA MYSQL:", data);

    store.anggota = data;

    console.log("STORE:", store.anggota);

    renderAnggota();
}
async function saveAnggota() {
  const nim = document.getElementById('ang_nim').value.trim();
  const nama = document.getElementById('ang_nama').value.trim();
  if (!nim || !nama) { showToast('NIM dan Nama wajib diisi!', 'error'); return; }

  const data = {
    id: store.editMode.type === 'anggota' ? store.editMode.id : null,
    nim, nama,
    jabatan: document.getElementById('ang_jabatan').value,
    bidang: document.getElementById('ang_bidang').value,
    angkatan: document.getElementById('ang_angkatan').value,
    hp: document.getElementById('ang_hp').value,
    email: document.getElementById('ang_email').value,
    status: document.getElementById('ang_status').value,
  };

  if (store.editMode.type === 'anggota') {
  await fetch('api/anggota.php', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });
  showToast('Data anggota berhasil diperbarui!');
} else {
  await fetch('api/anggota.php', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });
  showToast('Anggota baru berhasil ditambahkan!');
}
await loadAnggota();

  store.editMode = {type:null, id:null};
  closeModal('modalAnggota');
  renderAnggota();
  refreshDashboard();
}

function tambahAnggota() {
  store.editMode = { type: null, id: null };
  document.getElementById('modalAnggotaTitle').innerHTML = '<i class="fas fa-user-plus"></i> Tambah Anggota';
  document.getElementById('ang_nim').value = '';
  document.getElementById('ang_nama').value = '';
  document.getElementById('ang_jabatan').value = 'Anggota';
  document.getElementById('ang_bidang').value = 'BPH';
  document.getElementById('ang_angkatan').value = '';
  document.getElementById('ang_hp').value = '';
  document.getElementById('ang_email').value = '';
  document.getElementById('ang_status').value = 'Aktif';
  openModal('modalAnggota');
}

function editAnggota(id) {
  const a = store.anggota.find(x => Number(x.id) === Number(id));
  store.editMode = { type: 'anggota', id };
  document.getElementById('modalAnggotaTitle').innerHTML = '<i class="fas fa-user-edit"></i> Edit Anggota';
  document.getElementById('ang_nim').value = a.nim;
  document.getElementById('ang_nama').value = a.nama;
  document.getElementById('ang_jabatan').value = a.jabatan;
  document.getElementById('ang_bidang').value = a.bidang;
  document.getElementById('ang_angkatan').value = a.angkatan;
  document.getElementById('ang_hp').value = a.hp;
  document.getElementById('ang_email').value = a.email;
  document.getElementById('ang_status').value = a.status;
  openModal('modalAnggota');
}

function detailAnggota(id) {
 const a = store.anggota.find(x => Number(x.id) === Number(id));
  document.getElementById('detailTitle').innerHTML = '<i class="fas fa-user"></i> Detail Anggota';
  document.getElementById('detailBody').innerHTML = `
    <div style="display:flex; align-items:center; gap:18px; margin-bottom:20px; padding-bottom:18px; border-bottom:1px solid var(--gray-200);">
      <div class="user-avatar" style="width:64px;height:64px;font-size:26px;">${a.nama.charAt(0)}</div>
      <div>
        <h3 style="font-family:'DM Serif Display',serif; font-size:20px; color:var(--navy)">${a.nama}</h3>
        <p style="color:var(--gray-600); font-size:13px;">${a.jabatan} · ${a.bidang}</p>
        <span class="badge ${a.status==='Aktif'?'badge-success':a.status==='Non-Aktif'?'badge-danger':'badge-warning'}" style="margin-top:4px;">${a.status}</span>
      </div>
    </div>
    <div class="detail-grid">
      <div class="detail-item"><label>NIM</label><p>${a.nim}</p></div>
      <div class="detail-item"><label>Angkatan</label><p>${a.angkatan}</p></div>
      <div class="detail-item"><label>No. HP</label><p>${a.hp}</p></div>
      <div class="detail-item"><label>Email</label><p>${a.email}</p></div>
    </div>`;
  openModal('modalDetail');}

// ===== KEGIATAN =====
async function loadKegiatan() {
  try {
    const res = await fetch('api/kegiatan.php');
    const data = await res.json();
    store.kegiatan = data.map(k => ({
      id: Number(k.id),
      nama: k.nama,
      mulai: k.mulai,
      selesai: k.selesai,
      tempat: k.tempat,
      pj: k.pj,
      divisi: k.divisi,
      status: k.status,
      deskripsi: k.deskripsi,
    }));
  } catch (e) {
    console.error('Gagal memuat kegiatan:', e);
    store.kegiatan = [];
  }
  renderKegiatan();
  refreshDashboard();
}

function renderKegiatan() {
  const kegStatusColor = { 'Direncanakan':'badge-info', 'Berjalan':'badge-success', 'Selesai':'badge-gray', 'Dibatalkan':'badge-danger' };
  document.getElementById('kegiatanList').innerHTML = store.kegiatan.map(k => {
    const d = new Date(k.mulai);
    return `<div class="kegiatan-card">
      <div class="kegiatan-badge">
        <div class="day">${d.getDate()}</div>
        <div class="mon">${d.toLocaleString('id-ID',{month:'short'})}</div>
      </div>
      <div class="kegiatan-info" style="flex:1">
        <h4>${k.nama}</h4>
        <p><i class="fas fa-map-marker-alt"></i> ${k.tempat} &nbsp;·&nbsp; <i class="fas fa-user"></i> PJ: ${k.pj} &nbsp;·&nbsp; <i class="fas fa-layer-group"></i> ${k.divisi}</p>
        <p style="margin-top:4px; color:var(--gray-400)">${k.deskripsi}</p>
      </div>
      <div style="display:flex; flex-direction:column; align-items:flex-end; gap:10px;">
        <span class="badge ${kegStatusColor[k.status]}">${k.status}</span>
        <div class="action-btns">
          <button class="btn btn-primary btn-sm" onclick="editKegiatan(${k.id})"><i class="fas fa-edit"></i></button>
          <button class="btn btn-danger btn-sm" onclick="hapus('kegiatan',${k.id})"><i class="fas fa-trash"></i></button>
        </div>
      </div>
    </div>`;
  }).join('') || '<div class="alert alert-info"><i class="fas fa-info-circle"></i> Belum ada kegiatan terdaftar.</div>';

  populateAbsenKegiatan();
}

async function saveKegiatan() {
  const nama = document.getElementById('keg_nama').value.trim();
  const mulai = document.getElementById('keg_mulai').value;
  if (!nama || !mulai) { showToast('Nama dan tanggal wajib diisi!', 'error'); return; }

  const data = {
    nama, mulai,
    selesai: document.getElementById('keg_selesai').value,
    tempat: document.getElementById('keg_tempat').value,
    pj: document.getElementById('keg_pj').value,
    divisi: document.getElementById('keg_bidang').value,
    status: document.getElementById('keg_status').value,
    deskripsi: document.getElementById('keg_deskripsi').value,
  };

  if (store.editMode.type === 'kegiatan') {
    data.id = store.editMode.id;
    await fetch('api/kegiatan.php', {
      method: 'PUT',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify(data)
    });
    showToast('Kegiatan berhasil diperbarui!');
  } else {
    await fetch('api/kegiatan.php', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify(data)
    });
    showToast('Kegiatan berhasil ditambahkan!');
  }

  store.editMode = {type:null, id:null};
  closeModal('modalKegiatan');
  await loadKegiatan();
  refreshDashboard();
}

function tambahKegiatan() {
  store.editMode = { type: null, id: null };
  document.getElementById('keg_nama').value = '';
  document.getElementById('keg_mulai').value = new Date().toISOString().split('T')[0];
  document.getElementById('keg_selesai').value = '';
  document.getElementById('keg_tempat').value = '';
  document.getElementById('keg_pj').value = '';
  document.getElementById('keg_bidang').value = 'BPH';
  document.getElementById('keg_status').value = 'Direncanakan';
  document.getElementById('keg_deskripsi').value = '';
  openModal('modalKegiatan');
}

function editKegiatan(id) {
  const k = store.kegiatan.find(x => x.id === id);
  store.editMode = { type: 'kegiatan', id };
  document.getElementById('keg_nama').value = k.nama;
  document.getElementById('keg_mulai').value = k.mulai;
  document.getElementById('keg_selesai').value = k.selesai;
  document.getElementById('keg_tempat').value = k.tempat;
  document.getElementById('keg_pj').value = k.pj;
  document.getElementById('keg_bidang').value = k.divisi;
  document.getElementById('keg_status').value = k.status;
  document.getElementById('keg_deskripsi').value = k.deskripsi;
  openModal('modalKegiatan');
}

// ===== ABSENSI =====
let currentAbsensiId = null;

function populateAbsenKegiatan() {
  // populate filter in banner
  const filter = document.getElementById('filterAbsenKegiatan');
  if (filter) {
    filter.innerHTML = '<option value="">Semua Kegiatan</option>' +
      store.kegiatan.map(k => `<option value="${k.id}">${k.nama}</option>`).join('');
  }
  // populate modal select
  const sel = document.getElementById('abs_kegiatan');
  if (sel) {
    sel.innerHTML = '<option value="">-- Pilih Kegiatan --</option>' +
      store.kegiatan.map(k => `<option value="${k.id}">${k.nama}</option>`).join('');
  }
}

async function loadAbsensiSessions() {
  try {
    const res = await fetch('api/absensi.php');
    const data = await res.json();
    store.absensiSessions = data;
  } catch (e) {
    console.error('Gagal memuat absensi:', e);
    store.absensiSessions = [];
  }
  renderAbsensiSessionList();
}

async function buatAbsensiSesi() {
  const nama = document.getElementById('abs_nama').value.trim();
  const tanggal = document.getElementById('abs_tanggal').value;
  if (!nama || !tanggal) { showToast('Nama agenda dan tanggal wajib diisi!', 'error'); return; }

  const kegId = parseInt(document.getElementById('abs_kegiatan').value) || null;
  const mode = document.getElementById('abs_peserta_mode').value;

  const peserta = mode === 'all'
    ? store.anggota.filter(a => a.status === 'Aktif').map(a => ({ nama: a.nama, nim: a.nim, ket: a.jabatan, status: 'Hadir' }))
    : [];

  const sesi = {
    nama, tanggal,
    kegiatanId: kegId,
    tempat: document.getElementById('abs_tempat').value || '-',
    mulai: document.getElementById('abs_mulai').value || '-',
    peserta,
  };

  await fetch('api/absensi.php', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify(sesi)
  });

  closeModal('modalBuatAbsensi');
  document.getElementById('abs_nama').value = '';
  document.getElementById('abs_tempat').value = '';
  showToast('Sesi absensi berhasil dibuat!');
  await loadAbsensiSessions();
}

function renderAbsensiSessionList() {
  document.getElementById('absensiSessionList').style.display = '';
  document.getElementById('absensiDetail').style.display = 'none';

  const filter = document.getElementById('filterAbsenKegiatan').value;
  let sessions = store.absensiSessions;
  if (filter) sessions = sessions.filter(s => s.kegiatanId == filter);

  if (sessions.length === 0) {
    document.getElementById('absensiSessionList').innerHTML = `
      <div style="background:var(--white); border-radius:var(--radius); box-shadow:var(--shadow); padding:40px; text-align:center; color:var(--gray-400);">
        <i class="fas fa-clipboard-list" style="font-size:48px; opacity:.3; margin-bottom:14px; display:block;"></i>
        <p style="font-size:14px; font-weight:600; color:var(--gray-600);">Belum Ada Sesi Absensi</p>
        <p style="font-size:13px; margin-top:6px;">Klik <strong>"Buat Absensi Baru"</strong> untuk membuat sesi absensi pertama.</p>
      </div>`;
    return;
  }

  document.getElementById('absensiSessionList').innerHTML = sessions.map(s => {
    const hadir = s.peserta.filter(p => p.status === 'Hadir').length;
    const izin  = s.peserta.filter(p => p.status === 'Izin').length;
    const sakit = s.peserta.filter(p => p.status === 'Sakit').length;
    const alfa  = s.peserta.filter(p => p.status === 'Alfa').length;
    const total = s.peserta.length;
    const pct = total > 0 ? Math.round(hadir/total*100) : 0;
    const d = new Date(s.tanggal);
    return `
    <div class="card" style="margin-bottom:14px; transition:transform .15s; cursor:pointer;" onclick="openAbsensiSession(${s.id})" onmouseover="this.style.transform='translateY(-2px)'" onmouseout="this.style.transform=''">
      <div style="padding:16px 20px; display:flex; gap:18px; align-items:center; flex-wrap:wrap;">
        <div style="background:var(--navy); color:#fff; border-radius:10px; padding:10px 14px; text-align:center; min-width:54px; flex-shrink:0;">
          <div style="font-size:22px; font-weight:700; font-family:'DM Serif Display',serif; line-height:1;">${d.getDate()}</div>
          <div style="font-size:10.5px; opacity:.65; text-transform:uppercase;">${d.toLocaleString('id-ID',{month:'short'})}</div>
        </div>
        <div style="flex:1; min-width:160px;">
          <div style="font-size:15px; font-weight:700; color:var(--navy); margin-bottom:3px;">${s.nama}</div>
          <div style="font-size:12.5px; color:var(--gray-600);">
            <i class="fas fa-calendar-alt" style="width:14px;"></i> ${s.kegiatanNama}
            &nbsp;·&nbsp; <i class="fas fa-map-marker-alt" style="width:14px;"></i> ${s.tempat}
            &nbsp;·&nbsp; <i class="fas fa-clock" style="width:14px;"></i> ${s.mulai}
          </div>
        </div>
        <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
          <div style="display:flex; gap:8px;">
            <span style="background:#dcfce7;color:#166534;padding:4px 10px;border-radius:20px;font-size:12px;font-weight:700;">✓ ${hadir}</span>
            <span style="background:#fef9c3;color:#854d0e;padding:4px 10px;border-radius:20px;font-size:12px;font-weight:700;">I ${izin}</span>
            <span style="background:#dbeafe;color:#1e40af;padding:4px 10px;border-radius:20px;font-size:12px;font-weight:700;">S ${sakit}</span>
            <span style="background:#fee2e2;color:#991b1b;padding:4px 10px;border-radius:20px;font-size:12px;font-weight:700;">A ${alfa}</span>
          </div>
          <div style="text-align:center; min-width:80px;">
            <div style="font-size:11px; color:var(--gray-400); margin-bottom:4px;">${total} peserta · ${pct}% hadir</div>
            <div class="progress-bar-wrap"><div class="progress-bar success" style="width:${pct}%"></div></div>
          </div>
          <div style="display:flex; gap:6px;" onclick="event.stopPropagation()">
            <button class="btn btn-primary btn-sm" onclick="openAbsensiSession(${s.id})"><i class="fas fa-edit"></i></button>
            <button class="btn btn-danger btn-sm" onclick="hapusAbsensiSesi(${s.id})"><i class="fas fa-trash"></i></button>
          </div>
        </div>
      </div>
    </div>`;
  }).join('');
}

function filterAbsensiList() { renderAbsensiSessionList(); }

function openAbsensiSession(id) {
  currentAbsensiId = id;
  const s = store.absensiSessions.find(x => Number(x.id) === Number(id));
  document.getElementById('absensiSessionList').style.display = 'none';
  document.getElementById('absensiDetail').style.display = '';
  document.getElementById('absenDetailTitle').textContent = `${s.nama} — ${formatDate(s.tanggal)}`;
  renderAbsensiDetail(id);
}

function backToAbsensiList() {
  currentAbsensiId = null;
  document.getElementById('absensiDetail').style.display = 'none';
  renderAbsensiSessionList();
}

function renderAbsensiDetail(id) {
  const s = store.absensiSessions.find(x => Number(x.id) === Number(id));
  const hadir = s.peserta.filter(p => p.status === 'Hadir').length;
  const izin  = s.peserta.filter(p => p.status === 'Izin').length;
  const sakit = s.peserta.filter(p => p.status === 'Sakit').length;
  const alfa  = s.peserta.filter(p => p.status === 'Alfa').length;
  const total = s.peserta.length;

  document.getElementById('absensiContent').innerHTML = `
    <!-- Stats Row -->
    <div style="display:flex; gap:12px; margin-bottom:18px; flex-wrap:wrap;">
      <div class="stat-card success" style="flex:1; min-width:100px; padding:14px;">
        <div class="stat-label">Hadir</div>
        <div class="stat-value" style="font-size:26px">${hadir}</div>
      </div>
      <div class="stat-card gold" style="flex:1; min-width:100px; padding:14px;">
        <div class="stat-label">Izin</div>
        <div class="stat-value" style="font-size:26px">${izin}</div>
      </div>
      <div class="stat-card info" style="flex:1; min-width:100px; padding:14px;">
        <div class="stat-label">Sakit</div>
        <div class="stat-value" style="font-size:26px">${sakit}</div>
      </div>
      <div class="stat-card" style="border-left-color:var(--danger); flex:1; min-width:100px; padding:14px;">
        <div class="stat-label">Alfa</div>
        <div class="stat-value" style="font-size:26px">${alfa}</div>
      </div>
      <div class="stat-card" style="flex:1; min-width:100px; padding:14px;">
        <div class="stat-label">Total</div>
        <div class="stat-value" style="font-size:26px">${total}</div>
      </div>
    </div>

    <!-- Toolbar -->
    <div style="background:var(--white); border-radius:var(--radius); box-shadow:var(--shadow); overflow:hidden;">
      <div style="padding:14px 18px; border-bottom:1px solid var(--gray-100); display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
        <strong style="color:var(--navy); font-size:14px;"><i class="fas fa-users"></i> Daftar Peserta (${total})</strong>
        <div style="display:flex; gap:8px; flex-wrap:wrap;">
          <button class="btn btn-outline btn-sm" onclick="setAllAbsenSesi(${id},'Hadir')"><i class="fas fa-check"></i> Semua Hadir</button>
          <button class="btn btn-success btn-sm" onclick="openTambahPeserta(${id})"><i class="fas fa-user-plus"></i> Tambah Peserta</button>
          <button class="btn btn-outline btn-sm" onclick="exportExcelAbsenSesi(${id})"><i class="fas fa-file-excel"></i> Export Excel</button>
          <button class="btn btn-outline btn-sm" onclick="printAbsensi(${id})"><i class="fas fa-print"></i> Cetak</button>
        </div>
      </div>

      ${total === 0 ? `
        <div style="padding:32px; text-align:center; color:var(--gray-400);">
          <i class="fas fa-users" style="font-size:36px; opacity:.3; margin-bottom:10px; display:block;"></i>
          <p style="font-size:13.5px; font-weight:600; color:var(--gray-600);">Belum ada peserta</p>
          <p style="font-size:12.5px; margin-top:4px;">Klik <strong>"Tambah Peserta"</strong> untuk menambahkan.</p>
        </div>` : `
      <!-- Status guide -->
      <div style="padding:10px 18px; background:var(--cream); border-bottom:1px solid var(--gray-100); font-size:12px; color:var(--gray-600); display:flex; gap:12px; flex-wrap:wrap; align-items:center;">
        <span><i class="fas fa-hand-pointer"></i> Klik kartu untuk ganti status:</span>
        <span style="background:#dcfce7;color:#166534;padding:2px 8px;border-radius:10px;font-weight:700;">Hadir</span>→
        <span style="background:#fef9c3;color:#854d0e;padding:2px 8px;border-radius:10px;font-weight:700;">Izin</span>→
        <span style="background:#dbeafe;color:#1e40af;padding:2px 8px;border-radius:10px;font-weight:700;">Sakit</span>→
        <span style="background:#fee2e2;color:#991b1b;padding:2px 8px;border-radius:10px;font-weight:700;">Alfa</span>
      </div>
      <div class="absen-grid" style="padding:16px;">
        ${s.peserta.map(p => {
          const st = p.status.toLowerCase();
          const icons = {hadir:'fas fa-check-circle', izin:'fas fa-clock', sakit:'fas fa-heart-pulse', alfa:'fas fa-times-circle'};
          const icon = icons[st] || 'fas fa-question-circle';
          const initials = p.nama.split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase();
          return `
          <div class="absen-card ${st}" id="absen-${id}-${p.id}" onclick="toggleAbsenSesi(${id}, '${p.id}')">
            <div class="absen-avatar">${initials}
              <div class="absen-status-dot"><i class="${icon}" style="font-size:8px;"></i></div>
            </div>
            <div class="absen-nama">${p.nama.split(' ')[0]}</div>
            <div class="absen-nim">${p.nim || ''}</div>
            <div class="absen-label"><i class="${icon}" style="font-size:10px;"></i> ${p.status}</div>
            ${p.ket ? `<div style="font-size:10px;color:var(--gray-400);margin-top:2px;">${p.ket}</div>` : ''}
          </div>`;
        }).join('')}
      </div>`}
    </div>`;
}

async function toggleAbsenSesi(sessionId, pesertaId) {
  const s = store.absensiSessions.find(x => x.id === sessionId);
  const p = s.peserta.find(x => x.id == pesertaId);
  const cycle = ['Hadir', 'Izin', 'Sakit', 'Alfa'];
  p.status = cycle[(cycle.indexOf(p.status) + 1) % 4];
  renderAbsensiDetail(sessionId);

  await fetch('api/absensi.php?action=update_status', {
    method: 'PUT',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ id: pesertaId, status: p.status })
  });
}

async function setAllAbsenSesi(sessionId, status) {
  const s = store.absensiSessions.find(x => x.id === sessionId);
  s.peserta.forEach(p => p.status = status);
  renderAbsensiDetail(sessionId);
  showToast('Semua peserta ditandai ' + status + '!');

  await fetch('api/absensi.php?action=set_all', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ session_id: sessionId, status })
  });
}

function exportExcelAbsenSesi(sessionId) {
  const s = store.absensiSessions.find(x => x.id === sessionId);
  const data = s.peserta.map(p => ({ Nama: p.nama, NIM: p.nim || '-', Keterangan: p.ket || '-', Kehadiran: p.status }));
  exportToExcel(data, `Absensi_${s.nama}`);
}

function printAbsensi(sessionId) {
  const s = store.absensiSessions.find(x => x.id === sessionId);
  const rows = s.peserta.map((p,i) => `<tr><td>${i+1}</td><td>${p.nim||'-'}</td><td>${p.nama}</td><td>${p.ket||'-'}</td><td>${p.status}</td><td style="min-width:80px;"></td></tr>`).join('');
  const w = window.open('', '_blank');
  w.document.write(`<html><head><title>Absensi - ${s.nama}</title>
  <style>body{font-family:sans-serif;font-size:12px;padding:20px} h2,h3{margin:0} .kop{border-bottom:3px double #000;padding-bottom:10px;margin-bottom:14px;text-align:center} table{width:100%;border-collapse:collapse;margin-top:14px} th,td{border:1px solid #ccc;padding:7px 10px;text-align:left} th{background:#0f1f3d;color:white} .info{margin-bottom:8px;font-size:12px;}</style>
  </head><body>
  <div class="kop"><h2>HIMPUNAN MAHASISWA INFORMATIKA</h2><p>Fakultas Teknik | Universitas Nusantara</p></div>
  <h3>DAFTAR HADIR — ${s.nama}</h3>
  <div class="info"><b>Kegiatan:</b> ${s.kegiatanNama} &nbsp;|&nbsp; <b>Tanggal:</b> ${formatDate(s.tanggal)} &nbsp;|&nbsp; <b>Tempat:</b> ${s.tempat} &nbsp;|&nbsp; <b>Waktu:</b> ${s.mulai}</div>
  <table><thead><tr><th>#</th><th>NIM</th><th>Nama</th><th>Jabatan/Ket</th><th>Status</th><th>TTD</th></tr></thead><tbody>${rows}</tbody></table>
  <div style="margin-top:40px; display:flex; justify-content:flex-end;">
    <div style="text-align:center; width:180px;">
      <p>Mengetahui,</p>
      <br><br><br>
      <p style="border-top:1px solid #000; padding-top:4px; font-weight:bold;">Sekretaris Himpunan</p>
    </div>
  </div>
  </body></html>`);
  w.document.close(); w.print();
}

function hapusAbsensiSesi(id) {
  deleteCallback = async () => {
    await fetch(`api/absensi.php?id=${id}`, { method: 'DELETE' });
    store.absensiSessions = store.absensiSessions.filter(s => s.id !== id);
    closeModal('modalHapus');
    renderAbsensiSessionList();
    showToast('Sesi absensi berhasil dihapus!');
  };
  document.getElementById('confirmDelete').onclick = deleteCallback;
  openModal('modalHapus');
}

// ---- Tambah Peserta ----
let pesertaTabMode = 'anggota';

function openTambahPeserta(sessionId) {
  currentAbsensiId = sessionId;
  pesertaTabMode = 'anggota';
  document.getElementById('tabPesertaAnggota').classList.add('active');
  document.getElementById('tabPesertaManual').classList.remove('active');
  document.getElementById('panelPesertaAnggota').style.display = '';
  document.getElementById('panelPesertaManual').style.display = 'none';
  document.getElementById('cariAnggotaAbsen').value = '';
  renderListAnggotaAbsen(sessionId);
  openModal('modalTambahPeserta');
}

function switchPesertaTab(mode, el) {
  pesertaTabMode = mode;
  document.querySelectorAll('#modalTambahPeserta .tab-btn').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  document.getElementById('panelPesertaAnggota').style.display = mode === 'anggota' ? '' : 'none';
  document.getElementById('panelPesertaManual').style.display = mode === 'manual' ? '' : 'none';
}

function renderListAnggotaAbsen(sessionId, query = '') {
  const s = store.absensiSessions.find(x => Number(x.id) === Number(sessionId));
  const existing = s.peserta.map(p => String(p.id));
  const q = query.toLowerCase();
  const list = store.anggota.filter(a => !existing.includes(String(a.id)) && (a.nama.toLowerCase().includes(q) || a.nim.includes(q)));
  document.getElementById('listAnggotaAbsen').innerHTML = list.length === 0
    ? '<div style="padding:16px;text-align:center;color:#aaa;font-size:13px;">Tidak ada anggota yang tersedia</div>'
    : list.map(a => `
      <div style="display:flex;align-items:center;gap:12px;padding:10px 14px;border-bottom:1px solid var(--gray-100);cursor:pointer;transition:background .12s;" onmouseover="this.style.background='#f5f5f5'" onmouseout="this.style.background=''" onclick="pilihAnggotaAbsen(${a.id})">
        <div class="user-avatar" style="width:32px;height:32px;font-size:12px;flex-shrink:0;">${a.nama.charAt(0)}</div>
        <div style="flex:1;">
          <div style="font-size:13px;font-weight:600;color:var(--gray-800);">${a.nama}</div>
          <div style="font-size:11.5px;color:var(--gray-400);">${a.nim} · ${a.jabatan}</div>
        </div>
        <i class="fas fa-plus-circle" style="color:var(--success);font-size:18px;"></i>
      </div>`).join('');
}

function filterAnggotaAbsen() {
  renderListAnggotaAbsen(currentAbsensiId, document.getElementById('cariAnggotaAbsen').value);
}

async function pilihAnggotaAbsen(anggotaId) {
  try {
    const a = store.anggota.find(x => Number(x.id) === Number(anggotaId));
    const s = store.absensiSessions.find(x => Number(x.id) === Number(currentAbsensiId));
    if (!a) { showToast('Data anggota tidak ditemukan!', 'error'); return; }
    if (!s) { showToast('Sesi absensi tidak ditemukan!', 'error'); return; }

    const res = await fetch('api/absensi.php?action=tambah_peserta', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ session_id: currentAbsensiId, nama: a.nama, nim: a.nim, ket: a.jabatan, status: 'Hadir' })
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const result = await res.json();
    if (!result || result.success === false) throw new Error(result?.message || 'Gagal menyimpan');

    if (!Array.isArray(s.peserta)) s.peserta = [];
    s.peserta.push({ id: String(result.id), nama: a.nama, nim: a.nim, ket: a.jabatan, status: 'Hadir' });
    renderListAnggotaAbsen(currentAbsensiId, document.getElementById('cariAnggotaAbsen').value);
    showToast(`${a.nama} ditambahkan!`);
  } catch (e) {
    console.error('pilihAnggotaAbsen error:', e);
    showToast('Gagal menambahkan peserta: ' + e.message, 'error');
  }
}

async function simpanPesertaAbsen() {
  if (pesertaTabMode === 'anggota') {
    closeModal('modalTambahPeserta');
    renderAbsensiDetail(currentAbsensiId);
    return;
  }
  try {
    const nama = document.getElementById('peserta_nama').value.trim();
    if (!nama) { showToast('Nama peserta wajib diisi!', 'error'); return; }
    const s = store.absensiSessions.find(x => Number(x.id) === Number(currentAbsensiId));
    if (!s) { showToast('Sesi absensi tidak ditemukan!', 'error'); return; }
    const nim = document.getElementById('peserta_nim').value || '';
    const ket = document.getElementById('peserta_ket').value || '';

    const res = await fetch('api/absensi.php?action=tambah_peserta', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ session_id: currentAbsensiId, nama, nim, ket, status: 'Hadir' })
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const result = await res.json();
    if (!result || result.success === false) throw new Error(result?.message || 'Gagal menyimpan');

    if (!Array.isArray(s.peserta)) s.peserta = [];
    s.peserta.push({ id: String(result.id), nama, nim, ket, status: 'Hadir' });
    document.getElementById('peserta_nama').value = '';
    document.getElementById('peserta_nim').value = '';
    document.getElementById('peserta_ket').value = '';
    closeModal('modalTambahPeserta');
    renderAbsensiDetail(currentAbsensiId);
    showToast(`${nama} berhasil ditambahkan!`);
  } catch (e) {
    console.error('simpanPesertaAbsen error:', e);
    showToast('Gagal menambahkan peserta: ' + e.message, 'error');
  }
}

// ===== SIGNATURE =====
let sigCtx, sigDrawing = false, sigLastX = 0, sigLastY = 0;
let sigColor = '#0f1f3d', sigSize = 3;

function initSignature() {
  const canvas = document.getElementById('signatureCanvas');
  sigCtx = canvas.getContext('2d');
  sigCtx.strokeStyle = sigColor;
  sigCtx.lineWidth = sigSize;
  sigCtx.lineCap = 'round';
  sigCtx.lineJoin = 'round';

  const getPos = (e) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const touch = e.touches ? e.touches[0] : e;
    return { x: (touch.clientX - rect.left) * scaleX, y: (touch.clientY - rect.top) * scaleY };
  };

  canvas.addEventListener('mousedown', (e) => { sigDrawing=true; const p=getPos(e); sigLastX=p.x; sigLastY=p.y; });
  canvas.addEventListener('mousemove', (e) => {
    if (!sigDrawing) return;
    const p = getPos(e);
    sigCtx.beginPath(); sigCtx.moveTo(sigLastX, sigLastY);
    sigCtx.lineTo(p.x, p.y); sigCtx.stroke();
    sigLastX=p.x; sigLastY=p.y;
  });
  canvas.addEventListener('mouseup', () => sigDrawing=false);
  canvas.addEventListener('mouseleave', () => sigDrawing=false);

  canvas.addEventListener('touchstart', (e) => { e.preventDefault(); sigDrawing=true; const p=getPos(e); sigLastX=p.x; sigLastY=p.y; }, {passive:false});
  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (!sigDrawing) return;
    const p = getPos(e);
    sigCtx.beginPath(); sigCtx.moveTo(sigLastX, sigLastY);
    sigCtx.lineTo(p.x, p.y); sigCtx.stroke();
    sigLastX=p.x; sigLastY=p.y;
  }, {passive:false});
  canvas.addEventListener('touchend', () => sigDrawing=false);
}

function updateSigColor() { sigColor = document.getElementById('sigColor').value; sigCtx.strokeStyle = sigColor; }
function updateSigSize() { sigSize = parseInt(document.getElementById('sigSize').value); sigCtx.lineWidth = sigSize; }

function clearSignature() {
  const canvas = document.getElementById('signatureCanvas');
  sigCtx.clearRect(0, 0, canvas.width, canvas.height);
}

async function saveSignature() {
  const canvas = document.getElementById('signatureCanvas');
  const ctx = canvas.getContext('2d');
  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  const hasContent = Array.from(pixels).some((val, i) => i % 4 === 3 && val > 0);
  if (!hasContent) { showToast('Silakan gambar tanda tangan terlebih dahulu!', 'error'); return; }

  const imgData = canvas.toDataURL('image/png');
  const nama    = document.getElementById('signerName').value;
  const jabatan = document.getElementById('signerRole').value;
  const label   = document.getElementById('signerLabel').value.trim();

  try {
    const res = await fetch('api/signature.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ttd_image: imgData, ttd_nama: nama, ttd_jabatan: jabatan, ttd_label: label })
    });
    const result = await res.json();
    if (!result.success) {
      showToast('Gagal menyimpan TTD ke database: ' + (result.message || ''), 'error');
      return;
    }
    // Reload list dari DB agar id benar
    await loadSavedSignature();
    clearSignature();
    document.getElementById('signerLabel').value = '';
    showToast('Tanda tangan berhasil disimpan!');
  } catch (e) {
    showToast('Tidak dapat terhubung ke server untuk menyimpan TTD!', 'error');
  }
}

// Render daftar TTD tersimpan
function renderTtdList() {
  const el = document.getElementById('ttdListContainer');
  if (!el) return;
  if (!store.ttdList.length) {
    el.innerHTML = `<div style="padding:28px; text-align:center; color:var(--gray-400);">
      <i class="fas fa-signature" style="font-size:48px; opacity:.3; margin-bottom:12px; display:block;"></i>
      <p style="font-size:13.5px; font-weight:600; color:var(--gray-600);">Belum Ada TTD Tersimpan</p>
      <p style="font-size:12.5px; margin-top:4px;">Buat tanda tangan di panel kanan, lalu klik <strong>Simpan TTD</strong>.</p>
    </div>`;
    return;
  }
  el.innerHTML = store.ttdList.map((ttd, i) => {
    const tgl = ttd.created_at ? new Date(ttd.created_at).toLocaleString('id-ID', {
      day:'numeric', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit'
    }) : '';
    const label = ttd.ttd_label || ('TTD #' + (store.ttdList.length - i));
    return `<div style="padding:14px 16px; border-bottom:1px solid var(--gray-100); display:flex; gap:14px; align-items:flex-start;">
      <div style="flex-shrink:0; border:1px dashed #86efac; border-radius:8px; padding:6px; background:#f0fdf4; width:110px; text-align:center;">
        <img src="${ttd.ttd_image}" style="max-width:100px; max-height:50px; display:block; margin:0 auto;">
      </div>
      <div style="flex:1; min-width:0;">
        <p style="font-weight:700; font-size:13.5px; color:var(--navy); margin-bottom:2px;">${label}</p>
        <p style="font-size:12px; color:var(--gray-600);">${ttd.ttd_nama || '—'} · ${ttd.ttd_jabatan || '—'}</p>
        <p style="font-size:11px; color:var(--gray-400); margin-top:2px;"><i class="fas fa-clock"></i> ${tgl}</p>
        <div style="display:flex; gap:6px; margin-top:8px; flex-wrap:wrap;">
          <button class="btn btn-success btn-sm" onclick="downloadTtd(${i})"><i class="fas fa-download"></i> PNG</button>
          <button class="btn btn-outline btn-sm" onclick="downloadTtdCard(${i})"><i class="fas fa-id-card"></i> Kartu</button>
          <button class="btn btn-danger btn-sm" onclick="hapusTtd(${ttd.id})"><i class="fas fa-trash"></i></button>
        </div>
      </div>
    </div>`;
  }).join('');
}

// Load semua TTD dari database
async function loadSavedSignature() {
  try {
    const res = await fetch('api/signature.php');
    if (!res.ok) return;
    const data = await res.json();
    if (data.success) {
      store.ttdList = data.data || [];
      // Simpan TTD pertama ke store.savedSignature untuk preview surat keluar
      if (store.ttdList.length > 0) {
        store.savedSignature = store.ttdList[0].ttd_image;
        store.savedSignatureMeta = {
          nama: store.ttdList[0].ttd_nama || '',
          jabatan: store.ttdList[0].ttd_jabatan || '',
        };
      } else {
        store.savedSignature = null;
        store.savedSignatureMeta = null;
      }
      renderTtdList();
    }
  } catch (e) {
    console.warn('Gagal memuat TTD dari database:', e);
  }
}

// ===== SURAT EXPORT WORD =====
function buildSuratHtml(nomor, tanggal, tujuan, di, perihal, isi, ttd) {
  const sigImg = store.savedSignature ? `<img src="${store.savedSignature}" style="width:120px; margin:8px auto; display:block;">` : '<br><br><br>';
  return `
    <html><head><meta charset="UTF-8">
    <style>body{font-family:'Times New Roman',serif;font-size:12pt;margin:2.5cm;line-height:1.8;}
    .kop{border-bottom:3px double #222;padding-bottom:12px;margin-bottom:18px;text-align:center;}
    .kop h2{font-size:14pt;font-weight:bold;text-transform:uppercase;}
    table{width:100%;}td{vertical-align:top;}
    .ttd{margin-top:30px;display:flex;justify-content:flex-end;}
    .ttd-box{text-align:center;width:200px;}
    .ttd-name{margin-top:60px;font-weight:bold;border-top:1px solid #222;padding-top:4px;}
    </style></head><body>
    <div class="kop">
      <h2>Himpunan Mahasiswa Informatika</h2>
      <p>Fakultas Teknik | Universitas Nusantara</p>
      <p>Sekretariat: Gedung A Lt. 2, Kampus Utama</p>
    </div>
    <table><tr><td width="20%">Nomor</td><td width="5%">:</td><td>${nomor}</td></tr>
    <tr><td>Tanggal</td><td>:</td><td>${tanggal}</td></tr>
    <tr><td>Perihal</td><td>:</td><td>${perihal}</td></tr></table>
    <br>
    <p>Kepada Yth.<br><strong>${tujuan}</strong><br>Di- ${di}</p>
    <br><p>Dengan hormat,</p>
    <p>${isi.replace(/\n/g,'<br>')}</p>
    <br><p>Demikian surat ini kami sampaikan. Atas perhatian dan kerjasamanya, kami ucapkan terima kasih.</p>
    <div class="ttd"><div class="ttd-box">
      <p>Hormat kami,</p>${sigImg}
      <div class="ttd-name">${ttd}</div>
      <small>Ketua HMIF 2024/2025</small>
    </div></div>
    </body></html>`;
}

function exportSuratKeluarWordById(id) {
  const s = store.suratKeluar.find(x => x.id === id);
  const html = buildSuratHtml(s.nomor, formatDate(s.tanggal), s.tujuan, s.di, s.perihal, s.isi, s.ttd);
  const blob = new Blob(['\ufeff', html], {type: 'application/msword'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `Surat_${s.nomor.replace(/\//g,'_')}.doc`;
  a.click();
  showToast('Surat berhasil diexport ke Word!');
}

function exportSuratKeluarPDFById(id) {
  const s = store.suratKeluar.find(x => x.id === id);
  generateSuratPDF(s.nomor, formatDate(s.tanggal), s.tujuan, s.di, s.perihal, s.isi, s.ttd);
}

function exportSuratMasukWordById(id) {
  const s = store.suratMasuk.find(x => x.id === id);
  const html = `
    <html><head><meta charset="UTF-8">
    <style>body{font-family:'Times New Roman',serif;font-size:12pt;margin:2.5cm;line-height:1.8;}
    .kop{border-bottom:3px double #222;padding-bottom:12px;margin-bottom:18px;text-align:center;}
    .kop h2{font-size:14pt;font-weight:bold;text-transform:uppercase;}
    table{width:100%;border-collapse:collapse;}
    td{vertical-align:top;padding:4px 6px;}
    .box{border:1px solid #333;padding:10px;margin-top:16px;}
    .disp-title{font-weight:bold;text-align:center;font-size:13pt;margin-bottom:10px;}
    .ttd-row{display:flex;justify-content:space-between;margin-top:40px;}
    .ttd-box{text-align:center;width:200px;}
    .ttd-line{border-top:1px solid #333;padding-top:4px;margin-top:70px;font-weight:bold;}
    </style></head><body>
    <div class="kop">
      <h2>Himpunan Mahasiswa Informatika</h2>
      <p>Fakultas Teknik | Universitas Nusantara</p>
      <p>Sekretariat: Gedung A Lt. 2, Kampus Utama</p>
    </div>
    <p class="disp-title">LEMBAR DISPOSISI SURAT MASUK</p>
    <table>
      <tr><td width="22%">Nomor Surat</td><td width="3%">:</td><td><strong>${s.nomor}</strong></td></tr>
      <tr><td>Tanggal Surat</td><td>:</td><td>${formatDate(s.tanggal)}</td></tr>
      <tr><td>Tanggal Diterima</td><td>:</td><td>${formatDate(s.tanggal)}</td></tr>
      <tr><td>Pengirim</td><td>:</td><td>${s.pengirim}</td></tr>
      <tr><td>Perihal</td><td>:</td><td>${s.perihal}</td></tr>
      <tr><td>Disposisi ke</td><td>:</td><td>${s.disposisi}</td></tr>
      <tr><td>Status</td><td>:</td><td>${s.status}</td></tr>
      <tr><td>Keterangan</td><td>:</td><td>${s.ket || '—'}</td></tr>
    </table>
    <div class="box">
      <p style="font-weight:bold;margin-bottom:6px;">Isi Disposisi / Instruksi:</p>
      <p style="min-height:60px;">&nbsp;</p>
    </div>
    <div class="ttd-row">
      <div class="ttd-box"><p>Penerima Disposisi,</p><div class="ttd-line">${s.disposisi}</div><small>Jabatan</small></div>
      <div class="ttd-box"><p>Mengetahui,</p><div class="ttd-line">Ketua Himpunan</div><small>Ketua HMIF 2024/2025</small></div>
    </div>
    </body></html>`;
  const blob = new Blob(['\ufeff', html], {type: 'application/msword'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `Disposisi_${s.nomor.replace(/\//g,'_')}.doc`;
  a.click();
  showToast('Lembar disposisi berhasil diexport ke Word!');
}

function exportSuratKeluarWord() {
  const nomor = document.getElementById('sk_nomor').value;
  const tanggal = document.getElementById('sk_tanggal').value ? formatDate(document.getElementById('sk_tanggal').value) : '...';
  const tujuan = document.getElementById('sk_tujuan').value || '...';
  const di = document.getElementById('sk_di').value || '...';
  const perihal = document.getElementById('sk_perihal').value || '...';
  const isi = document.getElementById('sk_isi').value || '...';
  const ttd = document.getElementById('sk_ttd').value || '...';
  const html = buildSuratHtml(nomor, tanggal, tujuan, di, perihal, isi, ttd);
  const blob = new Blob(['\ufeff', html], {type: 'application/msword'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `Surat_${nomor.replace(/\//g,'_')}.doc`;
  a.click();
  showToast('Surat berhasil diexport ke Word!');
}

function exportSuratKeluarPDF() {
  const nomor = document.getElementById('sk_nomor').value;
  const tanggal = document.getElementById('sk_tanggal').value ? formatDate(document.getElementById('sk_tanggal').value) : '...';
  const tujuan = document.getElementById('sk_tujuan').value || '...';
  const di = document.getElementById('sk_di').value || '...';
  const perihal = document.getElementById('sk_perihal').value || '...';
  const isi = document.getElementById('sk_isi').value || '';
  const ttd = document.getElementById('sk_ttd').value || '...';
  generateSuratPDF(nomor, tanggal, tujuan, di, perihal, isi, ttd);
}

function generateSuratPDF(nomor, tanggal, tujuan, di, perihal, isi, ttd) {
  try {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit:'mm', format:'a4' });
    let y = 20;
    const lm = 25, rm = 185, cw = rm - lm;
    // KOP
    doc.setFont('times','bold');
    doc.setFontSize(14);
    doc.text('HIMPUNAN MAHASISWA INFORMATIKA', 105, y, {align:'center'}); y+=7;
    doc.setFont('times','normal');
    doc.setFontSize(10);
    doc.text('Fakultas Teknik | Universitas Nusantara', 105, y, {align:'center'}); y+=5;
    doc.text('Sekretariat: Gedung A Lt. 2, Kampus Utama', 105, y, {align:'center'}); y+=3;
    doc.setDrawColor(0); doc.setLineWidth(0.8);
    doc.line(lm, y, rm, y); y+=1;
    doc.setLineWidth(0.3);
    doc.line(lm, y, rm, y); y+=8;
    // Body table
    doc.setFontSize(11);
    const rows = [['Nomor', nomor], ['Tanggal', tanggal], ['Perihal', perihal]];
    rows.forEach(([k,v]) => {
      doc.setFont('times','normal');
      doc.text(k, lm, y);
      doc.text(':', lm+35, y);
      doc.text(String(v), lm+40, y);
      y += 7;
    });
    y += 5;
    doc.text('Kepada Yth.', lm, y); y+=6;
    doc.setFont('times','bold');
    doc.text(tujuan, lm, y); y+=6;
    doc.setFont('times','normal');
    doc.text('Di- ' + di, lm, y); y+=10;
    doc.text('Dengan hormat,', lm, y); y+=8;
    const isiLines = doc.splitTextToSize(isi.replace(/\n/g,' '), cw);
    doc.text(isiLines, lm, y); y += isiLines.length * 6 + 8;
    doc.text('Demikian surat ini kami sampaikan. Atas perhatian dan kerjasamanya, kami ucapkan terima kasih.', lm, y, {maxWidth: cw}); y += 16;
    // TTD
    doc.text('Hormat kami,', rm - 60, y, {align:'center'}); y += 20;
    doc.line(rm-90, y, rm-10, y); y += 5;
    doc.setFont('times','bold');
    doc.text(ttd, rm-50, y, {align:'center'}); y+=5;
    doc.setFont('times','normal');
    doc.setFontSize(10);
    doc.text('Ketua HMIF 2024/2025', rm-50, y, {align:'center'});
    doc.save(`Surat_${nomor.replace(/\//g,'_')}.pdf`);
    showToast('Surat berhasil diexport ke PDF!');
  } catch(e) {
    showToast('Gagal export PDF: ' + e.message, 'error');
  }
}

function exportPreviewSuratWord() {
  const content = document.getElementById('previewContent').innerHTML;
  const html = `<html><head><meta charset="UTF-8"><style>body{font-family:'Times New Roman',serif;font-size:12pt;margin:2.5cm;line-height:1.8;}table{width:100%;}td{vertical-align:top;}.kop{border-bottom:3px double #222;padding-bottom:12px;margin-bottom:18px;text-align:center;}.ttd{margin-top:30px;display:flex;justify-content:flex-end;}.ttd-box{text-align:center;width:200px;}.ttd-name{margin-top:60px;font-weight:bold;border-top:1px solid #222;padding-top:4px;}</style></head><body>${content}</body></html>`;
  const blob = new Blob(['\ufeff', html], {type: 'application/msword'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `Surat_${new Date().toISOString().split('T')[0]}.doc`;
  a.click();
  showToast('Surat berhasil diexport ke Word!');
}

function exportPreviewSuratPDF() {
  // Get data from preview
  try {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit:'mm', format:'a4' });
    const content = document.getElementById('previewContent');
    doc.html(content, {
      callback: function(doc) {
        doc.save(`Surat_${new Date().toISOString().split('T')[0]}.pdf`);
        showToast('Surat berhasil diexport ke PDF!');
      },
      x: 15, y: 15,
      width: 170,
      windowWidth: 800
    });
  } catch(e) {
    showToast('Gagal export PDF: ' + e.message, 'error');
  }
}

// ===== NOTULENSI =====
async function loadNotulensi() {
  try {
    const res = await fetch('api/notulensi.php');
    const data = await res.json();
    store.notulensi = data.map(n => ({ ...n, id: Number(n.id) }));
  } catch (e) {
    console.error('Gagal memuat notulensi:', e);
    store.notulensi = [];
  }
  renderNotulensi();
}

function renderNotulensi() {
  const tbody = document.getElementById('tbodyNotulensi');
  if (!tbody) return;
  tbody.innerHTML = store.notulensi.map((n, i) => `
    <tr>
      <td>${i+1}</td>
      <td><strong>${n.judul}</strong></td>
      <td>${formatDate(n.tanggal)}</td>
      <td><span class="badge badge-info">${n.jenis}</span></td>
      <td>${n.notulis}</td>
      <td>${n.peserta ? n.peserta.split(',').length + ' orang' : '—'}</td>
      <td><span class="badge ${n.status==='Final'?'badge-success':n.status==='Disetujui'?'badge-gold':'badge-gray'}">${n.status}</span></td>
      <td><div class="action-btns">
        <button class="btn btn-outline btn-sm" onclick="detailNotulensi(${n.id})"><i class="fas fa-eye"></i></button>
        <button class="btn btn-primary btn-sm" onclick="editNotulensi(${n.id})"><i class="fas fa-edit"></i></button>
        <button class="btn btn-success btn-sm" onclick="exportNotulensiWordById(${n.id})" title="Export Word"><i class="fas fa-file-word"></i></button>
        <button class="btn btn-danger btn-sm" onclick="exportNotulensiPDFById(${n.id})" title="Export PDF"><i class="fas fa-file-pdf"></i></button>
        <button class="btn btn-danger btn-sm" onclick="hapusNotulensi(${n.id})"><i class="fas fa-trash"></i></button>
      </div></td>
    </tr>`).join('') || '<tr><td colspan="8" style="text-align:center;padding:30px;color:#aaa">Belum ada notulensi tersimpan</td></tr>';
}

function searchNotulensi(q) {
  const rows = document.querySelectorAll('#tblNotulensi tbody tr');
  const ql = q.toLowerCase();
  rows.forEach(row => row.style.display = row.textContent.toLowerCase().includes(ql) ? '' : 'none');
}

function openTambahNotulensi() {
  store.editMode = { type: null, id: null };
  resetNotulensiForm();
  document.getElementById('modalNotulensiTitle').innerHTML = '<i class="fas fa-book-open"></i> Tambah Notulensi Rapat';
  openModal('modalNotulensi');
}

async function saveNotulensi() {
  const judul = document.getElementById('not_judul').value.trim();
  const tanggal = document.getElementById('not_tanggal').value;
  const notulis = document.getElementById('not_notulis').value.trim();
  const isi = document.getElementById('not_isi').value.trim();
  if (!judul || !tanggal || !notulis || !isi) {
    showToast('Judul, tanggal, notulis, dan isi wajib diisi!', 'error'); return;
  }
  const data = {
    judul, tanggal,
    jenis: document.getElementById('not_jenis').value,
    tempat: document.getElementById('not_tempat').value,
    notulis,
    pimpinan: document.getElementById('not_pimpinan').value,
    mulai: document.getElementById('not_mulai').value,
    selesai: document.getElementById('not_selesai').value,
    peserta: document.getElementById('not_peserta').value,
    agenda: document.getElementById('not_agenda').value,
    isi,
    kesimpulan: document.getElementById('not_kesimpulan').value,
    tindaklanjut: document.getElementById('not_tindaklanjut').value,
    next: document.getElementById('not_next').value,
    status: document.getElementById('not_status').value,
  };

  if (store.editMode.type === 'notulensi') {
    data.id = store.editMode.id;
    await fetch('api/notulensi.php', {
      method: 'PUT',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify(data)
    });
    showToast('Notulensi berhasil diperbarui!');
  } else {
    await fetch('api/notulensi.php', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify(data)
    });
    showToast('Notulensi berhasil disimpan!');
  }

  store.editMode = {type:null, id:null};
  closeModal('modalNotulensi');
  resetNotulensiForm();
  await loadNotulensi();
  refreshDashboard();
}

function resetNotulensiForm() {
  ['not_judul','not_tempat','not_notulis','not_pimpinan','not_peserta','not_agenda','not_isi','not_kesimpulan','not_tindaklanjut'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  document.getElementById('not_jenis').value = 'Rapat Koordinasi';
  document.getElementById('not_status').value = 'Draft';
  document.getElementById('not_mulai').value = '08:00';
  document.getElementById('not_selesai').value = '10:00';
  document.getElementById('not_tanggal').value = new Date().toISOString().split('T')[0];
  document.getElementById('not_next').value = '';
  document.getElementById('modalNotulensiTitle').innerHTML = '<i class="fas fa-book-open"></i> Tambah Notulensi Rapat';
}

function editNotulensi(id) {
  const n = store.notulensi.find(x => x.id === id);
  store.editMode = { type: 'notulensi', id };
  document.getElementById('modalNotulensiTitle').innerHTML = '<i class="fas fa-edit"></i> Edit Notulensi';
  document.getElementById('not_judul').value = n.judul;
  document.getElementById('not_tanggal').value = n.tanggal;
  document.getElementById('not_jenis').value = n.jenis;
  document.getElementById('not_tempat').value = n.tempat;
  document.getElementById('not_notulis').value = n.notulis;
  document.getElementById('not_pimpinan').value = n.pimpinan;
  document.getElementById('not_mulai').value = n.mulai;
  document.getElementById('not_selesai').value = n.selesai;
  document.getElementById('not_peserta').value = n.peserta;
  document.getElementById('not_agenda').value = n.agenda;
  document.getElementById('not_isi').value = n.isi;
  document.getElementById('not_kesimpulan').value = n.kesimpulan;
  document.getElementById('not_tindaklanjut').value = n.tindaklanjut;
  document.getElementById('not_next').value = n.next;
  document.getElementById('not_status').value = n.status;
  openModal('modalNotulensi');
}

function hapusNotulensi(id) {
  deleteCallback = async () => {
    await fetch(`api/notulensi.php?id=${id}`, { method: 'DELETE' });
    store.notulensi = store.notulensi.filter(x => x.id !== id);
    renderNotulensi();
    closeModal('modalHapus');
    showToast('Notulensi berhasil dihapus!');
  };
  document.getElementById('confirmDelete').onclick = deleteCallback;
  openModal('modalHapus');
}

function buildNotulensiHTML(n) {
  const agendaList = n.agenda ? n.agenda.split('\n').map(a => `<li>${a}</li>`).join('') : '';
  return `
    <html><head><meta charset="UTF-8">
    <style>
      body{font-family:'Times New Roman',serif;font-size:12pt;margin:2.5cm;line-height:1.8;color:#111;}
      .kop{border-bottom:3px double #222;padding-bottom:12px;margin-bottom:18px;text-align:center;}
      .kop h2{font-size:14pt;font-weight:bold;text-transform:uppercase;margin:0;}
      h3{font-size:13pt;text-align:center;text-transform:uppercase;margin:14px 0;}
      table{width:100%;border-collapse:collapse;}
      .info-table td{padding:3px 0;vertical-align:top;}
      .section-title{font-weight:bold;margin:16px 0 6px;border-bottom:1px solid #aaa;padding-bottom:3px;}
      .isi-box{background:#f9f9f9;padding:10px 14px;border-left:3px solid #0f1f3d;margin:8px 0;}
      ul{margin:6px 0;padding-left:20px;}
      .ttd-area{margin-top:40px;display:flex;justify-content:space-between;}
      .ttd-box{text-align:center;width:200px;}
      .ttd-line{border-top:1px solid #333;padding-top:4px;margin-top:70px;font-weight:bold;}
    </style></head><body>
    <div class="kop">
      <h2>Himpunan Mahasiswa Informatika</h2>
      <p style="margin:2px 0;">Fakultas Teknik | Universitas Nusantara</p>
      <p style="margin:2px 0;">Sekretariat: Gedung A Lt. 2, Kampus Utama</p>
    </div>
    <h3>Notulensi Rapat<br>${n.jenis}</h3>
    <table class="info-table">
      <tr><td width="22%">Judul Rapat</td><td width="3%">:</td><td><strong>${n.judul}</strong></td></tr>
      <tr><td>Hari / Tanggal</td><td>:</td><td>${formatDate(n.tanggal)}</td></tr>
      <tr><td>Waktu</td><td>:</td><td>${n.mulai} – ${n.selesai} WIB</td></tr>
      <tr><td>Tempat</td><td>:</td><td>${n.tempat}</td></tr>
      <tr><td>Pimpinan Rapat</td><td>:</td><td>${n.pimpinan}</td></tr>
      <tr><td>Notulis</td><td>:</td><td>${n.notulis}</td></tr>
      <tr><td>Peserta Hadir</td><td>:</td><td>${n.peserta}</td></tr>
    </table>
    ${n.agenda ? `<p class="section-title">Agenda Rapat</p><ul>${agendaList}</ul>` : ''}
    <p class="section-title">Isi / Jalannya Rapat</p>
    <div class="isi-box">${n.isi.replace(/\n/g,'<br>')}</div>
    ${n.kesimpulan ? `<p class="section-title">Kesimpulan</p><p>${n.kesimpulan.replace(/\n/g,'<br>')}</p>` : ''}
    ${n.tindaklanjut ? `<p class="section-title">Tindak Lanjut</p><p>${n.tindaklanjut.replace(/\n/g,'<br>')}</p>` : ''}
    ${n.next ? `<p><strong>Rapat Berikutnya:</strong> ${formatDate(n.next)}</p>` : ''}
    </body></html>`;
}

function detailNotulensi(id) {
  const n = store.notulensi.find(x => x.id === id);
  const agendaItems = n.agenda ? n.agenda.split('\n').map(a => `<li style="margin-bottom:4px">${a}</li>`).join('') : '';
  document.getElementById('notulensiPreviewContent').innerHTML = `
    <div class="kop">
      <h2>Himpunan Mahasiswa Informatika</h2>
      <p>Fakultas Teknik | Universitas Nusantara</p>
    </div>
    <h3 style="text-align:center;text-transform:uppercase;font-size:14pt;margin:12px 0;">Notulensi — ${n.jenis}</h3>
    <table style="width:100%;margin-bottom:14px;">
      ${[['Judul Rapat', `<strong>${n.judul}</strong>`], ['Hari / Tanggal', formatDate(n.tanggal)], ['Waktu', `${n.mulai} – ${n.selesai} WIB`], ['Tempat', n.tempat], ['Pimpinan Rapat', n.pimpinan], ['Notulis', n.notulis], ['Peserta Hadir', n.peserta]].map(([k,v]) => `<tr><td width="22%" style="padding:3px 0;vertical-align:top;">${k}</td><td width="3%">:</td><td>${v}</td></tr>`).join('')}
    </table>
    ${n.agenda ? `<p style="font-weight:700;margin-bottom:6px;border-bottom:1px solid #ccc;">Agenda Rapat</p><ul>${agendaItems}</ul>` : ''}
    <p style="font-weight:700;margin:14px 0 6px;border-bottom:1px solid #ccc;">Isi / Jalannya Rapat</p>
    <div style="background:#f9f9f9;padding:10px 14px;border-left:3px solid var(--navy);margin:8px 0;">${n.isi.replace(/\n/g,'<br>')}</div>
    ${n.kesimpulan ? `<p style="font-weight:700;margin:14px 0 6px;border-bottom:1px solid #ccc;">Kesimpulan</p><p>${n.kesimpulan.replace(/\n/g,'<br>')}</p>` : ''}
    ${n.tindaklanjut ? `<p style="font-weight:700;margin:14px 0 6px;border-bottom:1px solid #ccc;">Tindak Lanjut</p><p>${n.tindaklanjut.replace(/\n/g,'<br>')}</p>` : ''}
    ${n.next ? `<p style="margin-top:10px;"><strong>Rapat Berikutnya:</strong> ${formatDate(n.next)}</p>` : ''}
    </div>`;

  document.getElementById('btnExportNotWord').onclick = () => exportNotulensiWordById(id);
  document.getElementById('btnExportNotPDF').onclick = () => exportNotulensiPDFById(id);
  openModal('modalDetailNotulensi');
}

function exportNotulensiWord() {
  // Export from form (current inputs)
  const judul = document.getElementById('not_judul').value.trim() || 'Notulensi';
  const tanggal = document.getElementById('not_tanggal').value;
  const tempN = {
    judul, tanggal,
    jenis: document.getElementById('not_jenis').value,
    tempat: document.getElementById('not_tempat').value,
    notulis: document.getElementById('not_notulis').value,
    pimpinan: document.getElementById('not_pimpinan').value,
    mulai: document.getElementById('not_mulai').value,
    selesai: document.getElementById('not_selesai').value,
    peserta: document.getElementById('not_peserta').value,
    agenda: document.getElementById('not_agenda').value,
    isi: document.getElementById('not_isi').value,
    kesimpulan: document.getElementById('not_kesimpulan').value,
    tindaklanjut: document.getElementById('not_tindaklanjut').value,
    next: document.getElementById('not_next').value,
  };
  const html = buildNotulensiHTML(tempN);
  const blob = new Blob(['\ufeff', html], {type: 'application/msword'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `Notulensi_${judul.replace(/\s+/g,'_')}_${tanggal}.doc`;
  a.click();
  showToast('Notulensi berhasil diexport ke Word!');
}

function exportNotulensiWordById(id) {
  const n = store.notulensi.find(x => x.id === id);
  const html = buildNotulensiHTML(n);
  const blob = new Blob(['\ufeff', html], {type: 'application/msword'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `Notulensi_${n.judul.replace(/\s+/g,'_')}_${n.tanggal}.doc`;
  a.click();
  showToast('Notulensi berhasil diexport ke Word!');
}

function exportNotulensiPDF() {
  // Export from form
  const judul = document.getElementById('not_judul').value.trim() || 'Notulensi';
  const tanggal = document.getElementById('not_tanggal').value;
  const tempN = {
    judul, tanggal,
    jenis: document.getElementById('not_jenis').value,
    tempat: document.getElementById('not_tempat').value,
    notulis: document.getElementById('not_notulis').value,
    pimpinan: document.getElementById('not_pimpinan').value,
    mulai: document.getElementById('not_mulai').value,
    selesai: document.getElementById('not_selesai').value,
    peserta: document.getElementById('not_peserta').value,
    agenda: document.getElementById('not_agenda').value,
    isi: document.getElementById('not_isi').value,
    kesimpulan: document.getElementById('not_kesimpulan').value,
    tindaklanjut: document.getElementById('not_tindaklanjut').value,
    next: document.getElementById('not_next').value,
  };
  generateNotulensiPDF(tempN);
}

function exportNotulensiPDFById(id) {
  const n = store.notulensi.find(x => x.id === id);
  generateNotulensiPDF(n);
}

function generateNotulensiPDF(n) {
  try {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit:'mm', format:'a4' });
    const lm = 20, rm = 190, cw = rm - lm;
    let y = 15;

    // KOP
    doc.setFont('times','bold'); doc.setFontSize(13);
    doc.text('HIMPUNAN MAHASISWA INFORMATIKA', 105, y, {align:'center'}); y+=7;
    doc.setFont('times','normal'); doc.setFontSize(10);
    doc.text('Fakultas Teknik | Universitas Nusantara', 105, y, {align:'center'}); y+=5;
    doc.text('Sekretariat: Gedung A Lt. 2, Kampus Utama', 105, y, {align:'center'}); y+=3;
    doc.setDrawColor(0); doc.setLineWidth(0.8); doc.line(lm, y, rm, y); y+=1;
    doc.setLineWidth(0.3); doc.line(lm, y, rm, y); y+=8;

    // Title
    doc.setFont('times','bold'); doc.setFontSize(12);
    doc.text('NOTULENSI RAPAT', 105, y, {align:'center'}); y+=6;
    doc.text(n.jenis.toUpperCase(), 105, y, {align:'center'}); y+=10;

    // Info table
    doc.setFont('times','normal'); doc.setFontSize(11);
    const info = [
      ['Judul Rapat', n.judul],
      ['Hari / Tanggal', formatDate(n.tanggal)],
      ['Waktu', `${n.mulai} – ${n.selesai} WIB`],
      ['Tempat', n.tempat],
      ['Pimpinan Rapat', n.pimpinan],
      ['Notulis', n.notulis],
      ['Peserta Hadir', n.peserta],
    ];
    info.forEach(([k,v]) => {
      doc.setFont('times','normal');
      doc.text(k, lm, y);
      doc.text(':', lm+40, y);
      const lines = doc.splitTextToSize(String(v||''), cw-45);
      doc.text(lines, lm+45, y);
      y += Math.max(lines.length * 6, 6);
    });
    y += 5;

    // Agenda
    if (n.agenda) {
      doc.setFont('times','bold'); doc.text('Agenda Rapat', lm, y); y+=6;
      doc.setLineWidth(0.2); doc.line(lm, y, rm, y); y+=4;
      doc.setFont('times','normal');
      n.agenda.split('\n').forEach(ag => {
        const ls = doc.splitTextToSize(ag, cw);
        doc.text(ls, lm+3, y); y += ls.length * 6;
      });
      y += 4;
    }

    // Isi
    doc.setFont('times','bold'); doc.text('Isi / Jalannya Rapat', lm, y); y+=6;
    doc.setLineWidth(0.2); doc.line(lm, y, rm, y); y+=4;
    doc.setFont('times','normal');
    const isiLines = doc.splitTextToSize(n.isi.replace(/\n/g,' '), cw);
    if (y + isiLines.length*6 > 270) { doc.addPage(); y = 20; }
    doc.text(isiLines, lm, y); y += isiLines.length*6 + 6;

    // Kesimpulan
    if (n.kesimpulan) {
      if (y > 250) { doc.addPage(); y = 20; }
      doc.setFont('times','bold'); doc.text('Kesimpulan', lm, y); y+=6;
      doc.setLineWidth(0.2); doc.line(lm, y, rm, y); y+=4;
      doc.setFont('times','normal');
      const kl = doc.splitTextToSize(n.kesimpulan.replace(/\n/g,' '), cw);
      doc.text(kl, lm, y); y += kl.length*6+6;
    }

    // Tindak Lanjut
    if (n.tindaklanjut) {
      if (y > 250) { doc.addPage(); y = 20; }
      doc.setFont('times','bold'); doc.text('Tindak Lanjut', lm, y); y+=6;
      doc.setLineWidth(0.2); doc.line(lm, y, rm, y); y+=4;
      doc.setFont('times','normal');
      const tl = doc.splitTextToSize(n.tindaklanjut.replace(/\n/g,' '), cw);
      doc.text(tl, lm, y); y += tl.length*6+6;
    }

    // Next
    if (n.next) {
      doc.setFont('times','bold'); doc.text(`Rapat Berikutnya: `, lm, y);
      doc.setFont('times','normal'); doc.text(formatDate(n.next), lm+45, y); y+=14;
    }

    // TTD
    doc.save(`Notulensi_${(n.judul||'rapat').replace(/\s+/g,'_')}_${n.tanggal}.pdf`);
    showToast('Notulensi berhasil diexport ke PDF!');
  } catch(e) {
    showToast('Gagal export PDF: ' + e.message, 'error');
  }
}

async function hapusTtd(id) {
  try {
    await fetch(`api/signature.php?id=${id}`, { method: 'DELETE' });
    await loadSavedSignature();
    showToast('TTD dihapus.');
  } catch (e) {
    showToast('Gagal menghapus TTD!', 'error');
  }
}

function downloadTtd(idx) {
  const ttd = store.ttdList[idx];
  if (!ttd) { showToast('TTD tidak ditemukan!', 'error'); return; }
  const a = document.createElement('a');
  a.href = ttd.ttd_image;
  const nama = (ttd.ttd_nama || 'TTD').replace(/\s+/g,'_');
  const label = (ttd.ttd_label || idx).toString().replace(/\s+/g,'_');
  a.download = `TTD_${nama}_${label}_${new Date().toISOString().split('T')[0]}.png`;
  a.click();
  showToast('TTD berhasil diunduh sebagai PNG!');
}
// alias untuk kompatibilitas preview surat keluar
function downloadSignature() { if (store.ttdList.length) downloadTtd(0); else showToast('Belum ada TTD tersimpan!', 'error'); }

function downloadTtdCard(idx) {
  const ttd = store.ttdList[idx];
  if (!ttd) { showToast('TTD tidak ditemukan!', 'error'); return; }
  const meta = { nama: ttd.ttd_nama, jabatan: ttd.ttd_jabatan, label: ttd.ttd_label, waktu: ttd.created_at ? new Date(ttd.created_at).toLocaleString('id-ID') : '' };
  const canvas2 = document.createElement('canvas');
  canvas2.width = 420; canvas2.height = 220;
  const ctx = canvas2.getContext('2d');

  // Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 420, 220);
  // Border Navy
  ctx.strokeStyle = '#0f1f3d'; ctx.lineWidth = 3;
  ctx.strokeRect(2, 2, 416, 216);
  // Gold accent line
  ctx.fillStyle = '#c9a84c'; ctx.fillRect(2, 2, 416, 6);

  // Title
  ctx.fillStyle = '#0f1f3d'; ctx.font = 'bold 13px Arial'; ctx.textAlign = 'center';
  ctx.fillText('TANDA TANGAN DIGITAL', 210, 28);
  ctx.fillStyle = '#888'; ctx.font = '10px Arial';
  ctx.fillText('Himpunan Mahasiswa Informatika', 210, 42);

  // Separator
  ctx.fillStyle = '#eee'; ctx.fillRect(20, 50, 380, 1);

  // Draw signature image
  const img = new Image();
  img.onload = () => {
    // Center the signature in the card
    const maxW = 300, maxH = 110;
    let w = img.width, h = img.height;
    if (w > maxW) { h = h * maxW/w; w = maxW; }
    if (h > maxH) { w = w * maxH/h; h = maxH; }
    ctx.drawImage(img, (420-w)/2, 55, w, h);

    // Name line
    ctx.fillStyle = '#aaa'; ctx.fillRect(110, 170, 200, 1);
    ctx.fillStyle = '#0f1f3d'; ctx.font = 'bold 13px Arial'; ctx.textAlign = 'center';
    ctx.fillText(meta.nama || '', 210, 186);
    ctx.fillStyle = '#555'; ctx.font = '11px Arial';
    ctx.fillText(meta.jabatan || '', 210, 200);
    ctx.fillStyle = '#aaa'; ctx.font = '9px Arial';
    ctx.fillText(meta.waktu || '', 210, 214);

    const a = document.createElement('a');
    a.href = canvas2.toDataURL('image/png');
    const nama = (meta.nama || 'TTD').replace(/\s+/g,'_');
    const lbl = (meta.label || '').replace(/\s+/g,'_');
    a.download = `KartuTTD_${nama}${lbl?'_'+lbl:''}_${new Date().toISOString().split('T')[0]}.png`;
    a.click();
    showToast('Kartu TTD berhasil diunduh!');
  };
  img.src = ttd.ttd_image;
}
function downloadSignatureWithCard() { if (store.ttdList.length) downloadTtdCard(0); else showToast('Belum ada TTD tersimpan!', 'error'); }

function previewSignature() {
  const canvas = document.getElementById('signatureCanvas');
  const imgData = canvas.toDataURL('image/png');
  const name = document.getElementById('signerName').value;
  const role = document.getElementById('signerRole').value;
  document.getElementById('sigPreviewBody').innerHTML = `
    <div style="text-align:center; padding:20px;">
      <img src="${imgData}" style="max-width:300px; border:1px dashed var(--gray-200); border-radius:8px; padding:10px;">
      <p style="margin-top:12px; font-weight:700; font-size:15px;">${name}</p>
      <p style="color:var(--gray-600); font-size:13px;">${role}</p>
    </div>`;
  openModal('modalSigPreview');
}

// ===== FILE UPLOAD =====
// Store for file data URLs keyed by listId
if (!window.fileDataStore) window.fileDataStore = {};

function handleFiles(input, listId) {
  const listEl = document.getElementById(listId);
  const files = Array.from(input.files);
  if (!window.fileDataStore[listId]) window.fileDataStore[listId] = [];
  files.forEach((f) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      window.fileDataStore[listId].push({
  file: f,
  name: f.name,
  size: f.size,
  type: f.type,
  dataUrl
});
      const div = document.createElement('div');
      div.className = 'file-item';
      const isImg = f.type.startsWith('image/');
      div.innerHTML = `
        ${isImg ? `<img src="${dataUrl}" style="width:36px;height:36px;object-fit:cover;border-radius:5px;border:1px solid var(--gray-200);">` : `<i class="${fileIcon(f.name)} file-icon"></i>`}
        <span class="file-name">${f.name}</span>
        <span class="file-size">${(f.size/1024).toFixed(0)} KB</span>
        <span class="file-remove" onclick="removeFileItem(this,'${listId}','${f.name}')"><i class="fas fa-times"></i></span>`;
      listEl.appendChild(div);
    };
    reader.readAsDataURL(f);
  });
}

function removeFileItem(el, listId, fileName) {
  el.parentElement.remove();
  if (window.fileDataStore[listId]) {
    window.fileDataStore[listId] = window.fileDataStore[listId].filter(f => f.name !== fileName);
  }
}

function clearFileStore(listId) {
  window.fileDataStore[listId] = [];
  const listEl = document.getElementById(listId);
  if (listEl) listEl.innerHTML = '';
}

function handleDragOver(e, dropId) {
  e.preventDefault();
  document.getElementById(dropId).classList.add('drag-over');
}

function handleDragLeave(dropId) {
  document.getElementById(dropId).classList.remove('drag-over');
}

function handleDrop(e, fileInputId, listId) {
  e.preventDefault();
  const dropId = fileInputId.replace('file','drop').replace('File','Drop');
  const dropEl = document.getElementById(dropId);
  if (dropEl) dropEl.classList.remove('drag-over');
  const dt = e.dataTransfer;
  const mockInput = { files: dt.files };
  handleFiles(mockInput, listId);
}

// ===== HAPUS =====
function hapus(type, id) {
  deleteCallback = async () => {

    if (typeof SFX !== 'undefined') SFX.delete();

    if(type === 'anggota'){

      await fetch(`api/anggota.php?id=${id}`,{
        method:'DELETE'
      });

      await loadAnggota();

    }
    else if(type === 'suratMasuk'){

      await fetch(`api/surat_masuk.php?id=${id}`,{
        method:'DELETE'
      });

      await loadSuratMasuk();
      await loadDokumen();

    }
    else if(type === 'suratKeluar'){

      await fetch(`api/surat_keluar.php?id=${id}`, {
        method: 'DELETE'
      });

      await loadSuratKeluar();
      await loadDokumen();

    }
    else if(type === 'dokumen'){

      await fetch(`api/dokumen.php?id=${id}`, {
        method: 'DELETE'
      });

      await loadDokumen();

    }
    else if(type === 'kegiatan'){

      await fetch(`api/kegiatan.php?id=${id}`, {
        method: 'DELETE'
      });

      await loadKegiatan();

    }
    else {

      store[type] = store[type].filter(
        x => Number(x.id) !== Number(id)
      );

      if (type === 'kegiatan') renderKegiatan();

    }

    refreshDashboard();
    closeModal('modalHapus');
    showToast('Data berhasil dihapus!');
  };

  document.getElementById('confirmDelete').onclick = deleteCallback;
  openModal('modalHapus');
}

// ===== SEARCH TABLE =====
function searchTable(tableId, query) {
  const rows = document.querySelectorAll(`#${tableId} tbody tr`);
  const q = query.toLowerCase();
  rows.forEach(row => {
    row.style.display = row.textContent.toLowerCase().includes(q) ? '' : 'none';
  });
}

// ===== EXPORT =====
function exportExcel(tableId, sheetName) {
  const table = document.getElementById(tableId);
  const rows = [];
  const headers = Array.from(table.querySelectorAll('thead th')).map(th => th.textContent).filter(h => h !== 'Aksi');
  rows.push(headers);
  table.querySelectorAll('tbody tr').forEach(tr => {
    if (tr.style.display === 'none') return;
    const cells = Array.from(tr.querySelectorAll('td')).slice(0, -1).map(td => td.textContent.trim());
    rows.push(cells);
  });
  exportToExcel(rows.slice(1).map(r => Object.fromEntries(headers.map((h,i) => [h, r[i]]))), sheetName);
}

function exportToExcel(data, sheetName) {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${sheetName}_${new Date().toISOString().split('T')[0]}.xlsx`);
  showToast('File Excel berhasil diunduh!');
}

function exportCSV(tableId, fileName) {
  const table = document.getElementById(tableId);
  const headers = Array.from(table.querySelectorAll('thead th')).map(th => th.textContent).filter(h => h !== 'Aksi');
  let csv = headers.join(',') + '\n';
  table.querySelectorAll('tbody tr').forEach(tr => {
    if (tr.style.display === 'none') return;
    const cells = Array.from(tr.querySelectorAll('td')).slice(0, -1).map(td => `"${td.textContent.trim().replace(/"/g,'""')}"`);
    csv += cells.join(',') + '\n';
  });
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${fileName}_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  showToast('File CSV berhasil diunduh!');
}

function printTable(tableId, title) {
  const table = document.getElementById(tableId).cloneNode(true);
  table.querySelectorAll('td:last-child, th:last-child').forEach(el => el.remove());
  const w = window.open('', '_blank');
  w.document.write(`<html><head><title>${title}</title>
  <style>body{font-family:sans-serif;font-size:12px} table{width:100%;border-collapse:collapse} th,td{border:1px solid #ddd;padding:8px;text-align:left} th{background:#0f1f3d;color:white}</style>
  </head><body><h2>HIMPUNAN MAHASISWA INFORMATIKA</h2><h3>${title}</h3>${table.outerHTML}</body></html>`);
  w.document.close();
  w.print();
}

// ===== MODAL =====
function openModal(id) {
  if (typeof SFX !== 'undefined') SFX.open();
  document.getElementById(id).classList.add('active');
}

function closeModal(id) {
  if (typeof SFX !== 'undefined') SFX.close();
  document.getElementById(id).classList.remove('active');
  if (id === 'modalAnggota') {
    document.getElementById('modalAnggotaTitle').innerHTML = '<i class="fas fa-user-plus"></i> Tambah Anggota';
    store.editMode = {type:null, id:null};
  }
  if (id === 'modalSuratMasuk') {
    clearFileStore('listSM');
    const fi = document.getElementById('fileSM');
    if (fi) fi.value = '';
  }
  if (id === 'modalSuratKeluar') {
    clearFileStore('listSK');
    const fi = document.getElementById('fileSK');
    if (fi) fi.value = '';
  }
  if (id === 'modalNotulensi') {
    resetNotulensiForm();
    store.editMode = {type:null, id:null};
  }
}

document.querySelectorAll('.modal-overlay').forEach(m => {
  m.addEventListener('click', (e) => {
    if (e.target === m) closeModal(m.id);
  });
});

// ===== TOAST =====
function showToast(msg, type='success') {
  if (typeof SFX !== 'undefined') {
    if (type === 'success') SFX.success();
    else SFX.error();
  }
  const tc = document.getElementById('toastContainer');
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `<i class="fas fa-${type==='success'?'check-circle':'exclamation-circle'}"></i> ${msg}`;
  tc.appendChild(t);
  setTimeout(() => { t.style.opacity='0'; t.style.transition='opacity .3s'; setTimeout(()=>t.remove(), 300); }, 3000);
}

// ===== HELPERS =====
function formatDate(d) {
  if (!d) return '—';
  const dt = new Date(d);
  return dt.toLocaleDateString('id-ID', {day:'numeric', month:'long', year:'numeric'});
}

function statusBadge(s) {
  const map = { 'Selesai':'badge-success', 'Diproses':'badge-warning', 'Pending':'badge-info', 'Ditolak':'badge-danger', 'Dikirim':'badge-info', 'Draft':'badge-gray', 'Berjalan':'badge-success' };
  return map[s] || 'badge-gray';
}

function fileIcon(name) {
  const ext = name.split('.').pop().toLowerCase();
  const map = { pdf:'fas fa-file-pdf', doc:'fas fa-file-word', docx:'fas fa-file-word', xls:'fas fa-file-excel', xlsx:'fas fa-file-excel', jpg:'fas fa-file-image', jpeg:'fas fa-file-image', png:'fas fa-file-image', zip:'fas fa-file-archive', rar:'fas fa-file-archive' };
  return map[ext] || 'fas fa-file';
}

// Set default dates
window.addEventListener('load', () => {
  const today = new Date().toISOString().split('T')[0];
  ['sm_tanggal','sm_terima','sk_tanggal','keg_mulai','keg_selesai','abs_tanggal'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = today;
  });
});

// ===== RIPPLE EFFECT + CLICK SOUND UNTUK SEMUA BUTTON =====
document.addEventListener('click', (e) => {
  const btn = e.target.closest('.btn');
  if (!btn) return;

  if (typeof SFX !== 'undefined') SFX.click();

  const circle = document.createElement('span');
  circle.className = 'ripple';
  const rect = btn.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  circle.style.width = circle.style.height = size + 'px';
  circle.style.left = (e.clientX - rect.left - size / 2) + 'px';
  circle.style.top = (e.clientY - rect.top - size / 2) + 'px';
  btn.appendChild(circle);
  setTimeout(() => circle.remove(), 500);
});