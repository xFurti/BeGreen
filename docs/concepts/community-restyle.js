// Standalone design prototype. All state lives in this page; no backend or persistent writes.
const $ = (selector) => document.querySelector(selector);
const tabs = [...document.querySelectorAll('[role="tab"]')];
const sheet = $('#sheet');
let examples = false;
let previewGroups = [];
const demoGroups = [
  { name: 'Amici in verde', members: 6, visibility: 'Privato', icon: 'users' },
  { name: 'La nostra classe', members: 24, visibility: 'Privato', icon: 'leaf' },
  { name: 'Quartiere in movimento', members: 18, visibility: 'Pubblico', icon: 'home' },
];
const icon = (name) => `<svg aria-hidden="true"><use href="#${name}"/></svg>`;
const escapeText = (value) => value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

function selectTab(id, focus = false) {
  tabs.forEach((tab) => {
    const selected = tab.id === id;
    tab.setAttribute('aria-selected', String(selected));
    tab.tabIndex = selected ? 0 : -1;
    $(`#${tab.getAttribute('aria-controls')}`).hidden = !selected;
    if (selected && focus) tab.focus();
  });
  window.scrollTo(0, 0);
}
tabs.forEach((tab, index) => {
  tab.addEventListener('click', () => selectTab(tab.id));
  tab.addEventListener('keydown', (event) => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? 1 : 1 - index;
    selectTab(tabs[next].id, true);
  });
});

function openSheet(title, content, eyebrow = 'ANTEPRIMA DEL PERCORSO') {
  $('#sheet-title').textContent = title;
  $('#sheet-eyebrow').textContent = eyebrow;
  $('#sheet-content').innerHTML = content;
  if (!sheet.open) sheet.showModal();
}
$('#close-sheet').onclick = () => sheet.close();

function showMap() {
  const map = $('.map-preview').cloneNode(true);
  map.querySelector('.map-hit').replaceWith(...map.querySelector('.map-hit').childNodes);
  map.querySelector('.map-open').remove();
  openSheet('La mappa di Verona', '<div class="sheet-map" id="large-map"></div><p class="sheet-copy">Scopri i luoghi condivisi dalla community.</p><div class="layer-chips" aria-label="Categorie della mappa">' + ['Tutti', 'Da scoprire', 'Ripara e riusa', 'Eventi'].map((label, i) => `<button aria-pressed="${i === 0}">${label}</button>`).join('') + '</div><p class="sheet-note" id="map-status" aria-live="polite">Anteprima statica di Verona, senza contributi di esempio. Nell’app si apre la mappa esistente, con tutte le categorie, zoom e filtri.</p>');
  $('#large-map').append(map);
  document.querySelectorAll('.layer-chips button').forEach((button) => {
    button.onclick = () => {
      document.querySelectorAll('.layer-chips button').forEach((b) => b.setAttribute('aria-pressed', String(b === button)));
      $('#map-status').textContent = `${button.textContent}: nessun contributo caricato in questo prototipo. La mappa qui è statica.`;
    };
  });
}
document.querySelector('[data-action="map"]').onclick = showMap;

function showCity() {
  openSheet('La community di Verona', '<div class="detail-card"><h3>Il territorio, tutto insieme.</h3><p>Luoghi, iniziative, sfide e gesti condivisi. L’adesione al Comune rimane in questa pagina: non serve una seconda scheda nella schermata iniziale.</p></div><button class="primary" id="city-map" style="width:100%">Apri la mappa' + icon('arrow') + '</button><p class="sheet-note">Qui la proposta si ricollega alla pagina del Comune già presente nell’app. Il prototipo mostra solo il punto d’ingresso.</p>');
  $('#city-map').onclick = showMap;
}
$('#explore-city').onclick = showCity;

