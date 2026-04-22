# ShoeStore — Proje İnceleme Raporu

**Tarih:** 21 Nisan 2026
**Kapsam:** Backend (Spring Boot), admin-web, staff-pwa, storefront-web, reverse-proxy, docker-compose, ortam dosyaları
**Amaç:** Bachelor's (lisans) bitirme projesi seviyesinde kapsamlı kod incelemesi — güvenlik, hata, kod kalitesi, mimari ve bitirme projesi eksiklikleri
**Notlar:**
- Güvenlik bulgularının büyük kısmı mevcut `SECURITY_AUDIT.md` dosyasında zaten kapsanmış. Bu rapor onu tamamlar; tekrar etmez.
- Hiçbir kod değişikliği yapılmadı, yalnızca rapor.

---

## 1. Yönetici Özeti — Tek Cümleyle

Proje, lisans bitirme seviyesinin **iddialı ve büyük ölçekli** bir çalışması (3 frontend + Spring Boot backend + Stripe + PWA + Docker). Fonksiyonel olarak çalışıyor ve mimari seçimler mantıklı; ancak **çalışma düzgün akademik tezin gerektirdiği bazı standartları (test, dökümantasyon, CI/CD, gözlemlenebilirlik) karşılamıyor** ve **birkaç kritik runtime hatası** var (lazy-loading istisnası, 3DS fallback eksikliği, empty BOOTSTRAP_ADMIN_PASSWORD riski). Jüri önünde savunmadan önce giderilmesi gereken 6-8 iş var; bunların dışındakiler "gelecek çalışma" olarak sunulabilir.

**Tahmini not aralığı (mevcut haliyle):**
- Teknik içerik: 75–80 (iyi, ama testler ve dökümantasyon olmadan 85+ zor)
- Demo çalışır/çalışmaz riski: Orta (bootstrap parolası & PWA iOS davranışı demo anında sorun çıkarabilir)

---

## 2. Nelerin İyi Yapıldığı (Kabul Görmeli)

Jüriye sunulurken "bunları doğru yaptık" diye **çerçeveleneceklerin** listesi — projenin güçlü yönleri:

- **Mimari ayrım net**: 3 frontend tek backend üzerinden `/api/*` konuşuyor. Roller ve erişim yolları (ADMIN/STAFF/public) mantıklı.
- **Stock yarışı PESSIMISTIC_WRITE kilit ile çözülmüş** — oversell'e karşı standart, akademik olarak savunulabilir bir yaklaşım.
- **Stripe PaymentIntent akışı** (create → confirm + webhook idempotency) doğru kurgulanmış.
- **Flyway migrations** düzenli (V1…V20 ile versiyonlanmış).
- **Docker multi-stage build**, non-root `USER`, `npm ci` (staff-pwa), `expose` vs `ports` ayrımı, named volume — hepsi doğru.
- **Reverse-proxy**: login ve checkout için `limit_req`, güvenlik header'ları, webhook için `proxy_request_buffering off` mevcut.
- **`.env` git'te yok, `.dockerignore`'da** — önceki auditin C-3 bulgusu kapatılmış.
- **Postgres yalnızca 127.0.0.1'e bind** — H-2 kapatılmış.

Bunları raporda "çalışmanın güçlü yönleri" olarak ayrı bir bölümde öne çıkarmakta fayda var.

---

## 3. Çalışma Zamanı Hataları (Runtime Bugs)

### 3.1 [KRİTİK] Lazy-loading hatası — sipariş restorasyon/email akışı çöker

**Dosyalar:**
- `backend/.../service/OrderService.java:241–257` (`restoreStock`)
- `backend/.../service/OrderEmailService.java:124–143` (`sendOrderConfirmation`)

`OrderItem.product` alanı `FetchType.LAZY`. `@Transactional` bloğu bittikten sonra `order.getItems()` üzerinden `item.getProduct().getId()` çağrısı **`LazyInitializationException`** fırlatır. Ödeme başarısız olduğunda (`markPaymentFailed`) ya da e-posta gönderilirken tetiklenir.

