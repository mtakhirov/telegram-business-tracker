# 🤖 Telegram Business Chat Tracker Bot

Telegram Business orqali ulangan chatlardagi **o'chirilgan** va **tahrirlangan** xabarlarni kuzatuvchi bot.

## Talablar

- **Node.js** 18+
- **Telegram Premium** obuna (Business features uchun)

## O'rnatish

```bash
# Dependencylarni o'rnatish
npm install

# .env faylni sozlash
cp .env.example .env
```

`.env` faylni tahrirlang:

```env
BOT_TOKEN=your_bot_token_here
ADMIN_CHAT_ID=your_chat_id_here
```

- `BOT_TOKEN` — @BotFather dan olingan token
- `ADMIN_CHAT_ID` — Bildirishnomalar yuboriladigan chat ID (@userinfobot dan olish mumkin)

## Ishga tushirish

```bash
node bot.mjs
```

## Telegram Business ga ulash

1. Telegram → **Settings** → **Telegram Business** → **Chatbots**
2. Bot username'ini kiriting va ulang
3. Endi bot barcha business chatlardagi xabarlarni kuzatadi

## Bot nima qiladi?

| Event | Tavsif |
|-------|--------|
| ✏️ Edited | Tahrirlangan xabarning eski va yangi matnini ko'rsatadi |
| 🗑 Deleted | O'chirilgan xabarning mazmunini ko'rsatadi (agar xotirada bo'lsa) |
| 🔗 Connection | Business account ulanganda/uzilganda xabar beradi |

## Muhim eslatmalar

- Bot faqat **o'zi ishga tushganidan keyin** kelgan xabarlarni xotirada saqlaydi
- Xotira in-memory — bot qayta ishga tushsa, eski xabarlar yo'qoladi
- 24 soatdan eski xabarlar avtomatik tozalanadi (memory optimization)
- Production uchun Redis/DB qo'shish tavsiya etiladi

## Stack

- [grammY](https://grammy.dev) — Telegram Bot Framework
- Node.js + ES Modules
