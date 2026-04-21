// ==UserScript==
// @name         Google Unlocked
// @version      1.6
// @namespace    45c9a6614fccd4edff9592da
// @description  Google Unlocked scans hidden search results that were censored by Google due to complaints
// @home         https://github.com/Ibit-to/google-unlocked
// @supportURL   https://github.com/Ibit-to/google-unlocked/issues
// @updateURL    https://raw.githubusercontent.com/Ibit-to/google-unlocked/master/google-unlocked.user.js
// @downloadURL  https://raw.githubusercontent.com/Ibit-to/google-unlocked/master/google-unlocked.user.js
// @author       Ibit - The Best Torrents
// @license      MIT License
// @icon         https://raw.githubusercontent.com/Ibit-to/google-unlocked/master/extension/32.png
// @include      *://www.google.*/*
// @connect      lumendatabase.org
// @connect      www.lumendatabase.org
// @connect      chillingeffects.org
// @connect      www.chillingeffects.org
// @grant        GM_xmlhttpRequest
// @require      https://code.jquery.com/jquery-3.7.1.min.js
// @run-at       document-idle
// @noframes
// ==/UserScript==

/* eslint-env browser, es6, greasemonkey, jquery */

$(function () {
    if (window.location.href.indexOf('//www.google') === -1) return

    const debugEnabled = new URLSearchParams(window.location.search).get('google-unlocked-debug') === '1'

    const state = {
        domains: new Map(),
        errors: [],
        noticeStates: new Map(),
        pending: 0,
        processed: new Set(),
        timeouts: []
    }

    let scanTimer = null
    let uiBound = false

    function debugLog() {
        if (!debugEnabled) return
        console.log('[Google Unlocked]', ...arguments)
    }

    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
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

    function getNoticeId(noticeUrl) {
        return noticeUrl.split('/').pop()
    }

    function setNoticeState(noticeUrl, status, detail) {
        state.noticeStates.set(noticeUrl, {
            detail,
            id: getNoticeId(noticeUrl),
            status
        })
    }

    function ensureContainer() {
        let container = $('#google-unlocked-results')
        if (container.length) return container

        const mountPoint = $('#search').first()
            .add('#rcnt').first()
            .add('main').first()
            .add('body').first()

        mountPoint.append(`
        <section id="google-unlocked-results" style="margin:24px 0;padding:16px 20px;border:1px solid #dadce0;border-radius:12px;background:#f8f9fa;color:#202124;">
            <h2 style="margin:0 0 12px;font-size:20px;line-height:1.3;">Unlocked Results</h2>
            <div id="google-unlocked-status" style="margin:0 0 12px;color:#5f6368;"></div>
            <div id="google-unlocked-actions" style="margin:0 0 12px;"></div>
            <div id="google-unlocked-errors" style="margin:0 0 12px;color:#b3261e;"></div>
            <div id="google-unlocked-error-details" style="margin:0 0 12px;color:#b3261e;"></div>
            <div id="google-unlocked-links" style="max-height:420px;overflow:auto;"></div>
            <pre id="google-unlocked-debug" style="display:${debugEnabled ? 'block' : 'none'};margin:12px 0 0;padding:12px;border-radius:8px;background:#fff;border:1px solid #dadce0;color:#3c4043;white-space:pre-wrap;font:12px/1.5 monospace;"></pre>
        </section>
        `)

        return $('#google-unlocked-results')
    }

    function ensureFloatingUi() {
        if (!$('#google-unlocked-bottom-bar').length) {
            $('body').append(`
            <div id="google-unlocked-bottom-bar" style="position:fixed;left:16px;right:16px;bottom:16px;z-index:2147483646;display:none;align-items:center;justify-content:space-between;gap:12px;padding:12px 16px;border:1px solid #dadce0;border-radius:14px;background:#ffffff;box-shadow:0 8px 24px rgba(60,64,67,.24);">
                <div id="google-unlocked-bottom-status" style="min-width:0;color:#202124;font:14px/1.4 Arial,sans-serif;"></div>
                <button id="google-unlocked-bottom-button" type="button" style="flex:none;padding:10px 14px;border:1px solid #1a73e8;border-radius:999px;background:#1a73e8;color:#fff;font:600 14px Arial,sans-serif;cursor:pointer;">Show unlocked results</button>
            </div>
            <div id="google-unlocked-overlay" style="position:fixed;inset:0;z-index:2147483645;display:none;background:rgba(32,33,36,.38);"></div>
            <aside id="google-unlocked-drawer" style="position:fixed;top:0;right:0;bottom:0;z-index:2147483647;display:none;width:min(520px,100vw);padding:20px;background:#fff;box-shadow:-8px 0 24px rgba(60,64,67,.24);overflow:auto;color:#202124;">
                <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:16px;">
                    <h2 style="margin:0;font-size:22px;line-height:1.3;">Unlocked Results</h2>
                    <button id="google-unlocked-close" type="button" style="padding:8px 12px;border:1px solid #dadce0;border-radius:999px;background:#fff;color:#202124;font:600 14px Arial,sans-serif;cursor:pointer;">Close</button>
                </div>
                <div id="google-unlocked-drawer-summary" style="margin:0 0 12px;color:#5f6368;"></div>
                <div id="google-unlocked-drawer-errors" style="margin:0 0 12px;color:#b3261e;"></div>
                <div id="google-unlocked-drawer-links"></div>
            </aside>
            `)
        }

        if (uiBound) return

        $(document).on('click.googleUnlocked', '#google-unlocked-open-drawer, #google-unlocked-bottom-button', function () {
            $('#google-unlocked-overlay').show()
            $('#google-unlocked-drawer').show()
        })

        $(document).on('click.googleUnlocked', '#google-unlocked-close, #google-unlocked-overlay', function () {
            $('#google-unlocked-drawer').hide()
            $('#google-unlocked-overlay').hide()
        })

        uiBound = true
    }

    function getSortedItems() {
        return Array.from(state.domains.values()).sort((a, b) => b.count - a.count || a.domain.localeCompare(b.domain))
    }

    function getTotalRecoveredUrls(items) {
        return items.reduce((sum, item) => sum + item.count, 0)
    }

    function buildResultsMarkup(items) {
        if (!items.length) return ''

        return items.map((item) => {
            const url = `https://${item.domain}`
            const label = escapeHtml(item.domain)
            const href = escapeHtml(url)

            return `
                <article style="padding:12px 0;border-top:1px solid #eceff1;">
                    <div style="margin-bottom:4px;color:#5f6368;font-size:12px;line-height:1.4;">Recovered from DMCA notice data</div>
                    <a href="${href}" target="_blank" rel="noopener noreferrer" style="display:inline-block;margin-bottom:4px;color:#1a0dab;font-size:20px;line-height:1.3;text-decoration:none;">${label}</a>
                    <div style="color:#202124;font-size:14px;line-height:1.5;">${item.count} removed URL${item.count === 1 ? '' : 's'} referenced for this domain.</div>
                    <div style="margin-top:2px;color:#188038;font-size:13px;line-height:1.4;">${href}</div>
                </article>
            `
        }).join('')
    }

    function render() {
        if (!state.pending && !state.domains.size && !state.errors.length && !state.timeouts.length) {
            return
        }

        ensureContainer()
        ensureFloatingUi()

        const status = $('#google-unlocked-status')
        const actions = $('#google-unlocked-actions')
        const errors = $('#google-unlocked-errors')
        const errorDetails = $('#google-unlocked-error-details')
        const links = $('#google-unlocked-links')
        const debug = $('#google-unlocked-debug')
        const bottomBar = $('#google-unlocked-bottom-bar')
        const bottomStatus = $('#google-unlocked-bottom-status')
        const drawerSummary = $('#google-unlocked-drawer-summary')
        const drawerErrors = $('#google-unlocked-drawer-errors')
        const drawerLinks = $('#google-unlocked-drawer-links')
        const noticeStates = Array.from(state.noticeStates.values()).sort((a, b) => a.id.localeCompare(b.id))
        const issueStates = noticeStates.filter((item) => item.status !== 'ok' && item.status !== 'loading')
        const items = getSortedItems()
        const totalRecoveredUrls = getTotalRecoveredUrls(items)

        if (state.pending > 0) {
            status.text(`Loading hidden links from ${state.pending} notice${state.pending === 1 ? '' : 's'}...`)
        } else if (state.domains.size > 0) {
            status.text(`Recovered ${state.domains.size} hidden domain${state.domains.size === 1 ? '' : 's'} and approximately ${totalRecoveredUrls} removed URL${totalRecoveredUrls === 1 ? '' : 's'}.`)
        } else {
            status.text('Found takedown notices, but could not recover any visible domains from them.')
        }

        if (state.domains.size > 0) {
            actions.html('<button id="google-unlocked-open-drawer" type="button" style="padding:10px 14px;border:1px solid #1a73e8;border-radius:999px;background:#fff;color:#1a73e8;font:600 14px Arial,sans-serif;cursor:pointer;">Open separate results box</button>')
        } else {
            actions.empty()
        }

        const messages = []
        if (state.errors.length) {
            messages.push(`Errors: ${state.errors.join(', ')}`)
        }
        if (state.timeouts.length) {
            messages.push(`Timeouts: ${state.timeouts.join(', ')}`)
        }
        errors.text(messages.join(' | '))

        if (issueStates.length) {
            errorDetails.html(issueStates.map((item) => `
                <div style="margin:4px 0;">
                    <strong>${item.id}</strong>: ${item.detail}
                </div>
            `).join(''))
        } else if (state.pending > 0) {
            const loadingStates = noticeStates.filter((item) => item.status === 'loading')
            errorDetails.html(loadingStates.map((item) => `
                <div style="margin:4px 0;">
                    <strong>${item.id}</strong>: waiting for Lumen response...
                </div>
            `).join(''))
        } else {
            errorDetails.empty()
        }

        links.html(buildResultsMarkup(items))

        if (state.pending > 0) {
            bottomStatus.text(`Scanning takedown notices. ${state.pending} request${state.pending === 1 ? '' : 's'} still running.`)
        } else if (state.domains.size > 0) {
            bottomStatus.text(`Unlocked approximately ${totalRecoveredUrls} removed URLs across ${state.domains.size} recovered domains.`)
        } else {
            bottomStatus.text('Detected takedown notices, but no visible domains could be recovered yet.')
        }

        drawerSummary.text(status.text())
        drawerErrors.html(errorDetails.html() || errors.text())
        drawerLinks.html(buildResultsMarkup(items))
        bottomBar.css('display', 'flex')

        if (debugEnabled) {
            debug.text([
                'debug=on',
                `page=${window.location.href}`,
                `pending=${state.pending}`,
                `processed_notices=${state.processed.size}`,
                `recovered_domains=${state.domains.size}`,
                `errors=${state.errors.length}`,
                `timeouts=${state.timeouts.length}`,
                `tracked_notices=${noticeStates.length}`,
                '',
                'notice_urls:',
                Array.from(state.processed).join('\n') || '(none yet)'
            ].join('\n'))
        }
    }

    function recordMatches(html) {
        const doc = new DOMParser().parseFromString(html, 'text/html')
        const items = doc.querySelectorAll('.infringing_url')
        let found = 0

        items.forEach((item) => {
            const text = item.textContent.trim()
            const match = text.match(/^(.+?)\s*-\s*(\d+)\s+URLs?$/i)
            if (!match) return

            const domain = match[1].trim().replace(/^https?:\/\//i, '').replace(/\/$/, '')
            const count = Number(match[2])
            const current = state.domains.get(domain)
            if (!current || count > current.count) {
                state.domains.set(domain, { domain, count })
            }
            found++
        })

        return found
    }

    function fetchNotice(noticeUrl) {
        state.processed.add(noticeUrl)
        state.pending++
        setNoticeState(noticeUrl, 'loading', 'Waiting for Lumen response')
        debugLog('Fetching notice', noticeUrl)
        render()

        GM_xmlhttpRequest({
            method: 'GET',
            url: noticeUrl,
            timeout: 30000,
            onload: (response) => {
                if (response.status === 429) {
                    setNoticeState(noticeUrl, 'error', 'HTTP 429 Too Many Requests from Lumen')
                    state.errors.push('HTTP 429 from Lumen')
                    return
                }

                if (response.status < 200 || response.status >= 300) {
                    setNoticeState(noticeUrl, 'error', `HTTP ${response.status} from Lumen`)
                    state.errors.push(`HTTP ${response.status}`)
                    return
                }

                const matches = recordMatches(response.responseText)
                debugLog('Fetched notice', noticeUrl, 'matches=', matches)
                if (!matches) {
                    setNoticeState(noticeUrl, 'error', 'Notice loaded, but no visible domains were available')
                    state.errors.push(`No visible URLs in notice ${noticeUrl.split('/').pop()}`)
                    return
                }

                setNoticeState(noticeUrl, 'ok', `Recovered ${matches} visible domain${matches === 1 ? '' : 's'}`)
            },
            onerror: (response) => {
                debugLog('Request failed', noticeUrl)
                setNoticeState(noticeUrl, 'error', response && response.error ? `Request failed: ${response.error}` : 'Request failed before Lumen responded')
                state.errors.push(`Request failed for notice ${noticeUrl.split('/').pop()}`)
            },
            ontimeout: () => {
                debugLog('Request timed out', noticeUrl)
                setNoticeState(noticeUrl, 'timeout', 'Request timed out after 30 seconds')
                state.timeouts.push(noticeUrl.split('/').pop())
            },
            onloadend: () => {
                state.pending--
                render()
            }
        })
    }

    function scanPage() {
        const noticeUrls = new Set()

        $('a[href]').each((_, link) => {
            const noticeUrl = getNoticeUrl(link.href)
            if (noticeUrl) {
                noticeUrls.add(noticeUrl)
            }
        })

        debugLog('Scan complete', 'detected_notices=', noticeUrls.size)

        if (!noticeUrls.size) return

        noticeUrls.forEach((noticeUrl) => {
            if (!state.processed.has(noticeUrl)) {
                fetchNotice(noticeUrl)
            }
        })
    }

    function scheduleScan() {
        window.clearTimeout(scanTimer)
        scanTimer = window.setTimeout(scanPage, 500)
    }

    scheduleScan()

    const observer = new MutationObserver(() => {
        scheduleScan()
    })

    observer.observe(document.body, { childList: true, subtree: true })
})
