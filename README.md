# Rezervacija datuma

Full-stack MVP aplikacija za organizacije koje žele da rezervišu datume događaja. Početna strana prikazuje javni kalendar, dok je kreiranje, izmena i brisanje rezervacija dostupno samo prijavljenim i odobrenim korisnicima.

## Tehnologije

- Node.js
- Express.js
- SQLite preko `better-sqlite3`
- Session autentifikacija
- Lokalni upload slika za logoe i flajere
- Plain HTML/CSS/JavaScript frontend

## Lokalno pokretanje

1. Instalirajte zavisnosti:

   ```bash
   npm install
   ```

2. Napravite `.env` fajl na osnovu primera:

   ```bash
   cp .env.example .env
   ```

   Na Windows PowerShell-u možete koristiti:

   ```powershell
   Copy-Item .env.example .env
   ```

3. Po želji promenite admin kredencijale u `.env`:

   ```env
   ADMIN_EMAIL=admin@rezervacije.local
   ADMIN_PASSWORD=PromeniMe123!
   SESSION_SECRET=promenite-ovu-vrednost-u-dugacku-nasumicnu-tajnu
   ```

4. Pokrenite aplikaciju:

   ```bash
   npm start
   ```

5. Otvorite:

   ```text
   http://localhost:3000
   ```

   Javni kalendar je dostupan na `/`, prijava na `/login`, registracija na `/register`, korisnički kalendar na `/dashboard`, a admin panel na `/admin`.

## Test tok

1. Prijavite se kao admin kroz istu login stranicu:

   - Email: vrednost iz `ADMIN_EMAIL`
   - Lozinka: vrednost iz `ADMIN_PASSWORD`

2. U drugom browseru ili nakon odjave registrujte organizaciju kroz formu `Registracija`.

3. Novi nalog će dobiti poruku `Nalog čeka odobrenje` i ne može da se prijavi dok ga admin ne odobri.

4. Admin u `Admin panel` delu može da odobri, odbije ili obriše nalog.

5. Bez prijave otvorite `/` i proverite da se vidi kalendar, rezervisani datumi i detalji događaja. Klik na slobodan datum prikazuje poruku da je prijava potrebna za rezervaciju.

6. Nakon odobrenja, organizacija se prijavljuje i vidi `Kalendar`.

7. Klik na slobodan datum za prijavljenu organizaciju otvara formu `Rezerviši datum`.

8. Klik na rezervisan datum prikazuje detalje događaja. Korisnik može da izmeni ili obriše samo sopstvene događaje, dok admin može da izmeni ili obriše bilo koju rezervaciju.

## Upload i baza

- SQLite baza se podrazumevano čuva u `data/rezervacije.sqlite`.
- Logoi se čuvaju u `public/uploads/logos`.
- Flajeri se čuvaju u `public/uploads/flyers`.
- Dozvoljeni tipovi slika su JPG, PNG, WEBP i GIF.
- Veličine se podešavaju kroz `MAX_LOGO_SIZE_MB` i `MAX_FLYER_SIZE_MB`.

## Skripte

```bash
npm start
npm run dev
npm run check
```
