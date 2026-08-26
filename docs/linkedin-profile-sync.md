# LinkedIn profile snapshot and drift workflow

`src/data/linkedin-profile.json` is a human-reviewed handoff file for LinkedIn work. It is intentionally not connected to LinkedIn APIs.

## Structure

- `desired` contains the approved target copy and structured profile fields.
- `observed` records the last manually inspected LinkedIn state.
- `drift` lists the remaining actions, ordered by priority.
- `approvalRequiredBeforeWrite` reminds an agent that profile changes must not be saved without Vansh's explicit approval.

## Using it

1. Update the portfolio JSON files first.
2. Refresh `desired` from those facts and keep the wording appropriate for LinkedIn.
3. Inspect LinkedIn and update `observed.capturedAt` plus the observed fields.
4. Run `npm run linkedin:diff`.
5. Complete one drift item at a time. Set its status to `done` only after the saved LinkedIn profile has been verified.

The drift command exits with status 1 while actions remain. This makes staleness visible without attempting to automate LinkedIn itself.
