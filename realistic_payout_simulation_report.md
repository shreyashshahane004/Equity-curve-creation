# 📊 Realistic Single Account Payout Simulation Report

This report compares the **Carryover System** (1 single funded account carried over continuously) against the **Fresh Month System** (account resets to 0R every month) using your 36-month dataset (FOMC Excluded).

## Summary of Results
- **Fresh Month System:** **28 Payouts**
- **Single Account Carryover System:** **27 Payouts**
- **Difference:** Only **1 payout lost** across 3 years!
- **Funded Accounts Blown (Carryover):** **0** (0% failure rate)

## Chronological Month-by-Month Breakdown

| Month | Starting R (Carryover) | Ending R (Carryover) | Payout Received (Carryover)? | Reached +4R in Month (Fresh System)? |
| :--- | :---: | :---: | :---: | :---: |
| 2023-January | 0.00R | +4.00R | ✅ **YES** (+4R Payout) | ✅ **YES** |
| 2023-February | 0.00R | +4.00R | ✅ **YES** (+4R Payout) | ✅ **YES** |
| 2023-March | 0.00R | +5.00R | ✅ **YES** (+4R Payout) | ✅ **YES** |
| 2023-April | 0.00R | 0.00R | ❌ No | ❌ No *(Not Reached)* |
| 2023-May | 0.00R | +5.00R | ✅ **YES** (+4R Payout) | ✅ **YES** |
| 2023-June | 0.00R | -6.00R | ❌ No | ❌ No *(Not Reached)* |
| 2023-July | -6.00R | -5.00R | ❌ No | ✅ **YES** |
| 2023-August | -5.00R | +4.00R | ✅ **YES** (+4R Payout) | ✅ **YES** |
| 2023-September | 0.00R | -1.00R | ❌ No | ❌ No *(Not Reached)* |
| 2023-October | -1.00R | +4.00R | ✅ **YES** (+4R Payout) | ✅ **YES** |
| 2023-November | 0.00R | +4.00R | ✅ **YES** (+4R Payout) | ✅ **YES** |
| 2023-December | 0.00R | +4.00R | ✅ **YES** (+4R Payout) | ✅ **YES** |
| 2024-January | 0.00R | +4.00R | ✅ **YES** (+4R Payout) | ✅ **YES** |
| 2024-February | 0.00R | +5.00R | ✅ **YES** (+4R Payout) | ✅ **YES** |
| 2024-March | 0.00R | +5.00R | ✅ **YES** (+4R Payout) | ✅ **YES** |
| 2024-April | 0.00R | +4.00R | ✅ **YES** (+4R Payout) | ✅ **YES** |
| 2024-May | 0.00R | +4.00R | ✅ **YES** (+4R Payout) | ✅ **YES** |
| 2024-June | 0.00R | +2.00R | ❌ No | ❌ No *(Not Reached)* |
| 2024-July | +2.00R | +4.00R | ✅ **YES** (+4R Payout) | ✅ **YES** |
| 2024-August | 0.00R | 0.00R | ❌ No | ❌ No *(Not Reached)* |
| 2024-September | 0.00R | +4.00R | ✅ **YES** (+4R Payout) | ✅ **YES** |
| 2024-October | 0.00R | +1.00R | ❌ No | ❌ No *(Not Reached)* |
| 2024-November | +1.00R | +5.00R | ✅ **YES** (+4R Payout) | ✅ **YES** |
| 2024-December | 0.00R | +5.00R | ✅ **YES** (+4R Payout) | ✅ **YES** |
| 2025-January | 0.00R | +5.00R | ✅ **YES** (+4R Payout) | ✅ **YES** |
| 2025-February | 0.00R | +5.00R | ✅ **YES** (+4R Payout) | ✅ **YES** |
| 2025-March | 0.00R | +4.00R | ✅ **YES** (+4R Payout) | ✅ **YES** |
| 2025-April | 0.00R | +4.00R | ✅ **YES** (+4R Payout) | ✅ **YES** |
| 2025-May | 0.00R | +4.00R | ✅ **YES** (+4R Payout) | ✅ **YES** |
| 2025-June | 0.00R | +4.00R | ✅ **YES** (+4R Payout) | ✅ **YES** |
| 2025-July | 0.00R | +4.00R | ✅ **YES** (+4R Payout) | ✅ **YES** |
| 2025-August | 0.00R | +5.00R | ✅ **YES** (+4R Payout) | ✅ **YES** |
| 2025-September | 0.00R | -3.00R | ❌ No | ❌ No *(Not Reached)* |
| 2025-October | -3.00R | +5.00R | ✅ **YES** (+4R Payout) | ✅ **YES** |
| 2025-November | 0.00R | +4.00R | ✅ **YES** (+4R Payout) | ✅ **YES** |
| 2025-December | 0.00R | -6.00R | ❌ No | ❌ No *(Not Reached)* |


> [!NOTE]
> Notice that the only variance occurs in **July 2023**. June 2023 ended at **-6.00R**, meaning July had to start at **-6.00R**. Even though July made a great run to end at **-5.00R** (meaning it gained 1.00R), it could not hit the absolute **+4.00R** target. The fresh system got a payout in July, whereas the carryover system had to wait until **August 2023** to clear the debt and hit the +4R target. All other months performed identically!
