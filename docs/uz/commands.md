[English](../en/commands.md) · [Mundarija](index.md)

# Buyruqlar

Har bir buyruq faqat egaga. Boshqalar uchun bot rad etmaydi, balki **jim
turadi** — shunda u nima ekanini oshkor qilmaydi.

| Buyruq                               | Nima qiladi                                     |
| ------------------------------------ | ----------------------------------------------- |
| `/start`                             | Bot haqida va qanday ulash haqida                |
| `/help`                              | Buyruqlar ro'yxati                               |
| `/stats`                             | Arxiv hajmi, ishga tushgan vaqt, retention       |
| `/chats`                             | Ma'lum chatlar va ularning arxivlash qoidalari   |
| `/track <chat_id>`                   | Bu chatni arxivlash                              |
| `/untrack <chat_id>`                 | Arxivlashni to'xtatish                           |
| `/untrack_reset <chat_id>`           | Qoidani olib tashlab, defaultga qaytish          |
| `/forget <chat_id>`                  | Unga tegishli hamma narsani o'chirish            |
| `/search <so'z>`                     | Arxiv bo'ylab qidiruv                            |
| `/history <chat_id> [limit]`         | Bitta chatdagi oxirgi xabarlar                   |
| `/versions <chat_id> <message_id>`   | Bitta xabarning to'liq tahrir zanjiri            |
| `/export [chat_id]`                  | Arxivni JSON fayl sifatida yuklab olish          |
| `/settings`                          | Retention va default qoidani ko'rish/o'zgartirish |

## Nima arxivlanishini tanlash

`/chats` bot ko'rgan har chatni ro'yxatlaydi — arxivlanadimi yoki yo'qmi,
farqsiz — va aniq qoidasi borlarini belgilaydi. Chat id'lar shu yerdan olinadi.

Qoidasi yo'q chat `DEFAULT_TRACK_MODE` ga tayanadi. Uni `deny` qilish arxivni
opt-in qiladi — bu torroq va xavfsizroq default:

```
/settings track deny
/track 555
```

`/untrack` faqat kelajakdagi arxivlashni to'xtatadi. Allaqachon saqlanganini
`/forget` o'chiradi, va bu qaytarilmaydi.

## Qayta o'qish

```
/search kitob            barcha arxivlangan chatlardan mos xabarlar
/history 555             555-chat uchun oxirgi 20 xabar
/history 555 100         100 tagacha
/versions 555 1042       bitta xabarning har versiyasi
```

Qidiruv so'rovingizni harfma-harf oladi: `%` hammasini emas, literal foiz
belgisini topadi.

## Eksport

`/export` butun arxivni JSON document qilib yuboradi; `/export 555` bitta chatga
toraytiradi. Har xabar to'liq tahrir zanjiri bilan boradi — ya'ni eksport oxirgi
matn snapshoti emas, to'liq yozuv.

Bot ko'pi bilan 50 MB yuklay oladi. Shunga yaqinlashgan eksport API chaqiruvi
ichida yiqilish o'rniga rad etiladi va toraytirish taklif qilinadi.

## Sozlamalar

```
/settings                  joriy qiymatlar va har biri qayerdan kelgani
/settings retention 7      xabarlarni 7 kun saqlash
/settings track deny       faqat /track bilan qo'shilgan chatlarni arxivlash
/settings reset retention  .env dagi qiymatga qaytish
```

Default manbai sifatida muhit qoladi — yangi o'rnatma aynan `.env` aytganidek
ishlaydi. Bu yerda o'zgartirilgan sozlama reset qilinmaguncha o'sha defaultni
to'sib turadi va darhol kuchga kiradi: retention har tozalash bosqichida,
arxivlash defaulti esa har xabarda o'qiladi, restart shart emas.

## Bildirishnomalar

Bildirishnoma hodisa va chat bilan boshlanadi, chat nomi esa odamning Telegram
profiliga havola bo'ladi. `t.me/<username>` havolasi har doim ochiladi, shuning
uchun username bor bo'lsa o'sha ishlatiladi. `tg://user?id=` zaxirasi faqat
botga yozgan foydalanuvchilarda ochiladi, suhbatdoshlar esa odatda yozmagan —
shuning uchun raqamli id ochiq ko'rinishda matn sifatida ham chiqadi.

Id'lar, aniq vaqt va keyingi buyruqlar **Batafsil** tugmasi ostida turadi: u
xabarni joyida kengaytiradi va **Yashirish** ga aylanadi. Tugma bildirishnoma
bitta xabarga sig'ganda qo'yiladi; uzunrog'i boshidanoq ochiq yuboriladi.

Tugma ortidagi tafsilotlar 7 kundan keyin eskiradi — shundan so'ng tugma
jimgina yiqilmasdan shu haqda aytadi.
