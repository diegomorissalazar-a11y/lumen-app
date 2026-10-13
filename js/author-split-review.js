// LUMEN v213.4: autorías compartidas. Revisión explícita sin crear libros nuevos.
'use strict';
const LUMEN_AUTHOR_SPLIT_DEFAULTS = [';', '&', '/', ' y ', ' - '];
let _authorSplitEnabled = new Set(LUMEN_AUTHOR_SPLIT_DEFAULTS);
function authorSplitSeparators(){
  const custom=document.getElementById('author-split-custom')?.value?.trim()||'';
  return [..._authorSplitEnabled,...(custom?[custom]:[])].filter(Boolean).sort((a,b)=>b.length-a.length);
}
// Nombres canónicos compuestos: persistidos en el mismo bloque canónico que sincroniza LUMEN.
function authorSplitProtectedName(raw){
  const name=String(raw||'').trim();if(!name)return false;
  const catalog=typeof loadCanonicalEntities==='function'?loadCanonicalEntities():null;
  if(!catalog || !catalog.authors)return false;
  const norm=canonicalText(name);
  return Object.values(catalog.authors).some(e=>e && e.autoriaCompuestaProtegida &&
    [e.nombreCanonico,...(e.aliases||[])].some(n=>canonicalText(n)===norm));
}
function setAuthorSplitProtected(raw, protectedFlag){
  const name=String(raw||'').trim();if(!name)return false;
  const catalog=loadCanonicalEntities();
  let entity=Object.values(catalog.authors).find(e=>[e.nombreCanonico,...(e.aliases||[])].some(n=>canonicalText(n)===canonicalText(name)));
  if(!entity){const id=canonicalEntityId('aut',name);entity={id,nombreCanonico:name,aliases:[]};catalog.authors[id]=entity;}
  entity.autoriaCompuestaProtegida=!!protectedFlag;
  const rawData=JSON.stringify(catalog);
  try {localStorage.setItem(CANONICAL_ENTITIES_KEY,rawData);if(localStorage.getItem(CANONICAL_ENTITIES_KEY)!==rawData)throw new Error('Verificación de escritura fallida');}
  catch(err){showToast('No se pudo guardar la excepción: '+(err.name||'almacenamiento'));return false;}
  if(typeof saveDB==='function')saveDB();
  renderAuthorSplitReview();showToast(protectedFlag?'✓ Nombre compuesto protegido':'✓ Protección retirada');return true;
}
function authorSplitCandidate(raw, separators=authorSplitSeparators()){
  const text=String(raw||'').trim();if(!text || authorSplitProtectedName(text))return null;
  // Comas deshabilitadas salvo elección explícita; no dividir apellidos compuestos.
  let pieces=[text],matched=[];
  for(const sep of separators){
    if(!sep||!pieces.some(x=>x.includes(sep)))continue;
    const next=pieces.flatMap(x=>x.split(sep));
    if(next.length>pieces.length){pieces=next;matched.push(sep);}
  }
  pieces=pieces.map(x=>x.trim()).filter(Boolean);
  return pieces.length>1?{parts:pieces,separators:matched}:null;
}
function initAuthorSplitReview(){
  const host=document.getElementById('author-split-controls');if(!host)return;
  const opts=[[';','Punto y coma'],['&','&'],['/','/'],[',','Coma (revisión especial)'],[' y ','Conjunción «y»'],[' - ','Guion entre espacios']];
  host.replaceChildren();
  for(const [sep,label] of opts){
    const wrap=document.createElement('label');wrap.style.cssText='display:flex;gap:4px;align-items:center;font-size:12px';
    const input=document.createElement('input');input.type='checkbox';input.checked=_authorSplitEnabled.has(sep);
    input.onchange=()=>{input.checked?_authorSplitEnabled.add(sep):_authorSplitEnabled.delete(sep);renderAuthorSplitReview();};
    wrap.append(input,document.createTextNode(label));host.append(wrap);
  }
  renderAuthorSplitReview();
}
function authorSplitPendingBooks(){
  return (db.entries||[]).filter(e=>e?.type==='libro' && !(e.autorOriginalCredito && Array.isArray(e.autorIds) && e.autorIds.length>1)).map(e=>({book:e,candidate:authorSplitCandidate(e.autor)})).filter(x=>x.candidate);
}
function authorSplitCurrentParts(card){return [...card.querySelectorAll('input[data-split-part]')].map(i=>i.value.trim()).filter(Boolean);}
function renderAuthorSplitReview(){
  const out=document.getElementById('author-split-results'),count=document.getElementById('author-split-counter');if(!out)return;
  const candidates=authorSplitPendingBooks();if(count)count.textContent=`${candidates.length} libro(s) con autoría por revisar`;
  out.replaceChildren();
  if(!candidates.length){out.textContent='No se encontraron cadenas para dividir con los separadores activos.';}
  for(const {book,candidate} of candidates){
    const card=document.createElement('div');card.className='card';card.style.cssText='padding:12px;margin:0';
    const title=document.createElement('strong');title.textContent=book.titulo||'Sin título';card.append(title);
    const original=document.createElement('div');original.textContent=`Autor registrado: ${book.autor}`;original.style.cssText='font-size:12px;color:var(--ink3);margin:6px 0';card.append(original);
    const hint=document.createElement('div');hint.textContent='Edita cada nombre para utilizar la entidad canónica existente o una nueva. Puedes eliminar fragmentos erróneos.';hint.style.cssText='font-size:11px;margin:6px 0';card.append(hint);
    candidate.parts.forEach(part=>{const row=document.createElement('div');row.style.cssText='display:flex;align-items:center;gap:6px;margin:4px 0';const input=document.createElement('input');input.className='input';input.dataset.splitPart='1';input.value=part;input.setAttribute('list','lumen-authors-existing');row.append(input);card.append(row);});
    const add=document.createElement('button');add.type='button';add.className='btn btn-secondary btn-sm';add.textContent='+ Añadir autor';add.onclick=()=>{const input=document.createElement('input');input.className='input';input.dataset.splitPart='1';input.placeholder='Otro autor';card.insertBefore(input,action);};
    const action=document.createElement('div');action.style.cssText='display:flex;gap:8px;flex-wrap:wrap;margin-top:8px';action.append(add);
    const confirm=document.createElement('button');confirm.type='button';confirm.className='btn btn-primary btn-sm';confirm.textContent='Revisar y dividir';confirm.onclick=()=>applyAuthorSplitBook(book.id,authorSplitCurrentParts(card));action.append(confirm);
    const protect=document.createElement('button');protect.type='button';protect.className='btn btn-secondary btn-sm';protect.textContent='Es un nombre canónico compuesto';protect.onclick=()=>{if(confirm(`¿Conservar «${book.autor}» como UNA entidad y excluirlo de futuras propuestas de división?`))setAuthorSplitProtected(book.autor,true);};action.append(protect);
    card.append(action);out.append(card);
  }
  const protectedList=Object.values((typeof loadCanonicalEntities==='function'?loadCanonicalEntities().authors:{})||{}).filter(e=>e.autoriaCompuestaProtegida);
  if(protectedList.length){
    const box=document.createElement('div');box.className='card';box.style.cssText='padding:10px;margin-top:12px';
    const heading=document.createElement('strong');heading.textContent='Nombres compuestos protegidos';box.append(heading);
    protectedList.sort((a,b)=>a.nombreCanonico.localeCompare(b.nombreCanonico,'es')).forEach(e=>{
      const row=document.createElement('div');row.style.cssText='display:flex;gap:8px;align-items:center;justify-content:space-between;padding:5px 0';
      const name=document.createElement('span');name.textContent=e.nombreCanonico;
      const remove=document.createElement('button');remove.type='button';remove.className='btn btn-secondary btn-sm';remove.textContent='Quitar excepción';remove.onclick=()=>setAuthorSplitProtected(e.nombreCanonico,false);
      row.append(name,remove);box.append(row);
    });out.append(box);
  }
  let datalist=document.getElementById('lumen-authors-existing');if(!datalist){datalist=document.createElement('datalist');datalist.id='lumen-authors-existing';document.body.append(datalist);}
  const names=new Set((db.entries||[]).filter(e=>e.type==='libro').flatMap(e=>splitCanonicalAuthors(e.autor)));
  datalist.replaceChildren();[...names].sort((a,b)=>a.localeCompare(b,'es')).forEach(name=>{const opt=document.createElement('option');opt.value=name;datalist.append(opt);});
}
function applyAuthorSplitBook(bookId,parts){
  const book=(db.entries||[]).find(e=>String(e.id)===String(bookId)&&e.type==='libro');if(!book)return;
  const names=[...new Set(parts.map(x=>String(x).trim()).filter(Boolean))];
  if(names.length<2){showToast('Se requieren al menos dos autores distintos');return;}
  if(!confirm(`¿Dividir la autoría de «${book.titulo}»?\n\n${names.join(' ; ')}\n\nEl libro mantiene su ID. Se creará respaldo antes de guardar.`))return;
  const key='lumen_author_split_backup_'+Date.now();
  // Respaldo mínimo: libro anterior y entradas canónicas tocadas, nunca catálogo completo.
  const canonical=typeof loadCanonicalEntities==='function'?loadCanonicalEntities():{authors:{}};
  const affectedIds=names.map(n=>canonicalEntityId('aut',n));
  const authorsBefore={};affectedIds.forEach(id=>{if(canonical.authors?.[id])authorsBefore[id]=canonical.authors[id];});
  const sourceBook=JSON.parse(JSON.stringify(book));
  if(typeof sourceBook.cover==='string' && sourceBook.cover.startsWith('data:image/')) sourceBook.cover='__local_image__';
  const snapshot=JSON.stringify({schema:'lumen_author_split_backup_v2',at:new Date().toISOString(),before:{book:sourceBook,authorsBefore,affectedIds}});
  try{
    localStorage.setItem(key,snapshot);
    if(localStorage.getItem(key)!==snapshot)throw new Error('Verificación de respaldo fallida');
  } catch(e){
    showToast('Respaldo fallido ('+(e?.name||'almacenamiento')+'). División cancelada');return;
  }
  const original=book.autor;
  const ids=names.map(n=>resolveCanonicalEntity('aut',n,false).id);
  book.autorOriginalCredito=book.autorOriginalCredito||original;
  book.autor=names.join('; ');book.autorIds=[...new Set(ids)];book.autorId=book.autorIds[0]||'';
  book._updatedAt=Date.now();
  const ok=saveDB();if(ok===false){showToast('Error al persistir. Respaldo '+key);return;}
  const verified=book.autorIds.length===names.length&&book.id===bookId;
  if(typeof renderInventory==='function')renderInventory();
  renderAuthorSplitReview();showToast(verified?'✓ Autoría dividida; 1 libro y '+names.length+' autores.':'Revisar autorías; respaldo '+key);
}
// Control inmediato manual/JSON: confirmado y editable antes del guardado.
function confirmAuthorSplitInput(raw,title='este libro'){
  const proposal=authorSplitCandidate(raw);if(!proposal)return {author:raw,reviewed:false};
  if(!confirm(`Se detectaron posibles autores múltiples en «${title}»:\n${raw}\n\n¿Revisar la división antes de guardar?\nCancelar conserva el texto original y lo deja pendiente en Normalizar → Dividir autores.`))return {author:raw,reviewed:false};
  const answer=prompt('Edita los autores, separados por punto y coma (;)\nNo se creará más de un libro.',proposal.parts.join('; '));
  if(answer===null)return {author:raw,reviewed:false};
  const parts=answer.split(';').map(s=>s.trim()).filter(Boolean);
  if(parts.length<2){alert('La división requiere al menos dos autores. Se mantiene el texto original.');return {author:raw,reviewed:false};}
  return {author:[...new Set(parts)].join('; '),reviewed:true};
}
function authorSplitPostcheck(book){
  if(!book||book.type!=='libro')return;
  if(book.autor?.includes('; ')){
    const names=splitCanonicalAuthors(book.autor);book.autorIds=names.map(n=>resolveCanonicalEntity('aut',n,false).id);book.autorId=book.autorIds[0]||'';
  }
}
