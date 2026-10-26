# Individual task drafts

Before publication, create one complete draft per task at `<spec-id>/<task-slug>.md` using the [task template](../sdd/templates/task-issue.md). Mark it `not synchronized`.

The task package is the shared spec plus its individual drafts. Groom each draft with `$spec-task-review`, then review cross-task consistency with `$task-package-review-loop`. See the [decomposition guide](../sdd/guides/task-decomposition-guide.md).

After authorized issue publication and read-back reconciliation, replace the published draft body with an issue-link stub and preserve the reviewed snapshot. Full unpublished drafts remain local. No GitHub issue IDs are assigned by draft creation.

## Draft packages

- [Dubbed MVP / frontend package](SPEC-001/README.md) — 35 canonical GitHub task issues, dependency order, foundations, and integration/acceptance gates. Local task files link to their published issues and pinned source contracts.
