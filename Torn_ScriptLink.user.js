// ==UserScript==
// @name         Torn ScriptLink
// @namespace    https://github.com/ShavedW00kie/
// @version      1.0.3
// @description  Coordinate Torn script lists, faction packages and device status through Google Sheets, with sanitized JSON backups.
// @author       ShavedW00kie (Torn: ThaWookie [2954173] )
// @license      BSD-3-Clause
// @match        https://www.torn.com/*
// @match        https://torn.com/*
// @run-at       document-end
// @noframes
// @grant        GM_info
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @grant        GM_setClipboard
// @grant        GM_addValueChangeListener
// @grant        GM.getValue
// @grant        GM.setValue
// @grant        GM.xmlHttpRequest
// @grant        GM.setClipboard
// @connect      script.google.com
// @connect      script.googleusercontent.com
// ==/UserScript==

/*
// @grant        GM_addStyle
// @run-at       document-end
// ==/UserScript==

/*
 * Donation UI Module
 * Version 1.4 (ScriptLink settings adapter 1.0.2)
 *
 * Reusable support/donation UI for Torn.com userscripts.
 *
 * Features:
 *   - Animated Buy Me a Coffee button
 *   - Animated coffee cup with squash-and-stretch movement
 *   - Animated steam
 *   - Animated coffee fill
 *   - Hover-to-fill coffee effect
 *   - Periodic diagonal button gleam
 *   - Animated liquid-style label transition
 *   - Torn Xanax-tip button
 *   - MutationObserver persistence against Torn/React DOM changes
 *   - TornPDA/mobile-compatible DOM implementation
 *   - Reduced-motion accessibility support
 *
 * License: BSD-3-Clause
 *
 * Copyright (c) 2026 ShavedW00kie
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * 1. Redistributions of source code must retain the above copyright notice,
 *    this list of conditions and the following disclaimer.
 *
 * 2. Redistributions in binary form must reproduce the above copyright
 *    notice, this list of conditions and the following disclaimer in the
 *    documentation and/or other materials provided with the distribution.
 *
 * 3. Neither the name of the copyright holder nor the names of its
 *    contributors may be used to endorse or promote products derived from
 *    this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */


