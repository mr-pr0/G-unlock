// ==UserScript==
// @name         G-unlock
// @version      1.7.0
// @namespace    45c9a6614fccd4edff9592da
// @description  G-unlock reconstructs inline Google search results from removal notice data.
// @home         https://github.com/mr-pr0/G-unlock
// @supportURL   https://github.com/mr-pr0/G-unlock/issues
// @updateURL    https://raw.githubusercontent.com/mr-pr0/G-unlock/main/g-unlock.user.js
// @downloadURL  https://raw.githubusercontent.com/mr-pr0/G-unlock/main/g-unlock.user.js
// @author       mr-pr0
// @license      MIT License
// @icon         https://raw.githubusercontent.com/mr-pr0/G-unlock/main/extension/32.png
// @include      *://google.*/*
// @include      *://www.google.*/*
// @connect      *
// @grant        GM_xmlhttpRequest
// @grant        GM_registerMenuCommand
// @require      https://code.jquery.com/jquery-3.7.1.min.js
// @run-at       document-idle
// @noframes
// ==/UserScript==

/* eslint-env browser, es6, greasemonkey, jquery */

$(function () {
    if (!isSupportedGoogleHost(window.location.hostname)) return

    const DEBUG_PARAM = 'g-unlock-debug'
    const TEST_PARAM = 'g-unlock-test'
    const SETTINGS_KEY = 'g-unlock:settings'
    const SESSION_PREFIX = 'g-unlock:session:'
    const MAX_METADATA_CONCURRENCY = 4
    const METADATA_TIMEOUT = 12000
    const NOTICE_TIMEOUT = 30000
    const RIGHT_RAIL_RIGHT_GUTTER = 192
    const FALLBACK_LIGHT = {
        badgeBackground: '#e8f0fe',
        badgeColor: '#174ea6',
        borderColor: '#dadce0',
        dividerColor: '#dadce0',
        hoverBackground: '#f8f9fa',
        mutedColor: '#5f6368',
        noteColor: '#4d5156',
        panelBackground: '#ffffff',
        primaryColor: '#1a0dab',
        snippetColor: '#4d5156',
        textColor: '#202124',
        urlColor: '#188038'
    }
    const FALLBACK_DARK = {
        badgeBackground: '#174ea6',
        badgeColor: '#e8f0fe',
        borderColor: '#3c4043',
        dividerColor: '#3c4043',
        hoverBackground: '#202124',
        mutedColor: '#9aa0a6',
        noteColor: '#bdc1c6',
        panelBackground: '#202124',
        primaryColor: '#8ab4f8',
        snippetColor: '#bdc1c6',
        textColor: '#e8eaed',
        urlColor: '#81c995'
    }
    const DEFAULT_SETTINGS = {
        dividerStyle: 'informative',
        initialBatchSize: 10,
        maxInlineResults: 'unlimited',
        showBadge: true,
        showLowConfidence: true,
        showMoreBatchSize: 10
    }
    const NUMERIC_PRESETS = {
        initialBatchSize: [5, 10, 15, 20],
        maxInlineResults: [20, 40, 60],
        showMoreBatchSize: [5, 10, 15, 20]
    }
    const STRINGS = {
        de: {
            badge: 'Rekonstruiert',
            closeSettings: 'Schliessen',
            custom: 'Benutzerdefiniert',
            dividerInformative: 'Freigeschaltete Ergebnisse | {count} aus Hinweisdaten rekonstruiert',
            dividerMinimal: 'Freigeschaltete Ergebnisse',
            explanation: 'Diese Ergebnisse werden aus Hinweisdaten rekonstruiert und sind nicht die original entfernten Google-Karten.',
            gearLabel: 'G-unlock-Einstellungen',
            hideBadge: 'Rekonstruiert-Abzeichen anzeigen',
            initialBatchSize: 'Anfangsmenge',
            loading: 'Freigeschaltete Ergebnisse werden geladen...',
            lowConfidence: 'Nur domainbasierte Rekonstruktionen anzeigen',
            maxInlineResults: 'Maximale Inline-Ergebnisse',
            metadataUnavailable: 'Metadaten nicht verfuegbar',
            noMetadata: 'Metadaten werden vorbereitet...',
            reset: 'Standard wiederherstellen',
            settings: 'Einstellungen',
            showMore: 'Mehr freigeschaltete Ergebnisse anzeigen',
            showMoreBatchSize: 'Menge fuer Mehr anzeigen',
            removedCountTail: '({count} entfernte URLs)',
            snippet: 'Fuer die Suchanfrage "{query}" aus Hinweisdaten fuer {domain} rekonstruiert. {count} entfernte URLs wurden fuer dieses Ziel referenziert.',
            sourceFetched: 'Metadaten von Zielseite',
            unlimited: 'Unbegrenzt'
        },
        en: {
            badge: 'Reconstructed',
            closeSettings: 'Close',
            custom: 'Custom',
            dividerInformative: 'Unlocked Results | {count} reconstructed from notice data',
            dividerMinimal: 'Unlocked Results',
            explanation: 'These results are reconstructed from notice data and are not the original removed Google cards.',
            gearLabel: 'G-unlock settings',
            hideBadge: 'Show reconstructed badge',
            initialBatchSize: 'Initial batch size',
            loading: 'Loading unlocked results...',
            lowConfidence: 'Show domain-only reconstructions',
            maxInlineResults: 'Maximum inline results',
            metadataUnavailable: 'Metadata unavailable',
            noMetadata: 'Preparing metadata...',
            reset: 'Reset to defaults',
            settings: 'Settings',
            showMore: 'Show more unlocked results',
            showMoreBatchSize: 'Show-more batch size',
            removedCountTail: '({count} removed URLs)',
            snippet: 'Reconstructed for the search query "{query}" from notice data for {domain}. {count} removed URLs were referenced for this destination.',
            sourceFetched: 'Metadata fetched from destination',
            unlimited: 'Unlimited'
        },
        es: {
            badge: 'Reconstruido',
            closeSettings: 'Cerrar',
            custom: 'Personalizado',
            dividerInformative: 'Resultados desbloqueados | {count} reconstruidos a partir de datos de avisos',
            dividerMinimal: 'Resultados desbloqueados',
            explanation: 'Estos resultados se reconstruyen a partir de datos de avisos y no son las tarjetas originales retiradas de Google.',
            gearLabel: 'Ajustes de G-unlock',
            hideBadge: 'Mostrar insignia de reconstruccion',
            initialBatchSize: 'Tamano del lote inicial',
            loading: 'Cargando resultados desbloqueados...',
            lowConfidence: 'Mostrar reconstrucciones solo por dominio',
            maxInlineResults: 'Maximo de resultados en linea',
            metadataUnavailable: 'Metadatos no disponibles',
            noMetadata: 'Preparando metadatos...',
            reset: 'Restablecer valores',
            settings: 'Ajustes',
            showMore: 'Mostrar mas resultados desbloqueados',
            showMoreBatchSize: 'Tamano del lote de mostrar mas',
            removedCountTail: '({count} URL eliminadas)',
            snippet: 'Reconstruido para la busqueda "{query}" a partir de datos de avisos para {domain}. Se referenciaron {count} URL eliminadas para este destino.',
            sourceFetched: 'Metadatos obtenidos del destino',
            unlimited: 'Sin limite'
        },
        fr: {
            badge: 'Reconstruit',
            closeSettings: 'Fermer',
            custom: 'Personnalise',
            dividerInformative: 'Resultats debloques | {count} reconstruits a partir des donnees de notification',
            dividerMinimal: 'Resultats debloques',
            explanation: 'Ces resultats sont reconstruits a partir des donnees de notification et ne sont pas les cartes Google originales supprimees.',
            gearLabel: 'Parametres G-unlock',
            hideBadge: 'Afficher le badge reconstruit',
            initialBatchSize: 'Taille du lot initial',
            loading: 'Chargement des resultats debloques...',
            lowConfidence: 'Afficher les reconstructions basees uniquement sur le domaine',
            maxInlineResults: 'Nombre maximal de resultats integres',
            metadataUnavailable: 'Metadonnees indisponibles',
            noMetadata: 'Preparation des metadonnees...',
            reset: 'Retablir les valeurs par defaut',
            settings: 'Parametres',
            showMore: 'Afficher plus de resultats debloques',
            showMoreBatchSize: 'Taille du lot suivant',
            removedCountTail: '({count} URL supprimees)',
            snippet: 'Reconstruit pour la requete "{query}" a partir des donnees de notification pour {domain}. {count} URL supprimees etaient referencees pour cette destination.',
            sourceFetched: 'Metadonnees recuperees depuis la destination',
            unlimited: 'Illimite'
        },
        it: {
            badge: 'Ricostruito',
            closeSettings: 'Chiudi',
            custom: 'Personalizzato',
            dividerInformative: 'Risultati sbloccati | {count} ricostruiti dai dati di notifica',
            dividerMinimal: 'Risultati sbloccati',
            explanation: 'Questi risultati sono ricostruiti dai dati di notifica e non sono le schede Google originali rimosse.',
            gearLabel: 'Impostazioni G-unlock',
            hideBadge: 'Mostra badge ricostruito',
            initialBatchSize: 'Dimensione iniziale del blocco',
            loading: 'Caricamento dei risultati sbloccati...',
            lowConfidence: 'Mostra ricostruzioni solo dominio',
            maxInlineResults: 'Massimo risultati in linea',
            metadataUnavailable: 'Metadati non disponibili',
            noMetadata: 'Preparazione metadati...',
            reset: 'Ripristina predefiniti',
            settings: 'Impostazioni',
            showMore: 'Mostra altri risultati sbloccati',
            showMoreBatchSize: 'Dimensione del blocco aggiuntivo',
            removedCountTail: '({count} URL rimosse)',
            snippet: 'Ricostruito per la query "{query}" dai dati di notifica per {domain}. {count} URL rimosse sono state riferite per questa destinazione.',
            sourceFetched: 'Metadati recuperati dalla destinazione',
            unlimited: 'Illimitato'
        },
        pt: {
            badge: 'Reconstruido',
            closeSettings: 'Fechar',
            custom: 'Personalizado',
            dividerInformative: 'Resultados desbloqueados | {count} reconstruidos a partir de dados de avisos',
            dividerMinimal: 'Resultados desbloqueados',
            explanation: 'Estes resultados sao reconstruidos a partir de dados de avisos e nao sao os cartoes originais removidos do Google.',
            gearLabel: 'Definicoes do G-unlock',
            hideBadge: 'Mostrar selo de reconstruido',
            initialBatchSize: 'Tamanho do lote inicial',
            loading: 'A carregar resultados desbloqueados...',
            lowConfidence: 'Mostrar reconstrucao apenas por dominio',
            maxInlineResults: 'Maximo de resultados na pagina',
            metadataUnavailable: 'Metadados indisponiveis',
            noMetadata: 'A preparar metadados...',
            reset: 'Repor predefinicoes',
            settings: 'Definicoes',
            showMore: 'Mostrar mais resultados desbloqueados',
            showMoreBatchSize: 'Tamanho do lote seguinte',
            removedCountTail: '({count} URLs removidos)',
            snippet: 'Reconstruido para a pesquisa "{query}" com dados de avisos para {domain}. {count} URLs removidos foram referenciados para este destino.',
            sourceFetched: 'Metadados obtidos do destino',
            unlimited: 'Ilimitado'
        },
        ru: {
            badge: 'Vosstanovleno',
            closeSettings: 'Zakryt',
            custom: 'Svoe znachenie',
            dividerInformative: 'Razblokirovannye rezultaty | {count} vosstanovleny iz dannykh uvedomlenii',
            dividerMinimal: 'Razblokirovannye rezultaty',
            explanation: 'Eti rezultaty vosstanovleny iz dannykh uvedomlenii i ne yavlyayutsya iskhodnymi udalennymi kartochkami Google.',
            gearLabel: 'Nastroiki G-unlock',
            hideBadge: 'Pokazyvat beidzh rekonstruktsii',
            initialBatchSize: 'Nachalnyi razmer bloka',
            loading: 'Zagruzka razblokirovannykh rezultatov...',
            lowConfidence: 'Pokazyvat rekonstruktsii tolko po domenu',
            maxInlineResults: 'Maksimum vstroennykh rezultatov',
            metadataUnavailable: 'Metadannye nedostupny',
            noMetadata: 'Podgotovka metadannykh...',
            reset: 'Sbrosit po umolchaniyu',
            settings: 'Nastroiki',
            showMore: 'Pokazat bolshe razblokirovannykh rezultatov',
            showMoreBatchSize: 'Razmer sleduyushchego bloka',
            removedCountTail: '({count} udalennykh URL)',
            snippet: 'Rekonstruirovano dlya zaprosa "{query}" na osnove dannykh uvedomlenii dlya {domain}. Dlya etogo naznacheniya bylo ukazano {count} udalennykh URL.',
            sourceFetched: 'Metadannye polucheny s tselevoi stranitsy',
            unlimited: 'Bez ogranichenii'
        },
        tr: {
            badge: 'Yeniden olusturuldu',
            closeSettings: 'Kapat',
            custom: 'Ozel',
            dividerInformative: 'Kilit acilmis sonuclar | {count} bildirim verilerinden yeniden olusturuldu',
            dividerMinimal: 'Kilit acilmis sonuclar',
            explanation: 'Bu sonuclar bildirim verilerinden yeniden olusturulmustur ve Google tarafindan kaldirilan orijinal kartlar degildir.',
            gearLabel: 'G-unlock ayarlari',
            hideBadge: 'Yeniden olusturuldu rozetini goster',
            initialBatchSize: 'Ilk grup boyutu',
            loading: 'Kilit acilmis sonuclar yukleniyor...',
            lowConfidence: 'Yalnizca alan adina dayali yeniden olusturmalari goster',
            maxInlineResults: 'Maksimum satir ici sonuc',
            metadataUnavailable: 'Meta veriler kullanilamiyor',
            noMetadata: 'Meta veriler hazirlaniyor...',
            reset: 'Varsayilanlara don',
            settings: 'Ayarlar',
            showMore: 'Daha fazla kilidi acilmis sonuc goster',
            showMoreBatchSize: 'Sonraki grup boyutu',
            removedCountTail: '({count} kaldirilmis URL)',
            snippet: '"{query}" sorgusu icin {domain} bildirim verilerinden yeniden olusturuldu. Bu hedef icin {count} kaldirilmis URL referans verildi.',
            sourceFetched: 'Meta veriler hedeften alindi',
            unlimited: 'Sinirsiz'
        }
    }

    const state = {
        activeMetadataFetches: 0,
        boundEvents: false,
        context: null,
        debugEnabled: new URLSearchParams(window.location.search).get(DEBUG_PARAM) === '1',
        metadataQueue: [],
        metadataQueuedIds: new Set(),
        metadataSeenIds: new Set(),
        observer: null,
        observerIgnoreDepth: 0,
        requestGeneration: 0,
        scanTimer: null,
        session: null,
        settings: loadSettings(),
        styleInjected: false,
        testMode: new URLSearchParams(window.location.search).get(TEST_PARAM) === '1',
        ui: {
            mockSeeded: false,
            panelOpen: false
        }
    }

    init()

    function isSupportedGoogleHost(hostname) {
        const labels = String(hostname || '').toLowerCase().split('.')
        if (labels.length < 2) return false

        let suffix = []
        if (labels[0] === 'google') {
            suffix = labels.slice(1)
        } else if (labels.length >= 3 && labels[0] === 'www' && labels[1] === 'google') {
            suffix = labels.slice(2)
        } else {
            return false
        }

        if (suffix.length === 1) {
            return /^[a-z]{2,}$/.test(suffix[0])
        }

        if (suffix.length === 2) {
            return /^(com|co|net|org|gov|edu)$/i.test(suffix[0]) && /^[a-z]{2,}$/.test(suffix[1])
        }

        return false
    }

    function init() {
        ensureStyles()
        refreshContext(true)
        bindEvents()
        bindHistoryEvents()
        registerMenuCommands()
        scheduleScan()

        state.observer = new MutationObserver((mutations) => {
            if (state.observerIgnoreDepth > 0) return
            if (!shouldScheduleForMutations(mutations)) return
            scheduleScan()
        })

        state.observer.observe(document.body, { childList: true, subtree: true })
    }

    function debugLog() {
        if (!state.debugEnabled) return
        console.log('[G-unlock]', ...arguments)
    }

    function loadSettings() {
        try {
            const stored = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}')
            return normalizeSettings(Object.assign({}, DEFAULT_SETTINGS, stored))
        } catch (err) {
            return Object.assign({}, DEFAULT_SETTINGS)
        }
    }

    function normalizeSettings(raw) {
        const normalized = Object.assign({}, DEFAULT_SETTINGS)
        normalized.initialBatchSize = normalizePositiveInteger(raw.initialBatchSize, DEFAULT_SETTINGS.initialBatchSize)
        normalized.showMoreBatchSize = normalizePositiveInteger(raw.showMoreBatchSize, DEFAULT_SETTINGS.showMoreBatchSize)
        normalized.maxInlineResults = raw.maxInlineResults === 'unlimited'
            ? 'unlimited'
            : normalizePositiveInteger(raw.maxInlineResults, DEFAULT_SETTINGS.maxInlineResults)
        normalized.showLowConfidence = raw.showLowConfidence !== false
        normalized.showBadge = raw.showBadge !== false
        normalized.dividerStyle = raw.dividerStyle === 'minimal' ? 'minimal' : 'informative'
        return normalized
    }

    function normalizePositiveInteger(value, fallback) {
        const parsed = Number(value)
        if (!Number.isFinite(parsed) || parsed < 1) return fallback
        return Math.round(parsed)
    }

    function saveSettings() {
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings))
    }

    function getContext() {
        const url = new URL(window.location.href)
        const params = url.searchParams
        const query = (params.get('q') || '').trim()
        const tbm = params.get('tbm') || ''
        const udm = params.get('udm') || ''
        const pageSize = normalizePositiveInteger(params.get('num') || 10, 10)
        const pageStart = normalizePositiveInteger(params.get('start') || 0, 0)
        const lang = (document.documentElement.lang || params.get('hl') || navigator.language || 'en').toLowerCase()
        const safe = params.get('safe') || ''
        const safeActive = safe === 'active'
        const canonicalContext = {
            cr: params.get('cr') || '',
            gl: params.get('gl') || '',
            hl: params.get('hl') || '',
            lr: params.get('lr') || '',
            nfpr: params.get('nfpr') || '',
            num: String(pageSize),
            q: query,
            safe,
            tbs: params.get('tbs') || '',
            tbm,
            udm
        }
        const supported = !!query && !tbm && !safeActive && (!udm || udm === '14')
        const fingerprintParams = Object.keys(canonicalContext)
            .filter((key) => canonicalContext[key])
            .sort()
            .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(canonicalContext[key])}`)

        return {
            canonicalContext,
            fingerprint: `${url.origin}${url.pathname}?${fingerprintParams.join('&')}`,
            lang,
            pageIndex: Math.floor(pageStart / pageSize),
            pageStart,
            pageSize,
            query,
            safeActive,
            supported,
            uiLanguage: STRINGS[lang.split('-')[0]] ? lang.split('-')[0] : 'en'
        }
    }

    function refreshContext(forceReset) {
        const nextContext = getContext()
        const currentKey = state.context ? state.context.fingerprint : null

        if (!forceReset && currentKey === nextContext.fingerprint && state.context.pageStart === nextContext.pageStart) {
            return
        }

        const keyChanged = currentKey !== nextContext.fingerprint
        if (keyChanged) {
            state.requestGeneration += 1
        }
        state.context = nextContext
        state.metadataQueue = []
        state.metadataQueuedIds.clear()

        if (!nextContext.supported) {
            state.session = null
            removeInlineUi()
            return
        }

        if (keyChanged || forceReset) {
            state.session = loadSession(nextContext.fingerprint)
            state.metadataSeenIds = new Set(Object.keys(state.session.results).filter((id) => state.session.results[id].metadataStatus === 'ready' || state.session.results[id].metadataStatus === 'failed'))
        }

        ensurePageState(nextContext.pageStart)
    }

    function createEmptySession() {
        return {
            notices: {},
            pages: {},
            processedNoticeUrls: [],
            resultOrder: [],
            results: {}
        }
    }

    function loadSession(fingerprint) {
        try {
            const stored = sessionStorage.getItem(SESSION_PREFIX + fingerprint)
            if (!stored) return createEmptySession()
            const parsed = JSON.parse(stored)
            const session = createEmptySession()
            session.notices = parsed.notices || {}
            session.pages = Object.keys(parsed.pages || {}).reduce((accumulator, key) => {
                accumulator[key] = hydratePageState(parsed.pages[key])
                return accumulator
            }, {})
            session.processedNoticeUrls = Array.isArray(parsed.processedNoticeUrls) ? parsed.processedNoticeUrls : []
            session.resultOrder = Array.isArray(parsed.resultOrder) ? parsed.resultOrder : []
            session.results = Object.keys(parsed.results || {}).reduce((accumulator, key) => {
                accumulator[key] = hydrateResultRecord(parsed.results[key], key)
                return accumulator
            }, {})
            session.resultOrder = session.resultOrder.filter((id) => !!session.results[id])
            Object.keys(session.results).forEach((id) => {
                if (session.resultOrder.indexOf(id) === -1) {
                    session.resultOrder.push(id)
                }
            })
            if (!state.testMode) {
                stripMockResults(session)
            }
            return session
        } catch (err) {
            return createEmptySession()
        }
    }

    function stripMockResults(session) {
        delete session.notices['mock-notice']
        Object.keys(session.results).forEach((id) => {
            const record = session.results[id]
            if (record && Array.isArray(record.noticeIds) && record.noticeIds.indexOf('mock-notice') !== -1) {
                delete session.results[id]
            }
        })
        session.resultOrder = session.resultOrder.filter((id) => !!session.results[id])
    }

    function hydratePageState(rawPage) {
        return {
            extraCount: normalizePositiveInteger(rawPage && rawPage.extraCount, 0)
        }
    }

    function hydrateResultRecord(rawRecord, fallbackId) {
        const derivedDomain = canonicalizeDomain(rawRecord && (rawRecord.domain || rawRecord.canonicalDomain || extractDomain(rawRecord.destinationUrl || '') || 'example.invalid'))
        const record = createResultRecord(fallbackId, derivedDomain, !(rawRecord && rawRecord.exactUrlAvailable))
        const merged = Object.assign({}, record, rawRecord || {})

        merged.id = merged.id || fallbackId
        merged.domain = canonicalizeDomain(merged.domain || derivedDomain)
        merged.canonicalDomain = canonicalizeDomain(merged.canonicalDomain || merged.domain)
        merged.noticeIds = Array.isArray(merged.noticeIds) ? merged.noticeIds : []
        merged.fetchAttempts = normalizePositiveInteger(merged.fetchAttempts, 0)
        merged.removedUrlCount = normalizePositiveInteger(merged.removedUrlCount, 0)
        merged.metadataStatus = merged.metadataStatus || 'none'
        merged.syntheticTitle = merged.syntheticTitle || `${merged.domain}`
        merged.syntheticSnippet = merged.syntheticSnippet || ''
        return merged
    }

    function saveSession() {
        if (!state.context || !state.session) return
        safeSessionSet(SESSION_PREFIX + state.context.fingerprint, state.session)
    }

    function saveSessionFor(fingerprint, session) {
        safeSessionSet(SESSION_PREFIX + fingerprint, session)
    }

    function safeSessionSet(key, value) {
        try {
            sessionStorage.setItem(key, JSON.stringify(value))
        } catch (err) {
            debugLog('Session storage write skipped', err && err.message ? err.message : err)
        }
    }

    function ensurePageState(start) {
        const key = String(start)
        if (!state.session.pages[key]) {
            state.session.pages[key] = hydratePageState()
            saveSession()
        }
        return state.session.pages[key]
    }

    function ensureResultOrder() {
        if (!state.session) return
        state.session.resultOrder = state.session.resultOrder.filter((id) => !!state.session.results[id])

        const pendingRecords = Object.keys(state.session.results)
            .filter((id) => state.session.resultOrder.indexOf(id) === -1)
            .map((id) => state.session.results[id])
            .sort((a, b) => compareRecords(a, b))

        pendingRecords.forEach((record) => {
            state.session.resultOrder.push(record.id)
        })
    }

    function bindEvents() {
        if (state.boundEvents) return

        $(document).on('click.gunlock', '#g-unlock-show-more', function (event) {
            event.preventDefault()
            if (!state.context || !state.session) return
            const page = ensurePageState(state.context.pageStart)
            page.extraCount += state.settings.showMoreBatchSize
            saveSession()
            render()
        })

        $(document).on('click.gunlock', '#g-unlock-gear', function (event) {
            event.preventDefault()
            state.ui.panelOpen = !state.ui.panelOpen
            render()
        })

        $(document).on('click.gunlock', function (event) {
            if (!state.ui.panelOpen) return
            const target = $(event.target)
            if (target.closest('#g-unlock-settings-panel, #g-unlock-gear, #g-unlock-inline').length) return
            state.ui.panelOpen = false
            render()
        })

        $(document).on('change.gunlock', '[data-gunlock-toggle]', function () {
            const key = this.getAttribute('data-gunlock-toggle')
            state.settings[key] = !!this.checked
            applySettingsChange()
        })

        $(document).on('change.gunlock', '[data-gunlock-choice]', function () {
            const key = this.getAttribute('data-gunlock-choice')
            state.settings[key] = this.value
            applySettingsChange()
        })

        $(document).on('change.gunlock', '[data-gunlock-preset]', function () {
            const key = this.getAttribute('data-gunlock-preset')
            const value = this.value
            if (value === 'custom') {
                render()
                return
            }

            state.settings[key] = key === 'maxInlineResults' && value === 'unlimited'
                ? 'unlimited'
                : normalizePositiveInteger(value, DEFAULT_SETTINGS[key])
            applySettingsChange()
        })

        $(document).on('input.gunlock change.gunlock', '[data-gunlock-custom]', function () {
            const key = this.getAttribute('data-gunlock-custom')
            const parsed = normalizePositiveInteger(this.value, null)
            if (!parsed) return
            state.settings[key] = parsed
            applySettingsChange()
        })

        $(document).on('click.gunlock', '#g-unlock-reset-settings', function (event) {
            event.preventDefault()
            state.settings = Object.assign({}, DEFAULT_SETTINGS)
            saveSettings()
            state.ui.panelOpen = true
            render()
        })

        state.boundEvents = true
    }

    function bindHistoryEvents() {
        if (window.__gunlockHistoryBound) return

        const wrapMethod = (methodName) => {
            const original = history[methodName]
            history[methodName] = function () {
                const result = original.apply(this, arguments)
                window.dispatchEvent(new Event('g-unlock:navigation'))
                return result
            }
        }

        wrapMethod('pushState')
        wrapMethod('replaceState')
        window.addEventListener('popstate', () => {
            window.dispatchEvent(new Event('g-unlock:navigation'))
        })
        window.addEventListener('g-unlock:navigation', () => {
            scheduleScan()
        })
        window.addEventListener('resize', () => {
            if (!state.context || !state.context.supported) return
            render()
        })
        window.__gunlockHistoryBound = true
    }

    function registerMenuCommands() {
        if (typeof GM_registerMenuCommand !== 'function') return

        GM_registerMenuCommand('G-unlock: Reset settings to defaults', () => {
            state.settings = Object.assign({}, DEFAULT_SETTINGS)
            saveSettings()
            render()
        })

        GM_registerMenuCommand('G-unlock: Enable domain-only results', () => {
            state.settings.showLowConfidence = true
            saveSettings()
            render()
        })

        GM_registerMenuCommand('G-unlock: Disable domain-only results', () => {
            state.settings.showLowConfidence = false
            saveSettings()
            render()
        })

        GM_registerMenuCommand('G-unlock: Toggle reconstructed badge', () => {
            state.settings.showBadge = !state.settings.showBadge
            saveSettings()
            render()
        })

        GM_registerMenuCommand('G-unlock: Toggle divider style', () => {
            state.settings.dividerStyle = state.settings.dividerStyle === 'minimal' ? 'informative' : 'minimal'
            saveSettings()
            render()
        })
    }

    function applySettingsChange() {
        state.settings = normalizeSettings(state.settings)
        saveSettings()
        render()
    }

    function shouldScheduleForMutations(mutations) {
        const inlineRoot = document.getElementById('g-unlock-inline')
        for (const mutation of mutations) {
            if (inlineRoot && mutation.target && inlineRoot.contains(mutation.target)) {
                continue
            }
            return true
        }
        return false
    }

    function scheduleScan() {
        window.clearTimeout(state.scanTimer)
        state.scanTimer = window.setTimeout(() => {
            refreshContext(false)
            scanPage()
            render()
        }, 400)
    }

    function scanPage() {
        if (!state.context || !state.context.supported || !state.session) return

        const noticeUrls = new Set(state.session.processedNoticeUrls)
        const root = getNoticeSearchRoot()
        if (!root.length) return

        root.find('a[href]').each((_, link) => {
            const noticeUrl = getNoticeUrl(link.href)
            if (noticeUrl) noticeUrls.add(noticeUrl)
        })

        debugLog('Scan complete', 'detected_notices=', noticeUrls.size)

        noticeUrls.forEach((noticeUrl) => {
            if (shouldFetchNotice(noticeUrl)) {
                if (state.session.processedNoticeUrls.indexOf(noticeUrl) === -1) {
                state.session.processedNoticeUrls.push(noticeUrl)
                }
                saveSession()
                fetchNotice(noticeUrl)
            }
        })

        scheduleMetadataEnrichment()
    }

    function extractActualUrl(href) {
        if (!href) return null

        try {
            const url = new URL(href, window.location.origin)
            if (url.pathname === '/url') {
                return url.searchParams.get('q') || url.searchParams.get('url')
            }
            return url.href
        } catch (err) {
            return href
        }
    }

    function getNoticeUrl(rawHref) {
        const href = extractActualUrl(rawHref)
        if (!href) return null

        const lumenMatch = href.match(/^https?:\/\/(?:www\.)?lumendatabase\.org\/notices\/(\d+)/i)
        if (lumenMatch) {
            return `https://lumendatabase.org/notices/${lumenMatch[1]}`
        }

        const chillingMatch = href.match(/^https?:\/\/(?:www\.)?chillingeffects\.org\/notice\.cgi\?.*\bsID=(\d+)/i)
        if (chillingMatch) {
            return `https://lumendatabase.org/notices/${chillingMatch[1]}`
        }

        return null
    }

    function fetchNotice(noticeUrl) {
        const contextSnapshot = Object.assign({}, state.context)
        const targetSession = state.session
        const requestGeneration = state.requestGeneration
        const noticeId = getNoticeId(noticeUrl)
        setNoticeState(targetSession, noticeId, 'loading', translate(contextSnapshot.uiLanguage, 'loading'))
        render()
        debugLog('Fetching notice', noticeUrl)

        GM_xmlhttpRequest({
            method: 'GET',
            onerror: (response) => {
                if (requestGeneration !== state.requestGeneration) return
                debugLog('Notice request failed', noticeUrl)
                setNoticeState(targetSession, noticeId, 'error', response && response.error ? response.error : 'Request failed')
                saveSessionFor(contextSnapshot.fingerprint, targetSession)
                syncActiveSession(contextSnapshot.fingerprint, targetSession)
            },
            onload: (response) => {
                if (requestGeneration !== state.requestGeneration) return
                if (response.status === 429) {
                    setNoticeState(targetSession, noticeId, 'error', 'HTTP 429')
                    saveSessionFor(contextSnapshot.fingerprint, targetSession)
                    syncActiveSession(contextSnapshot.fingerprint, targetSession)
                    return
                }

                if (response.status < 200 || response.status >= 300) {
                    setNoticeState(targetSession, noticeId, 'error', `HTTP ${response.status}`)
                    saveSessionFor(contextSnapshot.fingerprint, targetSession)
                    syncActiveSession(contextSnapshot.fingerprint, targetSession)
                    return
                }

                const recovered = parseNotice(targetSession, contextSnapshot, response.responseText, noticeUrl)
                setNoticeState(targetSession, noticeId, recovered > 0 ? 'ok' : 'error', recovered > 0 ? `Recovered ${recovered}` : 'No visible results')
                saveSessionFor(contextSnapshot.fingerprint, targetSession)
                syncActiveSession(contextSnapshot.fingerprint, targetSession)
                if (state.context && state.context.fingerprint === contextSnapshot.fingerprint) {
                    scheduleMetadataEnrichment()
                }
            },
            ontimeout: () => {
                if (requestGeneration !== state.requestGeneration) return
                debugLog('Notice request timed out', noticeUrl)
                setNoticeState(targetSession, noticeId, 'timeout', 'Request timed out')
                saveSessionFor(contextSnapshot.fingerprint, targetSession)
                syncActiveSession(contextSnapshot.fingerprint, targetSession)
            },
            timeout: NOTICE_TIMEOUT,
            url: noticeUrl
        })
    }

    function getNoticeId(noticeUrl) {
        return noticeUrl.split('/').pop()
    }

    function setNoticeState(targetSession, noticeId, status, detail) {
        const current = targetSession.notices[noticeId] || {}
        targetSession.notices[noticeId] = {
            attempts: status === 'loading' ? (Number(current.attempts) || 0) + 1 : (Number(current.attempts) || 0),
            detail,
            id: noticeId,
            lastUpdatedAt: Date.now(),
            status
        }
    }

    function shouldFetchNotice(noticeUrl) {
        const noticeId = getNoticeId(noticeUrl)
        const notice = state.session.notices[noticeId]
        if (!notice) return true
        if (notice.status === 'loading' || notice.status === 'ok') return false
        const attempts = Number(notice.attempts) || 0
        const lastUpdatedAt = Number(notice.lastUpdatedAt) || 0
        if (attempts >= 2) return false
        return Date.now() - lastUpdatedAt > 5000
    }

    function parseNotice(targetSession, contextSnapshot, html, noticeUrl) {
        const doc = new DOMParser().parseFromString(html, 'text/html')
        const items = Array.from(doc.querySelectorAll('.infringing_url'))
        const noticeId = getNoticeId(noticeUrl)
        let recovered = 0

        items.forEach((item) => {
            const normalizedText = item.textContent.replace(/\s+/g, ' ').trim()
            const countMatch = normalizedText.match(/(?:^|\s)-\s*(\d+)(?:\s+.*)?$/i)
            if (!countMatch) return

            const removedUrlCount = Number(countMatch[1])
            const sourceText = normalizedText.replace(/(?:^|\s)-\s*\d+(?:\s+.*)?$/i, '').trim()
            const anchor = item.querySelector('a[href]')
            const inlineHref = anchor ? anchor.getAttribute('href') : ''
            const exactUrl = pickExactUrl(sourceText, inlineHref)

            if (exactUrl) {
                if (upsertResultFromExactUrl(targetSession, contextSnapshot, exactUrl, removedUrlCount, noticeId)) recovered++
                return
            }

            const domain = extractDomain(sourceText)
            if (!domain) return
            if (upsertResultFromDomain(targetSession, contextSnapshot, domain, removedUrlCount, noticeId)) recovered++
        })

        return recovered
    }

    function pickExactUrl(sourceText, inlineHref) {
        const candidates = []
        if (inlineHref) candidates.push(inlineHref)
        const textMatch = sourceText.match(/https?:\/\/[^\s<>'"]+/i)
        if (textMatch) candidates.push(textMatch[0])

        for (const candidate of candidates) {
            try {
                const url = new URL(candidate)
                if (!/^https?:$/i.test(url.protocol)) continue
                return url.href
            } catch (err) {
                continue
            }
        }

        return null
    }

    function extractDomain(value) {
        if (!value) return null
        const normalized = value.replace(/^https?:\/\//i, '').replace(/\/.*$/, '').replace(/^www\./i, '')
        if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(normalized)) return null
        return normalized.toLowerCase()
    }

    function canonicalizeDomain(domain) {
        return domain.replace(/^www\./i, '').toLowerCase()
    }

    function normalizeUrl(urlValue) {
        try {
            const url = new URL(urlValue)
            url.hash = ''
            if (url.pathname !== '/') {
                url.pathname = url.pathname.replace(/\/$/, '')
            }
            return url.href
        } catch (err) {
            return null
        }
    }

    function sanitizeFetchUrl(urlValue) {
        try {
            const url = new URL(urlValue)
            url.hash = ''
            url.search = ''
            if (url.pathname !== '/') {
                url.pathname = url.pathname.replace(/\/$/, '')
            }
            return url.href
        } catch (err) {
            return null
        }
    }

    function upsertResultFromExactUrl(targetSession, contextSnapshot, urlValue, removedUrlCount, noticeId) {
        const normalizedUrl = normalizeUrl(urlValue)
        if (!normalizedUrl) return false

        const parsed = new URL(normalizedUrl)
        const domain = canonicalizeDomain(parsed.hostname)
        const exactUrlSafe = isSafeDestinationUrl(normalizedUrl)
        const clickTarget = exactUrlSafe ? normalizedUrl : `https://${domain}`
        if (!isPublicFetchTarget(clickTarget)) return false
        const metadataFetchUrl = exactUrlSafe ? (sanitizeFetchUrl(normalizedUrl) || `https://${domain}`) : `https://${domain}`
        const id = `url:${normalizedUrl}`
        const existing = targetSession.results[id] || createResultRecord(id, domain, false)
        const homepageUrl = `https://${domain}`

        existing.destinationUrl = exactUrlSafe ? normalizedUrl : homepageUrl
        existing.displayUrl = formatDisplayUrl(exactUrlSafe ? normalizedUrl : homepageUrl)
        existing.domain = domain
        existing.canonicalDomain = domain
        existing.canonicalUrl = normalizedUrl
        existing.clickTarget = clickTarget
        existing.exactUrlAvailable = exactUrlSafe
        existing.fetchUrl = metadataFetchUrl
        existing.homepageUrl = homepageUrl
        existing.noticeIds = uniquePush(existing.noticeIds, noticeId)
        existing.removedUrlCount = Math.max(existing.removedUrlCount, removedUrlCount)
        existing.confidenceTier = exactUrlSafe ? 'exact' : 'domain'
        existing.syntheticTitle = buildSyntheticTitle(contextSnapshot, existing)
        existing.syntheticSnippet = buildSyntheticSnippet(contextSnapshot, existing)
        targetSession.results[id] = existing
        if (targetSession.resultOrder.indexOf(id) === -1) targetSession.resultOrder.push(id)
        return true
    }

    function upsertResultFromDomain(targetSession, contextSnapshot, domainValue, removedUrlCount, noticeId) {
        const domain = canonicalizeDomain(domainValue)
        if (!domain) return false
        if (!isPublicFetchTarget(`https://${domain}`)) return false

        const id = `domain:${domain}`
        const existing = targetSession.results[id] || createResultRecord(id, domain, true)
        existing.destinationUrl = `https://${domain}`
        existing.displayUrl = formatDisplayUrl(existing.destinationUrl)
        existing.domain = domain
        existing.canonicalDomain = domain
        existing.clickTarget = existing.destinationUrl
        existing.exactUrlAvailable = false
        existing.fetchUrl = existing.destinationUrl
        existing.homepageUrl = existing.destinationUrl
        existing.noticeIds = uniquePush(existing.noticeIds, noticeId)
        existing.removedUrlCount = Math.max(existing.removedUrlCount, removedUrlCount)
        existing.confidenceTier = 'domain'
        existing.syntheticTitle = buildSyntheticTitle(contextSnapshot, existing)
        existing.syntheticSnippet = buildSyntheticSnippet(contextSnapshot, existing)
        targetSession.results[id] = existing
        if (targetSession.resultOrder.indexOf(id) === -1) targetSession.resultOrder.push(id)
        return true
    }

    function createResultRecord(id, domain, domainOnly) {
        return {
            canonicalDomain: domain,
            canonicalUrl: null,
            clickTarget: `https://${domain}`,
            confidenceTier: domainOnly ? 'domain' : 'exact',
            destinationUrl: `https://${domain}`,
            displayUrl: formatDisplayUrl(`https://${domain}`),
            domain,
            exactUrlAvailable: !domainOnly,
            fetchAttempts: 0,
            fetchUrl: `https://${domain}`,
            fetchedSnippet: '',
            fetchedTitle: '',
            homepageUrl: `https://${domain}`,
            id,
            metadataSource: '',
            metadataStatus: 'none',
            noticeIds: [],
            qualityPassed: false,
            removedUrlCount: 0,
            syntheticSnippet: '',
            syntheticTitle: ''
        }
    }

    function uniquePush(array, value) {
        if (array.indexOf(value) === -1) array.push(value)
        return array
    }

    function buildSyntheticTitle(contextSnapshot, record) {
        const brand = record.domain
        return `${contextSnapshot.query} - ${brand}`
    }

    function buildSyntheticSnippet(contextSnapshot, record) {
        return translate(contextSnapshot.uiLanguage, 'snippet', {
            count: String(record.removedUrlCount),
            domain: record.domain,
            query: contextSnapshot.query
        })
    }

    function formatDisplayUrl(urlValue) {
        try {
            const url = new URL(urlValue)
            const text = `${url.origin}${url.pathname === '/' ? '' : url.pathname}`
            return text.length > 80 ? `${text.slice(0, 77)}...` : text
        } catch (err) {
            return urlValue
        }
    }

    function isSafeDestinationUrl(urlValue) {
        try {
            const url = new URL(urlValue)
            if (!/^https?:$/i.test(url.protocol)) return false
            if (url.href.length > 500) return false

            const blockedFragments = ['login', 'signin', 'signup', 'account', 'checkout']
            const blockedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.pdf', '.zip', '.rar', '.7z', '.exe', '.mp4', '.mp3']
            const pathname = url.pathname.toLowerCase()
            if (blockedFragments.some((fragment) => pathname.indexOf(fragment) !== -1)) return false
            if (blockedExtensions.some((fragment) => pathname.endsWith(fragment))) return false
            return true
        } catch (err) {
            return false
        }
    }

    function isPublicFetchTarget(urlValue) {
        try {
            const url = new URL(urlValue)
            const hostname = url.hostname.toLowerCase()
            if (hostname === 'localhost' || hostname.endsWith('.local')) return false
            if (isPrivateIp(hostname)) return false
            return true
        } catch (err) {
            return false
        }
    }

    function isPrivateIp(hostname) {
        if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
            const octets = hostname.split('.').map((value) => Number(value))
            if (octets[0] === 0 || octets[0] === 10 || octets[0] === 127) return true
            if (octets[0] === 169 && octets[1] === 254) return true
            if (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) return true
            if (octets[0] === 192 && octets[1] === 168) return true
            if (octets[0] === 100 && octets[1] >= 64 && octets[1] <= 127) return true
            if (octets[0] === 192 && octets[1] === 0 && octets[2] === 0) return true
            if (octets[0] === 198 && (octets[1] === 18 || octets[1] === 19)) return true
            if (octets[0] >= 224) return true
            return false
        }

        if (hostname.indexOf(':') !== -1) {
            const normalized = hostname.replace(/^\[|\]$/g, '')
            if (normalized === '::1') return true
            if (normalized.startsWith('fc') || normalized.startsWith('fd') || normalized.startsWith('fe80')) return true
            if (/^::ffff:(127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[0-1])\.)/i.test(normalized)) return true
        }

        return false
    }

    function scheduleMetadataEnrichment() {
        if (!state.context || !state.session) return

        const orderedResults = getEligibleOrderedResults()
        const visiblePlan = getVisiblePlan(orderedResults)
        const nextBoundary = visiblePlan.offset + visiblePlan.visibleCount + state.settings.showMoreBatchSize

        orderedResults.forEach((record, index) => {
            if (!needsMetadata(record)) return
            const priority = index < visiblePlan.offset + visiblePlan.visibleCount ? 0 : index < nextBoundary ? 1 : 2
            enqueueMetadata(record.id, priority)
        })

        pumpMetadataQueue()
    }

    function needsMetadata(record) {
        return !!record.fetchUrl && isPublicFetchTarget(record.fetchUrl) && record.fetchAttempts < 2 && record.metadataStatus !== 'ready' && record.metadataStatus !== 'failed'
    }

    function enqueueMetadata(id, priority) {
        if (state.metadataQueuedIds.has(id)) return
        state.metadataQueuedIds.add(id)
        state.metadataQueue.push({ id, priority })
        state.metadataQueue.sort((a, b) => a.priority - b.priority)
    }

    function pumpMetadataQueue() {
        while (state.activeMetadataFetches < MAX_METADATA_CONCURRENCY && state.metadataQueue.length) {
            const next = state.metadataQueue.shift()
            state.metadataQueuedIds.delete(next.id)
            const record = state.session.results[next.id]
            if (!record || !needsMetadata(record)) continue
            fetchMetadata(record)
        }
    }

    function fetchMetadata(record) {
        const contextSnapshot = Object.assign({}, state.context)
        const targetSession = state.session
        const requestGeneration = state.requestGeneration
        record.fetchAttempts += 1
        record.metadataStatus = 'pending'
        state.activeMetadataFetches += 1
        render()

        GM_xmlhttpRequest({
            method: 'GET',
            onerror: () => {
                if (requestGeneration !== state.requestGeneration) {
                    finishMetadataRequest(contextSnapshot.fingerprint, targetSession, true)
                    return
                }
                metadataFallback(contextSnapshot.fingerprint, targetSession, record)
            },
            onload: (response) => {
                if (requestGeneration !== state.requestGeneration) {
                    finishMetadataRequest(contextSnapshot.fingerprint, targetSession, true)
                    return
                }
                if (response.status < 200 || response.status >= 300) {
                    metadataFallback(contextSnapshot.fingerprint, targetSession, record)
                    return
                }

                const metadata = parseMetadata(response.responseText)
                if (!metadata || !passesQualityChecks(record, metadata)) {
                    metadataFallback(contextSnapshot.fingerprint, targetSession, record)
                    return
                }

                record.fetchedTitle = metadata.title
                record.fetchedSnippet = metadata.snippet
                record.metadataSource = translate(contextSnapshot.uiLanguage, 'sourceFetched')
                record.metadataStatus = 'ready'
                record.qualityPassed = true
                finishMetadataRequest(contextSnapshot.fingerprint, targetSession)
            },
            ontimeout: () => {
                if (requestGeneration !== state.requestGeneration) {
                    finishMetadataRequest(contextSnapshot.fingerprint, targetSession, true)
                    return
                }
                metadataFallback(contextSnapshot.fingerprint, targetSession, record)
            },
            timeout: METADATA_TIMEOUT,
            url: record.fetchUrl
        })
    }

    function metadataFallback(fingerprint, targetSession, record) {
        if (record.fetchUrl !== record.homepageUrl) {
            record.fetchUrl = record.homepageUrl
            record.metadataStatus = 'none'
            enqueueMetadata(record.id, 1)
            finishMetadataRequest(fingerprint, targetSession)
            return
        }

        record.metadataStatus = 'failed'
        record.qualityPassed = false
        finishMetadataRequest(fingerprint, targetSession)
    }

    function finishMetadataRequest(fingerprint, targetSession, skipSync) {
        state.activeMetadataFetches = Math.max(0, state.activeMetadataFetches - 1)
        saveSessionFor(fingerprint, targetSession)
        if (!skipSync) {
            syncActiveSession(fingerprint, targetSession)
        }
        pumpMetadataQueue()
    }

    function syncActiveSession(fingerprint, targetSession) {
        if (!state.context || state.context.fingerprint !== fingerprint) return
        state.session = targetSession
        render()
    }

    function parseMetadata(html) {
        const doc = new DOMParser().parseFromString(html, 'text/html')
        const title = (doc.querySelector('title') ? doc.querySelector('title').textContent : '').replace(/\s+/g, ' ').trim()
        const metaDescription = doc.querySelector('meta[name="description"], meta[property="og:description"], meta[name="twitter:description"]')
        const snippetContent = metaDescription ? (metaDescription.getAttribute('content') || '') : ''
        const snippet = snippetContent.replace(/\s+/g, ' ').trim()
        return { snippet, title }
    }

    function passesQualityChecks(record, metadata) {
        if (!metadata.title) return false
        const title = metadata.title.toLowerCase()
        const genericTitles = ['home', 'homepage', 'attention required!', 'just a moment...']
        if (genericTitles.indexOf(title) !== -1) return false
        if (title === record.domain.toLowerCase()) return false
        if (metadata.snippet && metadata.snippet.length < 25) return false
        return true
    }

    function getEligibleOrderedResults() {
        ensureResultOrder()
        const allResults = Object.values(state.session.results)
        const exactDomains = new Set(allResults.filter((record) => record.exactUrlAvailable).map((record) => record.canonicalDomain))

        return state.session.resultOrder
            .map((id) => state.session.results[id])
            .filter((record) => !!record)
            .filter((record) => state.settings.showLowConfidence || record.confidenceTier !== 'domain')
            .filter((record) => !(record.confidenceTier === 'domain' && exactDomains.has(record.canonicalDomain)))
    }

    function compareRecords(a, b) {
        const tierDiff = confidenceScore(a) - confidenceScore(b)
        if (tierDiff !== 0) return tierDiff
        if (b.removedUrlCount !== a.removedUrlCount) return b.removedUrlCount - a.removedUrlCount
        return a.domain.localeCompare(b.domain)
    }

    function confidenceScore(record) {
        if (record.exactUrlAvailable && record.metadataStatus === 'ready' && record.qualityPassed) return 0
        if (record.exactUrlAvailable) return 1
        return 2
    }

    function getVisiblePlan(orderedResults) {
        const page = ensurePageState(state.context.pageStart)
        const maxInline = getMaxInlineResults()
        let offset = 0

        for (let pageIndex = 0; pageIndex < state.context.pageIndex; pageIndex += 1) {
            const start = pageIndex * state.context.pageSize
            const pageState = state.session.pages[String(start)] || hydratePageState()
            const requested = getRequestedVisibleCount(pageState, maxInline)
            const remaining = Math.max(orderedResults.length - offset, 0)
            offset += Math.min(requested, remaining)
        }

        const requested = getRequestedVisibleCount(page, maxInline)
        const available = Math.max(orderedResults.length - offset, 0)
        const visibleCount = Math.max(0, Math.min(requested, available))

        return {
            available,
            offset,
            page,
            visibleCount
        }
    }

    function getRequestedVisibleCount(page, maxInline) {
        return Math.min(state.settings.initialBatchSize + page.extraCount, maxInline)
    }

    function getMaxInlineResults() {
        return state.settings.maxInlineResults === 'unlimited' ? Number.MAX_SAFE_INTEGER : state.settings.maxInlineResults
    }

    function render() {
        if (!state.context || !state.context.supported || !state.session) {
            removeInlineUi()
            return
        }

        if (state.testMode) {
            seedMockResults()
        }

        const orderedResults = getEligibleOrderedResults()
        const visiblePlan = getVisiblePlan(orderedResults)
        const visibleRecords = orderedResults.slice(visiblePlan.offset, visiblePlan.offset + visiblePlan.visibleCount)
        const loading = hasLoadingNotices()
        const shouldRenderUi = visibleRecords.length > 0 || loading

        if (!shouldRenderUi) {
            removeInlineUi()
            return
        }

        const mount = ensureInlineMount()
        if (!mount.length) return

        const renderHints = getRenderHints()
        updateThemeTokens(mount, renderHints.tokens)
        updateRailLayoutMetrics(mount)

        const dividerText = state.settings.dividerStyle === 'minimal'
            ? t('dividerMinimal')
            : t('dividerInformative', { count: String(visibleRecords.length) })
        const liveStatus = loading ? t('loading') : dividerText
        const domainCount = new Set(orderedResults.map((record) => record.canonicalDomain || record.domain)).size
        const noticeCountText = `${domainCount} domain${domainCount === 1 ? '' : 's'}`

        const settingsVisible = visibleRecords.length > 0
        const showMoreVisible = visiblePlan.offset + visiblePlan.visibleCount < orderedResults.length
        const skeletonCount = visibleRecords.length ? 0 : Math.min(3, state.settings.initialBatchSize)

        withObserverSuppressed(() => {
            mount.html(`
            <div class="g-unlock-divider-row g-unlock-panel-topbar" role="heading" aria-level="2">
                <div class="g-unlock-panel-topmeta">
                    <div class="g-unlock-brand-row">
                        <strong class="g-unlock-brand">G-unlock</strong>
                        <span class="g-unlock-divider-text">${escapeHtml(noticeCountText)}</span>
                    </div>
                    <div class="g-unlock-divider-text">${escapeHtml(dividerText)}</div>
                    <div class="g-unlock-note">${escapeHtml(t('explanation'))}</div>
                </div>
                ${settingsVisible ? `<button id="g-unlock-gear" type="button" class="g-unlock-gear" aria-label="${escapeHtml(t('gearLabel'))}">&#9881;</button>` : ''}
            </div>
            <div class="g-unlock-live-status" aria-live="polite">${escapeHtml(liveStatus)}</div>
            ${settingsVisible && state.ui.panelOpen ? buildSettingsPanel() : ''}
            <div class="g-unlock-cards" aria-label="${escapeHtml(dividerText)}">
                ${visibleRecords.map((record) => buildResultCard(record, renderHints.linkAttributes)).join('')}
                ${skeletonCount ? buildLoadingRows(skeletonCount) : ''}
            </div>
            ${showMoreVisible ? `<button id="g-unlock-show-more" type="button" class="g-unlock-show-more">${escapeHtml(t('showMore'))}</button>` : ''}
            ${state.debugEnabled ? buildDebugBlock(orderedResults, visiblePlan) : ''}
        `)
        })

        scheduleMetadataEnrichment()
    }

    function withObserverSuppressed(callback) {
        state.observerIgnoreDepth += 1
        try {
            callback()
        } finally {
            window.setTimeout(() => {
                state.observerIgnoreDepth = Math.max(0, state.observerIgnoreDepth - 1)
            }, 0)
        }
    }

    function hasLoadingNotices() {
        return Object.values(state.session.notices).some((notice) => notice.status === 'loading')
    }

    function getSearchRoot() {
        if ($('#rso').first().length) return $('#rso').first()
        if ($('#search #rso').first().length) return $('#search #rso').first()
        if ($('#center_col').first().length) return $('#center_col').first()
        if ($('#search').first().length) return $('#search').first()
        if ($('main').first().length) return $('main').first()
        return $('body').first()
    }

    function getNoticeSearchRoot() {
        if ($('#center_col').first().length) return $('#center_col').first()
        if ($('#search').first().length) return $('#search').first()
        if ($('main').first().length) return $('main').first()
        return $('body').first()
    }

    function ensureInlineMount() {
        const root = getSearchRoot()
        if (!root.length) return $()

        const removalNotice = getRemovalNoticeContainer()
        const lastOrganic = getLastOrganicResult()
        const rightRailHost = getRightRailHost()
        const useRightRail = !!rightRailHost.length

        let mount = $('#g-unlock-inline')
        if (!mount.length) {
            mount = $('<section id="g-unlock-inline" class="g-unlock-root"></section>')
        }

        if (useRightRail) {
            mount.attr('data-layout', 'rail')
            rightRailHost.append(mount)
        } else if (removalNotice.length) {
            mount.attr('data-layout', 'inline')
            removalNotice.before(mount)
        } else if (lastOrganic.length && !mount.prev().is(lastOrganic)) {
            mount.attr('data-layout', 'inline')
            lastOrganic.after(mount)
        } else if (!lastOrganic.length) {
            mount.attr('data-layout', 'inline')
            const fallbackContainer = root.find('div.MjjYud, div.g, div[data-hveid], .hlcw0c').last()
            if (fallbackContainer.length) {
                fallbackContainer.after(mount)
            } else {
                const visibleChildren = root.children(':visible')
                if (visibleChildren.length) {
                    visibleChildren.last().after(mount)
                } else {
                    root.append(mount)
                }
            }
        }

        if (!isMountVisible(mount)) {
            if (useRightRail) {
                rightRailHost.append(mount)
            } else {
                const columnFallback = $('#center_col:visible').first().length
                    ? $('#center_col:visible').first()
                    : (getSearchRoot().length ? getSearchRoot() : $('main:visible').first())
                if (columnFallback.length) {
                    columnFallback.append(mount)
                } else {
                    $('body').append(mount)
                }
            }
        }

        return mount
    }

    function getRightRailHost() {
        if (window.innerWidth < 1360) return $()

        const rhs = $('#rhs:visible, #rhs_block:visible').first()
        if (rhs.length) {
            const occupiedByGoogle = rhs.children(':visible').filter(function () {
                return this.id !== 'g-unlock-right-rail-host' && ($(this).text().trim().length > 0 || $(this).children(':visible').length > 0)
            }).length > 0

            if (occupiedByGoogle) return $()

            let host = $('#g-unlock-right-rail-host')
            if (!host.length) {
                host = $('<div id="g-unlock-right-rail-host" data-mode="native-rhs"></div>')
                rhs.append(host)
            }

            return host
        }

        const centerCol = $('#center_col:visible').first()
        if (!centerCol.length) return $()

        const occupiedRightRail = $('#knowledge-panel:visible').filter(function () {
            return $(this).text().trim().length > 0 || $(this).children(':visible').length > 0
        }).length > 0
        if (occupiedRightRail) return $()

        let host = $('#g-unlock-right-rail-host')
        if (!host.length) {
            host = $('<aside id="g-unlock-right-rail-host" data-mode="sibling"></aside>')
            centerCol.after(host)
        } else if (!host.is(centerCol.next())) {
            centerCol.after(host)
        }

        return host
    }

    function updateRailLayoutMetrics(mount) {
        if (!mount.length || mount.attr('data-layout') !== 'rail') return

        const host = mount.parent()
        if (!host.length) return

        const hostRect = host[0].getBoundingClientRect()
        const viewportPadding = 16
        let topOffset = Math.max(viewportPadding, hostRect.top)
        const viewportHeightAvailable = Math.max(220, window.innerHeight - topOffset - viewportPadding)
        let availableHeight = viewportHeightAvailable
        let measuredWidth = Math.min(hostRect.width || 320, window.innerWidth - hostRect.left - 24)

        if (host.attr('data-mode') === 'sibling') {
            const centerCol = $('#center_col:visible').first()
            const parent = host.parent()
            if (centerCol.length && parent.length) {
                const centerRect = centerCol[0].getBoundingClientRect()
                const parentRect = parent[0].getBoundingClientRect()
                const rightEdge = Math.min(parentRect.right, window.innerWidth - RIGHT_RAIL_RIGHT_GUTTER)
                const freeSpace = rightEdge - centerRect.right - 24
                if (freeSpace > 0) {
                    measuredWidth = freeSpace
                }

                topOffset = Math.max(viewportPadding, Math.min(centerRect.top, hostRect.top))
                const centerOffsetTop = centerCol.offset() ? centerCol.offset().top : (window.scrollY + centerRect.top)
                const centerHeight = centerCol.outerHeight() || 0
                const contentBottomViewport = centerOffsetTop + centerHeight - window.scrollY - topOffset - viewportPadding
                const contentHeightAvailable = Math.max(220, contentBottomViewport)
                availableHeight = Math.max(220, Math.min(viewportHeightAvailable, contentHeightAvailable))

                host.css({
                    '--g-unlock-rail-column-height': `${centerHeight}px`
                })
            }
        } else if (host.parent().length) {
            const railParent = host.parent()
            const railOffsetTop = railParent.offset() ? railParent.offset().top : (window.scrollY + hostRect.top)
            const railHeight = railParent.outerHeight() || 0
            const contentBottomViewport = railOffsetTop + railHeight - window.scrollY - topOffset - viewportPadding
            const contentHeightAvailable = Math.max(220, contentBottomViewport)
            availableHeight = Math.max(220, Math.min(viewportHeightAvailable, contentHeightAvailable))
        }

        const availableWidth = Math.max(measuredWidth, 160)

        host.css({
            '--g-unlock-rail-height': `${availableHeight}px`,
            '--g-unlock-rail-top': `${topOffset}px`,
            '--g-unlock-rail-width': `${availableWidth}px`
        })
    }

    function getRemovalNoticeContainer() {
        const root = $('#center_col').first().length
            ? $('#center_col').first()
            : ($('#search').first().length ? $('#search').first() : getSearchRoot())
        if (!root.length) return $()

        const noticeLink = root.find('a[href]').filter(function () {
            const href = $(this).attr('href') || ''
            return href.indexOf('lumendatabase.org') !== -1 || href.indexOf('chillingeffects.org') !== -1 || href.indexOf('/support/answer/1386831') !== -1
        }).last()

        if (!noticeLink.length) return $()

        const noticeContainer = noticeLink.closest('div.MjjYud, div.g, div[data-hveid], .hlcw0c, blockquote, [role="heading"] + div, div')
        return noticeContainer.length ? noticeContainer.first() : $()
    }

    function isMountVisible(mount) {
        return !!(mount && mount.length && mount.is(':visible') && mount.closest('body').length)
    }

    function getLastOrganicResult() {
        const root = getSearchRoot()
        if (!root.length) return $()

        const anchors = root.find('a[href]').filter(function () {
            const anchor = $(this)
            if (!anchor.find('h3').length) return false
            if (anchor.closest('#g-unlock-inline').length) return false
            if (anchor.closest('[data-text-ad], .commercial-unit-desktop-top, .commercial-unit-desktop-rhs, [data-pla-slot-pos]').length) return false
            if (anchor.closest('g-scrolling-carousel, g-section-with-header, .ULSxyf, [jscontroller][data-hveid] g-scrolling-carousel').length) return false
            return true
        })

        const headingContainers = root.find('h3').filter(function () {
            const heading = $(this)
            if (heading.closest('#g-unlock-inline').length) return false
            if (heading.closest('[data-text-ad], .commercial-unit-desktop-top, .commercial-unit-desktop-rhs, [data-pla-slot-pos]').length) return false
            if (heading.closest('g-scrolling-carousel, g-section-with-header, .ULSxyf, [jscontroller][data-hveid] g-scrolling-carousel').length) return false
            return true
        })

        let lastContainer = $()
        anchors.each((_, anchor) => {
            const container = $(anchor).closest('div.MjjYud, div.g, div[data-hveid], .hlcw0c')
            if (container.length) lastContainer = container.first()
        })

        if (!lastContainer.length) {
            headingContainers.each((_, heading) => {
                const container = $(heading).closest('div.MjjYud, div.g, div[data-hveid], .hlcw0c')
                if (container.length) lastContainer = container.first()
            })
        }

        if (!lastContainer.length && anchors.length) {
            lastContainer = $(anchors[anchors.length - 1]).closest('div').first()
        }

        if (!lastContainer.length && headingContainers.length) {
            lastContainer = $(headingContainers[headingContainers.length - 1]).closest('div').first()
        }

        return lastContainer
    }

    function buildResultCard(record, linkAttributes) {
        const title = record.metadataStatus === 'ready' && record.qualityPassed
            ? record.fetchedTitle
            : (record.syntheticTitle || buildSyntheticTitle(state.context, record))
        const snippet = record.metadataStatus === 'ready' && record.qualityPassed
            ? `${record.fetchedSnippet || record.syntheticSnippet} ${buildCountTail(record)}`.trim()
            : (record.syntheticSnippet || buildSyntheticSnippet(state.context, record))
        const badge = state.settings.showBadge ? `<span class="g-unlock-badge">${escapeHtml(t('badge'))}</span>` : ''
        const displayUrl = escapeHtml(record.displayUrl)
        const titleHtml = escapeHtml(title)
        const snippetHtml = escapeHtml(snippet)
        const href = escapeHtml(record.clickTarget)

        return `
            <article class="g-unlock-card" data-gunlock-result-id="${escapeHtml(record.id)}">
                <div class="g-unlock-url">${displayUrl}</div>
                <a class="g-unlock-title" href="${href}" ${linkAttributes}>${titleHtml}</a>
                <div class="g-unlock-snippet">${snippetHtml}</div>
                <div class="g-unlock-meta-row">
                    ${badge}
                </div>
            </article>
        `
    }

    function buildLinkAttributes(referenceLink) {
        const target = referenceLink.attr('target') || ''
        const rel = referenceLink.attr('rel') || 'noopener noreferrer'
        return `${target ? `target="${escapeHtml(target)}"` : ''} rel="${escapeHtml(rel)}"`
    }

    function getRenderHints() {
        const root = getSearchRoot()
        const referenceLink = root.find('a[href]').filter(function () {
            return $(this).find('h3').length > 0
        }).first()
        return {
            linkAttributes: buildLinkAttributes(referenceLink),
            tokens: getThemeTokens(root, referenceLink)
        }
    }

    function buildCountTail(record) {
        return t('removedCountTail', { count: String(record.removedUrlCount) })
    }

    function buildLoadingRows(count) {
        const rows = []
        for (let index = 0; index < count; index += 1) {
            rows.push(`
                <article class="g-unlock-card g-unlock-loading-card">
                    <div class="g-unlock-loading-line g-unlock-loading-url"></div>
                    <div class="g-unlock-loading-line g-unlock-loading-title"></div>
                    <div class="g-unlock-loading-line g-unlock-loading-snippet"></div>
                </article>
            `)
        }
        return rows.join('')
    }

    function buildDebugBlock(orderedResults, visiblePlan) {
        return `
            <pre class="g-unlock-debug-block">${escapeHtml([
                'debug=on',
                `page=${window.location.href}`,
                `query=${state.context.query}`,
                `start=${state.context.pageStart}`,
                `notices=${state.session.processedNoticeUrls.length}`,
                `results=${orderedResults.length}`,
                `visible=${visiblePlan.visibleCount}`,
                `offset=${visiblePlan.offset}`
            ].join('\n'))}</pre>
        `
    }

    function buildSettingsPanel() {
        return `
            <div id="g-unlock-settings-panel" class="g-unlock-settings-panel">
                <div class="g-unlock-settings-title-row">
                    <strong>${escapeHtml(t('settings'))}</strong>
                    <button type="button" id="g-unlock-reset-settings" class="g-unlock-reset">${escapeHtml(t('reset'))}</button>
                </div>
                <div class="g-unlock-settings-grid">
                    ${buildNumericSetting('initialBatchSize')}
                    ${buildNumericSetting('showMoreBatchSize')}
                    ${buildNumericSetting('maxInlineResults')}
                    ${buildToggleSetting('showLowConfidence', 'lowConfidence')}
                    ${buildToggleSetting('showBadge', 'hideBadge')}
                    ${buildDividerChoice()}
                </div>
            </div>
        `
    }

    function buildNumericSetting(key) {
        const currentValue = state.settings[key]
        const isUnlimited = key === 'maxInlineResults' && currentValue === 'unlimited'
        const presets = NUMERIC_PRESETS[key] || []
        const isPreset = isUnlimited || presets.indexOf(Number(currentValue)) !== -1
        const selectValue = isUnlimited ? 'unlimited' : (isPreset ? String(currentValue) : 'custom')
        const labelKey = key

        return `
            <label class="g-unlock-setting-row">
                <span>${escapeHtml(t(labelKey))}</span>
                <select data-gunlock-preset="${escapeHtml(key)}" class="g-unlock-select">
                    ${key === 'maxInlineResults' ? `<option value="unlimited" ${selectValue === 'unlimited' ? 'selected' : ''}>${escapeHtml(t('unlimited'))}</option>` : ''}
                    ${presets.map((value) => `<option value="${value}" ${selectValue === String(value) ? 'selected' : ''}>${value}</option>`).join('')}
                    <option value="custom" ${selectValue === 'custom' ? 'selected' : ''}>${escapeHtml(t('custom'))}</option>
                </select>
                <input class="g-unlock-input ${selectValue === 'custom' ? '' : 'g-unlock-hidden'}" data-gunlock-custom="${escapeHtml(key)}" type="number" min="1" value="${isUnlimited ? '' : escapeHtml(String(currentValue))}" />
            </label>
        `
    }

    function buildToggleSetting(settingKey, labelKey) {
        return `
            <label class="g-unlock-setting-row g-unlock-checkbox-row">
                <input type="checkbox" data-gunlock-toggle="${escapeHtml(settingKey)}" ${state.settings[settingKey] ? 'checked' : ''} />
                <span>${escapeHtml(t(labelKey))}</span>
            </label>
        `
    }

    function buildDividerChoice() {
        return `
            <label class="g-unlock-setting-row">
                <span>${escapeHtml(t('dividerMinimal'))} / ${escapeHtml(t('dividerInformative', { count: 'N' }))}</span>
                <select data-gunlock-choice="dividerStyle" class="g-unlock-select">
                    <option value="informative" ${state.settings.dividerStyle === 'informative' ? 'selected' : ''}>${escapeHtml(t('dividerInformative', { count: 'N' }))}</option>
                    <option value="minimal" ${state.settings.dividerStyle === 'minimal' ? 'selected' : ''}>${escapeHtml(t('dividerMinimal'))}</option>
                </select>
            </label>
        `
    }

    function t(key, values) {
        return translate(state.context ? state.context.uiLanguage : 'en', key, values)
    }

    function translate(language, key, values) {
        const strings = STRINGS[language] || STRINGS.en
        let template = strings[key] || STRINGS.en[key] || key
        Object.keys(values || {}).forEach((name) => {
            template = template.replace(new RegExp(`\\{${name}\\}`, 'g'), values[name])
        })
        return template
    }

    function ensureStyles() {
        if (state.styleInjected) return

        $('head').append(`
            <style id="g-unlock-style">
                #g-unlock-inline {
                    --g-unlock-badge-bg: ${FALLBACK_LIGHT.badgeBackground};
                    --g-unlock-badge-color: ${FALLBACK_LIGHT.badgeColor};
                    --g-unlock-border: ${FALLBACK_LIGHT.borderColor};
                    --g-unlock-divider: ${FALLBACK_LIGHT.dividerColor};
                    --g-unlock-hover: ${FALLBACK_LIGHT.hoverBackground};
                    --g-unlock-muted: ${FALLBACK_LIGHT.mutedColor};
                    --g-unlock-note: ${FALLBACK_LIGHT.noteColor};
                    --g-unlock-panel-bg: ${FALLBACK_LIGHT.panelBackground};
                    --g-unlock-primary: ${FALLBACK_LIGHT.primaryColor};
                    --g-unlock-snippet: ${FALLBACK_LIGHT.snippetColor};
                    --g-unlock-text: ${FALLBACK_LIGHT.textColor};
                    --g-unlock-url: ${FALLBACK_LIGHT.urlColor};
                    --g-unlock-title-size: 22px;
                    --g-unlock-snippet-size: 14px;
                    --g-unlock-url-size: 14px;
                    --g-unlock-font-family: Arial, sans-serif;
                    color: var(--g-unlock-text);
                    font-family: var(--g-unlock-font-family);
                    margin: 18px 0 32px;
                    max-width: 700px;
                }

                #g-unlock-inline[data-layout="rail"] {
                    background: var(--g-unlock-panel-bg);
                    border: 1px solid var(--g-unlock-border);
                    border-radius: 16px;
                    box-shadow: 0 8px 24px rgba(60, 64, 67, 0.18);
                    box-sizing: border-box;
                    height: var(--g-unlock-rail-height, calc(100vh - 120px));
                    max-width: 100%;
                    overflow: auto;
                    padding: 16px 18px;
                    position: sticky;
                    top: var(--g-unlock-rail-top, 92px);
                    width: 100%;
                }

                #g-unlock-inline[data-layout="rail"] .g-unlock-card {
                    margin-bottom: 24px;
                    max-width: none;
                }

                #g-unlock-inline[data-layout="rail"] .g-unlock-title {
                    font-size: calc(var(--g-unlock-title-size) - 2px);
                }

                #g-unlock-inline[data-layout="rail"] .g-unlock-divider-row {
                    position: sticky;
                    top: 0;
                    background: var(--g-unlock-panel-bg);
                    z-index: 1;
                }

                #g-unlock-right-rail-host {
                    position: relative;
                    width: 100%;
                }

                #g-unlock-right-rail-host[data-mode="sibling"] {
                    box-sizing: border-box;
                    float: right;
                    margin-left: 24px;
                    width: var(--g-unlock-rail-width, min(360px, 28vw));
                }

                #g-unlock-right-rail-host[data-mode="sibling"] > #g-unlock-inline[data-layout="rail"] {
                    height: auto;
                    max-height: var(--g-unlock-rail-column-height, none);
                    overflow: auto;
                    position: relative;
                    top: auto;
                }

                #g-unlock-right-rail-host[data-mode="sibling"] + * {
                    clear: none;
                }

                .g-unlock-divider-row {
                    align-items: center;
                    border-top: 1px solid var(--g-unlock-divider);
                    display: flex;
                    gap: 12px;
                    justify-content: space-between;
                    margin-bottom: 8px;
                    padding-top: 16px;
                }

                .g-unlock-divider-text {
                    color: var(--g-unlock-muted);
                    font-size: 13px;
                    line-height: 1.4;
                }

                .g-unlock-note {
                    color: var(--g-unlock-note);
                    font-size: 12px;
                    line-height: 1.5;
                    margin-bottom: 0;
                }

                .g-unlock-live-status {
                    height: 1px;
                    left: -9999px;
                    overflow: hidden;
                    position: absolute;
                    width: 1px;
                }

                .g-unlock-show-more {
                    background: none;
                    border: 1px solid var(--g-unlock-border);
                    border-radius: 999px;
                    color: var(--g-unlock-muted);
                    cursor: pointer;
                    font: inherit;
                    padding: 6px 10px;
                }

                .g-unlock-show-more {
                    color: var(--g-unlock-primary);
                    margin-top: 8px;
                }

                .g-unlock-show-more:hover {
                    background: var(--g-unlock-hover);
                }

                .g-unlock-gear,
                .g-unlock-reset {
                    background: none;
                    border: 1px solid var(--g-unlock-border);
                    border-radius: 999px;
                    color: var(--g-unlock-muted);
                    cursor: pointer;
                    font: inherit;
                    padding: 6px 10px;
                }

                .g-unlock-gear:hover,
                .g-unlock-reset:hover {
                    background: var(--g-unlock-hover);
                }

                .g-unlock-settings-panel {
                    background: var(--g-unlock-panel-bg);
                    border: 1px solid var(--g-unlock-border);
                    border-radius: 12px;
                    margin-bottom: 14px;
                    padding: 14px;
                }

                .g-unlock-settings-title-row {
                    align-items: center;
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 12px;
                }

                .g-unlock-settings-grid {
                    display: grid;
                    gap: 12px;
                }

                .g-unlock-setting-row {
                    color: var(--g-unlock-text);
                    display: grid;
                    gap: 6px;
                    font-size: 13px;
                }

                .g-unlock-checkbox-row {
                    align-items: center;
                    display: flex;
                    gap: 8px;
                }

                .g-unlock-select,
                .g-unlock-input {
                    background: var(--g-unlock-panel-bg);
                    border: 1px solid var(--g-unlock-border);
                    border-radius: 8px;
                    color: var(--g-unlock-text);
                    font: inherit;
                    padding: 8px 10px;
                }

                .g-unlock-hidden {
                    display: none;
                }

                .g-unlock-panel-topbar {
                    align-items: flex-start;
                    border-top: none;
                    gap: 10px;
                    margin-bottom: 12px;
                    padding-top: 0;
                }

                .g-unlock-panel-topmeta {
                    display: grid;
                    gap: 4px;
                }

                .g-unlock-brand-row {
                    align-items: baseline;
                    display: flex;
                    gap: 8px;
                }

                .g-unlock-brand {
                    color: var(--g-unlock-primary);
                    font-size: 14px;
                    line-height: 1.2;
                }

                .g-unlock-card {
                    margin-bottom: 30px;
                    max-width: 680px;
                }

                .g-unlock-url {
                    color: var(--g-unlock-url);
                    font-size: var(--g-unlock-url-size);
                    line-height: var(--g-unlock-url-line-height, 1.3);
                    margin-bottom: 2px;
                    overflow-wrap: anywhere;
                }

                .g-unlock-title {
                    color: var(--g-unlock-primary);
                    display: inline-block;
                    font-size: var(--g-unlock-title-size);
                    line-height: var(--g-unlock-title-line-height, 1.3);
                    margin-bottom: 4px;
                    text-decoration: none;
                }

                .g-unlock-title:hover {
                    text-decoration: underline;
                }

                .g-unlock-snippet {
                    color: var(--g-unlock-snippet);
                    font-size: var(--g-unlock-snippet-size);
                    line-height: var(--g-unlock-snippet-line-height, 1.58);
                }

                .g-unlock-meta-row {
                    margin-top: 6px;
                }

                .g-unlock-badge {
                    background: var(--g-unlock-badge-bg);
                    border-radius: 999px;
                    color: var(--g-unlock-badge-color);
                    display: inline-block;
                    font-size: 11px;
                    font-weight: 600;
                    letter-spacing: .01em;
                    padding: 4px 8px;
                }

                .g-unlock-loading-card {
                    opacity: .9;
                }

                .g-unlock-loading-line {
                    animation: g-unlock-pulse 1.3s ease-in-out infinite;
                    background: var(--g-unlock-hover);
                    border-radius: 999px;
                    margin-bottom: 8px;
                }

                .g-unlock-loading-url {
                    height: 14px;
                    width: 38%;
                }

                .g-unlock-loading-title {
                    height: 24px;
                    width: 64%;
                }

                .g-unlock-loading-snippet {
                    height: 16px;
                    width: 80%;
                }

                .g-unlock-debug-block {
                    background: var(--g-unlock-panel-bg);
                    border: 1px solid var(--g-unlock-border);
                    border-radius: 8px;
                    color: var(--g-unlock-muted);
                    font-size: 12px;
                    line-height: 1.5;
                    margin-top: 12px;
                    padding: 12px;
                    white-space: pre-wrap;
                }


                @keyframes g-unlock-pulse {
                    0% { opacity: .55; }
                    50% { opacity: 1; }
                    100% { opacity: .55; }
                }
            </style>
        `)

        state.styleInjected = true
    }

    function updateThemeTokens(mount, tokens) {
        mount.css({
            '--g-unlock-badge-bg': tokens.badgeBackground,
            '--g-unlock-badge-color': tokens.badgeColor,
            '--g-unlock-border': tokens.borderColor,
            '--g-unlock-divider': tokens.dividerColor,
            '--g-unlock-font-family': tokens.fontFamily,
            '--g-unlock-hover': tokens.hoverBackground,
            '--g-unlock-muted': tokens.mutedColor,
            '--g-unlock-note': tokens.noteColor,
            '--g-unlock-panel-bg': tokens.panelBackground,
            '--g-unlock-primary': tokens.primaryColor,
            '--g-unlock-snippet': tokens.snippetColor,
            '--g-unlock-snippet-size': tokens.snippetFontSize,
            '--g-unlock-snippet-line-height': tokens.snippetLineHeight,
            '--g-unlock-text': tokens.textColor,
            '--g-unlock-title-size': tokens.titleFontSize,
            '--g-unlock-title-line-height': tokens.titleLineHeight,
            '--g-unlock-url': tokens.urlColor,
            '--g-unlock-url-size': tokens.urlFontSize,
            '--g-unlock-url-line-height': tokens.urlLineHeight
        })
    }

    function getThemeTokens(root, referenceLink) {
        const darkPreferred = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
        const fallback = darkPreferred ? FALLBACK_DARK : FALLBACK_LIGHT
        const anchor = referenceLink && referenceLink.length ? referenceLink : root.find('a[href]').filter(function () {
            return $(this).find('h3').length > 0
        }).first()
        const title = anchor.find('h3').first()
        const resultContainer = anchor.closest('div.MjjYud, div.g, div[data-hveid], .hlcw0c')
        const urlNode = resultContainer.find('cite, span.VuuXrf, div.yuRUbf cite, a > span').filter(function () {
            return $(this).text().trim().length > 0
        }).first()
        const snippet = resultContainer.find('div[data-sncf], div.VwiC3b, div.yXK7lf, div.ITZIwc, span.aCOpRe, div').filter(function () {
            return $(this).text().trim().length > 40
        }).first()
        const bodyStyles = window.getComputedStyle(document.body)
        const anchorStyles = anchor.length ? window.getComputedStyle(anchor[0]) : null
        const titleStyles = title.length ? window.getComputedStyle(title[0]) : null
        const urlStyles = urlNode.length ? window.getComputedStyle(urlNode[0]) : null
        const snippetStyles = snippet.length ? window.getComputedStyle(snippet[0]) : null
        const titleFontSize = titleStyles && titleStyles.fontSize ? titleStyles.fontSize : '22px'
        const snippetFontSize = snippetStyles && snippetStyles.fontSize ? snippetStyles.fontSize : '14px'
        const urlFontSize = urlStyles && urlStyles.fontSize ? urlStyles.fontSize : (anchorStyles && anchorStyles.fontSize ? anchorStyles.fontSize : '14px')
        const titleLineHeight = titleStyles && titleStyles.lineHeight && titleStyles.lineHeight !== 'normal' ? titleStyles.lineHeight : '1.3'
        const snippetLineHeight = snippetStyles && snippetStyles.lineHeight && snippetStyles.lineHeight !== 'normal' ? snippetStyles.lineHeight : '1.58'
        const urlLineHeight = urlStyles && urlStyles.lineHeight && urlStyles.lineHeight !== 'normal' ? urlStyles.lineHeight : '1.3'
        const fontFamily = titleStyles && titleStyles.fontFamily ? titleStyles.fontFamily : (bodyStyles.fontFamily || 'Arial, sans-serif')
        const stableUrlColor = urlStyles && urlStyles.color && urlStyles.color !== 'rgba(0, 0, 0, 0)' ? urlStyles.color : fallback.urlColor

        return {
            badgeBackground: fallback.badgeBackground,
            badgeColor: fallback.badgeColor,
            borderColor: snippetStyles ? snippetStyles.borderColor || fallback.borderColor : fallback.borderColor,
            dividerColor: snippetStyles ? snippetStyles.color || fallback.dividerColor : fallback.dividerColor,
            fontFamily,
            hoverBackground: fallback.hoverBackground,
            mutedColor: snippetStyles ? snippetStyles.color || fallback.mutedColor : fallback.mutedColor,
            noteColor: snippetStyles ? snippetStyles.color || fallback.noteColor : fallback.noteColor,
            panelBackground: bodyStyles.backgroundColor && bodyStyles.backgroundColor !== 'rgba(0, 0, 0, 0)' ? bodyStyles.backgroundColor : fallback.panelBackground,
            primaryColor: titleStyles ? titleStyles.color || (anchorStyles ? anchorStyles.color : fallback.primaryColor) : (anchorStyles ? anchorStyles.color : fallback.primaryColor),
            snippetColor: snippetStyles ? snippetStyles.color || fallback.snippetColor : fallback.snippetColor,
            snippetFontSize,
            snippetLineHeight,
            textColor: bodyStyles.color || fallback.textColor,
            titleFontSize,
            titleLineHeight,
            urlColor: stableUrlColor,
            urlFontSize,
            urlLineHeight
        }
    }

    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
    }

    function removeInlineUi() {
        $('#g-unlock-inline').remove()
    }

    function seedMockResults() {
        if (!state.session) return

        const noticeId = 'mock-notice'
        if (state.session.notices[noticeId] && state.session.results['url:https://www.mozilla.org/firefox/new']) {
            state.ui.mockSeeded = true
            return
        }

        const mockResults = [
            {
                domain: 'www.mozilla.org',
                id: 'url:https://www.mozilla.org/firefox/new',
                removedUrlCount: 12,
                title: `${state.context.query} - Mozilla Firefox`,
                url: 'https://www.mozilla.org/firefox/new'
            },
            {
                domain: 'www.wikipedia.org',
                id: 'url:https://www.wikipedia.org',
                removedUrlCount: 11,
                title: `${state.context.query} - Wikipedia`,
                url: 'https://www.wikipedia.org'
            },
            {
                domain: 'developer.mozilla.org',
                id: 'url:https://developer.mozilla.org/en-US/',
                removedUrlCount: 10,
                title: `${state.context.query} - MDN Web Docs`,
                url: 'https://developer.mozilla.org/en-US/'
            },
            {
                domain: 'stackoverflow.com',
                id: 'url:https://stackoverflow.com/questions',
                removedUrlCount: 9,
                title: `${state.context.query} - Stack Overflow`,
                url: 'https://stackoverflow.com/questions'
            },
            {
                domain: 'archive.org',
                id: 'url:https://archive.org/details/texts',
                removedUrlCount: 8,
                title: `${state.context.query} - Internet Archive`,
                url: 'https://archive.org/details/texts'
            },
            {
                domain: 'www.npmjs.com',
                id: 'url:https://www.npmjs.com/',
                removedUrlCount: 7,
                title: `${state.context.query} - npm`,
                url: 'https://www.npmjs.com/'
            },
            {
                domain: 'www.gnu.org',
                id: 'url:https://www.gnu.org/software/',
                removedUrlCount: 6,
                title: `${state.context.query} - GNU Software`,
                url: 'https://www.gnu.org/software/'
            },
            {
                domain: 'sample.org',
                id: 'domain:sample.org',
                removedUrlCount: 5,
                title: `${state.context.query} - sample.org`,
                url: 'https://sample.org'
            },
            {
                domain: 'example.net',
                id: 'domain:example.net',
                removedUrlCount: 4,
                title: `${state.context.query} - example.net`,
                url: 'https://example.net'
            },
            {
                domain: 'example.org',
                id: 'domain:example.org',
                removedUrlCount: 3,
                title: `${state.context.query} - example.org`,
                url: 'https://example.org'
            }
        ]

        setNoticeState(state.session, noticeId, 'ok', 'Mock test results injected')

        mockResults.forEach((item) => {
            const record = createResultRecord(item.id, item.domain, item.id.startsWith('domain:'))
            record.clickTarget = item.url
            record.destinationUrl = item.url
            record.displayUrl = formatDisplayUrl(item.url)
            record.fetchUrl = item.url
            record.homepageUrl = `https://${item.domain}`
            record.noticeIds = [noticeId]
            record.removedUrlCount = item.removedUrlCount
            record.syntheticTitle = item.title
            record.syntheticSnippet = `Sample reconstructed result for "${state.context.query}" on ${item.domain}. This is shown to verify the inline G-unlock UI path.`
            state.session.results[item.id] = record
            if (state.session.resultOrder.indexOf(item.id) === -1) {
                state.session.resultOrder.push(item.id)
            }
        })

        state.ui.mockSeeded = true
        if (state.testMode) {
            saveSession()
        }
    }
})
