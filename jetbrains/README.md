# ReadyStack Themes for IntelliJ-based IDEs

The same contrast ladder as the VS Code themes in this repository, ported to the
IntelliJ platform. Works in IntelliJ IDEA, PyCharm, WebStorm, PhpStorm, GoLand,
Rider, CLion, RubyMine, DataGrip and Android Studio.

## What is in here

```
readystack-warm-dark/
  META-INF/plugin.xml                       plugin descriptor (themeProvider)
  themes/readystack-warm-dark.theme.json    UI colours (15 component groups)
  themes/readystack-warm-dark.xml           editor colour scheme (66 attributes)
```

## Contrast

Body text passes WCAG AAA (7:1) and every accent colour passes AA (4.5:1) against
the editor background. The ratios are measured with a contrast checker, not chosen
by eye. Comments are the one element that deliberately recedes.

## Build

There is nothing to compile — an IntelliJ theme is resources only. To package:

```
cd readystack-warm-dark
zip -r ../readystack-warm-dark.jar META-INF themes
mkdir -p out/readystack-warm-dark/lib
mv ../readystack-warm-dark.jar out/readystack-warm-dark/lib/
cd out && zip -r ../readystack-warm-dark.zip readystack-warm-dark
```

The zip is what JetBrains Marketplace accepts.

## Licence

MIT. Use them at work, ship them in your dotfiles, fork them for your team.
