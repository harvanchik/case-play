# Repository working instructions

## Play builders and future sports

Before changing play-builder code or starting another sport, read:

1. [Living play-builder architecture and parity record](docs/play-builder-architecture.md).
2. [Shared-controller adapter contracts](docs/play-builder-shared-controllers.md).

Flag football is the working behavior and visual reference. Reuse the shared controllers and components; do not fork the football builder, animation editor, or export workflow to create another sport. Put sport-specific rules, geometry, artwork, and tool definitions in adapters. Some existing modules still contain football assumptions: check the architecture inventory before treating them as sport-neutral.

Whenever shared builder code, controllers, components, contracts, shortcuts, or user-facing behavior change, update the living record in the same task:

- Update the relevant inventory, reuse status, and parity requirements.
- Record the date, concrete changes, affected paths, and verification evidence in its running change log.
- Keep implemented behavior separate from planned work and retain known limitations until verified resolved.
- Update the controller-contract guide when an adapter API changes.

These documentation updates are part of the work and do not require a separate request. Use appropriate tests for behavioral changes; documentation-only edits do not need application test reruns. Do not infer authorization to implement basketball or another sport from a shared-code refactor. Follow the user's explicit scope and preserve existing saved flag football documents.
