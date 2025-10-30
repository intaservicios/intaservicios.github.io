document.addEventListener('DOMContentLoaded', () => {

    // === CARGA DINÁMICA DE ENCABEZADO Y PIE DE PÁGINA ===
    const loadHtml = async (file, selector) => {
        try {
            const response = await fetch(file);
            if (!response.ok) throw new Error(`No se pudo cargar ${file}`);
            const html = await response.text();
            document.querySelector(selector).innerHTML = html;

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

    const setupAnchorLinks = () => {
        document.querySelectorAll('a').forEach(anchor => {
            const href = anchor.getAttribute('href');
            if (href && href.startsWith('mailto:')) return;
            if (href && href !== '#' && href.indexOf('javascript:void(0)') === -1) {
                anchor.removeEventListener('click', handleLinkClick);
                anchor.addEventListener('click', handleLinkClick);
            }
        });
    };

    const handleLinkClick = function (e) {
        const href = this.getAttribute('href');
        if (!href || href.startsWith('#') || href.startsWith('http') || href.startsWith('mailto:')) return;
        e.preventDefault();
        document.body.classList.add('fade-out');
        document.body.addEventListener('animationend', () => {
            location.assign(href);
        }, { once: true });
    };

    document.body.classList.add('loaded');
    setupAnchorLinks();

    const getQueryParam = (param) => {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(param);
    };

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

    const createMailtoLinks = (contactString, serviceTitle) => {
        if (!contactString) return '';
        const emailMatches = contactString.match(/([\w\sñáéíóúÁÉÍÓÚ.-]*[\s:-])?([\w.-]+@[\w.-]+\.\w+)/g);
        if (!emailMatches) return contactString;
        const subject = encodeURIComponent(`Consulta sobre servicio: ${serviceTitle}`);
        return emailMatches.map(match => {
            const email = match.match(/[\w.-]+@[\w.-]+\.\w+$/i)[0];
            const preTextMatch = match.match(/^([\w\sñáéíóúÁÉÍÓÚ.-]*[\s:-])/);
            const preText = preTextMatch ? preTextMatch[1].trim().replace(/[:\s-]+$/, '') : '';
            const linkText = preText ? `${preText}: ${email}` : email;
            return `<a href="mailto:${email}?subject=${subject}" class="email-link">${linkText}</a>`;
        }).join(' - ');
    };

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

                    const emailHTML = createMailtoLinks(detail.contacto, detail.titulo);
                    const telefonoHTML = detail.Teléfono ? `<span class="phone-number">Tel: ${detail.Teléfono}</span>` : '';
                    const contacto = (emailHTML || telefonoHTML) ? `<p class="detail-contact"><strong>Contacto:</strong> ${emailHTML} ${telefonoHTML}</p>` : '';

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
        setupAnchorLinks(); 
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

    const renderCards = (items, tipo) => {
        const grid = document.getElementById('service-grid');
        const resultsTitle = document.querySelector('.main-content .section-title');
        const descriptionParagraph = document.querySelector('.main-content .description');

        if (!grid) return;
        grid.innerHTML = '';
        if (resultsTitle) resultsTitle.textContent = 'Nuestros Servicios';
        if (descriptionParagraph) descriptionParagraph.style.display = 'block';
        if (items.length === 0) {
            grid.innerHTML = '<p class="no-results-message">No se encontraron datos para mostrar.</p>';
            return;
        }
        grid.classList.add('card-grid'); 
        grid.classList.remove('search-results-list-pro');

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

    const renderListResults = (items, searchTerm) => {
        const grid = document.getElementById('service-grid');
        const resultsTitle = document.querySelector('.main-content .section-title');
        const descriptionParagraph = document.querySelector('.main-content .description');
        if (!grid) return;
        grid.innerHTML = '';
        if (resultsTitle) resultsTitle.textContent = `Resultados para "${searchTerm}"`;
        if (descriptionParagraph) descriptionParagraph.style.display = 'none';
        if (items.length === 0) {
            grid.innerHTML = '<p class="no-results-message">No se encontraron resultados para esta búsqueda. Intente con otros términos.</p>';
            grid.classList.remove('card-grid');
            return;
        }
        grid.classList.remove('card-grid'); 
        grid.classList.add('search-results-list-pro');

        const listContainer = document.createElement('ul');
        items.forEach(item => {
            const listItem = document.createElement('li');
            const hrefPage = 'laboratorio_template.html'; 
            const linkHref = `${hrefPage}?id=${item.id}&tipo=${item.tipo}`;
            let iconClass = 'fas fa-cogs'; 
            let categoryTag = 'SERVICIO';
            if (item.tipo === 'laboratorios') {
                iconClass = 'fas fa-flask';
                categoryTag = 'LABORATORIO';
            } else if (item.tipo === 'agencias') {
                iconClass = 'fas fa-map-marker-alt';
                categoryTag = 'AGENCIA';
            }
            const descriptionSnippet = item.descripcion 
                ? item.descripcion.substring(0, 120) + (item.descripcion.length > 120 ? '...' : '') 
                : 'Haga clic para ver los detalles completos.';
            listItem.innerHTML = `
                <div class="result-item-pro">
                    <div class="result-icon-container">
                        <i class="${iconClass}"></i>
                    </div>
                    <div class="result-content-wrapper">
                        <span class="result-category-tag">${categoryTag}</span>
                        <h3 class="result-title">${item.titulo}</h3>
                        <p class="result-snippet">${descriptionSnippet}</p>
                    </div>
                    <div class="result-action-link">
                        <a href="${linkHref}" class="action-button">
                            Ver más <i class="fas fa-arrow-right"></i>
                        </a>
                    </div>
                </div>
            `;
            listContainer.appendChild(listItem);
        });
        grid.appendChild(listContainer);
    };

    let fuse = null;
    let allItems = []; 

    const setupFuseSearch = (data) => {
        const labItems = data.laboratorios.map(item => ({ ...item, tipo: 'laboratorios' }));
        const agenciasItems = data.agencias.map(item => ({ ...item, tipo: 'agencias' }));
        const servItems = data.servicios.map(item => ({ ...item, tipo: 'servicios' }));
        allItems = [...labItems, ...agenciasItems, ...servItems];
        const options = {
            keys: [
                'titulo',
                'descripcion',
                'detalles.titulo',
                'detalles.descripcion',
                'detalles.responsable'
            ],
            threshold: 0.4, 
            ignoreLocation: true,
            includeScore: true
        };
        fuse = new Fuse(allItems, options);
    };

    const handleSearch = (searchTerm) => {
        const grid = document.getElementById('service-grid');
        if (!grid || !fuse) return;
        if (searchTerm.trim() === '') {
            const defaultItems = allItems.filter(item => item.tipo === 'servicios');
            renderCards(defaultItems, 'servicios');
            return;
        }
        const results = fuse.search(searchTerm);
        const filteredItems = results.map(result => result.item);
        renderListResults(filteredItems, searchTerm); 
    };

    const init = async () => {
        const serviceId = getQueryParam('id');
        const containerDetalles = document.getElementById('lab-details-container');
        const grid = document.getElementById('service-grid');

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

        if (grid) {
            setupFuseSearch({ laboratorios, agencias, servicios });
            const searchInput = document.getElementById('search-input');
            const searchForm = document.getElementById('search-form');
            if (searchInput) {
                searchInput.addEventListener('input', () => {
                    handleSearch(searchInput.value.trim());
                });
                if (searchForm) {
                    searchForm.addEventListener('submit', (e) => {
                        e.preventDefault();
                        handleSearch(searchInput.value.trim());
                    });
                }
            }
            renderCards(servicios, 'servicios');
        }

        if (serviceId && containerDetalles) {
            let item = laboratorios.find(i => i.id === serviceId);
            if (!item) item = agencias.find(i => i.id === serviceId);
            if (!item) item = servicios.find(i => i.id === serviceId);
            if (item) loadServiceDetails(item);
            else containerDetalles.innerHTML = '<p>Lo sentimos, no se encontró la información solicitada.</p>';
        }
    };

    init();

    window.addEventListener("pageshow", (event) => {
        document.body.classList.remove("fade-out");
        document.body.classList.add("loaded");
        if (event.persisted) {
            init();
        }
    });

});

// Script para botón hamburguesa
const menuToggle = document.querySelector('.menu-toggle');
const mainNav = document.querySelector('.main-nav');
menuToggle.addEventListener('click', () => {
    mainNav.classList.toggle('active');
});
