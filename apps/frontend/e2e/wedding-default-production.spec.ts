import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { deflateSync } from "node:zlib";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { expect, test, type Page, type TestInfo } from "@playwright/test";

type LocalStatus = { API_URL: string; ANON_KEY: string; SERVICE_ROLE_KEY: string };
type OwnerFixture = { id: string; email: string; password: string };
type MediaFixtures = { images: string[]; audio: string };

function localStatus(): LocalStatus {
  const output = execFileSync("supabase", ["status", "--workdir", "../..", "-o", "json"], {
    cwd: process.cwd(), encoding: "utf8", shell: process.platform === "win32",
  });
  const status = JSON.parse(output.slice(output.indexOf("{"))) as LocalStatus;
  expect(["127.0.0.1", "localhost"]).toContain(new URL(status.API_URL).hostname);
  return status;
}

function crc32(bytes: Buffer) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Buffer) {
  const name = Buffer.from(type);
  const length = Buffer.alloc(4); length.writeUInt32BE(data.length);
  const checksum = Buffer.alloc(4); checksum.writeUInt32BE(crc32(Buffer.concat([name, data])));
  return Buffer.concat([length, name, data, checksum]);
}

function createPng(red: number, green: number, blue: number) {
  const width = 32; const height = 32;
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0); header.writeUInt32BE(height, 4);
  header[8] = 8; header[9] = 6;
  const rows = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const start = y * (width * 4 + 1); rows[start] = 0;
    for (let x = 0; x < width; x += 1) {
      const pixel = start + 1 + x * 4;
      rows[pixel] = red; rows[pixel + 1] = green; rows[pixel + 2] = blue; rows[pixel + 3] = 255;
    }
  }
  return Buffer.concat([Buffer.from("89504e470d0a1a0a", "hex"), pngChunk("IHDR", header), pngChunk("IDAT", deflateSync(rows)), pngChunk("IEND", Buffer.alloc(0))]);
}

async function mediaFixtures(projectName: string): Promise<MediaFixtures> {
  const directory = join(process.cwd(), "test-results", "fixtures", projectName);
  mkdirSync(directory, { recursive: true });
  const colors = [[220, 40, 40], [40, 150, 80], [50, 90, 210], [220, 150, 30], [130, 70, 190], [20, 160, 180], [170, 40, 110]];
  const images = colors.map(([red, green, blue], index) => {
    const path = join(directory, `image-${index + 1}.png`);
    writeFileSync(path, createPng(red, green, blue));
    return path;
  });
  const audio = join(directory, "e2e-tone.mp3");
  const { Mp3Encoder } = await import("@breezystack/lamejs");
  const sampleRate = 44_100;
  const samples = new Int16Array(sampleRate * 2);
  for (let index = 0; index < samples.length; index += 1) samples[index] = Math.round(Math.sin(2 * Math.PI * 440 * index / sampleRate) * 8_000);
  const encoder = new Mp3Encoder(1, sampleRate, 64);
  const chunks: Uint8Array[] = [];
  for (let offset = 0; offset < samples.length; offset += 1_152) {
    const chunk = encoder.encodeBuffer(samples.subarray(offset, Math.min(offset + 1_152, samples.length)));
    if (chunk.length) chunks.push(chunk);
  }
  const finalChunk = encoder.flush();
  if (finalChunk.length) chunks.push(finalChunk);
  writeFileSync(audio, Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))));
  return { images, audio };
}

async function createOwner(admin: SupabaseClient): Promise<OwnerFixture> {
  const suffix = randomUUID().slice(0, 8);
  const email = `browser-owner-${suffix}@local.ngaturi.test`;
  const password = `Local-browser-${suffix}-A1!`;
  const created = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { name: "Browser E2E Owner" } });
  if (created.error || !created.data.user) throw created.error ?? new Error("Owner E2E lokal gagal dibuat.");
  const quota = await admin.from("profiles").update({ route_quota: 3 }).eq("id", created.data.user.id);
  if (quota.error) throw quota.error;
  return { id: created.data.user.id, email, password };
}

