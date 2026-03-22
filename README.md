# Cluedo Helper

A Sherlock themed static PWA React web app for tracking and solving a live game of Cluedo and narrowing the case using deduction, proof history, and turn-by-turn reasoning.

Use this instead of a notepad to WIN ALL THE TIME!

> Note: I created this project several years ago as a phone app with Native Script and Angular, when I was not a [Git Wiz](https://medium.com/@hari.r.nallan/scm-and-the-quest-for-perfect-history-ee9f72d8d641). Now, I used AI to ressurect this old app into a React based webpage with some new features.

## Features

- Setup flow for detective order, hand sizes, and your own cards
- Deduction board with card ownership, suspect view, and detective knowledge
- Audit timeline with restore-to-state support
- Manual correction tools for recovering from input mistakes
- Local persistence so a game can be resumed later
- PWA support for installable offline-friendly play

## Screenshots

![Homepage](/screenshots/1-homepage.png)
![Detective View](/screenshots/6-detectiveview.png)

Check more screenshots [here](/screenshots/README.md)

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

Deploy:

```bash
npm run deploy
```

That command builds the app and publishes the `dist/` output to the `gh-pages` branch.


## Author

[Hari Rajesh](https://www.linkedin.com/in/haricane8133/)
