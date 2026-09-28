[English](../en/deployment.md) · [Mundarija](index.md)

# Deploy

## Docker

```sh
docker compose up -d --build
```

Konteyner imtiyozsiz `bun` foydalanuvchisi ostida ishlaydi.
`docker-compose.yml` `./data` ni bind-mount qilgani uchun host katalogi o'sha
foydalanuvchi (uid 1000) uchun yoziladigan bo'lishi kerak, aks holda SQLite
`EACCES` beradi:

```sh
chown -R 1000:1000 ./data
```

Volume'ni named qilish muammoni yo'qotadi, lekin faylga hostdan qulay kirishni
yo'qotasiz.

Image `.dockerignore` orqali `.env` va `data/` ni chiqarib tashlaydi — na token,
na arxiv hech qachon layer ichiga tushmaydi.

## Healthcheck

`127.0.0.1:HEALTH_PORT` dagi `GET /health` uptime va arxiv hajmini qaytaradi:

```sh
curl localhost:3000/health
# {"status":"ok","uptimeSeconds":41,"messages":1437}
```

U faqat loopback'ga bog'langan — Docker `HEALTHCHECK` uchun shuning o'zi yetadi,
chunki u konteyner ichida ishlaydi. Tarmoqqa hech narsa ochilmaydi,
`HEALTH_PORT=0` esa serverni butunlay o'chiradi.

Javob arxiv hajmini ham beradi, shuning uchun tekshiruv shunchaki tirik
jarayonni o'z DB'siga yeta oladiganidan ajrata oladi.

## Zaxira

Snapshot `BACKUP_INTERVAL_HOURS` da bir marta `BACKUP_DIR` ga yoziladi,
`BACKUP_KEEP` dan oshgani esa o'chiriladi. Hoziroq olish uchun:

```sh
bun run db:backup
```

Snapshotlar SQLite'ning `VACUUM INTO` sidan foydalanadi: bot ishlab turganda
izchil va allaqachon siqilgan nusxa yoziladi. To'xtatish shart emas, yarim
yozilgan WAL tushib qolish ehtimoli ham yo'q.

**DB yonidagi snapshot buzilish va xatodan saqlaydi, disk yo'qolishidan emas.**
`BACKUP_DIR` ni o'z jadvalingiz bo'yicha mashinadan tashqariga ko'chiring:

```sh
rsync -a --delete ./data/backups/ backup-host:/srv/spy-bot/
```

## Loglar

Chiqish pino'dan structured JSON — `docker logs` ham, log kollektor ham shuni
xohlaydi. Ishlab chiqish paytida o'qishga qulay qatorlar uchun `LOG_PRETTY=1`,
batafsillikni o'zgartirish uchun `LOG_LEVEL`.

`docker-compose.yml` loglarni 10 MB dan 3 ta fayl bilan cheklaydi — uzoq
ishlaydigan konteyner diskni to'ldira olmaydi.

Xatolar update id va xatoning o'zi sifatida yoziladi, hech qachon butun kontekst
emas — aks holda boshqa odamlarning xabar matni logga to'kilardi.

## Yangilash

```sh
git pull
bun install
docker compose up -d --build
```

Migratsiyalar startupda ishlaydi, schema o'zgarishi uchun qo'lda qadam kerak
emas.

Egasini tekshirish paydo bo'lishidan oldingi versiyadan yangilayotgan bo'lsangiz,
Telegram Business'da botni bir marta uzib-qayta ulang. Tekshiruv
`business_connections` jadvalini o'qiydi, eski o'rnatma esa uni hech qachon
to'ldirmagan.
