# OpenCode Mobile AR — مواصفة المرحلة 2 (واجهة الدردشة الأصلية Native Chat UI)

- **التاريخ:** 2026-11-09
- **الحالة:** مسودة معتمدة مبدئياً للمراجعة
- **النطاق:** المرحلة 2 (واجهة دردشة أصلية على الجوال تدعم OpenCode API v2 بالكامل، مع دفق الأحداث والبطاقات التفاعلية وإدارة الجلسات ودعم العربية/RTL)
- **المستودع:** `https://github.com/waleedkkk/opencode-mobile-ar`
- **الإصدار المستهدف:** `1.3.0-ar.1`

---

## 1. السياق والأهداف

في المرحلة 0+1، تم تعريب غلاف تطبيق OpenCode Mobile وتوفير دعم كامل للغة العربية وتخطيط اليمين-إلى-اليسار (RTL) مع إمكانية ضبط اتجاه واجهة WebView. ومع ذلك، لا يزال التطبيق يعتمد كلياً على تضمين واجهة الويب داخل متصفح WebView، مما يجعل تجربة الجوال ثقيلة، ويفتقر إلى تجربة دردشة أصلية سريعة وخفيفة تستهلك موارد وبيانات أقل.

الهدف من هذه المرحلة هو تزويد **OpenCode Mobile AR** بمحرك دردشة أصلي فائق السرعة مبني مباشرة على نقاط نهاية OpenCode REST و Server-Sent Events (SSE) الإصدار 2، ليكون هو الواجهة الافتراضية للجلسات مع الاحتفاظ بإمكانية الانتقال السلس إلى WebView الكاملة بنقرة واحدة.

---

## 2. القرارات المعمارية الرئيسية

1. **الواجهة الافتراضية**: عند فتح خادم OpenCode متصل، يدخل التطبيق مباشرة إلى واجهة الدردشة الأصلية (`ChatView.vue`) لآخر جلسة نشطة، مع زر سريع في الترويسة لفتح واجهة WebView الكاملة لنفس السيرفر عند الرغبة.
2. **بروتوكول التواصل**:
   - استخدام نقاط نهاية REST للعمليات العرضية (استرجاع الجلسات، التبديل، إرسال الأوامر، الرد على الأذونات).
   - استخدام Server-Sent Events (`GET /api/event`) لتلقي الأحداث المباشرة (تدفق النصوص، استدعاء الأدوات، طلبات الإذن، وتغير الحالة).
3. **التوثيق**: استخدام آلية Basic Auth الحالية المعتمدة على اسم المستخدم وكلمة المرور المحفوظين لكل خادم في التخزين الآمن.
4. **تعدد الجلسات**: قائمة جانبية منزلقة (Drawer) تفتح بسلاسة من اليمين في العربية لاستعراض الجلسات السابقة، وبدء جلسة جديدة، أو التحويل إلى WebView.
5. **معالجة النصوص البرمجية**: عزل LTR كامل لكل الكتل البرمجية ومخرجات الأدوات وأوامر التيرمينال، مع دعم تلوين الشفرة (Syntax Highlighting) وزر نسخ سريع بنقرة واحدة.
6. **البطاقات التفاعلية**: تمثيل استدعاءات أدوات OpenCode (مثل bash و edit و read) كبطاقات تفاعلية قابلة للطي والفتح، مع بطاقات مستقلة واضحة لطلبات الإذن (Permissions) تتيح الموافقة أو الرفض الفوري.

---

## 3. خارج النطاق (المراحل القادمة)

- الإشعارات في الخلفية عند إغلاق التطبيق نهائياً عبر خدمات الدفع السحابية (مجدولة في المرحلة 3).
- محرر ملفات شجري كامل أصلي (File tree editor) — يظل متاحاً عبر فتح الـ WebView.
- عارض التيرمينال التفاعلي PTY المباشر — يظل متاحاً عبر الـ WebView.

---

## 4. نموذج البيانات ومخزن الحالة (`chatStore.ts`)

