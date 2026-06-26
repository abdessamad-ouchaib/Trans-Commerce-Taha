# 🚛 Trans Commerce TAHA — Plateforme de Gestion

Stack : **React · Node.js · PostgreSQL (Neon) · Vercel · Render**

---

## 🚀 DÉPLOIEMENT EN 6 ÉTAPES (tout gratuit)

### ÉTAPE 1 — Neon (base de données PostgreSQL)
1. Aller sur https://neon.tech → Sign Up gratuit
2. New Project → nom: `trans-commerce-taha`
3. Copier la **Connection string** :
   `postgresql://user:pass@ep-xxx.aws.neon.tech/neondb?sslmode=require`

### ÉTAPE 2 — GitHub
```bash
git init && git add .
git commit -m "Initial commit"
git remote add origin https://github.com/VOTRE_USERNAME/trans-commerce-taha.git
git push -u origin main
```

### ÉTAPE 3 — Render (backend)
- Root Directory: `backend` · Build: `npm install` · Start: `node server.js`
- Variables d'environnement :
  ```
  DATABASE_URL   = postgresql://...@neon.tech/neondb?sslmode=require
  JWT_SECRET     = tct_abdelaali_secret_2024
  FRONTEND_URL   = https://trans-commerce-taha.vercel.app
  PORT           = 5000
  ```

### ÉTAPE 4 — Initialiser la base de données
```bash
cd backend
cp .env.example .env   # puis mettre votre DATABASE_URL
npm install
node db/init.js        # crée les tables
node db/seed.js        # données initiales + admin
```

### ÉTAPE 5 — Vercel (frontend)
- Root Directory: `frontend`
- Variable : `REACT_APP_API_URL = https://VOTRE_API.onrender.com/api`

### ÉTAPE 6 — Mettre à jour FRONTEND_URL dans Render avec l'URL Vercel

---

## 🔑 Connexion
- Email : `abdelaali@tct.ma`
- Mot de passe : `tct2024`

---

## 🗄️ Tables PostgreSQL
```
users · employes · clients · produits · factures · lignes_facture
```

## 🏢 Trans Commerce TAHA sarl
Res.Rif 2, Imm. A7, Appt. 2 – Témara · Tél: 06.61.31.69.57
RC: 96931 · Patente: 27951651 · IF: 3307915 · CNSS: 9541279

*Développé par Abdessamad Ouchaib*