async function deleteOwnerFixture(admin: SupabaseClient, ownerId: string) {
  const { data: media, error: mediaError } = await admin.from("invitation_media").select("id,storage_path").eq("owner_id", ownerId);
  if (mediaError) throw mediaError;
  const mediaIds = (media ?? []).map((item) => String(item.id));
  const { data: variants, error: variantError } = mediaIds.length
    ? await admin.from("invitation_media_variants").select("storage_path").in("media_id", mediaIds)
    : { data: [], error: null };
  if (variantError) throw variantError;
  const paths = [...(media ?? []).map((item) => String(item.storage_path)), ...(variants ?? []).map((item) => String(item.storage_path))];
  if (paths.length) {
    const removed = await admin.storage.from("invitation-media").remove(paths);
    if (removed.error) throw removed.error;
  }
  const mediaDelete = await admin.from("invitation_media").delete().eq("owner_id", ownerId);
  if (mediaDelete.error) throw mediaDelete.error;
  const invitationDelete = await admin.from("invitations").delete().eq("owner_id", ownerId);
  if (invitationDelete.error) throw invitationDelete.error;
  const routeDelete = await admin.from("invitation_routes").delete().eq("owner_id", ownerId);
  if (routeDelete.error) throw routeDelete.error;
  const authDelete = await admin.auth.admin.deleteUser(ownerId);
  if (authDelete.error) throw authDelete.error;
}

async function login(page: Page, owner: OwnerFixture) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(owner.email);
  await page.getByLabel("Password").fill(owner.password);
  await page.getByRole("button", { name: "Masuk" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

async function noHorizontalOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
}

async function waitForImageUpload(page: Page, expectedAlt: string) {
  await expect(page.getByAltText(expectedAlt).first()).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText(/Mengoptimasi dan mengunggah|Memvalidasi dan mengunggah/)).toHaveCount(0, { timeout: 60_000 });
}

