# What Broke and How I Fixed It

## A note before the debugging stories

If I had to answer *"What broke while building SettleIQ, and how did you
fix it?"*, honestly, it was not one thing. There were several smaller
problems across the UI and integration layers, but one backend problem
taught me the most.

The most useful debugging moment was when I stopped thinking only about
whether reconciliation could find a match and started asking a more
uncomfortable question:

> **"Can the matching logic ever find the wrong match and still look
> correct?"**

That question led me to an edge case around reference searching and
deterministic matching. I then hardened the backend rules around it
instead of allowing an approximate match to silently become a financial
reconciliation decision.

The other two major issues were around the AI integration and the
investigation UI/workflow.

------------------------------------------------------------------------

# 1. Major Backend Issue --- Reference Search Could Become Too Permissive

## What happened

One of the assumptions in a reconciliation system is that a reference
search should help find related records.

The problem is that **finding something similar is not the same as
proving that it is the correct financial record**.

While testing the reference-mismatch path, I looked closely at cases
where identifiers had similar-looking values. For example, references
such as:

-   `PAY_10006`
-   `PAY_100060`
-   `PAY_REF_10006_ALT`
-   `ORD_50006`

can all look related to a human when they appear together in a search
result.

That raised a serious backend question: what happens if a loose search
or partial-reference comparison returns a plausible-looking record that
belongs to a different transaction?

This was more important than a normal UI bug because a false positive in
reconciliation can produce a **financially incorrect match while still
appearing successful on the dashboard**.

## How it was diagnosed

I traced the reconciliation flow rather than looking only at the final
exception status:

**input records → reference extraction → candidate lookup →
deterministic reconciliation rules → exception classification**

I then tested the matching assumptions against deliberately awkward
reference combinations.

The important distinction became:

**candidate discovery ≠ verified reconciliation**

A search can be useful for finding candidates, but the backend should
not automatically treat a partial or approximate reference as proof of
identity.

## Root cause

The underlying issue was an **edge-case weakness in deterministic
reference handling**.

Reference values can contain prefixes, suffixes, alternate identifiers,
or similar numeric portions. Treating a loosely related search result as
a confirmed transaction match creates the possibility of a false
positive.

For a financial reconciliation system, that is an unsafe default.

## How it was fixed

I strengthened the deterministic reconciliation rules so that
approximate/reference-search information could not by itself establish a
financial match.

The backend distinguishes between:

1.  **exact identity/reference agreement** --- strong matching evidence;
2.  **supported alternate-reference correlation** --- allowed only when
    the relevant deterministic relationship is established;
3.  **partial/similar reference discovery** --- useful as a candidate
    signal, but not sufficient by itself to silently resolve the
    transaction.

This also reinforced an important architectural boundary:

> **Deterministic reconciliation establishes what the records actually
> say. AI investigation can explain an exception, but it should not
> manufacture financial facts from a fuzzy identifier.**

## Final result

The reconciliation path became safer around reference edge cases.

Instead of asking *"Did the search find something that looks similar?"*,
the backend asks *"Do the deterministic rules provide enough evidence to
establish this as the correct relationship?"*

That was one of the most important backend design lessons from SettleIQ
because a reconciliation system should be much more afraid of a **false
match** than of an exception that requires human review.

> **Important honesty note:** this edge case was deliberately
> constructed during backend hardening/testing. It should not be
> described as a production incident or an accidentally discovered bug.
> The engineering value was in identifying the failure mode, proving why
> it was unsafe, and adding deterministic protection against it.

------------------------------------------------------------------------

# 2. Gemini Integration --- The AI Was Returning Data, but the Application Was Reading It as 0% Confidence

## What happened

After enabling the live Gemini provider, the AI investigation returned a
response, but SettleIQ showed the investigation with **0% confidence**
and routed the exception to human review.

Initially, this looked like the guardrail engine was rejecting Gemini.

It wasn't.

## How it was diagnosed

I inspected the raw provider response and then followed the response
through `AIInvestigationService`.

Gemini was returning a structured response, but its fields were nested
differently from the schema expected by SettleIQ.

The service expected top-level fields such as:

-   `confidence`
-   `recommended_action`
-   `root_cause`
-   `explanation`
-   `evidence_ids`

Those fields were missing at the expected level.

The backend therefore safely applied its defaults:

