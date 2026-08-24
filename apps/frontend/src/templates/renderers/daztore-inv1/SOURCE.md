# Source Reference

- Repository: `https://github.com/daztore/daztore_inv1`
- Reference commit: `c85e611dd4b113779e8aa2ec7d7359b312a6507c`
- Port date: 2026-07-16
- Main files studied: `index.html`, `src/assets/styles/global.css`, `src/css/*.css`, `src/js/{welcome,home,bride,time,navbar,galeri,wishas}.js`, and `src/assets/data/data.js`.
- Source assets used at runtime: none. Ngaturi uses original local SVG placeholders, a local thumbnail, inline icons, and a generated ambient audio placeholder.

The static HTML/CSS/DOM implementation was rewritten into typed React components, CSS Modules, React state/effects, `IntersectionObserver`, and utilities backed by Ngaturi `InvitationTemplateProps`. Personal names/photos, account numbers, static dates/locations, static map/calendar links, source audio, Google Apps Script, guestbook/attendance forms, CDN fonts/icons/AOS, `sendto/`, CNAME, and GitHub Pages workflow were intentionally not ported. Runtime does not hotlink GitHub.

The source repository had no license file at the audited commit. This reference port is performed under the Ngaturi project owner's explicit instruction and makes no additional license claim.
