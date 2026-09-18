# GNU Global C/C++ .vscode Config Pack

![GNU Global C/C++ .vscode Config Pack](https://getreadystack.com/img/promo/sku11459_result_card.jpg)

There is no error message. That is the whole problem.

`"editor.defaultFormatter": "prettier"` is valid JSON and a real key. But an extension id is
always `publisher.extension`, with a dot, so this can never match an installed extension.
Format-on-save runs, finds no formatter, returns, and tells you nothing. Six months later the
team has decided format-on-save is unreliable and switched it off.

This pack carries **21 rules** that read the *values* in a shared `.vscode` folder, not the shape
of the file - the shape is always fine. Each finding comes back with its line number.

| the line it loads and ignores | the line that works |
| --- | --- |
| `"cwd": "${workspaceRoot}/build"` | `"cwd": "${workspaceFolder}/build"` |
| `"editor.defaultFormatter": "prettier"` | `"editor.defaultFormatter": "esbenp.prettier-vscode"` |
| `"intelliSenseMode": "gcc-x64"` | `"intelliSenseMode": "linux-gcc-x64"` |
| `"console": "internalConsole"` | `"console": "integratedTerminal"` |
| `"clangPath": "~/llvm/bin/clang"` | `"clangPath": "${userHome}/llvm/bin/clang"` |

Sixteen more, including a committed `ghp_` token, a C++ standard placed in `cStandard`,
`tasks.json` still on schema `0.1.0`, and a `workbench.colorTheme` forced on everyone who opens
the repository.

## Free, with no key and nothing held back

- All **21 rules** on the config file you have open, every finding with its line
- All **45 snippets**, across nine groups: gtags tasks, `c_cpp_properties`, gist workspaces,
  formatter save-actions, Dark+ overrides, Tailwind, ASP.NET Core launch profiles,
  MicroProfile Java and keybindings
- The full contents printed by name, so you can read the pack before you rely on it

One file is finished, completely. No watermark, no trial, no counter.

## With a licence - $29 once

The answer is never withheld. What a licence adds is the *next* file, and the forty after it.

- **Audit every config file in the repository** - the same 21 rules across the whole workspace,
  honouring your `max_files` and `exclude_glob` settings
- **Write the findings to a file** - CSV, JSON or HTML, written into your workspace folder
- **Your team's own rules** - your `extraRules` are checked alongside the built-in 21

7-day full refund. Get a licence: https://buy.polar.sh/polar_cl_Ge5u327gSZxIxtXPvdIVqBgdNtoieIuKZKWfV1LjjLp

## Install

```
ext install gnu-global-cpp-vscode-config-pack
```
