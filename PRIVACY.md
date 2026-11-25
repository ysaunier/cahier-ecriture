# Confidentialité

*Dernière mise à jour : 25 novembre 2026*

Cahier d'écriture est conçu pour être utilisé avec des enfants : il ne recueille **aucun renseignement personnel**. Cette page explique ce que l'application fait, et ne fait pas, avec tes données.

## En bref

- Aucun compte, aucune inscription.
- Aucune statistique d'utilisation, aucun traceur, aucune publicité.
- Tout ce que tu saisis reste sur ton ordinateur.
- Une seule connexion à Internet : la vérification des mises à jour, que tu peux désactiver.

## Ce qui reste sur ton ordinateur

| Donnée | Où | Pourquoi |
| --- | --- | --- |
| Mots et phrases saisis, réglages des exercices, préférences | dossier de l'application sur ton ordinateur | retrouver tes feuilles à la prochaine ouverture |
| Taille et position de la fenêtre | même dossier (`fenetre.json`) | rouvrir la fenêtre au même endroit |
| PDF enregistrés, fichiers de réglages exportés | là où tu choisis de les enregistrer | ils t'appartiennent, l'application ne les envoie nulle part |

Le dossier de l'application est `%APPDATA%\Cahier d'écriture` sous Windows et `~/Library/Application Support/Cahier d'écriture` sous macOS. Pour effacer tes mots et tes réglages : **Préférences › Rétablir les réglages d'origine**. Pour tout effacer, supprime ce dossier.

Si tu écris le prénom d'un enfant sur une feuille, il reste sur ton ordinateur et sur le papier imprimé. Il n'est jamais transmis.

## La seule connexion à Internet : les mises à jour

Au démarrage, l'application demande à GitHub quel est le numéro de la dernière version publiée (`api.github.com`). Cette requête ne contient **aucune donnée personnelle** : ni réglages, ni mots saisis, ni identifiant. Comme pour toute visite d'un site web, GitHub voit l'adresse IP de la connexion ; voir la [déclaration de confidentialité de GitHub](https://docs.github.com/fr/site-policy/privacy-policies/github-general-privacy-statement).

Pour la désactiver : **Préférences › Mises à jour**, décocher « Me prévenir au démarrage… ».

## Liens qui ouvrent ton navigateur ou ton courriel

Ces actions ne se font que si tu cliques, et rien n'est envoyé sans ton accord :

- **Signaler un problème** et **Proposer une idée** ouvrent un formulaire GitHub dans ton navigateur. Le numéro de version et le système (ex. « Windows 10.0.26300 (x64) ») sont préremplis ; tu vois et modifies tout avant d'envoyer. Les formulaires GitHub sont **publics** : n'y mets jamais le nom d'un enfant, d'une école ou une adresse.
- **Nous écrire** ouvre ton logiciel de courriel avec un message prérempli (version et système), que tu envoies toi-même.
- **Télécharger** (nouvelle version) et **Page du projet** ouvrent GitHub dans ton navigateur.

## Enfants et milieu scolaire

L'application n'a pas besoin de connaître l'enfant : pas de profil, pas de suivi des résultats. Elle peut donc être utilisée en classe ou à la maison sans communiquer de renseignements personnels, dans l'esprit de la Loi 25 au Québec et du RGPD en Europe. Les feuilles imprimées et les PDF sont sous la responsabilité de l'adulte qui les produit.

## Questions

Pour toute question sur la confidentialité : [contact@ysaunier.dev](mailto:contact@ysaunier.dev).

Si une future version change quoi que ce soit à ce qui précède, cette page sera mise à jour et le changement sera indiqué dans les [Nouveautés](CHANGELOG.md).
