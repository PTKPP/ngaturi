# Product Requirements

## Product Summary

Ngaturi lets users create, preview, publish, and share personalized digital invitations at a stable public slug such as `/budi-ani`.

## Problem and Users

Hosts need a polished invitation, guest list, RSVP collection, and guestbook without building a site. Guests need a fast mobile-friendly page and a personal greeting link.

## MVP Scope

- Account authentication and invitation ownership.
- Invitation CRUD, partner details, multiple events, template choice, music, gallery, gifts, preview, publish/unpublish.
- Guest list and personalized guest links.
- Public SSR invitation, RSVP, and guestbook.

## Out of Scope

Payments, marketplace, custom template editor, real-time analytics, multi-language workflow, and production monetization are not MVP.

## Product Acceptance Criteria

- An owner can create a draft, configure it, preview it, publish it, and unpublish it.
- A published slug renders its registered frontend template with public data only.
- A guest can submit one valid RSVP under configured guest limits and leave a moderated/rate-limited guestbook message.
- A draft, missing slug, unauthorized resource, invalid guest token, or unregistered template is handled safely.

## TBD

- Supported invitation event categories and starter template catalogue.
- Guestbook moderation policy and publication timing.
- Account recovery, verification, and session lifetime.
- Gift payment-provider integrations.
