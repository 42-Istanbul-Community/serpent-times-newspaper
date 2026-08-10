# TODO — İnceleme Bulguları

Backend, frontend ve dosya düzeni incelemelerinden çıkan bulgular.

## 1. Ortam kurulumu

- [ ] `.env` / `.env.example` içindeki `DATABASE_URL="postgres://${POSTGRES_USER}:...` satırı (Kullanıcı isteği ile atlandı).

## 2. Editör sahiplik modeli — writer→editor akışı

- [x] `src/routes/staff/(editor)/newspaper/[editionID]/+page.server.ts:68` — Yazarlar kendi taslaklarını veya yayınlanmış makalelerini görebilirken, editörler diğer yazarların yayınlanmış makalelerini de seçebilecek şekilde güncellendi.
- [x] `src/routes/api/article/[articleID]/+server.ts` `GET` — Kendi makalesi veya `published` durumundaki makaleler erişilebilir kılındı.

## 3. Rol yönetimi tutarlılığı

- [ ] `src/routes/api/user-role/+server.ts:30` vs `src/routes/staff/dev/+page.server.ts:66` (Kullanıcı isteği ile atlandı).

## 4. Kapak (cover) değiştirme sırası / FK ihlali

- [x] `src/routes/staff/(editor)/newspaper/[editionID]/edition-sync.svelte.ts` `removeCover()` / `pickTemplate('cover')` — Kapak değişimi öncesi `saveNow()` ile veritabanı anında güncelleniyor ve `newspaper_edition.ts` şemasında `onDelete: 'set null'` eklendi.

## 5. CDN yetkilendirme ve görünürlük

- [x] `src/routes/api/cdn/[...path]/+server.ts` — `POST` ve `DELETE` işlemlerine kaynak sahipliği doğrulaması (`assertCdnOwnership`) eklendi. Dizin listeleme (directory listing) yetkisiz kullanıcılara kapatıldı.

## 6. Taslak silme guard'ları / sahipsiz referans riski

- [x] `src/routes/staff/(editor)/writer/+page.server.ts` — Taslak makale silindiğinde ilgili gazete baskılarının `articleIds` dizisinden hayalet ID'ler otomatik temizleniyor.
- [x] `src/routes/staff/(editor)/page/+page.server.ts` — Makalelerde kullanımda olan sayfa şablonlarının silinmesi engellendi.

## 7. Undo/Redo (canvas history) seed eksikliği

- [x] `src/routes/staff/(editor)/page/[pageID]/canvas/canvas-history.ts` — `seed()` metodu eklendi. Şablon yüklendiğinde `template-sync.svelte.ts` üzerinden undo yığını ve snapshot temizleniyor.

## 8. Sayfa editörü görsel yükleme kapsamı

- [x] `src/routes/staff/(editor)/page/[pageID]/upload-image.ts` ve `upload-image.ts` — Şablona yüklenen görseller `/cdn/page-template/<pageId>/files/` altına standartlaştırıldı.

## 9. Tekrarlanan mantığın ortak yardımcıya çıkarılması

- [x] `capture-thumbnail.ts` tek bir ortak parametrik `$lib/components/editor/capture-thumbnail.ts` fonksiyonuna indirgenmiş durumda.

## 10. Küçük temizlikler

- [x] `dragRow()` içindeki ikinci `if (this.draggedId === null) return;` ölü kodları 3 state dosyasından da (`canvas-state`, `edition-state`, `paper-state`) temizlendi.

## 11. Gereksiz sorgu

- [x] `src/routes/+layout.server.ts` — `userTable` veritabanı sorgusu sadece oturum açmış kullanıcılar için çalışacak şekilde optimize edildi; anonim ziyaretçilerde DB sorgusu atlanıyor.
