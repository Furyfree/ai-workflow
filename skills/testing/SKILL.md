---
name: testing
description: Choose appropriate verification, write behavioural tests, or review existing tests. Use for "what needs testing", "write tests", "review these tests", "tests break when I change settings", "hvad skal testes", "skriv tests", "gennemgå tests", or when deciding how to verify a change. Not for model second opinions (validate) or as permission to edit during a review.
---

# Testing

## Choose what needs checking

- Read the requirement, changed code, callers, and relevant existing tests.
  Identify what could fail and what result would show it works.
- Choose checks for the behaviour and consequences of failure. Never use
  coverage quotas or a test-per-function rule. Follow required repository checks.
- Reuse existing tools and tests. Never add abstractions, dependencies, or
  configuration solely to make a simple change testable.

| Change | Appropriate checks |
| --- | --- |
| Static preference, such as font size or model choice | Review the value; check syntax or try the application when useful. No test pinning that choice. |
| Template or platform branch | Render representative inputs and validate the generated configuration. |
| Parser, calculation, settings merge, or command builder | Test controlled inputs against known results, including meaningful failure cases. |
| Migration, installer, or destructive operation | Test preservation, ownership, failure recovery, and repeated execution where required. |
| External tool or OS integration | Exercise the real boundary in an isolated environment when needed; use a real application or VM check for behaviour smaller tests cannot establish. |

## Write tests that survive valid changes

- Before adding a test, name the behaviour it protects, a realistic bug that
  makes it fail, and why existing tests miss that bug. No answer, no test.
  One test per behaviour; add another layer only for a failure the first
  cannot reach.
- Test through the interface callers use. Check returned results, errors, and
  relevant side effects. Never freeze internal helpers or call sequences unless
  they are part of the requirement.
- Use independent expected results: a worked example, known output, or explicit
  requirement. Never calculate the expectation by copying the implementation.
- Use controlled example data. Fixed values are useful inputs and expectations;
  never copy live personal preferences or the current repository inventory into
  assertions unless those exact values are an explicit requirement.
- Exercise different meaningful inputs when the behaviour depends on them.
  A settings writer must preserve the supplied model, not always write one model.
- Keep exact assertions when exactness is required, such as a protocol value,
  command argument, privacy policy, or promised output format. Otherwise compare
  the relevant meaning, not entire snapshots, whitespace, or display labels.
- Use real code where practical. Substitute external services, commands, time,
  or randomness where needed for isolation. Never treat a substitute's behaviour
  as proof that the real tool accepts the arguments or performs the operation.
- Keep test state disposable. Never run installers or destructive checks against
  the user's live system without authorization.
- Check that a new test can fail. For a bug fix, run it against the unfixed
  code. Otherwise break one line of the code under test, such as `>=` to `>`,
  see the test fail, and restore the line. Never require a test-first workflow
  for every change.
- For a regression found during a live install or test, add a short comment
  explaining what failed and under what conditions when the test name does not
  explain it. Link an issue if available. Never invent an incident or repeat
  what the code already says.

## Review and verify

- Ask of each test: what real failure does it catch, and what valid change would
  break it? Keep protection for promised behaviour; remove preference duplication
  or implementation coupling only within the authorized scope.
- Judge a test by its assertions, not its name. A test that expects a rejection
  must be rejected by the check it targets, not by an earlier one.
- A failing existing test may be a real bug: reproduce it before deleting.
  Never delete a test only because it is slow or old.
- Never weaken an expectation just to pass a failing test. Establish whether the
  requirement changed, the implementation broke, or the test checks the wrong thing.
- Run relevant checks and required repository gates. Never add a test merely to
  prove that a static value was edited. Never repeatedly broaden testing without
  a new change, failure, or unresolved concern.
- Report what ran and what it establishes. Never count a skipped or blocked check
  as a pass; state what still needs a real tool, application, or machine check.
