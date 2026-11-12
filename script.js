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
  var contato = document.querySelector('.btn-contato');
  if (contato) contato.classList.toggle('ativo', nome === 'contato');
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
  var rolagem = nova.querySelector('[data-rolagem]');
  if (rolagem) rolagem.scrollTop = 0;

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

  setTimeout(function () { var alvo = nova.querySelector('[tabindex="-1"]'); if (alvo) alvo.focus({ preventScroll: true }); }, 300);
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
  if (modalAberto()) return fecharModalProjeto();
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

/* escolhe a versão de cada imagem conforme o idioma e o tema (data-src-pt, data-src-en-escuro…) */
function atualizarImagens() {
  var escuro = document.body.classList.contains('escuro');
  var lang = typeof idioma === 'string' ? idioma : 'pt';
  document.querySelectorAll('[data-src-pt]').forEach(function (el) {
    var nome = 'data-src-' + lang;
    if (escuro && el.hasAttribute(nome + '-escuro')) nome += '-escuro';
    var v = el.getAttribute(nome);
    if (v && el.getAttribute('src') !== v) el.setAttribute('src', v);
  });
}

function aplicarTema(escuro) {
  document.body.classList.toggle('escuro', escuro);
  atualizarImagens();
  document.querySelectorAll('[data-src-escuro]').forEach(function (img) {
    var v = img.getAttribute(escuro ? 'data-src-escuro' : 'data-src-claro');
    if (v && img.getAttribute('src') !== v) img.setAttribute('src', v);
  });
  var t = textos[idioma];
  btnTema.setAttribute('aria-label', escuro ? t.temaClaro : t.temaEscuro);
  btnTema.title = escuro ? t.temaClaro : t.temaEscuro;
  var mt = document.getElementById('menu-tema');
  if (mt) mt.textContent = escuro ? t.menuClaro : t.menuEscuro;
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
    projetosSub: 'Onde <em>ideias</em> se tornam <em>realidade</em>!',
    filtrarProjetos: 'Filtrar projetos', fTodos: 'Todos', fCapa: 'Capa', fDiagramacao: 'Diagramação',
    fIdentidade: 'Identidade visual', fEmbalagem: 'Embalagem',
    semProjetos: 'Ainda não tem projetos nesta categoria.',
    verBehance: 'Ver no Behance', fecharProjeto: 'Fechar projeto', abrirProjeto: 'Abrir no Behance (nova aba)',
    embedTexto: 'O projeto completo, com todas as imagens, está no Behance.',
    designerAlt: 'Designer gráfica, editorial, de identidade visual, de interface e de produto',
    altRetrato: 'Jessica de beca, sentada numa cadeira, segurando o canudo do diploma',
    altOla: 'Olá, eu sou a Jessica: designer, mestranda e pesquisadora',
    altMaisDoQue: 'Mais do que experiências, repertório para criar o novo',
    sobreP1: 'Sou <em>bacharel</em> em design pela Universidade Estadual de Maringá - <em>UEM</em>',
    capFormatura: 'Colação de grau', metaFormatura: 'Design | UEM',
    sobreP2: 'Durante a graduação, participei de diferentes iniciativas acadêmicas, como a <em>Carimba</em>, empresa júnior de design da UEM, onde atuei tanto como assessora quanto como gestora de projetos.',
    capFlorescer: 'Florescer - Noroeste Júnior', metaFlorescer: '2022 | Encontro de Empreendedorismo das Empresas Juniores do Noroeste do Paraná',
    capParana: 'Paraná Júnior', metaParana: '2022 | Encontro de Empreendedorismo das Empresas Juniores do Paraná',
    sobreP3: 'Paralelamente, participei da revista <em>ZigueZague</em>, vinculada aos cursos de Design e Moda da UEM, e do movimento estudantil. Também adquiri experiência profissional por meio de estágios na área de design, inicialmente na <em>NODA</em> e, posteriormente, em branding e social media, na <em>Amanda Tambara</em>.',
    sobreP4: 'Em 2022, fui <em>semifinalista</em> do <em>Concurso Talento Volkswagen Design</em>, na categoria <em>Color &amp; Trim</em>, experiência que também me proporcionou a oportunidade de conhecer a fábrica da Volkswagen, em São Bernardo do Campo (SP).',
    capVw1: 'Alunos semifinalistas da UEM e ex-alunos que atuavam como designers na Volkswagen',
    capVw2: 'Alunos da UEM semifinalistas', metaVw: '2022 | Concurso Talento Volkswagen Design',
    sobreP5: 'Atualmente, atuo como designer editorial na <em>Editora Viseu</em>, desenvolvendo capas, realizando a diagramação do conteúdo interno das obras, produzindo ilustrações e materiais complementares.',
    capViseu: 'Editora Viseu', metaViseuEquipe: '2025 | Equipe', metaViseuEu: '2026 | Eu',
    sobreP6: 'Paralelamente, curso o <em>Mestrado</em> em <em>Design e Interfaces</em> na <em>UEM</em>, sob orientação da Prof.ª Dr.ª Cláudia C. F. Monteiro. Minha pesquisa investiga a gamificação como interface cognitiva em ambientes educacionais digitais, com foco na autonomia e na fadiga dos usuários.',
    capMestrado: 'Apresentação final da disciplina - Mestrado',
    metaMestrado1: '2026 | Metodologia de Projeto de Pesquisa', metaMestrado2: '2026 | Design Centrado no Usuário',
    meEncontre: 'Me encontre nas redes',
    cvCargo: 'Designer Gráfico e Editorial · Branding e Identidade Visual · UX/UI Design', cvBaixar: 'Ver currículo em PDF', altCurriculo: 'Currículo de Jessica Souza', menuEscuro: 'Modo escuro', menuClaro: 'Modo claro', lattes: 'Currículo Lattes', verCertificado: 'Ver certificado', abrirImagem: 'Abrir em nova aba',
    servicos: 'Serviços', svCapas: 'Criação de capas', svCartazes: 'Cartazes e flyers', svLogotipos: 'Logotipos',
    svDiagramacao: 'Diagramação de livros, revistas e catálogos', svApresentacoes: 'Apresentações institucionais', svIdentidade: 'Identidade visual', vamosConversar: 'Vamos conversar?', cliqueCopiar: 'Clique para copiar!', copiado: 'Email copiado!',
    formTitulo: 'Ou escreva uma mensagem abaixo', nome: 'Nome', mensagem: 'Mensagem',
    phNome: 'Maria Santos', phMensagem: 'Escreva a sua mensagem aqui...',
    enviar: 'Enviar', enviando: 'Enviando...', enviado: 'Mensagem enviada! Obrigada, respondo em breve.',
    erroCampos: 'Preencha nome, um email válido e a mensagem.',
    erroEnvio: 'Não deu para enviar agora. Tente de novo ou mande para o email ao lado.',
    semChave: 'Formulário ainda sem chave da Web3Forms (veja o index.html).',
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
    projetosSub: 'Where <em>ideas</em> become <em>reality</em>!',
    filtrarProjetos: 'Filter projects', fTodos: 'All', fCapa: 'Cover', fDiagramacao: 'Typesetting',
    fIdentidade: 'Visual identity', fEmbalagem: 'Packaging',
    semProjetos: 'No projects in this category yet.',
    verBehance: 'View on Behance', fecharProjeto: 'Close project', abrirProjeto: 'Open on Behance (new tab)',
    embedTexto: 'The full project, with all the images, is on Behance.',
    designerAlt: 'Editorial, brand, graphic, UI/UX and product designer',
    altRetrato: 'Jessica in her graduation gown, sitting on a chair, holding her diploma',
    altOla: "Hello, I'm Jessica: designer, master's student and researcher",
    altMaisDoQue: 'More than experiences, a repertoire to create the new',
    sobreP1: "I hold a <em>bachelor's degree</em> in design from the State University of Maringá - <em>UEM</em>",
    capFormatura: 'Graduation ceremony', metaFormatura: 'Design | UEM',
    sobreP2: "During my degree, I took part in different academic initiatives, such as <em>Carimba</em>, UEM's junior design company, where I worked both as an advisor and as a project manager.",
    capFlorescer: 'Florescer - Noroeste Júnior', metaFlorescer: '2022 | Entrepreneurship Meeting of the Junior Companies of Northwest Paraná',
    capParana: 'Paraná Júnior', metaParana: '2022 | Entrepreneurship Meeting of the Junior Companies of Paraná',
    sobreP3: "At the same time, I took part in <em>ZigueZague</em> magazine, linked to UEM's Design and Fashion programs, and in the student movement. I also gained professional experience through design internships, first at <em>NODA</em> and later in branding and social media at <em>Amanda Tambara</em>.",
    sobreP4: 'In 2022, I was a <em>semifinalist</em> in the <em>Volkswagen Design Talent Contest</em>, in the <em>Color &amp; Trim</em> category, an experience that also gave me the chance to visit the Volkswagen factory in São Bernardo do Campo (SP).',
    capVw1: 'UEM semifinalists and alumni working as designers at Volkswagen',
    capVw2: 'UEM semifinalists', metaVw: '2022 | Volkswagen Design Talent Contest',
    sobreP5: "Today, I work as an editorial designer at <em>Editora Viseu</em>, designing covers, laying out the books' interior content, and producing illustrations and supporting materials.",
    capViseu: 'Editora Viseu', metaViseuEquipe: '2025 | Team', metaViseuEu: '2026 | Me',
    sobreP6: "In parallel, I'm pursuing a <em>Master's</em> in <em>Design and Interfaces</em> at <em>UEM</em>, advised by Prof. Dr. Cláudia C. F. Monteiro. My research investigates gamification as a cognitive interface in digital learning environments, focusing on users' autonomy and fatigue.",
    capMestrado: "Final course presentation - Master's",
    metaMestrado1: '2026 | Research Project Methodology', metaMestrado2: '2026 | User-Centered Design',
    meEncontre: 'Find me on social media',
    cvCargo: 'Graphic & Editorial Designer · Branding & Visual Identity · UX/UI Design', cvBaixar: 'View resume as PDF', altCurriculo: 'Resume of Jessica Souza', menuEscuro: 'Dark mode', menuClaro: 'Light mode', lattes: 'Lattes CV', verCertificado: 'View certificate', abrirImagem: 'Open in new tab',
    servicos: 'Services', svCapas: 'Book cover design', svCartazes: 'Posters and flyers', svLogotipos: 'Logos',
    svDiagramacao: 'Layout for books, magazines and catalogs', svApresentacoes: 'Corporate presentations', svIdentidade: 'Visual identity', vamosConversar: "Let's talk?", cliqueCopiar: 'Click to copy!', copiado: 'Email copied!',
    formTitulo: 'Or write a message below', nome: 'Name', mensagem: 'Message',
    phNome: 'Maria Santos', phMensagem: 'Write your message here...',
    enviar: 'Send', enviando: 'Sending...', enviado: "Message sent! Thank you, I'll reply soon.",
    erroCampos: 'Please fill in your name, a valid email and a message.',
    erroEnvio: "Couldn't send right now. Try again or write to the email on the left.",
    semChave: 'Form has no Web3Forms key yet (see index.html).',
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
  document.querySelectorAll('[data-i18n-ph]').forEach(function (el) {
    var v = t[el.dataset.i18nPh]; if (v) el.setAttribute('placeholder', v);
  });
  document.querySelectorAll('[data-i18n-alt]').forEach(function (el) {
    var v = t[el.dataset.i18nAlt]; if (v) el.setAttribute('alt', v);
  });
  atualizarImagens();
  if (typeof renderProjetos === 'function') renderProjetos();
  if (typeof renderCurriculo === 'function') renderCurriculo();
  document.getElementById('sigla-idioma').textContent = t.siglaOutro;
  btnIdioma.setAttribute('aria-label', t.trocarIdioma);
  btnIdioma.title = t.tituloIdioma;
  document.getElementById('menu-idioma').textContent = t.tituloIdioma;
  btnMenu.setAttribute('aria-label', menu.classList.contains('aberto') ? t.fecharMenu : t.abrirMenu);
  aplicarTema(document.body.classList.contains('escuro'));
}
btnIdioma.addEventListener('click', function () {
  var novo = idioma === 'pt' ? 'en' : 'pt';
  aplicarIdioma(novo);
  guardar('idioma', novo);
});

