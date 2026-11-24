
(() => {
  const db = supabase.createClient(window.SUPABASE_URL, window.SUPABASE_PUBLISHABLE_KEY);
  const $ = id => document.getElementById(id);
  const BUCKET = "memory-photos";
const VIDEO_BUCKET = "memory-videos";
  let albumsCache = [];
  const editableContent = [
    ["hero_eyebrow","Hero — small heading","A LITTLE PLACE FOR OUR FOREVER",false],
    ["hero_title","Hero — main heading","Every moment with you",false],
    ["hero_title_em","Hero — highlighted heading","is my favorite.",false],
    ["hero_message","Hero — Arabic message","كل ذكرى معاكي ليها مكان خاص في قلبي، ولسه أجمل الحكايات جاية.",true],
    ["hero_button","Hero — button","Explore our memories",false],
    ["counter_kicker","Counter — small heading","AND THE COUNTING NEVER STOPS",false],
    ["counter_title","Counter — title","Our Time Together",false],
    ["counter_message","Counter — Arabic message","من يوم ما بدأت حكايتنا، وكل ثانية بتعدّي بتخليني أحبك أكتر.",true],
    ["counter_since","Counter — date caption","Since November 19, 2025",false],
    ["memories_kicker","Memories — small heading","OUR LITTLE TIME CAPSULE",false],
    ["memories_title","Memories — title","Our Memories",false],
    ["memories_message","Memories — Arabic message","كل ألبوم حكاية، وكل صورة فيها جزء من عمرنا سوا.",true],
    ["footer_text","Footer — main text","Made with love, for Lola",false],
    ["footer_subtitle","Footer — subtitle","Our story, one memory at a time.",false],
    ["login_kicker","Login — small heading","A PRIVATE LITTLE WORLD",false],
    ["login_title","Login — title","Welcome back",false],
    ["login_message","Login — Arabic message","ادخلي عشان تشوفي ذكرياتنا الجميلة ❤️",true],
    ["login_button","Login — button","Enter our world",false],
  ];
  function contentStatus(text,bad=false){ $("contentMessage").textContent=text; $("contentMessage").className=bad?"message error":"message success"; }
  async function loadEditableContent(){
    const holder=$("contentFields");
    holder.innerHTML="";
    const timeout=setTimeout(()=>{ if(holder.querySelector(".loading")) holder.innerHTML='<p class="error">Loading timed out. Check your connection and Supabase settings, then refresh.</p>'; },12000);
    const {data,error}=await db.from("site_content").select("content_key,content_value");
    clearTimeout(timeout);
    if(error){ $("contentFields").innerHTML='<p class="error">Could not load messages. Run the site-content SQL setup first.</p>'; console.error(error); return; }
    const values=Object.fromEntries((data||[]).map(x=>[x.content_key,x.content_value]));
    holder.innerHTML="";
    for(const [key,label,placeholder,arabic] of editableContent){
  const wrap=document.createElement("label");
  wrap.textContent=label;

  const input = document.createElement(
    key === "love_letter_enabled" ? "input" : (arabic ? "textarea" : "input")
  );

  if(key === "love_letter_enabled"){
    input.type = "checkbox";
    input.checked = (values[key] ?? placeholder) === "true";
  } else {
    input.value = values[key] ?? placeholder;
    input.placeholder = placeholder;
    if(arabic){
      input.dir = "rtl";
      input.rows = 3;
    } else {
      input.maxLength = 300;
    }
  }

  input.dataset.contentKey = key;
  wrap.appendChild(input);
  holder.appendChild(wrap);
}
  }
  async function saveEditableContent(e){
    e.preventDefault(); const btn=$("saveContentBtn"); btn.disabled=true; contentStatus("Saving messages…");
    try{
     const rows=Array.from(document.querySelectorAll("[data-content-key]")).map(el=>({
  content_key:el.dataset.contentKey,
  content_value:el.type==="checkbox" ? String(el.checked) : el.value.trim()
}));
      const {error}=await db.from("site_content").upsert(rows,{onConflict:"content_key"}); if(error) throw error;
      contentStatus("Saved! The website messages have been updated.");
    }catch(err){console.error(err);contentStatus(err.message||"Could not save messages. Check the SQL setup and admin policy.",true);}
    finally{btn.disabled=false;}
  }
  $("contentForm").addEventListener("submit",saveEditableContent);

  // Separate, collapsible website editor
  $("toggleContentEditor").addEventListener("click", () => {
    const panel = $("contentEditorPanel");
    const open = panel.classList.toggle("hidden") === false;
    $("toggleContentEditor").textContent = open ? "Close editor" : "Edit Website";
    $("toggleContentEditor").setAttribute("aria-expanded", String(open));
  });
  async function loadLoveLetterSettings() {
    const { data, error } = await db.from("site_content")
      .select("content_key,content_value")
      .in("content_key", ["love_letter_message", "love_letter_enabled"]);
    if (error) {
      $("loveLetterStatus").textContent = "Could not load the letter settings.";
      console.error(error);
      return;
    }
    const values = Object.fromEntries((data || []).map(row => [row.content_key, row.content_value]));
    $("loveLetterMessageEditor").value = values.love_letter_message || "يا لولا، وجودك في حياتي أجمل صدفة وأحلى حكاية ❤️";
    $("loveLetterVisibility").checked = (values.love_letter_enabled ?? "true") === "true";
  }

  $("toggleLoveLetterEditor").addEventListener("click", () => {
    const panel = $("loveLetterEditorPanel");
    const open = panel.classList.toggle("hidden") === false;
    $("toggleLoveLetterEditor").textContent = open ? "Close message editor" : "Edit Message";
    $("toggleLoveLetterEditor").setAttribute("aria-expanded", String(open));
  });

  $("loveLetterForm").addEventListener("submit", async e => {
    e.preventDefault();
    const button = $("saveLoveLetterBtn");
    const status = $("loveLetterStatus");
    button.disabled = true;
    status.textContent = "Saving love letter…";
    const rows = [
      { content_key: "love_letter_message", content_value: $("loveLetterMessageEditor").value.trim() },
      { content_key: "love_letter_enabled", content_value: String($("loveLetterVisibility").checked) }
    ];
    try {
      const { error } = await db.from("site_content").upsert(rows, { onConflict: "content_key" });
      if (error) throw error;
      status.textContent = "Love letter settings saved ❤️";
      status.className = "message success";
    } catch (err) {
      console.error(err);
      status.textContent = err.message || "Could not save love letter settings.";
      status.className = "message error";
    } finally {
      button.disabled = false;
    }
  });

  async function roleFor(userId) {
    const { data, error } = await db.from("user_roles").select("role").eq("user_id",userId).maybeSingle();
    if (error) throw error; return data?.role || null;
  }
  function message(text, bad=false) { $("formMessage").textContent=text; $("formMessage").className=bad?"message error":"message success"; }
  function slug(text) { return text.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"") || "memory"; }
  async function refresh() {
   const { data, error } = await db
  .from("albums")
  .select("id,title,event_date,story,created_at,sort_order,album_photos(id,storage_path)")
  .order("sort_order", { ascending: true, nullsFirst: false })
  .order("created_at", { ascending: false });
    if (error) { $("adminAlbums").textContent="Could not load albums."; console.error(error); return; }
    albumsCache = data || [];
$("albumCount").textContent = `${albumsCache.length} albums`;

const videoAlbum = $("videoAlbum");
const selectedAlbum = videoAlbum.value;

videoAlbum.innerHTML = '<option value="">No album</option>';

for (const album of albumsCache) {
  const option = document.createElement("option");
  option.value = album.id;
  option.textContent = album.title;
  videoAlbum.appendChild(option);
}

videoAlbum.value = selectedAlbum;
    const list=$("adminAlbums"); list.innerHTML="";
    if (!albumsCache.length) {
  list.innerHTML = '<p class="muted arabic" dir="rtl">لسه مفيش ألبومات. ابدأ بأول ذكرى ❤️</p>';
  await loadAdminVideos();
  return;
}
  for (const a of albumsCache) {
  const row = document.createElement("div");
  row.className = "admin-album-row";
  row.draggable = true;
  row.dataset.albumId = a.id;
  row.style.cursor = "grab";

  row.addEventListener("dragstart", e => {
    row.classList.add("dragging");
    e.dataTransfer.setData("text/plain", a.id);
    e.dataTransfer.effectAllowed = "move";
  });

  row.addEventListener("dragend", () => {
    row.classList.remove("dragging");
  });

  row.addEventListener("dragover", e => {
    e.preventDefault();
    const dragging = list.querySelector(".dragging");
    if (!dragging || dragging === row) return;

    const rect = row.getBoundingClientRect();
        const after = e.clientY > rect.top + rect.height / 2;
    list.insertBefore(dragging, after ? row.nextSibling : row);
  });

  const info = document.createElement("div");
  const h = document.createElement("strong");
  h.textContent = a.title;

  const p = document.createElement("p");
 p.textContent = `${a.event_date || "No date"} · ${(a.album_photos || []).length} photos`;

  info.append(h, p);

  const actions = document.createElement("div");
  actions.className = "row-actions";

  const edit = document.createElement("button");
  edit.className = "secondary-btn small-btn";
  edit.textContent = "Edit";
  edit.onclick = () => editAlbum(a);

  const del = document.createElement("button");
  del.className = "danger-btn small-btn";
  del.textContent = "Delete";
  del.onclick = () => deleteAlbum(a);

  actions.append(edit, del);
  row.append(info, actions);
  list.append(row);
}
 await loadAdminVideos();
  }
  async function saveAlbumOrder() {
  const btn = $("saveAlbumOrderBtn");
  const status = $("albumOrderMessage");
  const rows = Array.from(
    $("adminAlbums").querySelectorAll(".admin-album-row")
  );

  btn.disabled = true;
  status.textContent = "Saving order…";
  status.className = "message";

  try {
    for (let i = 0; i < rows.length; i++) {
      const { error } = await db
        .from("albums")
        .update({ sort_order: i })
        .eq("id", rows[i].dataset.albumId);

      if (error) throw error;
    }

    status.textContent = "Album order saved! ❤️";
    status.className = "message success";

    await refresh();
  } catch (err) {
    console.error(err);
    status.textContent = err.message || "Could not save album order.";
    status.className = "message error";
  } finally {
    btn.disabled = false;
  }
}

$("saveAlbumOrderBtn").addEventListener("click", saveAlbumOrder);
function editAlbum(a) {
  $("albumId").value = a.id;
  $("title").value = a.title;
  $("eventDate").value = a.event_date || "";
  $("story").value = a.story || "";

  $("formHeading").textContent = "Edit memory album";
  $("saveBtn").textContent = "Save changes";
  $("cancelEdit").classList.remove("hidden");

  window.scrollTo({ top: 0, behavior: "smooth" });
}
 function resetForm() {
  $("albumForm").reset();
  $("albumId").value = "";
  $("formHeading").textContent = "Create a memory album";

  $("saveBtn").textContent = "Save album";
  $("cancelEdit").classList.add("hidden");

  renderPhotoSelection();
}
  $("cancelEdit").addEventListener("click",resetForm);
  function renderPhotoSelection() {
    const holder = $("selectedFiles");
    const files = Array.from($("photos").files || []);
    holder.innerHTML = "";
    if (!files.length) {
      holder.innerHTML = '<p class="hint">No photos selected yet.</p>';
      return;
    }
    const count = document.createElement("p");
    count.className = "selection-count";
    count.textContent = `${files.length} photo(s) selected`;
    holder.appendChild(count);
    const grid = document.createElement("div");
    grid.className = "selected-photo-grid";
    files.forEach((file, index) => {
      const card = document.createElement("div");
      card.className = "selected-photo-card";
      const img = document.createElement("img");
      const url = URL.createObjectURL(file);
      img.src = url;
      img.alt = file.name;
      img.onload = () => URL.revokeObjectURL(url);
      const name = document.createElement("span");
      name.textContent = file.name;
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "remove-selected-photo";
      remove.setAttribute("aria-label", `Remove ${file.name}`);
      remove.textContent = "×";
      remove.addEventListener("click", () => {
        const transfer = new DataTransfer();
        Array.from($("photos").files).forEach((f, i) => {
          if (i !== index) transfer.items.add(f);
        });
        $("photos").files = transfer.files;
        renderPhotoSelection();
      });
      card.append(img, name, remove);
      grid.appendChild(card);
    });
    holder.appendChild(grid);
  }
  $("photos").addEventListener("change", renderPhotoSelection);
 
  let videoPreviewUrl = null;

  $("videoFile").addEventListener("change", () => {
    const file = $("videoFile").files[0];
    const holder = $("videoPreview");
    holder.innerHTML = "";

    if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);
    videoPreviewUrl = null;

    if (!file) return;

    videoPreviewUrl = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.src = videoPreviewUrl;
    video.controls = true;
    video.preload = "metadata";
    video.playsInline = true;

    const meta = document.createElement("p");
    meta.className = "hint";
    meta.textContent = `${file.name} · ${(file.size / (1024 * 1024)).toFixed(1)} MB`;

    holder.append(video, meta);
  });

  async function uploadPhoto(file, albumId, index) {
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
    const path = `${albumId}/${Date.now()}-${index}.${ext}`;

    const { error: upErr } = await db.storage.from(BUCKET).upload(path, file, {
      upsert: false,
      contentType: file.type || "image/jpeg"
    });

    if (upErr) throw upErr;

    const { error: dbErr } = await db.from("album_photos").insert({
      album_id: albumId,
      storage_path: path,
      sort_order: index
    });

    if (dbErr) {
      await db.storage.from(BUCKET).remove([path]);
      throw dbErr;
    }
  }

  async function uploadVideo(file) {
    if (!file) throw new Error("Please choose a video.");

    const ext = (file.name.split(".").pop() || "").toLowerCase();

    if (!["mp4", "mov", "m4v"].includes(ext) && !file.type.startsWith("video/")) {
      throw new Error("Please choose an MP4, MOV, or M4V video.");
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
    const path = `videos/${Date.now()}-${safeName}`;

    const contentType = file.type || (
      ext === "mov" ? "video/quicktime" : "video/mp4"
    );

    const { error: uploadError } = await db.storage
      .from(VIDEO_BUCKET)
      .upload(path, file, { upsert: false, contentType });

    if (uploadError) throw uploadError;

    const albumId = $("videoAlbum").value || null;

    const { error: saveError } = await db.from("album_videos").insert({
      album_id: albumId,
      storage_path: path,
      title: $("videoTitle").value.trim(),
      description: $("videoDescription").value.trim() || null,
      show_in_section: $("showVideoInSection").checked
    });

    if (saveError) {
      await db.storage.from(VIDEO_BUCKET).remove([path]);
      throw saveError;
    }
  }

  async function loadAdminVideos() {
    const holder = $("adminVideos");
    holder.innerHTML = '<p class="loading">Loading videos...</p>';

    const { data, error } = await db
      .from("album_videos")
      .select("id,album_id,storage_path,title,description,show_in_section,created_at")
      .order("created_at", { ascending: false });

    if (error) {
      holder.textContent = "Could not load videos.";
      console.error(error);
      return;
    }

    holder.innerHTML = "";

    if (!data || !data.length) {
      holder.innerHTML = '<p class="muted">No videos uploaded yet.</p>';
      return;
    }

    for (const video of data) {
      const row = document.createElement("div");
      row.className = "admin-album-row";

      const info = document.createElement("div");
      const title = document.createElement("strong");
      title.textContent = video.title;

      const album = albumsCache.find(a => a.id === video.album_id);
      const details = document.createElement("p");
      details.textContent =
        `${album ? "Album: " + album.title : "No album"} · ` +
        `${video.show_in_section ? "Shown in Our Videos" : "Album only"}`;

      info.append(title, details);

      if (video.description) {
        const desc = document.createElement("p");
        desc.textContent = video.description;
        info.appendChild(desc);
      }

      const del = document.createElement("button");
      del.className = "danger-btn small-btn";
      del.textContent = "Delete";
      del.onclick = () => deleteVideo(video);

      row.append(info, del);
      holder.appendChild(row);
    }
  }
  async function deleteVideo(video) {
    if (!confirm(`Delete "${video.title}"? This cannot be undone.`)) return;

    try {
      const { error: storageError } = await db.storage
        .from(VIDEO_BUCKET)
        .remove([video.storage_path]);

      if (storageError) throw storageError;

      const { error: dbError } = await db
        .from("album_videos")
        .delete()
        .eq("id", video.id);

      if (dbError) throw dbError;

      await loadAdminVideos();
    } catch (err) {
      console.error(err);
      alert(err.message || "Could not delete video.");
    }
  }

  async function loadAdminMusic() {
    const holder = $("adminMusic");
    if (!holder) return;

    holder.innerHTML = '<p class="loading">Loading songs...</p>';

    const { data, error } = await db
      .from("site_music")
      .select("id,title,storage_path,sort_order,created_at")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) {
      console.error(error);
      holder.textContent = "Could not load songs.";
      return;
    }

    holder.innerHTML = "";

    if (!data || !data.length) {
      holder.innerHTML = '<p class="muted">No songs uploaded yet.</p>';
      return;
    }

    for (const song of data) {
      const row = document.createElement("div");
      row.className = "admin-album-row";

      const info = document.createElement("div");
      const title = document.createElement("strong");
      title.textContent = song.title || "Our Song";

      const details = document.createElement("p");
      details.textContent = "Standalone song · Our Music";

      info.append(title, details);

      const del = document.createElement("button");
      del.className = "danger-btn small-btn";
      del.textContent = "Delete";
      del.onclick = () => deleteSiteMusic(song);

      row.append(info, del);
      holder.appendChild(row);
    }
  }

  async function deleteSiteMusic(song) {
    if (!confirm(`Delete "${song.title}" from Our Music?`)) return;

    const status = $("musicMessage");

    try {
      status.textContent = "Deleting song...";

      const { error: dbError } = await db
        .from("site_music")
        .delete()
        .eq("id", song.id);

      if (dbError) throw dbError;

      const { error: storageError } = await db.storage
        .from(BUCKET)
        .remove([song.storage_path]);

      if (storageError) {
        console.error(storageError);
        status.textContent = "Song removed from library, but its file could not be deleted.";
        status.className = "message error";
        await loadAdminMusic();
        return;
      }

      status.textContent = "Song deleted successfully ❤️";
      status.className = "message success";

      await loadAdminMusic();
    } catch (err) {
      console.error(err);
      status.textContent = err.message || "Could not delete song.";
      status.className = "message error";
    }
  }

  $("musicForm").addEventListener("submit", async e => {
    e.preventDefault();

    const button = $("saveMusicBtn");
    const status = $("musicMessage");
    const file = $("musicFile").files[0];
    
    if (!file) {
      status.textContent = "Please choose an MP3 file.";
      status.className = "message error";
      return;
    }

    if (!(file.type === "audio/mpeg" || file.name.toLowerCase().endsWith(".mp3"))) {
      status.textContent = "Please choose an MP3 file.";
      status.className = "message error";
      return;
    }

    button.disabled = true;
    status.textContent = "Uploading song... Please wait.";
    status.className = "message";

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
    const path = `site-music/${Date.now()}-${safeName}`;

    try {
      const { error: uploadError } = await db.storage
        .from(BUCKET)
        .upload(path, file, {
          upsert: false,
          contentType: "audio/mpeg"
        });

      if (uploadError) throw uploadError;

      const { error: saveError } = await db
        .from("site_music")
        .insert({
          title: file.name.replace(/\.[^/.]+$/, ""),
          storage_path: path,
          sort_order: Date.now()
        });

      if (saveError) {
        await db.storage.from(BUCKET).remove([path]);
        throw saveError;
      }

      status.textContent = "Song uploaded successfully! ❤️";
      status.className = "message success";

      $("musicForm").reset();

      await loadAdminMusic();
    } catch (err) {
      console.error(err);
      status.textContent = err.message || "Could not upload song.";
      status.className = "message error";
    } finally {
      button.disabled = false;
    }
  });

  $("videoForm").addEventListener("submit", async e => {
    e.preventDefault();

    const btn = $("saveVideoBtn");
    const status = $("videoMessage");
    const file = $("videoFile").files[0];

    btn.disabled = true;
    status.textContent = "Uploading video... Please wait.";

    try {
      await uploadVideo(file);
      status.textContent = "Video uploaded successfully! ❤️";
      $("videoForm").reset();
      await loadAdminVideos();
    } catch (err) {
      console.error(err);
      status.textContent = err.message || "Could not upload video.";
    } finally {
      btn.disabled = false;
    }
  });

  $("albumForm").addEventListener("submit", async e => {
    e.preventDefault();
    $("saveBtn").disabled = true;
    message("Saving your memory…");

    try {
      const id = $("albumId").value;

      const payload = {
        title: $("title").value.trim(),
        event_date: $("eventDate").value || null,
        story: $("story").value.trim() || null
      };

      let albumId = id;

      if (id) {
        const { error } = await db.from("albums").update(payload).eq("id", id);
        if (error) throw error;
      } else {
        const { data, error } = await db.from("albums").insert(payload).select("id").single();
        if (error) throw error;
        albumId = data.id;
      }

      const files = Array.from($("photos").files);
      for (let i = 0; i < files.length; i++) {
        await uploadPhoto(files[i], albumId, i);
      }

      const { data: photoRows } = await db.from("album_photos")
        .select("storage_path,sort_order")
        .eq("album_id", albumId)
        .order("sort_order")
        .limit(1);

      if (photoRows?.[0]) {
        await db.from("albums").update({
          cover_path: photoRows[0].storage_path
        }).eq("id", albumId);
      }

      message("Saved! Your memory is now in the collection. ❤️");
      resetForm();
      await refresh();

    } catch (err) {
      console.error(err);
      message(err.message || "Could not save. Check your connection and policies.", true);
    } finally {
      $("saveBtn").disabled = false;
    }
  });

 
  async function deleteAlbum(a) {
    if (!confirm(`Delete "${a.title}" and all its photos? This cannot be undone.`)) {
      return;
    }

    try {
      message("Deleting album and its records…");

      // Get all photo records
      const { data: photos, error: photosError } = await db
        .from("album_photos")
        .select("id,storage_path")
        .eq("album_id", a.id);

      if (photosError) throw photosError;

      // Get videos attached to this album
      const { data: videos, error: videosError } = await db
        .from("album_videos")
        .select("id,storage_path")
        .eq("album_id", a.id);

      if (videosError) throw videosError;

      // Delete photo records from database
      const { error: deletePhotosError } = await db
        .from("album_photos")
        .delete()
        .eq("album_id", a.id);

      if (deletePhotosError) throw deletePhotosError;

      // Keep videos, but detach them from this album
      const { error: detachVideosError } = await db
        .from("album_videos")
        .update({ album_id: null })
        .eq("album_id", a.id);

      if (detachVideosError) throw detachVideosError;

      // Delete the album itself
      const { error: deleteAlbumError } = await db
        .from("albums")
        .delete()
        .eq("id", a.id);

      if (deleteAlbumError) throw deleteAlbumError;
      // Remove photo files from Storage
      const storagePaths = [
        ...(photos || []).map(p => p.storage_path)
      ].filter(Boolean);

      if (storagePaths.length) {
        const { error: storageError } = await db.storage
          .from(BUCKET)
          .remove(storagePaths);

        if (storageError) {
          console.error("Album deleted, but some storage files remain:", storageError);
          message("Album deleted, but some files could not be removed.", true);
          await refresh();
          return;
        }
      }

      await refresh();
      message("Album deleted successfully ❤️");

    } catch (err) {
      console.error("Delete album error:", err);
      message(err.message || "Could not delete album.", true);
    }
  }

  $("logoutBtn").addEventListener("click", async () => {
    await db.auth.signOut();
    location.href = "index.html";
  });
  (async () => {
    const { data } = await db.auth.getSession();

    if (!data.session?.user) {
      location.href = "index.html";
      return;
    }

    try {
      const role = await roleFor(data.session.user.id);

      if (role !== "admin") {
        alert("Admin access only.");
        location.href = "index.html";
        return;
      }

      await loadEditableContent();
await loadLoveLetterSettings();
renderPhotoSelection();
await refresh();
await loadAdminMusic();

    } catch (e) {
      console.error(e);
      alert("Could not verify admin access.");
      location.href = "index.html";
    }
  })();

})();