**Etki:** İptal edilen siparişlerde ilk OrderItem stoka geri dönüyor, diğerleri sessizce veya patlayarak düşüyor → stok tutarsızlığı. Sipariş onay e-postası hiç gitmiyor olabilir.

**Düzeltme önerisi:** `OrderRepository`'de `JOIN FETCH` ile yüklenen özel bir metod:
```java
@Query("SELECT o FROM CustomerOrder o JOIN FETCH o.items i JOIN FETCH i.product WHERE o.id = :id")
Optional<CustomerOrder> findByIdWithItemsAndProducts(@Param("id") Long id);
```
ve tüm stok-geri-yükleme / e-posta akışlarında bunu kullanmak.

---

### 3.2 [YÜKSEK] `BOOTSTRAP_ADMIN_PASSWORD` boş kalabiliyor — demo'da login çökmesi riski

**Dosya:** `docker-compose.yml:42`
```yaml
BOOTSTRAP_ADMIN_PASSWORD: ${BOOTSTRAP_ADMIN_PASSWORD:-}
```

`:-` default'u boş string. `BOOTSTRAP_USERS_ENABLED=true` iken parola boş olursa admin kullanıcı ya parolasız yaratılır ya hata verir. Jüri demosunda login fail olabilir.

**Düzeltme önerisi:** `:?BOOTSTRAP_ADMIN_PASSWORD required`. Fail-fast olsun.

---

### 3.3 [YÜKSEK] N+1 Sorgusu — storefront ürün listesi

**Dosya:** `backend/.../service/StorefrontService.java:22–26`

`findPublishedForStorefront()` + her ürün için `pricingService.getEffectivePrice(product)` → her çağrı `productDiscountRepository.findByProductId(...)` yapıyor. 500 ürün için 501 SQL sorgusu.

**Etki:** Storefront ana sayfası ~2-3 sn açılır; lisans tezinde "performans ölçümü" yapıldığında dikkat çeker.

**Düzeltme önerisi:** `findDiscountsByProductIds(List<Long>)` ile tek seferde indirimleri çekmek ve map halinde geçmek.

---

### 3.4 [YÜKSEK] Stripe 3DS / `requires_action` yolu ele alınmamış

**Dosya:** `storefront-web/src/pages/CheckoutPage.jsx:205–216` ve `OrderConfirmationPage.jsx:31–41`

`confirmPayment()` çağrısından sonra `paymentIntent.status` kontrol edilmeden sepet temizlenip navigasyon yapılıyor. Stripe `requires_action` döndürürse (3DS, Apple Pay, bankadan ek onay), sipariş sonsuza kadar `PENDING` kalıyor.

**Etki:** Gerçek Türk kart sağlayıcılarının büyük kısmı 3DS kullanıyor — Türkiye'deki demo senaryolarında bu yol **ana yol**. Şu haliyle çoğu Türk kartıyla ödeme tamamlanmayacak gibi görünüyor.

**Düzeltme önerisi:**
1. `confirmPayment` sonucunu `switch(paymentIntent.status)` ile işle: `requires_action`, `processing`, `succeeded`.
2. `OrderConfirmationPage` PI status'ü backend'den polle (zaten var ama 5×1.5s = 7.5s — 3DS için kısa olabilir).

---

### 3.5 [ORTA] StockMovement "system user" yoksa checkout patlıyor

**Dosya:** `backend/.../service/StockMovementService.java:90–92`

`resolveSystemUser()` ADMIN bulamazsa `ResourceNotFoundException` fırlatıyor. V5 seed migration devre dışı bırakıldığı için (SECURITY_AUDIT.md C-2 sonrası), Flyway bitip `BOOTSTRAP_USERS_ENABLED=false` ile açılmış ortamda online checkout tamamen kırık olur.

**Düzeltme önerisi:** İlk kullanım anında lazy create eden bir `SYSTEM` kullanıcı (disabled=true, login yapamaz) veya Flyway'de ayrı bir "bootstrap-system-user" migration.

---

### 3.6 [ORTA] `updateStatus` ters geçişlerde stok yeniden düşmüyor

