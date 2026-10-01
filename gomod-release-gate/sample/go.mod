module github.com/acme/ratelimit

go 1.24

toolchain go1.23.4

require (
	github.com/google/go-github v45.2.0
	github.com/acme/queue/v3 v2.4.0
	golang.org/x/sync v0.10.0
)

replace github.com/acme/shared => ../shared

retract v2.0.1 // published before the /v2 move
