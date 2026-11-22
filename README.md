# section-blocks

Page block definitions shared by the Alo Driving School admin (validation and page builder) and the public site (rendering).

- `src/index.ts`: every block type, its fields and limits, and the validation rules.
- `src/site.ts`: site-wide settings shared by the apps.

Change a block here, in one place. Both apps read this package; neither keeps its own copy of the field list.

The apps link to this folder with `file:../alo-blocks`, so keep the two projects side by side.