function citySearch(change) {
  openSheet(change ? 'Cambia il tuo Comune' : 'Esplora un Comune', `<p class="sheet-copy">${change ? 'Il Comune selezionato sarà lo stesso per Community, Dati e sfida del giorno.' : 'Puoi esplorare altre community senza cambiare il tuo Comune.'}</p><div class="sheet-form" style="margin-top:18px"><label>Cerca un Comune<input id="city-query" type="search" placeholder="Nome del Comune" autocomplete="off"></label></div><button class="sheet-row" id="verona-result"><span>Verona<small>Veneto · Comune dell’anteprima</small></span>${icon('chevron')}</button><p class="sheet-note" id="search-note">Solo Verona è disponibile nel prototipo. Nell’app si usa la ricerca completa dei Comuni italiani già esistente.</p>`);
  $('#city-query').oninput = (event) => {
    const matches = 'verona'.includes(event.target.value.trim().toLowerCase());
    $('#verona-result').hidden = !matches;
    $('#search-note').textContent = matches ? 'Solo Verona è disponibile nel prototipo. Nell’app si usa la ricerca completa dei Comuni italiani già esistente.' : 'Nessun risultato nel prototipo. La ricerca completa sarà quella già presente nell’app.';
  };
  $('#verona-result').onclick = change ? () => sheet.close() : showCity;
}
$('#change-city').onclick = () => citySearch(true);
$('#other-cities').onclick = () => citySearch(false);
$('#add-place').onclick = () => {
  openSheet('Aggiungi al territorio', '<div class="detail-card"><h3>Un luogo utile. Un’idea da condividere.</h3><p>Da qui si apre la mappa di Verona, dove puoi scegliere il punto e aggiungere un luogo o un’iniziativa con il percorso già presente nell’app.</p></div><button class="primary" id="add-map" style="width:100%">Scegli sulla mappa' + icon('pin') + '</button><p class="sheet-note">Questa anteprima non invia contributi.</p>');
  $('#add-map').onclick = showMap;
};

function renderGroups() {
  const groups = [...(examples ? demoGroups : []), ...previewGroups];
  $('#groups-empty').hidden = groups.length > 0;
  $('#groups-populated').hidden = groups.length === 0;
  $('#group-count').textContent = groups.length;
  $('#group-list').innerHTML = groups.map((group, index) => `<button class="group-row" data-group="${index}"><span class="group-icon">${icon(group.icon)}</span><span class="group-description"><strong>${escapeText(group.name)}</strong><small>${icon(group.visibility === 'Privato' ? 'lock' : 'users')}${group.visibility} · ${group.members} ${group.members === 1 ? 'membro' : 'membri'}</small><span class="demo-label">GRUPPO DI ESEMPIO</span></span>${icon('chevron')}</button>`).join('');
  document.querySelectorAll('[data-group]').forEach((button) => {
    button.onclick = () => {
      const group = groups[Number(button.dataset.group)];
      openSheet(group.name, `<div class="detail-card"><h3>Il vostro spazio per agire.</h3><p>${group.visibility} · ${group.members} ${group.members === 1 ? 'membro' : 'membri'} di esempio.<br>Qui si apre la pagina del gruppo con gesti, sfide e impatto condiviso.</p></div><p class="sheet-copy">Inviti, membri e impostazioni restano dentro al gruppo che hai scelto. Per passare a un altro, torni all’elenco in Gruppi.</p><button class="sheet-row" id="back-to-groups"><span>Torna ai tuoi gruppi</span>${icon('arrow')}</button><p class="sheet-note">Dati dimostrativi. Nessun gruppo reale è stato aperto o modificato.</p>`);
      $('#back-to-groups').onclick = () => sheet.close();
    };
  });
  $('#toggle-examples').textContent = examples ? 'Nascondi gruppi di esempio' : 'Mostra gruppi di esempio';
}
$('#toggle-examples').onclick = () => { examples = !examples; renderGroups(); };
document.querySelectorAll('[data-scenario]').forEach((button) => {
  button.onclick = () => {
    examples = button.dataset.scenario === 'groups';
    previewGroups = [];
    renderGroups();
    selectTab(examples ? 'groups-tab' : 'territory-tab');
  };
});

