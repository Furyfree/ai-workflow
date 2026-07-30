# Forgejo pull-request workflow

Planning input for after a local Forgejo instance and representative repository
exist. `ROADMAP.md` owns sequence and status.

## Confirmed boundaries

- OpenAI currently documents hosted Codex pull-request review for GitHub, not
  Forgejo. Local Codex review remains available for any checked-out Git
  repository through `/review` or `codex review --base <branch>`.
- The `forgejo forgejo-cli` command is server-side administration tooling and
  does not currently provide a general user pull-request client.
- `tea` is Gitea's user-facing CLI and supports pull-request checkout, review,
  comments, approval, rejection, and merge. Treat compatibility with the
  installed Forgejo version as something to prove, not assume.
- Forgejo exposes a versioned REST API and OpenAPI document. Use the API for
  missing `tea` behavior, especially reliable inline comments or automation.
- A repository-specific token can be limited to `read:repository`,
  `write:repository`, `read:issue`, and `write:issue`. Start with the smallest
  scopes needed for the chosen workflow.

## First workflow to prove

1. Add the local Forgejo instance to the selected client without storing a
   token in this repository.
2. Create or identify a pull request and check out its exact remote head.
3. Fetch its base branch and run:

   ```sh
   codex review --base origin/main
   ```

4. Keep the result local unless the user explicitly requests a Forgejo comment
   or review.
5. Post one clearly labelled review through `tea` or the REST API and confirm
   its URL, author, head revision, and formatting.
6. Keep merge as a separate human-authorized action.

Extend `local-pr-review` with a small Forgejo adapter only after this flow is
proven. Keep one review method and separate GitHub and Forgejo transport
commands rather than duplicating the complete skill.

## Automation boundary

Begin with manual local review. If Forgejo Actions is later justified:

- use `pull_request` for read-only inspection
- never run untrusted pull-request code while OpenAI or Forgejo write
  credentials are available
- do not combine `pull_request_target`, secrets, and pull-request code
- use a dedicated repository-scoped identity and token
- require an unchanged head revision before posting results

## Decisions to revisit

- Installed Forgejo version and its API compatibility with the current `tea`
  release
- Whether a general comment is sufficient or inline review comments are needed
- Local-only invocation versus an opt-in Forgejo Actions review
- Token storage, rotation, identity, and exact minimum scopes
- Whether the existing local review skill should remain GitHub-named or become
  transport-neutral

## Sources

- [Codex CLI review](https://learn.chatgpt.com/docs/code-review?surface=cli)
- [Codex GitHub review](https://learn.chatgpt.com/docs/third-party/github)
- [Tea CLI](https://about.gitea.com/products/tea/)
- [Forgejo command-line interface](https://forgejo.org/docs/latest/admin/command-line/)
- [Forgejo API usage](https://forgejo.org/docs/latest/user/api-usage/)
- [Forgejo token scopes](https://forgejo.org/docs/latest/user/token-scope/)
- [Forgejo Actions security](https://forgejo.org/docs/latest/user/actions/security/)
- [Forgejo Actions reference](https://forgejo.org/docs/latest/user/actions/reference/)
