# Changelog

## 1.0.0 (2026-11-16)


### Features

* add alpha tween to Arrow ([2f4b09e](https://github.com/remarkablegames/gravitate/commit/2f4b09e2fd1cffe2d33dc9755793ee7e221edf88))
* add ambient emitter for dust particles ([33bcb85](https://github.com/remarkablegames/gravitate/commit/33bcb858e03dbc6b4e8df021e844e435ce8a440f))
* add cover ([747b2a6](https://github.com/remarkablegames/gravitate/commit/747b2a66bfc5c125d51cbdb2101e51ac647dc44a))
* add exit so player can go to next level ([f5394f2](https://github.com/remarkablegames/gravitate/commit/f5394f2cef86a428419e8f4650bbd273a151c8e2))
* add level10 ([49eb64b](https://github.com/remarkablegames/gravitate/commit/49eb64b3a368171b30b191503fbfa22b06f968d6))
* add level11 ([636f1c6](https://github.com/remarkablegames/gravitate/commit/636f1c6efec5d26bde9678f623137e8ba13126bd))
* add level12 ([736bd04](https://github.com/remarkablegames/gravitate/commit/736bd04db9b9a3e7ed15c0378e62422417d4e788))
* add level13 ([95cc36d](https://github.com/remarkablegames/gravitate/commit/95cc36d6808092635a008359a24e821489473795))
* add level14 ([e2d51cd](https://github.com/remarkablegames/gravitate/commit/e2d51cd4eb968226c59e2ec1f633e96d27539a26))
* add level2 ([2b4c179](https://github.com/remarkablegames/gravitate/commit/2b4c179f678c2f5399cc176f0dc07c57bf15495e))
* add level3 ([2ba9cd5](https://github.com/remarkablegames/gravitate/commit/2ba9cd5968335ea06d0171bfa899bb300b6c9422))
* add level4 ([fd7b00d](https://github.com/remarkablegames/gravitate/commit/fd7b00d13a9339a399580953ced5248cfe8a515b))
* add level5 ([d4ec000](https://github.com/remarkablegames/gravitate/commit/d4ec00093921e6dea68eefd77f86f19a6c9ccccf))
* add touchscreen tap-to-walk and double-tap-to-jump ([c6e5002](https://github.com/remarkablegames/gravitate/commit/c6e50029a7bac7a02f70f2ad2ed28de87ca17bfc))
* add vignette ([8450a1c](https://github.com/remarkablegames/gravitate/commit/8450a1ca6bd627ff813a401e853624e9f606707b))
* change level 0 ([d0b64f2](https://github.com/remarkablegames/gravitate/commit/d0b64f277c762693061aa93f1d8a26685b5992a9))
* create and render the Spikes layer between Ground and Foreground ([b47b40a](https://github.com/remarkablegames/gravitate/commit/b47b40af19a7facc4d73277622133ba447e32071))
* fade out on exit ([b70d736](https://github.com/remarkablegames/gravitate/commit/b70d73650963c62b5733edf78f5451f83e40acdf))
* insert level2 with spikes ([6f71684](https://github.com/remarkablegames/gravitate/commit/6f71684e8d5fac8d069ceb830e48c4f325a626e0))
* insert level4 ([4142e90](https://github.com/remarkablegames/gravitate/commit/4142e90c6d373cd0a71516157dc933f4cbe3c391))
* insert level4 ([f4ae8e2](https://github.com/remarkablegames/gravitate/commit/f4ae8e27e074b77daf2fa90ea3e1189e1dab66cf))
* insert level4 ([027c97f](https://github.com/remarkablegames/gravitate/commit/027c97f9195e52a0d9e6c3e3d4b1114062b0a80b))
* pass level text to HelpText ([97d793c](https://github.com/remarkablegames/gravitate/commit/97d793c3527377a7dd25587a89f06379aec8edb4))
* play music ([e3a0d9d](https://github.com/remarkablegames/gravitate/commit/e3a0d9d2b4ce49bb3936088338aec16e09f9950a))
* play sounds ([2a26b8a](https://github.com/remarkablegames/gravitate/commit/2a26b8a877eccb5f4a14f2d910f14e26eb833e3c))
* **public:** use cover.png for `og:image` ([319f9f5](https://github.com/remarkablegames/gravitate/commit/319f9f50b542c2be0427224293e5e38de5401c1c))
* reverse gravity when player touches arrow ([136da9e](https://github.com/remarkablegames/gravitate/commit/136da9e6cc751df29ca61bc308be290ddcec3ee3))
* **scenes:** render Cover small at 630x500 ([09adf17](https://github.com/remarkablegames/gravitate/commit/09adf175278e496fe1006f4a97ad5100297abc6d))
* **sprites:** emit dust particles during player jump/land ([ebf8286](https://github.com/remarkablegames/gravitate/commit/ebf8286ed9d997bb11bee841097c0318b5c751f5))
* **sprites:** fade out Player when it reaches exit ([767cd7e](https://github.com/remarkablegames/gravitate/commit/767cd7e3577327b247df60b146e30f747526f074))
* **sprites:** squash the Player on land ([fa72aaa](https://github.com/remarkablegames/gravitate/commit/fa72aaa657e3e4dbaa9789aaccc316d15257bef2))
* **sprites:** tint Player white when killed ([e7efbeb](https://github.com/remarkablegames/gravitate/commit/e7efbebb5b31a0f544fa28d4ced37a09bae17111))
* **sprites:** tween Player gravity direction shift ([e716680](https://github.com/remarkablegames/gravitate/commit/e7166808cc419f622754c9b91fdf72daa2abcd06))


### Bug Fixes

* correct Exit collision box when rotated ([6812e82](https://github.com/remarkablegames/gravitate/commit/6812e82f9169829a05a6a7a51e87436e5d57974f))
* correct player orientation and movement for gravity left/right ([2b5e059](https://github.com/remarkablegames/gravitate/commit/2b5e059784abc6cd01b42b04055c178b0f7809ec))
* exclude Marker from uiCamera to avoid double rendering ([be3d6c4](https://github.com/remarkablegames/gravitate/commit/be3d6c4ee6a11e09047c9cbdbccbfdfb3be12199))
* kill player when it's out of bounds ([24accc6](https://github.com/remarkablegames/gravitate/commit/24accc6b16ff5170e1bf69dc18d224db54ae79ff))
* set gravity direction to down on level start ([14450cf](https://github.com/remarkablegames/gravitate/commit/14450cf465de495ae4d76a9e8db62ede1140b9b7))
* **sprite:** have Player face the right direction for left/right gravity ([84119e5](https://github.com/remarkablegames/gravitate/commit/84119e5a2a904120553f1d170ec6cc4364a80cd9))
* **sprites:** correct Arrow body size and hitbox when horizontal ([995de4b](https://github.com/remarkablegames/gravitate/commit/995de4bfed392571cb70eab79b9c08b3eb1002f6))
* **sprites:** stop Player on marker and prevent momentum overshoot ([4b5c6fb](https://github.com/remarkablegames/gravitate/commit/4b5c6fbc493f2687945a96e921c007f183ef0bb1))
* **sprites:** walk along correct axis for left/right gravity ([ec7bdbf](https://github.com/remarkablegames/gravitate/commit/ec7bdbf9cf5ba1efefe4970d621046a93e90e0b8))
* tighten Player collision box ([3c7c364](https://github.com/remarkablegames/gravitate/commit/3c7c364b62d2ed02f837121d7c5c7ed339aa2f65))
* update collision box for rotated tile ([6089fbd](https://github.com/remarkablegames/gravitate/commit/6089fbdb07f0a04f4e81d1c89d47dcbff1e16b00))
* update tile collision box ([69ddf81](https://github.com/remarkablegames/gravitate/commit/69ddf81bc5bebe0bbcd0e1627986178ec6cd8ce3))


### Performance Improvements

* load initial level and prefetch next level's tilemap ([b498def](https://github.com/remarkablegames/gravitate/commit/b498defd27109a78fc53e79d1d4f0bd53dce5498))
* load music in the background so level start is no longer blocked ([d49271f](https://github.com/remarkablegames/gravitate/commit/d49271fadc4377b79e59adcfc02e3cf41c749be5))
* make next tilemap prefetch async ([a079563](https://github.com/remarkablegames/gravitate/commit/a079563aa4e3a4f992bf57028db44a2eea74f133))