(function (GM_info) {
    "use strict";
    if (window.top !== window.self) return;
/* Torn ScriptLink shared validation, import, export and merge logic. BSD-3-Clause. */
function createScriptLinkCore() {
    "use strict";
    const categories = Object.freeze(["Mercantile", "Aggressive", "Crime", "Entertainment", "Management", "Training & Progression", "Travel", "Quality of Life", "Utilities & Development", "Uncategorized"]);
    const platforms = Object.freeze(["Unknown", "Both", "Desktop", "TornPDA"]);
    const statuses = Object.freeze(["Unknown", "Installed", "Disabled", "Missing", "Incompatible"]);
    const maxScripts = 300;
    const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
    function decode(value) {
        let s = String(value || "");
        for (let i = 0; i < 3; i++) {
            try { const next = decodeURIComponent(s); if (next === s) break; s = next; } catch (_) { break; }
        }
        return s;
    }
    function scrub(value, limit = 500, secrets = []) {
        let s = decode(typeof value === "string" ? value : "").slice(0, 20000);
        for (const secret of secrets) if (typeof secret === "string" && secret.length >= 8) s = s.split(secret).join("[REDACTED]");
        s = s.replace(/[\u0000-\u001f\u007f]/g, " ")
            .replace(/\b(?:Bearer|Basic)\s+[^\s,;]+/gi, "[REDACTED]")
            .replace(/\b(?:api[_ -]?key|customApiKey|access[_ -]?token|refresh[_ -]?token|write[_ -]?token|token|secret|password|authorization|cookie)\s*[=:]\s*(?:"[^"]*"|'[^']*'|[^\s,;]+)/gi, "[REDACTED]")
            .replace(/\b(?:gh[pousr]_[A-Za-z0-9_]+|github_pat_[A-Za-z0-9_]+|slk_[a-f0-9]{64}|eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)\b/g, "[REDACTED]")
            .replace(/\b[A-Za-z0-9]{16}\b/g, "[REDACTED]");
        return s.trim().slice(0, limit);
    }
    function publicUrl(value, secrets = []) {
        if (typeof value !== "string" || value.length > 2000) return "";
        const m = value.trim().match(/^https:\/\/([A-Za-z0-9.-]+)(\/[^?#]*)?(?:\?([^#]*))?(?:#.*)?$/i);
        if (!m) return "";
        const host = m[1].toLowerCase();
        if (!["github.com", "raw.githubusercontent.com", "gist.github.com", "gist.githubusercontent.com", "greasyfork.org", "update.greasyfork.org", "openuserjs.org", "gitlab.com", "www.torn.com", "torn.com"].includes(host)) return "";
        const path = m[2] || "/";
        const decoded = decode(path);
        if (/\s/.test(path) || /[\u0000-\u001f\u007f\\<>"'`]/.test(decoded) || scrub(decoded, 2000, secrets) !== decoded || /(?:^|\/)(?:api|oauth|tokens?)(?:\/|$)/i.test(decoded)) return "";
        let query = "";
        if (["www.torn.com", "torn.com"].includes(host)) {
            if (path !== "/forums.php") return "";
            const params = Object.create(null);
            for (const pair of (m[3] || "").split("&")) { const [key, val] = pair.split("="); params[key] = val; }
            if (!/^\d{1,12}$/.test(params.t || "")) return "";
            query = "?p=threads&t=" + params.t;
        }
        const url = "https://" + host + path + query;
        return url.length <= 800 ? url : "";
    }
    function sourceCanonical(url) {
        const g = url.match(/^https:\/\/(?:update\.)?greasyfork\.org\/(?:[a-z-]+\/)?scripts\/(\d+)/i);
        return g ? "https://greasyfork.org/scripts/" + g[1] : url;
    }
    function stableId(value) {
        // Deterministic identity only. These hashes are never used for authentication.
        const seeds = [2166136261, 2246822519, 3266489917, 668265263];
        return "sl-" + seeds.map(seed => {
            let hash = seed;
            for (let i = 0; i < value.length; i++) hash = Math.imul(hash ^ value.charCodeAt(i), 16777619);
            return (hash >>> 0).toString(16).padStart(8, "0");
        }).join("");
    }
    function record(raw, secrets = []) {
        if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("Invalid script record.");
        const r = {
            id: "", name: scrub(raw.name, 120, secrets), namespace: scrub(raw.namespace, 200, secrets),
            sourceUrl: sourceCanonical(publicUrl(raw.sourceUrl, secrets)), downloadUrl: publicUrl(raw.downloadUrl, secrets),
            version: scrub(raw.version, 40, secrets), category: categories.includes(raw.category) ? raw.category : "Uncategorized",
            tags: scrub(raw.tags, 180, secrets), compatibility: platforms.includes(raw.compatibility) ? raw.compatibility : "Unknown",
            notes: scrub(raw.notes, 600, secrets)
        };
        if (!r.name) throw new Error("Every script needs a name.");
        const identity = r.namespace ? r.namespace + "\n" + r.name : r.sourceUrl || r.downloadUrl || r.name;
        r.id = /^sl-[a-f0-9]{32}$/.test(raw.id || "") ? raw.id : stableId(identity);
        return r;
    }
    function records(raw, secrets = []) {
        if (!Array.isArray(raw) || raw.length > maxScripts) throw new Error("A list must contain at most 300 scripts.");
        const seen = new Set();
        return raw.map(value => {
            const r = record(value, secrets);
            if (seen.has(r.id)) throw new Error("Duplicate script identity. Review the imported list.");
            seen.add(r.id); return r;
        }).sort((a, b) => a.id.localeCompare(b.id));
    }
    function deviceStates(raw, secrets = []) {
        if (!Array.isArray(raw) || raw.length > maxScripts) throw new Error("Invalid device status list.");
        const seen = new Set();
        return raw.map(r => {
            if (!r || !/^sl-[a-f0-9]{32}$/.test(r.id || "") || seen.has(r.id)) throw new Error("Invalid device status identity.");
            seen.add(r.id);
            return { id: r.id, status: statuses.includes(r.status) ? r.status : "Unknown", version: scrub(r.version, 40, secrets), checkedAt: /^\d{4}-\d\d-\d\dT[\d:.]+Z$/.test(r.checkedAt || "") ? r.checkedAt.slice(0, 30) : "" };
        }).sort((a, b) => a.id.localeCompare(b.id));
    }
    function meta(source) {
        const block = String(source || "").slice(0, 100000).match(/\/\/\s*==UserScript==([\s\S]*?)\/\/\s*==\/UserScript==/);
        if (!block) return null;
        const result = Object.create(null);
        for (const line of block[1].split(/\r?\n/)) {
            const m = line.match(/^\s*\/\/\s*@([\w:-]+)\s+(.+?)\s*$/);
            if (m) (result[m[1]] || (result[m[1]] = [])).push(m[2]);
        }
        return result;
    }
    function tornMatch(value) {
        return typeof value === "string" && /^(?:https?|\*):\/\/(?:\*\.|www\.)?torn\.com(?:\/|$)/i.test(value.trim());
    }
    function fromSource(source, hints = {}) {
        const m = meta(source);
        if (!m) return null;
        const get = key => (m[key] || [""])[0];
        const matches = [...(m.match || []), ...(m.include || []), ...(Array.isArray(hints.matches) ? hints.matches : []), ...(Array.isArray(hints.urls) ? hints.urls : [])];
        if (!matches.some(tornMatch)) return null;
        const secrets = [hints.customApiKey].filter(Boolean);
        return record({ name: get("name") || hints.name, namespace: get("namespace"), version: get("version") || hints.version,
            sourceUrl: get("homepageURL") || get("homepage") || get("website") || get("source") || get("downloadURL") || hints.url,
            downloadUrl: get("downloadURL") || hints.url || get("updateURL"), category: "Uncategorized" }, secrets);
    }
    function importText(text, filename = "") {
        if (typeof text !== "string" || text.length > 20 * 1024 * 1024) throw new Error("File is too large (20 MB maximum).");
        const trimmed = text.trim();
        if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
            const data = JSON.parse(trimmed);
            if (data && data.format === "torn-scriptlink" && data.schemaVersion === 1 && data.scope === "torn") {
                return { records: records(data.scripts), skipped: 0, kind: "ScriptLink", hasCode: false };
            }
            if (!Array.isArray(data) || data.length > maxScripts) throw new Error("Supported JSON: ScriptLink manifest or TornPDA script export.");
            const found = []; let skipped = 0;
            for (const item of data) {
                const r = item && typeof item.source === "string" ? fromSource(item.source, item) : null;
                if (r) found.push(r); else skipped++;
            }
            return { records: dedupe(found), skipped, kind: "TornPDA", hasCode: true };
        }
        const r = fromSource(text);
        return { records: r ? [r] : [], skipped: r ? 0 : 1, kind: "Userscript", hasCode: true };
    }
    function identityEqual(a, b) {
        return a.id === b.id || !!(a.namespace && a.namespace === b.namespace && a.name === b.name) || !!(a.sourceUrl && a.sourceUrl === b.sourceUrl && a.name === b.name);
    }
    function dedupe(list) {
        const result = [];
        for (const r of list) if (!result.some(x => identityEqual(x, r))) result.push(r);
        return records(result);
    }
    const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
    function merge(base, local, remote) {
        const b = new Map(base.map(r => [r.id, r])), l = new Map(local.map(r => [r.id, r])), r = new Map(remote.map(v => [v.id, v]));
        const merged = [], conflicts = [];
        for (const id of new Set([...b.keys(), ...l.keys(), ...r.keys()])) {
            const bv = b.get(id), lv = l.get(id), rv = r.get(id);
            let value;
            if (equal(lv, bv)) value = rv;
            else if (equal(rv, bv) || equal(lv, rv)) value = lv;
            else { conflicts.push({id, base: bv || null, local: lv || null, remote: rv || null}); value = lv; }
            if (value) merged.push(value);
        }
        return { merged: merged.sort((x, y) => x.id.localeCompare(y.id)), conflicts };
    }
    function manifest(list, secrets = [], packageName = "My Torn scripts") {
        return { format: "torn-scriptlink", schemaVersion: 1, scope: "torn", packageName: scrub(packageName, 100, secrets), exportedAt: new Date().toISOString(), scripts: records(list, secrets) };
    }
    return Object.freeze({ categories, platforms, statuses, maxScripts, own, scrub, publicUrl, sourceCanonical, stableId, record, records, deviceStates, meta, tornMatch, fromSource, importText, identityEqual, dedupe, equal, merge, manifest });
}

    const DEFAULT_CONFIG = Object.freeze({
        bmcId: "bittick1c",
        tornUserId: "2954173",

        containerId: "thawookie-support-module",
        styleId: "thawookie-support-module-style"
    });

    /*
     * Unique counter used for SVG clipPath IDs.
     *
     * SVG IDs are document-global. If multiple instances of this
     * module are ever created, sharing a clipPath ID can cause one
     * SVG to reference another SVG's clipping path.
     */
    let coffeeInstanceCount = 0;

    /* ============================================================
     * SUPPORT MODULE
     * ============================================================ */

    class SupportModule {
        constructor(config = {}) {
            this.config = {
                ...DEFAULT_CONFIG,
                ...config
            };

            this.observer = null;
            this.observerAttached = false;
            this.isInjecting = false;
            this.destroyed = false;

            this.init();
        }

        /* ========================================================
         * INITIALIZATION
         * ======================================================== */

        init() {
            if (this.destroyed) {
                return;
            }

            if (!this.getBody()) {
                if (document.readyState === "loading") {
                    document.addEventListener(
                        "DOMContentLoaded",
                        () => this.init(),
                        { once: true }
                    );
                }

                return;
            }

            this.injectStyles();
            this.injectUI();
            this.attachObserver();
        }

        /* ========================================================
         * DOM HELPERS
         * ======================================================== */

        getBody() {
            return this.config.host && this.config.host.isConnected ? this.config.host : null;
        }

        getContainer() {
            return document.getElementById(
                this.config.containerId
            );
        }

        isContainerConnected() {
            const container = this.getContainer();

            return Boolean(
                container &&
                container.isConnected
            );
        }

        /* ========================================================
         * STYLE INJECTION
         * ======================================================== */

        injectStyles() {
            if (this.destroyed) {
                return;
            }

            if (document.getElementById(this.config.styleId)) {
                return;
            }

            const styles = `
                /* =================================================
                 * DONATION CONTAINER
                 * ================================================= */

                #${this.config.containerId} {
                    position: static;
                    margin-top: 12px;
                    z-index: 2147483640;
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                    font-family: Arial, sans-serif;
                    box-sizing: border-box;
                    touch-action: manipulation;
                }

                /* =================================================
                 * GENERIC SUPPORT BUTTON
                 * ================================================= */

                #${this.config.containerId} .tw-support-btn {
                    box-sizing: border-box;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    min-height: 40px;
                    padding: 10px 15px;
                    border-radius: 8px;
                    font-size: 13px;
                    font-weight: bold;
                    line-height: 1.2;
                    text-align: center;
                    text-decoration: none !important;
                    cursor: pointer;
                    user-select: none;
                    -webkit-tap-highlight-color: transparent;
                    touch-action: manipulation;
                }

                #${this.config.containerId} .tw-support-btn:focus-visible {
                    outline: 2px solid #ffffff;
                    outline-offset: 2px;
                }

                /* =================================================
                 * BUY ME A COFFEE BUTTON
                 *
                 * Visual design ported from the supplied animated
                 * coffee-button implementation:
                 *
                 *   #FFDD00 yellow
                 *   black foreground
                 *   6px radius
                 *   6px 12px compact padding
                 *   11px / 600 typography
                 *   animated glare
                 *   animated cup
                 * ================================================= */

                #${this.config.containerId} .tw-bmc {
                    position: relative;
                    overflow: hidden;
                    isolation: isolate;

                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 6px;

                    width: 100%;
                    min-width: 170px;
                    min-height: 40px;

                    padding: 6px 12px;

                    background: #FFDD00;
                    color: #000000 !important;

                    border: 1px solid #FFDD00;
                    border-radius: 6px;

                    font-size: 11px;
                    font-weight: 600;
                    line-height: 1.2;

                    text-decoration: none !important;

                    box-sizing: border-box;

                    transition:
                        opacity 0.15s ease,
                        transform 0.15s ease;
                }

                /*
                 * Keep all actual button contents above the
                 * animated specular highlight.
                 */
                #${this.config.containerId} .tw-bmc > * {
                    position: relative;
                    z-index: 1;
                }

                /*
                 * Subtle interaction feedback.
                 *
                 * Hover is deliberately opacity-based rather than
                 * relying on desktop-only behavior for functionality.
                 * The button remains fully usable through touch.
                 */
                #${this.config.containerId} .tw-bmc:hover {
                    opacity: 0.9;
                }

                #${this.config.containerId} .tw-bmc:active {
                    transform: scale(0.97);
                }

                /* =================================================
                 * COFFEE CUP - SQUASH & STRETCH
                 * ================================================= */

                @keyframes sl-coffee-cup-hop {
                    0% {
                        transform:
                            translateY(0)
                            scale(1, 1);
                    }

                    18% {
                        transform:
                            translateY(0.5px)
                            scale(1.08, 0.9);
                    }

                    32% {
                        transform:
                            translateY(-2px)
                            scale(0.94, 1.08);
                    }

                    50% {
                        transform:
                            translateY(-3px)
                            scale(1, 1);
                    }

                    68% {
                        transform:
                            translateY(0)
                            scale(1.1, 0.88);
                    }

                    84% {
                        transform:
                            translateY(0)
                            scale(0.97, 1.03);
                    }

                    100% {
                        transform:
                            translateY(0)
                            scale(1, 1);
                    }
                }

                #${this.config.containerId} .tw-coffee-cup {
                    position: relative;
                    display: inline-flex;
                    flex-shrink: 0;

                    transform-origin: 50% 100%;

                    animation:
                        sl-coffee-cup-hop
                        2.4s
                        cubic-bezier(0.4, 0, 0.5, 1)
                        infinite;
                }

                /*
                 * Cup outline remains above the steam.
                 */
                #${this.config.containerId} .tw-coffee-cup > svg {
                    position: relative;
                    z-index: 1;
                    display: block;
                }

                /* =================================================
                 * STEAM
                 * ================================================= */

                #${this.config.containerId} .tw-coffee-cup::before,
                #${this.config.containerId} .tw-coffee-cup::after {
                    content: "";

                    position: absolute;

                    bottom: 74%;

                    width: 2px;
                    height: 4px;

                    border-radius: 999px;

                    background:
                        linear-gradient(
                            to top,
                            rgba(90, 58, 36, 0.5),
                            rgba(90, 58, 36, 0)
                        );

                    opacity: 0;

                    pointer-events: none;

                    will-change:
                        transform,
                        opacity;
                }

                #${this.config.containerId} .tw-coffee-cup::before {
                    left: 27%;

                    animation:
                        sl-coffee-steam
                        2.8s
                        ease-out
                        infinite;
                }

                #${this.config.containerId} .tw-coffee-cup::after {
                    left: 45%;

                    animation:
                        sl-coffee-steam
                        2.8s
                        ease-out
                        infinite;

                    animation-delay: -1.4s;
                }

                @keyframes sl-coffee-steam {
                    0% {
                        opacity: 0;

                        transform:
                            translateY(2px)
                            scale(0.6, 0.5)
                            skewX(0deg);
                    }

                    30% {
                        opacity: 0.7;

                        transform:
                            translateY(0)
                            scale(1, 0.9)
                            skewX(4deg);
                    }

                    65% {
                        opacity: 0.4;

                        transform:
                            translateY(-3px)
                            scale(0.85, 1.2)
                            skewX(-5deg);
                    }

                    100% {
                        opacity: 0;

                        transform:
                            translateY(-5px)
                            scale(0.5, 1.5)
                            skewX(6deg);
                    }
                }

                /* =================================================
                 * COFFEE FILL
                 * ================================================= */

                #${this.config.containerId} .tw-coffee-fill {
                    transform: scaleY(0.15);
                    transform-origin: 50% 100%;

                    animation:
                        sl-coffee-refill
                        7s
                        cubic-bezier(0.45, 0, 0.55, 1)
                        infinite;
                }

                @keyframes sl-coffee-refill {
                    0% {
                        transform: scaleY(0.15);
                    }

                    30% {
                        transform: scaleY(0.95);
                    }

                    55% {
                        transform: scaleY(0.75);
                    }

                    80% {
                        transform: scaleY(0.3);
                    }

                    100% {
                        transform: scaleY(0.15);
                    }
                }

                /*
                 * Hover overrides the normal coffee cycle and fills
                 * the cup completely.
                 */
                #${this.config.containerId}
                .tw-bmc:hover
                .tw-coffee-fill {
                    animation:
                        sl-coffee-fill-to-full
                        0.45s
                        cubic-bezier(0.4, 0, 0.2, 1)
                        forwards;
                }

                @keyframes sl-coffee-fill-to-full {
                    to {
                        transform: scaleY(1);
                    }
                }

                /* =================================================
                 * SPECULAR GLEAM
                 * ================================================= */

                /*
                 * A soft diagonal highlight sweeps across the
                 * yellow button every five seconds.
                 */
                #${this.config.containerId} .tw-bmc::after {
                    content: "";

                    position: absolute;

                    top: 0;
                    bottom: 0;
                    left: -60%;

                    width: 45%;

                    pointer-events: none;

                    background:
                        linear-gradient(
                            100deg,
                            transparent 0%,
                            rgba(255, 255, 255, 0.15) 35%,
                            rgba(255, 255, 255, 0.75) 50%,
                            rgba(255, 255, 255, 0.15) 65%,
                            transparent 100%
                        );

                    transform: skewX(-18deg);

                    will-change: transform;

                    animation:
                        sl-coffee-glare
                        5s
                        cubic-bezier(0.5, 0, 0.5, 1)
                        infinite;
                }

                @keyframes sl-coffee-glare {
                    0% {
                        transform:
                            translateX(0)
                            skewX(-18deg);
                    }

                    22%,
                    100% {
                        transform:
                            translateX(400%)
                            skewX(-18deg);
                    }
                }

                /* =================================================
                 * LIQUID LABEL TRANSITION
                 * ================================================= */

                #${this.config.containerId} .tw-coffee-label {
                    display: grid;
                    align-items: center;
                    justify-items: center;

                    min-width: 0;
                }

                #${this.config.containerId} .tw-coffee-label > span {
                    grid-area: 1 / 1;

                    white-space: nowrap;

                    transform-origin: 50% 50%;

                    will-change:
                        opacity,
                        transform,
                        filter;

                    animation:
                        sl-coffee-label-drip
                        7s
                        cubic-bezier(0.65, 0, 0.35, 1)
                        infinite;
                }

                /*
                 * The second label is exactly 50% out of phase,
                 * creating the alternating liquid transition.
                 */
                #${this.config.containerId}
                .tw-coffee-label
                > span:nth-child(2) {
                    animation-delay: -3.5s;
                }

                @keyframes sl-coffee-label-drip {
                    0%,
                    34% {
                        opacity: 1;

                        transform:
                            translateY(0)
                            scale(1, 1);

                        filter: blur(0);
                    }

                    38% {
                        opacity: 0.5;

                        transform:
                            translateY(2px)
                            scale(0.94, 1.08);

                        filter: blur(1.2px);
                    }

                    42% {
                        opacity: 0;

                        transform:
                            translateY(9px)
                            scale(1.06, 0.5);

                        filter: blur(4px);
                    }

                    42.01%,
                    92% {
                        opacity: 0;

                        transform:
                            translateY(-9px)
                            scale(1.06, 0.5);

                        filter: blur(4px);
                    }

                    96% {
                        opacity: 1;

                        transform:
                            translateY(1px)
                            scale(1.05, 0.9);

                        filter: blur(0);
                    }

                    98% {
                        opacity: 1;

                        transform:
                            translateY(0)
                            scale(0.99, 1.03);

                        filter: blur(0);
                    }

                    100% {
                        opacity: 1;

                        transform:
                            translateY(0)
                            scale(1, 1);

                        filter: blur(0);
                    }
                }

                /* =================================================
                 * TORN TIP BUTTON
                 * ================================================= */

                #${this.config.containerId} .tw-torn-tip {
                    background-color: #8ab63d;
                    color: #ffffff !important;

                    border: 1px solid #6a8c2f;

                    box-shadow:
                        0 4px 6px rgba(0, 0, 0, 0.3);

                    transition:
                        transform 0.2s ease,
                        background-color 0.2s ease;
                }

                #${this.config.containerId} .tw-torn-tip:active {
                    transform: scale(0.95);
                }

                /* =================================================
                 * REDUCED MOTION
                 * ================================================= */

                @media (prefers-reduced-motion: reduce) {
                    #${this.config.containerId}
                    .tw-coffee-cup {
                        animation: none;
                    }

                    #${this.config.containerId}
                    .tw-coffee-cup::before,
                    #${this.config.containerId}
                    .tw-coffee-cup::after {
                        animation: none;
                        opacity: 0;
                    }

                    #${this.config.containerId}
                    .tw-coffee-fill {
                        animation: none;
                        transform: scaleY(0.8);
                    }

                    #${this.config.containerId}
                    .tw-coffee-label > span {
                        animation: none;
                        opacity: 0;
                        filter: none;
                        transform: none;
                    }

                    #${this.config.containerId}
                    .tw-coffee-label
                    > span:nth-child(2) {
                        opacity: 1;
                    }

                    #${this.config.containerId}
                    .tw-bmc::after {
                        animation: none;
                        opacity: 0;
                    }
                }

                /* =================================================
                 * MOBILE / TORN PDA
                 * ================================================= */

                @media (max-width: 480px) {
                    #${this.config.containerId} {
                        right: 10px;
                        bottom: 10px;
                        left: 10px;

                        width: auto;
                    }

                    #${this.config.containerId}
                    .tw-support-btn {
                        width: 100%;
                    }

                    #${this.config.containerId}
                    .tw-bmc {
                        min-width: 0;
                    }
                }
            `;

            /*
             * Preferred Tampermonkey path.
             *
             * Some restricted WebViews can expose GM_addStyle but
             * still throw when it is called. Fall back safely.
             */
            this.injectStyleElement(styles);
        }

        injectStyleElement(styles) {
            if (document.getElementById(this.config.styleId)) {
                return;
            }

            const styleNode =
                document.createElement("style");

            styleNode.id =
                this.config.styleId;

            styleNode.type =
                "text/css";

            styleNode.textContent =
                styles;

            if (document.head) {
                document.head.appendChild(styleNode);
                return;
            }

            const body = this.getBody();

            if (body) {
                body.appendChild(styleNode);
            }
        }

        /* ========================================================
         * COFFEE BUTTON
         * ======================================================== */

        buildCoffeeButton() {
            coffeeInstanceCount += 1;

            const clipId =
                `torn-scriptlink-coffee-clip-${coffeeInstanceCount}`;

            const bmcLink =
                document.createElement("a");

            bmcLink.className =
                "tw-support-btn tw-bmc";

            bmcLink.href =
                `https://www.buymeacoffee.com/${encodeURIComponent(
                    this.config.bmcId
                )}`;

            bmcLink.target = "_blank";

            bmcLink.rel =
                "noopener noreferrer";

            bmcLink.title =
                "Support ThaWookie";

            bmcLink.setAttribute(
                "aria-label",
                "Buy me a coffee - support ThaWookie"
            );

            /*
             * ----------------------------------------------------
             * Animated coffee cup
             * ----------------------------------------------------
             */

            const cup =
                document.createElement("span");

            cup.className =
                "tw-coffee-cup";

            cup.setAttribute(
                "aria-hidden",
                "true"
            );

            const svg =
                document.createElementNS(
                    "http://www.w3.org/2000/svg",
                    "svg"
                );

            svg.setAttribute(
                "width",
                "16"
            );

            svg.setAttribute(
                "height",
                "16"
            );

            svg.setAttribute(
                "viewBox",
                "0 0 24 24"
            );

            svg.setAttribute(
                "fill",
                "none"
            );

            svg.setAttribute(
                "stroke",
                "currentColor"
            );

            svg.setAttribute(
                "stroke-width",
                "1.5"
            );

            svg.setAttribute(
                "aria-hidden",
                "true"
            );

            /*
             * SVG clip path.
             *
             * This is intentionally generated through DOM APIs
             * rather than innerHTML so the only dynamic value,
             * clipId, cannot become an HTML injection vector.
             */

            const defs =
                document.createElementNS(
                    "http://www.w3.org/2000/svg",
                    "defs"
                );

            const clipPath =
                document.createElementNS(
                    "http://www.w3.org/2000/svg",
                    "clipPath"
                );

            clipPath.setAttribute(
                "id",
                clipId
            );

            const clipShape =
                document.createElementNS(
                    "http://www.w3.org/2000/svg",
                    "path"
                );

            clipShape.setAttribute(
                "d",
                "M5 8h11v5a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4V8z"
            );

            clipPath.appendChild(
                clipShape
            );

            defs.appendChild(
                clipPath
            );

            svg.appendChild(
                defs
            );

            /*
             * Coffee liquid.
             *
             * The CSS transform animation controls its visible
             * fill level.
             */
            const coffeeFill =
                document.createElementNS(
                    "http://www.w3.org/2000/svg",
                    "rect"
                );

            coffeeFill.setAttribute(
                "class",
                "tw-coffee-fill"
            );

            coffeeFill.setAttribute(
                "x",
                "5"
            );

            coffeeFill.setAttribute(
                "y",
                "8"
            );

            coffeeFill.setAttribute(
                "width",
                "11"
            );

            coffeeFill.setAttribute(
                "height",
                "9"
            );

            coffeeFill.setAttribute(
                "fill",
                "#6f4e37"
            );

            coffeeFill.setAttribute(
                "stroke",
                "none"
            );

            coffeeFill.setAttribute(
                "clip-path",
                `url(#${clipId})`
            );

            svg.appendChild(
                coffeeFill
            );

            /*
             * Cup body outline.
             */
            const cupBody =
                document.createElementNS(
                    "http://www.w3.org/2000/svg",
                    "path"
                );

            cupBody.setAttribute(
                "stroke-linecap",
                "round"
            );

            cupBody.setAttribute(
                "stroke-linejoin",
                "round"
            );

            cupBody.setAttribute(
                "d",
                "M5 8h11v5a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4V8z"
            );

            svg.appendChild(
                cupBody
            );

            /*
             * Cup handle.
             */
            const cupHandle =
                document.createElementNS(
                    "http://www.w3.org/2000/svg",
                    "path"
                );

            cupHandle.setAttribute(
                "stroke-linecap",
                "round"
            );

            cupHandle.setAttribute(
                "stroke-linejoin",
                "round"
            );

            cupHandle.setAttribute(
                "d",
                "M16 9h2.5a2.5 2.5 0 0 1 0 5H16"
            );

            svg.appendChild(
                cupHandle
            );

            cup.appendChild(
                svg
            );

            bmcLink.appendChild(
                cup
            );

            /*
             * ----------------------------------------------------
             * Animated label
             * ----------------------------------------------------
             */

            const label =
                document.createElement("span");

            label.className =
                "tw-coffee-label";

            label.setAttribute(
                "aria-hidden",
                "true"
            );

            const supportLabel =
                document.createElement("span");

            supportLabel.textContent =
                "Support the project?";

            const coffeeLabel =
                document.createElement("span");

            coffeeLabel.textContent =
                "Buy me a coffee";

            label.appendChild(
                supportLabel
            );

            label.appendChild(
                coffeeLabel
            );

            bmcLink.appendChild(
                label
            );

            return bmcLink;
        }

        /* ========================================================
         * UI INJECTION
         * ======================================================== */

        injectUI() {
            if (
                this.destroyed ||
                this.isInjecting
            ) {
                return;
            }

            const body =
                this.getBody();

            if (!body) {
                return;
            }

            if (this.isContainerConnected()) {
                return;
            }

            this.isInjecting = true;

            try {
                /*
                 * Remove stale disconnected node, if present.
                 */
                const existingContainer =
                    this.getContainer();

                if (existingContainer) {
                    existingContainer.remove();
                }

                const container =
                    document.createElement("div");

                container.id =
                    this.config.containerId;

                container.setAttribute(
                    "role",
                    "complementary"
                );

                container.setAttribute(
                    "aria-label",
                    "Support ThaWookie"
                );

                /*
                 * Animated Buy Me a Coffee button.
                 */
                const bmcLink =
                    this.buildCoffeeButton();

                /*
                 * ------------------------------------------------
                 * Torn Xanax Tip
                 * ------------------------------------------------
                 */

                const tipLink =
                    document.createElement("a");

                tipLink.href =
                    "https://www.torn.com/item.php";

                tipLink.target =
                    "_blank";

                tipLink.rel =
                    "noopener noreferrer";

                tipLink.className =
                    "tw-support-btn tw-torn-tip";

                tipLink.title =
                    `Opens Items - search "Xanax", ` +
                    `tap Send, enter ThaWookie ` +
                    `[${this.config.tornUserId}]`;

                tipLink.setAttribute(
                    "aria-label",
                    `Send a Xanax tip to ThaWookie ` +
                    `[${this.config.tornUserId}]`
                );

                tipLink.textContent =
                    "💊 Send a Xanax Tip";

                /*
                 * Assemble donation controls.
                 */
                container.appendChild(
                    bmcLink
                );

                container.appendChild(
                    tipLink
                );

                /*
                 * Append to the host settings slot outside the React subtree.
                 */
                body.appendChild(
                    container
                );
            } finally {
                this.isInjecting = false;
            }
        }

        /* ========================================================
         * MUTATION OBSERVER
         * ======================================================== */

        attachObserver() {
            if (
                this.destroyed ||
                this.observerAttached ||
                typeof MutationObserver === "undefined"
            ) {
                return;
            }

            const body =
                this.getBody();

            if (!body) {
                return;
            }

            this.observer =
                new MutationObserver(
                    (mutationList) => {
                        if (
                            this.destroyed ||
                            this.isInjecting
                        ) {
                            return;
                        }

                        let relevantMutation =
                            false;

                        for (
                            const mutation
                            of mutationList
                        ) {
                            if (
                                mutation.type !==
                                "childList"
                            ) {
                                continue;
                            }

                            if (
                                mutation.removedNodes
                                    .length > 0
                            ) {
                                relevantMutation =
                                    true;

                                break;
                            }
                        }

                        if (
                            !relevantMutation
                        ) {
                            return;
                        }

                        if (
                            !this.isContainerConnected()
                        ) {
                            this.injectStyles();
                            this.injectUI();
                        }
                    }
                );

            this.observer.observe(
                body,
                {
                    childList: true,
                    subtree: false
                }
            );

            this.observerAttached = true;
        }

        /* ========================================================
         * CLEANUP
         * ======================================================== */

        destroy() {
            this.destroyed = true;

            if (this.observer) {
                try {
                    this.observer.disconnect();
                } catch (_) {
                    /*
                     * Nothing further required.
                     */
                }
            }

            this.observer = null;
            this.observerAttached = false;

            const container =
                this.getContainer();

            if (container) {
                container.remove();
            }
        }
    }


    const Core = createScriptLinkCore();
    const APP_VERSION = "1.0.3";
    const MyDebug = initializeModularDebugger(GM_info.script.name);
    const CACHE_KEY = "torn-scriptlink:data:v1", CONFIG_KEY = "torn-scriptlink:connection:v1";
    const isPDA = typeof PDA_httpPost === "function" || /pda/i.test(GM_info.scriptHandler || "");
    const nativeStorage = typeof PDA_storage !== "undefined" && typeof PDA_storage.get === "function" ? PDA_storage : null;
    const gmRead = typeof GM_getValue === "function" ? (k, d) => Promise.resolve(GM_getValue(k, d)) : typeof GM !== "undefined" && typeof GM.getValue === "function" ? (k, d) => GM.getValue(k, d) : null;
    const gmWrite = typeof GM_setValue === "function" ? (k, v) => Promise.resolve(GM_setValue(k, v)) : typeof GM !== "undefined" && typeof GM.setValue === "function" ? (k, v) => GM.setValue(k, v) : null;
    const privateStore = !!nativeStorage || !!(gmRead && gmWrite && !isPDA);
    const localAdapter = {
        async get(key, fallback) {
            if (nativeStorage) return nativeStorage.get(key, fallback);
            if (gmRead && gmWrite) return gmRead(key, fallback);
            try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : fallback; } catch (_) { return fallback; }
        },
        async set(key, value) {
            if (nativeStorage) return nativeStorage.set(key, value);
            if (gmRead && gmWrite) return gmWrite(key, value);
            localStorage.setItem(key, JSON.stringify(value));
        }
    };
    const blank = () => ({format: 1, scripts: [], baseScripts: [], states: [], baseStates: [], revision: 0, catalog: [], devices: [], conflicts: [], bound: "", lastSync: "", deviceId: ""});
    let data = blank(), config = {endpoint: "", credential: "", auto: true}, root, panel, listArea, settingsArea, messageArea, nav, stats, support;
    let view = "All", search = "", packageFilter = "", statusFilter = "All statuses", showSettings = false, busy = false, syncTimer, retryAt = 0, failures = 0, pendingImport = [], editOriginal = null;
    let localQueue = Promise.resolve();
    const lockLocal = task => {
        const run = () => navigator.locks && navigator.locks.request ? navigator.locks.request("torn-scriptlink-v1", task) : task();
        const job = localQueue.then(run); localQueue = job.catch(() => {}); return job;
    };
    function normalizeCache(raw) {
        if (!raw || raw.format !== 1) return blank();
        return {...blank(), scripts: Core.records(raw.scripts || []), baseScripts: Core.records(raw.baseScripts || []), states: Core.deviceStates(raw.states || []), baseStates: Core.deviceStates(raw.baseStates || []),
            revision: Number.isSafeInteger(raw.revision) ? raw.revision : 0, catalog: cleanCatalog(raw.catalog || []), devices: cleanDevices(raw.devices || []),
            conflicts: Array.isArray(raw.conflicts) ? raw.conflicts.slice(0, 600) : [], bound: typeof raw.bound === "string" ? raw.bound : "", lastSync: Core.scrub(raw.lastSync, 40), deviceId: typeof raw.deviceId === "string" ? raw.deviceId : ""};
    }
    function cleanCatalog(raw) {
        if (!Array.isArray(raw) || raw.length > 300) throw new Error("Invalid faction catalog.");
        return raw.map(r => ({...Core.record(r, [config.credential]), supported: r.supported === true, packages: Core.scrub(r.packages, 180, [config.credential]), reviewedAt: Core.scrub(r.reviewedAt, 60)}));
    }
    function cleanDevices(raw) {
        if (!Array.isArray(raw) || raw.length > 10) throw new Error("Invalid device list.");
        return raw.map(d => ({id: String(d.id || "").slice(0, 80), label: Core.scrub(d.label, 80), platform: Core.platforms.includes(d.platform) ? d.platform : "Unknown", states: Core.deviceStates(d.states || [])}));
    }
    async function persist() { await localAdapter.set(CACHE_KEY, data); }
    async function reload() { data = normalizeCache(await localAdapter.get(CACHE_KEY, blank())); }
    async function change(mutator) {
        await lockLocal(async () => { await reload(); mutator(); data.scripts = Core.records(data.scripts, [config.credential]); data.states = Core.deviceStates(data.states, [config.credential]); await persist(); });
        renderList(); scheduleSync();
    }
    function notify(text, error = false) {
        if (messageArea) { messageArea.textContent = Core.scrub(text, 1000, [config.credential]); messageArea.classList.toggle("sl-error", error); }
    }
    async function action(fn) {
        if (busy) return;
        busy = true; setBusy();
        try { await fn(); } catch (e) { notify(e.message || "Action failed.", true); MyDebug.log({event: "Action failed", message: Core.scrub(e.message, 200, [config.credential])}, "ERROR"); }
        finally { busy = false; setBusy(); }
    }
    function setBusy() {
        if (!panel) return;
        panel.setAttribute("aria-busy", String(busy));
        panel.querySelectorAll("button,input,select,textarea").forEach(node => { if (!node.classList.contains("sl-close")) node.disabled = busy; });
    }
    function endpoint(value) {
        const m = String(value || "").trim().match(/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/);
        if (!m) throw new Error("Use the deployed Google Apps Script URL ending in /exec, without query parameters.");
        return m[0];
    }
    function randomId() {
        if (!globalThis.crypto || !crypto.getRandomValues) throw new Error("This browser needs secure random-number support.");
        const bytes = new Uint8Array(16); crypto.getRandomValues(bytes); return Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("");
    }
    function request(payload) {
        const url = endpoint(config.endpoint), body = JSON.stringify({...payload, protocol: 1, credential: config.credential});
        return new Promise((resolve, reject) => {
            let done = false, redirects = 0;
            const finish = (error, response) => { if (done) return; done = true; clearTimeout(timer); if (error) reject(error); else resolve(response); };
            // A network deadline only. Never used to find elements.
            const timer = setTimeout(() => finish(new Error("Sync timed out. Your local list is retained; retry to check whether the server saved it.")), 35000);
            const onload = response => {
                if (done) return;
                if (response && [301, 302, 303].includes(response.status)) {
                    const match = String(response.responseHeaders || "").match(/^location:\s*(https:\/\/script\.googleusercontent\.com\/macros\/echo\?[^\r\n\s]+)\s*$/im);
                    if (!match || ++redirects > 2) return finish(new Error("Unexpected sync redirect. Check the deployment is accessible without a Google sign-in."));
                    // Apps Script's one-time response URL contains no client credential.
                    // PDA's native POST may return a 302 instead of following it.
                    // Fetch only the Google response with GET; never resend the POST body.
                    const redirected = match[1];
                    if (typeof PDA_httpGet === "function") Promise.resolve(PDA_httpGet(redirected, {})).then(onload, failure);
                    else {
                        const gmGet = typeof GM_xmlhttpRequest === "function" ? GM_xmlhttpRequest : typeof GM !== "undefined" && typeof GM.xmlHttpRequest === "function" ? GM.xmlHttpRequest.bind(GM) : null;
                        if (gmGet) {try {const request = gmGet({method: "GET", url: redirected, anonymous: true, timeout: 30000, onload, onerror: failure, ontimeout: failure}); if (request && typeof request.catch === "function") request.catch(failure);} catch (_) {failure();}}
                        else fetch(redirected, {credentials: "omit"}).then(async r => onload({status: r.status, responseText: await r.text()}), failure).catch(failure);
                    }
                    return;
                }
                if (!response || response.status < 200 || response.status >= 300) return finish(new Error("Sync HTTP request failed. Check the deployment and network."));
                try {
                    if (typeof response.responseText !== "string" || response.responseText.length > 1500000) throw new Error();
                    const parsed = JSON.parse(response.responseText);
                    if (!parsed || typeof parsed.ok !== "boolean") throw new Error();
                    finish(null, parsed);
                } catch (_) { finish(new Error("Expected ScriptLink JSON. Check deployment access is Anyone and both Google domains are allowed.")); }
            };
            const failure = () => finish(new Error("Cannot reach Sheets. Your local list is retained."));
            try {
                if (typeof PDA_httpPost === "function") {
                    Promise.resolve(PDA_httpPost(url, {"Content-Type": "text/plain;charset=utf-8"}, body)).then(onload, failure);
                } else {
                    const gmRequest = typeof GM_xmlhttpRequest === "function" ? GM_xmlhttpRequest : typeof GM !== "undefined" && typeof GM.xmlHttpRequest === "function" ? GM.xmlHttpRequest.bind(GM) : null;
                    if (gmRequest) {
                        const result = gmRequest({method: "POST", url, headers: {"Content-Type": "text/plain;charset=utf-8"}, data: body, timeout: 30000, anonymous: true, onload, onerror: failure, ontimeout: failure});
                        if (result && typeof result.catch === "function") result.catch(failure);
                    } else {
                        // Standard Web API fallback is attempted only when no manager bridge exists.
                        fetch(url, {method: "POST", headers: {"Content-Type": "text/plain;charset=utf-8"}, body, credentials: "omit", redirect: "follow"})
                            .then(async r => onload({status: r.status, responseText: await r.text()}), failure).catch(failure);
                    }
                }
            } catch (_) { failure(); }
        });
    }
    function responseData(remote) {
        if (remote.protocol !== 1 || !/^\d{1,10}$/.test(remote.memberId || "") || !remote.device || !/^d-[a-f0-9-]{36}$/.test(remote.device.id || "") || !Number.isSafeInteger(remote.revision) || remote.revision < 0) throw new Error("Invalid sync response.");
        const bound = config.endpoint + "|" + remote.memberId;
        if (data.bound && data.bound !== bound) throw new Error("This connection belongs to another profile. Export your list, then use Start separate profile in Settings before connecting it.");
        const devices = cleanDevices(remote.devices), current = devices.find(d => d.id === remote.device.id);
        return {scripts: Core.records(remote.scripts, [config.credential]), states: current ? current.states : [], devices, catalog: cleanCatalog(remote.catalog), bound, revision: remote.revision, deviceId: remote.device.id};
    }
    function adopt(remote, mergeLocal) {
        const r = responseData(remote);
        const sameDevice = !data.deviceId || data.deviceId === r.deviceId;
        const sm = mergeLocal ? Core.merge(data.baseScripts, data.scripts, r.scripts) : {merged: r.scripts, conflicts: []};
        const dm = mergeLocal && sameDevice ? Core.merge(data.baseStates, data.states, r.states) : {merged: r.states, conflicts: []};
        data = {...data, scripts: sm.merged, states: dm.merged.filter(s => sm.merged.some(r => r.id === s.id)), baseScripts: r.scripts, baseStates: r.states,
            bound: r.bound, revision: r.revision, devices: r.devices, catalog: r.catalog, deviceId: r.deviceId,
            conflicts: [...sm.conflicts.map(c => ({...c, kind: "script"})), ...dm.conflicts.map(c => ({...c, kind: "device"}))]};
    }
    function dirty() { return !Core.equal(data.scripts, data.baseScripts) || !Core.equal(data.states, data.baseStates); }
    async function sync() {
        if (!config.endpoint || !config.credential) { notify("Open Settings to connect this device to Sheets. JSON import and export also work offline."); return; }
        if (data.conflicts.length) { notify("Resolve the listed conflicts before syncing.", true); return; }
        await lockLocal(async () => {
            await reload();
            if (data.conflicts.length) throw new Error("Resolve the listed conflicts first.");
            notify("Syncing with Sheets..."); MyDebug.log({event: "Sync started", scripts: data.scripts.length});
            try {
                const remote = await request({action: "read"});
                if (!remote.ok) throw new Error("Sheets response: " + Core.scrub(remote.code, 80));
                adopt(remote, true); await persist();
                if (data.conflicts.length) { notify("Concurrent edits need your choice. Both versions are retained below.", true); renderList(); return; }
                if (dirty()) {
                    const result = await request({action: "save", baseRevision: data.revision, requestId: randomId(), scripts: Core.records(data.scripts, [config.credential]), deviceStates: Core.deviceStates(data.states, [config.credential])});
                    if (result.code === "CONFLICT") { adopt(result, true); await persist(); notify("Another device saved first. Review conflicts, then Sync now again.", true); renderList(); return; }
                    if (!result.ok) throw new Error("Sheets response: " + Core.scrub(result.code, 80));
                    adopt(result, false);
                }
                data.lastSync = new Date().toISOString(); await persist(); failures = 0; retryAt = 0;
                notify("Synced. Device status is manually confirmed; installation is managed by Tampermonkey or TornPDA.");
                MyDebug.log({event: "Sync completed", revision: data.revision, scripts: data.scripts.length});
            } catch (e) { failures++; retryAt = Date.now() + Math.min(900000, 30000 * 2 ** Math.min(failures, 5)); await persist(); throw e; }
            finally { renderList(); }
        });
    }
    function scheduleSync() {
        clearTimeout(syncTimer);
        if (!config.auto || !config.endpoint || !config.credential || data.conflicts.length || document.hidden) return;
        // Coalesce network writes; this timer does not observe or wait for DOM elements.
        syncTimer = setTimeout(() => { if (!busy) void action(sync); }, Math.max(3000, retryAt - Date.now()));
    }
    function el(tag, text, className) { const node = document.createElement(tag); if (text !== undefined) node.textContent = text; if (className) node.className = className; return node; }
    function button(text, fn, title) { const node = el("button", text); node.type = "button"; if (title) {node.title = title; node.setAttribute("aria-label", title);} node.addEventListener("click", () => void action(fn)); return node; }
    function select(options, value, handler) {
        const node = el("select"); for (const option of options) { const item = el("option", option); item.value = option; node.append(item); } node.value = value;
        if (handler) node.addEventListener("change", () => void action(() => handler(node.value))); return node;
    }
    function link(url, text, title) { const a = el("a", text); a.href = url; a.target = "_blank"; a.rel = "noopener noreferrer"; a.title = title || text; a.setAttribute("aria-label", title || text); return a; }
    function field(label, input) { const box = el("label", undefined, "sl-field"); box.append(el("span", label), input); return box; }
    function textInput(value = "", placeholder = "") { const input = el("input"); input.value = value; input.placeholder = placeholder; return input; }
    function allRecords() {
        const result = data.scripts.map(r => ({...r, mine: true, faction: data.catalog.find(c => Core.identityEqual(r, c)) || null}));
        for (const c of data.catalog) if (!result.some(r => Core.identityEqual(r, c))) result.push({...Core.record(c), mine: false, faction: c});
        return result.sort((a, b) => a.name.localeCompare(b.name));
    }
    function filtered() {
        return allRecords().filter(r => {
            if (view === "My scripts" && !r.mine) return false;
            if (view === "Faction supported" && !r.faction?.supported) return false;
            if (view === "Packages" && (!packageFilter || !(r.faction?.packages || "").split(",").map(x => x.trim()).includes(packageFilter))) return false;
            if (Core.categories.includes(view) && r.category !== view) return false;
            const status = data.states.find(s => s.id === r.id)?.status || "Unknown";
            if (statusFilter !== "All statuses" && status !== statusFilter) return false;
            return !search || [r.name, r.tags, r.notes, r.category].join(" ").toLowerCase().includes(search);
        });
    }
    function renderList() {
        if (!listArea) return;
        nav.querySelectorAll("button").forEach(b => {const active = b.textContent === view; b.classList.toggle("sl-active", active); b.setAttribute("aria-pressed", String(active));});
        listArea.replaceChildren();
        stats.textContent = `${data.scripts.length} in your list · ${data.catalog.filter(c => c.supported).length} faction supported · ${dirty() ? "Changes pending" : "No pending changes"}${data.lastSync ? " · Last sync " + new Date(data.lastSync).toLocaleString() : ""}`;
        if (data.conflicts.length) renderConflicts();
        if (view === "Packages") {
            const names = [...new Set(data.catalog.flatMap(c => (c.packages || "").split(",").map(x => x.trim()).filter(Boolean)))].sort();
            if (!names.includes(packageFilter)) packageFilter = names[0] || "";
            if (names.length) listArea.append(field("Faction package", select(names, packageFilter, v => {packageFilter = v; renderList();})), button("Add package to my list", () => addMany(filtered())));
            else listArea.append(el("p", "No packages yet. The owner can enter comma-separated package names in Catalog column K."));
        }
        const rows = filtered();
        if (!rows.length) listArea.append(el("p", "No matching scripts. Add one or import a TornPDA JSON export / extracted .user.js files."));
        for (const r of rows) {
            const card = el("article", undefined, "sl-card");
            const head = el("div", undefined, "sl-row"), title = el("strong", r.name);
            head.append(title, el("span", r.category, "sl-chip"));
            if (r.faction?.supported) head.append(el("span", "Faction supported", "sl-chip sl-supported"));
            if (r.sourceUrl) head.append(link(r.sourceUrl, "🔗", "Source page for " + r.name));
            if (r.downloadUrl) head.append(link(r.downloadUrl, "Install", "Open installer for " + r.name));
            card.append(head, el("p", `${r.mine ? "In your list" : "Catalog only"} · Compatibility: ${r.compatibility} · Reference version: ${r.version || "unknown"}`, "sl-muted"));
            if (r.tags) card.append(el("p", "Tags: " + r.tags));
            if (r.notes) card.append(el("p", r.notes));
            if (r.faction?.version) card.append(el("p", "Faction reference version: " + r.faction.version + (r.faction.reviewedAt ? " · Reviewed " + r.faction.reviewedAt : ""), "sl-muted"));
            if (!r.sourceUrl && !r.downloadUrl) card.append(el("p", "Source link missing or blocked by sanitization. Edit to add a public source.", "sl-warning"));
            const controls = el("div", undefined, "sl-row");
            if (r.mine) {
                const status = data.states.find(s => s.id === r.id)?.status || "Unknown";
                controls.append(field("This device (manual)", select(Core.statuses, status, value => change(() => {
                    data.states = data.states.filter(s => s.id !== r.id); data.states.push({id: r.id, status: value, version: "", checkedAt: new Date().toISOString()});
                }))), button("Edit", () => showEditor(r)), button("Remove from list", async () => {
                    if (!confirm("Remove " + r.name + " from your shared list? This does not uninstall it. Its device status entries will also be removed.")) return;
                    await change(() => {data.scripts = data.scripts.filter(s => s.id !== r.id); data.states = data.states.filter(s => s.id !== r.id);});
                }));
                for (const d of data.devices.filter(d => d.id !== data.deviceId)) {const state = d.states.find(s => s.id === r.id); if (state) card.append(el("p", `${d.label}: ${state.status}${state.version ? " v" + state.version : ""}${state.checkedAt ? " · " + new Date(state.checkedAt).toLocaleDateString() : ""}`, "sl-muted"));}
            } else controls.append(button("Add to my list", () => addMany([r])));
            card.append(controls); listArea.append(card);
        }
        setBusy();
    }
    async function addMany(rows, overwrite = false) {
        await change(() => {
            for (const raw of rows) {
                const r = Core.record(raw, [config.credential]), existing = data.scripts.find(s => Core.identityEqual(s, r));
                if (!existing) data.scripts.push(r);
                else if (overwrite) data.scripts[data.scripts.indexOf(existing)] = {...r, id: existing.id};
            }
        });
        notify("List updated. Imported entries start with unknown installation status on this device.");
    }
    function renderConflicts() {
        const box = el("section", undefined, "sl-conflicts"); box.append(el("h3", "Choose which version to keep"));
        data.conflicts.forEach((conflict, index) => {
            const item = el("div", undefined, "sl-card");
            item.append(el("strong", conflict.kind === "device" ? "Device status conflict" : (conflict.local?.name || conflict.remote?.name || "Removed script")));
            for (const side of ["local", "remote"]) {
                const value = conflict[side];
                item.append(el("pre", side + ": " + (value ? JSON.stringify(value, null, 2) : "Removed")), button("Keep " + side, () => change(() => {
                    const current = data.conflicts[index]; if (!current || current.id !== conflict.id || current.kind !== conflict.kind) throw new Error("Conflict list changed; review again.");
                    const key = conflict.kind === "device" ? "states" : "scripts";
                    data[key] = data[key].filter(r => r.id !== conflict.id);
                    if (value) data[key].push(conflict.kind === "device" ? Core.deviceStates([value])[0] : Core.record(value));
                    data.conflicts.splice(index, 1);
                })));
            }
            box.append(item);
        }); listArea.append(box);
    }
    function showEditor(raw = null) {
        const old = panel.querySelector(".sl-editor"); if (old) old.remove();
        editOriginal = raw ? Core.record(raw) : null;
        const box = el("section", undefined, "sl-editor sl-card"), form = el("form");
        box.append(el("h3", raw ? "Edit script" : "Add a Torn script"));
        const controls = {
            name: textInput(raw?.name || ""), namespace: textInput(raw?.namespace || ""), sourceUrl: textInput(raw?.sourceUrl || "", "https://greasyfork.org/... or https://github.com/..."),
            downloadUrl: textInput(raw?.downloadUrl || ""), version: textInput(raw?.version || ""), category: select(Core.categories, raw?.category || "Uncategorized"),
            tags: textInput(raw?.tags || "", "trading, abroad, inventory"), compatibility: select(Core.platforms, raw?.compatibility || "Unknown"), notes: el("textarea")
        };
        controls.notes.value = raw?.notes || "";
        const labels = {name: "Name", namespace: "Namespace (optional)", sourceUrl: "Public source page", downloadUrl: "Public installation URL (optional)", version: "Reference version (optional)", category: "Category", tags: "Tags", compatibility: "Compatibility (your assessment)", notes: "Notes (never put credentials here)"};
        for (const [key, input] of Object.entries(controls)) form.append(field(labels[key], input));
        const torn = el("input"); torn.type = "checkbox"; torn.checked = !!raw;
        form.append(field("I confirm this is a script used for Torn", torn));
        const installedVersion = textInput(data.states.find(s => s.id === raw?.id)?.version || "");
        if (raw) form.append(field("Installed version on this device (manual, optional)", installedVersion));
        form.append(button("Save script", async () => {
            if (!torn.checked) throw new Error("Confirm that this script is for Torn.");
            const value = {}; for (const [key, input] of Object.entries(controls)) value[key] = input.value;
            if (!value.name.trim()) throw new Error("Enter the script name.");
            for (const key of ["sourceUrl", "downloadUrl"]) if (value[key] && !Core.publicUrl(value[key], [config.credential])) throw new Error("The " + labels[key] + " is not an allowed public source URL, or contains a possible credential.");
            const r = Core.record({...value, ...(raw ? {id: raw.id} : {})}, [config.credential]);
            await change(() => {
                const current = data.scripts.find(s => s.id === r.id);
                if (editOriginal && !Core.equal(current, editOriginal)) throw new Error("This script changed in another tab. Reopen Edit to avoid overwriting it.");
                if (!raw && data.scripts.some(s => Core.identityEqual(s, r))) throw new Error("This script is already in your list.");
                data.scripts = data.scripts.filter(s => s.id !== r.id); data.scripts.push(r);
                if (raw && installedVersion.value.trim()) {const prior = data.states.find(s => s.id === r.id); data.states = data.states.filter(s => s.id !== r.id); data.states.push({id: r.id, status: prior?.status || "Unknown", version: Core.scrub(installedVersion.value, 40), checkedAt: new Date().toISOString()});}
            }); box.remove(); notify("Saved. Public URLs have tracking/query parameters removed; possible credentials are redacted.");
        }), button("Cancel", () => box.remove()));
        form.addEventListener("submit", event => event.preventDefault()); box.append(form); listArea.before(box); controls.name.focus();
    }
    async function importFiles(files) {
        if (!files.length) return;
        if (files.length > 300 || files.reduce((n, f) => n + f.size, 0) > 25 * 1024 * 1024) throw new Error("Select at most 300 files, totaling no more than 25 MB.");
        let rows = [], skipped = 0;
        for (const file of files) {
            if (/\.zip$/i.test(file.name)) throw new Error("Extract your Tampermonkey ZIP first, then select its .user.js files. Do not select options or storage files.");
            const parsed = Core.importText(await file.text(), file.name); rows.push(...parsed.records); skipped += parsed.skipped;
        }
        pendingImport = Core.dedupe(rows);
        const old = panel.querySelector(".sl-import-preview"); if (old) old.remove();
        const box = el("section", undefined, "sl-import-preview sl-card");
        const overwrite = el("input"); overwrite.type = "checkbox";
        box.append(el("h3", "Review sanitized import"), el("p", `${pendingImport.length} Torn scripts found; ${skipped} unrecognized or non-Torn entries skipped. Source code, API keys and manager settings are excluded.`), field("Replace metadata for matching entries (default keeps existing entries)", overwrite));
        const preview = el("textarea"); preview.readOnly = true; preview.value = JSON.stringify(Core.manifest(pendingImport, [config.credential]), null, 2); preview.style.height = "180px";
        box.append(preview, button("Import these entries", async () => {await addMany(pendingImport, overwrite.checked); pendingImport = []; box.remove();}), button("Cancel", () => {pendingImport = []; box.remove();}));
        listArea.before(box); MyDebug.log({event: "Import preview ready", accepted: rows.length, skipped});
    }
    function exportList(rows, label) {
        const payload = JSON.stringify(Core.manifest(rows, [config.credential], label), null, 2);
        const box = el("section", undefined, "sl-export sl-card"), text = el("textarea"); text.readOnly = true; text.value = payload; text.style.height = "200px";
        const url = URL.createObjectURL(new Blob([payload], {type: "application/json"}));
        const a = link(url, "Download sanitized JSON"); a.removeAttribute("target"); a.download = "Torn_ScriptLink_" + new Date().toISOString().slice(0, 10) + ".json";
        box.append(el("h3", "Backup / share this list"), el("p", "Review before sharing. Credentials, device identity, installation states and script code are not included. This is a ScriptLink manifest, not a TornPDA installer backup."), a);
        if (isPDA && window.flutter_inappwebview && typeof window.flutter_inappwebview.callHandler === "function") box.append(button("Save / share JSON in TornPDA", async () => {
            const bytes = new TextEncoder().encode(payload); let binary = "";
            for (const byte of bytes) binary += String.fromCharCode(byte);
            const result = await window.flutter_inappwebview.callHandler("shareFile", {base64Data: btoa(binary), fileName: a.download});
            if (!result || result.status !== "success") throw new Error("Native file sharing is unavailable. Use Download or Copy JSON.");
        }));
        box.append(text,
            button("Copy JSON", async () => {text.select(); if (typeof GM_setClipboard === "function") await Promise.resolve(GM_setClipboard(payload, "text")); else if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(payload); else if (!document.execCommand("copy")) throw new Error("Select the JSON and copy it manually."); notify("Sanitized manifest copied.");}),
            button("Close preview", () => {URL.revokeObjectURL(url); box.remove();}));
        const old = panel.querySelector(".sl-export"); if (old) {const a = old.querySelector("a"); if (a) URL.revokeObjectURL(a.href); old.remove();}
        listArea.before(box);
    }
    function renderSettings() {
        if (settingsArea.childElementCount) return;
        settingsArea.append(el("h3", "Sheets connection"), el("p", "One private workbook, one credential per device. Use the same member ID for your phone and PC. No Torn API key is needed."));
        const url = textInput(config.endpoint, "https://script.google.com/macros/s/.../exec"), token = textInput("", "Paste your device credential; leave blank to keep it"); token.type = "password"; token.autocomplete = "off";
        const auto = el("input"); auto.type = "checkbox"; auto.checked = config.auto;
        settingsArea.append(field("Apps Script deployment URL", url), field("Device credential", token), field("Sync after edits and when returning to Torn", auto),
            button("Save connection and sync", async () => {
                const newEndpoint = endpoint(url.value), credential = token.value.trim() || config.credential;
                if (!/^slk_[a-f0-9]{64}$/.test(credential)) throw new Error("Paste the credential issued by the workbook owner. This is not a Torn API key.");
                config = {endpoint: newEndpoint, credential, auto: auto.checked}; token.value = "";
                await localAdapter.set(CONFIG_KEY, privateStore ? config : {...config, credential: ""}); await sync();
            }), button("Disconnect", async () => {clearTimeout(syncTimer); config = {...config, credential: ""}; token.value = ""; await localAdapter.set(CONFIG_KEY, config); notify("Credential removed from this device. Your cached list remains available.");}),
            button("Start separate profile", async () => {
                if (!confirm("Have you exported any unsynced changes? This clears this device's local list and connection. It does not delete anything from Sheets.")) return;
                clearTimeout(syncTimer); await lockLocal(async () => {data = blank(); await persist();}); config = {endpoint: "", credential: "", auto: true}; await localAdapter.set(CONFIG_KEY, config); url.value = ""; token.value = ""; renderList(); notify("Local profile cleared. You can connect another profile or import a backup.");
            }));
        settingsArea.append(el("p", privateStore ? "Device credentials are stored in the manager or native PDA script storage, excluded from every ScriptLink export." : "This environment has no recognized private storage. The credential stays in memory and must be re-entered after a reload. Lists can still be cached.", "sl-muted"));
        settingsArea.append(el("p", "Imported broad-match scripts without an explicit torn.com target are skipped. You may add them manually after confirming they are for Torn. A source link or an imported manifest is not a security review."));
        const debug = el("div", undefined, "sl-row");
        debug.append(button("🪲", () => MyDebug.toggleView(), "Open debugger"));
        const copy = el("button", "📋 Copy Logs to Clipboard"); copy.type = "button"; copy.addEventListener("click", function () { void MyDebug.copy(this); }); debug.append(copy);
        settingsArea.append(el("h3", "Diagnostics & support"), debug);
        const slot = el("div"); slot.id = "torn-scriptlink-support-slot"; settingsArea.append(slot);
        support = new SupportModule({containerId: "torn-scriptlink-support", styleId: "torn-scriptlink-support-style", host: slot});
    }
    function mount() {
        if (!document.body) return;
        if (root) {if (!root.isConnected) document.body.append(root); return;}
        root = el("div"); root.id = "torn-scriptlink";
        const style = el("style"); style.textContent = `
        #torn-scriptlink{font:14px/1.45 system-ui,sans-serif;color:#eef4fa;position:relative;z-index:2147483000}
        #torn-scriptlink *{box-sizing:border-box}#torn-scriptlink [hidden]{display:none!important}
        #torn-scriptlink button,#torn-scriptlink input,#torn-scriptlink select,#torn-scriptlink textarea{font:inherit;color:#edf5ff;background:#172a3a;border:1px solid #496178;border-radius:7px;padding:9px;min-height:40px}
        #torn-scriptlink button{cursor:pointer}#torn-scriptlink button:disabled{opacity:.55;cursor:wait}#torn-scriptlink button:hover{border-color:#75d8ca}
        #torn-scriptlink :focus-visible{outline:2px solid #8fe9dc;outline-offset:2px}#torn-scriptlink a{color:#8ce8db;text-decoration:underline;padding:7px;display:inline-block}
        #torn-scriptlink .sl-launch{position:fixed;right:12px;bottom:90px;background:#15584f;box-shadow:0 5px 20px #0006}
        #torn-scriptlink .sl-panel{position:fixed;inset:4vh max(12px,calc((100vw - 1040px)/2));background:#0d1b27;border:1px solid #446176;border-radius:14px;box-shadow:0 15px 80px #000b;display:flex;flex-direction:column;padding:16px;gap:12px;max-height:92vh;overflow:hidden}
        #torn-scriptlink .sl-head{display:flex;align-items:center;gap:10px}#torn-scriptlink .sl-head strong{font-size:20px;flex:1}#torn-scriptlink .sl-scroll{overflow:auto;min-height:0;padding:2px 5px 12px}
        #torn-scriptlink .sl-nav,#torn-scriptlink .sl-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}#torn-scriptlink .sl-nav{max-height:136px;overflow:auto}
        #torn-scriptlink .sl-active{background:#246558;border-color:#9ce9d8}#torn-scriptlink .sl-toolbar{display:flex;gap:8px;flex-wrap:wrap}#torn-scriptlink .sl-toolbar input{flex:1;min-width:150px}
        #torn-scriptlink .sl-card{border:1px solid #324c63;background:#122534;border-radius:10px;padding:14px;margin:12px 0}#torn-scriptlink p{margin:8px 0}#torn-scriptlink h3{font-size:16px;margin:12px 0 8px}
        #torn-scriptlink .sl-chip{font-size:12px;background:#284152;border-radius:99px;padding:4px 9px}#torn-scriptlink .sl-supported{background:#1f5946}#torn-scriptlink .sl-muted{color:#b3c5d5;font-size:12px}
        #torn-scriptlink .sl-field{display:flex;flex-direction:column;gap:5px;margin:8px 0}#torn-scriptlink .sl-field span{font-size:12px;color:#bed1df}#torn-scriptlink .sl-field input[type=checkbox]{align-self:start;width:22px;min-height:22px}
        #torn-scriptlink textarea{width:100%;min-height:90px}#torn-scriptlink pre{white-space:pre-wrap;overflow-wrap:anywhere;max-height:180px;overflow:auto;font-size:12px}
        #torn-scriptlink .sl-error,#torn-scriptlink .sl-warning{color:#ffc6a1}#torn-scriptlink .sl-message{font-size:13px;margin:0}#torn-scriptlink .sl-conflicts{border:2px solid #f4b777;padding:10px}
        @media(max-width:600px){#torn-scriptlink .sl-panel{inset:8px 6px;max-height:calc(100dvh - 16px);padding:10px}#torn-scriptlink .sl-head strong{font-size:17px}#torn-scriptlink .sl-nav{max-height:120px}#torn-scriptlink .sl-nav button{font-size:12px;padding:7px}#torn-scriptlink .sl-card{padding:11px}}
        `; root.append(style);
        const launch = button("🔗 ScriptLink", async () => {await reload(); panel.hidden = !panel.hidden; if (!panel.hidden) {renderList(); panel.querySelector(".sl-close").focus(); if (Date.now() - Date.parse(data.lastSync || 0) > 300000 || !data.lastSync) scheduleSync();}}); launch.className = "sl-launch";
        panel = el("section", undefined, "sl-panel"); panel.hidden = true; panel.setAttribute("role", "dialog"); panel.setAttribute("aria-label", "Torn ScriptLink");
        const head = el("div", undefined, "sl-head"), close = el("button", "Close", "sl-close"); close.type = "button"; close.onclick = () => {panel.hidden = true; launch.focus();};
        head.append(el("strong", "Torn ScriptLink"), el("span", "v" + APP_VERSION, "sl-muted"), button("Settings", () => {showSettings = !showSettings; settingsArea.hidden = !showSettings;}), close);
        messageArea = el("p", "Sheets sync for your script lists. Installations remain under your control.", "sl-message"); messageArea.setAttribute("role", "status");
        stats = el("p", "", "sl-muted");
        const toolbar = el("div", undefined, "sl-toolbar"), find = textInput("", "Search names, tags and notes"); find.setAttribute("aria-label", "Search scripts"); find.oninput = () => {search = find.value.toLowerCase(); renderList();};
        const file = el("input"); file.type = "file"; file.multiple = true; file.accept = ".json,.js,.txt,.zip"; file.hidden = true;
        file.onchange = () => {const files = Array.from(file.files || []); file.value = ""; if (files.length) void action(() => importFiles(files));};
        const importButton = el("button", "Import"); importButton.type = "button";
        // Open directly in the user's click handler. action() disables inputs,
        // which would disable this file input before its native picker opens.
        importButton.addEventListener("click", () => {if (!busy) file.click();});
        toolbar.append(find, button("Sync now", sync), button("Add script", () => showEditor()), importButton, button("Backup my list", () => exportList(data.scripts, "My Torn scripts")), button("Export this view", () => exportList(filtered(), view === "Packages" ? packageFilter : view)), file);
        nav = el("nav", undefined, "sl-nav"); nav.setAttribute("aria-label", "Script views");
        for (const label of ["All", "My scripts", "Faction supported", "Packages", ...Core.categories]) nav.append(button(label, () => {view = label; renderList();}));
        const filter = select(["All statuses", ...Core.statuses], statusFilter, value => {statusFilter = value; renderList();}); filter.setAttribute("aria-label", "Filter this device's status");
        const scroller = el("div", undefined, "sl-scroll"); settingsArea = el("section"); settingsArea.hidden = true; listArea = el("section");
        scroller.append(settingsArea, listArea); panel.append(head, messageArea, stats, toolbar, nav, filter, scroller); root.append(launch, panel); document.body.append(root);
        renderSettings(); renderList();
        const observer = new MutationObserver(() => {if (document.body && !root.isConnected) document.body.append(root); if (observedBody !== document.body) observe();});
        let observedBody;
        function observe() {observer.disconnect(); observedBody = document.body; observer.observe(document.documentElement, {childList: true}); if (observedBody) observer.observe(observedBody, {childList: true});}
        observe();
        panel.addEventListener("keydown", e => {if (e.key === "Escape") {panel.hidden = true; launch.focus();}});
        MyDebug.log({event: "Mounted", version: APP_VERSION, nativePDAStorage: !!nativeStorage, privateCredentialStore: privateStore});
    }
    async function start() {
        try {
            const saved = await localAdapter.get(CONFIG_KEY, {});
            config = {endpoint: typeof saved.endpoint === "string" ? saved.endpoint : "", credential: privateStore && typeof saved.credential === "string" ? saved.credential : "", auto: saved.auto !== false};
            await reload();
            if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount, {once: true}); else mount();
            document.addEventListener("visibilitychange", () => {if (!document.hidden && (dirty() || !data.lastSync || Date.now() - Date.parse(data.lastSync) > 300000)) scheduleSync();});
            window.addEventListener("online", scheduleSync);
            if (typeof GM_addValueChangeListener === "function") GM_addValueChangeListener(CACHE_KEY, () => {if (!busy) void reload().then(renderList).catch(() => notify("Could not reload the saved list.", true));});
            window.addEventListener("storage", e => {if (e.key === CACHE_KEY && !busy) void reload().then(renderList).catch(() => {});});
            scheduleSync();
        } catch (e) {MyDebug.log({event: "Initialization failed", message: Core.scrub(e.message, 200)}, "ERROR"); mount(); notify("Saved data could not be loaded. Do not reset until you have checked your backup. " + Core.scrub(e.message, 160), true);}
    }
    void start();

/**
 * File: userscript-debugger-module.js
 * Version: 1.0.4
 * Advanced Modular Userscript Debugger with optional DOM Inspector
 * Author: ShavedW00kie (Torn: ThaWookie [2954173] )
 * Namespace: https://github.com/ShavedW00kie/
 * Target: Embedded inside a Torn.com userscript IIFE (desktop and TornPDA).
 * License: BSD-3-Clause
 *
 * Copyright (c) 2026 ShavedW00kie
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 * 1. Redistributions of source code must retain the above copyright notice,
 *    this list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright notice,
 *    this list of conditions and the following disclaimer in the documentation
 *    and/or other materials provided with the distribution.
 * 3. Neither the name of the copyright holder nor the names of its contributors
 *    may be used to endorse or promote products derived from this software
 *    without specific prior written permission.
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 * ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE
 * LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
 * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
 * SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
 * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
 * CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
 *
 * Integration inside the host userscript's IIFE, AFTER this function definition:
 *   const MyDebug = initializeModularDebugger(GM_info.script.name);
 *   MyDebug.log("Ready");
 *   bugButton.addEventListener("click", () => MyDebug.toggleView());
 *   copyButton.addEventListener("click", function () { void MyDebug.copy(this); });
 *   // Optional: MyDebug.inspect(), MyDebug.inspectElement(element),
 *   // MyDebug.watchElement(element), MyDebug.stopInspection(), MyDebug.destroy().
 *
 * This file is a source module, not an independently installable userscript.
 * The host userscript supplies its own ==UserScript== metadata and IIFE.
 */
function initializeModularDebugger(scriptNamespace) {
    "use strict";
    if (scriptNamespace === undefined) scriptNamespace = "App";

    const randomId = (() => {
        try {
            if (typeof crypto !== "undefined" && crypto.randomUUID) {
                return crypto.randomUUID().replace(/-/g, "");
            }
        } catch (_) { /* WebView fallback. */ }
        return Math.random().toString(36).slice(2) + Date.now().toString(36);
    })();
    const id = `tw-debug-${randomId}`;
    const LIMITS = Object.freeze({
        buffer: (10 * 1024 * 1024) - (900 * 1024),
        entry: 64 * 1024,
        renderEntries: 180,
        renderChars: 128 * 1024,
        report: 15000,
        html: 6000,
        parents: 6,
        children: 12,
        nodes: 65,
        mutations: 40
    });
    const state = {
        logs: [], head: 0, length: 0, destroyed: false, 
        frames: new Set(), statuses: new Map(), resizeObserver: null,
        root: null, logArea: null, inspector: null, inspectorText: null,
        style: null, statusBar: null, highlight: null,
        panelMode: "logs", selected: null, picking: false,
        watching: false, changeLog: [],
        observer: null, parentObserver: null, uiObserver: null,
        observedBody: null, renderPending: false,
        pendingMutations: 0, mutationLogPending: false,
        viewportListeners: false, highlightPending: false
    };
    const SENSITIVE = /(?:^key$|api[_-]?key|apikey|token|auth|authorization|cookie|secret|passwd|password|csrf|session|bearer|credential|client[_-]?secret|refresh[_-]?token|access[_-]?token)/i;
    const SAFE_ATTRIBUTES = new Set([
        "id", "class", "role", "type", "aria-expanded",
        "aria-hidden", "data-testid", "data-test", "data-role", "data-state"
    ]);

    /* ---------- Redacted, bounded logging ---------- */
    function redact(value) {
        return String(value)
            .replace(/\b(?:Authorization|Proxy-Authorization)\s*:\s*[^\r\n]+/gi, "Authorization: [REDACTED]")
            .replace(/\b[A-Za-z0-9]{16}\b/g, "[POSSIBLE KEY REDACTED]")
            // Bearer tokens and known secret-bearing URL parameters.
            .replace(/(\bBearer\s+)[A-Za-z0-9._~+/-]+/gi, "$1[REDACTED]")
            .replace(/([?&](?:key|api_key|token|access_token|refresh_token|secret|session|csrf)=)[^&#\s\"'<>}\]]+/gi, "$1[REDACTED]")
            // Quoted property values, including embedded spaces.
            .replace(/(["']?(?:api[_-]?key|apikey|token|authorization|cookie|password|passwd|secret|csrf|session|access[_-]?token|refresh[_-]?token)["']?\s*[:=]\s*)(["'])([^"']*)\2/gi,
                (_, prefix, quote) => `${prefix}${quote}[REDACTED]${quote}`)
            // Unquoted key=value patterns.
            .replace(/(["']?(?:api[_-]?key|apikey|token|authorization|cookie|password|passwd|secret|csrf|session|access[_-]?token|refresh[_-]?token)["']?\s*[:=]\s*)(?!["'])([^\s"',;}&\]]+)/gi,
                (_, prefix) => `${prefix}[REDACTED]`);
    }

    // Does not call getters or toJSON. Proxies can still execute traps; never
    // deliberately pass hostile proxies to an in-process diagnostic function.
    function safeSerialize(value) {
        let remaining = 240;
        const path = new WeakSet();
        function visit(item, depth) {
            if (--remaining < 0) return "[Traversal limit]";
            if (typeof item === "string") return redact(item.slice(0, 8192));
            if (item === null || typeof item === "boolean" || typeof item === "number") return item;
            if (typeof item === "undefined") return "[undefined]";
            if (typeof item === "bigint" || typeof item === "symbol") return String(item);
            if (typeof item === "function") return "[Function]";
            if (path.has(item)) return "[Circular]";
            if (depth >= 5) return "[Depth limit]";
            path.add(item);
            try {
                const result = Object.create(null);
                let count = 0;
                if (item instanceof Error) {
                    for (const key of ["name", "message", "stack"]) {
                        const descriptor = Object.getOwnPropertyDescriptor(item, key);
                        result[key] = descriptor && "value" in descriptor
                            ? visit(descriptor.value, depth + 1) : "[Unavailable/accessor]";
                    }
                }
                // for-in permits early exit without allocating Object.keys for
                // every property. Reflection itself is not a hard time limit.
                for (const key in item) {
                    if (!Object.prototype.hasOwnProperty.call(item, key)) continue;
                    if (++count > 40 || remaining <= 0) { result["[Truncated]"] = true; break; }
                    const descriptor = Object.getOwnPropertyDescriptor(item, key);
                    result[redact(key.slice(0, 160))] = SENSITIVE.test(key) ? "[REDACTED]"
                        : descriptor && "value" in descriptor ? visit(descriptor.value, depth + 1) : "[Accessor omitted]";
                }
                return result;
            } catch (_) { return "[Unserializable]"; }
            finally { path.delete(item); }
        }
        try {
            if (typeof value === "string") return redact(value.slice(0, LIMITS.entry));
            return JSON.stringify(visit(value, 0));
        } catch (_) { return "[Unserializable]"; }
    }
    function scheduleFrame(callback) {
        if (state.destroyed) return;
        if (typeof requestAnimationFrame !== "function") { callback(); return; }
        const handle = requestAnimationFrame(() => {
            state.frames.delete(handle);
            if (!state.destroyed) callback();
        });
        state.frames.add(handle);
    }
    function trim(text, max) {
        text = String(text);
        return text.length > max ? `${text.slice(0, Math.max(0, max - 17))}[TRUNCATED]` : text;
    }
    function log(message, level = "INFO") {
        if (state.destroyed) return;
        const label = typeof level === "string" && /^(INFO|WARN|ERROR|DEBUG)$/i.test(level) ? level.toUpperCase() : "INFO";
        const timestamp = new Date().toISOString();
        const entry = trim(`[${timestamp}] [${label}] ${safeSerialize(message)}`, LIMITS.entry);
        const size = entry.length + 1;
        while (state.head < state.logs.length && state.length + size > LIMITS.buffer) {
            state.length -= state.logs[state.head].length + 1;
            state.logs[state.head++] = null; // Release pruned strings immediately.
        }
        if (state.head > 2048) { state.logs = state.logs.slice(state.head); state.head = 0; }
        state.logs.push(entry);
        state.length += size;
        queueRender();
    }
    const info = message => log(message, "INFO");
    const warn = message => log(message, "WARN");
    const error = message => log(message, "ERROR");
    function clear() {
        state.logs.length = 0;
        state.head = 0;
        state.length = 0;
        renderLogs();
    }
    function queueRender() {
        if (!state.logArea || !state.root || state.root.hidden || state.panelMode !== "logs") return;
        if (state.renderPending) return;
        state.renderPending = true;
        scheduleFrame(() => { state.renderPending = false; renderLogs(); });
    }
    function renderLogs() {
        if (state.destroyed || !state.root || state.root.hidden || !state.logArea || !state.logArea.isConnected || state.panelMode !== "logs") return;
        const subset = [];
        let chars = 0;
        for (let i = state.logs.length - 1; i >= state.head && subset.length < LIMITS.renderEntries; i--) {
            if (chars + state.logs[i].length + 1 > LIMITS.renderChars) break;
            subset.unshift(state.logs[i]); chars += state.logs[i].length + 1;
        }
        const skipped = state.logs.length - state.head - subset.length;
        state.logArea.textContent = (skipped ? `[${skipped} earlier entries retained for copying]\n` : "") + subset.join("\n");
        state.logArea.scrollTop = state.logArea.scrollHeight;
    }

    /* ---------- Clipboard (Tampermonkey, TornPDA, browser) ---------- */
    function copyFallback(text) {
        if (!document.body) return false;
        const input = document.createElement("textarea");
        const previousFocus = document.activeElement;
        const selection = typeof window.getSelection === "function" ? window.getSelection() : null;
        const ranges = [];
        if (selection) for (let i = 0; i < selection.rangeCount; i++) ranges.push(selection.getRangeAt(i).cloneRange());
        let caret = null;
        try { if (previousFocus && typeof previousFocus.selectionStart === "number") caret = [previousFocus.selectionStart, previousFocus.selectionEnd, previousFocus.selectionDirection]; } catch (_) {}
        input.value = text;
        input.readOnly = true;
        input.style.cssText = "position:fixed;left:0;top:0;width:1px;height:1px;opacity:0;z-index:-1";
        try {
            document.body.appendChild(input);
            input.focus();
            input.select();
            input.setSelectionRange(0, text.length);
            return Boolean(document.execCommand("copy"));
        } catch (_) { return false; }
        finally {
            input.remove();
            try { if (previousFocus && previousFocus.isConnected) previousFocus.focus({ preventScroll: true });
                if (caret) previousFocus.setSelectionRange(...caret);
                if (selection) { selection.removeAllRanges(); ranges.forEach(range => selection.addRange(range)); } } catch (_) { /* Non-focusable element. */ }
        }
    }
    async function writeClipboard(text) {
        try {
            if (typeof GM_setClipboard === "function") {
                await Promise.resolve(GM_setClipboard(text, "text"));
                return true;
            }
            if (typeof GM !== "undefined" && typeof GM.setClipboard === "function") {
                await GM.setClipboard(text, "text");
                return true;
            }
        } catch (_) { /* Try browser APIs. */ }
        if (typeof navigator !== "undefined" && navigator.clipboard && navigator.clipboard.writeText) {
            try { await navigator.clipboard.writeText(text); return true; }
            catch (_) { /* Restricted WebView. */ }
        }
        return copyFallback(text);
    }
    function showCopyResult(button, result) {
        if (state.destroyed || !button || !button.isConnected) return;
        let saved = state.statuses.get(button);
        if (saved) clearTimeout(saved.timer);
        else saved = { nodes: Array.from(button.childNodes), timer: null };
        button.textContent = result;
        // This timer is only UI feedback, never element discovery or polling.
        saved.timer = setTimeout(() => {
            button.replaceChildren(...saved.nodes);
            state.statuses.delete(button);
        }, 1300);
        state.statuses.set(button, saved);
    }
    async function copy(button = null) {
        if (state.destroyed) return false;
        const text = state.logs.slice(state.head).join("\n");
        if (!text) { showCopyResult(button, "Empty"); return false; }
        const success = await writeClipboard(text);
        showCopyResult(button, success ? "Copied!" : "Failed");
        if (!success) warn("Clipboard unavailable. Open debugger to select and copy manually.");
        return success;
    }

    /* ---------- Safe DOM descriptions ---------- */
    function isElement(node) { return Boolean(node && node.nodeType === 1 && node.tagName); }
    function tag(node) { return isElement(node) ? node.tagName.toLowerCase() : "(none)"; }
    function describe(node) {
        if (!isElement(node)) return "(none)";
        let text = tag(node);
        const nodeId = node.getAttribute("id");
        if (nodeId && !SENSITIVE.test(nodeId)) text += `#${trim(redact(nodeId), 50)}`;
        const classes = Array.from(node.classList || []).filter(name => !SENSITIVE.test(name)).slice(0, 3);
        if (classes.length) text += "." + classes.map(name => trim(redact(name), 48)).join(".");
        return trim(text, 180);
    }
    function selectorSegment(node) {
        if (!isElement(node)) return "";
        const nodeId = node.getAttribute("id");
        if (nodeId && /^[A-Za-z_][\w-]{0,60}$/.test(nodeId) && !SENSITIVE.test(nodeId)) {
            return `#${nodeId}`;
        }
        let part = tag(node);
        const classNames = Array.from(node.classList || [])
            .filter(name => /^[A-Za-z_][\w-]{0,45}$/.test(name) && !SENSITIVE.test(name))
            .slice(0, 2);
        part += classNames.map(name => `.${name}`).join("");
        if (node.parentElement) {
            const same = Array.from(node.parentElement.children).filter(sibling => sibling.tagName === node.tagName);
            if (same.length > 1) part += `:nth-of-type(${same.indexOf(node) + 1})`;
        }
        return part;
    }
    function makeSelector(element) {
        const segments = [];
        let current = element;
        for (let step = 0; step < LIMITS.parents && isElement(current); step++) {
            const segment = selectorSegment(current);
            segments.unshift(segment);
            if (segment.startsWith("#")) break;
            current = current.parentElement;
        }
        const selector = segments.join(" > ");
        if (selector.length > 500) return "(selector exceeds safe length)";
        if (redact(selector) !== selector) return "(selector omitted: possible credential)";
        return selector;
    }
    function safeAttributeText(element) {
        const result = [];
        if (!isElement(element)) return "";
        for (const attr of Array.from(element.attributes || [])) {
            if (!SAFE_ATTRIBUTES.has(attr.name) || SENSITIVE.test(attr.name)) continue;
            if (SENSITIVE.test(attr.value)) continue;
            result.push(`${attr.name}="${escapeHTML(trim(redact(attr.value), 90))}"`);
            if (result.length >= 8) break;
        }
        return result.length ? ` ${result.join(" ")}` : "";
    }
    function escapeHTML(value) {
        return String(value).replace(/[&<>"']/g, character => ({
            "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
        })[character]);
    }
    function structuralHTML(element) {
        let budget = LIMITS.nodes;
        const skip = /^(script|style|noscript|template|iframe|object|embed)$/i;
        function recurse(node, depth) {
            if (!isElement(node) || budget-- <= 0) return "";
            const name = tag(node);
            const open = `<${name}${safeAttributeText(node)}>`;
            if (skip.test(name)) return `${open}[contents omitted]</${name}>`;
            if (depth >= 2) return `${open}[descendants omitted]</${name}>`;
            const kids = Array.from(node.children).slice(0, LIMITS.children);
            const nested = kids.map(child => recurse(child, depth + 1)).join("\n");
            const note = node.children.length > LIMITS.children ? "\n[additional children omitted]" : "";
            return `${open}${nested ? `\n${nested}${note}\n` : "[text omitted]"}</${name}>`;
        }
        return trim(recurse(element, 0), LIMITS.html);
    }
    function reactRootHint(element) {
        let node = element;
        for (let i = 0; i < LIMITS.parents && isElement(node); i++, node = node.parentElement) {
            const candidateId = node.getAttribute("id") || "";
            if (/^(?:react-root|root|__next)$/i.test(candidateId) || node.hasAttribute("data-reactroot")) {
                return `${describe(node)} (heuristic only)`;
            }
        }
        return "Not detected (does not rule out React)";
    }
    function getInspectionReport() {
        const element = state.selected;
        if (!isElement(element)) return "No element selected.";
        const ancestors = [];
        let ancestor = element.parentElement;
        for (let i = 0; i < LIMITS.parents && isElement(ancestor); i++, ancestor = ancestor.parentElement) {
            ancestors.push(`  ${i + 1}. ${describe(ancestor)}`);
        }
        const children = Array.from(element.children).slice(0, LIMITS.children)
            .map((child, index) => `  ${index + 1}. ${describe(child)}`);
        const page = typeof location !== "undefined"
            ? (location.origin === "null" ? "(local document)" : `${location.origin}${location.pathname}`)
            : "(unknown)";
        return trim(redact([
            `DOM INSPECTION | ${redact(String(scriptNamespace))}`,
            `Time: ${new Date().toISOString()}`,
            `Page (query omitted): ${redact(page)}`,
            `Selected: ${describe(element)}`,
            `Connected: ${element.isConnected}`,
            `Selector (best effort): ${makeSelector(element)}`,
            `React container hint: ${reactRootHint(element)}`,
            `Parent chain:\n${ancestors.join("\n") || "  (none)"}`,
            `Immediate children (${element.children.length}):\n${children.join("\n") || "  (none)"}`,
            `Sibling context: previous=${describe(element.previousElementSibling)}, next=${describe(element.nextElementSibling)}`,
            `Structural preview (text nodes, form values, URLs and scripts omitted; review attributes before sharing):\n${structuralHTML(element)}`,
            `Recent observed mutations (${state.changeLog.length}):\n${state.changeLog.join("\n") || "  (none)"}`
        ].join("\n\n")), LIMITS.report);
    }

    /* ---------- On-demand DOM selection and mutation watch ---------- */
    function isOurUI(node) {
        return Boolean(isElement(node) && (
            (state.root && state.root.contains(node)) ||
            (state.highlight && state.highlight.contains(node))
        ));
    }
    function ensureHighlight() {
        if (state.destroyed || !state.selected || !state.root || state.root.hidden || state.panelMode !== "inspect") return null;
        if (state.highlight && state.highlight.isConnected) return state.highlight;
        if (!document.body) return null;
        const node = document.createElement("div");
        node.setAttribute("aria-hidden", "true");
        node.style.cssText = "position:fixed;pointer-events:none;z-index:2147483646;border:2px solid #00dbff;box-shadow:0 0 0 1px #001e28;box-sizing:border-box;display:none";
        document.body.appendChild(node);
        state.highlight = node;
        return node;
    }
    function updateHighlight() {
        const marker = ensureHighlight();
        if (!marker) return;
        const node = state.selected;
        if (!isElement(node) || !node.isConnected || !state.root || state.root.hidden || state.panelMode !== "inspect") {
            marker.style.display = "none";
            return;
        }
        const rect = node.getBoundingClientRect();
        marker.style.display = "block";
        marker.style.top = `${rect.top}px`;
        marker.style.left = `${rect.left}px`;
        marker.style.width = `${rect.width}px`;
        marker.style.height = `${rect.height}px`;
    }
    function onViewportChanged() {
        if (state.destroyed || !state.selected || state.highlightPending || state.panelMode !== "inspect") return;
        state.highlightPending = true;
        scheduleFrame(() => {
            state.highlightPending = false;
            updateHighlight();
        });
    }
    function setViewportListeners(enable) {
        if (typeof window === "undefined" || enable === state.viewportListeners) return;
        state.viewportListeners = enable;
        const method = enable ? "addEventListener" : "removeEventListener";
        window[method]("scroll", onViewportChanged, true);
        window[method]("resize", onViewportChanged);
    }
    function removeHighlight() {
        if (state.highlight) { state.highlight.remove(); state.highlight = null; }
    }
    function updateInspector() {
        if (!state.inspectorText) return;
        state.inspectorText.textContent = state.selected ? trim([
            `Selected: ${describe(state.selected)}`,
            `Parent: ${describe(state.selected.parentElement)}`,
            `Children: ${state.selected.children.length}`,
            `Selector: ${makeSelector(state.selected)}`,
            `Connected: ${state.selected.isConnected}`,
            `Watch: ${state.watching ? "ON" : "OFF"} | Changes: ${state.changeLog.length}`
        ].join("\n"), 1100) : "Tap Pick, then tap a Torn page element.\nNo page data is collected until inspection is used.";
        if (state.statusBar) state.statusBar.textContent = state.picking ? "PICK MODE: tap a page element or press Esc" : "Inspector idle";
        updateHighlight();
    }
    function suppressPickAction(event) {
        if (isOurUI(event.target)) return;
        event.stopImmediatePropagation();
        // Preserve the browser synthetic click needed for tap selection.
    }
    function onPickClick(event) {
        if (isOurUI(event.target)) return;
        // Capture before Torn/React click handlers so selecting a link does not navigate.
        event.preventDefault();
        event.stopImmediatePropagation();
        if (isElement(event.target)) inspectElement(event.target);
        stopPicker();
    }
    function onPickKey(event) {
        if (event.key === "Escape") {
            event.preventDefault();
            stopPicker();
            updateInspector();
        }
    }
    function startPicker() {
        if (state.destroyed || !state.root || !state.root.isConnected || state.root.hidden || state.picking) return;
        state.picking = true;
        document.addEventListener("click", onPickClick, true);
        ["pointerdown", "pointerup", "touchstart", "touchend", "mousedown", "mouseup"].forEach(type => document.addEventListener(type, suppressPickAction, { capture: true, passive: false }));
        document.addEventListener("keydown", onPickKey, true);
        updateInspector();
    }
    function stopPicker() {
        if (!state.picking) return;
        state.picking = false;
        document.removeEventListener("click", onPickClick, true);
        ["pointerdown", "pointerup", "touchstart", "touchend", "mousedown", "mouseup"].forEach(type => document.removeEventListener(type, suppressPickAction, true));
        document.removeEventListener("keydown", onPickKey, true);
        updateInspector();
    }
    function stopWatch() {
        if (state.observer) state.observer.disconnect();
        if (state.parentObserver) state.parentObserver.disconnect();
        state.observer = null;
        state.parentObserver = null;
        state.watching = false;
        state.pendingMutations = 0;
        updateInspector();
    }
    function handleMutations(mutations) {
        if (!state.watching) return;
        const stamp = new Date().toISOString();
        let changed = 0;
        for (const mutation of mutations) {
            if (changed >= 8) break;
            const detail = mutation.type === "characterData" ? "text node changed (content omitted)" : mutation.type === "attributes"
                ? `attribute ${mutation.attributeName} on ${describe(mutation.target)}`
                : `childList (+${mutation.addedNodes.length}/-${mutation.removedNodes.length}) on ${describe(mutation.target)}`;
            state.changeLog.push(`[${stamp}] ${detail}`);
            changed++;
        }
        while (state.changeLog.length > LIMITS.mutations) state.changeLog.shift();
        if (changed) {
            state.pendingMutations += changed;
            if (!state.mutationLogPending) {
                state.mutationLogPending = true;
                scheduleFrame(() => {
                    state.mutationLogPending = false;
                    const count = state.pendingMutations;
                    state.pendingMutations = 0;
                    if (count && state.watching) log(`DOM watch: ${count} sampled change(s) near ${describe(state.selected)}`, "DEBUG");
                });
            }
        }
        if (state.selected && !state.selected.isConnected) {
            warn(`DOM watch: selected element detached: ${describe(state.selected)}`);
            stopWatch();
        }
        updateInspector();
    }
    function watchElement(element = state.selected) {
        if (state.destroyed || !isElement(element) || !element.isConnected || element === document.documentElement || element === document.body) {
            warn("DOM watch requires a specific element, not the document root/body.");
            return false;
        }
        if (typeof MutationObserver === "undefined") {
            warn("MutationObserver is unavailable in this WebView.");
            return false;
        }
        stopWatch();
        if (element !== state.selected && !inspectElement(element)) return false;
        state.changeLog.length = 0;
        // Observe the chosen subtree and direct child lists along its ancestor chain.
        state.observer = new MutationObserver(handleMutations);
        state.observer.observe(element, {
            attributes: true, childList: true, characterData: true, subtree: true,
            attributeFilter: ["class", "id", "role", "aria-expanded", "hidden", "disabled", "data-state"]
        });
        if (element.parentElement) {
            state.parentObserver = new MutationObserver(handleMutations);
            let ancestor = element.parentElement;
            while (ancestor) {
                state.parentObserver.observe(ancestor, { childList: true });
                ancestor = ancestor.parentNode;
            }
        }
        state.watching = true;
        info(`DOM watch enabled: ${describe(element)}`);
        updateInspector();
        return true;
    }
    function moveSelection(direction) {
        const selected = state.selected;
        if (!isElement(selected)) return;
        const next = direction === "parent" ? selected.parentElement : selected.firstElementChild;
        if (next && next !== document.body && next !== document.documentElement) inspectElement(next);
    }
    function inspectElement(element) {
        if (state.destroyed || !isElement(element) || isOurUI(element) || !ensureUI()) return false;
        if (state.watching && state.selected !== element) stopWatch();
        state.selected = element;
        if (state.resizeObserver) state.resizeObserver.disconnect();
        if (typeof ResizeObserver === "function") {
            state.resizeObserver = new ResizeObserver(onViewportChanged);
            state.resizeObserver.observe(element);
        }
        state.changeLog.length = 0;
        showPanel("inspect");
        updateInspector();
        info(`DOM selected: ${describe(element)} | ${makeSelector(element)}`);
        return true;
    }
    function inspect() {
        if (!showPanel("inspect")) return false;
        startPicker();
        return true;
    }
    function stopInspection() {
        stopPicker();
        stopWatch();
        state.selected = null;
        if (state.resizeObserver) state.resizeObserver.disconnect();
        state.resizeObserver = null;
        state.changeLog.length = 0;
        removeHighlight();
        setViewportListeners(false);
        if (state.root && !state.root.hidden) showPanel("logs");
    }
    async function copyInspection(button = null) {
        if (state.destroyed) return false;
        if (!state.selected) { showCopyResult(button, "No selection"); return false; }
        const result = await writeClipboard(getInspectionReport());
        showCopyResult(button, result ? "Copied!" : "Failed");
        return result;
    }

    /* ---------- Compact UI, created on first use ---------- */
    function createButton(text, label, handler) {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = text;
        button.title = label;
        button.setAttribute("aria-label", label);
        button.className = `${id}-btn`;
        button.addEventListener("click", handler);
        return button;
    }
    function ensureStyles() {
        if (state.destroyed) return;
        if (state.style && state.style.isConnected) return;
        if (!document.head && !document.body) return;
        const style = document.createElement("style");
        style.id = `${id}-styles`;
        style.textContent = `
          @keyframes ${id}-reset {from{opacity:.7}to{opacity:1}}
          .${id}-flash{animation:${id}-reset 1.3s ease 1}
          #${id}{position:fixed;right:12px;bottom:12px;width:min(430px,calc(100vw - 24px));
            height:320px;max-height:70vh;display:flex;flex-direction:column;gap:8px;padding:10px;
            background:#191919;color:#e2ffe7;border:1px solid #46db85;border-radius:8px;
            box-shadow:0 6px 25px #0009;box-sizing:border-box;font:12px/1.45 monospace;
            z-index:2147483647;touch-action:manipulation}
          #${id}[hidden],#${id} [hidden]{display:none!important}
          #${id} button{font:11px/1.2 sans-serif;min-height:30px;cursor:pointer}
          #${id} .${id}-btn{border:1px solid #616161;border-radius:4px;background:#292929;
            color:#fff;padding:6px;touch-action:manipulation}
          #${id} .${id}-toolbar{display:flex;flex-wrap:wrap;align-items:center;gap:4px}
          #${id} .${id}-title{font-weight:bold;flex:1 1 120px;min-width:0;overflow:hidden;text-overflow:ellipsis}
          #${id} .${id}-body{flex:1;min-height:0;overflow:auto;white-space:pre-wrap;
            overflow-wrap:anywhere;user-select:text}
          #${id} .${id}-actions{display:flex;flex-wrap:wrap;gap:5px;margin-bottom:5px}
          #${id} .${id}-status{font-size:11px;color:#ace3fc}
          #${id} button:focus-visible{outline:2px solid #91dfff;outline-offset:2px}
          @media(max-width:480px){#${id}{right:8px;bottom:8px;width:calc(100vw - 16px);
            height:290px;font-size:11px}}
          @media(prefers-reduced-motion:reduce){.${id}-flash{animation:none}}
        `;
        (document.head || document.body).appendChild(style);
        state.style = style;
    }
    function ensureUI() {
        if (state.destroyed) return false;
        if (state.root && state.root.isConnected) { ensureStyles(); return true; }
        if (!document.body) return false;
        ensureStyles();
        const root = document.createElement("section");
        root.id = id;
        root.hidden = true;
        root.setAttribute("aria-label", `Debug console: ${String(scriptNamespace)}`);
        const toolbar = document.createElement("div");
        toolbar.className = `${id}-toolbar`;
        const title = document.createElement("span");
        title.className = `${id}-title`;
        title.textContent = `🪲 ${String(scriptNamespace)}`;
        toolbar.append(title,
            createButton("Copy", "Copy logs", function () { void copy(this); }),
            createButton("Clear", "Clear logs", clear),
            createButton("🔍", "Inspect Torn DOM element", inspect),
            createButton("Hide", "Hide debugger", () => toggleView()));
        const logArea = document.createElement("pre");
        logArea.className = `${id}-body`;
        logArea.style.margin = "0";
        const inspector = document.createElement("div");
        inspector.className = `${id}-body`;
        inspector.hidden = true;
        const actions = document.createElement("div");
        actions.className = `${id}-actions`;
        actions.append(
            createButton("Pick", "Pick element by tapping it", startPicker),
            createButton("↑ Parent", "Inspect parent element", () => moveSelection("parent")),
            createButton("↓ Child", "Inspect first child element", () => moveSelection("child")),
            createButton("Watch", "Watch selected element for DOM mutations", () => { watchElement(); }),
            createButton("Stop watch", "Disconnect mutation observers", stopWatch),
            createButton("Copy DOM", "Copy sanitized DOM report", function () { void copyInspection(this); }),
            createButton("Exit", "Close inspector", stopInspection));
        const status = document.createElement("div");
        status.className = `${id}-status`;
        const details = document.createElement("pre");
        details.style.cssText = "white-space:pre-wrap;overflow-wrap:anywhere;margin:5px 0;font:inherit";
        inspector.append(actions, status, details);
        root.append(toolbar, logArea, inspector);
        document.body.appendChild(root);
        Object.assign(state, { root, logArea, inspector, inspectorText: details, statusBar: status });
        attachUIObserver();
        return true;
    }
    function attachUIObserver() {
        if (typeof MutationObserver === "undefined" || !document.body) return;
        if (state.uiObserver) state.uiObserver.disconnect();
        // Only direct children of body, not the constantly changing React subtree.
        state.uiObserver = new MutationObserver(() => {
            if (state.root && (!state.root.isConnected || state.observedBody !== document.body)) {
                stopPicker();
                stopWatch();
                removeHighlight();
                setViewportListeners(false);
                if (state.root) state.root.remove();
                if (state.resizeObserver) state.resizeObserver.disconnect();
                state.resizeObserver = null;
                state.selected = null;
                state.root = state.logArea = state.inspector = state.inspectorText = state.statusBar = null;
                state.uiObserver.disconnect();
            }
        });
        state.uiObserver.observe(document.body, { childList: true });
        if (document.documentElement) state.uiObserver.observe(document.documentElement, { childList: true });
        state.observedBody = document.body;
    }
    function showPanel(panel) {
        if (!ensureUI()) return false;
        state.root.hidden = false;
        state.panelMode = panel;
        setViewportListeners(panel === "inspect");
        state.logArea.hidden = panel !== "logs";
        state.inspector.hidden = panel !== "inspect";
        if (panel === "logs") renderLogs();
        else updateInspector();
        return true;
    }
    function toggleView() {
        if (!ensureUI()) return false;
        if (!state.root.hidden) {
            // A hidden debugger must not keep an active DOM picker or watch.
            stopInspection();
            state.root.hidden = true;
            return false;
        }
        showPanel("logs");
        return true;
    }

    function destroy() {
        if (state.destroyed) return;
        state.destroyed = true;
        stopInspection();
        if (state.uiObserver) state.uiObserver.disconnect();
        if (state.resizeObserver) state.resizeObserver.disconnect();
        for (const handle of state.frames) {
            if (typeof cancelAnimationFrame === "function") cancelAnimationFrame(handle);
        }
        state.frames.clear();
        for (const [button, saved] of state.statuses) {
            clearTimeout(saved.timer);
            button.replaceChildren(...saved.nodes);
        }
        state.statuses.clear();
        if (state.root) state.root.remove();
        if (state.style) state.style.remove();
        removeHighlight();
        state.root = state.logArea = state.inspector = state.inspectorText = state.statusBar = state.style = null;
        clear();
    }

    return Object.freeze({
        log, info, warn, error, copy, clear, toggleView,
        inspect, inspectElement, watchElement, stopInspection,
        getInspectionReport, copyInspection, destroy
    });
}

})(typeof GM_info !== "undefined" && GM_info && GM_info.script ? GM_info : {script: {name: "Torn ScriptLink"}, scriptHandler: "Unknown"});