/* ================= PROJETOS ================= */
/*
  Para adicionar um projeto, copie um bloco abaixo.
  - id: o número do projeto no Behance (o que aparece no link do embed)
  - capa: imagem local opcional (ex.: 'imagens/projetos/gatose.webp').
          Se o arquivo não existir, o card mostra a prévia do próprio Behance.
  - imagens: lista opcional de imagens locais; se tiver, o modal mostra as
             imagens empilhadas (como no Behance) em vez do embed.
*/
var projetos = [
  { id: '240092893', slug: 'Typesetting-Spring-Blossom-Editora-Viseu', categoria: 'diagramacao', capa: 'imagens/projetos/spring-blossom.webp', imagens: [],
    titulo: { pt: 'Diagramação “Spring Blossom”', en: 'Typesetting “Spring Blossom”' }, meta: '2025 | Editora Viseu' },
  { id: '240026291', slug: 'Book-cover-Gatose-Editora-Viseu', categoria: 'capa', capa: 'imagens/projetos/gatose.webp', imagens: [],
    titulo: { pt: 'Capa “Gatose”', en: 'Book cover “Gatose”' }, meta: '2025 | Editora Viseu' },
  { id: '238470329', slug: 'Book-cover-Antidotos-Editora-Viseu', categoria: 'capa', capa: 'imagens/projetos/antidotos.webp', imagens: [],
    titulo: { pt: 'Capa “Antídotos”', en: 'Book cover “Antídotos”' }, meta: '2025 | Editora Viseu' },
  { id: '237404435', slug: 'Book-cover-Amendoim-de-ouro-Editora-Viseu', categoria: 'capa', capa: 'imagens/projetos/amendoim-de-ouro.webp', imagens: [],
    titulo: { pt: 'Capa “Amendoim de ouro”', en: 'Book cover “Amendoim de ouro”' }, meta: 'Editora Viseu' },
  { id: '154465365', slug: 'IDV-Engenium', categoria: 'identidade', capa: 'imagens/projetos/engenium.webp', imagens: [],
    titulo: { pt: 'Identidade visual “Engenium”', en: 'Visual identity “Engenium”' }, meta: 'Engenium' },
  { id: '142513155', slug: 'Identidade-Visual-Attini-Cross', categoria: 'identidade', capa: 'imagens/projetos/attini-cross.webp', imagens: [],
    titulo: { pt: 'Identidade visual “Attini Cross”', en: 'Visual identity “Attini Cross”' }, meta: 'Attini Cross' },
  { id: '142513831', slug: 'IDV-Shop-Maais', categoria: 'identidade', capa: 'imagens/projetos/shop-maais.webp', imagens: [],
    titulo: { pt: 'Identidade visual “Shop Maais”', en: 'Visual identity “Shop Maais”' }, meta: 'Shop Maais' },
  { id: '133408155', slug: 'Identidade-Visual-Luigi-Di-Martino', categoria: 'identidade', capa: 'imagens/projetos/luigi-di-martino.webp', imagens: [],
    titulo: { pt: 'Identidade visual “Luigi Di Martino”', en: 'Visual identity “Luigi Di Martino”' }, meta: 'Luigi Di Martino' },
  { id: '133229689', slug: 'Identidade-Visual-CicloScience', categoria: 'identidade', capa: 'imagens/projetos/cicloscience.webp', imagens: [],
    titulo: { pt: 'Identidade visual “CicloScience”', en: 'Visual identity “CicloScience”' }, meta: 'CicloScience' },
  { id: '133403151', slug: 'Identidade-Visual-Nucleo-Noroeste', categoria: 'identidade', capa: 'imagens/projetos/nucleo-noroeste.webp', imagens: [],
    titulo: { pt: 'Identidade visual “Núcleo Noroeste”', en: 'Visual identity “Núcleo Noroeste”' }, meta: 'Núcleo Noroeste' },
  { id: '124418863', slug: 'Identidade-Visual-GECor', categoria: 'identidade', capa: 'imagens/projetos/gecor.webp', imagens: [],
    titulo: { pt: 'Identidade visual “GECor”', en: 'Visual identity “GECor”' }, meta: 'GECor' },
  { id: '184099129', slug: 'Embalagem-Sitio-Eliza-Cafes-Especiais', categoria: 'embalagem', capa: 'imagens/projetos/sitio-eliza.webp', imagens: [],
    titulo: { pt: 'Embalagem “Sítio Eliza Cafés Especiais”', en: 'Packaging “Sítio Eliza Cafés Especiais”' }, meta: 'Sítio Eliza Cafés Especiais' }
];

