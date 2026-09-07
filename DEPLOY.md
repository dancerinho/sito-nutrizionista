# Deploy e configurazione dominio

Sito statico (HTML + Tailwind CDN + JS vanilla) ospitato su **GitHub Pages**.

- Repository: `dancerinho/sito-nutrizionista`
- Branch pubblicato: `main`, cartella `/` (root)
- URL attuale: <https://dancerinho.github.io/sito-nutrizionista/>

Ogni push su `main` rigenera automaticamente il sito (1–2 minuti).

---

## 1. Passaggio al dominio personalizzato

Esempio usato: `www.alessiafortinanutrizionista.it`. Sostituire con il dominio
effettivo una volta acquistato dalla cliente.

### Passo 1 — File `CNAME` nel repository

Creare in root un file chiamato **`CNAME`** (maiuscolo, senza estensione)
contenente **una sola riga**, il dominio senza `https://` e senza slash finale:

```
www.alessiafortinanutrizionista.it
```

Da riga di comando:

```bash
echo "www.alessiafortinanutrizionista.it" > CNAME
git add CNAME
git commit -m "chore: aggiungi dominio personalizzato"
git push
```

> In alternativa si può impostare il dominio da GitHub → Settings → Pages →
> Custom domain: GitHub creerà il file `CNAME` da solo. **Non fare entrambe le
> cose in modo diverso**, altrimenti i due valori si sovrascrivono a vicenda.

### Passo 2 — Record DNS dal pannello del registrar

Da configurare presso chi ha venduto il dominio (Aruba, Register.it, Netsons,
GoDaddy, Namecheap…), nella sezione "Gestione DNS" / "Zona DNS".

**A) Sottodominio `www` (configurazione consigliata)**

| Tipo  | Nome / Host | Valore                  | TTL      |
|-------|-------------|-------------------------|----------|
| CNAME | `www`       | `dancerinho.github.io.` | 3600     |

Il valore è lo **username GitHub**, non il nome del repository. Il punto finale
è richiesto da alcuni pannelli, opzionale in altri.

**B) Dominio nudo `alessiafortinanutrizionista.it` (senza `www`)**

Servono **quattro record A** verso gli IP ufficiali di GitHub Pages:

| Tipo | Nome / Host | Valore            | TTL  |
|------|-------------|-------------------|------|
| A    | `@`         | `185.199.108.153` | 3600 |
| A    | `@`         | `185.199.109.153` | 3600 |
| A    | `@`         | `185.199.110.153` | 3600 |
| A    | `@`         | `185.199.111.153` | 3600 |

Facoltativi, per rete IPv6 (stesso host `@`):

```
2606:50c0:8000::153
2606:50c0:8001::153
2606:50c0:8002::153
2606:50c0:8003::153
```

> Configurando sia i record A sia il CNAME `www`, GitHub reindirizza
> automaticamente da un formato all'altro. Se nella zona DNS esiste già un
> record A o CNAME su `@` o su `www` (spesso un parcheggio del registrar),
> **va rimosso** prima di inserire i nuovi.

### Passo 3 — HTTPS

Dopo la propagazione DNS (da pochi minuti fino a 24–48 ore):

1. GitHub → Settings → Pages
2. Verificare che compaia il segno di spunta verde sul dominio
3. Attivare **Enforce HTTPS** (il certificato Let's Encrypt è gratuito e
   si rinnova da solo)

Verifica della propagazione:

```bash
dig www.alessiafortinanutrizionista.it +short
dig alessiafortinanutrizionista.it +short
```

### Passo 4 — Aggiornare gli URL assoluti nel sito

In `index.html`, dentro il blocco commentato in `<head>`, sostituire
`https://dancerinho.github.io/sito-nutrizionista/` con il nuovo dominio in:

- `<link rel="canonical">`
- `<meta property="og:url">`
- il campo `"url"` dello schema JSON-LD

Sono gli **unici** URL assoluti che puntano al sito stesso: tutta la
navigazione interna usa ancore relative (`#servizi`, `#contatti`…) e i file
`style.css` / `script.js` sono referenziati con percorso relativo, quindi
funzionano sia in sottocartella sia su dominio di secondo livello senza
modifiche.

---

## 2. Cose da completare prima di andare online davvero

- [ ] Sostituire le foto placeholder (`placehold.co`) con foto reali della dottoressa
- [ ] Inserire email e telefono reali nella sezione Contatti (ora `[inserire ...]`)
- [ ] Inserire la P.IVA nel footer (ora `[da inserire]`)
- [ ] Caricare un'immagine social reale 1200×630 px e aggiornare `og:image` / `twitter:image`
- [ ] Collegare il modulo di contatto a un servizio reale (Formspree, EmailJS, Netlify Forms):
      attualmente `script.js` valida i campi ma **non invia nulla**
- [ ] Aggiungere l'informativa privacy/cookie (obbligatoria se si raccolgono dati dal form)
- [ ] Ottenere conferma dalla dottoressa sull'uso dei testi e delle recensioni riportate

---

## 3. Sviluppo in locale

```bash
python -m http.server 5500
# poi apri http://localhost:5500/
```
