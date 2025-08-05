


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
   