/* ================= PÁGINAS (círculo a partir do clique) ================= */
var paginaAtual = null;   // id da página aberta, ou null no início
var camada = 100;         // z-index: cada página nova abre por cima da anterior

function pontoDoClique(e, el) {
  var r = el.getBoundingClientRect();
  return {
    x: e && e.clientX ? e.clientX : r.left + r.width / 2,
    y: e && e.clientY ? e.clientY : r.top + r.height / 2
  };
}

/* raio até o canto mais distante da tela, a partir do clique */
function raio(p) {
  var w = window.innerWidth, h = window.innerHeight;
  return Math.ceil(Math.hypot(Math.max(p.x, w - p.x), Math.max(p.y, h - p.y))) + 8;
}

/* contorno roxo que acompanha o círculo */
var anel = document.getElementById('anel');
var semMovimento = window.matchMedia('(prefers-reduced-motion: reduce)');

function animarAnel(p, r, abrindo, z) {
  if (semMovimento.matches || !anel.animate) return;
  var d = 2 * r + 'px';
  anel.style.left = p.x + 'px';
  anel.style.top = p.y + 'px';
  anel.style.zIndex = z;
  anel.getAnimations().forEach(function (a) { a.cancel(); });
  anel.animate(
    abrindo
      ? [{ width: '0px', height: '0px', opacity: 1 }, { width: d, height: d, opacity: 1 }]
      : [{ width: d, height: d, opacity: 1 }, { width: '0px', height: '0px', opacity: 1 }],
    { duration: abrindo ? 900 : 800, easing: 'cubic-bezier(.22, 1, .36, 1)' }
  );
}

function marcarAtivo(nome) {
  document.querySelectorAll('.menu-link').forEach(function (l) {
    var ativo = l.dataset.pagina === nome;
    l.classList.toggle('ativo', ativo);
    if (ativo) l.setAttribute('aria-current', 'page'); else l.removeAttribute('aria-current');
  });
}

/* Anima o recorte em círculo pelo JavaScript (funciona igual no Safari e no Chrome) */
var EASE = 'cubic-bezier(.22, 1, .36, 1)';

function recorte(p, r) { return 'circle(' + r + 'px at ' + p.x + 'px ' + p.y + 'px)'; }

function pararAnimacoes(el) {
  if (el.getAnimations) el.getAnimations().forEach(function (a) { a.cancel(); });
}

function esconder(pagina) {
  pararAnimacoes(pagina);
  pagina.classList.remove('aberta');
  pagina.inert = true;
}

function abrirPagina(nome, p) {
  if (nome === 'inicio') return voltarAoInicio(p);
  if (nome === paginaAtual) return;

  var nova = document.getElementById('pagina-' + nome);
  if (!nova) return;
  var anterior = paginaAtual ? document.getElementById('pagina-' + paginaAtual) : null;
  var r = raio(p);
  var token = (nova._token || 0) + 1;
  nova._token = token;

  pararAnimacoes(nova);
  nova.style.zIndex = ++camada;
  nova.inert = false;
  nova.classList.add('aberta');

  var tempo = semMovimento.matches ? 1 : 900;
  if (nova.animate) {
    nova.animate([{ clipPath: recorte(p, 0) }, { clipPath: recorte(p, r) }], { duration: tempo, easing: EASE });
  }
  animarAnel(p, r, true, camada + 1);

  document.body.classList.add('em-pagina');
  paginaAtual = nome;
  marcarAtivo(nome);

  // a página antiga some por baixo depois que a nova cobriu a tela
  if (anterior) {
    setTimeout(function () {
      if (paginaAtual === nome && anterior !== nova) esconder(anterior);
    }, tempo);
  }

  setTimeout(function () { nova.querySelector('.pagina-titulo').focus({ preventScroll: true }); }, 300);
}

function voltarAoInicio(p) {
  if (!paginaAtual) return;
  var atual = document.getElementById('pagina-' + paginaAtual);
  if (!p) p = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  var r = raio(p);
  var token = (atual._token || 0) + 1;
  atual._token = token;

  // qualquer outra página que ainda esteja aberta por baixo sai já
  document.querySelectorAll('.pagina.aberta').forEach(function (pg) { if (pg !== atual) esconder(pg); });

  paginaAtual = null;
  atual.inert = true;
  document.body.classList.remove('em-pagina');
  marcarAtivo('inicio');

  var tempo = semMovimento.matches ? 1 : 800;
  var terminou = false;
  function fim() {
    if (terminou || atual._token !== token) return;
    terminou = true;
    esconder(atual);
  }

  pararAnimacoes(atual);
  if (atual.animate) {
    var a = atual.animate([{ clipPath: recorte(p, r) }, { clipPath: recorte(p, 0) }],
      { duration: tempo, easing: EASE, fill: 'forwards' });
    if (a.finished) a.finished.then(fim, function () {});
  }
  animarAnel(p, r, false, parseInt(atual.style.zIndex || 100, 10) + 1);
  // garantia: mesmo que a animação falhe, a página fecha no fim do tempo
  setTimeout(fim, tempo + 60);
}

