# CTRL Budget

Application web de suivi budgétaire personnel : charges fixes, crédits, abonnements, entrées d'argent, dépenses du quotidien et reste à vivre calculé en direct.

Stack volontairement simple, sans étape de build : HTML, CSS et JavaScript natif côté navigateur, Supabase pour l'authentification et la base de données, Vercel pour l'hébergement.

---

## 1. Ce que contient le dossier

```
ctrl-budget/
├── index.html              page vitrine publique
├── connexion.html          connexion, inscription, mot de passe oublié
├── onboarding.html         mise en route en 4 étapes
├── app.html                l'application (tableau de bord, charges, dépenses, crédits, réglages)
├── mentions-legales.html
├── confidentialite.html    politique RGPD
├── vercel.json             en-têtes de sécurité
├── robots.txt
├── supabase/schema.sql     tables, contraintes, RLS, suppression de compte
└── assets/
    ├── css/styles.css
    ├── img/                logo, icônes, favicon
    └── js/
        ├── config.js       ⚠️ les 2 valeurs à remplacer
        ├── supabase.js     client et session
        ├── helpers.js      calculs, classement automatique, export
        ├── charts.js       graphiques SVG
        ├── ui.js           toasts, modales, retour en haut
        ├── connexion.js
        ├── onboarding.js
        └── app.js
```

---

## 2. Créer la base Supabase

1. Aller sur supabase.com, se connecter, cliquer sur **New project**.
2. Nom : `ctrl-budget`. **Région : Frankfurt (eu-central-1) ou Paris**, pour rester dans l'Union européenne.
3. Choisir un mot de passe de base de données long et le ranger dans un gestionnaire de mots de passe. Il ne sert jamais dans le code.
4. Une fois le projet créé, ouvrir **SQL Editor > New query**, coller tout le contenu de `supabase/schema.sql`, puis **Run**. Le message « Success » confirme la création des tables et des règles de sécurité.
5. Ouvrir **Table Editor** et vérifier la présence de quatre tables : `profiles`, `revenus`, `charges`, `depenses`, chacune avec le cadenas « RLS enabled ».

### Réglages d'authentification à faire une fois

Dans **Authentication > Sign In / Providers > Email** :

- Laisser **Confirm email** activé, l'utilisateur valide son adresse avant d'accéder au budget.
- **Minimum password length** : mettre `10`.
- Activer **Prevent use of leaked passwords** si l'option est disponible sur votre offre.

Dans **Authentication > URL Configuration** :

- **Site URL** : l'adresse de votre site en production, par exemple `https://ctrl-budget.vercel.app`.
- **Redirect URLs** : ajouter `https://ctrl-budget.vercel.app/app.html`, `https://ctrl-budget.vercel.app/connexion.html` et, pour vos tests, `http://localhost:8000/app.html` et `http://localhost:8000/connexion.html`.

---

## 3. Brancher le site sur votre projet

Ouvrir `assets/js/config.js` et remplacer les deux valeurs par celles de **Project Settings > API** :

```js
export const SUPABASE_URL = 'https://xxxxxxxx.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOi...';
```

Trois règles à retenir :

- La clé **anon public** est faite pour être visible dans le navigateur. Seule la RLS protège les données, et elle est déjà en place grâce au script SQL.
- La clé **service_role** ne doit jamais être collée ici, ni ailleurs dans le dépôt. Elle contourne toutes les règles de sécurité.
- Les mots de passe des utilisateurs ne passent jamais par ce fichier. Supabase les hache sur son serveur, personne ne peut les lire, pas même vous.

---

## 4. Tester en local

Les fichiers utilisent des modules JavaScript, ils ne fonctionnent pas en double-cliquant sur `index.html`. Il faut un petit serveur local. Dans le dossier du projet :

```bash
python3 -m http.server 8000
```

Puis ouvrir `http://localhost:8000`. Créer un compte de test, faire l'onboarding, ajouter deux dépenses, vérifier que le reste à vivre bouge.

---

## 5. Mettre le code sur GitHub

Option simple, sans ligne de commande :

