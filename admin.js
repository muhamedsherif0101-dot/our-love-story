(() => {
  const db = supabase.createClient(window.SUPABASE_URL, window.SUPABASE_PUBLISHABLE_KEY);
  const $ = id => document.getElementById(id);
  const BUCKET = "memory-photos";
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
    ["login_button","Login — button","Enter our world",false]
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
    const holder=$("contentFields"); holder.innerHTML="";
    for(const [key,label,placeholder,arabic] of editableContent){
      const wrap=document.createElement("label"); wrap.textContent=label;
      const input=document.createElement(arabic?"textarea":"input");
      input.dataset.contentKey=key; input.value=values[key] ?? placeholder; input.placeholder=placeholder;
      if(arabic){input.dir="rtl";input.rows=3;} else input.maxLength=300;
      wrap.appendChild(input); holder.appendChild(wrap);
    }
  }
  async function saveEditableContent(e){
    e.preventDefault(); const btn=$("saveContentBtn"); btn.disabled=true; contentStatus("Saving messages…");
    try{
      const rows=Array.from(document.querySelectorAll("[data-content-key]")).map(el=>({content_key:el.dataset.contentKey,content_value:el.value.trim()}));
      const {error}=await db.from("site_content").upsert(rows,{onConflict:"content_key"}); if(error) throw error;
      contentStatus("Saved! The website messages have been updated.");
    }catch(err){console.error(err);contentStatus(err.message||"Could not save messages. Check the SQL setup and admin policy.",true);}
    finally{btn.disabled=false;}
  }
  $("contentForm").addEventListener("submit",saveEditableContent);

  async function roleFor(userId) {
    const { data, error } = await db.from("user_roles").select("role").eq("user_id",userId).maybeSingle();
    if (error) throw error; return data?.role || null;
  }
  function message(text, bad=false) { $("formMessage").textContent=text; $("formMessage").className=bad?"message error":"message success"; }
  function slug(text) { return text.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"") || "memory"; }
  async function refresh() {
    const { data, error } = await db.from("albums").select("id,title,event_date,story,created_at,album_photos(id,storage_path),album_music(id,storage_path,title)").order("created_at",{ascending:false});
    if (error) { $("adminAlbums").textContent="Could not load albums."; console.error(error); return; }
    albumsCache=data||[]; $("albumCount").textContent=`${albumsCache.length} albums`;
    const list=$("adminAlbums"); list.innerHTML="";
    if (!albumsCache.length) { list.innerHTML='<p class="muted arabic" dir="rtl">لسه مفيش ألبومات. ابدأ بأول ذكرى ❤️</p>'; return; }
    for (const a of albumsCache) {
      const row=document.createElement("div"); row.className="admin-album-row";
      const info=document.createElement("div"); const h=document.createElement("strong"); h.textContent=a.title;
      const p=document.createElement("p"); p.textContent=`${a.event_date||"No date"} · ${(a.album_photos||[]).length} photos · ${(a.album_music||[]).length ? "song added" : "no song"}`;
      info.append(h,p);
      const actions=document.createElement("div"); actions.className="row-actions";
      const edit=document.createElement("button"); edit.className="secondary-btn small-btn"; edit.textContent="Edit"; edit.onclick=()=>editAlbum(a);
      const del=document.createElement("button"); del.className="danger-btn small-btn"; del.textContent="Delete"; del.onclick=()=>deleteAlbum(a);
      actions.append(edit,del); row.append(info,actions); list.append(row);
    }
  }
  function editAlbum(a) {
    $("albumId").value=a.id; $("title").value=a.title; $("eventDate").value=a.event_date||""; $("story").value=a.story||"";
    $("formHeading").textContent="Edit memory album"; $("saveBtn").textContent="Save changes"; $("cancelEdit").classList.remove("hidden");
    const hasSong=!!(a.album_music||[]).length;
    $("selectedSong").textContent=hasSong?`Current song: ${a.album_music[0].title||"Album song"}`:"No song uploaded yet.";
    $("removeSongWrap").classList.toggle("hidden",!hasSong); $("removeSong").checked=false;
    window.scrollTo({top:0,behavior:"smooth"});
  }
  function resetForm() {
    $("albumForm").reset(); $("albumId").value=""; $("selectedSong").textContent=""; $("removeSongWrap").classList.add("hidden"); $("formHeading").textContent="Create a memory album";
    $("saveBtn").textContent="Save album"; $("cancelEdit").classList.add("hidden"); $("selectedFiles").textContent="";
  }
  $("cancelEdit").addEventListener("click",resetForm);
  $("photos").addEventListener("change",()=>{ const n=$("photos").files.length; $("selectedFiles").textContent=n?`${n} photo(s) selected`:""; });
  $("albumSong").addEventListener("change",()=>{ const f=$("albumSong").files[0]; $("selectedSong").textContent=f?`Selected: ${f.name}`:""; });
  async function uploadSong(file, albumId) {
    if (!file) return;
    if (!(file.type === "audio/mpeg" || file.name.toLowerCase().endsWith(".mp3"))) throw new Error("Please choose an MP3 file.");
    const path=`${albumId}/music/${Date.now()}.mp3`;
    const {error:upErr}=await db.storage.from(BUCKET).upload(path,file,{upsert:false,contentType:"audio/mpeg"});
    if (upErr) throw upErr;
    const {data:oldRows,error:oldErr}=await db.from("album_music").select("storage_path").eq("album_id",albumId);
    if (oldErr) { await db.storage.from(BUCKET).remove([path]); throw oldErr; }
    const {error:saveErr}=await db.from("album_music").upsert({album_id:albumId,storage_path:path,title:file.name.replace(/\.mp3$/i,"")},{onConflict:"album_id"});
    if (saveErr) { await db.storage.from(BUCKET).remove([path]); throw saveErr; }
    const oldPaths=(oldRows||[]).map(x=>x.storage_path).filter(x=>x!==path);
    if(oldPaths.length) await db.storage.from(BUCKET).remove(oldPaths);
  }
  async function uploadPhoto(file, albumId, index) {
    const ext=(file.name.split(".").pop()||"jpg").toLowerCase().replace(/[^a-z0-9]/g,"")||"jpg";
    const path=`${albumId}/${Date.now()}-${index}.${ext}`;
    const {error:upErr}=await db.storage.from(BUCKET).upload(path,file,{upsert:false,contentType:file.type||"image/jpeg"});
    if (upErr) throw upErr;
    const {error:dbErr}=await db.from("album_photos").insert({album_id:albumId,storage_path:path,sort_order:index});
    if (dbErr) { await db.storage.from(BUCKET).remove([path]); throw dbErr; }
  }
  $("albumForm").addEventListener("submit",async e=>{
    e.preventDefault(); $("saveBtn").disabled=true; message("Saving your memory…");
    try {
      const id=$("albumId").value;
      const payload={title:$("title").value.trim(),event_date:$("eventDate").value||null,story:$("story").value.trim()||null};
      let albumId=id;
      if (id) {
        const {error}=await db.from("albums").update(payload).eq("id",id); if(error) throw error;
      } else {
        const {data,error}=await db.from("albums").insert(payload).select("id").single(); if(error) throw error; albumId=data.id;
      }
      const files=Array.from($("photos").files);
      for(let i=0;i<files.length;i++) await uploadPhoto(files[i],albumId,i);
      const songFile=$("albumSong").files[0];
      if(songFile) await uploadSong(songFile,albumId);
      else if(id && $("removeSong").checked) {
        const {data:oldSongs,error:readErr}=await db.from("album_music").select("storage_path").eq("album_id",albumId);
        if(readErr) throw readErr;
        const {error:delErr}=await db.from("album_music").delete().eq("album_id",albumId);
        if(delErr) throw delErr;
        const oldPaths=(oldSongs||[]).map(x=>x.storage_path); if(oldPaths.length) await db.storage.from(BUCKET).remove(oldPaths);
      }
      const {data:photoRows}=await db.from("album_photos").select("storage_path,sort_order").eq("album_id",albumId).order("sort_order").limit(1);
      if(photoRows?.[0]) await db.from("albums").update({cover_path:photoRows[0].storage_path}).eq("id",albumId);
      message("Saved! Your memory is now in the collection. ❤️"); resetForm(); await refresh();
    } catch(err) { console.error(err); message(err.message||"Could not save. Check your connection and policies.",true); }
    finally { $("saveBtn").disabled=false; }
  });
  async function deleteAlbum(a) {
    if(!confirm(`Delete "${a.title}" and all its photos? This cannot be undone.`)) return;
    try {
      const paths=[...(a.album_photos||[]).map(p=>p.storage_path),...(a.album_music||[]).map(m=>m.storage_path)];
      if(paths.length) { const {error}=await db.storage.from(BUCKET).remove(paths); if(error) throw error; }
      const {error}=await db.from("albums").delete().eq("id",a.id); if(error) throw error;
      await refresh(); message("Album deleted.");
    } catch(err) { console.error(err); message(err.message||"Could not delete album.",true); }
  }
  $("logoutBtn").addEventListener("click",async()=>{await db.auth.signOut();location.href="index.html";});
  (async()=>{
    const {data}=await db.auth.getSession();
    if(!data.session?.user){location.href="index.html";return;}
    try {
      const role=await roleFor(data.session.user.id);
      if(role!=="admin"){alert("Admin access only.");location.href="index.html";return;}
      await loadEditableContent();
      await refresh();
    } catch(e){console.error(e);alert("Could not verify admin access.");location.href="index.html";}
  })();
})();
