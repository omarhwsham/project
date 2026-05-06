// ==========================================
// ========= نظام البحث الموحد (Unified Search) =========
// ==========================================

(function () {
    'use strict';

    // ── Build Unified Search Index ──
    function buildSearchIndex() {
        const index = [];

        // 1. Student Activities (organizationsData)
        if (typeof organizationsData !== 'undefined') {
            organizationsData.forEach((org, i) => {
                const allFields = [];
                ['nonTechFields', 'techFields', 'bioFields'].forEach(key => {
                    const fields = org[key] || {};
                    Object.entries(fields).forEach(([group, skills]) => {
                        allFields.push(group);
                        skills.forEach(s => allFields.push(s));
                    });
                });

                index.push({
                    id: `act_${i}`,
                    title: org.name,
                    description_ar: org.ar_about || '',
                    description_en: org.en_about || '',
                    category: 'activity',
                    categoryLabel_ar: 'نشاط طلابي',
                    categoryLabel_en: 'Student Activity',
                    subCategory: org.cat === 'technique' ? 'Technical' : 'Non-Technical',
                    tags: allFields,
                    link: org.link || '',
                    image: org.img || '',
                    email: org.email || '',
                    icon: 'fa-graduation-cap',
                    badgeColor: '#ffb400',
                    _original: org,
                    _page: 'activities',
                    _openAction: `openActModal(event, '${org.name.replace(/'/g, "\\'")}')`
                });
            });
        }

        // 2. Events (eventsData)
        if (typeof eventsData !== 'undefined') {
            eventsData.forEach((ev, i) => {
                const tags = [];
                if (ev.goals) ev.goals.forEach(g => tags.push(g));
                if (ev.tagline) tags.push(ev.tagline);

                index.push({
                    id: `ev_${i}`,
                    title: ev.title || '',
                    description_ar: (ev.tagline || '') + ' ' + (ev.goals ? ev.goals.join(' ') : ''),
                    description_en: (ev.tagline || '') + ' ' + (ev.goals ? ev.goals.join(' ') : ''),
                    category: 'event',
                    categoryLabel_ar: 'فعالية',
                    categoryLabel_en: 'Event',
                    subCategory: ev.badge || '',
                    tags: tags,
                    link: ev.registerLink || ev.socialLink || '',
                    image: '',
                    icon: 'fa-calendar-alt',
                    badgeColor: '#a855f7',
                    _original: ev,
                    _page: 'events'
                });
            });
        }

        // 3. Volunteering (volunteerData)
        if (typeof volunteerData !== 'undefined') {
            volunteerData.forEach((vol, i) => {
                const tags = [...(vol.fields || []), ...(vol.skills || [])];
                index.push({
                    id: `vol_${i}`,
                    title: vol.name || '',
                    description_ar: vol.ar_about || '',
                    description_en: vol.en_about || '',
                    category: 'volunteer',
                    categoryLabel_ar: 'تطوع',
                    categoryLabel_en: 'Volunteer',
                    subCategory: vol.type || '',
                    tags: tags,
                    link: vol.link || '',
                    image: vol.img || '',
                    icon: 'fa-heart',
                    badgeColor: '#22c55e',
                    _original: vol,
                    _page: 'volunteer'
                });
            });
        }

        // 4. Training (trainingOpsData)
        if (typeof trainingOpsData !== 'undefined') {
            trainingOpsData.forEach((tr, i) => {
                const desc = Object.values(tr.data || {}).join(' ');
                const tags = [tr.category || '', tr.paid || '', tr.type || ''];
                Object.values(tr.data || {}).forEach(v => tags.push(v));

                index.push({
                    id: `tr_${i}`,
                    title: tr.name || '',
                    description_ar: desc,
                    description_en: desc,
                    category: 'training',
                    categoryLabel_ar: 'تدريب',
                    categoryLabel_en: 'Training',
                    subCategory: tr.category || '',
                    tags: tags,
                    link: tr.link || '',
                    image: tr.img || '',
                    icon: 'fa-briefcase',
                    badgeColor: '#3b82f6',
                    _original: tr,
                    _page: 'training'
                });
            });
        }

        return index;
    }

    let searchIndex = [];

    // ── Search Logic ──
    function searchItems(query) {
        if (!query || query.trim().length < 2) return [];
        const q = query.toLowerCase().trim();
        const words = q.split(/\s+/);
        const lang = (typeof currentLang !== 'undefined' ? currentLang : 'ar');

        const scored = searchIndex.map(item => {
            let score = 0;
            const title = (item.title || '').toLowerCase();
            const desc = lang === 'ar' ? (item.description_ar || '').toLowerCase() : (item.description_en || '').toLowerCase();
            const tagsStr = (item.tags || []).join(' ').toLowerCase();
            const sub = (item.subCategory || '').toLowerCase();

            words.forEach(w => {
                if (title.includes(w)) score += 10;
                if (title === q) score += 20;
                if (desc.includes(w)) score += 3;
                if (tagsStr.includes(w)) score += 5;
                if (sub.includes(w)) score += 4;
            });

            return { ...item, score };
        });

        return scored.filter(r => r.score > 0).sort((a, b) => b.score - a.score);
    }

    // ── Highlight Matches ──
    function highlightText(text, query) {
        if (!query || !text) return text;
        const words = query.trim().split(/\s+/).filter(w => w.length >= 2);
        let result = text;
        words.forEach(w => {
            const regex = new RegExp(`(${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
            result = result.replace(regex, '<mark class="search-highlight">$1</mark>');
        });
        return result;
    }

    // ── Render Autocomplete ──
    function renderAutocomplete(results, query) {
        let dropdown = document.getElementById('searchAutocomplete');
        if (!dropdown) return;

        if (results.length === 0) {
            dropdown.innerHTML = `<div class="search-empty-state">
                <i class="fa fa-search"></i>
                <p>${currentLang === 'ar' ? 'لا توجد نتائج لـ' : 'No results for'} "<strong>${query}</strong>"</p>
                <span>${currentLang === 'ar' ? 'حاول بكلمات مختلفة أو ' : 'Try different keywords or '}
                <a href="mailto:eduvibee2026@gmail.com" class="search-email-link">${currentLang === 'ar' ? 'تواصل معنا' : 'contact us'}</a></span>
            </div>`;
            dropdown.classList.add('open');
            return;
        }

        const limited = results.slice(0, 8);
        const lang = (typeof currentLang !== 'undefined' ? currentLang : 'ar');

        let html = '';
        limited.forEach(item => {
            const desc = lang === 'ar' ? item.description_ar : item.description_en;
            const shortDesc = desc ? (desc.length > 80 ? desc.substring(0, 80) + '…' : desc) : '';
            const catLabel = lang === 'ar' ? item.categoryLabel_ar : item.categoryLabel_en;

            html += `<div class="search-result-item" onclick="handleSearchResultClick('${item._page}', '${item.id}', '${(item.title || '').replace(/'/g, "\\'")}')">  
                <div class="search-result-info">
                    <div class="search-result-title">${highlightText(item.title, query)}</div>
                    <div class="search-result-desc">${highlightText(shortDesc, query)}</div>
                </div>
                <span class="search-result-badge" style="background:${item.badgeColor}18;color:${item.badgeColor};border:1px solid ${item.badgeColor}30;">${catLabel}</span>
            </div>`;
        });

        if (results.length > 8) {
            html += `<div class="search-show-all" onclick="performGlobalSearch()">
                <i class="fa fa-arrow-left"></i>
                ${lang === 'ar' ? `عرض كل ${results.length} نتيجة` : `Show all ${results.length} results`}
            </div>`;
        }

        dropdown.innerHTML = html;
        dropdown.classList.add('open');
    }

    // ── Close Autocomplete ──
    function closeAutocomplete() {
        const dropdown = document.getElementById('searchAutocomplete');
        if (dropdown) dropdown.classList.remove('open');
    }

    // ── Full Search Results Overlay ──
    function renderFullResults(results, query) {
        let overlay = document.getElementById('searchResultsOverlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'searchResultsOverlay';
            document.body.appendChild(overlay);
        }

        const lang = (typeof currentLang !== 'undefined' ? currentLang : 'ar');

        if (results.length === 0) {
            overlay.innerHTML = `
                <div class="search-overlay-inner">
                    <div class="search-overlay-header">
                        <h2><i class="fa fa-search"></i> ${lang === 'ar' ? 'نتائج البحث' : 'Search Results'}</h2>
                        <button class="search-overlay-close" onclick="closeSearchOverlay()"><i class="fa fa-times"></i></button>
                    </div>
                    <div class="search-full-empty">
                        <i class="fa fa-inbox"></i>
                        <h3>${lang === 'ar' ? 'لا توجد نتائج' : 'No Results Found'}</h3>
                        <p>${lang === 'ar' ? 'حاول بكلمات مختلفة أو تواصل معنا:' : 'Try different keywords or contact us:'}</p>
                        <a href="mailto:eduvibee2026@gmail.com" class="search-contact-btn">
                            <i class="fa fa-envelope"></i> eduvibee2026@gmail.com
                        </a>
                    </div>
                </div>`;
            overlay.classList.add('open');
            document.body.style.overflow = 'hidden';
            return;
        }

        // Group results by category
        const groups = {};
        const catOrder = ['activity', 'event', 'volunteer', 'training'];
        results.forEach(item => {
            if (!groups[item.category]) groups[item.category] = [];
            groups[item.category].push(item);
        });

        let cardsHtml = '';
        catOrder.forEach(cat => {
            if (!groups[cat]) return;
            const items = groups[cat];
            const catLabel = lang === 'ar' ? items[0].categoryLabel_ar : items[0].categoryLabel_en;
            const catIcon = items[0].icon;
            const catColor = items[0].badgeColor;

            cardsHtml += `<div class="search-group-header" style="border-color:${catColor}">
                <i class="fa ${catIcon}" style="color:${catColor}"></i>
                <span>${catLabel}</span>
                <span class="search-group-count">${items.length}</span>
            </div>`;

            items.forEach(item => {
                const desc = lang === 'ar' ? item.description_ar : item.description_en;
                const shortDesc = desc ? (desc.length > 120 ? desc.substring(0, 120) + '…' : desc) : '';
                const tags = (item.tags || []).slice(0, 5).map(t =>
                    `<span class="search-tag">${highlightText(t, query)}</span>`
                ).join('');

                cardsHtml += `<div class="search-full-card" onclick="handleSearchResultClick('${item._page}', '${item.id}', '${(item.title || '').replace(/'/g, "\\'")}')">  
                    <div class="search-full-card-body">
                        <h4>${highlightText(item.title, query)}</h4>
                        <p>${highlightText(shortDesc, query)}</p>
                        <div class="search-tags-row">${tags}</div>
                    </div>
                    <div class="search-full-card-arrow">
                        <i class="fa fa-chevron-left"></i>
                    </div>
                </div>`;
            });
        });

        // Category filter chips
        let filterChips = `<button class="search-filter-chip active" onclick="filterSearchResults('all', this)">${lang === 'ar' ? 'الكل' : 'All'} <span>${results.length}</span></button>`;
        catOrder.forEach(cat => {
            if (!groups[cat]) return;
            const items = groups[cat];
            const catLabel = lang === 'ar' ? items[0].categoryLabel_ar : items[0].categoryLabel_en;
            filterChips += `<button class="search-filter-chip" onclick="filterSearchResults('${cat}', this)" data-cat="${cat}">${catLabel} <span>${items.length}</span></button>`;
        });

        overlay.innerHTML = `
            <div class="search-overlay-inner">
                <div class="search-overlay-header">
                    <h2><i class="fa fa-search"></i> ${lang === 'ar' ? 'نتائج البحث عن' : 'Results for'} "${query}"</h2>
                    <button class="search-overlay-close" onclick="closeSearchOverlay()"><i class="fa fa-times"></i></button>
                </div>
                <div class="search-filter-bar">${filterChips}</div>
                <div class="search-results-count">${lang === 'ar' ? `تم العثور على <strong>${results.length}</strong> نتيجة` : `Found <strong>${results.length}</strong> results`}</div>
                <div class="search-results-list" id="searchResultsList">${cardsHtml}</div>
            </div>`;

        overlay.classList.add('open');
        document.body.style.overflow = 'hidden';

        // Store results for filtering
        overlay._allResults = results;
        overlay._query = query;
    }

    // ── Filter within results ──
    window.filterSearchResults = function (cat, btn) {
        const overlay = document.getElementById('searchResultsOverlay');
        if (!overlay || !overlay._allResults) return;

        document.querySelectorAll('.search-filter-chip').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');

        const filtered = cat === 'all' ? overlay._allResults : overlay._allResults.filter(r => r.category === cat);
        const list = document.getElementById('searchResultsList');
        if (!list) return;

        // Re-render cards
        const lang = (typeof currentLang !== 'undefined' ? currentLang : 'ar');
        const query = overlay._query || '';

        let html = '';
        filtered.forEach(item => {
            const desc = lang === 'ar' ? item.description_ar : item.description_en;
            const shortDesc = desc ? (desc.length > 120 ? desc.substring(0, 120) + '…' : desc) : '';
            const tags = (item.tags || []).slice(0, 5).map(t =>
                `<span class="search-tag">${highlightText(t, query)}</span>`
            ).join('');

            html += `<div class="search-full-card" onclick="handleSearchResultClick('${item._page}', '${item.id}', '${(item.title || '').replace(/'/g, "\\'")}')">  
                <div class="search-full-card-body">
                    <h4>${highlightText(item.title, query)}</h4>
                    <p>${highlightText(shortDesc, query)}</p>
                    <div class="search-tags-row">${tags}</div>
                </div>
                <div class="search-full-card-arrow">
                    <i class="fa fa-chevron-left"></i>
                </div>
            </div>`;
        });

        list.innerHTML = html;

        const countEl = overlay.querySelector('.search-results-count');
        if (countEl) {
            countEl.innerHTML = lang === 'ar' ? `تم العثور على <strong>${filtered.length}</strong> نتيجة` : `Found <strong>${filtered.length}</strong> results`;
        }
    };

    // ── Handle Click on Result ──
    window.handleSearchResultClick = function (page, id, title) {
        closeSearchOverlay();
        closeAutocomplete();
        document.getElementById('globalSearchInput').value = '';

        // Navigate to page
        if (typeof navigateTo === 'function') {
            navigateTo(page);
        }

        // Try to open modal for activities
        if (page === 'activities' && typeof openActModal === 'function') {
            setTimeout(() => {
                openActModal(new Event('click'), title);
            }, 600);
        }

        // For training, try to open modal
        if (page === 'training' && typeof openTrainModal === 'function') {
            const idx = parseInt(id.replace('tr_', ''));
            if (typeof trainingOpsData !== 'undefined' && trainingOpsData[idx]) {
                setTimeout(() => openTrainModal(idx), 600);
            }
        }
    };

    // ── Close Overlay ──
    window.closeSearchOverlay = function () {
        const overlay = document.getElementById('searchResultsOverlay');
        if (overlay) {
            overlay.classList.remove('open');
            document.body.style.overflow = '';
        }
    };

    // ── Global Search Function (used by Enter/click) ──
    window.performGlobalSearch = function () {
        const input = document.getElementById('globalSearchInput');
        if (!input) return;
        const query = input.value.trim();
        if (query.length < 2) return;

        closeAutocomplete();
        const results = searchItems(query);
        renderFullResults(results, query);
    };

    // ── Debounced Autocomplete on Keyup ──
    let debounceTimer = null;

    function handleSearchKeyup(e) {
        if (e.key === 'Enter') {
            clearTimeout(debounceTimer);
            closeAutocomplete();
            performGlobalSearch();
            return;
        }

        const query = e.target.value.trim();
        if (query.length < 2) {
            closeAutocomplete();
            return;
        }

        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            const results = searchItems(query);
            renderAutocomplete(results, query);
        }, 250);
    }

    // ── Initialize ──
    function init() {
        // Build index after DOM is ready (data arrays should be available)
        searchIndex = buildSearchIndex();

        // Setup autocomplete dropdown
        const searchContainer = document.querySelector('.search-container');
        const input = document.getElementById('globalSearchInput');
        if (searchContainer && input) {
            // Create autocomplete dropdown
            let dropdown = document.getElementById('searchAutocomplete');
            if (!dropdown) {
                dropdown = document.createElement('div');
                dropdown.id = 'searchAutocomplete';
                dropdown.className = 'search-autocomplete';
                searchContainer.appendChild(dropdown);
            }

            // Bind events
            input.addEventListener('keyup', handleSearchKeyup);
            input.addEventListener('focus', () => {
                if (input.value.trim().length >= 2) {
                    const results = searchItems(input.value.trim());
                    renderAutocomplete(results, input.value.trim());
                }
            });

            // Close on outside click
            document.addEventListener('click', (e) => {
                if (!searchContainer.contains(e.target)) {
                    closeAutocomplete();
                }
            });
        }

        console.log(`[EduVibe Search] Initialized with ${searchIndex.length} items`);
    }

    // Wait for DOM + data to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => setTimeout(init, 500));
    } else {
        setTimeout(init, 500);
    }
})();