### 4.1 الواجهات الأساسية (Types):

```ts
export type MessageRole = 'user' | 'assistant' | 'system'

export interface ToolCall {
  id: string
  name: string
  arguments: Record<string, unknown>
  status: 'running' | 'completed' | 'failed'
  result?: string
  error?: string
}

export interface PermissionRequest {
  id: string
  toolName: string
  description: string
  arguments: Record<string, unknown>
  state: 'pending' | 'approved' | 'rejected'
}

export interface ChatMessage {
  id: string
  role: MessageRole
  content: string
  createdAt: string
  streaming?: boolean
  toolCalls?: ToolCall[]
  pendingPermission?: PermissionRequest
}

export interface SessionInfo {
  id: string
  title: string
  createdAt: string
  updatedAt: string
}
```

### 4.2 حالة مخزن Pinia:

- `currentSessionId: ref<string | null>`
- `sessions: ref<SessionInfo[]>`
- `messages: ref<ChatMessage[]>`
- `streamingStatus: ref<'idle' | 'thinking' | 'streaming' | 'tool_running'>`
- `activeAgent: ref<string>`
- `activeModel: ref<string>`
- `availableModels: ref<string[]>`
- `availableAgents: ref<string[]>`

---

## 5. نقاط نهاية OpenCode v2 وتدفق الأحداث

### 5.1 العمليات المباشرة:
- `GET /api/session`: جلب جميع جلسات الخادم الحالية.
- `POST /api/session`: إنشاء جلسة جديدة.
- `GET /api/session/{id}/message`: استرجاع السجل الكامل لرسائل الجلسة.
- `POST /api/session/{id}/prompt`: إرسال رسالة المستخدم وبدء معالجة الوكيل.
- `POST /api/session/{id}/interrupt`: إرسال إشارة إلغاء/مقاطعة للوكيل فوراً.
- `POST /api/session/{id}/permission/{requestId}/reply`: الرد بالموافقة أو الرفض على طلب إذن الأداة.
- `GET /api/agent` & `GET /api/config`: جلب الوكلاء والنماذج المتاحة.

### 5.2 مجزئ دفق الأحداث (`SSE Event Parser`):
يستمع التطبيق إلى `GET /api/event` ويقوم بمعالجة الأحداث التالية:
- `session.message.delta`: إضافة النص المتدفق للرسالة النشطة فوراً.
- `session.tool.start`: إنشاء بطاقة أداة جديدة وتحديث حالتها إلى `running`.
- `session.tool.finish`: تحديث مخرجات الأداة وحالتها إلى `completed` أو `failed`.
- `session.permission.request`: إدراج بطاقة طلب إذن تفاعلية في مسار المحادثة.
- `session.status`: تحديث حالة التفكير والعمل العامة للوكيل.

---

## 6. تصميم الشاشات وتجربة الجوال

### 6.1 ترويسة الجلسة (`ChatHeader.vue`):
- زر القائمة الجانبية (يمين في العربية) لعرض الجلسات.
- عنوان الجلسة مع مؤشر الحالة (`StatusDot`).
- شارة النموذج الحالي (Dropdown) لاختيار النموذج المفضل.
- زر «فتح WebView» السريع (أيقونة متصفح) للانتقال لواجهة OpenCode Web عند الحاجة دون قطع الاتصال.

### 6.2 مسار الرسائل (`ChatMessageList.vue`):
- فقاعة المستخدم: لون مميز ومحاذاة يمنية في RTL.
- فقاعة المساعد: عرض Markdown غني، مع دعم تلوين الشفرات البرمجية وعزلها LTR بزر نسخ سريع.
- بطاقات الأدوات (`ChatToolCallCard.vue`): مظهر بطاقة مدمجة قابلة للنقر للطي والفتح، مع شارة نجاح خضراء أو فشل حمراء أو مؤشر حركة أزرق أثناء التشغيل.
- بطاقة الإذن (`ChatPermissionCard.vue`): تظهر بحدود واضحة مع زرين: «رفض ✕» و «سماح ✓».

