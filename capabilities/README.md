# Factory Capability Catalog

This directory is the production-facing catalog of reusable factory capabilities.

A capability is not just an idea. It is a feature, page experience, integration, or vertical that has:

- a documented source or business reason,
- a local policy decision,
- a factory registry/generator/gate path,
- required quality gates,
- a stable specs key that themes can request.

Themes must request capabilities through `specs/<theme>.specs.json`. The factory then validates the request through:

```text
specs -> capability catalog -> registry gate -> production gates -> deliver
```

Production themes may only require capabilities with `implemented` or `certified` status. Integrations with `requires-contract` status may stay in specs as optional placeholders, but they cannot be marked `required: true` until the client contract and implementation evidence are present.

Run:

```bash
node factory.js capabilities list
node factory.js capabilities new scent-quiz --type=home-experience
node factory.js capabilities gate luxury-fragrance
node factory.js certify luxury-fragrance --relaxed-docs
```
