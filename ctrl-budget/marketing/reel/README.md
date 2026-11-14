# Reel CTRL Budget, 90 secondes

`ctrl-budget-reel-90s.mp4` : 1080 × 1920, 30 i/s, H.264 + AAC, son normalisé à −14 LUFS (Instagram Reels, TikTok, YouTube Shorts).

## Déroulé

| Temps | Séquence | Ce qu'on voit |
| --- | --- | --- |
| 0–4 s | Accroche | « Tu sais ce que tu gagnes. Mais tu sais ce qu'il te RESTE ? », le drop de la musique tombe à 2 s |
| 4–8 s | Problème → solution | Tableur, connexion bancaire, découvert barrés, puis révélation du logo |
| 8–18 s | Inscription | E-mail, mot de passe, prénom, consentement RGPD, compte créé. Badges : mot de passe chiffré, données en UE, aucun accès bancaire |
| 18–24 s | Onboarding, étape 1 | Bienvenue, import d'un PDF : 10 lignes importées |
| 24–31 s | Entrées d'argent | Salaire 2 100 €, prime 150 € |
| 31–44 s | Charges fixes | « Netflix » → Abonnement, « Prêt voiture » → Crédit avec date de fin, liste complète classée |
| 44–51 s | Récap | Reste à vivre 889,99 €, soit 29,67 € par jour (zoom caméra) |
| 51–64 s | Tableau de bord | Ajout d'une dépense « Courses 42,50 € », le reste passe de 477,69 € à 435,19 €, l'alerte de rythme s'affiche (zoom caméra) |
| 64–72 s | Graphiques | Courbe cumulée novembre / octobre, répartition, prochains prélèvements |
| 72–78 s | Crédits | Taux d'endettement 12,5 %, + 281,02 € / mois libérés en juillet 2029 |
| 78–82 s | Épargne et alertes | 3 450 €, objectif atteint, notifications |
| 82–86 s | Bonus | 3 langues, 140 devises, export CSV, RGPD |
| 86–90 s | Appel à l'action | « Reprends le contrôle ce mois-ci », lien en bio |

Tous les chiffres sont cohérents entre eux (entrées 2 250 €, charges 1 360,01 €, etc.). Les écrans reprennent les textes réels de l'application (`assets/js/i18n.js`).

## Crédits audio (à reprendre dans la description du post)

- Musique : **« Upbeat Corporate » de Soundrider/Dope**, licence [CC BY](https://creativecommons.org/licenses/by/3.0/), trouvée via Openverse, hébergée sur Jamendo. La licence CC BY **oblige à créditer l'auteur**.
- Bruitages : générés par synthèse (`scripts/audio.py`), sans licence tierce.

## Texte de publication proposé

> Tu sais ce que tu gagnes… mais tu sais ce qu'il te RESTE ? 👀
> CTRL Budget calcule ton reste à vivre en direct : charges fixes, crédits, abonnements, dépenses du quotidien. Sans tableur, sans connecter ta banque.
> ✅ Gratuit ✅ Données hébergées en UE ✅ 3 minutes de mise en route
> 👉 Lien en bio
>
> 🎵 « Upbeat Corporate » par Soundrider/Dope (CC BY), via Openverse
>
> #budget #financespersonnelles #argent #épargne #resteàvivre #gestionbudget #astuceargent #finance

## Modifier la vidéo

1. Ouvrir `reel.html` dans un navigateur et appeler `frame(t)` dans la console pour voir l'image à la seconde `t`. Les textes et les horaires sont dans les attributs `data-in`, `data-out`, `data-tt`, `data-count`.
2. Rendu des images : `node scripts/render.js $PWD/reel.html <dossier>`, ce qui produit `part0..3.mp4` et `sfx.json`, la liste des bruitages calée sur l'image.
3. Son : télécharger la musique dans `<dossier>/dl/music1.mp3`, puis `python3 scripts/audio.py <dossier-parent>`, puis assembler avec ffmpeg (concaténation des parties, `loudnorm=I=-14`).
