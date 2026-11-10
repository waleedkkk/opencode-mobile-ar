# OpenCode Mobile AR 📱

[![Download APK](https://img.shields.io/badge/Download-APK-brightgreen.svg?logo=android)](https://github.com/waleedkkk/opencode-mobile-ar/releases/latest)
[![Build Android APK](https://github.com/waleedkkk/opencode-mobile-ar/actions/workflows/build-apk.yml/badge.svg)](https://github.com/waleedkkk/opencode-mobile-ar/actions/workflows/build-apk.yml)
[![Version](https://img.shields.io/badge/version-1.4.0--ar.1-blue.svg)](package.json)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Android%20%7C%20iOS-orange.svg)](capacitor.config.ts)

[**العربية**](#-النسخة-العربية) | [**English**](#-english-version)

---

## 🇸🇦 النسخة العربية

📥 **[تحميل أحدث نسخة أندرويد مباشرة (Download APK)](https://github.com/waleedkkk/opencode-mobile-ar/releases/latest)**

**OpenCode Mobile AR** هي نسخة مطوّرة وخاصة (Fork) من تطبيق [bmpenuelas/opencode-mobile-client](https://github.com/bmpenuelas/opencode-mobile-client). يهدف هذا المشروع إلى تحويل تجربة الجوال من مجرد غلاف لمتصفح الويب (WebView) إلى تطبيق جوال حقيقي فائق السرعة، يدمج بين **واجهة دردشة أصلية بالكامل (Native Chat)**، ودعم شامل وعميق **للغة العربية والاتجاه من اليمين إلى اليسار (RTL)**، مع التوافق التام مع أحدث إصدارات **OpenCode Server v2.2.5+**.

---

### 🌟 أبرز الفروقات والتحسينات عن النسخة الأصلية:

| الميزة | النسخة الأصلية (Upstream) | نسخة OpenCode Mobile AR |
|---|---|---|
| **واجهة المحادثة الأساسية** | متصفح ويب مدمج (WebView فقط) | **واجهة دردشة أصلية فائقة السرعة (Native Chat UI)** مبنية بـ Vue 3 |
| **دعم OpenCode v2.2.5** | واجهة ويب فقط | **تكامل كامل مع REST API و Server-Sent Events (SSE)** ومغلفات البيانات |
| **اللغة العربية وRTL** | غير مدعومة | **تعريب كامل 100%** مع محاذاة منطقية سليمة وخط عربي مدمج |
| **الخط والطباعة** | خطوط لاتينية فقط | خط **Noto Sans Arabic** مع ضبط تباعد الأسطر لمنع تشوه الحروف |
| **بطاقات الأدوات التفاعلية** | تظهر كما هي داخل المتصفح | **بطاقات أصلية قابلة للطي** لأدوات `bash` و `edit` و `read` |
| **طلبات الأذونات (Permissions)** | داخل الويب فقط | **بطاقات تفاعلية فورية** للموافقة أو الرفض بنقرة واحدة من الجوال |
| **عزل كتل الشيفرات البرمجية** | غير معزولة | **عزل صارم `dir="ltr"`** لمنع تشوه الأقواس والرموز مع زر نسخ فوري |
| **التحكم باتجاه الـ WebView** | اتجاه ثابت | **خيار مستقل لتحديد اتجاه واجهة الويب (`ltr` أو `rtl`)** |
| **بناء APK المؤتمت** | بناء يدوي محلي | **مسار GitHub Actions مؤتمت** لبناء وتحميل حزمة APK مباشرة |
| **إدارة الجلسات** | تعتمد على واجهة الويب | **قائمة سحب جانبية (Drawer)** لسرد الجلسات والتبديل وبدء جلسة جديدة |

---

### 🚀 المزايا الرئيسية:

1. **واجهة دردشة أصلية خفيفة وسريعة**:
   - لا مزيد من الانتظار لتحميل المتصفح؛ استجابة فورية وتدفق لحظي للنصوص والرموز عبر SSE.
   - استهلاك منخفض جداً لطاقة البطارية وبيانات الهاتف مقارنة بالـ WebView.

2. **التكامل مع أدوات ومحرك OpenCode v2.2.5**:
   - متابعة حية لأوامر التيرمينال وتعديلات الملفات عبر بطاقات تفاعلية أنيقة.
   - التبديل السهل بين النماذج والوكلاء (Agents & Models).
   - زر مقاطعة فوري (Interrupt) لإيقاف توليد الوكيل بلمسة واحدة.

3. **التبديل المرن إلى واجهة الويب (WebView)**:
   - بالرغم من أن الدردشة الأصلية هي الافتراضية، يمكنك بنقرة واحدة على أيقونة المتصفح في الترويسة أو القائمة الجانبية فتح واجهة OpenCode Web الكاملة دون انقطاع الاتصال.

4. **تحميل وتثبيت الـ APK مباشرة**:
   - يحتوي المستودع على مسار GitHub Actions مجهز يقوم ببناء ملف `OpenCode-Mobile-AR-1.4.0.apk` تلقائياً مع كل تحديث؛ يمكنك تنزيله من تبويب **Actions** وتثبيته على هاتفك فوراً.

---

### 🛠️ كيفية تشغيل خادم OpenCode للاتصال به:

التطبيق يحتاج إلى خادم OpenCode يعمل على حاسوبك الشخصي أو خادمك الخاص:

```bash
# تشغيل الخادم مع تفعيل المصادقة (موصى به)
export OPENCODE_SERVER_PASSWORD="كلمة-المرور-الخاصة-بك"
opencode serve --hostname 0.0.0.0 --port 4096
```

في التطبيق، أضف عنوان السيرفر (مثلاً: `http://192.168.1.100:4096` أو رابط Tailscale)، مع اسم المستخدم الافتراضي `opencode` وكلمة المرور.

---

<br>

## 🇬🇧 English Version

**OpenCode Mobile AR** is an enhanced, independent fork of [bmpenuelas/opencode-mobile-client](https://github.com/bmpenuelas/opencode-mobile-client). It elevates the mobile experience from a simple WebView wrapper into a fast, battery-efficient mobile application featuring a **Native Chat UI**, comprehensive **Arabic and RTL layout support**, and complete compatibility with **OpenCode Server v2.2.5+**.

---

### 🌟 Key Differences & Enhancements (Why this fork?):

| Feature | Upstream Project | OpenCode Mobile AR Fork |
|---|---|---|
| **Default Experience** | Full-screen WebView only | **Native Vue 3 Chat Engine** with instant response & low memory |
| **OpenCode API v2.2.5** | Relies on web UI | **Native REST & Server-Sent Events (SSE)** client matching v2.2.5 data envelopes |
| **Arabic & RTL Support** | Not supported | **100% Arabic localization & bidirectional RTL layout** |
| **Typography** | Default Latin fonts | **Noto Sans Arabic** font with balanced line-height and letter-spacing |
| **Tool Execution Cards** | Rendered inside web DOM | **Native collapsible tool cards** for `bash`, `edit`, `read`, etc. |
| **Permission Prompts** | Web UI modals | **Native inline action cards** with one-tap Allow / Deny |
| **Code Block Isolation** | Inherits text direction | **Strict `dir="ltr"` isolation** with syntax highlighting & one-tap copy |
| **WebView Direction** | Fixed | **User-configurable WebView layout direction (`ltr` / `rtl`)** |
| **Automated APK Delivery** | Local Android Studio | **GitHub Actions CI workflow** building ready-to-install debug APKs |
| **Session Navigation** | Stock Web UI sidebar | **Native sliding drawer** to switch sessions or create new ones |

---

### 📱 Architecture Highlights:

- **Native Chat by Default, WebView on Demand**: Enjoy the speed of native mobile interactions while keeping full access to the stock OpenCode Web UI via the persistent "WebView" button.
- **Real-Time Streaming**: Live token deltas, tool progress, and agent state updates streamed via SSE (`GET /api/event`) with automatic reconnect and message reconciliation.
- **Design Consistency**: Built with Vue 3, Pinia, Tailwind CSS 4, Lucide icons, and Capacitor 8.
- **RTL & LTR Islands**: Right-aligned Arabic messaging bubbles while keeping code blocks, terminal outputs, URLs, and server endpoints left-aligned (`dir="ltr"`).

---

### 📦 Download Prebuilt APK:

You can download the latest ready-to-install Android APK directly from the [GitHub Releases page](https://github.com/waleedkkk/opencode-mobile-ar/releases/latest):
👉 **[Download OpenCode-Mobile-AR-1.4.0.apk](https://github.com/waleedkkk/opencode-mobile-ar/releases/download/v1.4.0-ar.1/OpenCode-Mobile-AR-1.4.0.apk)**

Or from the Artifacts section in the [Actions tab](https://github.com/waleedkkk/opencode-mobile-ar/actions).

---

### 💻 Development & Building from Source:

```bash
# Clone the repository
git clone https://github.com/waleedkkk/opencode-mobile-ar.git
cd opencode-mobile-ar

# Install dependencies
npm ci

# Run development server
npm run dev

# Run full test suite (135+ tests)
npm test

# Type-check TypeScript
npm run lint

# Build web assets and sync native Capacitor Android project
npm run cap:sync:android
```

---

### 📄 License & Attribution:

- Licensed under the **MIT License** — see [LICENSE](LICENSE).
- Forked from [bmpenuelas/opencode-mobile-client](https://github.com/bmpenuelas/opencode-mobile-client) by Borja Penuelas. Original copyright and credits are fully preserved.
- See [docs/fork.md](docs/fork.md) for detailed notes on upstream synchronization and fork identity.
