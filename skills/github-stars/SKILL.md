---
name: github-stars
description: Triage my new GitHub stars - unstar, replace an older star, or file into a star list. Use when the user says "triage my stars", "review my new stars", "sort my GitHub stars", "go through my stars", "gennemgå mine stjerner", "sorter mine stjerner", "ryd op i mine stars". Not for finding new tools on the web (use research) or for starring a repository on request.
---

# GitHub stars

Change nothing on GitHub before the user answers step 3.

1. Fetch with `gh api graphql` into the scratch directory:
   - Lists: `viewer { lists(first: 100) { totalCount nodes { id name
     description items(first: 100) { totalCount nodes { ... on Repository {
     nameWithOwner } } } } } }`
   - Stars, newest first, with `--paginate`: `viewer {
     starredRepositories(first: 100, after: $endCursor, orderBy: {field:
     STARRED_AT, direction: DESC}) { pageInfo { hasNextPage endCursor }
     edges { starredAt node { nameWithOwner description pushedAt isArchived
     } } } }`

   Where a `totalCount` is over 100, fetch the rest with `after:` first; a
   repository missed here would lose its list in step 4. New stars are
   those in no list. None: say so and stop.
2. Judge each new star against the repositories already in the lists and
   what the user uses: installed commands (`command -v`), `~/Projects/nix`,
   the skills in `~/Projects/ai-workflow`, and `byrne-homelab/homelab`. Read
   the README (`gh api repos/<repo>/readme -H 'Accept:
   application/vnd.github.raw'`) when the description does not settle it.
3. Report one numbered list in three groups, one line per star with the
   reason, then stop:
   - Unstar: name what already does the job.
   - Replace: the list it joins and the older star it pushes out, which is
     unstarred.
   - Add: the list it joins.

   After the list, name any star that could improve a skill or the setup.
   Change no skill here.
4. Apply only what the user answers, by number or by quoting a line; a
   comment on a line changes that line. Unstar with
   `gh api -X DELETE user/starred/<owner>/<repo>`. File with the
   `updateUserListsForItem` mutation, `itemId` from
   `gh api repos/<repo> --jq .node_id`. It replaces all of a repository's
   lists, so include the lists it is already in.
5. Fetch again. Report what changed and which stars are still in no list.
