(() => {
  const { createClient } = supabase;
  const db = createClient(window.SUPABASE_URL, window.SUPABASE_PUBLISHABLE_KEY);
  const $ = (id) => document.getElementById(id);
  const BUCKET = "memory-photos";
  let currentUser = null;

  function showError(message) { $("loginError").textContent = message; }
  async function getRole(userId) {
    const { data, error } = await db.from("user_roles").select("role").eq("user_id", userId).maybeSingle();
    if (error) throw error;
    return data?.role || null;
  }
  async function signedPhoto(path) {
    const { data, error } = await db.storage.from(BUCKET).createSignedUrl(path, 3600);
    if (error) throw error;
    return data.signedUrl;
  }
  function formatDate(value) {
    if (!value) return "A special day";
    return new Date(value + "T12:00:00").toLocaleDateString("en-US", { year:"numeric", month:"long", day:"numeric" });
  }
  function updateCounter() {
    const start = new Date(2025, 10, 19, 0, 0, 0);
    const diff = Math.max(0, Date.now() - start.getTime());
    const total = Math.floor(diff / 1000);
    $("days").textContent = Math.floor(total / 86400);
    $("hours").textContent = String(Math.floor(total % 86400 / 3600)).padStart(2, "0");
    $("minutes").textContent = String(Math.floor(total % 3600 / 60)).padStart(2, "0");
    $("seconds").textContent = String(total % 60).padStart(2, "0");
  }
  async function signedMedia(path) {
    const { data, error } = await db.storage.from(BUCKET).createSignedUrl(path, 3600);
    if (error) throw error;
    return data.signedUrl;
  }
  async function loadSiteContent() {
    const { data, error } = await db.from("site_content").select("content_key,content_value");
    if (error) { console.warn("Site text is using its default copy.", error); return; }
    for (const item of (data || [])) {
      const el = document.querySelector(`[data-content="${CSS.escape(item.content_key)}"]`);
      if (el) el.textContent = item.content_value ?? "";
    }
  }
  async function loadAlbums() {
    const holder = $("albums");
    const { data, error } = await db.from("albums").select("id,title,event_date,story,cover_path,album_photos(id,storage_path,caption,sort_order),album_music(id,storage_path,title)").order("event_date", { ascending:false, nullsFirst:false });
    if (error) { holder.innerHTML = '<p class="error">Could not load albums. Please refresh and try again.</p>'; console.error(error); return; }
    if (!data?.length) { holder.innerHTML = '<div class="empty-state"><span>♡</span><h3>Our story starts here</h3><p class="arabic" dir="rtl">لسه هنملى المكان ده بذكرياتنا الحلوة.</p></div>'; return; }
    holder.innerHTML = "";
    for (const album of data) {
      const photos = (album.album_photos || []).sort((a,b) => (a.sort_order||0)-(b.sort_order||0));
      let cover = "";
      try { if (album.cover_path) cover = await signedPhoto(album.cover_path); else if (photos[0]) cover = await signedPhoto(photos[0].storage_path); } catch(e) { console.warn(e); }
      const card = document.createElement("button");
      card.className = "album-card";
      card.type = "button";
      const img = document.createElement("div"); img.className = "album-cover";
      if (cover) { const image = document.createElement("img"); image.src = cover; image.alt = album.title; img.appendChild(image); }
      else img.innerHTML = '<span class="cover-heart">♡</span>';
      const body = document.createElement("div"); body.className = "album-info";
      const date = document.createElement("span"); date.className = "album-date"; date.textContent = formatDate(album.event_date);
      const title = document.createElement("h3"); title.textContent = album.title;
      const count = document.createElement("p"); count.textContent = `${photos.length} ${photos.length === 1 ? "photo" : "photos"}`;
      const story = document.createElement("p");
story.className = "album-story-preview";
story.textContent = album.story || "";

body.append(date, title, story, count);
card.append(img, body);
      card.addEventListener("click", () => openAlbum(album, photos, album.album_music || []));
      holder.appendChild(card);
    }
  }

async function openAlbum(album, photos, songs = []) {
  $("albumTitle").textContent = album.title;
  $("albumDate").textContent = formatDate(album.event_date);
  $("albumStory").textContent = album.story || "";
  $("albumPhotos").innerHTML = '<div class="loading">Opening memory…</div>';
  $("albumModal").classList.add("visible");
$("albumModal").classList.add("photo-view-mode");
  const grid = $("albumPhotos");
  const oldMusic = $("albumMusic");
  if (oldMusic) oldMusic.remove();

  // Album music
  if (songs.length) {
    try {
      const audioUrl = await signedMedia(songs[0].storage_path);
      const musicBox = document.createElement("section");
      musicBox.id = "albumMusic";
      musicBox.className = "album-music";

      const heading = document.createElement("h3");
      heading.textContent = "♪ A song for this memory";

      const name = document.createElement("p");
      name.textContent = songs[0].title || "Our album song";

      const player = document.createElement("audio");
      player.controls = true;
      player.preload = "none";
      player.src = audioUrl;

      musicBox.append(heading, name, player);
      $("albumStory").after(musicBox);
    } catch (e) {
      console.error("Music error:", e);
    }
  }

  grid.innerHTML = "";

  if (!photos.length) {
    grid.innerHTML =
      '<p class="muted arabic" dir="rtl">الألبوم ده لسه مستني صوره ❤️</p>';
    return;
  }

  // Load signed photo URLs
  const gallery = [];

  for (const photo of photos) {
    try {
      const url = await signedPhoto(photo.storage_path);
      gallery.push({
        url,
        caption: photo.caption || ""
      });
    } catch (e) {
      console.error("Photo error:", e);
    }
  }

  if (!gallery.length) {
    grid.innerHTML = '<p class="error">Could not load photos.</p>';
    return;
  }

  let currentIndex = 0;

  const viewer = document.createElement("div");
  viewer.className = "mobile-gallery";

  const stage = document.createElement("div");
  stage.className = "gallery-stage";

  const image = document.createElement("img");
  image.className = "gallery-image";
  image.alt = album.title;
  image.draggable = false;

  const previous = document.createElement("button");
  previous.className = "gallery-arrow gallery-prev";
  previous.type = "button";
  previous.textContent = "‹";
  previous.setAttribute("aria-label", "Previous photo");

  const next = document.createElement("button");
  next.className = "gallery-arrow gallery-next";
  next.type = "button";
  next.textContent = "›";
  next.setAttribute("aria-label", "Next photo");

  const caption = document.createElement("p");
  caption.className = "gallery-caption";

  const counter = document.createElement("div");
  counter.className = "gallery-counter";

  function showPhoto(index) {
    currentIndex = (index + gallery.length) % gallery.length;

    image.src = gallery[currentIndex].url;
    caption.textContent = gallery[currentIndex].caption;
    counter.textContent = `${currentIndex + 1} / ${gallery.length}`;

    previous.disabled = gallery.length < 2;
    next.disabled = gallery.length < 2;
  }

  previous.addEventListener("click", () => {
    showPhoto(currentIndex - 1);
  });

  next.addEventListener("click", () => {
    showPhoto(currentIndex + 1);
  });

  // Touch swipe
  let touchStartX = 0;
  let touchStartY = 0;

  stage.addEventListener("touchstart", e => {
    touchStartX = e.changedTouches[0].screenX;
    touchStartY = e.changedTouches[0].screenY;
  }, { passive: true });

  stage.addEventListener("touchend", e => {
    const endX = e.changedTouches[0].screenX;
    const endY = e.changedTouches[0].screenY;
    const diffX = endX - touchStartX;
    const diffY = endY - touchStartY;

    if (Math.abs(diffX) > 45 && Math.abs(diffX) > Math.abs(diffY)) {
      if (diffX < 0) showPhoto(currentIndex + 1);
      else showPhoto(currentIndex - 1);
    }
  }, { passive: true });

  stage.append(image, previous, next);
  viewer.append(stage, counter, caption);
  grid.appendChild(viewer);

  rHTMshowPhoto(0);
}
  
  $("closeAlbum").addEventListener("click", () => {
  $("albumModal").classList.remove("visible", "photo-view-mode");
});
 $("albumModal").addEventListener("click", e => {
  if (e.target === $("albumModal")) {
    $("albumModal").classList.remove("visible", "photo-view-mode");
  }
});
  $("loginForm").addEventListener("submit", async e => {
    e.preventDefault(); showError("");
    const { data, error } = await db.auth.signInWithPassword({ email:$("email").value.trim(), password:$("password").value });
    if (error) { showError("Login failed. Check your email and password."); return; }
    currentUser = data.user;
    try {
      const role = await getRole(currentUser.id);
      if (!["admin","viewer"].includes(role)) { await db.auth.signOut(); showError("This account has no access to this private website."); return; }
      $("loginModal").classList.remove("visible");
      $("logoutBtn").classList.remove("hidden");
      if (role === "admin") {
        const link = document.createElement("a"); link.href = "admin.html"; link.textContent = "Admin Studio"; document.querySelector("nav").prepend(link);
      }
      await loadSiteContent();
      await loadAlbums();
    } catch(err) { console.error(err); showError("Could not verify account permissions. Please try again."); }
  });
  $("logoutBtn").addEventListener("click", async () => { await db.auth.signOut(); location.reload(); });
  (async () => {
    updateCounter(); setInterval(updateCounter, 1000);
    const { data } = await db.auth.getSession();
    if (data.session?.user) {
      currentUser = data.session.user;
      try {
        const role = await getRole(currentUser.id);
        if (["admin","viewer"].includes(role)) {
          $("loginModal").classList.remove("visible"); $("logoutBtn").classList.remove("hidden");
          if (role === "admin") { const link=document.createElement("a"); link.href="admin.html"; link.textContent="Admin Studio"; document.querySelector("nav").prepend(link); }
          await loadSiteContent();
          await loadAlbums(); return;
        }
      } catch(e) { console.error(e); }
      await db.auth.signOut();
    }
  })();
})();
