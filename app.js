// app.js — v10: Fundidos (carga y transición 'Leer') + fixes previos
(function(){
  const veil = document.getElementById('veil');
  const intro = document.getElementById('intro');
  const view = document.getElementById('poemaView');
  const btnLeer = document.getElementById('btnLeer');
  const poemaTexto = document.getElementById('poemaTexto');
  const audio = document.getElementById('bgm');
  const btnAudio = document.getElementById('btnAudio');
  const vol = document.getElementById('vol');
  const volPct = document.getElementById('volPct');

  let POEM_CACHE = null;

  function clamp01(n){ n = parseFloat(n); return isNaN(n) ? 0.05 : Math.min(1, Math.max(0, n)); }

  // ---------- VELO (fundidos) ----------
  function showVeil(){
    if (!veil) return;
    veil.classList.remove('hidden');
  }
  function hideVeil(){
    if (!veil) return;
    requestAnimationFrame(()=> veil.classList.add('hidden'));
  }

  // ---------- Vista del poema ----------
  function showPoemView(){
    if (intro) intro.style.display = 'none';
    if (view){
      view.style.display = 'block';
      void view.offsetWidth; // reflow para transición
      view.classList.add('show');
      view.setAttribute('aria-hidden','false');
    }
    window.scrollTo(0,0);
    requestAnimationFrame(()=>{ window.scrollTo(0,0); setTimeout(()=>window.scrollTo(0,0),0); });
  }

  function startMusic(){
    if (!audio) return;
    const p = audio.play();
    if (p && typeof p.then === 'function'){
      p.then(()=>{ if(btnAudio) btnAudio.textContent='🔊 Pausar'; })
       .catch(()=>{ if(btnAudio) btnAudio.textContent='▶️ Reproducir'; });
    }
  }

  // -------- Ajuste UNIFORME de fuente para todo el poema --------
  function debounce(fn, delay = 150) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); };
  }

  function fitUniform() {
    if (!poemaTexto) return;
    const lines = poemaTexto.querySelectorAll('.poem-line');
    if (!lines.length) return;

    const containerWidth = poemaTexto.clientWidth || 0;
    if (!containerWidth) return;

    // reset al tamaño base (máximo) determinado por CSS/viewport
    lines.forEach(el => { el.style.fontSize = ''; });
    const basePx = parseFloat(getComputedStyle(lines[0]).fontSize) || 16;

    // medir la línea más ancha
    let maxLineWidth = 0;
    lines.forEach(el => { if (el.scrollWidth > maxLineWidth) maxLineWidth = el.scrollWidth; });

    // calcular escala si es necesario
    let scale = 1;
    if (maxLineWidth > containerWidth) scale = containerWidth / maxLineWidth;

    const MIN_PX = 12;
    const targetPx = Math.max(MIN_PX, Math.floor(basePx * scale));

    lines.forEach(el => { el.style.fontSize = targetPx + 'px'; });
    poemaTexto.setAttribute('aria-busy', 'false');
  }

  // Render: preserva párrafos (líneas en blanco = gap visual)
  function renderPoem(text) {
    if (!poemaTexto) return;
    poemaTexto.innerHTML = '';

    const rawLines = (text || '').replace(/\r\n/g, '\n').split('\n');

    for (let i = 0; i < rawLines.length; i++) {
      const raw = rawLines[i];
      if (/^\s*$/.test(raw)) {
        const gap = document.createElement('div');
        gap.className = 'para-gap';
        gap.setAttribute('aria-hidden','true');
        poemaTexto.appendChild(gap);
        continue;
      }
      const line = raw.replace(/\s+$/,''); // quitar espacios de cola
      const div = document.createElement('div');
      div.className = 'poem-line';
      div.textContent = line.length ? line : ' ';
      poemaTexto.appendChild(div);
    }

    requestAnimationFrame(() => fitUniform());
  }

  function loadPoem(){
    if (POEM_CACHE !== null){ renderPoem(POEM_CACHE); return; }
    fetch('./poema.txt', { cache: 'no-store' })
      .then(res=>{ if(!res.ok) throw new Error('No se pudo cargar poema.txt'); return res.text(); })
      .then(txt=>{ POEM_CACHE = (txt||'').trimEnd(); renderPoem(POEM_CACHE || 'Poema vacío'); })
      .catch(err=>{ console.warn(err); poemaTexto.textContent = 'No se pudo cargar "poema.txt".'; poemaTexto.setAttribute('aria-busy','false'); });
  }

  const onResize = debounce(() => { fitUniform(); }, 150);
  window.addEventListener('resize', onResize);
  window.addEventListener('orientationchange', onResize);

  document.addEventListener('DOMContentLoaded', async ()=>{
    // Mostrar velo inicial (está visible por defecto) y ocultarlo cuando todo esté razonablemente listo
    try {
      if (document.fonts && document.fonts.ready) { await document.fonts.ready; }
    } catch(e){ /* fonts.ready no soportado */ }
    setTimeout(hideVeil, 150); // pequeño margen para evitar flash de tipografías

    // Volumen inicial
    const saved = localStorage.getItem('vol');
    const initial = clamp01(saved !== null ? saved : 0.30);
    if (audio) audio.volume = initial;
    if (vol) vol.value = String(initial);
    if (volPct) volPct.textContent = Math.round(initial*100) + '%';

    if (vol){
      vol.addEventListener('input', ()=>{
        const v = clamp01(vol.value || initial);
        if (audio) audio.volume = v;
        if (volPct) volPct.textContent = Math.round(v*100) + '%';
        try{ localStorage.setItem('vol', String(v)); }catch(e){}
      });
    }

    // Precarga poema (opcional)
    fetch('./poema.txt', { cache: 'no-store' })
      .then(r=> r.ok ? r.text() : '')
      .then(txt=>{ if(txt) POEM_CACHE = (txt||'').trimEnd(); })
      .catch(()=>{});

    if (btnLeer){
      btnLeer.addEventListener('click', (e)=>{
        e.preventDefault();
        // transición: fundido a blanco -> cambiar vista -> fundido desde blanco
        showVeil();
        setTimeout(()=>{
          showPoemView();
          poemaTexto.textContent = 'Cargando poema…';
          loadPoem();
          startMusic();
          hideVeil();
        }, 280);
      });
    }

    if (btnAudio){
      btnAudio.addEventListener('click', ()=>{
        if (audio.paused) { startMusic(); } else { audio.pause(); btnAudio.textContent = '🔇 Reproducir'; }
      });
    }

    // Enlace directo a #poemaView con transición suave
    if (location.hash === '#poemaView'){
      showVeil();
      setTimeout(()=>{
        showPoemView();
        loadPoem();
        hideVeil();
      }, 280);
    }
  });
})();