var filtroAtual = 'todos';
var gradeProjetos = document.getElementById('grade-projetos');
var semProjetos = document.getElementById('sem-projetos');

function urlEmbed(id) { return 'https://www.behance.net/embed/project/' + id + '?ilo0=1'; }
/* o Behance precisa do nome do projeto depois do número (gallery/ID/Nome) */
function urlBehance(id, slug) { return 'https://www.behance.net/gallery/' + id + '/' + (slug || 'projeto'); }

function iframeBehance(id, titulo) {
  var f = document.createElement('iframe');
  f.src = urlEmbed(id);
  f.title = titulo;
  f.loading = 'lazy';
  f.setAttribute('allow', 'clipboard-write');
  f.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
  f.setAttribute('allowfullscreen', '');
  f.setAttribute('scrolling', 'no'); // sem barra de rolagem dentro do embed
  return f;
}

/* o embed do Behance tem 404x316: desenha nesse tamanho e amplia até preencher o card */
var escalaCapas = window.ResizeObserver ? new ResizeObserver(function (itens) {
  itens.forEach(function (it) {
    it.target.style.setProperty('--escala', it.contentRect.width / 404);
  });
}) : null;

function renderProjetos() {
  if (!gradeProjetos) return;
  gradeProjetos.innerHTML = '';
  projetos.forEach(function (p, i) {
    var titulo = p.titulo[idioma] || p.titulo.pt;
    // o card abre o projeto direto no Behance, em uma nova aba
    var card = document.createElement('a');
    card.href = urlBehance(p.id, p.slug);
    card.target = '_blank';
    card.rel = 'noopener';
    card.className = 'projeto';
    card.dataset.categoria = p.categoria;
    card.dataset.indice = i;
    card.setAttribute('aria-label', textos[idioma].abrirProjeto + ': ' + titulo);

    var capa = document.createElement('div');
    capa.className = 'projeto-capa';
    var img = document.createElement('img');
    img.alt = '';
    img.loading = 'lazy';
    img.onerror = function () {
      capa.replaceChild(iframeBehance(p.id, titulo), img);
      capa.classList.add('com-embed');
      if (escalaCapas) escalaCapas.observe(capa);
    };
    img.src = p.capa || '';
    if (!p.capa) img.onerror();
    capa.appendChild(img);

    var h = document.createElement('h3'); h.textContent = titulo;
    var m = document.createElement('p'); m.textContent = p.meta || '';
    card.appendChild(capa); card.appendChild(h); card.appendChild(m);
    gradeProjetos.appendChild(card);
  });
  aplicarFiltro(filtroAtual);
}

