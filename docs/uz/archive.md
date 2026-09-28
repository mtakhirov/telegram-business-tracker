[English](../en/archive.md) · [Mundarija](index.md)

# Arxiv

## Nima saqlanadi

Hammasi `DB_PATH` dagi bitta SQLite faylda.

| Jadval                 | Nimani saqlaydi                                                          |
| ---------------------- | ------------------------------------------------------------------------ |
| `messages`             | Har arxivlangan xabarning oxirgi holati, media `file_id` bilan           |
| `message_versions`     | Har xabar uchun faqat qo'shiladigan tahrir zanjiri                       |
| `chats`                | Ko'rilgan har chatning id, nomi va oxirgi vaqti — kontentsiz             |
| `chat_rules`           | Chat bo'yicha arxivlash qarorlaringiz                                    |
| `business_connections` | Connection id, egasi id, yoqilgan bayrog'i                               |
| `notification_details` | Yuborilgan bildirishnomaning ikkala ko'rinishi, tugma ishlashi uchun     |
| `settings`             | `/settings` o'zgartiradigan qiymatlarning runtime override'lari          |

Media `file_id` orqali havola qilinadi va hech qachon yuklab olinmaydi — DB
kichik qoladi va diskingizga birorta media fayl tushmaydi.

`chats` jadvali `/chats` hali arxivlanmagan chatni ham taklif qila olishi uchun
bor. Unda faqat metadata saqlanadi.

## Nega versiyalar alohida

Xabar qatori har tahrirda ustiga yoziladi. Ikkinchi jadval bo'lmasa oraliq
versiyalar yo'qolardi, jimgina unutadigan arxiv esa unchalik arxiv emas.
`message_versions` faqat qo'shiladi, va qator faqat matn yoki caption
haqiqatan o'zgarganda qo'shiladi — takroriy update zanjirni shishirmaydi.

Zanjirni `/versions <chat_id> <message_id>` bilan o'qing.

## Nega bildirishnoma tafsilotlari alohida

O'chirilgan xabar bildirishnomasi yetkazilishi bilan `messages` dan o'chiriladi.
Bildirishnomaning o'zini esa keyinroq ochish mumkin, demak ochiq matn u tasvirlab
turgan qatordan uzoqroq yashashi kerak.

Shu sababli bu qatorlar arxivda endi yo'q kontentni takrorlaydi. Ular o'z
muddatiga ega — **7 kun** — va chat unutilganda o'chiriladi.

## Retention

Retention oynasidan eski qatorlar startupda va keyin har soatda o'chiriladi,
trafikdan qat'i nazar — jim turgan bot ham o'z vaqtida unutadi.

```
/settings retention 7     xabarlarni 7 kun saqlash
/settings reset retention RETENTION_DAYS ga qaytish
```

O'chirish kontent saqlaydigan har jadvalga yetib boradi. Bitta xabar, bitta
chat, bitta connection yoki retention tozalashi — har biri mos tahrir zanjirini
ham olib tashlaydi. Shuning uchun chat id va connection id versiya qatorlarida
takrorlangan.

## Fayl ruxsatlari

DB boshqa odamlarning shaxsiy xabarlarini saqlaydi. Fayl `600`, katalogi esa
`700` rejimi bilan yaratiladi, WAL journal esa o'qishlar yagona yozuvchini
bloklamasligini ta'minlaydi.

## Schema o'zgarishi

Schema `src/shared/db/schema.ts` da bir marta e'lon qilinadi va queryler bilan
migratsiyalar uni birga ishlatadi.

```sh
bun run db:generate   # schema tahriridan keyin, SQL ni drizzle/ ga yozadi
bun run db:migrate    # qo'lda qo'llash
bun run db:studio     # ma'lumotni ko'rish
```

Migratsiyalar startupda avtomatik qo'llanadi: yangi o'rnatma ham, yangilangani
ham qo'lda qadamsiz joriy schemaga yetadi. Generatsiya qilingan SQL `drizzle/`
da turadi va git'ga kiritilishi kerak.
