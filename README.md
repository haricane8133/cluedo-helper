# Cluedo Helper

A static React web app for tracking a live game of Cluedo and narrowing the case using deduction, proof history, and turn-by-turn reasoning.

## Features

- Setup flow for detective order, hand sizes, and your own cards
- Deduction board with card ownership, suspect view, and detective knowledge
- Audit timeline with restore-to-state support
- Manual correction tools for recovering from input mistakes
- Local persistence so a game can be resumed later
- PWA support for installable offline-friendly play

## Screenshots

- `[Home screen screenshot here]`
- `[Game board screenshot here]`
- `[Detective view screenshot here]`
- `[Solved warrant / suspect view screenshot here]`

## Local development

```bash
npm install
npm run dev
```

Useful commands:

```bash
npm run build
npm run test:engine
```

## GitHub Pages deployment

This repository is configured for deployment at:

`https://haricane8133.github.io/cluedo-helper`

One-time setup:

1. Push the repository to GitHub.
2. In GitHub, open `Settings -> Pages`.
3. Under `Build and deployment`, choose `Source: Deploy from a branch`.
4. Select the `gh-pages` branch and `/ (root)` folder.
5. Save the settings.

Deploy:

```bash
npm run deploy
```

That command builds the app and publishes the `dist/` output to the `gh-pages` branch.

## Tech

- React 18
- TypeScript
- Webpack
- React Router

## Author

[Hari Rajesh](https://www.linkedin.com/in/haricane8133/)