document.querySelectorAll('[data-pagina]').forEach(function (link) {
  link.addEventListener('click', function (e) {
    e.preventDefault();
    var p = pontoDoClique(e, link);
    var noMenu = link.closest('.menu-mobile');
    if (noMenu) fecharMenu();
    abrirPagina(link.dataset.pagina, p);
  });
});

document.addEventListener('keydown', function (e) {
  if (e.key !== 'Escape') return;
  if (document.body.classList.contains('menu-aberto')) return fecharMenu();
  if (paginaAtual) voltarAoInicio(null);
});

/* ================= MENU MOBILE ================= */
var menu = document.getElementById('menu-mobile');
var btnMenu = document.getElementById('btn-menu');

function centroBotaoMenu() {
  var b = btnMenu.getBoundingClientRect();
  return { x: b.left + b.width / 2, y: b.top + b.height / 2 };
}

function abrirMenu() {
  var p = centroBotaoMenu();
  menu._token = (menu._token || 0) + 1;
  pararAnimacoes(menu);
  menu.inert = false;
  menu.classList.add('aberto');
  if (menu.animate) {
    menu.animate([{ clipPath: recorte(p, 0) }, { clipPath: recorte(p, raio(p)) }],
      { duration: semMovimento.matches ? 1 : 800, easing: EASE });
  }
  document.body.classList.add('menu-aberto');
  btnMenu.setAttribute('aria-expanded', 'true');
  btnMenu.setAttribute('aria-label', textos[idioma].fecharMenu);
}
function fecharMenu() {
  var p = centroBotaoMenu();
  var token = (menu._token || 0) + 1;
  menu._token = token;
  var tempo = semMovimento.matches ? 1 : 600;
  function fim() {
    if (menu._token !== token) return;
    pararAnimacoes(menu);
    menu.classList.remove('aberto');
  }
  pararAnimacoes(menu);
  if (menu.animate) {
    var a = menu.animate([{ clipPath: recorte(p, raio(p)) }, { clipPath: recorte(p, 0) }],
      { duration: tempo, easing: EASE, fill: 'forwards' });
    if (a.finished) a.finished.then(fim, function () {});
  }
  setTimeout(fim, tempo + 60);
  menu.inert = true;
  document.body.classList.remove('menu-aberto');
  btnMenu.setAttribute('aria-expanded', 'false');
  btnMenu.setAttribute('aria-label', textos[idioma].abrirMenu);
}
btnMenu.addEventListener('click', function () {
  if (menu.classList.contains('aberto')) fecharMenu(); else abrirMenu();
});

/* ================= MODO ESCURO ================= */
var btnTema = document.getElementById('btn-tema');

function guardar(chave, valor) { try { localStorage.setItem(chave, valor); } catch (e) {} }
function ler(chave) { try { return localStorage.getItem(chave); } catch (e) { return null; } }

function aplicarTema(escuro) {
  document.body.classList.toggle('escuro', escuro);
  var t = textos[idioma];
  btnTema.setAttribute('aria-label', escuro ? t.temaClaro : t.temaEscuro);
  btnTema.title = escuro ? t.temaClaro : t.temaEscuro;
}
btnTema.addEventListener('click', function () {
  var escuro = !document.body.classList.contains('escuro');
  aplicarTema(escuro);
  guardar('tema', escuro ? 'escuro' : 'claro');
});

/* ================= IDIOMA (PT / EN) ================= */
var circulo = '<svg viewBox="0 0 120 44" preserveAspectRatio="none" aria-hidden="true"><path d="M30 40C12 38 4 31 6 22 9 10 34 4 62 4c30 0 52 8 52 19 0 11-24 17-54 17C34 40 14 35 9 27" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';

