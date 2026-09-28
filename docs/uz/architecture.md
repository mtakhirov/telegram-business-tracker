[English](../en/architecture.md) · [Mundarija](index.md)

# Arxitektura

## Qatlamlar

Manba feature-sliced tuzilmaga amal qiladi. Importlar faqat pastga qaraydi,
feature esa boshqa featureni hech qachon import qilmaydi.

```
src/app/        kompozitsiya: bot, handlerlar, buyruqlar, health, kirish nuqtasi
src/features/   har bir foydalanuvchi xatti-harakati uchun bitta slice
src/entities/   message, chat, connection, notification, settings
src/shared/     config, db, telegram helperlari, formatlash, logger
```

| Qatlam     | Nimani import qiladi        | Nimani saqlaydi                                                  |
| ---------- | --------------------------- | ----------------------------------------------------------------- |
| `shared`   | loyihadan hech narsani      | Config, DB klienti va schema, Telegram helperlari, logger        |
| `entities` | `shared`                    | Jadval guruhi uchun bitta repository, va bildirishnoma yuborish  |
| `features` | `shared`, `entities`        | Har xatti-harakat uchun slice, har biri grammY `Composer` beradi |
| `app`      | hammasini                   | Ulash, update obunasi, rejali ishlar, to'xtatish                 |

## Featurelar

| Slice               | Nimaga javob beradi                                           |
| ------------------- | -------------------------------------------------------------- |
| `archive-message`   | `business_message` — arxivlashga ruxsat berilganini saqlaydi   |
| `notify-edited`     | `edited_business_message`                                      |
| `notify-deleted`    | `deleted_business_messages`                                    |
| `notify-connection` | `business_connection` — egasi darvozasi                        |
| `toggle-details`    | Bildirishnomadagi ochish tugmasi                               |
| `chat-rules`        | `/chats`, `/track`, `/untrack`, `/untrack_reset`, `/forget`    |
| `search-archive`    | `/search`, `/history`                                          |
| `message-versions`  | `/versions`                                                    |
| `export-archive`    | `/export`                                                      |
| `settings`          | `/settings`                                                    |
| `bot-info`          | `/start`, `/help`, `/stats`                                    |

## Update qanday o'tadi

O'chirilgan xabar — eng murakkab yo'l:

1. Telegram `deleted_business_messages` yuboradi: unda connection id va xabar
   id'lari bor, kontent esa yo'q.
2. `notify-connection` qaysi connection egaga tegishli ekanini allaqachon
   yozib qo'ygan. Feature buni tekshiradi va mos kelmasa to'xtaydi.
3. Chat qoidasi tekshiriladi. Arxivlanmaydigan chat bildirishnoma bermaydi.
4. Har id arxivdan qidiriladi va matn hamda mediaga ajratiladi.
5. Bildirishnoma ikki marta render qilinadi — yopiq va ochiq — va birini
   ikkinchisiga almashtira oladigan tugma bilan yuboriladi.
6. Qatorlar **faqat yuborish muvaffaqiyatidan keyin** o'chiriladi. Yuborish
   xato bersa kontent butunlay yo'qolmaydi, joyida qoladi.

Tahrirlar xuddi shu shaklda, lekin yangi versiya bildirishnomadan **oldin**
saqlanadi: yuborish xato bersa ham arxivda keyingi solishtirish uchun to'g'ri
oxirgi matn qoladi.

## Obunalar

`allowed_updates` da yo'q update turini Telegram umuman yubormaydi — ya'ni
handler jimgina hech qachon ishlamaydi. Shuning uchun `ALLOWED_UPDATES`
`src/app/handlers.ts` da, uni ishlatadigan featurelar yonida turadi, va test
feature manbalarini o'qib tekshiradi:

- feature obuna bo'lgan har update turi e'lon qilinganmi,
- update bilan ishlaydigan har feature barrel'da import qilinib ishlatilganmi.

Ikkala xato ham tip tekshiruviga ko'rinmaydi, chunki har feature bir xil
`Composer` shaklini eksport qiladi.

## Chiquvchi so'rovlar

`src/app/bot.ts` da har Bot API chaqiruvini uchta transformer o'raydi:

- link previewlar o'chiriladi,
- `429` javoblar `retry_after` ga rioya qilib qayta uriniladi,
- so'rovlar throttle qilinadi, shunda portlash Telegram limitini urmaydi.

grammY transformerlarni **teskari** tartibda ishlatadi: oxirgi o'rnatilgani
eng tashqarida turadi.

## Xabar hajmi

Telegram xabari 4096 belgi, caption esa 1024 belgi bilan cheklangan. Shuning
uchun bildirishnoma matni teglari muvozanatlangan mustaqil bloklar ro'yxati
sifatida quriladi, `packBlocks` esa ularni limit ruxsat berganicha kam xabarga
joylaydi. Bo'lish escape qilingan matnda bo'ladi va hech qachon HTML entity
ichida yoki `<s>` bilan `</s>` orasida kesmaydi — ikkalasi ham Telegram xabarni
parse xatosi bilan rad etishiga olib keladi.

## Testlar

140 ta test, `bun test --isolate` bilan ishlaydi. Izolyatsiya muhim: DB klienti
modul darajasidagi singleton, shuning uchun har faylga toza modul registry
bo'lmasa, bir test fayli boshqasi hali ishlatayotgan DB'ni yopib qo'yadi.

Handler va buyruq testlari haqiqiy grammY `Context` quradi, uning `Api` si esa
transformer bilan ushlanadi — shuning uchun ular ichki helper shaklini emas,
Telegram oladigan aniq matnni tekshiradi.
