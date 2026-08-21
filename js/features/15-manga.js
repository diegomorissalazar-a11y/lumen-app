// ═══════════════════════════════════
// LUMEN v165 — MÓDULO MANGAS
// ═══════════════════════════════════
(function(){
  const oldSelectType = window.selectType;
  window.selectType = function(type, btn){
    if(type !== 'manga') return oldSelectType(type, btn);
    currentType='manga';
    document.querySelectorAll('.type-btn').forEach(b=>{b.style.borderColor='var(--border)';b.style.background='#fff';b.style.color='var(--ink3)';});
    btn.style.borderColor='#6b3a8a';btn.style.background='#f2eafa';btn.style.color='#6b3a8a';
    ['form-libro','form-pelicula','form-serie','form-disco','form-manga'].forEach(id=>{const el=document.getElementById(id);if(el)el.style.display=id==='form-manga'?'block':'none';});
    document.getElementById('search-label').textContent='Registrar manga manualmente';
    document.getElementById('add-search').value='';document.getElementById('add-search-results').style.display='none';
  };

  const oldResetForm=window.resetForm;
  window.resetForm=function(){
    oldResetForm();
    ['fm-titulo','fm-autor','fm-editorial','fm-anio-pub','fm-cap-actual','fm-cap-total','fm-cover','fm-mes','fm-anio'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
    const ep=document.getElementById('fm-estado-publicacion');if(ep)ep.value='en_emision';
    const es=document.getElementById('fm-estado');if(es)es.value='leyendo';
    const pr=document.getElementById('fm-cover-preview');if(pr)pr.innerHTML='';
  };

  const oldOpenModal=window.openModal;
  window.openModal=function(id){oldOpenModal(id);if(id==='modal-add'&&!editingId){const y=document.getElementById('fm-anio');if(y)y.value=new Date().getFullYear();}};

  const oldSaveEntry=window.saveEntry;
  window.saveEntry=function(){
    if(currentType!=='manga') return oldSaveEntry();
    const titulo=document.getElementById('fm-titulo').value.trim(); if(!titulo){showToast('Ingresa el título');return;}
    const prev=editingId?db.entries.find(e=>e.id===editingId):null;
    const estado=document.getElementById('fm-estado').value;
    const now=new Date();
    const entry={id:editingId||('e_'+Date.now()),type:'manga',titulo,autor:document.getElementById('fm-autor').value.trim(),editorial:document.getElementById('fm-editorial').value.trim(),anio_pub:parseInt(document.getElementById('fm-anio-pub').value)||null,capActual:parseInt(document.getElementById('fm-cap-actual').value)||0,capTotal:parseInt(document.getElementById('fm-cap-total').value)||0,estado_publicacion:document.getElementById('fm-estado-publicacion').value,estado,mes:estado==='leido'?(document.getElementById('fm-mes').value||MESES[now.getMonth()]):'',anio:estado==='leido'?(parseInt(document.getElementById('fm-anio').value)||now.getFullYear()):null,cover:document.getElementById('fm-cover').value.trim(),notas:document.getElementById('f-notas').value||'',notas_lista:prev?.notas_lista||[],_updatedAt:Date.now()};
    if(editingId){const i=db.entries.findIndex(e=>e.id===editingId);if(i>=0)db.entries[i]=mergeEntryForSafeEdit(db.entries[i],entry);}else{const dup=db.entries.find(e=>e.type==='manga'&&(e.titulo||'').trim().toLowerCase()===titulo.toLowerCase());if(dup&&!confirm(`Ya tienes un manga con el título "${titulo}". ¿Añadir de todas formas?`))return;db.entries.push(entry);}
    saveDB();closeModal('modal-add');showToast('✓ Manga guardado');editingId=null;
    if(currentScreen==='home')renderHome();if(currentScreen==='library')renderLibrary();if(currentScreen==='stats')renderStatsMangas();
  };

  const oldEntryCardHTML=window.entryCardHTML;
  window.entryCardHTML=function(e){
    if(e.type!=='manga')return oldEntryCardHTML(e);
    const esc=s=>String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    const pct=e.capTotal>0?Math.min(100,Math.round((e.capActual||0)/e.capTotal*100)):0;
    const cover=coverUrl(e); const id=String(e.id).replace(/'/g,"\\'");
    return `<div class="entry-card" onclick="showDetail('${id}')"><div class="entry-card-spine manga"></div>${cover?`<img src="${esc(cover)}" class="entry-card-cover">`:`<div class="entry-card-cover" style="display:flex;align-items:center;justify-content:center;font-size:22px;">📖</div>`}<div class="entry-card-info"><div class="entry-card-title">${esc(e.titulo)}</div><div class="entry-card-sub">${[e.autor,e.editorial,e.anio_pub].filter(Boolean).map(esc).join(' · ')}</div><div class="progress-wrap"><div class="progress-fill" style="width:${pct}%;background:#6b3a8a;"></div></div><div style="font-size:11px;color:#6b3a8a;font-weight:700;margin-top:4px;">Cap. ${e.capActual||0} / ${e.capTotal||0} · ${pct}%</div><div class="entry-card-meta"><span class="badge ${e.estado==='leyendo'?'badge-leyendo':'badge-manga'}">${e.estado==='leyendo'?'Leyendo':'Manga leído'}</span><span style="font-size:10px;color:var(--ink4);">${mangaPublicationLabel(e.estado_publicacion)}</span>${e.notas_lista?.length?`<span style="font-size:10px;color:var(--ink4);">📝 ${e.notas_lista.length}</span>`:''}</div></div></div>`;
  };

  const oldShowDetail=window.showDetail;
  window.showDetail=function(id){
    const e=db.entries.find(x=>x.id===id);if(!e||e.type!=='manga')return oldShowDetail(id);
    const esc=s=>String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    const row=(l,v)=>v?`<div style="display:flex;gap:8px;padding:7px 0;border-bottom:1px solid var(--cream2);"><span style="font-size:10px;color:var(--ink4);letter-spacing:1.5px;text-transform:uppercase;font-weight:700;width:110px;flex-shrink:0;">${l}</span><span style="font-size:14px;color:var(--ink2);">${esc(v)}</span></div>`:'';
    const pct=e.capTotal>0?Math.min(100,Math.round((e.capActual||0)/e.capTotal*100)):0;
    document.getElementById('detail-title').textContent=e.titulo;
    let html=(coverUrl(e)?`<img src="${esc(coverUrl(e))}" style="width:80px;height:110px;object-fit:cover;border-radius:3px;float:right;margin:0 0 12px 12px;">`:'')+row('Mangaka',e.autor)+row('Editorial',e.editorial)+row('Publicado',e.anio_pub)+row('Publicación',mangaPublicationLabel(e.estado_publicacion))+row('Progreso',`Cap. ${e.capActual||0} / ${e.capTotal||0} · ${pct}%`)+row('Estado',e.estado==='leido'?'Leído':'Leyendo')+(e.estado==='leido'?row('Terminado',`${e.mes||''} ${e.anio||''}`):'');
    html+=`<div style="clear:both;"></div>${renderNotasSection(e)}<div style="display:flex;gap:8px;margin-top:16px;flex-wrap:wrap;">${e.estado==='leyendo'?`<button class="btn btn-primary btn-sm" onclick="closeModal('modal-detail');openMangaProgressModal('${id}')">↑ Actualizar</button>`:''}<button class="btn btn-secondary btn-sm" onclick="editEntry('${id}')">Editar</button><button class="btn btn-secondary btn-sm" onclick="openNotaModal('${id}')">+ Nota</button><button class="btn btn-red btn-sm" onclick="deleteEntry('${id}')">Eliminar</button></div>`;
    document.getElementById('detail-body').innerHTML=html;openModal('modal-detail');
  };

  const oldEditEntry=window.editEntry;
  window.editEntry=function(id){
    const e=db.entries.find(x=>x.id===id);if(!e||e.type!=='manga')return oldEditEntry(id);
    closeModal('modal-detail');editingId=id;openModal('modal-add');setTimeout(()=>{selectType('manga',document.querySelector('.type-btn[data-type="manga"]'));document.getElementById('f-notas').value=e.notas||'';const m={titulo:'fm-titulo',autor:'fm-autor',editorial:'fm-editorial',anio_pub:'fm-anio-pub',capActual:'fm-cap-actual',capTotal:'fm-cap-total',cover:'fm-cover',mes:'fm-mes',anio:'fm-anio'};Object.entries(m).forEach(([k,id2])=>{const el=document.getElementById(id2);if(el)el.value=e[k]??'';});document.getElementById('fm-estado-publicacion').value=e.estado_publicacion||'en_emision';document.getElementById('fm-estado').value=e.estado||'leyendo';if(coverUrl(e))previewMainCover('fm-cover','fm-cover-preview');},100);
  };

  const oldRenderHome=window.renderHome;
  window.renderHome=function(){oldRenderHome();renderMangaHome();};
  window.renderMangaHome=function(){
    const el=document.getElementById('currently-reading-manga-list');if(!el)return;
    const arr=db.entries.filter(e=>e.type==='manga'&&e.estado==='leyendo');
    if(!arr.length){el.innerHTML='<div style="font-size:13px;color:var(--ink4);font-style:italic;padding:6px 0;">No hay mangas en lectura.</div>';updateCarouselArrows('currently-reading-manga-list','manga-carousel-arrows',0);return;}
    el.innerHTML=arr.map(e=>{const pct=e.capTotal>0?Math.min(100,Math.round((e.capActual||0)/e.capTotal*100)):0;return `<div class="reading-mini-card" onclick="showDetail('${e.id}')">${coverUrl(e)?`<img src="${coverUrl(e)}" class="reading-mini-cover">`:`<div class="reading-mini-cover" style="display:flex;align-items:center;justify-content:center;font-size:28px;">📖</div>`}<div class="reading-mini-body"><div class="reading-mini-title">${e.titulo}</div><div class="reading-mini-autor">${e.autor||''}</div><div style="height:3px;background:var(--cream3);border-radius:2px;margin-top:4px;"><div style="height:3px;background:#6b3a8a;border-radius:2px;width:${pct}%;"></div></div><div class="reading-mini-pct" style="color:#6b3a8a;">Cap. ${e.capActual||0} / ${e.capTotal||0} · ${pct}%</div></div><button class="reading-mini-btn" onclick="event.stopPropagation();openMangaProgressModal('${e.id}')">↑ Actualizar</button><button class="reading-mini-btn" onclick="event.stopPropagation();openNotaModal('${e.id}')">📝 Notas</button></div>`;}).join('');
    updateCarouselArrows('currently-reading-manga-list','manga-carousel-arrows',arr.length);
  };

  window.openMangaQuickAdd=function(){editingId=null;openModal('modal-add');setTimeout(()=>selectType('manga',document.querySelector('.type-btn[data-type="manga"]')),30);};
  window.mangaPublicationLabel=function(v){return v==='finalizado'?'Finalizado':v==='en_pausa'?'En pausa':'En emisión';};
  window.openMangaProgressModal=function(id){const e=db.entries.find(x=>x.id===id);if(!e)return;document.getElementById('manga-progress-id').value=id;document.getElementById('manga-progress-title').textContent=e.titulo;document.getElementById('manga-progress-current').value=e.capActual||0;document.getElementById('manga-progress-total').value=e.capTotal||0;document.getElementById('manga-progress-publication').value=e.estado_publicacion||'en_emision';updateMangaProgressPreview();openModal('modal-manga-progress');};
  window.updateMangaProgressPreview=function(){const a=parseInt(document.getElementById('manga-progress-current').value)||0,t=parseInt(document.getElementById('manga-progress-total').value)||0,p=t>0?Math.min(100,Math.round(a/t*100)):0;document.getElementById('manga-progress-bar').style.width=p+'%';document.getElementById('manga-progress-label').textContent=t>0?`Cap. ${a} / ${t} · ${p}%`:'';};
  window.saveMangaProgress=function(){const e=db.entries.find(x=>x.id===document.getElementById('manga-progress-id').value);if(!e)return;e.capActual=parseInt(document.getElementById('manga-progress-current').value)||0;e.capTotal=parseInt(document.getElementById('manga-progress-total').value)||0;e.estado_publicacion=document.getElementById('manga-progress-publication').value;e._updatedAt=Date.now();saveDB();closeModal('modal-manga-progress');showToast('✓ Progreso actualizado');renderHome();if(currentScreen==='library')renderLibrary();};
  window.finishManga=function(){const e=db.entries.find(x=>x.id===document.getElementById('manga-progress-id').value);if(!e)return;const now=new Date();e.capActual=parseInt(document.getElementById('manga-progress-current').value)||e.capActual||0;e.capTotal=parseInt(document.getElementById('manga-progress-total').value)||e.capTotal||0;e.estado_publicacion=document.getElementById('manga-progress-publication').value;e.estado='leido';e.mes=MESES[now.getMonth()];e.anio=now.getFullYear();e._updatedAt=Date.now();saveDB();closeModal('modal-manga-progress');showToast('✓ Manga terminado');renderHome();if(currentScreen==='library')renderLibrary();};

  const oldTypeLabel=window.typeLabelForNotas,oldTypeIcon=window.typeIcon,oldEntryCreator=window.entryCreator;
  window.typeLabelForNotas=t=>t==='manga'?'Mangas':oldTypeLabel(t);window.typeIcon=t=>t==='manga'?'📖':oldTypeIcon(t);window.entryCreator=e=>e?.type==='manga'?(e.autor||''):oldEntryCreator(e);
  const oldRenderNotas=window.renderNotasLibrary;window.renderNotasLibrary=function(q=''){oldRenderNotas(q);};

  const oldSwitchStats=window.switchStatsSeg;
  window.switchStatsSeg=function(seg,btn){if(seg!=='mangas')return oldSwitchStats(seg,btn);document.querySelectorAll('#stats-seg .stats-seg-btn').forEach(b=>b.classList.toggle('active',b===btn));document.querySelectorAll('.stats-panel').forEach(p=>p.classList.toggle('active',p.id==='spanel-mangas'));renderStatsMangas();};
  window.renderStatsMangas=function(){
    const done=db.entries.filter(e=>e.type==='manga'&&e.estado==='leido');const total=db.entries.filter(e=>e.type==='manga').length;const longest=[...done].sort((a,b)=>(b.capTotal||0)-(a.capTotal||0))[0];
    document.getElementById('mg-kpis').innerHTML=`<div class="stat-box"><div class="stat-num">${done.length}</div><div class="stat-label">Terminados</div></div><div class="stat-box"><div class="stat-num">${total-done.length}</div><div class="stat-label">Leyendo</div></div><div class="stat-box"><div class="stat-num">${longest?.capTotal||0}</div><div class="stat-label">Mayor capítulos</div></div>`;
    const counts=f=>{const c={};done.forEach(e=>{const v=(e[f]||'').trim();if(v)c[v]=(c[v]||0)+1;});return Object.entries(c).sort((a,b)=>b[1]-a[1]);};
    const renderTop=(id,arr)=>{const el=document.getElementById(id);el.innerHTML=arr.slice(0,7).map((x,i)=>`<div class="top-int-item"><span class="top-int-rank">${i+1}</span><span class="top-int-name">${x[0]}</span><span class="top-int-count">${x[1]}</span></div>`).join('')||'<div style="font-size:12px;color:var(--ink4);">Sin datos</div>';};renderTop('mg-top-autor',counts('autor'));renderTop('mg-top-editorial',counts('editorial'));
    document.getElementById('mg-curiosidades').innerHTML=`<div class="card"><div style="font-family:var(--font-serif);font-size:15px;font-weight:700;margin-bottom:8px;">Curiosidades</div><div style="font-size:13px;color:var(--ink2);line-height:1.8;">${longest?`📖 El manga terminado con más capítulos es <b>${longest.titulo}</b>, con <b>${longest.capTotal}</b> capítulos.`:'Aún no hay mangas terminados.'}</div></div>`;
    if(window.mgChart)window.mgChart.destroy();const vals=MESES.map(m=>done.filter(e=>e.mes===m).length);const ctx=document.getElementById('mg-chart-mes');if(ctx&&window.Chart){window.mgChart=new Chart(ctx,{type:'bar',data:{labels:MESES.map(m=>m.slice(0,3)),datasets:[{label:'Mangas',data:vals,borderRadius:3}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{beginAtZero:true,ticks:{precision:0}},x:{grid:{display:false}}}}});}
  };

  // Actualizar búsqueda y filtros para manga
  const oldDoSearch=window.doSearch;window.doSearch=async function(q){if(currentType==='manga'){const el=document.getElementById('add-search-results');el.innerHTML='<div style="padding:12px 14px;font-size:13px;color:var(--ink3);">Los mangas se registran manualmente.</div>';el.style.display='block';return;}return oldDoSearch(q);};
  const oldRenderLibrary=window.renderLibrary;window.renderLibrary=function(){oldRenderLibrary();};

  // Incluir Mangas en el índice de Notas (la función original fija las categorías)
  const originalRenderNotasLibrary=window.renderNotasLibrary;
  window.renderNotasLibrary=function(query=''){
    originalRenderNotasLibrary(query);
    // Re-render simple si existen notas manga y no aparecieron por lista fija
    const mangas=(db.entries||[]).filter(e=>e.type==='manga'&&Array.isArray(e.notas_lista)&&e.notas_lista.length);
    if(!mangas.length)return;
    const doc=document.querySelector('.notas-reader-doc');const toc=document.querySelector('#notas-reader-toc .notas-tree > ul > li > details > ul');if(!doc||!toc)return;
    const esc=s=>String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    toc.insertAdjacentHTML('beforeend',`<li><details open><summary>Mangas</summary><ul>${mangas.map(e=>`<li><a class="toc-entry-link" href="#${noteAnchorId(e.id)}">📖 ${esc(e.titulo)}</a></li>`).join('')}</ul></details></li>`);
    doc.insertAdjacentHTML('beforeend',`<section><h2 class="notas-doc-category" id="${noteCategoryAnchorId('Mangas')}">Mangas</h2>${mangas.map(e=>`<article class="notas-doc-entry" id="${noteAnchorId(e.id)}"><h3 class="notas-doc-entry-title">${esc(e.titulo)}</h3><div class="notas-doc-entry-meta">${esc(e.autor||'')}</div>${e.notas_lista.map((n,i)=>`<div class="notas-doc-note" id="${noteItemAnchorId(e.id,i)}"><div class="notas-doc-note-title">Nota ${i+1}${n.titulo?' — '+esc(n.titulo):''}</div>${n.fecha?`<div class="notas-doc-note-date">${notasFechaLabel(n.fecha)}</div>`:''}<div class="notas-doc-note-text">${renderRichNoteText(n.texto||'')}</div></div>`).join('')}<div class="notas-doc-actions"><button class="btn btn-secondary btn-sm" onclick="showDetail('${e.id}')">Abrir ficha</button><button class="btn btn-secondary btn-sm" onclick="openNotaModal('${e.id}')">+ Nota</button></div></article>`).join('')}</section>`);
  };
})();