$('#new-group').onclick = () => {
  openSheet('Un nuovo gruppo', '<form class="sheet-form" id="create-form"><label>Come vi chiamate?<input name="groupName" placeholder="Es. Amici in verde" minlength="3" maxlength="60" required autocomplete="off"></label><label>Chi può vedere i contenuti?<select name="visibility"><option>Privato</option><option>Pubblico</option></select></label><p class="sheet-copy" id="visibility-note">Solo i membri possono vedere i contenuti. Si entra con un codice d’invito.</p><button class="primary" type="submit">Prova la creazione' + icon('plus') + '</button></form><p class="sheet-note">È una simulazione: il gruppo comparirà solo in questa anteprima e scomparirà ricaricando la pagina.</p>');
  const form = $('#create-form');
  form.elements.visibility.onchange = (event) => {
    $('#visibility-note').textContent = event.target.value === 'Privato' ? 'Solo i membri possono vedere i contenuti. Si entra con un codice d’invito.' : 'Anche chi non è membro può vedere i contenuti. Si entra con un codice d’invito.';
  };
  form.onsubmit = (event) => {
    event.preventDefault();
    const name = form.elements.groupName.value.trim();
    if (name.length < 3) { form.elements.groupName.setCustomValidity('Usa almeno tre caratteri.'); form.reportValidity(); return; }
    previewGroups.push({ name, members: 1, visibility: form.elements.visibility.value, icon: 'users' });
    renderGroups();
    sheet.close();
    selectTab('groups-tab');
    $('#group-list').lastElementChild.focus();
  };
  form.elements.groupName.oninput = () => form.elements.groupName.setCustomValidity('');
};
$('#join-code').onclick = () => {
  openSheet('Hai già un invito?', '<form class="sheet-form" id="join-form"><p class="sheet-copy">Inserisci il codice che ti hanno condiviso.</p><label>Codice d’invito<input class="code-input" name="code" placeholder="DEMO123" maxlength="12" required autocomplete="off" autocapitalize="characters" spellcheck="false" aria-describedby="invite-hint"></label><p class="sheet-note" id="invite-hint" style="margin:0">Per provare usa <b>DEMO123</b>. Non inserire codici reali.</p><p class="form-error" id="code-error" role="alert" hidden></p><button class="primary" type="submit">Prova l’ingresso' + icon('arrow') + '</button></form><p class="sheet-note">Il prototipo non verifica inviti reali e non modifica le tue iscrizioni.</p>');
  $('#join-form').onsubmit = (event) => {
    event.preventDefault();
    if (event.target.elements.code.value.trim().toUpperCase() !== 'DEMO123') {
      $('#code-error').textContent = 'Nel prototipo è valido solo il codice DEMO123.';
      $('#code-error').hidden = false;
      return;
    }
    if (!previewGroups.some((group) => group.inviteDemo)) previewGroups.push({ name: 'Il gruppo dei tuoi amici', members: 7, visibility: 'Privato', icon: 'users', inviteDemo: true });
    renderGroups();
    sheet.close();
    selectTab('groups-tab');
  };
};
$('#info').onclick = () => openSheet('Due sezioni, meno giri.', '<p class="sheet-copy">Territorio raccoglie Comune, mappa e contributi locali. Gruppi raccoglie le tue cerchie, con i comandi per crearne una o entrare con un codice.</p><p class="sheet-note">Proposta visiva separata dall’app. La mappa è una vista statica reale di Verona. Nessun contributo locale è stato inventato; nomi e membri dei gruppi sono esempi. Tutte le interazioni restano in memoria nella pagina.</p>', 'PROPOSTA COMMUNITY / 01');
renderGroups();
