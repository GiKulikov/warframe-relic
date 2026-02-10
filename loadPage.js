let currentPage = null;
let currentCss = null;
export const BASE = location.hostname.endsWith('github.io')
  ? '/' + location.pathname.split('/')[1] + '/'
  : '/';


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

  const html = await fetch(`${BASE}${name}.html`).then(r => r.text());
  content.innerHTML = html;

   if (currentCss) currentCss.remove();
  currentCss = Object.assign(document.createElement('link'), {
    rel: 'stylesheet',
    href: `${BASE}${name}.css`
  });
  document.head.append(currentCss);

  const module = await import(`${BASE}${name}.js`);
  currentPage = module.init ? module.init() : module;
}
