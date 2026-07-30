# GitHub workflow

## Pull requests

Use short-lived branches and one coherent outcome per pull request. The
repository template asks for:

- problem and approach
- scope and non-goals
- exact local and CI validation
- local AI-review status
- manual evidence
- review state
- limitations and follow-up

Local CodeRabbit remains optional. The repository does not install or
authenticate it. Remote CodeRabbit may be enabled separately without making it
deterministic validation.

## Actions

`.github/workflows/validate.yml` runs:

- canonical repository validation on Ubuntu
- complete validation in Ubuntu, Debian, and Fedora containers
- pull-request dependency review

Actions use read-only repository contents permission, pinned third-party action
commits, timeouts, and stale-run cancellation.

The dependency-review action may require additional GitHub security features
for a private repository. Verify it succeeds before making it a required check.

## Branch protection

Configure protection only after the first workflow run establishes the exact
check names.

Recommended initial settings:

- require a pull request before merging
- require `Repository validation`
- require each stable distribution check
- require current checks on the latest commit
- require resolved conversations when review threads are used
- keep merge manual

Require `Dependency review` only when it is supported by the repository's
GitHub plan and has completed successfully.

GitHub settings are external state. Record any deviation here and do not change
them implicitly through installation.
