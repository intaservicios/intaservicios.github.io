document.addEventListener('DOMContentLoaded', () => {

    // === CARGA DINÁMICA DE ENCABEZADO Y PIE DE PÁGINA ===
    const loadHtml = async (file, selector) => {
        try {
            const response = await fetch(file);
            if (!response.ok) throw new Error(`No se pudo cargar ${file}`);
            const html = await response.text();
            document.querySelector(selector).innerHTML = html;

            // Lógica para ocultar los menús principales en páginas de detalle
            const pathname = window.location.pathname;
            if (pathname.includes('laboratorio_template.html') || pathname.includes('agencia_template.html')) {
                const navLinksToHide = document.querySelectorAll('.main-nav > ul > li');
                navLinksToHide.forEach(item => {
                    const linkText = item.querySelector('a').textContent.trim();
                    if (linkText === 'LABORATORIOS' || linkText === 'AGENCIAS DE EXTENSIÓN') {
                        item.style.display = 'none';
                    }
                });
            }

            setupAnchorLinks();
        } catch (error) {
            console.error(error);
        }
    };

    loadHtml('header.html', '#header-placeholder');
    loadHtml('footer.html', '#footer-placeholder');

    // === TRANSICIÓN SUAVE ENTRE PÁGINAS ===
    const setupAnchorLinks = () => {
        document.querySelectorAll('a').forEach(anchor => {
            const href = anchor.getAttribute('href');
            if (href && href !== '#' && href.indexOf('javascript:void(0)') === -1) {
                anchor.removeEventListener('click', handleLinkClick);
                anchor.addEventListener('click', handleLinkClick);
            }
        });
    };

    const handleLinkClick = function (e) {
        const href = this.getAttribute('href');
        if (href.startsWith('#')) return;
        e.preventDefault();
        document.body.classList.add('fade-out');
        document.body.addEventListener('animationend', () => {
            window.location.href = href;
        }, { once: true });
    };

    document.body.classList.add('loaded');
    setupAnchorLinks();

    // === OBTENER PARÁMETROS DE URL ===
    const getQueryParam = (param) => {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(param);
    };

    // === CARGA DE DATOS JSON ===
    const loadData = async (file) => {
        try {
            const response = await fetch(file);
            if (!response.ok) throw new Error(`No se pudo cargar el archivo ${file}`);
            return await response.json();
        } catch (error) {
            console.error(error);
            return null;
        }
    };

    // === RENDER DETALLES DE LABORATORIOS / AGENCIAS / SERVICIOS ===
    const loadServiceDetails = (item) => {
        const container = document.getElementById('lab-details-container');
        if (!container) return;
        container.innerHTML = '';

        const htmlContent = `
            <h2 class="section-title">${item.page_titulo || item.titulo}</h2>
            <p class="description">${item.page_descripcion || item.descripcion}</p>
            <div class="service-list">
                ${item.detalles.map(detail => {
                    const descripcion = Array.isArray(detail.descripcion) ?
                        `<ul>${detail.descripcion.map(descItem => `<li>${descItem}</li>`).join('')}</ul>` :
                        (detail.descripcion ? `<p>${detail.descripcion}</p>` : '');
                    const responsable = detail.responsable ? `<p class="detail-responsible"><strong>Responsable:</strong> ${detail.responsable}</p>` : '';
                    const contacto = detail.contacto ? `<p class="detail-contact"><strong>Contacto:</strong> ${detail.contacto}</p>` : '';

                    return `
                        <div class="service-item">
                            <div class="service-name">
                                <span>${detail.titulo}</span> <i class="fas fa-chevron-down"></i>
                            </div>
                            <div class="service-details">
                                ${descripcion}
                                ${responsable}
                                ${contacto}
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
        container.innerHTML = htmlContent;
        setupAccordionListeners();
    };

    const setupAccordionListeners = () => {
        document.querySelectorAll('.service-name').forEach(item => {
            item.addEventListener('click', () => {
                const details = item.nextElementSibling;
                const icon = item.querySelector('i');
                details.classList.toggle('active');
                icon.classList.toggle('active');
            });
        });
    };

    // === RENDER TARJETAS EN PÁGINA PRINCIPAL ===
    const renderCards = (items, tipo) => {
        const grid = document.getElementById('service-grid');
        if (!grid) return;
        grid.innerHTML = '';

        items.forEach(item => {
            const card = document.createElement('a');
            const hrefPage = 'laboratorio_template.html';
            card.href = `${hrefPage}?id=${item.id}&tipo=${tipo}`;
            card.className = 'card';
            card.innerHTML = `
                <img src="${item.imagen || ''}" alt="Ícono de ${item.titulo}">
                <h3>${item.titulo}</h3>
            `;
            grid.appendChild(card);
        });
    };

    // === INICIALIZACIÓN ===
    const init = async () => {
        let tipo = getQueryParam('tipo');
        if (!tipo) {
            const pathname = window.location.pathname;
            if (pathname.includes('laboratorio_template.html')) tipo = 'laboratorios';
            else if (pathname.includes('agencia_template.html')) tipo = 'agencias';
            else tipo = 'servicios';
        }

        const serviceId = getQueryParam('id');
        const containerDetalles = document.getElementById('lab-details-container');
        const grid = document.getElementById('service-grid');

        if (!serviceId && !grid) return;

        // Cargar todos los JSON necesarios
        const [laboratorios, agencias, servicios] = await Promise.all([
            loadData('laboratorios.json'),
            loadData('agencias.json'),
            loadData('servicios.json')
        ]);

        if (!laboratorios || !agencias || !servicios) {
            if (containerDetalles) containerDetalles.innerHTML = '<p>Error al cargar los datos. Intente más tarde.</p>';
            if (grid) grid.innerHTML = '<p>Error al cargar los datos. Intente más tarde.</p>';
            return;
        }

        // Si hay un ID: buscar en laboratorios, agencias y servicios
        if (serviceId && containerDetalles) {
            let item = laboratorios.find(i => i.id === serviceId);
            if (!item) item = agencias.find(i => i.id === serviceId);
            if (!item) item = servicios.find(i => i.id === serviceId);

            if (item) loadServiceDetails(item);
            else containerDetalles.innerHTML = '<p>Lo sentimos, no se encontró la información solicitada.</p>';
        }
        // Si estamos en la página principal: renderizar tarjetas
        else if (grid) {
            let itemsToRender = servicios;
            if (tipo === 'laboratorios') itemsToRender = laboratorios;
            if (tipo === 'agencias') itemsToRender = agencias;
            renderCards(itemsToRender, tipo);
        }
    };

    init();

    // === FIX: Manejar cuando el usuario vuelve atrás en el navegador ===
    window.addEventListener("pageshow", (event) => {
        if (event.persisted) { // si viene desde la caché
            document.body.classList.remove("fade-out");
            document.body.classList.add("loaded");
            init(); // volver a inicializar
        }
    });

});
