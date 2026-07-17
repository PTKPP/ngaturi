# Architecture Decisions

## Historical Decisions

### DEC-001: PostgreSQL Is the Application Database
Status: Accepted. Authentication uses relational constraints. Invitation tables remain undecided until frontend approval; nested frontend objects will be mapped, not copied mechanically.

### DEC-002: Hybrid SSR and Client Components
Status: Deferred. Production public SSR remains a goal; the browser-local prototype renders client-side because the server cannot read `localStorage`.

### DEC-003: API-First Development
Status: Superseded. It produced the completed TASK-002 authentication contract, now archived. New feature work no longer starts from OpenAPI.

### DEC-004: Frontend Template Registry
Status: Accepted and refined by DEC-011. Executable templates remain local build-time code.

### DEC-005: Object Storage for Media
Status: Deferred until production media work resumes.

### DEC-006: ChromaDB Is a Derived Knowledge Index
Status: Accepted. It indexes only active docs/dummy contracts, is rebuildable, and never participates in runtime or authorization.

## Frontend-First Decisions

### DEC-007: Frontend-First Development
Status: Accepted. Build and approve the dummy-data vertical slice before invitation backend design.

### DEC-008: Executable Frontend Contract Replaces Active OpenAPI
Status: Accepted. Zod schemas, inferred TypeScript types, and validated dummy fixtures guide new features. Archived OpenAPI is TASK-002 history only.

### DEC-009: Repository Abstraction
Status: Accepted. Components depend on repository interfaces; mock adapters use versioned browser storage and can later be replaced by API adapters.

### DEC-010: Guest Is a Public Actor
Status: Accepted. Stored account roles are `admin` and `user`; guest has no user record or session.

### DEC-011: Folder-Based Explicit Template Registry
Status: Accepted. Each theme is self-contained and registered explicitly by key/version. No runtime auto-loader, `eval`, remote script, or arbitrary uploaded code.

### DEC-012: Client-Side Prototype Persistence
Status: Accepted. Dummy JSON seeds `localStorage` once; reload preserves edits. Explicit storage/schema metadata governs recovery: valid pre-metadata v1 data migrates in place, legacy namespaces are controlled-reset, and incompatible or invalid data requires visible retry/reset UI. Cross-device sharing and production SSR are deferred.

### DEC-013: Preserve Backend Authentication, Defer Integration
Status: Accepted. Completed Go authentication and migrations remain unchanged until a later frontend integration task.

### DEC-014: Mobile-First Frontend

Status: Accepted.

Semua tampilan frontend dirancang mulai dari viewport mobile, terutama halaman
undangan publik, editor undangan, dashboard, form, dan pengaturan.

Viewport dasar pengembangan adalah lebar 360–430 px. Tampilan tablet dan desktop
merupakan progressive enhancement, bukan layout utama yang kemudian diperkecil.

UI tidak boleh bergantung pada hover, tidak boleh memiliki horizontal overflow,
dan kontrol utama harus mudah digunakan dengan sentuhan.

### DEC-015: Unified Frontend Contract

Status: Accepted. Users, templates, and invitations validate as one runtime contract before backend design. IDs, emails, slugs, template versions, owner/template references, and event order are checked across fixtures. Browser schema version 2 marks this finalized contract; older explicit schema metadata requires controlled reset.

### DEC-016: Template Source Ports Are Local Typed Rewrites

Status: Accepted. A referenced static theme is audited at a recorded commit, then rewritten as typed React modules and scoped CSS against `InvitationTemplateProps`. Runtime CDN scripts, imperative DOM injection, source personal data, and GitHub hotlinks are prohibited; approved assets are local and source provenance is recorded inside the theme.
