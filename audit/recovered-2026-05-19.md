# Recovered norms 2026-05-19

5 norms were skipped during initial migration because their `fechaPublicacion` was stored as JS Date object (gray-matter auto-parsed) instead of ISO string. The migration script's `normalizeDate` only accepted strings.

Fix: extended `normalizeDate` in `apps/cli/src/scripts/migrate-national.ts` to accept Date instances.

Recovered:
- DS-021-2019-JUS (TUO Transparencia y Acceso a la Información Pública, 2019-12-11)
- DS-163-2020-PCM (TUO Licencia de Funcionamiento, 2020-10-03)
- LEY-26487-1995 (Ley Orgánica ONPE, 1995-06-21)
- LEY-30077-2013 (Ley contra el Crimen Organizado, 2013-08-20)
- LEY-30714-2017 (Régimen Disciplinario PNP, 2017-12-30)

Bootstrap commits: c.f. `git log --author=Crafternauta -- pe/DS-021-2019-JUS.md` (etc) in the corpus repo.