1. Sur github.com, cliquer **New repository**, nom `ctrl-budget`, visibilité **Private** au début.
2. Sur la page du dépôt vide, cliquer **uploading an existing file** et glisser tout le contenu du dossier, en conservant les sous-dossiers.
3. Cliquer **Commit changes**.

Option ligne de commande :

```bash
cd ctrl-budget
git init
git add .
git commit -m "Première version de CTRL Budget"
git branch -M main
git remote add origin https://github.com/VOTRE-COMPTE/ctrl-budget.git
git push -u origin main
```

---

## 6. Déployer sur Vercel

1. Aller sur vercel.com, se connecter avec GitHub.
2. **Add New > Project**, choisir le dépôt `ctrl-budget`, cliquer **Import**.
3. Framework Preset : **Other**. Laisser les champs Build Command et Output Directory vides, il n'y a rien à compiler.
4. Cliquer **Deploy**. Au bout d'une minute, l'adresse `https://ctrl-budget-xxxx.vercel.app` est en ligne.
5. Revenir dans Supabase, **Authentication > URL Configuration**, et remplacer les adresses de test par cette adresse réelle. Sans cette étape, les liens de confirmation d'e-mail renvoient au mauvais endroit.
6. Tester le parcours complet depuis un téléphone : inscription, e-mail de confirmation, onboarding, ajout d'une dépense.

Chaque `git push` suivant redéploie automatiquement le site.

### Nom de domaine personnalisé

Dans Vercel : **Settings > Domains > Add**. Entrer par exemple `ctrlbudget.fr`, puis suivre les instructions pour pointer les enregistrements DNS chez votre registrar. Le certificat HTTPS est créé automatiquement. Pensez ensuite à remettre à jour la Site URL dans Supabase.

---

## 7. Avant d'ouvrir au public

- [ ] Compléter les champs « à compléter » de `mentions-legales.html` : identité, statut, e-mail de contact.
- [ ] Compléter la date de mise à jour dans `confidentialite.html`.
- [ ] Vérifier que le dépôt GitHub ne contient aucune clé `service_role`.
- [ ] Vérifier dans Supabase que les quatre tables affichent bien « RLS enabled ».
- [ ] Créer deux comptes de test et vérifier que le compte A ne voit rien du compte B.
- [ ] Tester le bouton « Supprimer mon compte » avec un compte jetable.
- [ ] Vérifier l'affichage sur un écran de téléphone et sur un grand écran.

---

## 8. Sécurité mise en place

| Risque | Mesure |
| --- | --- |
| Vol de mots de passe | Hachage bcrypt côté Supabase, minimum 10 caractères, blocage des mots de passe trop courants, aucun mot de passe dans le code |
| Accès aux données d'un autre utilisateur | Row Level Security sur les quatre tables, filtrage par `auth.uid()` |
| Injection de code dans l'interface (XSS) | Échappement systématique de toute valeur saisie avant affichage, Content Security Policy sans script en ligne |
| Injection SQL | Requêtes paramétrées via l'API Supabase, contraintes `check` sur les colonnes |
| Site affiché dans un cadre frauduleux (clickjacking) | `X-Frame-Options: DENY` et `frame-ancestors 'none'` |
| Interception réseau | HTTPS forcé, `Strict-Transport-Security` sur deux ans |
| Injection de formule dans un export CSV | Préfixe de protection sur les valeurs sensibles |
| Force brute sur la connexion | Limitation de débit native de Supabase Auth |
| Non-conformité RGPD | Consentement à l'inscription, information claire, export et suppression en autonomie, hébergement UE |

---

## 9. Faire évoluer le projet

Pistes déjà compatibles avec la structure actuelle :

- Charges partagées entre deux personnes du foyer, avec une table `foyers`.
- Enveloppes budgétaires par catégorie, avec un plafond mensuel et une alerte à 80 %.
- Import d'un relevé bancaire au format CSV pour éviter la saisie manuelle.
- Rappel par e-mail deux jours avant les gros prélèvements, avec une fonction planifiée Supabase.
- Version installable sur mobile (PWA) avec un fichier `manifest.json` et un service worker.
