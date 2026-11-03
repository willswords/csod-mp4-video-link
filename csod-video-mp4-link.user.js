// ==UserScript==
// @name         Cornerstone Video MP4 Link
// @namespace    https://github.com/willswords/csod-video-mp4-link
// @version      1.1
// @description  Shows the direct MP4 (and HLS) link for the video on Cornerstone's Video Admin page.
// @match        https://*.csod.com/LMS/Video/Admin/VideoAdminAdd.aspx*
// @homepageURL  https://github.com/willswords/csod-video-mp4-link
// @updateURL    https://raw.githubusercontent.com/willswords/csod-video-mp4-link/main/csod-video-mp4-link.user.js
// @downloadURL  https://raw.githubusercontent.com/willswords/csod-video-mp4-link/main/csod-video-mp4-link.user.js
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    var BOX_ID = 'csod-mp4-link-box';

    // The player config is passed to *_ucVideoPlayer_init({...}) in an inline script.
    // Pull the media sources out of it; fall back to whatever the <video> element is playing.
    function findSources() {
        var found = { mp4: null, hls: null, title: null };
        var scripts = document.querySelectorAll('script:not([src])');
        var srcRe = /"src"\s*:\s*"((?:[^"\\]|\\.)*)"/g;
        for (var i = 0; i < scripts.length; i++) {
            var text = scripts[i].textContent;
            if (text.indexOf('ucVideoPlayer_init(') === -1 || text.indexOf('"source"') === -1) continue;
            var m;
            while ((m = srcRe.exec(text))) {
                var url = unescapeJson(m[1]);
                if (!/^https?:/i.test(url)) continue;
                if (!found.mp4 && /\.mp4(\?|$)/i.test(url)) found.mp4 = url;
                if (!found.hls && /\.m3u8(\?|$)/i.test(url)) found.hls = url;
            }
            var t = /"title"\s*:\s*"((?:[^"\\]|\\.)*)"/.exec(text);
            if (t && !found.title) found.title = unescapeJson(t[1]);
            if (found.mp4) break;
        }
        if (!found.mp4) {
            var video = document.querySelector('[id$="_ucVideoPlayer_amp"] video, video');
            var vsrc = video && (video.currentSrc || video.src);
            if (vsrc && /\.mp4(\?|$)/i.test(vsrc)) found.mp4 = vsrc;
        }
        return found;
    }

    function unescapeJson(s) {
        try { return JSON.parse('"' + s + '"'); } catch (e) { return s; }
    }

    // Akamai token looks like hdnea=st=<start>~exp=<epoch seconds>~acl=...~hmac=...
    function tokenExpiry(url) {
        var m = /[?&~]exp=(\d+)/.exec(url);
        return m ? new Date(parseInt(m[1], 10) * 1000) : null;
    }

    function originalFilename() {
        // The uploaded file's name is a bare text node next to the "Attach File" button.
        var input = document.querySelector('[id$="_VideoContent_btnUploadVideo"]');
        var node = input && input.previousSibling;
        while (node) {
            if (node.nodeType === 3 && node.textContent.trim()) return node.textContent.trim();
            node = node.previousSibling;
        }
        return null;
    }

    function makeRow(label, url) {
        var row = document.createElement('div');
        row.style.cssText = 'margin:6px 0;';

        var lbl = document.createElement('div');
        lbl.textContent = label;
        lbl.style.cssText = 'font-weight:bold;margin-bottom:2px;';

        var input = document.createElement('input');
        input.type = 'text';
        input.readOnly = true;
        input.value = url;
        input.style.cssText = 'width:100%;box-sizing:border-box;font:12px monospace;padding:3px;';
        input.addEventListener('focus', function () { input.select(); });

        var actions = document.createElement('div');
        actions.style.cssText = 'margin-top:3px;';

        var open = document.createElement('a');
        open.href = url;
        open.target = '_blank';
        open.rel = 'noopener';
        open.textContent = 'Open';

        var copy = document.createElement('a');
        copy.href = 'javascript:void(0)';
        copy.textContent = 'Copy';
        copy.style.marginLeft = '12px';
        copy.addEventListener('click', function () {
            var done = function () {
                copy.textContent = 'Copied!';
                setTimeout(function () { copy.textContent = 'Copy'; }, 1500);
            };
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(url).then(done, function () {
                    input.select(); document.execCommand('copy'); done();
                });
            } else {
                input.select(); document.execCommand('copy'); done();
            }
        });

        actions.appendChild(open);
        actions.appendChild(copy);
        row.appendChild(lbl);
        row.appendChild(input);
        row.appendChild(actions);
        return row;
    }

    function render() {
        if (document.getElementById(BOX_ID)) return true;
        var src = findSources();
        if (!src.mp4 && !src.hls) return false;

        var box = document.createElement('div');
        box.id = BOX_ID;
        box.style.cssText = 'margin:12px 0;padding:10px;border:1px solid #c8c8c8;background:#f7f7f7;' +
            'max-width:700px;font-size:12px;line-height:1.4;color:#222;';

        var heading = document.createElement('div');
        heading.textContent = 'Direct video link';
        heading.style.cssText = 'font-size:14px;font-weight:bold;margin-bottom:4px;';
        box.appendChild(heading);

        var orig = originalFilename();
        if (orig || src.title) {
            var names = document.createElement('div');
            names.textContent = (orig ? 'Uploaded as: ' + orig : '') +
                (orig && src.title ? '  |  ' : '') + (src.title ? 'Stored as: ' + src.title : '');
            names.style.cssText = 'color:#555;margin-bottom:4px;';
            box.appendChild(names);
        }

        if (src.mp4) box.appendChild(makeRow('MP4', src.mp4));
        if (src.hls) box.appendChild(makeRow('HLS stream (.m3u8)', src.hls));

        var exp = tokenExpiry(src.mp4 || src.hls);
        if (exp) {
            var note = document.createElement('div');
            note.style.cssText = 'margin-top:6px;color:#8a4b00;';
            note.textContent = 'These links contain a signed token and expire at ' + exp.toLocaleString() +
                '. Reload this page to get fresh links.';
            box.appendChild(note);
        }

        var anchor = document.querySelector('[id$="_ucVideoPlayer_playerDiv"]');
        if (anchor && anchor.parentNode) {
            anchor.parentNode.insertBefore(box, anchor.nextSibling);
        } else {
            box.style.cssText += 'position:fixed;right:16px;bottom:16px;z-index:99999;width:600px;';
            document.body.appendChild(box);
        }
        return true;
    }

    if (!render()) {
        // The player can appear after an async postback; keep watching briefly.
        var observer = new MutationObserver(function () {
            if (render()) observer.disconnect();
        });
        observer.observe(document.body, { childList: true, subtree: true });
        setTimeout(function () { observer.disconnect(); }, 60000);
    }
})();
