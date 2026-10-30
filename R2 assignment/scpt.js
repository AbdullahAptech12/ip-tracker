/* ===== NetScope — script.js ===== */
(function () {
  'use strict';

  /* ---------- Helpers ---------- */
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
  const HISTORY_KEY = 'netscope_history_v2';
  const MAX_STORED = 100;

  /* ---------- Navbar, menu, reveal ---------- */
  const navbar = $('#navbar');
  const hamburger = $('#hamburger');
  const navLinks = $('#navLinks');

  function onScroll() { navbar.classList.toggle('scrolled', window.scrollY > 40); }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  function closeMenu() {
    hamburger.classList.remove('open');
    navLinks.classList.remove('open');
    navbar.classList.remove('menu-open');
    hamburger.setAttribute('aria-expanded', 'false');
  }
  hamburger.addEventListener('click', () => {
    const open = hamburger.classList.toggle('open');
    navLinks.classList.toggle('open', open);
    navbar.classList.toggle('menu-open', open);
    hamburger.setAttribute('aria-expanded', String(open));
  });
  $$('#navLinks a').forEach((a) => a.addEventListener('click', closeMenu));

  const io = 'IntersectionObserver' in window
    ? new IntersectionObserver((entries) => {
        entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); } });
      }, { threshold: 0.12 })
    : null;
  $$('.reveal').forEach((el) => (io ? io.observe(el) : el.classList.add('visible')));
  $('#year').textContent = new Date().getFullYear();

  /* ---------- Ports database ---------- */
  const PORTS = [
    { port: '21', proto: 'TCP', name: 'FTP', desc: 'File Transfer Protocol. Sends credentials and data in clear text.', risk: 'danger', cat: 'File Transfer' },
    { port: '22', proto: 'TCP', name: 'SSH', desc: 'Secure Shell for encrypted remote login and tunneling.', risk: 'warning', cat: 'Remote Access' },
    { port: '23', proto: 'TCP', name: 'Telnet', desc: 'Unencrypted remote terminal. Obsolete and heavily attacked.', risk: 'danger', cat: 'Remote Access' },
    { port: '25', proto: 'TCP', name: 'SMTP', desc: 'Simple Mail Transfer Protocol for sending email between servers.', risk: 'warning', cat: 'Email' },
    { port: '53', proto: 'TCP/UDP', name: 'DNS', desc: 'Domain Name System: translates domain names into IP addresses.', risk: 'warning', cat: 'DNS' },
    { port: '67/68', proto: 'UDP', name: 'DHCP', desc: 'Dynamic Host Configuration Protocol: assigns IP addresses automatically.', risk: 'safe', cat: 'DNS' },
    { port: '80', proto: 'TCP', name: 'HTTP', desc: 'Unencrypted web traffic. Should redirect to HTTPS.', risk: 'warning', cat: 'Web' },
    { port: '110', proto: 'TCP', name: 'POP3', desc: 'Post Office Protocol v3 for retrieving email, unencrypted.', risk: 'warning', cat: 'Email' },
    { port: '143', proto: 'TCP', name: 'IMAP', desc: 'Internet Message Access Protocol for reading email on a server.', risk: 'warning', cat: 'Email' },
    { port: '443', proto: 'TCP', name: 'HTTPS', desc: 'HTTP over TLS: the encrypted standard for web traffic.', risk: 'safe', cat: 'Web' },
    { port: '445', proto: 'TCP', name: 'SMB', desc: 'Windows file and printer sharing. A frequent ransomware entry point.', risk: 'danger', cat: 'File Transfer' },
    { port: '993', proto: 'TCP', name: 'IMAPS', desc: 'IMAP over TLS: encrypted mailbox access.', risk: 'safe', cat: 'Email' },
    { port: '995', proto: 'TCP', name: 'POP3S', desc: 'POP3 over TLS: encrypted email retrieval.', risk: 'safe', cat: 'Email' },
    { port: '1433', proto: 'TCP', name: 'MSSQL', desc: 'Microsoft SQL Server database. Never expose directly to the internet.', risk: 'danger', cat: 'Database' },
    { port: '1521', proto: 'TCP', name: 'Oracle DB', desc: 'Oracle database listener. Restrict to trusted networks.', risk: 'danger', cat: 'Database' },
    { port: '3306', proto: 'TCP', name: 'MySQL', desc: 'MySQL / MariaDB database server.', risk: 'danger', cat: 'Database' },
    { port: '3389', proto: 'TCP', name: 'RDP', desc: 'Remote Desktop Protocol. Common target of brute-force attacks.', risk: 'danger', cat: 'Remote Access' },
    { port: '5432', proto: 'TCP', name: 'PostgreSQL', desc: 'PostgreSQL database server.', risk: 'danger', cat: 'Database' },
    { port: '5900', proto: 'TCP', name: 'VNC', desc: 'Virtual Network Computing remote desktop, often weakly protected.', risk: 'danger', cat: 'Remote Access' },
    { port: '6379', proto: 'TCP', name: 'Redis', desc: 'In-memory data store. Historically deployed without authentication.', risk: 'danger', cat: 'Database' },
    { port: '8080', proto: 'TCP', name: 'HTTP-Alt', desc: 'Alternative HTTP port used by proxies, dev servers and admin panels.', risk: 'warning', cat: 'Web' },
    { port: '8443', proto: 'TCP', name: 'HTTPS-Alt', desc: 'Alternative HTTPS port for secure web apps and admin consoles.', risk: 'safe', cat: 'Web' },
    { port: '27017', proto: 'TCP', name: 'MongoDB', desc: 'MongoDB NoSQL database. Often exposed by mistake.', risk: 'danger', cat: 'Database' }
  ];
  const RISK_LABEL = { safe: 'Safe', warning: 'Warning', danger: 'Danger' };
  const RISK_SCORE = { safe: 20, warning: 55, danger: 90 };
  let portRisk = 'all';

  function renderPorts() {
    const q = $('#portSearch').value.trim().toLowerCase();
    const list = PORTS.filter((p) =>
      (portRisk === 'all' || p.risk === portRisk) &&
      (!q || p.port.includes(q) || p.name.toLowerCase().includes(q) || p.desc.toLowerCase().includes(q) || p.cat.toLowerCase().includes(q))
    );
    $('#portsGrid').innerHTML = list.map((p) => `
      <article class="port-card card ${p.risk}">
        <div class="port-top"><span class="port-num">${esc(p.port)}</span><span class="proto">${esc(p.proto)}</span></div>
        <div class="port-name">${esc(p.name)}</div>
        <p class="port-desc">${esc(p.desc)}</p>
        <span class="risk">${RISK_LABEL[p.risk]}</span>
      </article>`).join('');
    $('#portsEmpty').classList.toggle('hidden', list.length > 0);
  }
  $('#portSearch').addEventListener('input', renderPorts);
  $('#portChips').addEventListener('click', (e) => {
    const btn = e.target.closest('.chip');
    if (!btn) return;
    $$('.chip').forEach((c) => c.classList.remove('active'));
    btn.classList.add('active');
    portRisk = btn.dataset.risk;
    renderPorts();
  });
  renderPorts();

  /* ---------- IP logic ---------- */
  function validateIPv4(raw) {
    const ip = (raw || '').trim();
    if (!ip) return { ok: false, msg: 'Please enter an IPv4 address to analyze.' };
    if (/\s/.test(ip)) return { ok: false, msg: 'IP addresses cannot contain spaces.' };
    if (ip.includes(':')) return { ok: false, msg: 'IPv6 is not supported. Please enter an IPv4 address such as 8.8.8.8.' };
    if (!/^[\d.]+$/.test(ip)) return { ok: false, msg: 'Invalid characters. An IPv4 address contains only digits and dots.' };
    const parts = ip.split('.');
    if (parts.length !== 4) return { ok: false, msg: `An IPv4 address needs exactly 4 octets separated by dots (found ${parts.length}).` };
    for (let i = 0; i < 4; i++) {
      const p = parts[i];
      if (p === '') return { ok: false, msg: `Octet ${i + 1} is empty. Check for doubled or trailing dots.` };
      if (p.length > 1 && p[0] === '0') return { ok: false, msg: `Octet ${i + 1} ("${p}") has a leading zero, which is ambiguous. Remove it.` };
      const n = Number(p);
      if (!Number.isInteger(n) || n < 0 || n > 255) return { ok: false, msg: `Octet ${i + 1} ("${p}") is out of range. Each octet must be 0–255.` };
    }
    return { ok: true, ip, octets: parts.map(Number) };
  }

  function inCidr(o, a, b, c, d, prefix) {
    const toInt = (x) => ((x[0] << 24) | (x[1] << 16) | (x[2] << 8) | x[3]) >>> 0;
    const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
    return ((toInt(o) & mask) >>> 0) === ((toInt([a, b, c, d]) & mask) >>> 0);
  }

  function classify(o) {
    if (inCidr(o, 127, 0, 0, 0, 8)) return { type: 'loopback', range: '127.0.0.0/8' };
    if (inCidr(o, 10, 0, 0, 0, 8)) return { type: 'private', range: '10.0.0.0/8' };
    if (inCidr(o, 172, 16, 0, 0, 12)) return { type: 'private', range: '172.16.0.0/12' };
    if (inCidr(o, 192, 168, 0, 0, 16)) return { type: 'private', range: '192.168.0.0/16' };
    const reserved = [
      [0, 0, 0, 0, 8, 'this network (0.0.0.0/8)'], [169, 254, 0, 0, 16, 'link-local / APIPA (169.254.0.0/16)'],
      [192, 0, 2, 0, 24, 'TEST-NET-1 documentation (192.0.2.0/24)'], [198, 51, 100, 0, 24, 'TEST-NET-2 documentation (198.51.100.0/24)'],
      [203, 0, 113, 0, 24, 'TEST-NET-3 documentation (203.0.113.0/24)'], [224, 0, 0, 0, 4, 'multicast (224.0.0.0/4)'],
      [240, 0, 0, 0, 4, 'reserved for future use (240.0.0.0/4)']
    ];
    for (const r of reserved) if (inCidr(o, r[0], r[1], r[2], r[3], r[4])) return { type: 'reserved', range: r[5] };
    return { type: 'public', range: 'Globally routable' };
  }

  function ipClass(first) {
    if (first <= 127) return { cls: 'A', mask: '255.0.0.0', cidr: '/8', note: 'Large networks (1–126, plus 0 and 127 special use)' };
    if (first <= 191) return { cls: 'B', mask: '255.255.0.0', cidr: '/16', note: 'Medium networks (128–191)' };
    if (first <= 223) return { cls: 'C', mask: '255.255.255.0', cidr: '/24', note: 'Small networks (192–223)' };
    if (first <= 239) return { cls: 'D', mask: 'N/A (multicast)', cidr: 'N/A', note: 'Multicast groups (224–239)' };
    return { cls: 'E', mask: 'N/A (experimental)', cidr: 'N/A', note: 'Experimental / reserved (240–255)' };
  }

  const toBinary = (o) => o.map((n) => n.toString(2).padStart(8, '0'));
  const toInteger = (o) => ((o[0] * 16777216) + (o[1] << 16) + (o[2] << 8) + o[3]) >>> 0;

  const TYPE_INFO = {
    public: {
      label: 'Public', icon: 'fa-earth-americas', score: 82,
      text: 'A <strong>public IP address</strong> is globally routable and assigned by a regional internet registry to an ISP or organization. Devices with a public IP can be reached from anywhere on the internet unless a firewall blocks them.',
      points: ['Visible to and reachable from the wider internet', 'Unique worldwide; assigned via ISPs and RIRs', 'Location and ISP data are available']
    },
    private: {
      label: 'Private', icon: 'fa-house-lock', score: 22,
      text: 'A <strong>private IP address</strong> belongs to a range reserved by RFC 1918 for internal networks (home, office, cloud VPCs). It is not routable on the public internet and is typically translated by NAT at the router.',
      points: ['Used inside LANs; reusable by any network', 'Cannot be reached directly from the internet', 'No public location, since the address is not unique globally']
    },
    loopback: {
      label: 'Loopback', icon: 'fa-rotate', score: 4,
      text: 'A <strong>loopback address</strong> (127.0.0.0/8) points back to the device itself. Traffic sent here never leaves the machine, making it ideal for testing local services (<code>localhost</code>).',
      points: ['Always refers to the local host', 'Never travels over a physical network', 'Used for development and diagnostics']
    },
    reserved: {
      label: 'Reserved', icon: 'fa-ban', score: 45,
      text: 'A <strong>reserved address</strong> is set aside for special purposes such as documentation examples, multicast, link-local auto-configuration, or future use. These addresses should not appear as normal public hosts.',
      points: ['Special-purpose range defined by IETF standards', 'Not assigned to regular internet hosts', 'Seeing one in real traffic may indicate misconfiguration or spoofing']
    }
  };

  /* ---------- History (LocalStorage) ---------- */
  function loadHistory() {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr.filter((h) => h && typeof h.ip === 'string') : [];
    } catch (e) { return []; }
  }
  function saveHistory(arr) {
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(arr.slice(0, MAX_STORED))); } catch (e) { /* storage unavailable */ }
  }
  function addHistory(entry) {
    const h = loadHistory();
    h.unshift(entry);
    saveHistory(h);
    renderHistory();
    updateCharts();
  }
  function renderHistory() {
    const list = $('#historyList');
    const h = loadHistory().slice(0, 10);
    if (!h.length) {
      list.innerHTML = '<li class="empty-history"><i class="fa-regular fa-folder-open"></i>No search history yet</li>';
      return;
    }
    list.innerHTML = h.map((x) => {
      const type = TYPE_INFO[x.type] ? x.type : 'public';
      const when = new Date(x.timestamp);
      const ts = isNaN(when) ? '' : when.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
      return `<li class="history-item" tabindex="0" role="button" data-ip="${esc(x.ip)}" aria-label="Re-analyze ${esc(x.ip)}">
        <span class="h-ip">${esc(x.ip)}</span>
        <span class="badge ${type}">${esc(TYPE_INFO[type].label)}</span>
        <span class="h-country">${x.country ? esc(x.country) : '—'}${x.isp ? ' · ' + esc(x.isp) : ''}</span>
        <span class="h-time"><i class="fa-regular fa-clock"></i> ${esc(ts)}</span>
      </li>`;
    }).join('');
  }
  $('#historyList').addEventListener('click', (e) => {
    const li = e.target.closest('.history-item');
    if (li) rerun(li.dataset.ip);
  });
  $('#historyList').addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const li = e.target.closest('.history-item');
    if (li) { e.preventDefault(); rerun(li.dataset.ip); }
  });
  $('#clearHistoryBtn').addEventListener('click', () => {
    try { localStorage.removeItem(HISTORY_KEY); } catch (e) { /* ignore */ }
    renderHistory();
    updateCharts();
  });
  function rerun(ip) {
    $('#ipInput').value = ip;
    $('#analyzer').scrollIntoView({ behavior: 'smooth' });
    analyze(ip);
  }

  /* ---------- Charts ---------- */
  const PALETTE = { blue: '#4f8cff', teal: '#4fb3bf', violet: '#9b8bd6', amber: '#d9a441', green: '#4caf7d', gray: '#7b8494' };
  let classChart = null, typeChart = null;

  function initCharts() {
    if (typeof window.Chart === 'undefined') {
      $$('.chart-box').forEach((b) => { b.innerHTML = '<p class="no-results">Charts unavailable: Chart.js could not be loaded (check your connection).</p>'; });
      return;
    }
    Chart.defaults.color = '#9aa1ac';
    Chart.defaults.font.family = "'Inter', sans-serif";
    Chart.defaults.borderColor = 'rgba(255,255,255,0.07)';
    const tooltip = { backgroundColor: '#21252c', borderColor: '#2d323b', borderWidth: 1, titleColor: '#e6e8eb', bodyColor: '#c4c9d1', padding: 10 };

    classChart = new Chart($('#classChart'), {
      type: 'doughnut',
      data: {
        labels: ['Class A', 'Class B', 'Class C', 'Class D', 'Class E'],
        datasets: [{ data: [0, 0, 0, 0, 0], backgroundColor: [PALETTE.blue, PALETTE.teal, PALETTE.violet, PALETTE.amber, PALETTE.gray], borderColor: '#1a1d23', borderWidth: 3 }]
      },
      options: { responsive: true, maintainAspectRatio: false, cutout: '62%', plugins: { legend: { position: 'bottom', labels: { padding: 16, usePointStyle: true } }, tooltip } }
    });

    typeChart = new Chart($('#typeChart'), {
      type: 'bar',
      data: {
        labels: ['Public', 'Private', 'Loopback', 'Reserved'],
        datasets: [{ label: 'Searches', data: [0, 0, 0, 0], backgroundColor: [PALETTE.green, PALETTE.teal, PALETTE.violet, PALETTE.amber], borderRadius: 6, borderSkipped: false }]
      },
      options: {
        indexAxis: 'y', responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip },
        scales: { x: { beginAtZero: true, ticks: { precision: 0, stepSize: 1 }, grid: { color: 'rgba(255,255,255,0.06)' } }, y: { grid: { display: false } } }
      }
    });

    const cats = ['Web', 'Email', 'Database', 'Remote Access', 'File Transfer', 'DNS'];
    const riskData = cats.map((c) => {
      const items = PORTS.filter((p) => p.cat === c);
      return Math.round(items.reduce((s, p) => s + RISK_SCORE[p.risk], 0) / items.length);
    });
    new Chart($('#riskChart'), {
      type: 'radar',
      data: {
        labels: cats,
        datasets: [{ label: 'Average risk score (0–100)', data: riskData, backgroundColor: 'rgba(79,140,255,0.2)', borderColor: PALETTE.blue, borderWidth: 2, pointBackgroundColor: PALETTE.blue, pointBorderColor: '#1a1d23', pointRadius: 4, pointHoverRadius: 6 }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { labels: { usePointStyle: true } }, tooltip },
        scales: { r: { min: 0, max: 100, ticks: { stepSize: 25, backdropColor: 'transparent', color: '#7b8494' }, grid: { color: 'rgba(255,255,255,0.1)' }, angleLines: { color: 'rgba(255,255,255,0.1)' }, pointLabels: { color: '#c4c9d1', font: { size: 13, weight: '600' } } } }
      }
    });
    updateCharts();
  }

  function updateCharts() {
    if (!classChart || !typeChart) return;
    const h = loadHistory();
    classChart.data.datasets[0].data = ['A', 'B', 'C', 'D', 'E'].map((c) => h.filter((x) => x.class === c).length);
    typeChart.data.datasets[0].data = ['public', 'private', 'loopback', 'reserved'].map((t) => h.filter((x) => x.type === t).length);
    classChart.update();
    typeChart.update();
    $('[data-for="classChart"]').classList.toggle('hidden', h.length > 0);
    $('[data-for="typeChart"]').classList.toggle('hidden', h.length > 0);
  }

  /* ---------- Map (Leaflet, dark tiles) ---------- */
  let ipMap = null;

  function destroyMap() {
    if (ipMap) { ipMap.remove(); ipMap = null; }
  }

  function drawMap(geo, ip) {
    const box = $('#ipMap');
    if (!box) return;
    if (typeof window.L === 'undefined') {
      box.innerHTML = '<div class="map-fallback"><span><i class="fa-solid fa-map"></i><br>The map could not load. Check your internet connection and try again.</span></div>';
      return;
    }
    try {
      const pos = [geo.lat, geo.lon];
      ipMap = L.map(box, { scrollWheelZoom: false, dragging: !L.Browser.mobile, tap: false, worldCopyJump: true }).setView(pos, 10);
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        subdomains: 'abcd', maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener">CARTO</a>'
      }).addTo(ipMap);
      const icon = L.divIcon({ className: 'map-pin', html: '<span></span>', iconSize: [22, 22], iconAnchor: [11, 11], popupAnchor: [0, -12] });
      const place = [geo.city, geo.regionName, geo.country].filter(Boolean).join(', ');
      L.marker(pos, { icon, title: ip })
        .addTo(ipMap)
        .bindPopup(`<strong>${esc(ip)}</strong>${place ? '<br>' + esc(place) : ''}${geo.isp ? '<br><span class="pp-muted">' + esc(geo.isp) + '</span>' : ''}`)
        .openPopup();
      // approximate accuracy ring (IP geolocation is city-level)
      L.circle(pos, { radius: 8000, color: '#4f8cff', weight: 1, fillColor: '#4f8cff', fillOpacity: 0.08 }).addTo(ipMap);
      setTimeout(() => ipMap && ipMap.invalidateSize(), 250);
    } catch (err) {
      box.innerHTML = '<div class="map-fallback"><span>The map could not be displayed.</span></div>';
    }
  }

  /* ---------- Analyzer UI ---------- */
  const ipInput = $('#ipInput');
  const validationEl = $('#validation');
  const resultsEl = $('#results');
  const loaderEl = $('#loader');
  const analyzeBtn = $('#analyzeBtn');
  let runId = 0;
  let controller = null;

  function setValidation(kind, html) {
    validationEl.className = 'validation';
    if (!kind) { validationEl.innerHTML = ''; ipInput.classList.remove('valid', 'invalid'); return; }
    validationEl.classList.add('show', kind);
    const icon = kind === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation';
    validationEl.innerHTML = `<i class="fa-solid ${icon}"></i>${html}`;
    ipInput.classList.toggle('invalid', kind === 'error');
    ipInput.classList.toggle('valid', kind === 'success');
  }

  function infoItem(icon, label, value, mono, delay) {
    const v = value == null || value === '' ? '—' : value;
    return `<div class="info-item" style="animation-delay:${delay || 0}ms"><div class="lbl"><i class="fa-solid ${icon}"></i>${esc(label)}</div><div class="val ${mono ? 'mono' : ''}">${esc(v)}</div></div>`;
  }

  function flagEmoji(cc) {
    if (!cc || cc.length !== 2) return '🌐';
    return String.fromCodePoint(...cc.toUpperCase().split('').map((c) => 127397 + c.charCodeAt(0)));
  }

  function gaugeHTML(score) {
    const color = score < 34 ? '#4caf7d' : score < 67 ? '#d9a441' : '#d9534f';
    const level = score < 34 ? 'Low exposure' : score < 67 ? 'Moderate exposure' : 'High exposure';
    return `<div class="card pad gauge-card">
      <h3><i class="fa-solid fa-gauge-high"></i> Exposure Score</h3>
      <svg class="gauge" viewBox="0 0 200 118" role="img" aria-label="Exposure score ${score} out of 100">
        <path class="gauge-track" d="M 20 100 A 80 80 0 0 1 180 100"/>
        <path class="gauge-fill" id="gaugeFill" data-score="${score}" style="stroke:${color}" d="M 20 100 A 80 80 0 0 1 180 100"/>
        <g class="needle" id="gaugeNeedle"><line x1="100" y1="100" x2="100" y2="34" stroke="#e6e8eb" stroke-width="3" stroke-linecap="round"/><circle cx="100" cy="100" r="8" fill="#e6e8eb"/><circle cx="100" cy="100" r="3.5" fill="${color}"/></g>
      </svg>
      <div class="gauge-score" style="color:${color}">${score}<small>/100</small></div>
      <div class="gauge-label">${level}</div>
      <p class="gauge-note">An estimate of how exposed this address is to the public internet, based on its classification.</p>
    </div>`;
  }

  function animateGauge() {
    const fill = $('#gaugeFill'), needle = $('#gaugeNeedle');
    if (!fill || !needle) return;
    const score = Number(fill.dataset.score);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      fill.style.strokeDashoffset = String(251.3 * (1 - score / 100));
      needle.style.transform = `rotate(${score * 1.8 - 90}deg)`;
    }));
  }

  async function fetchGeo(ip, signal) {
    const url = `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,message,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp,org,as,query`;
    const timer = setTimeout(() => controller && controller.abort(), 9000);
    try {
      const res = await fetch(url, { signal });
      if (res.status === 429) throw new Error('RATE_LIMIT');
      if (!res.ok) throw new Error('HTTP_' + res.status);
      const data = await res.json();
      if (data.status !== 'success') throw new Error('API:' + (data.message || 'unknown error'));
      return data;
    } finally { clearTimeout(timer); }
  }

  function geoErrorMessage(err) {
    const m = String((err && err.message) || err || '');
    if (m === 'RATE_LIMIT') return 'The geolocation service is rate-limiting requests (free tier: 45 per minute). Please wait a minute and try again.';
    if (m.startsWith('API:')) return 'The geolocation service could not find data for this address (' + m.slice(4) + ').';
    if (m.startsWith('HTTP_')) return 'The geolocation service returned an error (' + m.slice(5) + '). Please try again later.';
    if (err && err.name === 'AbortError') return 'The geolocation request timed out. Please check your connection and try again.';
    if (location.protocol === 'https:') return 'The geolocation request was blocked. The free ip-api.com endpoint is HTTP-only, so browsers block it on HTTPS pages. Open this file locally (file://) or over http://.';
    return 'Could not reach the geolocation service. Check your internet connection or disable ad/tracker blockers, then try again.';
  }

  async function analyze(raw) {
    const my = ++runId;
    if (controller) controller.abort();
    controller = new AbortController();

    const v = validateIPv4(raw);
    destroyMap();
    resultsEl.classList.add('hidden');
    if (!v.ok) {
      loaderEl.classList.add('hidden');
      setValidation('error', esc(v.msg));
      analyzeBtn.disabled = false;
      return;
    }

    const o = v.octets;
    const c = classify(o);
    const info = TYPE_INFO[c.type];
    const k = ipClass(o[0]);
    const bin = toBinary(o);
    const int = toInteger(o);

    setValidation('success', `<strong>${esc(v.ip)}</strong> is a valid IPv4 address.`);
    analyzeBtn.disabled = true;
    loaderEl.classList.remove('hidden');

    let geo = null, geoError = null;
    if (c.type === 'public') {
      try { geo = await fetchGeo(v.ip, controller.signal); }
      catch (err) {
        if (my !== runId) return;
        geoError = geoErrorMessage(err);
      }
    }
    if (my !== runId) return;

    const hasMap = !!(geo && typeof geo.lat === 'number' && typeof geo.lon === 'number');

    let geoSection;
    if (c.type !== 'public') {
      geoSection = `<div class="notice"><i class="fa-solid fa-circle-info"></i><div><strong>Geolocation is not available for non-public IPs.</strong><br>${esc(info.label)} addresses are not unique on the internet, so there is no location or ISP to look up and nothing to show on the map.</div></div>`;
    } else if (geoError) {
      geoSection = `<div class="notice error"><i class="fa-solid fa-triangle-exclamation"></i><div><strong>Geolocation lookup failed.</strong><br>${esc(geoError)}</div></div>`;
    } else {
      const g = geo;
      const region = [g.regionName, g.region && g.regionName !== g.region ? `(${g.region})` : ''].filter(Boolean).join(' ');
      geoSection = `<div class="info-grid">
        ${infoItem('fa-flag', 'Country', `${flagEmoji(g.countryCode)} ${g.country || ''}${g.countryCode ? ' (' + g.countryCode + ')' : ''}`, false, 0)}
        ${infoItem('fa-map', 'Region', region, false, 50)}
        ${infoItem('fa-city', 'City', g.city, false, 100)}
        ${infoItem('fa-envelope', 'ZIP / Postal', g.zip, false, 150)}
        ${infoItem('fa-clock', 'Timezone', g.timezone, false, 200)}
        ${infoItem('fa-tower-broadcast', 'ISP', g.isp, false, 250)}
        ${infoItem('fa-building', 'Organization', g.org, false, 300)}
        ${infoItem('fa-diagram-project', 'ASN', g.as, false, 350)}
      </div>
      <div class="coords"><span>Latitude: <strong>${esc(g.lat)}</strong></span><span>Longitude: <strong>${esc(g.lon)}</strong></span></div>
      <div class="map-wrap"><div id="ipMap" class="ip-map" role="application" aria-label="Map showing the location of ${esc(v.ip)}"></div></div>
      <p class="hint" style="margin-top:8px">IP geolocation is approximate, usually accurate to the city or ISP region.</p>`;
    }

    resultsEl.innerHTML = `
      <div class="res-top">
        <div class="card pad">
          <h3><i class="fa-solid fa-tag"></i> Classification</h3>
          <span class="badge ${c.type}"><i class="fa-solid ${info.icon}"></i> ${esc(info.label)}</span>
          <div class="ip-big">${esc(v.ip)}</div>
          <p class="explain">${info.text}</p>
          <ul class="explain-list">${info.points.map((p) => `<li>${esc(p)}</li>`).join('')}<li>Matched range: ${esc(c.range)}</li></ul>
        </div>
        ${gaugeHTML(info.score)}
      </div>
      <div class="card pad">
        <h3><i class="fa-solid fa-microchip"></i> Binary &amp; Technical Details</h3>
        <div class="binary-octets" aria-label="Binary representation">${bin.map((b) => `<span class="octet">${b}</span>`).join('')}</div>
        <p class="explain" style="margin:12px 0 18px">Dotted binary: <code>${bin.join('.')}</code></p>
        <div class="info-grid">
          ${infoItem('fa-hashtag', 'Integer Value', int.toLocaleString('en-US') + '  (' + int + ')', true, 0)}
          ${infoItem('fa-layer-group', 'IP Class', `Class ${k.cls}: ${k.note}`, false, 50)}
          ${infoItem('fa-filter', 'Default Subnet Mask', k.mask, true, 100)}
          ${infoItem('fa-slash', 'CIDR Notation', k.cidr === 'N/A' ? 'N/A' : `${v.ip}${k.cidr}`, true, 150)}
          ${infoItem('fa-code', 'Hexadecimal', '0x' + int.toString(16).toUpperCase().padStart(8, '0'), true, 200)}
          ${infoItem('fa-arrows-left-right', 'Matched Range', c.range, false, 250)}
        </div>
      </div>
      <div class="card pad">
        <h3><i class="fa-solid fa-location-dot"></i> Location, Map &amp; ISP</h3>
        ${geoSection}
      </div>`;

    loaderEl.classList.add('hidden');
    analyzeBtn.disabled = false;
    resultsEl.classList.remove('hidden');
    resultsEl.style.animation = 'none'; void resultsEl.offsetWidth; resultsEl.style.animation = '';
    animateGauge();
    if (hasMap) requestAnimationFrame(() => drawMap(geo, v.ip));
    setTimeout(() => resultsEl.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);

    addHistory({
      ip: v.ip, type: c.type, class: k.cls,
      country: geo ? geo.country : null, isp: geo ? geo.isp : null,
      timestamp: new Date().toISOString()
    });
  }

  $('#analyzeForm').addEventListener('submit', (e) => { e.preventDefault(); analyze(ipInput.value); });
  $('#clearBtn').addEventListener('click', () => {
    runId++;
    if (controller) controller.abort();
    destroyMap();
    ipInput.value = '';
    setValidation(null);
    resultsEl.classList.add('hidden');
    resultsEl.innerHTML = '';
    loaderEl.classList.add('hidden');
    analyzeBtn.disabled = false;
    ipInput.focus();
  });
  ipInput.addEventListener('input', () => { if (validationEl.classList.contains('show')) setValidation(null); });

  const SAMPLES = ['8.8.8.8', '192.168.1.1', '127.0.0.1', '10.0.0.1', '172.16.0.1', '1.1.1.1', '203.0.113.5'];
  let sampleIdx = 0;
  $('#sampleBtn').addEventListener('click', () => {
    ipInput.value = SAMPLES[sampleIdx];
    sampleIdx = (sampleIdx + 1) % SAMPLES.length;
    analyze(ipInput.value);
  });

  $('#heroForm').addEventListener('submit', (e) => {
    e.preventDefault();
    ipInput.value = $('#heroInput').value.trim();
    $('#analyzer').scrollIntoView({ behavior: 'smooth' });
    analyze(ipInput.value);
  });

  /* ---------- Chatbot ---------- */
  const KB = [
    { keys: ['what is an ip', 'ip address', 'what is ip', 'internet protocol'], a: '<b>An IP address</b> is a unique numeric label assigned to every device on a network that uses the Internet Protocol. It does two jobs: <b>identifying</b> the device and giving its <b>location</b> in the network so data can be routed to it. Example: <code>192.168.1.10</code>.' },
    { keys: ['ipv4 vs ipv6', 'ipv6', 'ipv4', 'difference between ipv4'], a: '<b>IPv4 vs IPv6</b><ul><li><b>IPv4:</b> 32-bit, written as four decimal octets (<code>8.8.8.8</code>), about 4.3 billion addresses.</li><li><b>IPv6:</b> 128-bit, written in hex (<code>2001:4860:4860::8888</code>), roughly 3.4×10³⁸ addresses.</li><li>IPv6 removes the need for NAT, has built-in IPsec support and simpler headers.</li></ul>NetScope analyzes IPv4.' },
    { keys: ['public vs private', 'public ip', 'private ip', 'difference between public', 'rfc 1918', 'rfc1918'], a: '<b>Public vs Private</b><ul><li><b>Public</b> IPs are globally unique and reachable on the internet (e.g. <code>8.8.8.8</code>).</li><li><b>Private</b> IPs are for internal networks: <code>10.0.0.0/8</code>, <code>172.16.0.0/12</code>, <code>192.168.0.0/16</code>.</li><li>Routers use <b>NAT</b> to let many private devices share one public IP.</li></ul>' },
    { keys: ['subnet mask', 'subnet', 'netmask', 'subnetting'], a: '<b>A subnet mask</b> splits an IP address into a <b>network</b> part and a <b>host</b> part. For example, <code>255.255.255.0</code> (/24) means the first 3 octets identify the network and the last identifies the host, giving 254 usable addresses. Default masks: Class A <code>255.0.0.0</code>, Class B <code>255.255.0.0</code>, Class C <code>255.255.255.0</code>.' },
    { keys: ['what is dns', 'dns', 'domain name'], a: '<b>DNS (Domain Name System)</b> is the internet\'s phonebook. It translates human-friendly names like <code>example.com</code> into IP addresses. A lookup goes: your device → recursive resolver → root → TLD → authoritative server. It normally uses port <b>53</b> (UDP/TCP).' },
    { keys: ['what is nat', 'nat', 'network address translation', 'port forwarding'], a: '<b>NAT (Network Address Translation)</b> lets many devices with private IPs share a single public IP. The router rewrites source addresses and ports on outgoing packets and keeps a table to send replies back to the right device. It helped delay IPv4 exhaustion and hides internal hosts by default.' },
    { keys: ['dhcp', 'how does dhcp', 'dynamic host'], a: '<b>DHCP</b> hands out IP settings automatically using the <b>DORA</b> process:<ul><li><b>D</b>iscover: client broadcasts a request</li><li><b>O</b>ffer: server proposes an address</li><li><b>R</b>equest: client accepts it</li><li><b>A</b>cknowledge: server confirms the lease</li></ul>It also supplies the subnet mask, gateway and DNS servers. Uses UDP ports 67/68.' },
    { keys: ['loopback', 'localhost', '127.0.0.1'], a: '<b>The loopback address</b> <code>127.0.0.1</code> (the whole <code>127.0.0.0/8</code> block) always refers to your own device. Packets sent to it never leave the machine. Developers use it (hostname <code>localhost</code>) to test servers and apps locally.' },
    { keys: ['asn', 'autonomous system', 'what is an asn'], a: '<b>An ASN (Autonomous System Number)</b> identifies a large network or ISP that manages its own routing policy on the internet, e.g. <code>AS15169</code> is Google. ASNs are used by BGP to exchange routes between networks. NetScope shows the ASN for public IPs.' },
    { keys: ['what is a port', 'port number', 'ports', 'what are ports'], a: '<b>A port</b> is a 16-bit number (0–65535) that identifies a specific service on a device. The IP address finds the machine; the port finds the application. Examples: <code>80</code> HTTP, <code>443</code> HTTPS, <code>22</code> SSH. See the <a href="#ports">Ports section</a> for a full reference.' },
    { keys: ['find my ip', 'my own ip', 'my ip', 'whats my ip', "what's my ip", 'find your own ip', 'check my ip'], a: '<b>Finding your IP</b><ul><li><b>Public IP:</b> search "what is my IP" in a browser, or visit a service like ipify or ifconfig.me.</li><li><b>Private IP (Windows):</b> run <code>ipconfig</code></li><li><b>Mac/Linux:</b> run <code>ifconfig</code> or <code>ip addr</code></li><li><b>Phone:</b> Wi-Fi settings → network details.</li></ul>Paste the result into the analyzer above.' },
    { keys: ['security', 'secure', 'protect', 'safety', 'tips', 'vpn', 'hide ip'], a: '<b>IP security tips</b><ul><li>Keep a firewall enabled and close unused ports.</li><li>Never expose databases or RDP/VNC directly to the internet.</li><li>Use a VPN on untrusted Wi-Fi to mask your public IP.</li><li>Change default router passwords and update firmware.</li><li>Prefer HTTPS/SSH over HTTP/Telnet/FTP.</li><li>Use strong auth (keys or MFA) on remote access.</li></ul>' },
    { keys: ['cidr', 'cidr notation', 'slash notation', 'prefix length'], a: '<b>CIDR (Classless Inter-Domain Routing)</b> writes an address with a prefix length: <code>192.168.1.0/24</code> means the first 24 bits are the network. It replaced rigid classful addressing, so ranges can be any size. A <code>/24</code> has 256 addresses, a <code>/16</code> has 65,536, a <code>/30</code> has 4.' },
    { keys: ['firewall', 'what is a firewall'], a: '<b>A firewall</b> filters network traffic using rules (source/destination IP, port, protocol, and sometimes application data). It can be hardware or software, and sits between trusted and untrusted networks. Best practice: <b>default deny</b>, then allow only what you need.' },
    { keys: ['class a', 'class b', 'class c', 'ip class', 'classes'], a: '<b>IPv4 classes</b><ul><li><b>A:</b> 0–127, /8, huge networks</li><li><b>B:</b> 128–191, /16</li><li><b>C:</b> 192–223, /24</li><li><b>D:</b> 224–239, multicast</li><li><b>E:</b> 240–255, experimental</li></ul>Modern networks use CIDR, but classes are still taught and shown for reference.' },
    { keys: ['hello', 'hi', 'hey', 'good morning', 'good evening', 'greetings'], a: 'Hello! 👋 I\'m the NetScope assistant. Ask me about IP addresses, subnets, DNS, NAT, DHCP, ports, firewalls and more, or tap a suggestion below.' },
    { keys: ['thank', 'thanks', 'thx'], a: 'You\'re welcome! Let me know if there\'s anything else you\'d like to learn about networking. 🌐' },
    { keys: ['who are you', 'what can you do', 'help'], a: 'I\'m the NetScope AI Assistant, a built-in knowledge base for networking basics. Try asking about <b>IP addresses</b>, <b>subnet masks</b>, <b>DNS</b>, <b>NAT</b>, <b>DHCP</b>, <b>ports</b>, <b>CIDR</b>, <b>firewalls</b> or <b>IP security</b>.' }
  ];
  const SUGGESTIONS = ['What is an IP address?', 'IPv4 vs IPv6', 'Public vs private IP', 'What is a subnet mask?', 'What is DNS?', 'What is NAT?', 'How does DHCP work?', 'What is a loopback address?', 'What is an ASN?', 'What is a port?', 'How to find my IP', 'IP security tips', 'What is CIDR notation?', 'What is a firewall?'];
  const FALLBACK = 'I\'m not sure about that one yet. 🤔 I can help with <b>IP addresses, IPv4/IPv6, public vs private IPs, subnet masks, DNS, NAT, DHCP, loopback, ASN, ports, CIDR, firewalls</b> and <b>IP security</b>. Try rephrasing, or pick a suggestion below.';

  const chatBody = $('#chatBody');
  const chatInput = $('#chatInput');
  let botBusy = false;

  function addMsg(html, who, isText) {
    const d = document.createElement('div');
    d.className = 'msg ' + who;
    if (isText) d.textContent = html; else d.innerHTML = html;
    chatBody.appendChild(d);
    chatBody.scrollTop = chatBody.scrollHeight;
    return d;
  }

  function findAnswer(q) {
    const text = ' ' + q.toLowerCase().replace(/[^a-z0-9.'\s]/g, ' ').replace(/\s+/g, ' ') + ' ';
    let best = null, bestScore = 0;
    KB.forEach((e) => {
      let score = 0;
      e.keys.forEach((k) => {
        const needle = k.toLowerCase();
        const hit = needle.length <= 4 ? text.includes(' ' + needle + ' ') : text.includes(needle);
        if (hit) score += needle.length + (needle.includes(' ') ? 4 : 0);
      });
      if (score > bestScore) { bestScore = score; best = e; }
    });
    return best ? best.a : FALLBACK;
  }

  function ask(q) {
    q = q.trim();
    if (!q || botBusy) return;
    botBusy = true;
    addMsg(q, 'user', true);
    chatInput.value = '';
    const typing = document.createElement('div');
    typing.className = 'msg bot typing';
    typing.innerHTML = '<span></span><span></span><span></span>';
    chatBody.appendChild(typing);
    chatBody.scrollTop = chatBody.scrollHeight;
    setTimeout(() => {
      typing.remove();
      addMsg(findAnswer(q), 'bot');
      botBusy = false;
    }, 700 + Math.random() * 600);
  }

  $('#chatForm').addEventListener('submit', (e) => { e.preventDefault(); ask(chatInput.value); });
  $('#suggestions').innerHTML = SUGGESTIONS.map((s) => `<button type="button" class="sugg">${esc(s)}</button>`).join('');
  $('#suggestions').addEventListener('click', (e) => { const b = e.target.closest('.sugg'); if (b) ask(b.textContent); });
  addMsg('Hi! I\'m the <b>NetScope AI Assistant</b>. 🌐 Ask me anything about IP addresses and networking, or tap a suggestion below.', 'bot');

  /* ---------- Init ---------- */
  renderHistory();
  window.addEventListener('load', initCharts);
  if (document.readyState === 'complete') initCharts();
})();
