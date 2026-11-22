| CLI | Model | Shell only | With tui-use | Median turns (shell / tui-use) | Median tokens (shell / tui-use) | Median wall time s (shell / tui-use) |
|---|---|---|---|---|---|---|
| claude-code | claude-opus-5-5 | 100% | 100% | 10 / 11 | 267341 / 257340 | 44 / 32 |
| claude-code | claude-haiku-5-5 | 53% | 100% | 13 / 16 | 358654 / 382861 | 80 / 32 |

| Category | Shell only | With tui-use |
|---|---|---|
| repls | 100% | 100% |
| prompts | 50% | 100% |
| remote | 92% | 100% |
| pickers | 50% | 100% |

60 runs over 5 tasks, 3 repeats per cell. Medians cover all runs, passed or failed.