function aplicarFiltro(filtro) {
  filtroAtual = filtro;
  var visiveis = 0;
  document.querySelectorAll('.filtro').forEach(function (b) {
    var ativo = b.dataset.filtro === filtro;
    b.classList.toggle('ativo', ativo);
    b.setAttribute('aria-pressed', ativo ? 'true' : 'false');
  });
  if (!gradeProjetos) return;
  gradeProjetos.querySelectorAll('.projeto').forEach(function (c) {
    var mostra = filtro === 'todos' || c.dataset.categoria === filtro;
    c.hidden = !mostra;
    if (mostra) visiveis++;
  });
  semProjetos.hidden = visiveis > 0;
}

document.querySelectorAll('.filtro').forEach(function (b) {
  b.addEventListener('click', function () { aplicarFiltro(b.dataset.filtro); });
});

/* ----- Modal do projeto ----- */
var pmodal = document.getElementById('pmodal');
var pmodalCorpo = document.getElementById('pmodal-corpo');
var origemModal = null;

function modalAberto() { return pmodal && !pmodal.hidden && !pmodal.classList.contains('fechando'); }

function abrirModalProjeto(i, origem) {
  var p = projetos[i];
  var titulo = p.titulo[idioma] || p.titulo.pt;
  origemModal = origem || null;
  document.getElementById('pmodal-titulo').textContent = titulo;
  document.getElementById('pmodal-meta').textContent = p.meta || '';
  document.getElementById('pmodal-behance').href = urlBehance(p.id, p.slug);
  document.querySelector('#pmodal-behance span').textContent = textos[idioma].verBehance;

  pmodalCorpo.innerHTML = '';
  if (p.imagens && p.imagens.length) {
    var pilha = document.createElement('div');
    pilha.className = 'pmodal-imagens';
    p.imagens.forEach(function (src) {
      var img = document.createElement('img');
      img.src = src; img.alt = titulo; img.loading = 'lazy';
      pilha.appendChild(img);
    });
    pmodalCorpo.appendChild(pilha);
  } else {
    var bloco = document.createElement('div');
    bloco.className = 'pmodal-embed';
    bloco.appendChild(iframeBehance(p.id, titulo));
    var txt = document.createElement('p');
    txt.textContent = textos[idioma].embedTexto;
    bloco.appendChild(txt);
    pmodalCorpo.appendChild(bloco);
  }
  pmodalCorpo.scrollTop = 0;

  pmodal.classList.remove('fechando');
  pmodal.hidden = false;
  document.body.classList.add('modal-aberto');
  setTimeout(function () { pmodal.querySelector('.pmodal-painel').focus({ preventScroll: true }); }, 50);
}