### 6.3 صندوق الإدخال (`ChatComposer.vue`):
- حقل إدخال نصوص متعدد الأسطر مع خاصية التمدد الذكي حتى 5 أسطر.
- زر مرفقات `📎` لإضافة صور أو ملفات.
- زر إرسال يتحول إلى زر مقاطعة `■` أحمر أثناء عمل الوكيل.

### 6.4 قائمة الجلسات (`ChatSessionsDrawer.vue`):
- قائمة سحب جانبية (Sheet) تفتح من اليمين في العربية.
- تسرد الجلسات مرتبة من الأحدث، مع إمكانية حذف الجلسة أو إعادة تسميتها.
- زر علوي مميز: «+ جلسة جديدة».
- خيار سفلي: «التبديل إلى واجهة الويب الكاملة (WebView)».

---

## 7. معايير القبول (Acceptance Criteria)

1. فتح أي خادم متصل يدخل تلقائياً إلى واجهة الدردشة الأصلية لآخر جلسة معروضة.
2. تدفق نصوص المساعد لحظياً عبر SSE دون وميض أو تجميد لواجهة الجوال.
3. التلوين البرمجي السليم وعزل LTR لجميع كتل الأكواد مع زر نسخ يعمل بدقة.
4. ظهور بطاقات الأدوات لحركات `bash` و `edit` و `read` مع إمكانية طيها وفتحها بنجاح.
5. استجابة بطاقات الأذونات بنقرة واحدة لإكمال مسار عمل الوكيل دون انقطاع.
6. زر المقاطعة يُوقف التوليد وتشغيل الأدوات الجارية فور الضغط عليه.
7. القائمة الجانبية تعرض الجلسات بدقة وتتيح التبديل بينها وإنشاء جلسة جديدة.
8. زر التبديل إلى WebView يفتح متصفح InAppBrowser الكامل بسلاسة لنفس الخادم.
9. دعم كامل للغتين العربية والإنجليزية وتخطيط RTL السليم في جميع عناصر الدردشة.
10. اجتياز جميع الاختبارات الآلية وفحص TypeScript وبناء الإنتاج بنجاح 100%.

---

## 8. خطة الاختبارات

- `src/tests/chatClient.test.ts`: اختبار صحة طلبات REST والتنصت على أحداث SSE ومجزئ البيانات.
- `src/tests/chatStore.test.ts`: اختبار إدارة الجلسات وتدفق الرسائل والرد على الأذونات وحالات المقاطعة.
- `src/tests/chatComponents.test.ts`: اختبار عزل الأكواد برمجياً وزر النسخ وبطاقات الأدوات وتمدد صندوق الإدخال.

---

## 9. خريطة الملفات

**ملفات جديدة:**
- `docs/superpowers/specs/2026-11-09-opencode-mobile-ar-native-chat.md`
- `src/types/chat.ts`
- `src/services/opencode/chatClient.ts`
- `src/stores/chatStore.ts`
- `src/components/chat/ChatView.vue`
- `src/components/chat/ChatHeader.vue`
- `src/components/chat/ChatMessageList.vue`
- `src/components/chat/ChatMessageItem.vue`
- `src/components/chat/ChatMarkdown.vue`
- `src/components/chat/ChatToolCallCard.vue`
- `src/components/chat/ChatPermissionCard.vue`
- `src/components/chat/ChatComposer.vue`
- `src/components/chat/ChatSessionsDrawer.vue`
- `src/tests/chatClient.test.ts`
- `src/tests/chatStore.test.ts`
- `src/tests/chatComponents.test.ts`

**ملفات معدّلة:**
- `src/components/ConnectionShell.vue` (التوجيه لواجهة الدردشة الأصلية كواجهة افتراضية مع خيار فتح WebView)
- `src/i18n/index.ts` (إضافة مفاتيح واجهة الدردشة الجديدة بالعربية والإنجليزية)
- `package.json` (إضافة مكتبة خفيفة للـ markdown / syntax-highlighting مثل `markdown-it` و `highlight.js`)
