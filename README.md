# Cornerstone Video MP4 Link

A userscript that shows the direct MP4 and HLS links for the video on Cornerstone's Video Admin page
(`https://<your-portal>.csod.com/LMS/Video/Admin/VideoAdminAdd.aspx?...`). It matches that page on
any `*.csod.com` portal.

Cornerstone renames uploaded videos, transcodes them, and serves them from its Akamai CDN, so the
original filename never appears in a URL. The script reads the player config on the page and adds a
box under the video player with:

- the uploaded filename and the name Cornerstone stored it as
- the MP4 and HLS (`.m3u8`) URLs, each with Open and Copy buttons
- when the links expire

## Install

1. Install [Tampermonkey](https://www.tampermonkey.net/) or [Violentmonkey](https://violentmonkey.github.io/).
2. Open [csod-video-mp4-link.user.js](https://raw.githubusercontent.com/willswords/csod-video-mp4-link/main/csod-video-mp4-link.user.js)
   and click Install.

## Notes

- The links carry a signed Akamai token (`hdnea=...~exp=...`) that expires one hour after the page
  loads. Reload the page to get fresh links. The URL without the token is refused.
- The MP4 is Cornerstone's transcoded rendition (e.g. `file-906k.mp4`, ~906 kbps), not the original upload.