function fecharModalProjeto() {
  if (!modalAberto()) return;
  pmodal.classList.add('fechando');
  var tempo = semMovimento.matches ? 1 : 300;
  setTimeout(function () {
    if (!pmodal.classList.contains('fechando')) return;
    pmodal.hidden = true;
    pmodal.classList.remove('fechando');
    pmodalCorpo.innerHTML = ''; // para de carregar o embed
    document.body.classList.remove('modal-aberto');
    if (origemModal) origemModal.focus({ preventScroll: true });
  }, tempo);
}

if (pmodal) {
  pmodal.querySelectorAll('[data-fechar-modal]').forEach(function (el) {
    el.addEventListener('click', fecharModalProjeto);
  });
}

renderProjetos();

/* ================= SOBRE: blocos aparecem ao rolar ================= */
(function () {
  var blocos = document.querySelectorAll('.revela');
  if (!blocos.length) return;
  if (semMovimento.matches || !('IntersectionObserver' in window)) {
    blocos.forEach(function (b) { b.classList.add('visivel'); });
    return;
  }
  var raiz = document.querySelector('.sobre-miolo');
  var obs = new IntersectionObserver(function (itens) {
    itens.forEach(function (it) {
      if (it.isIntersecting) { it.target.classList.add('visivel'); obs.unobserve(it.target); }
    });
  }, { root: raiz, threshold: 0.12 });
  blocos.forEach(function (b) { obs.observe(b); });
})();

