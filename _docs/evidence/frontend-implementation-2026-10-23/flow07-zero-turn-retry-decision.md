# Flow 07: retry after initial zero turns

Date: 2026-10-23

The owner confirmed that a successful initial preparation with zero turns still leaves the project's one included retry available. This applies the existing retry to the zero-turn recovery path; it does not grant an additional retry.

The implementation treats the retry as project-scoped because an initial zero-turn result has no active usable preparation to hold the eligibility flag. Initial success grants the one retry. A queued cancellation or system failure preserves it; successful completion of the retry, including another zero-turn result, or a user cancellation after work has started consumes it. Later paid reprocessing cannot grant it again. An initial zero-turn result remains in recovery and does not activate an empty preparation.

This clarification follows the approved source wording: the shared contract says initial zero-turn processing retains eligible retry/another-video actions and that zero-turn reprocessing consumes the existing successful-retry allowance without refund or extra retry (`_docs/frontend-flows/00-shared-contract.md`, §3.8, line 424). Flow 07's terminal outcomes also call for recording current retry eligibility for initial successful zero-turn results and successful-retry consumption for zero-turn reprocessing (`_docs/frontend-flows/07-processing.md`, lines 479–483 and 593–594).

Evidence scope: local synthetic mock behavior and service tests only. This record does not establish production pricing, refund, or provider behavior.
