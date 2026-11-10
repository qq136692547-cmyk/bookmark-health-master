# E2E Test Infra: Bookmark Health Master (BHM-PRO) v2.1.0

## Test Philosophy
- Opaque-box, requirement-driven. No dependency on implementation design.
- Methodology: Category-Partition + BVA + Pairwise + Workload Testing.

## Feature Inventory
| # | Feature | Source (requirement) | Tier 1 | Tier 2 | Tier 3 |
|---|---------|---------------------|:------:|:------:|:------:|
| 1 | M0 Chrome/Network Mocks | R8-infra | 5 | 5 | ✓ |
| 2 | M1 Safety Tree Capture & Sequence Rollback | ORIGINAL_REQUEST R1 | 5 | 5 | ✓ |
| 3 | M1 Failure Retention & No Root Fallback | ORIGINAL_REQUEST R1 | 5 | 5 | ✓ |
| 4 | M2 DNR Session Rules & Origin-Only Header | ORIGINAL_REQUEST R2 | 5 | 5 | ✓ |
| 5 | M2 SSRF Intranet IP & IPv6 Brackets | ORIGINAL_REQUEST R6 | 5 | 5 | ✓ |
| 6 | M2 Socket Release & reader.cancel() | ORIGINAL_REQUEST R6 | 5 | 5 | ✓ |
| 7 | M3 Ed25519 Offline Verification & Anti-Backdoor | ORIGINAL_REQUEST R3 | 5 | 5 | ✓ |
| 8 | M3 checkProStatus & Quota Persistence | ORIGINAL_REQUEST R3 | 5 | 5 | ✓ |
| 9 | M4 Non-Giant Domain Bucketing ('📁 未分类') | ORIGINAL_REQUEST R4 | 5 | 5 | ✓ |
| 10| M4 Query/Hash Preserving URL Deduplication | ORIGINAL_REQUEST R4 | 5 | 5 | ✓ |
| 11| M4 Real-Count Truth in Cleaning & Reporting | ORIGINAL_REQUEST R5 | 5 | 5 | ✓ |
| 12| M5 Store Compliance & Privacy Documentation | ORIGINAL_REQUEST R7 | 5 | 5 | ✓ |
| 13| M5 Removal of dict.js from Package | ORIGINAL_REQUEST R7 | 5 | 5 | ✓ |
| 14| M6 Pseudo-Assertion Removal & Real Assertions | ORIGINAL_REQUEST R8 | 5 | 5 | ✓ |

## Test Architecture
- Test runner: `node tests/run_all_tests.js`
- Test case format: Strict Node.js `node:assert` tests executing under mock Chrome MV3 environment
- Directory layout: `tests/` (`helpers/`, `test_*.js`, `run_all_tests.js`)

## Real-World Application Scenarios (Tier 4)
| # | Scenario | Features Exercised | Complexity |
|---|----------|--------------------|------------|
| 1 | Organize messy real-world 1000-bookmark tree with giants + non-giants | F2, F8, F9, F10 | High |
| 2 | Full Undo Rollback of organized bookmarks with deleted siblings & empty folders | F1, F2, F3 | High |
| 3 | Health check scanning with live DoH, intranet detection, and socket cleanup | F4, F5, F6 | High |
| 4 | Commercial Pro activation, expired card rejection, quota decrement & persistence | F7, F8, F11 | Medium |
| 5 | Deduplication of URLs with varied search params and anchors | F9, F10 | Medium |

## Coverage Thresholds
- Tier 1: ≥5 per feature
- Tier 2: ≥5 per feature (where boundaries exist)
- Tier 3: pairwise coverage of major feature interactions
- Tier 4: ≥5 realistic application scenarios
