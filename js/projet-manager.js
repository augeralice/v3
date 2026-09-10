// js/projet-manager.js

document.addEventListener('DOMContentLoaded', () => {
    // --- 1. RÉCUPÉRATION DES DONNÉES DU PROJET ---
    const params = new URLSearchParams(window.location.search);
    const projectId = params.get('id');
    const currentFilter = params.get('filter') || 'all';

    const projectIndex = PROJECTS_DATA.findIndex(p => p.id === projectId);
    const currentProject = PROJECTS_DATA[projectIndex];

    if (!currentProject) return;

    document.title = `${currentProject.title} | Alice Auger`;

    // --- 2. MISE À JOUR DU CONTENU ---
    const nameEl = document.querySelector('.name-project .reveal-text');
    const catEl = document.querySelector('.projet-category');
    const yearEl = document.querySelector('.project-year');
    const descContainer = document.querySelector('.description-text');
    const detailsContainer = document.querySelector('.project-details');
    const heroImgEl = document.getElementById('project-hero-img');

    if (nameEl) nameEl.innerHTML = currentProject.displayTitle || currentProject.title;
    if (catEl) catEl.textContent = currentProject.displayCategory || '';
    if (yearEl) yearEl.textContent = currentProject.year || '';

    if (descContainer && currentProject.description) {
        const paragraphs = currentProject.description.split('\n\n');
        descContainer.innerHTML = paragraphs
            .map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`)
            .join('');
    }

    // --- HERO ---
    if (heroImgEl && currentProject.imageHero) {
        heroImgEl.src = currentProject.imageHero;
        heroImgEl.alt = currentProject.title;

        if (heroImgEl.complete) {
            heroImgEl.classList.add('loaded');
        } else {
            heroImgEl.onload = () => heroImgEl.classList.add('loaded');
        }
    }

    // --- MÉTADONNÉES ---
    if (detailsContainer) {
        const rows = [];

        if (currentProject.client) {
            rows.push(`
                <li>
                    <span class="meta-label">Client</span>
                    <span class="meta-value">${currentProject.client}</span>
                </li>`);
        }

        if (currentProject.displayCategory) {
            rows.push(`
                <li>
                    <span class="meta-label">Catégorie</span>
                    <span class="meta-value">${currentProject.displayCategory}</span>
                </li>`);
        }

        if (currentProject.year) {
            rows.push(`
                <li>
                    <span class="meta-label">Année</span>
                    <span class="meta-value">${currentProject.year}</span>
                </li>`);
        }

        if (Array.isArray(currentProject.prestations) && currentProject.prestations.length) {
            const items = currentProject.prestations.map(p => `<li>${p}</li>`).join('');
            rows.push(`
                <li>
                    <span class="meta-label">Prestations</span>
                    <ul class="meta-services">${items}</ul>
                </li>`);
        }

        detailsContainer.innerHTML = rows.join('');
    }

    // --- 3. GALERIE ---
    const galleryGrid = document.getElementById('project-grid');

    if (galleryGrid && Array.isArray(currentProject.gallery)) {
        galleryGrid.innerHTML = '';

        currentProject.gallery.forEach((media, index) => {
            const item = document.createElement('div');
            item.className = `reveal-mask project-grid-item ${media.layout || 'square'}`;
            item.dataset.index = index;

            const isVideo = media.src.toLowerCase().endsWith('.mp4');

            if (isVideo) {
                item.innerHTML = `
                    <video
                        src="${media.src}"
                        class="video-gallery"
                        autoplay
                        muted
                        loop
                        playsinline
                        webkit-playsinline
                        preload="metadata"
                        aria-label="${currentProject.title}">
                    </video>`;
            } else {
                item.innerHTML = `
                    <img
                        src="${media.src}"
                        loading="lazy"
                        decoding="async"
                        alt="${currentProject.title}">`;
            }

            galleryGrid.appendChild(item);
        });

        /*
         * On ne calcule la hauteur qu'après que les médias aient une largeur
         * réelle. ResizeObserver remplace l'ancien listener window.resize :
         * la grille se recalcule seulement quand sa largeur change réellement.
         */
        const recalc = () => requestAnimationFrame(() => resizeAllGridItems(galleryGrid));

        const mediaReady = Array.from(galleryGrid.querySelectorAll('img, video'));
        mediaReady.forEach(media => {
            if (media.tagName === 'IMG') {
                if (!media.complete) media.addEventListener('load', recalc, { once: true });
            } else if (media.readyState < 1) {
                media.addEventListener('loadedmetadata', recalc, { once: true });
            }
        });

        recalc();

        if ('ResizeObserver' in window) {
            const gridResizeObserver = new ResizeObserver(recalc);
            gridResizeObserver.observe(galleryGrid);
        } else {
            window.addEventListener('resize', recalc, { passive: true });
        }
    }

    /*
     * Calcule le nombre de lignes nécessaire pour respecter le ratio demandé.
     *
     * Formule :
     *   hauteur voulue = largeur / ratio
     *   span = ceil((hauteur + gap) / (row + gap))
     *
     * Le même gap sert horizontalement et verticalement, ce qui garantit
     * une trame régulière.
     */
    function resizeGridItem(item, grid) {
        if (window.matchMedia('(max-width: 767px)').matches) {
            item.style.removeProperty('grid-row-end');
            return;
        }

        const styles = getComputedStyle(grid);
        const rowUnit = parseFloat(styles.getPropertyValue('--gallery-row')) || 8;
        const rowGap = parseFloat(styles.getPropertyValue('row-gap')) || 0;
        const ratio = parseRatio(getComputedStyle(item).getPropertyValue('--media-ratio'));
        const itemWidth = item.getBoundingClientRect().width;

        if (!itemWidth || !ratio) return;

        const desiredHeight = itemWidth / ratio;

        // Hauteur réelle d'un bloc Grid :
        // span * rowUnit + (span - 1) * gap
        // On choisit le plus petit span qui atteint la hauteur voulue.
        // Grid height for N rows:
        // N * rowUnit + (N - 1) * rowGap
        // We need this value to be >= desiredHeight.
        const span = Math.max(1, Math.ceil(
            (desiredHeight + rowGap) / (rowUnit + rowGap)
        ));

        item.style.gridRowEnd = `span ${span}`;
    }

    function resizeAllGridItems(grid) {
        grid.querySelectorAll('.project-grid-item').forEach(item => {
            resizeGridItem(item, grid);
        });
    }

    function parseRatio(value) {
        const parts = value.trim().split('/').map(Number);
        if (parts.length !== 2 || !parts[0] || !parts[1]) return 1;
        return parts[0] / parts[1];
    }

    // --- 4. NAVIGATION SUIVANT ---
    const nextLink = document.getElementById('next-project-link');
    const nextTitle = document.getElementById('next-project-title');
    const nextImg = document.getElementById('next-project-img');

    let filteredList = PROJECTS_DATA;
    if (currentFilter && currentFilter !== 'all') {
        filteredList = PROJECTS_DATA.filter(p => p.category === currentFilter);
    }

    let filteredIndex = filteredList.findIndex(p => p.id === projectId);

    if (filteredIndex === -1) {
        filteredList = PROJECTS_DATA;
        filteredIndex = filteredList.findIndex(p => p.id === projectId);
    }

    if (filteredIndex !== -1 && filteredList.length > 0) {
        const nextProject = filteredList[(filteredIndex + 1) % filteredList.length];
        const targetUrl = `projets.html?id=${nextProject.id}&filter=${currentFilter}`;

        if (nextLink) nextLink.setAttribute('href', targetUrl);
        if (nextTitle) nextTitle.textContent = nextProject.title;
      // Injecte l'imageHero du projet suivant
    if (nextImg && nextProject.imageHero) {
        nextImg.src = nextProject.imageHero;
  
    }
    }

    // --- 5. INTERSECTION OBSERVER ---
    const observerOptions = { threshold: 0.1 };

    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;

            entry.target.classList.add('is-visible');

            const video = entry.target.querySelector('video.video-gallery');
            if (video) {
                video.muted = true;
                const playPromise = video.play();

                if (playPromise !== undefined) {
                    playPromise.catch(() => {});
                }

                video.onclick = function () {
                    this.muted = !this.muted;
                    this.classList.toggle('sound-on', !this.muted);
                };
            }

            revealObserver.unobserve(entry.target);
        });
    }, observerOptions);

    document.querySelectorAll('.project-grid .reveal-mask').forEach(el => revealObserver.observe(el));
    if (nextLink) revealObserver.observe(nextLink);

    // --- 6. BOUTON RETOUR ---
    const backButton = document.getElementById('back-button');
    if (backButton) {
        backButton.addEventListener('click', (e) => {
            e.preventDefault();

            if (document.referrer && document.referrer.includes(window.location.hostname)) {
                history.back();
            } else {
                window.location.href = `index.html?filter=${currentFilter}#portfolio`;
            }
        });
    }
});
