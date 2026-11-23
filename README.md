# section-blocks

Page block definitions shared by the Alo Driving School admin (validation and page builder) and the public site (rendering).

- `src/index.ts`: every block type, its fields and limits, and the validation rules.
- `src/site.ts`: site-wide settings shared by the apps.

Change a block here, in one place. Both apps read this package; neither keeps its own copy of the field list.

The apps install this package from GitHub (`git+ssh://git@github.com/kuntal-gupta/section-blocks.git#main`). After pushing a change here, run `npm update @section/blocks` in each app to pick it up.
