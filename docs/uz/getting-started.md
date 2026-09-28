[English](../en/getting-started.md) · [Mundarija](index.md)

# Ishni boshlash

## Talablar

- [Bun](https://bun.sh) 1.2 yoki undan yangi. Kod `bun:sqlite` ni import qiladi,
  shuning uchun Node.js uni ishga tushira olmaydi.
- Telegram Premium obuna, chunki Telegram Business — Premium imkoniyati.
- [@BotFather](https://t.me/BotFather) dan olingan bot token.

## O'rnatish

```sh
bun install
cp .env.example .env
```

`bun install` git hooklarini ham o'rnatadi: har commitdan oldin formatlash,
lint, typecheck va testlar ishlaydi.

## Sozlash

Faqat birinchi ikkitasi majburiy.

| O'zgaruvchi             | Default                 | Vazifasi                                                       |
| ----------------------- | ----------------------- | -------------------------------------------------------------- |
| `BOT_TOKEN`             | —                       | @BotFather dan olingan token                                   |
| `ADMIN_CHAT_ID`         | —                       | Bildirishnomalar yuboriladigan chat                            |
| `OWNER_ID`              | `ADMIN_CHAT_ID`         | Botni ulash va buyruq berishga ruxsat etilgan yagona akkaunt   |
| `BOT_NAME`              | `Business Chat Archive` | Bot o'z xabarlarida ko'rsatadigan nom                          |
| `DB_PATH`               | `data/messages.db`      | SQLite fayl joyi                                               |
| `RETENTION_DAYS`        | `30`                    | Xabar o'chirilgunga qadar necha kun saqlanadi                  |
| `DEFAULT_TRACK_MODE`    | `allow`                 | Qoidasi yo'q chat arxivlanadimi                                |
| `HEALTH_PORT`           | `3000`                  | 127.0.0.1 dagi health endpoint; `0` o'chiradi                  |
| `BACKUP_DIR`            | `data/backups`          | Snapshotlar yoziladigan joy                                    |
| `BACKUP_INTERVAL_HOURS` | `24`                    | Snapshotlar orasidagi soat; `0` o'chiradi                      |
| `BACKUP_KEEP`           | `7`                     | Nechta snapshot saqlanadi                                      |
| `LOG_LEVEL`             | `info`                  | pino log darajasi                                              |
| `LOG_PRETTY`            | —                       | `1` qilinsa loglar o'qishga qulay ko'rinishda chiqadi          |

`OWNER_ID` berilmasa `ADMIN_CHAT_ID` ishlatiladi. Bu bildirishnomalar o'zingizning
chatingizga kelganda to'g'ri, chunki shaxsiy chat id foydalanuvchi id'siga teng.
Agar `ADMIN_CHAT_ID` guruh yoki kanalga ishora qilsa, bu zaxira ma'noga ega
bo'lmaydi va bot `OWNER_ID` siz ishga tushmaydi.

Muhit startupda bir marta tekshiriladi. Yo'q yoki noto'g'ri qiymat botni darhol
to'xtatadi va nima xato ekanini ro'yxat qilib ko'rsatadi — bir necha soatdan
keyin birinchi updateda emas. Schemani interaktiv ko'rish uchun:

```sh
bunx @envin/cli@latest dev -c src/shared/config/env.ts
```

## Ishga tushirish

```sh
bun run dev                  # watch rejimi, to'g'ridan-to'g'ri manbadan
bun run build && bun start   # kompilyatsiya qilingan holda
```

Migratsiyalar startupda qo'llanadi, shuning uchun DB birinchi ishga tushishda
o'zini o'zi quradi. Qo'lda hech narsa yaratish shart emas.

## Telegram Business ga ulash

1. Telegram → **Settings** → **Telegram Business** → **Chatbots**
2. Bot username'ini kiriting va ulang
3. Bot ulanayotgan akkaunt `OWNER_ID` ekanini tekshiradi va boshqa hammani rad
   etadi, urinish haqida begonaning user id'si bilan xabar beradi

**Eski versiyadan yangilagan bo'lsangiz, bir marta uzib-qayta ulang.** Egasini
tekshirish `business_connections` jadvalini o'qiydi, u esa bo'sh boshlanadi —
eski ulanish qayta tiklanmaguncha e'tiborsiz qoladi.

## Tekshirish

Botga `/stats` yuboring. U arxiv hajmi, ishga tushgan vaqt va retention oynasi
bilan javob beradi. Jim tursa — yozgan akkauntingiz `OWNER_ID` emas.
