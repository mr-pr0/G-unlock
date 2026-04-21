// ==UserScript==
// @name         G-unlock
// @version      1.6.1
// @namespace    45c9a6614fccd4edff9592da
// @description  G-unlock scans hidden search results that were censored by Google due to complaints
// @home         https://github.com/mr-pr0/G-unlock
// @supportURL   https://github.com/mr-pr0/G-unlock/issues
// @updateURL    https://raw.githubusercontent.com/mr-pr0/G-unlock/main/g-unlock.user.js
// @downloadURL  https://raw.githubusercontent.com/mr-pr0/G-unlock/main/g-unlock.user.js
// @author       mr-pr0
// @license      MIT License
// @icon         https://raw.githubusercontent.com/mr-pr0/G-unlock/main/extension/32.png
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

    const debugEnabled = new URLSearchParams(window.location.search).get('g-unlock-debug') === '1'

    const state = {
        domains: new Map(),
        errors: [],
        noticeStates: new Map(),
        pending: 0,
        processed: new Set(),
        timeouts: []
    }

    let scanTimer = null

    function debugLog() {
        if (!debugEnabled) return
        console.log('[G-unlock]', ...arguments)
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
        let container = $('#g-unlock-results')
        if (container.length) return container

        let mountPoint = $('#search').first()
        if (!mountPoint.length) mountPoint = $('#center_col').first()
        if (!mountPoint.length) mountPoint = $('main').first()
        if (!mountPoint.length) mountPoint = $('body').first()

        mountPoint.append(`
        <section id="g-unlock-results" style="margin:24px 0;color:#202124;">
            <h2 style="margin:0 0 12px;font-size:22px;line-height:1.3;font-weight:500;">Unlocked Results</h2>
            <div id="g-unlock-status" style="margin:0 0 12px;color:#5f6368;"></div>
            <div id="g-unlock-errors" style="margin:0 0 12px;color:#b3261e;"></div>
            <div id="g-unlock-error-details" style="margin:0 0 12px;color:#b3261e;"></div>
            <div id="g-unlock-links"></div>
            <pre id="g-unlock-debug" style="display:${debugEnabled ? 'block' : 'none'};margin:12px 0 0;padding:12px;border-radius:8px;background:#fff;border:1px solid #dadce0;color:#3c4043;white-space:pre-wrap;font:12px/1.5 monospace;"></pre>
        </section>
        `)

        return $('#g-unlock-results')
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
                <article style="margin:0 0 28px;max-width:680px;">
                    <div style="margin-bottom:2px;color:#202124;font-size:14px;line-height:1.3;">${href}</div>
                    <a href="${href}" target="_blank" rel="noopener noreferrer" style="display:inline-block;margin-bottom:4px;color:#1a0dab;font-size:22px;line-height:1.3;text-decoration:none;">${label}</a>
                    <div style="color:#4d5156;font-size:14px;line-height:1.58;">Recovered from DMCA notice data. ${item.count} removed URL${item.count === 1 ? '' : 's'} referenced for this domain.</div>
                </article>
            `
        }).join('')
    }

    function render() {
        if (!state.pending && !state.domains.size && !state.errors.length && !state.timeouts.length) {
            return
        }

        ensureContainer()

        const status = $('#g-unlock-status')
        const errors = $('#g-unlock-errors')
        const errorDetails = $('#g-unlock-error-details')
        const links = $('#g-unlock-links')
        const debug = $('#g-unlock-debug')
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
