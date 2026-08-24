# Components Structure

Use these folders as the default rule when adding new UI:

- `layout/`: app chrome and navigation shared by the whole site.
- `page/`: page-level shells or sections that multiple routes can reuse.
- `features/`: domain-specific UI grouped by feature area such as `org`, `auth`, or `payout`.

Guidelines:

- Put something in `base/` only when it is truly design-system level and not tied to one feature.
- Prefer `features/<domain>/` over `page/` when a component is reused across multiple routes but still belongs to one business area.
- Start specific, then promote upward only after real reuse appears.
