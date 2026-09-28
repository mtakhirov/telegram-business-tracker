[English](../en/privacy.md) · [Mundarija](index.md)

# Maxfiylik va qonun

Bu sahifa yuridik maslahat emas. U shunchaki botni ishga tushirish sizga qanday
mas'uliyat yuklashini bayon qiladi — haqiqiy akkauntga ulashdan oldin buni
malakali odamga ko'rsating.

## Bot aslida nima qiladi

U siz yozishayotgan odamlarning xabarlarini saqlaydi, jumladan ular keyin
o'chirgan kontentni, va sizga ko'rsatadi. Telegram'ning Business Bot API'si
`deleted_business_messages` va `edited_business_message` ni ataylab yuboradi —
CRM va support mahsulotlari shunga tayanadi — lekin imkoniyat baribir bir xil.

Hammasi sizning mashinangizda qoladi. Uchinchi tomonga hech narsa yuborilmaydi,
media esa yuklab olinmasdan `file_id` orqali havola qilinadi.

## Siz operator bo'lasiz

Instansiyani kim ishga tushirsa, u saqlanayotgan shaxsiy ma'lumot uchun javob
beradi. Xabar matni — shaxsiy ma'lumot, va u tegishli odamlar sizning
foydalanuvchingiz emas, balki **suhbatdoshingiz**. Siz va ular qayerda
yashashingizga qarab bu quyidagilarni anglatishi mumkin:

- ishlov berish uchun huquqiy asos,
- yozishma yozib olinayotganini odamlarga aytish,
- ma'lumotni muayyan davlat ichida saqlash,
- operator sifatida ro'yxatdan o'tish,
- so'ralganda odamning ma'lumotini o'chirish.

O'zbekistonda bu — ZRU-547 (*Shaxsga doir maʼlumotlar toʻgʻrisida*). EIda yoki
EI rezidentlari uchun — GDPR. Boshqa davlatlarda o'zinikisi bor. Buni taxmin
qilmang, tekshirtiring.

## Hech kim avtomatik xabardor bo'lmaydi

Telegram business akkauntingizga bot ulanganini suhbatdoshga aytadi deb
o'ylamang. Ular **aslida** nima ko'rishini tekshiring va o'zingiz ayting.

Oshkoralik — himoyalanadigan biznes yozuvini yashirin kuzatuvdan ajratadigan
yagona nazorat. Suhbat boshida bir qatorlik ogohlantirish hech narsa turmaydi,
lekin butun arxivning xarakterini o'zgartiradi.

## Telegram chora ko'rishi mumkin

Maqsadi boshqa odamlarning xabar o'chirishini bekor qilish bo'lgan botlar
muntazam shikoyat qilinadi va o'chiriladi. Shu kod asosida biror narsani
ommaga chiqarishdan oldin Bot Terms'ni o'qing va uning ustiga ommaviy
"o'chirilgan xabarlarni ko'rish" servisi qurmang. Token o'lsa, butun deploy
u bilan ketadi.

## Kod ta'sirni qanday cheklaydi

Defaultlar torroq tomonga egilgan, nazoratlar esa ishlatilishi uchun bor:

| Nazorat                              | Ta'siri                                                           |
| ------------------------------------ | ----------------------------------------------------------------- |
| `OWNER_ID`                           | Botni faqat bitta akkaunt ulaydi va buyruq beradi                 |
| `DEFAULT_TRACK_MODE=deny`            | `/track` bilan chat qo'shilmaguncha hech narsa arxivlanmaydi      |
| `RETENTION_DAYS` / `/settings`       | Xabarlar jadval bo'yicha, har soatda, trafikdan qat'i nazar o'chadi |
| `/forget <chat_id>`                  | Bitta chat arxivi, tahrir zanjiri va bildirishnomalarini o'chiradi |
| Telegram Business'da uzish           | O'sha connection ostidagi hamma narsani tozalaydi                 |
| Fayl `600`, katalog `700`            | Arxivni faqat botni ishlatayotgan akkaunt o'qiy oladi             |
| Media `file_id` orqali               | Diskingizga birorta media fayl yozilmaydi                         |
| Tozalangan loglar                    | Xatolar update id yozadi, hech qachon xabar matnini emas          |

Bildirishnoma tafsilotlari arxiv allaqachon o'chirgan kontent nusxasini saqlaydi,
shuning uchun ular o'z jadvali bo'yicha 7 kundan keyin eskiradi.

## Haqiqiy deploy uchun oqilona defaultlar

```env
DEFAULT_TRACK_MODE=deny
RETENTION_DAYS=7
```

Faqat arxivlashga sababingiz bor chatlarni arxivlang, oynani qisqa tuting,
suhbatdoshga ayting va zaxiralarni o'zingiz nazorat qiladigan joyga ko'chiring.

## Bu loyiha nima uchun emas

Ko'zda tutilgan foydalanish — biznes o'z mijozlari bilan yozishmasini, suhbatdosh
xabardor holda, yozib borishi. Bilmagan hamkor, do'st yoki xodimni kuzatish emas,
va muallif o'sha versiyani yashirinishda yaxshiroq qilishga yordam bermaydi.
