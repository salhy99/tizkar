# TIZKAR Production Release Checklist

## Code-Only Release
- [ ] Working tree clean (`git status`)
- [ ] Diff reviewed (`git diff <PRODUCTION_SHA>..<RELEASE_SHA>`)
- [ ] Quality Gates passed (lint, typecheck, test, build, e2e)
- [ ] Rollback SHA recorded

## Migration Release (Mandatory before Production DB migration)
- [ ] exact Production target verified
- [ ] fresh DB backup completed
- [ ] backup checksum verified
- [ ] migration inventory reviewed
- [ ] rollback SHA recorded
- [ ] Smoke tested in Dev
