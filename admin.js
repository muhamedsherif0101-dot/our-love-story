(() => {
  const db = supabase.createClient(window.SUPABASE_URL, window.SUPABASE_PUBLISHABLE_KEY);
  const $ = id => document.getElementById(id);
  const BUCKET = "memory-photos";
  let albumsCache = [];

  async function roleFor(userId) {
    const { data, error } = await db.from("user_roles").select("role").eq("user_id",userId).maybeSingle();
    if (error) throw error; return data?.role || null;
  }
  function message(text, bad=false) { $("formMessage").textContent=text; $("formMessage").className=bad?"message error":"message success"; }
  function slug(text) { return text.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"") || "memory"; }
  async function refresh() {
    const { data, error } = await db.from("albums").select("id,title,event_date,story,created_at,album_photos(id,storage_path)").order("created_at",{ascending:false});
    if (error) { $("adminAlbums").textContent="Could not load albums."; console.error(error); return; }
    albumsCache=data||[]; $("albumCount").textContent=`${albumsCache.length} albums`;
    const list=$("adminAlbums"); list.innerHTML="";
    if (!albumsCache.length) { list.innerHTML='<p class="muted arabic" dir="rtl">لسه مفيش ألبومات. ابدأ بأول ذكرى ❤️</p>'; return; }
    for (const a of albumsCache) {
      const row=document.createElement("div"); row.className="admin-album-row";
      const info=document.createElement("div"); const h=document.createElement("strong"); h.textContent=a.title;
      const p=document.createElement("p"); p.textContent=`${a.event_date||"No date"} · ${(a.album_photos||[]).length} photos`;
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
    window.scrollTo({top:0,behavior:"smooth"});
  }
  function resetForm() {
    $("albumForm").reset(); $("albumId").value=""; $("formHeading").textContent="Create a memory album";
    $("saveBtn").textContent="Save album"; $("cancelEdit").classList.add("hidden"); $("selectedFiles").textContent="";
  }
  $("cancelEdit").addEventListener("click",resetForm);
  $("photos").addEventListener("change",()=>{ const n=$("photos").files.length; $("selectedFiles").textContent=n?`${n} photo(s) selected`:""; });
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
      const {data:photoRows}=await db.from("album_photos").select("storage_path,sort_order").eq("album_id",albumId).order("sort_order").limit(1);
      if(photoRows?.[0]) await db.from("albums").update({cover_path:photoRows[0].storage_path}).eq("id",albumId);
      message("Saved! Your memory is now in the collection. ❤️"); resetForm(); await refresh();
    } catch(err) { console.error(err); message(err.message||"Could not save. Check your connection and policies.",true); }
    finally { $("saveBtn").disabled=false; }
  });
  async function deleteAlbum(a) {
    if(!confirm(`Delete "${a.title}" and all its photos? This cannot be undone.`)) return;
    try {
      const paths=(a.album_photos||[]).map(p=>p.storage_path);
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
      await refresh();
    } catch(e){console.error(e);alert("Could not verify admin access.");location.href="index.html";}
  })();
})();