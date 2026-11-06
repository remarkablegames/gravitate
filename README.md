<p align="center">
  <img src="public/logo192.png" alt="Gravitate">
</p>

# Gravitate

[![release](https://img.shields.io/github/v/release/remarkablegames/gravitate)](https://github.com/remarkablegames/gravitate/releases)
[![build](https://github.com/remarkablegames/gravitate/actions/workflows/build.yml/badge.svg)](https://github.com/remarkablegames/gravitate/actions/workflows/build.yml)

<kbd>gravitate</kbd> is a template for making [Phaser](https://phaser.io/) platformer games. The template is inspired by [`phaser-3-tilemap-blog-posts`](https://github.com/mikewesthad/phaser-3-tilemap-blog-posts/tree/master/examples/post-2) (read the [Medium story](https://itnext.io/3d68e73d494a)).

Play in your browser:

- [remarkablegames](https://remarkablegames.org/gravitate/)

Or download for desktop:

- [Windows](https://github.com/remarkablegames/gravitate/releases/latest/download/windows.zip)
- [macOS](https://github.com/remarkablegames/gravitate/releases/latest/download/macos.zip)
- [Linux](https://github.com/remarkablegames/gravitate/releases/latest/download/linux.zip)

## Prerequisites

[nvm](https://github.com/nvm-sh/nvm#installing-and-updating):

```sh
brew install nvm
```

## Install

Clone the repository:

```sh
git clone https://github.com/remarkablegames/gravitate.git
cd gravitate
```

Install the dependencies:

```sh
npm install
```

Rename the game:

```sh
git grep -l gravitate | xargs sed -i '' -e 's/gravitate/my-game/g'
```

```sh
git grep -l 'Gravitate' | xargs sed -i '' -e 's/Gravitate/My Game/g'
```

Update the files:

- [ ] `README.md`
- [ ] `index.html`
- [ ] `package.json`
- [ ] `public/*.png`
- [ ] `public/favicon.svg`
- [ ] `public/manifest.webmanifest`
- [ ] `src/main.ts`

## Environment Variables

Update the environment variables:

```sh
cp .env .env.local
```

Update the **Secrets** in the repository **Settings**.

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the game in the development mode.

Open [http://localhost:5173](http://localhost:5173) to view it in the browser.

The page will reload if you make edits.

You will also see any errors in the console.

### `npm run build`

Builds the game for production to the `dist` folder.

It correctly bundles in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.

Your game is ready to be deployed!

### `npm run bundle`

Builds the game and compresses the contents into a ZIP archive in the `dist` folder.

Your game can be uploaded to your server, [itch.io](https://itch.io/), etc.

## License

[MIT](LICENSE)