/* ================= CURRÍCULO ================= */
/* Conteúdo do currículo (PDF de novembro/2026). Para editar, mude os textos abaixo. */
var curriculo = {
  pt: {
    resumo: 'Designer gráfico, bacharel em Design pela Universidade Estadual de Maringá (UEM), com experiência em design editorial, diagramação, criação de capas, ilustração, identidade visual e branding. Atua como designer gráfico na Editora Viseu, desenvolvendo projetos gráficos de livros, fechamento de arquivos para impressão e materiais de divulgação para lançamentos. Experiência anterior em estágios de branding e design gráfico, com criação de logotipos, layouts de sites e conteúdo para redes sociais, além de liderança de equipes em empresa júnior. Mestranda em Design e Interfaces (UEM) e em formação contínua em UX/UI Design.',
    titulos: { exp: 'experiência profissional', acad: 'experiência acadêmica', form: 'formação', comp: 'competências', idiomas: 'idiomas', cert: 'certificações e cursos', areas: 'Áreas', ferramentas: 'Ferramentas' },
    experiencia: [
      { cargo: 'Designer Gráfico', local: 'Editora Viseu', data: 'Julho de 2024 – Atual', atual: true, itens: [
        'Diagramação e projeto gráfico de livros no Adobe InDesign, garantindo consistência tipográfica e padrão editorial.',
        'Criação de capas, ilustrações, tabelas e elementos gráficos alinhados ao gênero e ao público de cada obra.',
        'Tratamento e edição de imagens no Adobe Photoshop.',
        'Preparação e fechamento de arquivos para impressão gráfica (pré-impressão).',
        'Materiais complementares e de divulgação, como marca-páginas, vídeos promocionais e artes para lançamentos e redes sociais.' ] },
      { cargo: 'Estagiária de Branding', local: 'Amanda Tambara', data: 'Fevereiro de 2024 – Maio de 2024', itens: [
        'Criação de artes gráficas e edição de vídeos para redes sociais de contas empresariais.',
        'Aplicação do planejamento de DNA de marca e identidade visual na produção de conteúdo, garantindo consistência entre os canais.' ] },
      { cargo: 'Estagiária de Design Gráfico', local: 'E Noda Ltda.', data: 'Dezembro de 2023 – Fevereiro de 2024', itens: [
        'Layout de site (web design), logotipo e ilustrações para a marca.' ] },
      { cargo: 'Diretora de Projetos', local: 'Carimba Design (Empresa Júnior de Design da UEM)', data: 'Março de 2022 – Setembro de 2022', itens: [
        'Coordenação de equipes de design na execução de projetos para clientes reais.',
        'Identidades visuais, materiais gráficos de branding, design de embalagens e projeto de design editorial.' ] },
      { cargo: 'Assessora de Projetos', local: 'Carimba Design (Empresa Júnior de Design da UEM)', data: 'Abril de 2021 – Março de 2022', itens: [
        'Identidades visuais, naming e materiais gráficos para branding de clientes.' ] }
    ],
    academica: [
      { cargo: 'Administração de Cadastros', local: 'Revista Ziguezague · Design & Moda UEM', data: 'Abril de 2023 – Novembro de 2023', itens: [ 'Gestão de dados dos membros da equipe.' ] },
      { cargo: 'Assessora de Redação', local: 'Revista Ziguezague · Design & Moda UEM', data: 'Dezembro de 2022 – Março de 2023', itens: [ 'Produção de conteúdo publicitário, copywriting, revisão e aprimoramento de textos.' ] },
      { cargo: 'Assessora de Marketing', local: 'Revista Ziguezague · Design & Moda UEM', data: 'Fevereiro de 2022 – Novembro de 2022', itens: [ 'Pesquisa de tendências de design e moda.' ] }
    ],
    formacao: [
      { t: 'Mestrado em Design e Interfaces', s: 'UEM · Março de 2026 – Atual' },
      { t: 'Bacharelado em Design', s: 'UEM · Agosto de 2020 – Maio de 2024' }
    ],
    areas: ['Design Gráfico', 'Design Editorial', 'Diagramação', 'Projeto Gráfico', 'Criação de Capas', 'Ilustração', 'Identidade Visual', 'Branding', 'Criação de Logotipo', 'Naming', 'Design de Embalagens', 'Tipografia', 'Tratamento de Imagens', 'Pré-impressão', 'Social Media', 'Edição de Vídeo', 'Motion Design', 'Web Design', 'UX/UI Design', 'Prototipação', 'Gestão de Equipes'],
    idiomas: [ { t: 'Português', s: 'Nativo' }, { t: 'Inglês', s: 'Intermediário (B1)' } ],
    cert: [
      { t: 'Certificado de Proficiência em Inglês', s: 'Duolingo English Test · Intermediário (B1) · 2026', img: 'imagens/certificados/duolingo-ingles.webp' },
      { t: 'Workshop UX/UI Design: será que é pra mim?', s: 'EBAC · 4 horas · 2026', img: 'imagens/certificados/ebac-ux-ui.webp' },
      { t: 'Resiliência', s: 'Fundação Bradesco – Escola Virtual · 4 horas · 2025', img: 'imagens/certificados/bradesco-resiliencia.webp' },
      { t: 'Produção e Edição de Vídeo pelo Celular', s: 'Enap – Escola Nacional de Administração Pública · 20 horas · 2025', img: 'imagens/certificados/enap-video.webp' },
      { t: 'Cursos de UX/UI Design', s: 'Udemy · em andamento' }
    ]
  },
  en: {
    resumo: "Graphic designer with a bachelor's degree in Design from the State University of Maringá (UEM), experienced in editorial design, layout, book covers, illustration, visual identity and branding. Works as a graphic designer at Editora Viseu, creating book designs, preparing print-ready files and producing promotional materials for book launches. Previous internships in branding and graphic design, creating logos, website layouts and social media content, plus team leadership at a junior company. Master's student in Design and Interfaces (UEM), continuously studying UX/UI Design.",
    titulos: { exp: 'work experience', acad: 'academic experience', form: 'education', comp: 'skills', idiomas: 'languages', cert: 'certificates and courses', areas: 'Areas', ferramentas: 'Tools' },
    experiencia: [
      { cargo: 'Graphic Designer', local: 'Editora Viseu', data: 'July 2024 – Present', atual: true, itens: [
        'Book layout and graphic design in Adobe InDesign, ensuring typographic consistency and editorial standards.',
        'Covers, illustrations, tables and graphic elements tailored to each book’s genre and audience.',
        'Image editing and retouching in Adobe Photoshop.',
        'Preparing and finalizing print-ready files (prepress).',
        'Supporting and promotional materials such as bookmarks, promo videos and artwork for launches and social media.' ] },
      { cargo: 'Branding Intern', local: 'Amanda Tambara', data: 'February 2024 – May 2024', itens: [
        'Graphic artwork and video editing for business social media accounts.',
        'Applied brand DNA and visual identity planning to content production, keeping channels consistent.' ] },
      { cargo: 'Graphic Design Intern', local: 'E Noda Ltda.', data: 'December 2023 – February 2024', itens: [
        'Website layout (web design), logo and illustrations for the brand.' ] },
      { cargo: 'Project Director', local: 'Carimba Design (UEM Junior Design Company)', data: 'March 2022 – September 2022', itens: [
        'Led design teams delivering projects for real clients.',
        'Visual identities, branding materials, packaging design and an editorial design project.' ] },
      { cargo: 'Project Advisor', local: 'Carimba Design (UEM Junior Design Company)', data: 'April 2021 – March 2022', itens: [
        'Visual identities, naming and branding materials for clients.' ] }
    ],
    academica: [
      { cargo: 'Membership Administration', local: 'Ziguezague Magazine · UEM Design & Fashion', data: 'April 2023 – November 2023', itens: [ 'Managed team members’ records.' ] },
      { cargo: 'Editorial Assistant', local: 'Ziguezague Magazine · UEM Design & Fashion', data: 'December 2022 – March 2023', itens: [ 'Advertising content, copywriting, proofreading and text editing.' ] },
      { cargo: 'Marketing Assistant', local: 'Ziguezague Magazine · UEM Design & Fashion', data: 'February 2022 – November 2022', itens: [ 'Research on design and fashion trends.' ] }
    ],
    formacao: [
      { t: "Master's in Design and Interfaces", s: 'UEM · March 2026 – Present' },
      { t: "Bachelor's in Design", s: 'UEM · August 2020 – May 2024' }
    ],
    areas: ['Graphic Design', 'Editorial Design', 'Layout', 'Book Design', 'Book Covers', 'Illustration', 'Visual Identity', 'Branding', 'Logo Design', 'Naming', 'Packaging Design', 'Typography', 'Image Editing', 'Prepress', 'Social Media', 'Video Editing', 'Motion Design', 'Web Design', 'UX/UI Design', 'Prototyping', 'Team Management'],
    idiomas: [ { t: 'Portuguese', s: 'Native' }, { t: 'English', s: 'Intermediate (B1)' } ],
    cert: [
      { t: 'English Proficiency Certificate', s: 'Duolingo English Test · Intermediate (B1) · 2026', img: 'imagens/certificados/duolingo-ingles.webp' },
      { t: 'Workshop “UX/UI Design: is it for me?”', s: 'EBAC · 4 hours · 2026', img: 'imagens/certificados/ebac-ux-ui.webp' },
      { t: 'Resilience', s: 'Fundação Bradesco – Escola Virtual · 4 hours · 2025', img: 'imagens/certificados/bradesco-resiliencia.webp' },
      { t: 'Video Production and Editing on Mobile', s: 'Enap – Brazilian National School of Public Administration · 20 hours · 2025', img: 'imagens/certificados/enap-video.webp' },
      { t: 'UX/UI Design courses', s: 'Udemy · in progress' }
    ]
  }
};
var ferramentasCv = ['Adobe Illustrator', 'Adobe InDesign', 'Adobe Photoshop', 'Adobe Premiere Pro', 'Adobe After Effects', 'Figma'];

