let currentPage = null;
let currentCss = null;

function unloadCurrentPage() {
  if (!currentPage) return;

  if (typeof currentPage.destroy === 'function') {
    currentPage.destroy();
  }

  document.getElementById('content').innerHTML = '';
  currentPage = null;
}

export async function loadPage(name) {
  unloadCurrentPage();

  const content = document.getElementById('content');

  const html = await fetch(`./${name}.html`).then(r => r.text());
  content.innerHTML = html;

   if (currentCss) currentCss.remove();
  currentCss = Object.assign(document.createElement('link'), {
    rel: 'stylesheet',
    href: `./${name}.css`
  });
  document.head.append(currentCss);

  const module = await import(`./${name}.js`);
  currentPage = module.init ? module.init() : module;
}