-   `confidence → 0.0`
-   `recommended_action → HUMAN_REVIEW`
-   `root_cause → UNKNOWN_ROOT_CAUSE`

The guardrail engine then behaved exactly as designed: it refused
automatic resolution.

## Root cause

The root cause was a **prompt assembly omission**.

`prompt_builder.py` already contained the detailed `SYSTEM_PROMPT`
describing the investigation rules and expected JSON schema, but
`PromptBuilder.build_prompt()` was not actually including that system
prompt in the text sent to Gemini.

Gemini had the evidence package, but it did not receive the
application's complete output contract.

## How it was fixed

I changed `PromptBuilder.build_prompt()` to include the existing
`SYSTEM_PROMPT` before the evidence package.

I then verified the assembled prompt directly and confirmed that it
contained:

-   the investigation instructions;
-   the grounding rules;
-   the expected JSON structure;
-   the evidence package itself.

With the corrected prompt, Gemini returned the expected fields,
including the confidence and recommended action required by the rest of
the pipeline.

## Final result

The live AI investigation could once again produce a structured result
that the backend could correctly interpret.

The bigger lesson was that **an AI integration is not finished when the
model returns JSON. The model's output contract has to match what the
application actually consumes.**

------------------------------------------------------------------------

# 3. Gemini Quota and Test Isolation --- Live AI Should Not Control the Automated Test Suite

## What happened

After the Gemini integration was enabled, the AI-related tests started
encountering:

`429 Too Many Requests`

This was confusing at first because the underlying application logic had
not suddenly become invalid.

The tests were simply making real external Gemini requests.

## How it was diagnosed

I traced provider selection and found that a configured API key caused
the live `GeminiProvider` to be selected.

That meant the pytest suite was no longer isolated from an external
service.

Multiple tests could consume the same API quota during one test run,
making the test results dependent on rate limits and external
availability.

## Root cause

The problem was **test infrastructure coupled to a live third-party
API**.

That is undesirable for automated tests because the suite should answer:

> "Does my code work?"

rather than:

> "Is an external API available and within quota right now?"

## How it was fixed

I added a test-only `backend/tests/conftest.py` fixture that replaces
the provider with the existing `DeterministicProvider` during pytest
execution.

This separation is intentional:

**Automated tests** → deterministic provider\
→ no external Gemini calls\
→ repeatable results

**Production application** → Gemini provider when configured\
→ real AI investigation\
→ existing fallback behavior remains available

## Final result

The complete backend test suite reached:

**49 / 49 tests passing**

with no live Gemini requests during pytest.

The important part is that the deterministic provider was not used to
pretend that Gemini was working. It was used to make automated tests
reliable while keeping the live Gemini integration available for actual
runtime verification.

------------------------------------------------------------------------

# A Few Smaller Frontend Problems

There were also several smaller frontend issues while putting the
complete workflow together --- loading states, button states, modal
behaviour, stale UI state after an investigation, and making sure the
displayed investigation status matched the backend result.

These were real development problems, but I would not put them on the
same level as the three issues above.

They were mostly **state-management and presentation problems**, whereas
the issues above exposed deeper boundaries between deterministic
reconciliation, AI integration, and automated testing.

------------------------------------------------------------------------

# What These Problems Taught Me

The three major problems ended up covering three different engineering
boundaries:

  -----------------------------------------------------------------------
  Problem                 Boundary Tested         Main Lesson
  ----------------------- ----------------------- -----------------------
  Reference-search edge   Reconciliation logic    Similar is not the same
  case                                            as verified

  Gemini response/schema  AI ↔ backend            External model output
  mismatch                                        needs an explicit
                                                  contract

  Gemini quota during     Application ↔ external  Tests should be
  tests                   service                 deterministic and
                                                  isolated
  -----------------------------------------------------------------------

The most important lesson for me was that a financial system should not
try to hide uncertainty.

If a reference cannot be deterministically established, it should remain
an exception.

If an AI response cannot be interpreted safely, it should not be treated
as a successful investigation.

If an external API is unavailable during testing, the test suite should
not become unreliable because of it.

That thinking is what gradually shaped SettleIQ's separation between:

**deterministic reconciliation → evidence-grounded AI investigation →
guardrail decision → human review**

And honestly, that is what I would remember most from building it.

The final application may look clean when everything is working, but
getting there involved repeatedly asking what could go wrong, tracing
the failure to the correct layer, and making the system fail safely
rather than simply making the screen look successful.