function esc(t) { var d = document.createElement('div'); d.textContent = t; return d.innerHTML; }

function renderCurriculo() {
  var alvo = document.getElementById('cv-conteudo');
  if (!alvo) return;
  var c = curriculo[idioma] || curriculo.pt, T = c.titulos;
  function tempo(lista) {
    return '<ol class="cv-tempo">' + lista.map(function (e) {
      return '<li class="cv-item' + (e.atual ? ' atual' : '') + '"><p class="cv-data">' + esc(e.data) + '</p>' +
        '<h4>' + esc(e.cargo) + '</h4><p class="cv-local-item">' + esc(e.local) + '</p>' +
        '<ul>' + e.itens.map(function (i) { return '<li>' + esc(i) + '</li>'; }).join('') + '</ul></li>';
    }).join('') + '</ol>';
  }
  function lista(l, grupo) {
    return '<ul class="cv-lista">' + l.map(function (x, i) {
      var miolo = '<strong>' + esc(x.t) + '</strong><span>' + esc(x.s) + '</span>';
      if (!x.img && grupo === 'cert') return '<li><div class="cv-cert cv-cert-sem"><span class="cv-cert-texto">' + miolo + '</span></div></li>';
      if (!x.img) return '<li>' + miolo + '</li>';
      return '<li><button type="button" class="cv-cert" data-i="' + i + '">' +
        '<span class="cv-cert-texto">' + miolo + '</span>' +
        '<span class="cv-cert-ver">' + esc(textos[idioma].verCertificado) + '</span></button></li>';
    }).join('') + '</ul>';
  }
  function tags(l, cls) { return '<ul class="cv-tags' + (cls ? ' ' + cls : '') + '">' + l.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>'; }
  alvo.innerHTML =
    '<p class="cv-resumo">' + esc(c.resumo) + '</p>' +
    '<div class="cv-grade">' +
      '<div>' +
        '<section class="cv-secao"><h3>' + T.exp + '</h3>' + tempo(c.experiencia) + '</section>' +
        '<section class="cv-secao"><h3>' + T.acad + '</h3>' + tempo(c.academica) + '</section>' +
      '</div>' +
      '<aside>' +
        '<section class="cv-secao"><h3>' + T.form + '</h3>' + lista(c.formacao) + '</section>' +
        '<section class="cv-secao"><h3>' + T.comp + '</h3><p class="cv-sub">' + T.ferramentas + '</p>' + tags(ferramentasCv, 'cheias') +
          '<p class="cv-sub">' + T.areas + '</p>' + tags(c.areas) + '</section>' +
        '<section class="cv-secao"><h3>' + T.idiomas + '</h3>' + lista(c.idiomas) + '</section>' +
        '<section class="cv-secao"><h3>' + T.cert + '</h3>' + lista(c.cert, 'cert') + '</section>' +
      '</aside>' +
    '</div>';
  alvo.querySelectorAll('.cv-cert').forEach(function (b) {
    b.addEventListener('click', function () { abrirModalImagem(c.cert[+b.dataset.i], b); });
  });
}

/* modal com a imagem do certificado (reaproveita o modal dos projetos) */
function abrirModalImagem(item, origem) {
  origemModal = origem || null;
  document.getElementById('pmodal-titulo').textContent = item.t;
  document.getElementById('pmodal-meta').textContent = item.s;
  var link = document.getElementById('pmodal-behance');
  link.href = item.img;
  link.querySelector('span').textContent = textos[idioma].abrirImagem;
  pmodalCorpo.innerHTML = '';
  var bloco = document.createElement('div');
  bloco.className = 'pmodal-certificado';
  var img = document.createElement('img');
  img.src = item.img; img.alt = item.t;
  bloco.appendChild(img);
  pmodalCorpo.appendChild(bloco);
  pmodalCorpo.scrollTop = 0;
  pmodal.classList.remove('fechando');
  pmodal.hidden = false;
  document.body.classList.add('modal-aberto');
  setTimeout(function () { pmodal.querySelector('.pmodal-painel').focus({ preventScroll: true }); }, 50);
}
renderCurriculo();

/* ================= FALE COMIGO ================= */
/* Copiar email */
var btnCopiar = document.getElementById('copiar-email');
var avisoCopiar = document.getElementById('copiar-aviso');
var timerCopiar;

function copiarTexto(texto) {
  if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(texto);
  return new Promise(function (ok, falha) {
    var area = document.createElement('textarea');
    area.value = texto; area.setAttribute('readonly', '');
    area.style.position = 'fixed'; area.style.opacity = '0';
    document.body.appendChild(area); area.select();
    try { document.execCommand('copy') ? ok() : falha(); } catch (e) { falha(e); }
    document.body.removeChild(area);
  });
}

if (btnCopiar) {
  btnCopiar.addEventListener('click', function () {
    copiarTexto(btnCopiar.dataset.email).then(function () {
      avisoCopiar.textContent = textos[idioma].copiado;
      avisoCopiar.classList.add('ok');
      clearTimeout(timerCopiar);
      timerCopiar = setTimeout(function () {
        avisoCopiar.textContent = textos[idioma].cliqueCopiar;
        avisoCopiar.classList.remove('ok');
      }, 2200);
    }, function () {
      window.location.href = 'mailto:' + btnCopiar.dataset.email;
    });
  });
}

/* Enviar formulário pela Web3Forms */
var form = document.getElementById('form-contato');
var statusForm = document.getElementById('form-status');
var btnEnviar = document.getElementById('btn-enviar');

function mostrarStatus(chave, tipo) {
  statusForm.textContent = textos[idioma][chave];
  statusForm.className = 'form-status' + (tipo ? ' ' + tipo : '');
}

if (form) {
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var campos = form.querySelectorAll('[required]');
    var valido = true;
    campos.forEach(function (c) {
      var ok = c.value.trim() !== '' && (c.type !== 'email' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.value.trim()));
      c.classList.toggle('erro', !ok);
      if (!ok) valido = false;
    });
    if (!valido) return mostrarStatus('erroCampos', 'falha');

    var dados = new FormData(form);
    if (dados.get('botcheck')) return; // robô
    if (!dados.get('access_key') || dados.get('access_key') === 'COLE_SUA_CHAVE_AQUI') {
      return mostrarStatus('semChave', 'falha');
    }

    btnEnviar.disabled = true;
    btnEnviar.textContent = textos[idioma].enviando;
    statusForm.textContent = '';

    fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(Object.fromEntries(dados))
    })
      .then(function (r) { return r.json(); })
      .then(function (res) {
        if (res.success) { form.reset(); mostrarStatus('enviado', 'ok'); }
        else mostrarStatus('erroEnvio', 'falha');
      })
      .catch(function () { mostrarStatus('erroEnvio', 'falha'); })
      .then(function () {
        btnEnviar.disabled = false;
        btnEnviar.textContent = textos[idioma].enviar;
      });
  });

  form.querySelectorAll('[required]').forEach(function (c) {
    c.addEventListener('input', function () { c.classList.remove('erro'); });
  });
}

/* idioma e tema também no menu do celular */
document.getElementById('menu-idioma').addEventListener('click', function () { btnIdioma.click(); });
document.getElementById('menu-tema').addEventListener('click', function () { btnTema.click(); });

/* preferências salvas */
if (ler('idioma') === 'en') aplicarIdioma('en');
aplicarTema(ler('tema') === 'escuro');
