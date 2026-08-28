# Third-party Video and Maps

## Allowlist and stored data

- Video supports YouTube and Vimeo only. `video@2` stores `provider`, canonical `videoId`, and `embedEnabled`; it never stores iframe HTML or an embed source.
- Maps external links support Google Maps (`google.com/maps`, `maps.google.com`, `maps.app.goo.gl`, `goo.gl/maps`) and OpenStreetMap (`openstreetmap.org`) over HTTPS only.
- The application constructs embed URLs itself. YouTube uses `youtube-nocookie.com`, Vimeo uses `player.vimeo.com` with `dnt=1`, and optional map embeds use `google.com/maps` with the event address.
- Unsupported legacy HTTPS values are retained only in `legacyUnsupportedUrl` / `legacyUnsupportedMapUrl` so an owner can replace them. Renderers never turn those values into links or frames.

## Privacy behavior

Public rendering displays local invitation text and addresses first. No YouTube, Vimeo, or Google Maps iframe request occurs during initial page load. The guest must press **Tampilkan video** or **Tampilkan peta** before an iframe is mounted. External fallback links are always explicit navigation.

Loading an embed or opening its fallback can disclose the guest IP address, browser metadata, referrer information allowed by `strict-origin-when-cross-origin`, and may allow the provider to set/read cookies according to its own policy. `youtube-nocookie.com` and Vimeo `dnt=1` reduce tracking but do not make the request first-party or anonymous.

OpenStreetMap is supported as an external link in this phase; it is not embedded because the current content contract does not store a validated bounding box/coordinate pair.

## CSP and telemetry

Ngaturi currently does not install a global CSP because Next.js script nonces require a separate deployment-wide design. If a deployment already sends CSP, its narrow frame policy must include only:

```text
frame-src 'self' https://www.youtube-nocookie.com https://player.vimeo.com https://www.google.com;
```

Lightweight structured telemetry emits `ngaturi:telemetry` browser events and warning logs for `invalid_provider_url`, `embed_load_failure`, and `fallback_used`. Payloads contain only module/provider/event identifiers and a timestamp—never the submitted URL, video ID, address, invitation ID, or guest data.
