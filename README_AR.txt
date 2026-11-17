A LOVE THAT NEVER ENDS — دليل التشغيل

المحتويات:
- index.html: موقع الذكريات الذي ستشاهده لولو.
- admin.html: لوحة تحكم الأدمن.
- config.js: بيانات الاتصال العامة بمشروع Supabase.
- app.js / admin.js / styles.css: وظائف الموقع والتصميم.

مهم قبل التشغيل:
1) ارفع كل الملفات إلى مستودع GitHub جديد.
2) فعّل GitHub Pages من Settings > Pages > Deploy from a branch > main > / (root).
3) افتح رابط الموقع. سجّل الدخول بإيميل وكلمة سر حساب الأدمن أو حساب لولو اللذين أنشأتهما في Supabase.
4) افتح admin.html بعد تسجيل الدخول بحساب الأدمن لإدارة الألبومات.

إعداد Supabase الذي تم بناؤه على خطواتنا:
- Project URL و Publishable key موجودان في config.js.
- اسم Storage bucket: memory-photos (ويجب أن يظل Private).
- الجداول المطلوبة: user_roles, albums, album_photos.
- أدوار الحسابات: admin لحسابك و viewer لحساب لولو.
- سياسات Storage وRLS التي أنشأناها في خطوات الإعداد.

رفع الصور:
- من admin.html أنشئ ألبومًا، اكتب العنوان والتاريخ والحكاية بالعربي، واختر الصور.
- الصور تُرفع إلى Storage الخاص، ومساراتها تُحفظ في album_photos.
- الموقع ينشئ روابط موقعة مؤقتة لعرض الصور. لا تجعل الباكت Public.

تنبيهات أمنية:
- لا تضع كلمة مرور أي حساب في الملفات.
- لا تضع service_role أو secret key في المتصفح أو GitHub.
- المفتاح الموجود في config.js هو Publishable key، ومصمم للاستخدام في المتصفح مع سياسات RLS صحيحة.
- فعّل تأكيد البريد أو استخدم Auto Confirm أثناء إنشاء الحسابات كما فعلنا.
- رابط GitHub Pages عام؛ الحماية الفعلية للمحتوى تأتي من تسجيل الدخول وRLS وStorage policies، وليس من إخفاء رابط الموقع.
- لا ترفع صورًا خاصة إلى مستودع GitHub. الصور تُخزّن في Supabase Private Storage فقط.

ملاحظة:
الموقع يستخدم مكتبة Supabase JavaScript من CDN وخطوط Google Fonts؛ يحتاج اتصال إنترنت.


إضافة أغنية MP3 لكل ألبوم:
1) افتح Supabase > SQL Editor والصق محتوى الملف SUPABASE_MUSIC_SETUP.sql ثم اضغط Run مرة واحدة.
2) ارفع ملفات الموقع الجديدة إلى GitHub مع استبدال الملفات القديمة.
3) افتح admin.html، عدّل الألبوم أو أنشئ ألبومًا، واختر ملف MP3 في خانة Album song.
4) الأغنية تُرفع إلى نفس Storage bucket الخاص (memory-photos)، وتظهر داخل الألبوم بمشغل صوت.
5) تقدر تستبدل الأغنية باختيار ملف MP3 جديد، أو تشيلها بتفعيل Remove the current song.
ملاحظة: استخدم MP3 فقط، وحافظ على bucket Private وسياسات Storage الحالية.
