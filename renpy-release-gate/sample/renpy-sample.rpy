# dirty.rpy - compiles, runs on your machine, breaks in a player's save.

define config.name = _("Harbour Lights")
define config.version = "1.0"
define config.developer = True
define config.console = True
define config.autoreload = True
define config.image_cache_size = 400

define affection = 0

init python:
    build.name = "HarbourLights"
    build.classify('game/**.txt', None)

image bg harbour = im.Scale("images/bg/harbour.png", 1920, 1080)
image logo = "C:/Users/dev/art/logo.png"

label start:
    scene bg harbour with fade
    play music "audio/theme.ogg" fadein 1.0
    "Welcome back, [ player_name]."
    "{i}Late again, she thought."
    $ affection += 1
    if persistent.seen_ending_a:
        "You have stood on this pier before."
	"The tab on this line is not indentation Ren'Py accepts."
    return
