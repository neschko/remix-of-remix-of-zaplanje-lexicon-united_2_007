# План имплементације

Ово је велики сет од 7 функционалности. Предлажем да их урадимо у 3 фазе да бисмо могли да тестирамо успут.

## Фаза 1 — Темељи (аутентификација + улоге + React Query)

**1. Аутентификација и улоге**
- Lovable Cloud auth: email/лозинка + Google пријава
- `profiles` табела (display_name, avatar_url) повезана са `auth.users`
- `user_roles` табела са `app_role` enum-ом (`admin`, `moderator`, `user`)
- `has_role()` security definer функција (избегава RLS рекурзију)
- Аутоматско креирање профила и `user` улоге при регистрацији (trigger)
- Странице `/auth` (login/signup), guard за заштићене руте
- Header добија „Пријава"/„Одјава" + индикатор админа

**2. React Query свуда**
- Замена директних позива према Supabase у `community/api.ts` са `useQuery`/`useMutation` хуковима
- Кеширање коментара, заједничких речи, гласова
- Optimistic updates за гласове и коментаре

## Фаза 2 — AI могућности (Lovable AI Gateway)

**3. OCR исправке (admin only)**
- Нова страница `/admin/ocr` — приказ оригиналних SANU одредница у батчевима од 20
- Edge функција `ocr-fix` (Gemini Flash) враћа предлог исправке + confidence (0–1)
- Админ прихвата/одбија предлог; промене иду у нову табелу `entry_corrections`
- Прихваћене исправке ажурирају локални Dexie запис кроз `source: "corrected"`

**4. Језичка анализа**
- Нова страница `/analiza` — унос текста ИЛИ upload аудио фајла (≤5MB)
- Избор модела: `google/gemini-3-flash-preview` (брзо) или `google/gemini-2.5-pro` (детаљно)
- Дијалекатска анализа: препознавање заплањских облика, фонетика, лексика
- Edge функција `dialect-analyze` (текст + audio преко multimodal)
- Табела `analysis_history` (per-user) — листа претходних анализа
- Аудио чувамо у Storage bucket-у `analysis-audio` (private)

**5. Аудио учитавање**
- Део горње странице: drag&drop, валидација типа (mp3/wav/m4a) и величине (5MB)
- Storage bucket `analysis-audio` са per-user RLS

## Фаза 3 — Преглед и извоз

**6. Глобални коментари**
- Нова страница `/komentari` — feed свих скорашњих коментара на одредницама
- Линк на одредницу, аутор, временска ознака
- Филтер по слову/категорији

**7. PDF/Word извоз**
- На `/upravljanje` додајемо два дугмета:
  - PDF извоз преко `jspdf` + `html2canvas` (формат: класичан речнички приказ)
  - DOCX извоз преко `docx` пакета
- Опционо: филтрирање (само слово, само категорија, само лични)
- Цео извоз се ради у browser-у (без сервера)

## Технички детаљи

```text
Нове табеле:
  profiles            (id, user_id, display_name, avatar_url)
  user_roles          (id, user_id, role)            ← app_role enum
  entry_corrections   (id, entry_id, original, corrected, confidence,
                       reviewed_by, status, created_at)
  analysis_history    (id, user_id, kind, input_text, audio_path,
                       model, result, created_at)

Нове edge функције:
  ocr-fix            (admin only, Gemini Flash, batch 20)
  dialect-analyze    (text + optional audio, model choice)

Storage:
  analysis-audio     (private bucket, per-user folder)

Нови npm пакети:
  jspdf, html2canvas, docx, @tanstack/react-query (већ постоји)
```

## Распоред

Препоручујем да кренемо од **Фазе 1** јер све остало зависи од auth-а и улога (OCR странице су admin-only, анализа чува историју по кориснику).

Након одобрења, прво пишем миграције за auth/profiles/roles, па онда код.