**Dosya:** `backend/.../service/OrderService.java` (H-7 mevcut audit'te)

Audit'te belirtilmiş ama bir kez daha vurgulamak gerekiyor: CANCELLED → PAID geçişi stoku tekrar rezerve etmiyor → envanter fazla sayılıyor. **State machine** (Spring StateMachine veya elle enum + allowed transitions map) eklemek gerekli.

---

### 3.7 [ORTA] Discount `endAt` mikro-saniye yarış koşulu

**Dosya:** `backend/.../service/PricingService.java:50`

`isAfter(now)` nano-saniye hassasiyetinde karşılaştırıyor. "Saat 17:00'ye kadar" gibi kullanıcı dostu tarihlerde iki sipariş 1ms arayla farklı fiyat görebilir.

**Düzeltme önerisi:** İki tarafı da `withNano(0)` ile saniyeye yuvarlamak.

---

### 3.8 [ORTA] Cross-tab cart synchronization yok

**Dosya:** `storefront-web/src/contexts/CartContext.jsx:74–81`

`localStorage`'a yazıyor ama `window.addEventListener('storage', ...)` yok. Kullanıcı iki tab açıp birinde sepete ekleme yaparsa diğer tab'da görünmüyor.

**Düzeltme önerisi:** Storage event listener ekle, state'i hidrate et.

---

### 3.9 [ORTA] useEffect race condition — admin dashboard

**Dosya:** `admin-web/src/AdminApp.jsx:586–588` (StaffSalesPage)

Date range hızlı değiştirildiğinde yarışan request'ler sıra dışı dönerek eski veriyi son olarak gösterebiliyor. `let cancelled = false;` pattern'i gerekli.

---

### 3.10 [ORTA] Yarışan form submit — "Ödemeye geç" butonu

**Dosya:** `storefront-web/.../CheckoutPage.jsx:51–74`

Buton yavaş ağda `creatingIntent` true olana kadar aktif kalıyor → çift Stripe PI oluşturma riski.

**Düzeltme önerisi:** `disabled={creatingIntent}` zorunlu.

---

### 3.11 [DÜŞÜK] Stripe minor-unit dönüşümü `longValueExact()` atar

**Dosya:** `backend/.../service/StripeService.java:56–58`

Pricing rounding hataları `ArithmeticException` fırlatırsa checkout tamamen çöker. `longValue()` (sessizce truncate) + explicit guard daha güvenli.

---

### 3.12 [DÜŞÜK] PWA service worker update prompt yok

**Dosya:** `staff-pwa/src/main.jsx:18–29`

`registerType: 'autoUpdate'` iyi ama kullanıcıya yeni versiyon geldiğinde haber yok. Vardiyada tüm gün açık kalan PWA'da eski kod çalışır.

---

## 4. Kod Kalitesi & Mimari Sorunlar

### 4.1 [YÜKSEK] `AdminApp.jsx` 706 satır — monolitik

**Dosya:** `admin-web/src/AdminApp.jsx`

5 ayrı sayfa (Dashboard, Orders, Discounts, StaffSales, LoginPage) + yardımcı utility'ler tek dosyada. Single-responsibility ihlali, test yazılamaz, yeniden kullanılamaz.

**Düzeltme önerisi:** Her sayfayı `src/pages/` altına ayrı dosya olarak çıkart. `formatCurrency`, chart renkleri, `ChartTooltip` gibi paylaşılanları `src/utils/` ve `src/components/` altına.

---

### 4.2 [YÜKSEK] `ProductService.java` — God Service (230+ satır, karışık bağlamlar)

**Dosya:** `backend/.../service/ProductService.java`

Tek sınıf içinde:
- Ürün CRUD
- Stok artır/azalt
- QR kod ile satış
- Scan history

Her biri ayrı bağlam — `ProductStockService` ve `ProductScanService` olarak bölünmeli.

---

### 4.3 [ORTA] Tekrarlanan `formatPrice()` fonksiyonu 5 yerde

**Storefront:**
- `CartPage.jsx:6-11` (grouping'li)
- `CheckoutPage.jsx:11` (sade)
- `ProductDetailPage.jsx:8-12`
- `OrderConfirmationPage.jsx:5`
- `TrackOrderPage.jsx:5`

Her biri farklı: cart ₺1.234,56 → checkout ₺1234.56. Tutarsız. `src/utils/formatPrice.js`'e tek merkez olarak çıkarılmalı.

---

### 4.4 [ORTA] `ProductMapper.toDTO()` `totalStock`/`lowStock` her çağrıda hesaplıyor

**Dosya:** `backend/.../mapper/ProductMapper.java:15–16`

100.000 ürünlük liste için 100.000 çift toplama. `@Formula` ile SQL tarafında ön-hesap, ya da entity'de önbellek mantıklı.

---

### 4.5 [ORTA] Magic numbers her yerde

- `DASHBOARD_DAYS_WINDOW = 30` (AdminApp.jsx:21)
- `MAX_RECENT_MOVEMENTS = 10` (AdminApp.jsx:23)
- Image compression `0.78`, `0.82` (ProductsPage.jsx)
- Chart font size `10`, `11`
- `FREE_SHIPPING_THRESHOLD = 500`, `FLAT_SHIPPING = 49` (CartPage.jsx:14-15) — bunlar **backend'den gelmeli**, frontend'de hardcode edilmemeli. Yönetici UI'dan değiştirilemediği için aşağıdaki M-9'a da işaret ediyor.

---

### 4.6 [ORTA] `CreateStaffRequest` minimum parola uzunluğu 4

Mevcut audit M-7'de kısmen bahsedilmiş ama 2026'da 4 karakter parola **akademik olarak** savunulamaz. En az 12 + karmaşıklık kuralı.

---

### 4.7 [ORTA] Error boundary yok (3 frontend'de de)

Herhangi bir sayfa bileşeni render sırasında hata fırlatırsa tüm app beyaz ekran olur. Her frontend'de `ErrorBoundary` ve `<Route>` sarmalaması olmalı.

---

### 4.8 [DÜŞÜK] Console.error & native alert() production kodunda

- `admin-web/src/AdminApp.jsx:328, 342`
- `admin-web/src/pages/ProductsPage.jsx:216, 221, 237`

`console.error` uzun vadede log yığını yaratıyor, `alert()` UX ihlali. Toast bileşeni zaten var — kullanılmalı.

---

### 4.9 [DÜŞÜK] `RestTemplate` timeout'suz (Gemini çağrıları)

`ProductImageGenerationService` — audit L-1'de belirtildi ama tekrar vurgu: Gemini 60 sn yanıt vermezse Tomcat thread'leri tıkanır. `HttpComponentsClientHttpRequestFactory` ile explicit timeout.

---

### 4.10 [DÜŞÜK] Prop drilling — admin sayfalar arası paylaşılan state yok

`ProductCard`'a her sayfadan `showActions`, `onShowQr`, `onSell` vs. prop'lar geçiyor. Context veya hook (`useProducts`) ile merkezi cache + mutation daha iyi olur.

---

## 5. Erişilebilirlik (A11y) Eksikleri

Bu bölüm tezin "User Interface Design" bölümünde jüriden muhakkak soru gelir.

### 5.1 `<label>` ↔ `<input>` bağlantısı yok

Tüm frontend'lerde tipik pattern:
```jsx
<label className="label">Username</label>
<input className="input" ... />
```
Ekran okuyucular label'ı input'a bağlayamıyor, label tıklama odaklamıyor. `id` + `htmlFor` zorunlu.

### 5.2 `<img alt="">` boş veya anlamsız

`admin-web/src/pages/ProductsPage.jsx:262-263`:
```jsx
<img src={...} alt="" />
```
Ürün thumbnail'ı dekoratif değil, semantik. `alt={`${p.modelName} (${p.color})`}` olmalı.

### 5.3 Modal'larda ARIA yok

`role="dialog"`, `aria-modal="true"`, `aria-labelledby`, focus trap, Escape tuşu hiçbir frontend'de yok.

### 5.4 Klavye navigasyonu test edilmemiş

Tab sırası, focus ring'leri yok. Storefront size picker, category filter chip'leri sadece click'e tepki veriyor.

### 5.5 Storefront renk kontrastı

`storefront-web` deri swatch'lerinde `rgba(255,255,255,0.28)` beyaz text — **WCAG AA 4.5:1 kontrast testi geçmez**.

**Düzeltme önerisi:** Lighthouse Accessibility puanı ≥ 90 hedefle ve tezin ekine Lighthouse ekran görüntüsünü ekle. Jürinin çok sevdiği somut bir ölçüm.

---

## 6. Test & Dökümantasyon Eksikleri (Bitirme Projesi Kritik)

### 6.1 [KRİTİK] 3 frontend'de **sıfır** test

- `admin-web/` — test dosyası yok
- `staff-pwa/` — test dosyası yok
- `storefront-web/` — test dosyası yok

Bir lisans bitirme projesinde bu **savunulamaz**. Vitest + React Testing Library (RTL) ile en azından:
- Kritik user flow testi (login, sepete ekle, checkout)
- Cart reducer unit test
- Service fonksiyonları (API mocking ile)

### 6.2 [KRİTİK] Backend'de yalnızca 6 servis-seviyesi unit test, **integration test yok**

`src/test/java/com/shoestore/service/` altında ~657 satır var. Ama `@SpringBootTest` veya `@DataJpaTest` yok. Yukarıdaki lazy-loading bugu (§3.1) unit testten kaçıyor çünkü mock'lar gerçek transaction behavior'u yakalamıyor.

**Öneri:** En az 10 integration test — happy path (order lifecycle), stok tükenmesi, discount uygulanması, Stripe webhook idempotency.

### 6.3 [KRİTİK] OpenAPI/Swagger yok

`springdoc-openapi-starter-webmvc-ui` tek satır dependency + `@Operation` annotation'ları ile tüm API `/swagger-ui.html` altında otomatik dokümante olur. Jüri önünde açıp gezmek bile **demo değeri yüksek**.

### 6.4 [KRİTİK] CI/CD pipeline yok

`.github/workflows/` yok. Her push'ta:
- `mvn test`
- 3 frontend `npm ci && npm run build`
- Docker build

otomatik çalışmalı. Aksi halde demo öncesi main branch'e alınan bir commit sessizce bozarsa felaket.

### 6.5 [YÜKSEK] Backend'de Javadoc yok

`PricingService.getEffectivePrice()` gibi önemli metodlarda tek bir doc comment yok. Tez okuyucusu ve ileriki geliştiriciler "effective ne?", "null döner mi?", "rounding modu nedir?" sorularına kod okumadan yanıt bulamıyor.

### 6.6 [YÜKSEK] Observability sıfır

- Spring Boot Actuator yok
- Micrometer/Prometheus yok
- Structured logging (JSON) yok
- Correlation ID yok

Lisans tezinde "Production-ready" başlığı bölümü varsa bu **mutlaka** eklenmeli. 1 pom.xml dependency + `management.endpoints.web.exposure.include=health,metrics,prometheus` + Logback JSON encoder = savunmada 10 dakika anlatılabilecek içerik.

### 6.7 [YÜKSEK] Mimari karar kayıtları (ADR) yok

Tezde "Neden pessimistic lock? Neden JWT cookie?" soruları sorulacak. `docs/adr/` altında 3-5 kısa markdown (her biri 1 sayfa) bu soruları yazılı yanıtlar.

Örnek başlıklar:
- ADR-0001: Stok çakışması için pessimistic locking
- ADR-0002: JWT'nin HttpOnly cookie ile taşınması
- ADR-0003: Flyway migration yönetimi
- ADR-0004: 3 SPA tek origin stratejisi

### 6.8 [YÜKSEK] Deployment dökümantasyonu yok

"Production'a nasıl çıkarsınız?" sorusunun yanıtı README'de yok. `docs/DEPLOYMENT.md` içeriği:
- TLS terminasyon (Caddy/Traefik/ALB)
- Secret management (Vault/AWS SM)
- Backup stratejisi (pg_dump → S3)
- Monitoring (Prometheus + Grafana)
- Kubernetes/ECS örneği

### 6.9 [ORTA] İki frontend'de TypeScript yok

Backend Java zaten typed. 3 frontend JS. TypeScript'e geçmek bitirme projesi için "future work" olabilir ama cart math'indeki `Number(item.unitPrice) || 0` gibi sessiz hatalar TS ile yakalanırdı.

### 6.10 [ORTA] Lighthouse PWA puanı ölçülmemiş

`staff-pwa`'nın PWA olma iddiası varsa Lighthouse skoru (Installability ≥ 90, Performance ≥ 80) tez ekine eklenmeli. Not: iOS Safari tam PWA desteği yok — bu tez içinde **açıkça belirtilmeli**, aksi takdirde jüri bunu eksik olarak algılayabilir.

### 6.11 [ORTA] `.env.example`'da AI_IMAGE_API_KEY anlatılmamış

Projeyi klonlayan başka biri Gemini API key'i nasıl alacağını bilmiyor. README'ye "Gemini API setup" bölümü + Google Cloud Console yönergeleri.

---

## 7. Güvenlik — Audit'e Ek Notlar

`SECURITY_AUDIT.md` kapsamlı ve doğru. Tezde onu referans olarak koyup şu ekleri yapmak iyi olur:

### 7.1 SMTP kimlikleri `.env` dosyasında açık

Demo makinesi kaybolursa / image alınırsa Brevo hesabı gidebilir. Savunma sonrası rotasyon gerekli.

### 7.2 `ORDER_TOKEN_SECRET` boşsa JWT_SECRET kullanılıyor

Aynı anahtarın iki ayrı amaçla kullanılması kriptografik olarak hoş değil. Açıkça ayrı anahtar zorlanmalı.

### 7.3 Production profile yok

Tek `application.yml` hem dev hem prod için. `application-prod.yml` içinde:
- `BCryptPasswordEncoder(12)` (M-8)
- `error.include-stacktrace: never`
- Actuator endpoints daraltılmış
- DEBUG log seviyeleri INFO'ya çekilmiş

### 7.4 Container resource limit yok

`resources.limits` yok. OOM-killer demo sırasında tüm stack'i kapatabilir. `memory: 512M`, `cpus: 1.0` gibi mütevazı limitler ekle.

### 7.5 Dockerfile tag pin'li değil

`postgres:15-alpine`, `eclipse-temurin:17-jre`, `node:20-alpine` — hepsi minor versiyon drift'e açık. Jüri demosu sırasında yeni patch gelirse davranış değişebilir. `postgres:15.6-alpine` gibi exact pin.

### 7.6 HEALTHCHECK yok

`backend/Dockerfile`, 3 frontend Dockerfile'ı — hiçbirinde HEALTHCHECK yok. docker-compose `depends_on` yalnızca startup'ı bekliyor, runtime crash'i yakalamıyor.

---

## 8. Öncelikli Aksiyon Listesi — Jüri Öncesi

Demo ve savunma tarihine göre sıralı yapılacaklar:

### Demodan 2 hafta önce (**olmazsa olmaz** — yüksek risk):

1. **`restoreStock` + e-posta lazy-load hatasını düzelt** (§3.1). Integration test yaz.
2. **`BOOTSTRAP_ADMIN_PASSWORD`'ü fail-fast yap** (§3.2).
3. **Stripe 3DS akışını tamamla** — `requires_action` ve `processing` status'leri UI'da doğru işlensin (§3.4).
4. **GitHub Actions CI ekle** — `mvn test` + `npm ci && npm run build` her push'ta (§6.4).
5. **OpenAPI/Swagger ekle** — demoda açmak çok etkileyici (§6.3).

### Demodan 1 hafta önce (**güçlü puan getirir**):

6. **Integration test + frontend unit test** — en az 10 test (§6.1, §6.2).
7. **`PROJECT_REVIEW.md`'yi tezin ekine koy** — öz-farkındalık gösterir.
8. **`docs/adr/`** — 4 karar kaydı (§6.7).
9. **Actuator + Prometheus metrikleri** (§6.6).
10. **Lighthouse tarama** — 3 frontend için ekran görüntüsü (§6.10).

### Demo gününde dikkat:

- `docker compose up --build` ile başla, tüm servislerin **healthy** olmasını bekle.
- Stripe test kartı `4242 4242 4242 4242` 3DS tetiklememek için özellikle seçilmeli — Türkiye'deki bankalar çoğu test kartında da 3DS zorunlu kılıyor.
- `.env` dosyasında `AUTH_COOKIE_SECURE=false` olduğundan emin ol (localhost HTTPS yok).
- Demo makinesinde port 3000 boş olsun (`lsof -i :3000`).
- "Production'a nasıl çıkarsınız?" sorusunun cevabını hazırla (§6.8).

### Demo sonrası (bonus — tezi güçlendirir):

11. TypeScript'e geçiş (en azından `storefront-web` için) (§6.9).
12. `AdminApp.jsx` refactor (§4.1).
13. N+1 query fix (§3.3).
14. Error boundary her frontend'de (§4.7).
15. Accessibility — ARIA labels + focus management (§5).

---

## 9. Tezin Bölüm Önerisi

Tez metni yazarken aşağıdaki bölümleri mutlaka ekle:

- **Bölüm 1 — Giriş**: iş problemi (fiziki + online mağaza tek platform), literatür (ERP, PoS, e-ticaret).
- **Bölüm 2 — Mimari**: 3-SPA + single backend, `/api` gateway, PWA, JWT roles, PaymentIntent akışı.
  - UML sequence diagram'ları (en az 3: login, sepete ekle → Stripe → webhook, QR ile in-store satış)
  - Bileşen diagramı (C4 Context + Container)
  - ER diagramı (Postgres şema görseli)
- **Bölüm 3 — Kullanılan teknolojiler**: Spring Boot 3, React 18, Vite, Tailwind, Stripe, html5-qrcode, Flyway, BCrypt, nginx, Docker.
- **Bölüm 4 — Güvenlik**: `SECURITY_AUDIT.md` → tezin "Security Review" bölümünün tamamı. CSP, JWT, OWASP Top 10 karşılaştırması.
- **Bölüm 5 — Test & Kalite Güvencesi**: yazılmış unit + integration testleri, coverage raporu, Lighthouse ölçümleri.
- **Bölüm 6 — Deploy & Operasyon**: docker-compose, CI/CD, production önerisi (K8s örneği), monitoring.
- **Bölüm 7 — Sonuç & Gelecek çalışma**: TypeScript migrasyonu, offline-first staff PWA, çok mağaza desteği, yapay zeka tabanlı ürün önerisi (Gemini zaten entegre — bunu genişletebilirsin).

---

## 10. Sayısal Özet

| Kategori | KRİTİK | YÜKSEK | ORTA | DÜŞÜK | Toplam |
|---------|:-----:|:-----:|:----:|:-----:|:-----:|
| Runtime Bug | 1 | 3 | 6 | 2 | 12 |
| Kod Kalitesi | 0 | 2 | 5 | 3 | 10 |
| A11y | 0 | 0 | 5 | 0 | 5 |
| Test & Dokümantasyon | 4 | 4 | 3 | 0 | 11 |
| Güvenlik (audit ekstra) | 0 | 2 | 4 | 0 | 6 |
| **Toplam** | **5** | **11** | **23** | **5** | **44** |

> **Not:** Önceki `SECURITY_AUDIT.md`'daki 7 CRITICAL + 9 HIGH + 9 MEDIUM + 7 LOW/INFO bulgu bu sayılara **dahil değildir**. Toplam proje bulgusu ≈ 76.

---

## 11. Son Söz

Proje **iddialı, mimari olarak doğru kurulmuş, çalışan** bir bitirme projesi. Eksikler genellikle "üretim olgunluğu" (test, gözlemlenebilirlik, CI, dökümantasyon) alanında — yani akademik jürinin en çok sorduğu yerde. Yukarıdaki §8'deki 5 kritik aksiyon yapılırsa projenin teknik savunulabilirliği belirgin şekilde yükselir. Geri kalan 39 madde "gelecek çalışma" olarak sunulabilir veya savunmada sorulduğunda "farkındayız, şöyle çözülür" diye yanıtlanabilir — bu da öz-farkındalık olarak jüri nezdinde **olumlu** bir izlenim bırakır.

Başarılar. 🎓
