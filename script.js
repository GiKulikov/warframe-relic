
const combobox = document.querySelector('.combobox');
const toggleBtn = combobox.querySelector('.combobox-toggle');
const dropdown = combobox.querySelector('.dropdown');

toggleBtn.addEventListener('click', (e) => {
  e.preventDefault();
  combobox.classList.toggle('open');
  toggleBtn.classList.toggle('active');
});

dropdown.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault();
    const selectedText = link.textContent.trim();
    // Обновляем текст кнопки, оставляя стрелку
    toggleBtn.innerHTML = `${selectedText} <span class="arrow">▼</span>`;
    // Закрываем список
    combobox.classList.remove('open');
    toggleBtn.classList.remove('active');

    
  });
});
function resetCombobox() {
  const toggleBtn = document.querySelector('.combobox-toggle');
  toggleBtn.innerHTML = `Информация о <span class="arrow">▼</span>`;
}

// Закрыть combobox, 

document.addEventListener('click', (e) => {
  if (!combobox.contains(e.target)) {
    combobox.classList.remove('open');
    toggleBtn.classList.remove('active');
  }
});




//iframe loading function
function loadIframe(url) {
      const frame = document.getElementById("pageFrame");
      
      frame.src = url;
    }
    const iframe = document.getElementById('pageFrame');
    const header = document.querySelector('header'); 

    function updateIframeHeight() {
      const headerHeight = header.offsetHeight;
      iframe.style.height = `calc(100vh - ${headerHeight}px)`;
      iframe.style.width = '100%'; 
    }


    updateIframeHeight();
   