test.describe("wedding-default production browser journey", () => {
  let status: LocalStatus;
  let admin: SupabaseClient;
  let owner: OwnerFixture;
  let fixtures: MediaFixtures;

  test.beforeEach(async ({}, testInfo) => {
    status = localStatus();
    admin = createClient(status.API_URL, status.SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
    owner = await createOwner(admin);
    fixtures = await mediaFixtures(testInfo.project.name);
  });

  test.afterEach(async () => {
    if (owner?.id) await deleteOwnerFixture(admin, owner.id);
  });

  test("Create through moderation remains usable and resilient", async ({ page }, testInfo: TestInfo) => {
    const viewport = testInfo.project.use.viewport as { width: number; height: number };
    const suffix = randomUUID().slice(0, 8);
    const title = `Undangan Browser ${testInfo.project.name}`;
    const slug = `browser-${testInfo.project.name}-${suffix}`;
    const wishName = `Wish ${testInfo.project.name}`;
    const wishMessage = `Semoga bahagia dari ${testInfo.project.name} ${suffix}`;
    const rsvpName = `RSVP ${testInfo.project.name}`;

    await login(page, owner);
    const health = await page.request.get("/api/health");
    const readiness = await page.request.get("/api/readiness");
    expect(health.status()).toBe(200);
    expect(readiness.status()).toBe(200);
    expect(health.headers()["content-security-policy"]).toContain("frame-src 'self' https://www.youtube-nocookie.com https://player.vimeo.com https://www.google.com");
    await page.goto("/dashboard/invitations/new");
    await page.getByLabel("Judul").fill(title);
    await page.getByLabel("Slug route baru").fill(slug);
    await expect(page.getByLabel("Template")).toHaveValue("wedding-default@1");
    await page.getByRole("button", { name: "Buat dan lanjut edit" }).click();
    await expect(page).toHaveURL(/\/dashboard\/invitations\/[0-9a-f-]+\/edit$/);
    const editorUrl = page.url();
    const invitationId = new URL(editorUrl).pathname.split("/")[3];

    for (const moduleName of ["Video", "RSVP", "Hadiah", "Ucapan"]) await page.getByRole("checkbox", { name: moduleName, exact: true }).check();
    await page.getByLabel("Label sampul").fill("Undangan Pernikahan");
    await page.getByLabel("Judul sampul").fill("Hari Bahagia E2E");
    await page.getByLabel("Nama lengkap partner satu").fill("Nadia Browser");
    await page.getByLabel("Nama panggilan partner satu").fill("Nadia");
    await page.getByLabel("Nama lengkap partner dua").fill("Raka Browser");
    await page.getByLabel("Nama panggilan partner dua").fill("Raka");
    await page.getByLabel("Judul acara").fill("Akad dan Resepsi");
    await page.getByLabel("Lokasi", { exact: true }).fill("Pendopo Browser");
    await page.getByRole("textbox", { name: "Alamat", exact: true }).fill("Jalan Browser No. 1, Bandung");
    await page.getByLabel("Teks pembuka").fill("Selamat datang di undangan browser kami.");
    await page.getByLabel("Quote").fill("Cinta tumbuh dalam kebersamaan.");
    await page.getByRole("textbox", { name: "Cerita", exact: true }).fill("Cerita kami divalidasi melalui browser nyata.");
    await page.getByLabel("Teks penutup").fill("Terima kasih atas doa dan kehadirannya.");
    await page.getByLabel("Label hitung mundur").fill("Menuju hari browser");

    await page.route("**/storage/v1/**", async (route) => { await new Promise((resolve) => setTimeout(resolve, 200)); await route.continue(); });
    const imageEditor = page.locator("[data-image-media]");
    await imageEditor.getByLabel("Upload foto").nth(0).setInputFiles(fixtures.images[0]);
    await waitForImageUpload(page, "Foto image 1");
    await imageEditor.getByLabel("Ganti foto").first().setInputFiles(fixtures.images[1]);
    await waitForImageUpload(page, "Foto image 2");
    await imageEditor.getByLabel("Upload foto").first().setInputFiles(fixtures.images[2]);
    await waitForImageUpload(page, "Foto image 3");
    const secondPartner = imageEditor.getByRole("heading", { name: "Foto Raka Browser" }).locator("..");
    await secondPartner.getByRole("button", { name: "Hapus foto" }).click();

    await imageEditor.getByLabel("Tambah image galeri").setInputFiles([fixtures.images[3], fixtures.images[4]]);
    await expect(imageEditor.getByRole("heading", { name: "Image 2" })).toBeVisible({ timeout: 60_000 });
    await imageEditor.getByRole("heading", { name: "Image 1" }).locator("..").getByRole("button", { name: "Turun" }).click();
    await imageEditor.getByRole("heading", { name: "Image 1" }).locator("..").getByLabel("Ganti image").setInputFiles(fixtures.images[5]);
    await waitForImageUpload(page, "Foto image 6");
    await imageEditor.getByRole("heading", { name: "Image 2" }).locator("..").getByRole("button", { name: "Hapus" }).click();
    await page.unroute("**/storage/v1/**");

    const audioEditor = page.locator("[data-audio-media]");
    await audioEditor.getByLabel("Upload custom audio").setInputFiles(fixtures.audio);
    await expect(page.getByText("e2e-tone.mp3", { exact: true })).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText(/Memvalidasi dan mengunggah/)).toHaveCount(0, { timeout: 60_000 });

    await page.getByLabel("Provider rekening bank baru").fill("BCA E2E");
    await page.getByLabel("Atas nama rekening bank baru").fill("Nadia Browser");
    await page.getByLabel("Nomor rekening bank baru").fill("1234567890");
    await page.getByRole("button", { name: "Tambah rekening bank" }).click();
    await page.getByLabel("URL YouTube atau Vimeo").fill("https://www.youtube.com/watch?v=abcdefghijk");
    await page.getByLabel("URL YouTube atau Vimeo").press("Tab");
    await expect(page.getByText("Provider:").locator("..")).toContainText("YouTube");
    await page.getByLabel("URL lokasi").first().fill("https://maps.google.com/?q=Pendopo+Browser");
    await page.getByLabel("URL lokasi").first().press("Tab");
    await page.getByRole("checkbox", { name: "Izinkan embed Google Maps setelah interaksi tamu" }).check();

    await noHorizontalOverflow(page);
    await page.getByRole("button", { name: "Preview langsung" }).click();
    const livePreview = page.getByRole("dialog", { name: "Preview undangan langsung" });
    await expect(livePreview.getByRole("button", { name: "Buka Undangan" })).toBeVisible();
    await livePreview.getByRole("button", { name: "Buka Undangan" }).click();
    await expect(livePreview.getByRole("button", { name: "Putar musik" })).toBeVisible();
    await page.getByRole("button", { name: "Tutup preview" }).click();

    await page.getByRole("button", { name: "Simpan perubahan" }).click();
    await expect.poll(async () => {
      const { data } = await admin.from("invitations").select("content").eq("id", invitationId).single();
      return JSON.stringify(data?.content ?? {});
    }, { timeout: 30_000 }).toContain("Nadia Browser");
    await page.reload();
    await expect(page.getByLabel("Nama lengkap partner satu")).toHaveValue("Nadia Browser");
    await expect(page.getByText("e2e-tone.mp3", { exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Image 1" })).toBeVisible();

    let interruptUpload = true;
    await page.route("**/storage/v1/**", async (route) => {
      if (interruptUpload) { interruptUpload = false; await route.abort("connectionfailed"); }
      else await route.continue();
    });
    await imageEditor.getByLabel("Tambah image galeri").setInputFiles(fixtures.images[6]);
    await expect(page.getByRole("alert").filter({ hasText: /Upload .*gagal|fetch|network/i })).toBeVisible({ timeout: 60_000 });
    await page.unroute("**/storage/v1/**");
    await expect(page.getByRole("button", { name: "Simpan perubahan" })).toBeEnabled();

    await page.goto(editorUrl.replace(/\/edit$/, "/preview"));
    for (const heading of ["Hari Bahagia E2E", "Nadia Browser", "Akad dan Resepsi", "Cerita Kami", "Galeri", "Cerita dalam gambar", "RSVP", "Tanda Kasih", "Kirim Ucapan", "Temukan tempatnya"]) {
      await expect(page.getByText(heading, { exact: true }).first()).toBeVisible();
    }
    await noHorizontalOverflow(page);

    await page.goto("/dashboard/invitations");
    const invitationCard = page.getByRole("heading", { name: title }).locator("..");
    await invitationCard.getByRole("button", { name: "Publish" }).click();
    await expect(invitationCard.getByRole("button", { name: "Unpublish" })).toBeVisible();

    const guestContext = await page.context().browser()!.newContext({ viewport, permissions: ["clipboard-read", "clipboard-write"] });
    const guestPage = await guestContext.newPage();
    await guestPage.goto(`/${slug}`);
    await expect(guestPage.getByRole("button", { name: "Buka Undangan" })).toBeVisible();
    await expect(guestPage.locator("iframe")).toHaveCount(0);
    await guestPage.getByRole("button", { name: "Buka Undangan" }).click();
    await expect(guestPage.locator('[data-template="wedding-default@1"]')).toHaveAttribute("data-opened", "true");
    await expect.poll(() => guestPage.locator("audio").evaluate((audio: HTMLAudioElement) => audio.paused)).toBe(false);
    const publicAudio = guestPage.locator("audio");
    await publicAudio.evaluate((audio) => { audio.dataset.e2eStableTrack = "true"; });
    await guestPage.waitForTimeout(250);
    await guestPage.getByRole("button", { name: "Jeda musik" }).click();
    await expect(guestPage.getByRole("button", { name: "Putar musik" })).toBeVisible();
    const pausedAt = await publicAudio.evaluate((audio: HTMLAudioElement) => audio.currentTime);
    const audioSource = await publicAudio.getAttribute("src");
    await guestPage.getByRole("button", { name: "Putar musik" }).click();
    await expect(guestPage.getByRole("button", { name: "Jeda musik" })).toBeVisible();
    await guestPage.waitForTimeout(250);
    expect(await publicAudio.getAttribute("data-e2e-stable-track")).toBe("true");
    expect(await publicAudio.getAttribute("src")).toBe(audioSource);
    expect(await publicAudio.evaluate((audio: HTMLAudioElement) => audio.currentTime)).toBeGreaterThanOrEqual(pausedAt);
    const { data: replacedGalleryMedia, error: replacedGalleryError } = await admin.from("invitation_media")
      .select("id")
      .eq("owner_id", owner.id)
      .eq("alt_text", "Foto image 6")
      .single();
    expect(replacedGalleryError).toBeNull();
    const galleryMediaResponse = await guestPage.request.get(`/api/public-media/${replacedGalleryMedia!.id}?variant=large`);
    expect(galleryMediaResponse.status()).toBe(200);
    expect(galleryMediaResponse.headers()["content-type"]).toBe("image/webp");
    const galleryMediaBytes = Buffer.from(await galleryMediaResponse.body());
    expect(galleryMediaBytes.subarray(0, 4).toString("ascii")).toBe("RIFF");
    expect(galleryMediaBytes.subarray(8, 12).toString("ascii")).toBe("WEBP");
    const publicGalleryImage = guestPage.getByAltText("Foto image 6");
    await publicGalleryImage.scrollIntoViewIfNeeded();
    await expect(publicGalleryImage).toHaveAttribute("src", /public-media/);
    await expect.poll(() => publicGalleryImage.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
    await expect(publicGalleryImage).toHaveAttribute("src", /public-media/);

    const failedMediaContext = await page.context().browser()!.newContext({ viewport });
    const failedMediaPage = await failedMediaContext.newPage();
    let imageRequestFailed = false;
    await failedMediaPage.route("**/_next/image?*", async (route) => {
      if (!imageRequestFailed) {
        imageRequestFailed = true;
        await route.fulfill({ status: 503, contentType: "text/plain", body: "temporary image failure" });
        return;
      }
      await route.continue();
    });
    await failedMediaPage.goto(`/${slug}`);
    await expect(failedMediaPage.getByRole("button", { name: "Buka Undangan" })).toBeVisible();
    expect(imageRequestFailed).toBe(true);
    await failedMediaPage.unroute("**/_next/image?*");
    await failedMediaPage.reload();
    await expect.poll(() => failedMediaPage.locator("img").evaluateAll((images) => images.some((image) => (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0))).toBe(true);
    await failedMediaContext.close();

    await guestPage.getByRole("button", { name: "Salin nomor" }).click();
    await expect(guestPage.getByText("Nomor BCA E2E berhasil disalin.")).toBeVisible();
    await expect(guestPage.locator("iframe")).toHaveCount(0);
    let youtubeBlocked = false;
    await guestPage.route("https://www.youtube-nocookie.com/**", (route) => { youtubeBlocked = true; return route.abort("blockedbyclient"); });
    await guestPage.getByRole("button", { name: "Tampilkan video" }).click();
    const videoFrame = guestPage.getByTitle("Video perjalanan pasangan");
    await expect(videoFrame).toBeVisible();
    await expect.poll(() => youtubeBlocked).toBe(true);
    await expect(guestPage.getByRole("link", { name: "Buka di YouTube" })).toHaveAttribute("href", "https://www.youtube.com/watch?v=abcdefghijk");
    let mapsBlocked = false;
    await guestPage.route("https://www.google.com/maps**", (route) => { mapsBlocked = true; return route.abort("blockedbyclient"); });
    await guestPage.getByRole("button", { name: "Tampilkan peta" }).click();
    const mapFrame = guestPage.getByTitle("Peta Pendopo Browser");
    await expect(mapFrame).toBeVisible();
    await expect.poll(() => mapsBlocked).toBe(true);
    await expect(guestPage.getByRole("link", { name: "Buka Maps" }).first()).toHaveAttribute("href", /google\.com\/maps/);

    const rsvp = guestPage.locator("#wedding-default-rsvp");
    await rsvp.getByLabel("Nama").fill(rsvpName);
    await rsvp.getByLabel("Jumlah tamu").selectOption("2");
    await rsvp.getByLabel(/Pesan atau catatan/).fill("Hadir dari browser.");
    await rsvp.getByRole("button", { name: "Kirim RSVP" }).dblclick();
    await expect(rsvp.getByText(/RSVP Anda sudah tercatat/)).toBeVisible();
    const wishes = guestPage.locator("#wedding-default-wishes");
    await wishes.getByLabel("Nama").fill(wishName);
    await wishes.getByLabel("Ucapan").fill(wishMessage);
    await wishes.getByRole("button", { name: "Kirim Ucapan" }).dblclick();
    await expect(wishes.getByText(/ucapan Anda sudah dikirim/)).toBeVisible();
    await expect(wishes.getByText(wishMessage)).toHaveCount(0);
    await noHorizontalOverflow(guestPage);
    await testInfo.attach(`public-${testInfo.project.name}`, { body: await guestPage.screenshot({ fullPage: true }), contentType: "image/png" });

    const deniedContext = await page.context().browser()!.newContext({ viewport });
    await deniedContext.addInitScript(() => {
      HTMLMediaElement.prototype.play = function () { return Promise.reject(new DOMException("Playback blocked", "NotAllowedError")); };
    });
    const deniedPage = await deniedContext.newPage();
    await deniedPage.goto(`/${slug}`);
    await deniedPage.getByRole("button", { name: "Buka Undangan" }).click();
    await expect(deniedPage.locator('[data-template="wedding-default@1"]')).toHaveAttribute("data-opened", "true");
    await expect(deniedPage.getByRole("button", { name: "Putar musik" })).toBeVisible();
    await deniedContext.close();

    await page.goto(editorUrl);
    await expect(page.getByText(rsvpName, { exact: true })).toBeVisible();
    const pendingWish = page.getByText(wishMessage, { exact: true }).locator("..");
    await expect(pendingWish).toBeVisible();
    await pendingWish.getByRole("button", { name: "Setujui" }).click();
    await expect(pendingWish).toHaveCount(0);
    const { data: moderatedWish, error: moderatedWishError } = await admin.from("invitation_wishes")
      .select("invitation_id,status,message")
      .eq("invitation_id", invitationId)
      .eq("message", wishMessage)
      .single();
    expect(moderatedWishError).toBeNull();
    expect(moderatedWish).toMatchObject({ status: "approved", message: wishMessage });
    const { data: approvedWishes, error: approvedWishesError } = await admin.rpc("list_public_approved_invitation_wishes", {
      p_invitation_id: moderatedWish!.invitation_id,
      p_limit: 11,
      p_before_created_at: null,
      p_before_id: null,
    });
    expect(approvedWishesError).toBeNull();
    expect(approvedWishes).toEqual(expect.arrayContaining([expect.objectContaining({ message: wishMessage })]));
    await guestPage.reload();
    await guestPage.getByRole("button", { name: "Buka Undangan" }).click();
    await guestPage.locator("#wedding-default-wishes").scrollIntoViewIfNeeded();
    await expect(guestPage.getByText(/Memuat ucapan/)).toHaveCount(0);
    await expect(guestPage.getByText(wishMessage, { exact: false })).toBeVisible();

    await page.goto("/dashboard/invitations");
    const publishedCard = page.getByRole("heading", { name: title }).locator("..");
    await publishedCard.getByRole("button", { name: "Unpublish" }).click();
    await expect(publishedCard.getByRole("button", { name: "Publish" })).toBeVisible();
    await expect.poll(async () => {
      const { data } = await admin.from("invitations").select("status").eq("id", invitationId).single();
      return data?.status;
    }, { timeout: 30_000 }).toBe("inactive");
    await guestPage.goto(`/${slug}?publication=inactive-${suffix}`, { waitUntil: "networkidle" });
    await expect(guestPage.getByRole("heading", { name: "Undangan tidak ditemukan" })).toBeVisible();
    await page.getByRole("heading", { name: title }).locator("..").getByRole("button", { name: "Publish" }).click();
    await expect.poll(async () => {
      const { data } = await admin.from("invitations").select("status").eq("id", invitationId).single();
      return data?.status;
    }, { timeout: 30_000 }).toBe("published");
    await guestPage.goto(`/${slug}?publication=published-${suffix}`, { waitUntil: "networkidle" });
    await expect(guestPage.getByRole("button", { name: "Buka Undangan" })).toBeVisible();

    await guestContext.close();
  });
});
