/* ================= PÁGINAS (círculo a partir do clique) ================= */
var paginaAtual = null;   // id da página aberta, ou null no início
var camada = 100;         // z-index: cada página nova abre por cima da anterior
var duracao = 900;

function pontoDoClique(e, el) {
  var r = el.getBoundingClientRect();
  return {
    x: e && e.clientX ? e.clientX : r.left + r.width / 2,
    y: e && e.clientY ? e.clientY : r.top + r.height / 2
  };
}

function marcarAtivo(nome) {
  document.querySelectorAll('.menu-link').forEach(function (l) {
    var ativo = l.dataset.pagina === nome;
    l.classList.toggle('ativo', ativo);
    if (ativo) l.setAttribute('aria-current', 'page'); else l.removeAttribute('aria-current');
  });
}

function abrirPagina(nome, p) {
  if (nome === 'inicio') return voltarAoInicio(p);
  if (nome === paginaAtual) return;

  var nova = document.getElementById('pagina-' + nome);
  if (!nova) return;
  var anterior = paginaAtual ? document.getElementById('pagina-' + paginaAtual) : null;

  nova.classList.remove('sem-transicao');
  nova.style.zIndex = ++camada;
  nova.style.setProperty('--x', p.x + 'px');
  nova.style.setProperty('--y', p.y + 'px');
  nova.inert = false;
  // força o navegador a registrar o círculo fechado antes de abrir
  void nova.offsetWidth;
  nova.classList.add('aberta');

  document.body.classList.add('em-pagina');
  paginaAtual = nome;
  marcarAtivo(nome);

  // a página antiga some por baixo, depois que a nova cobriu a tela
  if (anterior) {
    setTimeout(function () {
      if (paginaAtual === nome) {
        anterior.classList.add('sem-transicao');
        anterior.classList.remove('aberta');
        anterior.inert = true;
      }
    }, duracao);
  }

  setTimeout(function () { nova.querySelector('.pagina-titulo').focus({ preventScroll: true }); }, 300);
}

function voltarAoInicio(p) {
  if (!paginaAtual) return;
  var atual = document.getElementById('pagina-' + paginaAtual);
  atual.classList.remove('sem-transicao');
  if (p) {
    atual.style.setProperty('--x', p.x + 'px');
    atual.style.setProperty('--y', p.y + 'px');
  }
  atual.classList.remove('aberta');
  atual.inert = true;
  paginaAtual = null;
  document.body.classList.remove('em-pagina');
  marcarAtivo('inicio');
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

function abrirMenu() {
  var r = btnMenu.getBoundingClientRect();
  menu.style.setProperty('--x', (r.left + r.width / 2) + 'px');
  menu.style.setProperty('--y', (r.top + r.height / 2) + 'px');
  menu.inert = false;
  menu.classList.add('aberto');
  document.body.classList.add('menu-aberto');
  btnMenu.setAttribute('aria-expanded', 'true');
  btnMenu.setAttribute('aria-label', textos[idioma].fecharMenu);
}
function fecharMenu() {
  menu.classList.remove('aberto');
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
var circulo = '<svg viewBox="0 0 120 44" preserveAspectRatio="none" aria-hidden="true"><path d="M8 26C6 12 40 4 70 5s46 9 44 19-30 16-60 15S5 34 12 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';

var textos = {
  pt: {
    inicio: 'Início', sobre: 'Sobre', projetos: 'Projetos', curriculo: 'Currículo', redes: 'Redes Sociais',
    faleComigo: 'Fale comigo', ola: 'Olá, eu sou a Jessica',
    frase: 'Transformo <em>sonhos</em> em <span class="circulada">soluções' + circulo + '</span> visuais criativas, acessíveis, funcionais e estratégicas!',
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
    frase: 'I turn <em>dreams</em> into creative, accessible, functional and strategic visual <span class="circulada">solutions' + circulo + '</span>!',
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