var textos = {
  pt: {
    inicio: 'Início', sobre: 'Sobre', projetos: 'Projetos', curriculo: 'Currículo', redes: 'Redes Sociais',
    faleComigo: 'Fale comigo', ola: 'Olá, eu sou a Jessica',
    frase: 'Transformo <em>sonhos</em> em <span class="circulada">soluções' + circulo + '</span> visuais criativas,<br class="quebra"> acessíveis, funcionais e estratégicas!',
    marcas: 'Marcas com que trabalhei',
    tSobre1: 'Sobre', tSobre2: 'mim', tProj1: 'Projetos', tProj2: 'selecionados',
    tCurr1: 'Currículo', tCurr2: 'trajetória', tRedes1: 'Redes', tRedes2: 'sociais', tCont1: 'Fale', tCont2: 'comigo',
    sobreLead: 'Escreva aqui um parágrafo de abertura sobre você: quem é, o que faz e para quem.',
    sobreTexto: 'Um segundo parágrafo com mais detalhes: como trabalha, o que inspira você e que tipo de projeto gosta de pegar.',
    catIdentidade: 'Identidade visual', catEditorial: 'Editorial', catProduto: 'Design de produto',
    experiencia: 'Experiência', formacao: 'Formação', ferramentas: 'Ferramentas', hoje: 'hoje',
    cargo: 'Cargo', empresa: 'Empresa', curso: 'Curso', instituicao: 'Instituição',
    contatoLead: 'Tem um projeto em mente? Me mande uma mensagem.',
    abrirMenu: 'Abrir menu', fecharMenu: 'Fechar menu',
    temaEscuro: 'Ativar modo escuro', temaClaro: 'Ativar modo claro',
    trocarIdioma: 'Mudar idioma para inglês', siglaOutro: 'EN', tituloIdioma: 'English', lang: 'pt-BR'
  },
  en: {
    inicio: 'Home', sobre: 'About', projetos: 'Projects', curriculo: 'Resume', redes: 'Social Media',
    faleComigo: "Let's talk", ola: "Hi, I'm Jessica",
    frase: 'I turn <em>dreams</em> into creative, accessible,<br class="quebra"> functional and strategic visual <span class="circulada">solutions' + circulo + '</span>!',
    marcas: 'Brands I have worked with',
    tSobre1: 'About', tSobre2: 'me', tProj1: 'Projects', tProj2: 'selected',
    tCurr1: 'Resume', tCurr2: 'journey', tRedes1: 'Social', tRedes2: 'media', tCont1: "Let's", tCont2: 'talk',
    sobreLead: 'Write an opening paragraph about yourself here: who you are, what you do and who you do it for.',
    sobreTexto: 'A second paragraph with more detail: how you work, what inspires you and the kind of projects you enjoy.',
    catIdentidade: 'Visual identity', catEditorial: 'Editorial', catProduto: 'Product design',
    experiencia: 'Experience', formacao: 'Education', ferramentas: 'Tools', hoje: 'now',
    cargo: 'Role', empresa: 'Company', curso: 'Degree', instituicao: 'School',
    contatoLead: 'Have a project in mind? Send me a message.',
    abrirMenu: 'Open menu', fecharMenu: 'Close menu',
    temaEscuro: 'Turn on dark mode', temaClaro: 'Turn on light mode',
    trocarIdioma: 'Switch language to Portuguese', siglaOutro: 'PT', tituloIdioma: 'Português', lang: 'en'
  }
};

var idioma = 'pt';
var btnIdioma = document.getElementById('btn-idioma');

function aplicarIdioma(novo) {
  idioma = novo;
  var t = textos[novo];
  document.documentElement.lang = t.lang;
  document.querySelectorAll('[data-i18n]').forEach(function (el) {
    var v = t[el.dataset.i18n]; if (v) el.textContent = v;
  });
  document.querySelectorAll('[data-i18n-html]').forEach(function (el) {
    var v = t[el.dataset.i18nHtml]; if (v) el.innerHTML = v;
  });
  document.querySelectorAll('[data-i18n-aria]').forEach(function (el) {
    var v = t[el.dataset.i18nAria]; if (v) el.setAttribute('aria-label', v);
  });
  document.getElementById('sigla-idioma').textContent = t.siglaOutro;
  btnIdioma.setAttribute('aria-label', t.trocarIdioma);
  btnIdioma.title = t.tituloIdioma;
  btnMenu.setAttribute('aria-label', menu.classList.contains('aberto') ? t.fecharMenu : t.abrirMenu);
  aplicarTema(document.body.classList.contains('escuro'));
}
btnIdioma.addEventListener('click', function () {
  var novo = idioma === 'pt' ? 'en' : 'pt';
  aplicarIdioma(novo);
  guardar('idioma', novo);
});

/* preferências salvas */
if (ler('idioma') === 'en') aplicarIdioma('en');
aplicarTema(ler('tema') === 'escuro');
