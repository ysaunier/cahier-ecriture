# Sécurité

## Versions suivies

Seule la **dernière version** publiée sur la [page des Releases](https://github.com/ysaunier/cahier-ecriture/releases/latest) reçoit des correctifs. L'application prévient au démarrage quand une nouvelle version est disponible.

## Signaler une faille

**Ne la signale pas dans une issue publique.** Écris plutôt à [contact@ysaunier.dev](mailto:contact@ysaunier.dev) avec :

- la version de l'application et le système (Aide › À propos) ;
- une description du problème et, si possible, les étapes pour le reproduire ;
- l'impact que tu envisages.

Tu recevras une réponse dans les meilleurs délais. Ce projet est maintenu bénévolement : il n'y a pas de programme de récompense. Une fois le correctif publié, tu peux être remercié dans les Nouveautés si tu le souhaites.

## Ce qu'il faut savoir

- **Télécharge l'application uniquement depuis la page des Releases** de ce dépôt. Les fichiers y sont construits automatiquement par GitHub Actions à partir du code public.
- L'application **n'est pas signée** (ni certificat Windows, ni notarisation Apple) : SmartScreen et Gatekeeper affichent un avertissement au premier lancement. C'est attendu ; la marche à suivre est dans le [README](README.md#télécharger).
- La fenêtre n'a pas accès au système : isolation du contexte, bac à sable Chromium, Node.js désactivé dans la page, politique de sécurité du contenu (CSP) stricte. Les liens externes s'ouvrent dans le navigateur, et l'application n'ouvre que des adresses fixées dans son code.
- La seule connexion réseau est la vérification des mises à jour (voir [PRIVACY.md](PRIVACY.md)). Rien n'est téléchargé ni installé automatiquement.
